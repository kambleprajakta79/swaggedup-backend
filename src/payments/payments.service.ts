import { Injectable, Logger, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as crypto from 'crypto';
import Razorpay from 'razorpay';
import { Payment, PaymentRecordStatus } from './entities/payment.entity';
import { Order, PaymentStatus } from '../orders/entities/order.entity';
import { VerifyPaymentDto } from './dto/verify-payment.dto';

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);
  private razorpay: Razorpay | null = null;

  constructor(
    @InjectRepository(Payment)
    private readonly paymentRepository: Repository<Payment>,
    @InjectRepository(Order)
    private readonly orderRepository: Repository<Order>,
  ) {
    const keyId = process.env.RAZORPAY_KEY_ID;
    const keySecret = process.env.RAZORPAY_KEY_SECRET;
    if (keyId && keySecret) {
      this.razorpay = new Razorpay({ key_id: keyId, key_secret: keySecret });
      this.logger.log('Razorpay client configured');
    } else {
      this.logger.warn('RAZORPAY_KEY_ID/RAZORPAY_KEY_SECRET not set — online payments disabled');
    }
  }

  /** Create a Razorpay order for an existing (PENDING, ONLINE) order. */
  async createRazorpayOrder(orderId: number): Promise<{
    razorpayOrderId: string;
    amount: number; // in paise
    currency: string;
    keyId: string;
  }> {
    if (!this.razorpay) {
      throw new BadRequestException('Online payments are not configured on this server');
    }

    const order = await this.orderRepository.findOne({ where: { id: orderId } });
    if (!order) {
      throw new NotFoundException('Order not found');
    }
    if (order.paymentMethod !== 'ONLINE') {
      throw new BadRequestException('This order is not marked for online payment');
    }
    if (order.paymentStatus === PaymentStatus.PAID) {
      throw new BadRequestException('Order is already paid');
    }

    const amountPaise = Math.round(Number(order.totalAmount) * 100);
    const rpOrder = await this.razorpay.orders.create({
      amount: amountPaise,
      currency: 'INR',
      receipt: order.orderNumber,
      notes: { orderId: String(order.id), orderNumber: order.orderNumber },
    });

    // Persist payment record
    await this.paymentRepository.save(
      this.paymentRepository.create({
        orderId: order.id,
        providerOrderId: rpOrder.id,
        amount: order.totalAmount,
        status: PaymentRecordStatus.CREATED,
      }),
    );

    return {
      razorpayOrderId: rpOrder.id,
      amount: amountPaise,
      currency: 'INR',
      keyId: process.env.RAZORPAY_KEY_ID!,
    };
  }

  /** Verify the Razorpay checkout signature and mark the order PAID. */
  async verifyPayment(dto: VerifyPaymentDto): Promise<{ success: true }> {
    const secret = process.env.RAZORPAY_KEY_SECRET;
    if (!secret) {
      throw new BadRequestException('Online payments are not configured on this server');
    }

    // HMAC SHA256: razorpay_order_id + "|" + razorpay_payment_id
    const expected = crypto
      .createHmac('sha256', secret)
      .update(`${dto.razorpayOrderId}|${dto.razorpayPaymentId}`)
      .digest('hex');

    if (expected !== dto.razorpaySignature) {
      this.logger.warn(`Signature verification FAILED for order ${dto.orderId}`);
      throw new BadRequestException('Payment signature verification failed');
    }

    await this.markPaid(dto.orderId, dto.razorpayOrderId, dto.razorpayPaymentId, {
      source: 'checkout-callback',
    });
    return { success: true };
  }

  /** Handle Razorpay webhook (payment.captured). Verifies the webhook signature. */
  async handleWebhook(rawBody: Buffer, signature: string): Promise<{ received: true }> {
    const webhookSecret = process.env.RAZORPAY_WEBHOOK_SECRET;
    if (!webhookSecret) {
      this.logger.warn('Webhook received but RAZORPAY_WEBHOOK_SECRET not configured');
      return { received: true };
    }

    const expected = crypto.createHmac('sha256', webhookSecret).update(rawBody).digest('hex');
    if (expected !== signature) {
      this.logger.warn('Webhook signature verification failed');
      throw new BadRequestException('Invalid webhook signature');
    }

    const event = JSON.parse(rawBody.toString());
    if (event.event === 'payment.captured') {
      const paymentEntity = event.payload?.payment?.entity;
      const rpOrderId = paymentEntity?.order_id;
      const rpPaymentId = paymentEntity?.id;

      const record = await this.paymentRepository.findOne({ where: { providerOrderId: rpOrderId } });
      if (record) {
        await this.markPaid(record.orderId, rpOrderId, rpPaymentId, { source: 'webhook' });
      }
    }

    return { received: true };
  }

  /** Idempotently mark an order as paid. */
  private async markPaid(
    orderId: number,
    providerOrderId: string,
    providerPaymentId: string,
    meta: Record<string, unknown>,
  ): Promise<void> {
    const order = await this.orderRepository.findOne({ where: { id: orderId } });
    if (!order) return;

    if (order.paymentStatus !== PaymentStatus.PAID) {
      order.paymentStatus = PaymentStatus.PAID;
      await this.orderRepository.save(order);
      this.logger.log(`Order ${order.orderNumber} marked PAID (${meta.source})`);
    }

    // Update the payment record (idempotent)
    const record = await this.paymentRepository.findOne({ where: { providerOrderId } });
    if (record) {
      record.providerPaymentId = providerPaymentId;
      record.status = PaymentRecordStatus.PAID;
      record.rawPayload = JSON.stringify(meta);
      await this.paymentRepository.save(record);
    }
  }
}

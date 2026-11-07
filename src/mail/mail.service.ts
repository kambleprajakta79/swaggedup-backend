import { Injectable, Logger } from '@nestjs/common';
import * as nodemailer from 'nodemailer';
import { renderOrderConfirmation, renderOtpEmail, renderPasswordReset, renderOrderStatusUpdate } from './mail.templates';

@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);
  private transporter: nodemailer.Transporter | null = null;

  constructor() {
    const host = process.env.MAIL_HOST;
    const user = process.env.MAIL_USER;
    const pass = process.env.MAIL_PASS;

    if (host && user && pass) {
      this.transporter = nodemailer.createTransport({
        host,
        port: Number(process.env.MAIL_PORT || 587),
        secure: false, // TLS with STARTTLS on 587
        auth: { user, pass },
      });
      this.logger.log(`Mail transport configured for ${host}`);
    } else {
      this.logger.warn('Mail credentials not configured (MAIL_HOST/MAIL_USER/MAIL_PASS) — emails will be skipped');
    }
  }

  /** Send email; never throws — mail failures must not break business flows. */
  private async send(to: string, subject: string, html: string): Promise<void> {
    if (!this.transporter) {
      this.logger.warn(`[mail skipped] "${subject}" to ${to} (no transport configured)`);
      return;
    }
    try {
      const from = process.env.MAIL_FROM || 'SwaggedUp <no-reply@swaggedup.com>';
      await this.transporter.sendMail({ from, to, subject, html });
      this.logger.log(`Email sent: "${subject}" to ${to}`);
    } catch (err) {
      this.logger.error(`Failed to send email "${subject}" to ${to}: ${(err as Error).message}`);
    }
  }

  async sendOrderConfirmation(order: {
    orderNumber: string;
    customerName: string;
    customerEmail: string;
    totalAmount: number | string;
    items: { productName: string; size: string; quantity: number; totalPrice: number | string }[];
  }): Promise<void> {
    const html = renderOrderConfirmation(order);
    await this.send(order.customerEmail, `Order Confirmation — ${order.orderNumber} | SwaggedUp`, html);
  }

  async sendOtp(email: string, code: string, purpose: 'REGISTER' | 'RESET_PASSWORD' | 'CHECKOUT_VERIFY'): Promise<void> {
    const html = renderOtpEmail(code, purpose);
    const subject =
      purpose === 'RESET_PASSWORD' ? 'Reset Your Password | SwaggedUp' : 'Verify Your Email | SwaggedUp';
    await this.send(email, subject, html);
  }

  async sendPasswordReset(email: string, code: string): Promise<void> {
    await this.sendOtp(email, code, 'RESET_PASSWORD');
  }

  async sendOrderStatusUpdate(order: {
    orderNumber: string;
    customerName: string;
    customerEmail: string;
    status: string;
  }): Promise<void> {
    const html = renderOrderStatusUpdate(order);
    await this.send(order.customerEmail, `Order ${order.orderNumber} is ${order.status} | SwaggedUp`, html);
  }
}

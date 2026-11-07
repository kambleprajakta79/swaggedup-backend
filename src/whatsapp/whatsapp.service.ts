import { Injectable, Logger } from '@nestjs/common';

/**
 * WhatsApp Cloud API client (Meta Graph API).
 * Sends pre-approved template messages to customers.
 * Fail-safe: errors are logged and never thrown, so notification
 * failures never break the order flow.
 */
@Injectable()
export class WhatsAppService {
  private readonly logger = new Logger(WhatsAppService.name);
  private readonly token = process.env.WHATSAPP_TOKEN;
  private readonly phoneId = process.env.WHATSAPP_PHONE_ID;
  private readonly apiVersion = 'v21.0';

  private get configured(): boolean {
    return !!(this.token && this.phoneId);
  }

  /** Send a template message. Returns true on success, false otherwise. */
  private async sendTemplate(
    toPhone: string,
    templateName: string,
    languageCode: string,
    bodyParams?: string[],
  ): Promise<boolean> {
    if (!this.configured) {
      this.logger.warn(`[whatsapp skipped] template "${templateName}" to ${toPhone} (not configured)`);
      return false;
    }

    try {
      const url = `https://graph.facebook.com/${this.apiVersion}/${this.phoneId}/messages`;
      const payload: Record<string, unknown> = {
        messaging_product: 'whatsapp',
        to: this.normalizePhone(toPhone),
        type: 'template',
        template: {
          name: templateName,
          language: { code: languageCode },
          ...(bodyParams
            ? {
                components: [
                  {
                    type: 'body',
                    parameters: bodyParams.map((text) => ({ type: 'text', text })),
                  },
                ],
              }
            : {}),
        },
      };

      const res = await fetch(url, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${this.token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errText = await res.text();
        this.logger.error(`WhatsApp API error (${res.status}): ${errText}`);
        return false;
      }

      this.logger.log(`WhatsApp template "${templateName}" sent to ${toPhone}`);
      return true;
    } catch (err) {
      this.logger.error(`WhatsApp send failed: ${(err as Error).message}`);
      return false;
    }
  }

  /** Strip +, spaces, dashes; Meta expects the number without a leading +. */
  private normalizePhone(phone: string): string {
    return phone.replace(/[^0-9]/g, '');
  }

  /** Order placed notification (template: order_placed). */
  async sendOrderPlaced(phone: string, orderNumber: string, total: string): Promise<boolean> {
    return this.sendTemplate(phone, 'order_placed', 'en', [orderNumber, total]);
  }

  /** Order shipped notification (template: order_shipped). */
  async sendOrderShipped(phone: string, orderNumber: string): Promise<boolean> {
    return this.sendTemplate(phone, 'order_shipped', 'en', [orderNumber]);
  }

  /** Order delivered notification (template: order_delivered). */
  async sendOrderDelivered(phone: string, orderNumber: string): Promise<boolean> {
    return this.sendTemplate(phone, 'order_delivered', 'en', [orderNumber]);
  }
}

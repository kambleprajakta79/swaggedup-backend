/**
 * Simple inline-styled HTML email templates for SwaggedUp transactional mail.
 * Kept dependency-free (no template engine) for easy maintenance.
 */

const BRAND = {
  name: 'SwaggedUp',
  primary: '#111827',
  accent: '#D97706',
  bg: '#F4F4F5',
};

function layout(title: string, body: string): string {
  return `<!DOCTYPE html>
<html>
<head><meta charset="utf-8"><title>${title}</title></head>
<body style="margin:0;padding:0;background:${BRAND.bg};font-family:Arial,Helvetica,sans-serif;">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="padding:24px 0;">
    <tr><td align="center">
      <table role="presentation" width="560" cellpadding="0" cellspacing="0" style="background:#ffffff;border-radius:8px;overflow:hidden;">
        <tr>
          <td style="background:${BRAND.primary};padding:24px 32px;">
            <span style="color:#ffffff;font-size:22px;font-weight:bold;letter-spacing:1px;">${BRAND.name}</span>
            <span style="color:${BRAND.accent};font-size:22px;font-weight:bold;"> Menswear</span>
          </td>
        </tr>
        <tr><td style="padding:32px;" colspan="2">${body}</td></tr>
        <tr>
          <td style="background:${BRAND.primary};padding:16px 32px;color:#9CA3AF;font-size:12px;">
            © ${new Date().getFullYear()} ${BRAND.name} Menswear. All rights reserved.
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

export function renderOtpEmail(code: string, purpose: string): string {
  const heading =
    purpose === 'RESET_PASSWORD' ? 'Reset your password' : 'Verify your email';
  const text =
    purpose === 'RESET_PASSWORD'
      ? 'Use the code below to reset your password. If you did not request this, you can safely ignore this email.'
      : 'Use the code below to verify your email address and activate your SwaggedUp account.';
  return layout(
    heading,
    `<h2 style="margin:0 0 12px;color:${BRAND.primary};">${heading}</h2>
     <p style="color:#4B5563;line-height:1.6;">${text}</p>
     <div style="margin:24px 0;text-align:center;">
       <span style="display:inline-block;background:${BRAND.bg};border:2px dashed ${BRAND.accent};border-radius:8px;padding:16px 32px;font-size:32px;font-weight:bold;letter-spacing:8px;color:${BRAND.primary};">${code}</span>
     </div>
     <p style="color:#9CA3AF;font-size:13px;">This code expires in 10 minutes.</p>`,
  );
}

export function renderOrderConfirmation(order: {
  orderNumber: string;
  customerName: string;
  items: { productName: string; size: string; quantity: number; totalPrice: number | string }[];
  totalAmount: number | string;
}): string {
  const rows = order.items
    .map(
      (item) => `<tr>
        <td style="padding:8px 0;color:#4B5563;">${item.productName} <span style="color:#9CA3AF;">(Size: ${item.size})</span> × ${item.quantity}</td>
        <td style="padding:8px 0;text-align:right;color:${BRAND.primary};font-weight:bold;">₹${Number(item.totalPrice).toLocaleString('en-IN')}</td>
      </tr>`,
    )
    .join('');
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:4200';
  return layout(
    `Order Confirmation — ${order.orderNumber}`,
    `<h2 style="margin:0 0 12px;color:${BRAND.primary};">Thanks for your order, ${order.customerName}!</h2>
     <p style="color:#4B5563;line-height:1.6;">Your order <strong>${order.orderNumber}</strong> has been placed successfully.</p>
     <table role="presentation" width="100%" style="margin:16px 0;">${rows}</table>
     <table role="presentation" width="100%" style="border-top:2px solid ${BRAND.bg};margin-top:8px;">
       <tr><td style="padding-top:12px;font-size:16px;color:${BRAND.primary};">Total</td>
       <td style="padding-top:12px;text-align:right;font-size:18px;font-weight:bold;color:${BRAND.accent};">₹${Number(order.totalAmount).toLocaleString('en-IN')}</td></tr>
     </table>
     <p style="margin-top:24px;"><a href="${frontendUrl}/order/${order.orderNumber}" style="background:${BRAND.primary};color:#ffffff;text-decoration:none;padding:12px 24px;border-radius:6px;display:inline-block;">Track your order</a></p>`,
  );
}

export function renderOrderStatusUpdate(order: {
  orderNumber: string;
  customerName: string;
  status: string;
}): string {
  const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:4200';
  const messages: Record<string, string> = {
    PROCESSING: 'We are preparing your order and it will be shipped soon.',
    SHIPPED: 'Great news! Your order is on its way.',
    DELIVERED: 'Your order has been delivered. Enjoy your SwaggedUp style!',
    CANCELLED: 'Your order has been cancelled. If this was unexpected, please contact our support team.',
  };
  return layout(
    `Order ${order.orderNumber} — ${order.status}`,
    `<h2 style="margin:0 0 12px;color:${BRAND.primary};">Order update: ${order.status}</h2>
     <p style="color:#4B5563;line-height:1.6;">Hi ${order.customerName},</p>
     <p style="color:#4B5563;line-height:1.6;">${messages[order.status] || `The status of your order <strong>${order.orderNumber}</strong> is now <strong>${order.status}</strong>.`}</p>
     <p style="margin-top:24px;"><a href="${frontendUrl}/order/${order.orderNumber}" style="background:${BRAND.primary};color:#ffffff;text-decoration:none;padding:12px 24px;border-radius:6px;display:inline-block;">View order details</a></p>`,
  );
}

export function renderPasswordReset(code: string): string {
  return renderOtpEmail(code, 'RESET_PASSWORD');
}

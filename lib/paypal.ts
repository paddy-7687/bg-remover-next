// lib/paypal.ts - PayPal API 封装

export const PLANS = {
  pro_monthly: {
    label: 'Pro 月付',
    amount: '9.90',
    currency: 'USD',
    plan: 'pro',
    months: 1,
  },
  pro_yearly: {
    label: 'Pro 年付',
    amount: '59.90',
    currency: 'USD',
    plan: 'pro',
    months: 12,
  },
  one_time: {
    label: '一次性包 20次',
    amount: '4.90',
    currency: 'USD',
    plan: 'one_time',
    months: 0,
  },
} as const;

export type PlanKey = keyof typeof PLANS;

// 沙盒 vs 正式
const PAYPAL_BASE = 'https://api-m.sandbox.paypal.com'; // 沙盒
// const PAYPAL_BASE = 'https://api-m.paypal.com'; // 正式环境

export async function getPayPalAccessToken(clientId: string, clientSecret: string): Promise<string> {
  const res = await fetch(`${PAYPAL_BASE}/v1/oauth2/token`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Authorization': `Basic ${btoa(`${clientId}:${clientSecret}`)}`,
    },
    body: 'grant_type=client_credentials',
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`PayPal auth failed: ${err}`);
  }
  const data = await res.json() as { access_token: string };
  return data.access_token;
}

export async function createPayPalOrder(
  accessToken: string,
  plan: PlanKey,
  returnUrl: string,
  cancelUrl: string
): Promise<{ id: string; approveUrl: string }> {
  const p = PLANS[plan];
  const res = await fetch(`${PAYPAL_BASE}/v2/checkout/orders`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`,
    },
    body: JSON.stringify({
      intent: 'CAPTURE',
      purchase_units: [{
        amount: {
          currency_code: p.currency,
          value: p.amount,
        },
        description: p.label,
      }],
      application_context: {
        return_url: returnUrl,
        cancel_url: cancelUrl,
        brand_name: 'Image Background Remover',
        user_action: 'PAY_NOW',
      },
    }),
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Create order failed: ${err}`);
  }
  const data = await res.json() as { id: string; links: { rel: string; href: string }[] };
  const approveUrl = data.links.find(l => l.rel === 'approve')?.href || '';
  return { id: data.id, approveUrl };
}

export async function capturePayPalOrder(
  accessToken: string,
  orderId: string
): Promise<{ status: string; id: string }> {
  const res = await fetch(`${PAYPAL_BASE}/v2/checkout/orders/${orderId}/capture`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`,
    },
  });
  if (!res.ok) {
    const err = await res.text();
    throw new Error(`Capture failed: ${err}`);
  }
  return res.json() as Promise<{ status: string; id: string }>;
}

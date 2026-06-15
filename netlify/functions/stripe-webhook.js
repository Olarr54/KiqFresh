const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const SITE_URL = 'https://kiqfresh.net';

const SERVICE_MAP = {
  1500: 'Full Shoe Clean',
  2000: 'Full Clean + Wrap',
  2500: 'Full Shoe Deep Clean',
  4000: 'Triple Clean Bundle',
};

function buildEmail(name, serviceType, trackUrl) {
  const greeting = name ? `Hey ${name.split(' ')[0]},` : 'Hey,';
  return `<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#111;font-family:'Segoe UI',system-ui,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#111;padding:40px 20px">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0" style="max-width:560px">
        <tr><td style="padding-bottom:28px">
          <span style="font-size:13px;font-weight:800;letter-spacing:0.12em;color:#F5540A;text-transform:uppercase">KiqFresh</span>
        </td></tr>
        <tr><td style="background:#1a1a1a;border:1px solid #2a2a2a;border-radius:16px;padding:40px">
          <h1 style="margin:0 0 8px;font-size:22px;font-weight:800;color:#F7F4EF">Order confirmed!</h1>
          <p style="margin:0 0 16px;color:#888;font-size:15px">${greeting} Thanks for booking <strong style="color:#F7F4EF">${serviceType}</strong> with KiqFresh.</p>
          <p style="margin:0 0 32px;color:#aaa;font-size:14px;line-height:1.7">Track your order status in real time using the button below. We'll keep it updated as we work on your kicks so you always know where they are.</p>
          <table cellpadding="0" cellspacing="0">
            <tr><td style="background:#F5540A;border-radius:8px">
              <a href="${trackUrl}" style="display:inline-block;padding:14px 28px;color:white;text-decoration:none;font-weight:700;font-size:15px">Track Your Order</a>
            </td></tr>
          </table>
          <p style="margin:20px 0 0;font-size:11px;color:#555">Or copy: ${trackUrl}</p>
          <table width="100%" cellpadding="0" cellspacing="0" style="margin-top:32px;border-top:1px solid #2a2a2a;padding-top:24px">
            <tr><td>
              <p style="margin:0 0 8px;font-size:13px;font-weight:700;color:#F7F4EF">Posting your shoes?</p>
              <p style="margin:0;font-size:13px;color:#888;line-height:1.7">Send them to:<br>
                <strong style="color:#F7F4EF">KiqFresh</strong><br>
                209 London Road<br>
                Reading<br>
                RG1 3NU
              </p>
            </td></tr>
          </table>
        </td></tr>
        <tr><td style="padding-top:24px;text-align:center;font-size:11px;color:#555">
          KiqFresh &mdash; Professional Shoe Cleaning, Reading UK &nbsp;&middot;&nbsp;
          <a href="${SITE_URL}" style="color:#F5540A;text-decoration:none">kiqfresh.net</a>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

async function sendTrackingEmail(order) {
  const trackUrl = `${SITE_URL}/track.html?token=${order.tracking_token}`;
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: 'KiqFresh <hello@kiqfresh.net>',
      to: [order.customer_email],
      subject: 'Your KiqFresh order is confirmed — track it here',
      html: buildEmail(order.customer_name, order.service_type, trackUrl),
    }),
  });
  if (!res.ok) {
    console.error('Resend error:', await res.text());
  }
}

exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  const sig = event.headers['stripe-signature'];
  const rawBody = event.isBase64Encoded
    ? Buffer.from(event.body, 'base64').toString('utf-8')
    : event.body;

  let stripeEvent;
  try {
    stripeEvent = stripe.webhooks.constructEvent(
      rawBody,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    console.error('Webhook signature verification failed:', err.message);
    return { statusCode: 400, body: `Webhook Error: ${err.message}` };
  }

  if (stripeEvent.type !== 'checkout.session.completed') {
    return { statusCode: 200, body: 'Ignored' };
  }

  const session = stripeEvent.data.object;
  const amount = session.amount_total;

  // Idempotency — ignore duplicate webhook deliveries
  const { data: existing } = await supabase
    .from('orders')
    .select('id')
    .eq('stripe_session_id', session.id)
    .single();

  if (existing) {
    return { statusCode: 200, body: 'Already processed' };
  }

  const { data: order, error } = await supabase
    .from('orders')
    .insert({
      stripe_session_id: session.id,
      customer_name: session.customer_details?.name || null,
      customer_email: session.customer_details?.email || 'unknown',
      service_type: SERVICE_MAP[amount] || `Service (£${(amount / 100).toFixed(2)})`,
      amount,
      status: 'purchase_complete',
    })
    .select('tracking_token, customer_name, customer_email, service_type')
    .single();

  if (error) {
    console.error('Supabase insert error:', error);
    return { statusCode: 500, body: 'Database error' };
  }

  if (order.customer_email && order.customer_email !== 'unknown') {
    await sendTrackingEmail(order);
  }

  return { statusCode: 200, body: 'OK' };
};

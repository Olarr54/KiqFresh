const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const SERVICE_MAP = {
  1500: 'Full Shoe Clean',
  2000: 'Full Clean + Wrap',
  2500: 'Full Shoe Deep Clean',
  4000: 'Triple Clean Bundle',
};

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

  const { error } = await supabase.from('orders').upsert(
    {
      stripe_session_id: session.id,
      customer_name: session.customer_details?.name || null,
      customer_email: session.customer_details?.email || 'unknown',
      service_type: SERVICE_MAP[amount] || `Service (£${(amount / 100).toFixed(2)})`,
      amount,
      status: 'received',
    },
    { onConflict: 'stripe_session_id', ignoreDuplicates: true }
  );

  if (error) {
    console.error('Supabase insert error:', error);
    return { statusCode: 500, body: 'Database error' };
  }

  return { statusCode: 200, body: 'OK' };
};

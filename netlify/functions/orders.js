const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const VALID_STATUSES = ['purchase_complete', 'received', 'cleaning', 'complete', 'returned'];

async function verifyAdmin(authHeader) {
  if (!authHeader?.startsWith('Bearer ')) return null;
  const token = authHeader.slice(7);
  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) return null;
  return user;
}

exports.handler = async (event) => {
  const user = await verifyAdmin(event.headers.authorization);
  if (!user) {
    return {
      statusCode: 401,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ error: 'Unauthorized' }),
    };
  }

  if (event.httpMethod === 'GET') {
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Supabase select error:', error);
      return { statusCode: 500, body: JSON.stringify({ error: 'Database error' }) };
    }

    return {
      statusCode: 200,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    };
  }

  if (event.httpMethod === 'PATCH') {
    let body;
    try {
      body = JSON.parse(event.body);
    } catch {
      return { statusCode: 400, body: JSON.stringify({ error: 'Invalid JSON' }) };
    }

    const { id, status, notes } = body;
    if (!id) return { statusCode: 400, body: JSON.stringify({ error: 'Missing id' }) };
    if (status !== undefined && !VALID_STATUSES.includes(status)) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Invalid status' }) };
    }

    const update = { updated_at: new Date().toISOString() };
    if (status !== undefined) update.status = status;
    if (notes !== undefined) update.notes = notes;

    const { error } = await supabase
      .from('orders')
      .update(update)
      .eq('id', id);

    if (error) {
      console.error('Supabase update error:', error);
      return { statusCode: 500, body: JSON.stringify({ error: 'Database error' }) };
    }

    return { statusCode: 200, body: JSON.stringify({ ok: true }) };
  }

  return { statusCode: 405, body: JSON.stringify({ error: 'Method Not Allowed' }) };
};

const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

// Backup opening hours, used only if the admin settings can't be loaded.
// The admin panel (kiqfresh.net/admin → Booking Availability) always wins.
// closedDays: 0=Sun 1=Mon 2=Tue 3=Wed 4=Thu 5=Fri 6=Sat   e.g. [3, 0] = closed Wed + Sun
// startTime/endTime: 24-hour time, 2-digit hour, e.g. '09:00' to '16:00'
// Keep this line matching the "collAvailability" line in booking.html.
const DEFAULTS = { closedDays: [3], startTime: '12:00', endTime: '17:00' };
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;

async function verifyAdmin(authHeader) {
  if (!authHeader?.startsWith('Bearer ')) return null;
  const token = authHeader.slice(7);
  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error || !user) return null;
  return user;
}

exports.handler = async (event) => {
  if (event.httpMethod === 'GET') {
    try {
      const { data, error } = await supabase
        .from('booking_settings')
        .select('closed_days, start_time, end_time')
        .eq('id', 1)
        .single();
      if (error || !data) throw error || new Error('no row');
      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=60' },
        body: JSON.stringify({
          closedDays: data.closed_days,
          startTime: data.start_time,
          endTime: data.end_time,
        }),
      };
    } catch (err) {
      console.error('booking-availability GET error:', err);
      return {
        statusCode: 200,
        headers: { 'Content-Type': 'application/json', 'Cache-Control': 'public, max-age=60' },
        body: JSON.stringify(DEFAULTS),
      };
    }
  }

  if (event.httpMethod === 'PATCH') {
    const user = await verifyAdmin(event.headers.authorization);
    if (!user) {
      return {
        statusCode: 401,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ error: 'Unauthorized' }),
      };
    }

    let body;
    try {
      body = JSON.parse(event.body);
    } catch {
      return { statusCode: 400, body: JSON.stringify({ error: 'Invalid JSON' }) };
    }

    const { closedDays, startTime, endTime } = body;
    if (!Array.isArray(closedDays) || !closedDays.every(d => Number.isInteger(d) && d >= 0 && d <= 6)) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Invalid closedDays' }) };
    }
    if (!TIME_RE.test(startTime) || !TIME_RE.test(endTime)) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Invalid time format' }) };
    }
    if (startTime >= endTime) {
      return { statusCode: 400, body: JSON.stringify({ error: 'Start time must be before end time' }) };
    }

    const { error } = await supabase
      .from('booking_settings')
      .update({
        closed_days: closedDays,
        start_time: startTime,
        end_time: endTime,
        updated_at: new Date().toISOString(),
      })
      .eq('id', 1);

    if (error) {
      console.error('booking-availability PATCH error:', error);
      return { statusCode: 500, body: JSON.stringify({ error: 'Database error' }) };
    }
    return { statusCode: 200, body: JSON.stringify({ ok: true }) };
  }

  return { statusCode: 405, body: JSON.stringify({ error: 'Method Not Allowed' }) };
};

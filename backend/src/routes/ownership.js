const supabase = require('../supabase');

async function sessionBelongsToUser(sessionId, userId) {
  const { data, error } = await supabase
    .from('sessions')
    .select('id')
    .eq('id', sessionId)
    .eq('user_id', userId)
    .maybeSingle();

  if (error) throw error;
  return !!data;
}

async function alertBelongsToUser(alertId, userId) {
  const { data: alert, error: alertError } = await supabase
    .from('alert_events')
    .select('session_id')
    .eq('id', alertId)
    .maybeSingle();

  if (alertError) throw alertError;
  if (!alert?.session_id) return false;
  return sessionBelongsToUser(alert.session_id, userId);
}

module.exports = { alertBelongsToUser, sessionBelongsToUser };

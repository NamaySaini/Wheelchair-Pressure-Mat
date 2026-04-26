const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// POC: no auth yet — every row is written against this single demo user.
// Swap for req.user.id once real Supabase Auth is wired on the frontend.
const DEMO_USER_ID = process.env.DEMO_USER_ID || '00000000-0000-0000-0000-000000000001';

module.exports = supabase;
module.exports.DEMO_USER_ID = DEMO_USER_ID;

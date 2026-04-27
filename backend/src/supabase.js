const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_KEY
);

// Used by seed scripts only. Runtime routes should use req.user.id from Supabase Auth.
const DEMO_USER_ID = process.env.DEMO_USER_ID || '00000000-0000-0000-0000-000000000001';

module.exports = supabase;
module.exports.DEMO_USER_ID = DEMO_USER_ID;

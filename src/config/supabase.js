const { createClient } = require('@supabase/supabase-js');
const logger = require('./logger');

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  logger.error('Missing Supabase configuration. Please check environment variables.');
  process.exit(1);
}

// Public client (respects RLS policies)
const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: false,
    detectSessionInUrl: false,
  },
  db: {
    schema: 'public',
  },
  global: {
    headers: {
      'x-application-name': 'nyaay-saathi-api',
    },
  },
});

// Admin client (bypasses RLS - use carefully!)
const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
  db: {
    schema: 'public',
  },
});

// Create authenticated client for a specific user
const createAuthenticatedClient = (accessToken) => {
  return createClient(supabaseUrl, supabaseAnonKey, {
    global: {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    },
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
};

// Health check function
const checkDatabaseConnection = async () => {
  try {
    const { data, error } = await supabaseAdmin
      .from('users')
      .select('count', { count: 'exact', head: true });
    
    if (error) throw error;
    return { status: 'healthy', latency: Date.now() };
  } catch (error) {
    logger.error('Database connection check failed:', error);
    return { status: 'unhealthy', error: error.message };
  }
};

module.exports = {
  supabase,
  supabaseAdmin,
  createAuthenticatedClient,
  checkDatabaseConnection,
};

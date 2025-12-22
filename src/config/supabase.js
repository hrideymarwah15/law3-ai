/**
 * Supabase Client Configuration
 * 
 * Production-level configuration for Supabase clients with:
 * - RLS-respecting public client for user requests
 * - Service role client for admin operations (use carefully!)
 * - Authenticated client factory for user-specific operations
 * - Connection pooling and retry settings
 * - Health check utilities
 * 
 * Security Notes:
 * - All database functions use SET search_path = '' for security
 * - RLS policies use (SELECT auth.uid()) for performance optimization
 * - Service role key bypasses RLS - use only when necessary
 * 
 * @module config/supabase
 */

const { createClient } = require('@supabase/supabase-js');
const logger = require('./logger');

// Environment configuration
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseAnonKey = process.env.SUPABASE_ANON_KEY;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

// Validate required configuration
if (!supabaseUrl || !supabaseAnonKey) {
  logger.error('Missing Supabase configuration. Please check environment variables.');
  logger.error('Required: SUPABASE_URL, SUPABASE_ANON_KEY');
  process.exit(1);
}

if (!supabaseServiceKey) {
  logger.warn('SUPABASE_SERVICE_ROLE_KEY not set. Admin operations will fail.');
}

// Common client options for connection reliability
const commonOptions = {
  db: {
    schema: 'public',
  },
  global: {
    headers: {
      'x-application-name': 'nyaay-saathi-api',
      'x-application-version': process.env.npm_package_version || '1.0.0',
    },
    fetch: (url, options) => {
      // Add timeout to all requests
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 30000); // 30 second timeout
      
      return fetch(url, {
        ...options,
        signal: controller.signal,
      }).finally(() => clearTimeout(timeoutId));
    },
  },
};

/**
 * Public client (respects RLS policies)
 * Use this for unauthenticated or general operations
 * RLS will be enforced based on the auth.uid() of the request
 */
const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  ...commonOptions,
  auth: {
    autoRefreshToken: true,
    persistSession: false,
    detectSessionInUrl: false,
  },
});

/**
 * Admin client (bypasses RLS - use carefully!)
 * 
 * SECURITY WARNING: This client bypasses all RLS policies.
 * Only use for:
 * - Administrative operations
 * - Background jobs and schedulers
 * - System-level data access
 * - Operations that require cross-user data access
 * 
 * DO NOT use for:
 * - Direct user requests without proper authorization checks
 * - Operations where RLS should apply
 */
const supabaseAdmin = supabaseServiceKey
  ? createClient(supabaseUrl, supabaseServiceKey, {
      ...commonOptions,
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })
  : null;

// Proxy to throw meaningful error if admin client is used without service key
const supabaseAdminProxy = supabaseAdmin || new Proxy({}, {
  get: () => {
    throw new Error('supabaseAdmin not available: SUPABASE_SERVICE_ROLE_KEY not configured');
  },
});

/**
 * Create an authenticated client for a specific user
 * This client will execute operations as the specified user,
 * respecting RLS policies based on their auth.uid()
 * 
 * @param {string} accessToken - The user's JWT access token
 * @returns {SupabaseClient} Authenticated Supabase client
 */
const createAuthenticatedClient = (accessToken) => {
  if (!accessToken) {
    throw new Error('Access token is required for authenticated client');
  }

  return createClient(supabaseUrl, supabaseAnonKey, {
    ...commonOptions,
    global: {
      ...commonOptions.global,
      headers: {
        ...commonOptions.global.headers,
        Authorization: `Bearer ${accessToken}`,
      },
    },
    auth: {
      autoRefreshToken: false,
      persistSession: false,
    },
  });
};

/**
 * Create a client that acts on behalf of a user
 * Use this when you need service-level access but want to
 * attribute actions to a specific user
 * 
 * @param {string} userId - The user ID to impersonate
 * @returns {Object} Object with client and methods
 */
const createUserContextClient = (userId) => {
  if (!supabaseAdmin) {
    throw new Error('Service role key required for user context client');
  }

  return {
    client: supabaseAdmin,
    userId,
    // Helper to add user context to audit logs
    withAudit: async (operation, data, callback) => {
      const result = await callback(supabaseAdmin);
      logger.debug({
        message: 'User context operation',
        operation,
        userId,
        data,
      });
      return result;
    },
  };
};

/**
 * Health check function with detailed diagnostics
 * 
 * @returns {Promise<Object>} Health status with latency info
 */
const checkDatabaseConnection = async () => {
  const startTime = Date.now();

  try {
    // Test basic connectivity
    const { error } = await supabaseAdminProxy
      .from('users')
      .select('id', { count: 'exact', head: true });

    const latency = Date.now() - startTime;

    if (error) {
      throw error;
    }

    return {
      status: 'healthy',
      latency,
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    const latency = Date.now() - startTime;
    logger.error({
      message: 'Database connection check failed',
      error: error.message,
      latency,
    });

    return {
      status: 'unhealthy',
      error: error.message,
      latency,
      timestamp: new Date().toISOString(),
    };
  }
};

/**
 * Extended health check including RPC functions
 * 
 * @returns {Promise<Object>} Detailed health status
 */
const checkDatabaseHealth = async () => {
  const checks = {
    connection: null,
    rpc: null,
    timestamp: new Date().toISOString(),
  };

  // Basic connection check
  checks.connection = await checkDatabaseConnection();

  // RPC function check (test increment function exists)
  try {
    const rpcStart = Date.now();
    // This will fail gracefully if no matching row, but confirms function exists
    const { error } = await supabaseAdminProxy.rpc('increment', {
      row_id: '00000000-0000-0000-0000-000000000000',
      field_name: 'total_consultations',
      table_name: 'lawyers',
    });

    // Error about no rows is fine - means function works
    if (error && !error.message.includes('No rows')) {
      throw error;
    }

    checks.rpc = {
      status: 'healthy',
      latency: Date.now() - rpcStart,
    };
  } catch (error) {
    checks.rpc = {
      status: 'unhealthy',
      error: error.message,
    };
  }

  // Overall status
  const isHealthy =
    checks.connection.status === 'healthy' &&
    (!checks.rpc || checks.rpc.status === 'healthy');

  return {
    status: isHealthy ? 'healthy' : 'degraded',
    checks,
  };
};

/**
 * Get connection info (useful for debugging)
 */
const getConnectionInfo = () => ({
  url: supabaseUrl?.replace(/\/\/.*@/, '//***@'), // Mask credentials
  hasAnonKey: !!supabaseAnonKey,
  hasServiceKey: !!supabaseServiceKey,
  schema: 'public',
});

module.exports = {
  supabase,
  supabaseAdmin: supabaseAdminProxy,
  createAuthenticatedClient,
  createUserContextClient,
  checkDatabaseConnection,
  checkDatabaseHealth,
  getConnectionInfo,
};

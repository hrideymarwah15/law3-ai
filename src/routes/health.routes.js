const express = require('express');
const router = express.Router();
const { supabaseAdmin } = require('../config/supabase');
const { redisClient } = require('../config/redis');
const logger = require('../config/logger');

/**
 * GET /health
 * Basic health check endpoint
 */
router.get('/', async (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'nyaay-saathi-api',
    version: process.env.npm_package_version || '1.0.0',
  });
});

/**
 * GET /health/detailed
 * Detailed health check with dependencies
 */
router.get('/detailed', async (req, res) => {
  const checks = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    service: 'nyaay-saathi-api',
    version: process.env.npm_package_version || '1.0.0',
    uptime: process.uptime(),
    memory: process.memoryUsage(),
    dependencies: {},
  };

  // Check Supabase/PostgreSQL
  try {
    const start = Date.now();
    const { data, error } = await supabaseAdmin.from('users').select('count').limit(1);
    const latency = Date.now() - start;

    checks.dependencies.database = {
      status: error ? 'error' : 'ok',
      latency: `${latency}ms`,
      error: error?.message,
    };
  } catch (err) {
    checks.dependencies.database = {
      status: 'error',
      error: err.message,
    };
    checks.status = 'degraded';
  }

  // Check Redis
  try {
    const start = Date.now();
    await redisClient.ping();
    const latency = Date.now() - start;

    checks.dependencies.redis = {
      status: 'ok',
      latency: `${latency}ms`,
    };
  } catch (err) {
    checks.dependencies.redis = {
      status: 'error',
      error: err.message,
    };
    checks.status = 'degraded';
  }

  // Set appropriate HTTP status
  const httpStatus = checks.status === 'ok' ? 200 : 503;

  res.status(httpStatus).json(checks);
});

/**
 * GET /health/ready
 * Readiness probe for Kubernetes/container orchestration
 */
router.get('/ready', async (req, res) => {
  try {
    // Check critical dependencies
    const [dbCheck, redisCheck] = await Promise.all([
      supabaseAdmin.from('users').select('count').limit(1),
      redisClient.ping(),
    ]);

    if (dbCheck.error) {
      throw new Error('Database not ready');
    }

    res.json({ ready: true });
  } catch (err) {
    logger.error({ message: 'Readiness check failed', error: err.message });
    res.status(503).json({ ready: false, error: err.message });
  }
});

/**
 * GET /health/live
 * Liveness probe for Kubernetes/container orchestration
 */
router.get('/live', (req, res) => {
  res.json({ alive: true });
});

module.exports = router;

/**
 * Base Repository
 * Abstract data access layer providing common CRUD operations
 * 
 * @module repositories/base.repository
 */

const { supabaseAdmin } = require('../config/supabase');
const { cache } = require('../config/redis');
const logger = require('../config/logger');
const { NotFoundError, ValidationError } = require('../middleware/errorHandler');

/**
 * Base Repository Class
 * Provides common database operations with caching support
 */
class BaseRepository {
  /**
   * @param {string} tableName - Database table name
   * @param {Object} options - Repository options
   * @param {string} [options.primaryKey='id'] - Primary key column
   * @param {number} [options.cacheTtl=300] - Cache TTL in seconds
   * @param {boolean} [options.enableCache=true] - Enable caching
   */
  constructor(tableName, options = {}) {
    this.tableName = tableName;
    this.primaryKey = options.primaryKey || 'id';
    this.cacheTtl = options.cacheTtl || 300;
    this.enableCache = options.enableCache !== false;
    this.db = supabaseAdmin;
  }

  /**
   * Generate cache key
   * @param {string} operation - Operation name
   * @param {string|Object} identifier - Unique identifier
   * @returns {string} Cache key
   */
  getCacheKey(operation, identifier) {
    const id = typeof identifier === 'object' ? JSON.stringify(identifier) : identifier;
    return `${this.tableName}:${operation}:${id}`;
  }

  /**
   * Find record by ID
   * @param {string} id - Record ID
   * @param {Object} options - Query options
   * @param {string} [options.select='*'] - Columns to select
   * @param {boolean} [options.useCache=true] - Use cache
   * @returns {Promise<Object|null>} Record or null
   */
  async findById(id, options = {}) {
    const { select = '*', useCache = true } = options;
    const cacheKey = this.getCacheKey('id', id);

    // Try cache first
    if (this.enableCache && useCache) {
      const cached = await cache.get(cacheKey);
      if (cached) {
        logger.debug({ message: 'Cache hit', table: this.tableName, id });
        return cached;
      }
    }

    const { data, error } = await this.db
      .from(this.tableName)
      .select(select)
      .eq(this.primaryKey, id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') return null; // Not found
      throw error;
    }

    // Cache result
    if (this.enableCache && useCache && data) {
      await cache.set(cacheKey, data, this.cacheTtl);
    }

    return data;
  }

  /**
   * Find record by ID or throw NotFoundError
   * @param {string} id - Record ID
   * @param {Object} options - Query options
   * @returns {Promise<Object>} Record
   * @throws {NotFoundError} If not found
   */
  async findByIdOrFail(id, options = {}) {
    const record = await this.findById(id, options);
    if (!record) {
      throw new NotFoundError(`${this.tableName} not found`);
    }
    return record;
  }

  /**
   * Find single record by conditions
   * @param {Object} conditions - Where conditions
   * @param {Object} options - Query options
   * @returns {Promise<Object|null>} Record or null
   */
  async findOne(conditions, options = {}) {
    const { select = '*' } = options;

    let query = this.db.from(this.tableName).select(select);

    // Apply conditions
    for (const [key, value] of Object.entries(conditions)) {
      if (value === null) {
        query = query.is(key, null);
      } else if (Array.isArray(value)) {
        query = query.in(key, value);
      } else {
        query = query.eq(key, value);
      }
    }

    const { data, error } = await query.limit(1).single();

    if (error && error.code !== 'PGRST116') throw error;
    return data || null;
  }

  /**
   * Find multiple records
   * @param {Object} options - Query options
   * @param {Object} [options.where={}] - Where conditions
   * @param {string} [options.select='*'] - Columns to select
   * @param {Object} [options.orderBy] - Order by { column, ascending }
   * @param {number} [options.page=1] - Page number
   * @param {number} [options.limit=20] - Records per page
   * @returns {Promise<{data: Array, total: number}>} Records and total count
   */
  async findMany(options = {}) {
    const {
      where = {},
      select = '*',
      orderBy,
      page = 1,
      limit = 20,
    } = options;

    const offset = (page - 1) * limit;

    let query = this.db
      .from(this.tableName)
      .select(select, { count: 'exact' });

    // Apply where conditions
    for (const [key, value] of Object.entries(where)) {
      if (value === null) {
        query = query.is(key, null);
      } else if (Array.isArray(value)) {
        query = query.in(key, value);
      } else if (typeof value === 'object') {
        // Handle operators: { gt: 5 }, { like: '%search%' }, etc.
        for (const [op, opValue] of Object.entries(value)) {
          switch (op) {
            case 'gt': query = query.gt(key, opValue); break;
            case 'gte': query = query.gte(key, opValue); break;
            case 'lt': query = query.lt(key, opValue); break;
            case 'lte': query = query.lte(key, opValue); break;
            case 'like': query = query.like(key, opValue); break;
            case 'ilike': query = query.ilike(key, opValue); break;
            case 'neq': query = query.neq(key, opValue); break;
            case 'is': query = query.is(key, opValue); break;
            default: query = query.eq(key, opValue);
          }
        }
      } else {
        query = query.eq(key, value);
      }
    }

    // Apply ordering
    if (orderBy) {
      query = query.order(orderBy.column, { ascending: orderBy.ascending ?? true });
    }

    // Apply pagination
    query = query.range(offset, offset + limit - 1);

    const { data, error, count } = await query;

    if (error) throw error;

    return { data: data || [], total: count || 0 };
  }

  /**
   * Create new record
   * @param {Object} data - Record data
   * @param {Object} options - Insert options
   * @returns {Promise<Object>} Created record
   */
  async create(data, options = {}) {
    const { select = '*' } = options;

    // Add timestamps
    const now = new Date().toISOString();
    const recordData = {
      ...data,
      created_at: data.created_at || now,
      updated_at: data.updated_at || now,
    };

    const { data: created, error } = await this.db
      .from(this.tableName)
      .insert(recordData)
      .select(select)
      .single();

    if (error) {
      if (error.code === '23505') { // Unique violation
        throw new ValidationError(`${this.tableName} already exists`);
      }
      throw error;
    }

    // Invalidate list cache
    await this.invalidateListCache();

    logger.info({ 
      message: `${this.tableName} created`, 
      id: created[this.primaryKey] 
    });

    return created;
  }

  /**
   * Create multiple records
   * @param {Array<Object>} records - Array of record data
   * @returns {Promise<Array>} Created records
   */
  async createMany(records) {
    const now = new Date().toISOString();
    const recordsWithTimestamps = records.map(record => ({
      ...record,
      created_at: record.created_at || now,
      updated_at: record.updated_at || now,
    }));

    const { data, error } = await this.db
      .from(this.tableName)
      .insert(recordsWithTimestamps)
      .select();

    if (error) throw error;

    await this.invalidateListCache();

    logger.info({ 
      message: `${this.tableName} bulk created`, 
      count: data.length 
    });

    return data;
  }

  /**
   * Update record by ID
   * @param {string} id - Record ID
   * @param {Object} data - Update data
   * @param {Object} options - Update options
   * @returns {Promise<Object>} Updated record
   */
  async update(id, data, options = {}) {
    const { select = '*' } = options;

    const updateData = {
      ...data,
      updated_at: new Date().toISOString(),
    };

    const { data: updated, error } = await this.db
      .from(this.tableName)
      .update(updateData)
      .eq(this.primaryKey, id)
      .select(select)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        throw new NotFoundError(`${this.tableName} not found`);
      }
      throw error;
    }

    // Invalidate cache
    await this.invalidateCache(id);

    logger.info({ message: `${this.tableName} updated`, id });

    return updated;
  }

  /**
   * Update multiple records by condition
   * @param {Object} where - Where conditions
   * @param {Object} data - Update data
   * @returns {Promise<Array>} Updated records
   */
  async updateMany(where, data) {
    const updateData = {
      ...data,
      updated_at: new Date().toISOString(),
    };

    let query = this.db.from(this.tableName).update(updateData);

    for (const [key, value] of Object.entries(where)) {
      query = query.eq(key, value);
    }

    const { data: updated, error } = await query.select();

    if (error) throw error;

    // Invalidate cache for all updated records
    for (const record of updated) {
      await this.invalidateCache(record[this.primaryKey]);
    }

    return updated;
  }

  /**
   * Delete record by ID (soft delete if column exists)
   * @param {string} id - Record ID
   * @param {Object} options - Delete options
   * @param {boolean} [options.hard=false] - Hard delete
   * @returns {Promise<boolean>} Success
   */
  async delete(id, options = {}) {
    const { hard = false } = options;

    let query;

    if (hard) {
      query = this.db.from(this.tableName).delete().eq(this.primaryKey, id);
    } else {
      // Soft delete
      query = this.db
        .from(this.tableName)
        .update({ deleted_at: new Date().toISOString() })
        .eq(this.primaryKey, id);
    }

    const { error } = await query;

    if (error) throw error;

    // Invalidate cache
    await this.invalidateCache(id);

    logger.info({ message: `${this.tableName} deleted`, id, hard });

    return true;
  }

  /**
   * Count records
   * @param {Object} where - Where conditions
   * @returns {Promise<number>} Count
   */
  async count(where = {}) {
    let query = this.db
      .from(this.tableName)
      .select('*', { count: 'exact', head: true });

    for (const [key, value] of Object.entries(where)) {
      query = query.eq(key, value);
    }

    const { count, error } = await query;

    if (error) throw error;

    return count || 0;
  }

  /**
   * Check if record exists
   * @param {Object} where - Where conditions
   * @returns {Promise<boolean>} Exists
   */
  async exists(where) {
    const count = await this.count(where);
    return count > 0;
  }

  /**
   * Invalidate cache for a record
   * @param {string} id - Record ID
   */
  async invalidateCache(id) {
    if (!this.enableCache) return;

    const patterns = [
      this.getCacheKey('id', id),
      this.getCacheKey('list', '*'),
    ];

    for (const pattern of patterns) {
      await cache.del(pattern);
    }
  }

  /**
   * Invalidate list cache
   */
  async invalidateListCache() {
    if (!this.enableCache) return;
    // Note: In production, use Redis SCAN for pattern deletion
    await cache.del(this.getCacheKey('list', 'all'));
  }

  /**
   * Execute raw query
   * @param {string} functionName - Supabase function name
   * @param {Object} params - Function parameters
   * @returns {Promise<*>} Result
   */
  async rpc(functionName, params = {}) {
    const { data, error } = await this.db.rpc(functionName, params);
    if (error) throw error;
    return data;
  }

  /**
   * Transaction helper (uses Supabase transaction)
   * Note: Supabase doesn't support true transactions in JS client,
   * this is a helper for batch operations
   * @param {Function} callback - Transaction callback
   * @returns {Promise<*>} Result
   */
  async transaction(callback) {
    // Supabase JS doesn't support real transactions
    // For critical operations, use database functions (RPC)
    return await callback(this.db);
  }
}

module.exports = BaseRepository;

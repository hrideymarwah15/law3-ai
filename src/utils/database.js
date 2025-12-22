/**
 * Database Utilities
 * 
 * Production-level database helper functions for:
 * - RPC function calls with proper error handling
 * - Database health checks
 * - Query optimization helpers
 * - Transaction-like operations
 * 
 * @module utils/database
 */

const { supabaseAdmin } = require('../config/supabase');
const logger = require('../config/logger');

/**
 * Database RPC function wrappers with proper error handling
 * These functions map to PostgreSQL functions with SET search_path = ''
 */

/**
 * Increment a counter column in any table
 * Maps to: public.increment(row_id UUID, field_name TEXT, table_name TEXT)
 * 
 * @param {string} tableName - The table containing the counter
 * @param {string} fieldName - The column to increment
 * @param {string} rowId - The UUID of the row to update
 * @returns {Promise<void>}
 * @throws {Error} If the increment operation fails
 */
async function incrementCounter(tableName, fieldName, rowId) {
  try {
    const { error } = await supabaseAdmin.rpc('increment', {
      row_id: rowId,
      field_name: fieldName,
      table_name: tableName,
    });

    if (error) {
      logger.error({
        message: 'Failed to increment counter',
        table: tableName,
        field: fieldName,
        rowId,
        error: error.message,
      });
      throw new Error(`Failed to increment ${fieldName} in ${tableName}: ${error.message}`);
    }

    logger.debug({
      message: 'Counter incremented',
      table: tableName,
      field: fieldName,
      rowId,
    });
  } catch (err) {
    // Re-throw if already processed, otherwise log and throw
    if (err.message.startsWith('Failed to increment')) {
      throw err;
    }
    logger.error({
      message: 'Unexpected error in incrementCounter',
      table: tableName,
      field: fieldName,
      rowId,
      error: err.message,
    });
    throw err;
  }
}

/**
 * Mark messages as read in a chat room
 * Maps to: public.mark_messages_as_read(p_room_id UUID, p_user_id UUID)
 * 
 * @param {string} roomId - The chat room ID
 * @param {string} userId - The user marking messages as read
 * @returns {Promise<number>} Number of messages marked as read
 */
async function markMessagesAsRead(roomId, userId) {
  try {
    const { data, error } = await supabaseAdmin.rpc('mark_messages_as_read', {
      p_room_id: roomId,
      p_user_id: userId,
    });

    if (error) {
      logger.error({
        message: 'Failed to mark messages as read',
        roomId,
        userId,
        error: error.message,
      });
      throw new Error(`Failed to mark messages as read: ${error.message}`);
    }

    return data || 0;
  } catch (err) {
    if (err.message.startsWith('Failed to mark')) {
      throw err;
    }
    logger.error({
      message: 'Unexpected error in markMessagesAsRead',
      roomId,
      userId,
      error: err.message,
    });
    throw err;
  }
}

/**
 * Reschedule a consultation via database function
 * Maps to: public.reschedule_consultation(p_consultation_id UUID, p_new_date TIMESTAMPTZ, p_reason TEXT)
 * 
 * @param {string} consultationId - The consultation ID
 * @param {Date|string} newDate - The new scheduled date/time
 * @param {string} [reason] - Optional reason for rescheduling
 * @returns {Promise<boolean>} Success status
 */
async function rescheduleConsultation(consultationId, newDate, reason = null) {
  try {
    const newDateISO = newDate instanceof Date ? newDate.toISOString() : newDate;

    const { data, error } = await supabaseAdmin.rpc('reschedule_consultation', {
      p_consultation_id: consultationId,
      p_new_date: newDateISO,
      p_reason: reason,
    });

    if (error) {
      logger.error({
        message: 'Failed to reschedule consultation',
        consultationId,
        newDate: newDateISO,
        error: error.message,
      });
      throw new Error(`Failed to reschedule consultation: ${error.message}`);
    }

    return data === true;
  } catch (err) {
    if (err.message.startsWith('Failed to reschedule')) {
      throw err;
    }
    logger.error({
      message: 'Unexpected error in rescheduleConsultation',
      consultationId,
      newDate,
      error: err.message,
    });
    throw err;
  }
}

/**
 * Create a lawyer from registration request
 * Maps to: public.create_lawyer_from_registration(request_id UUID, admin_id UUID)
 * 
 * @param {string} requestId - The registration request ID
 * @param {string} adminId - The admin user ID approving the request
 * @returns {Promise<Object>} The created lawyer data
 */
async function createLawyerFromRegistration(requestId, adminId) {
  try {
    const { data, error } = await supabaseAdmin.rpc('create_lawyer_from_registration', {
      request_id: requestId,
      admin_id: adminId,
    });

    if (error) {
      logger.error({
        message: 'Failed to create lawyer from registration',
        requestId,
        adminId,
        error: error.message,
      });
      throw new Error(`Failed to create lawyer from registration: ${error.message}`);
    }

    logger.info({
      message: 'Lawyer created from registration',
      requestId,
      adminId,
      lawyerId: data?.id,
    });

    return data;
  } catch (err) {
    if (err.message.startsWith('Failed to create lawyer')) {
      throw err;
    }
    logger.error({
      message: 'Unexpected error in createLawyerFromRegistration',
      requestId,
      adminId,
      error: err.message,
    });
    throw err;
  }
}

/**
 * Get or create a chat room
 * Maps to: public.get_or_create_chat_room(p_user1_id UUID, p_user2_id UUID, p_consultation_id UUID)
 * 
 * @param {string} user1Id - First user ID
 * @param {string} user2Id - Second user ID
 * @param {string} [consultationId] - Optional consultation ID
 * @returns {Promise<string>} The room ID
 */
async function getOrCreateChatRoom(user1Id, user2Id, consultationId = null) {
  try {
    const { data, error } = await supabaseAdmin.rpc('get_or_create_chat_room', {
      p_user1_id: user1Id,
      p_user2_id: user2Id,
      p_consultation_id: consultationId,
    });

    if (error) {
      logger.error({
        message: 'Failed to get or create chat room',
        user1Id,
        user2Id,
        consultationId,
        error: error.message,
      });
      throw new Error(`Failed to get or create chat room: ${error.message}`);
    }

    return data;
  } catch (err) {
    if (err.message.startsWith('Failed to get or create')) {
      throw err;
    }
    logger.error({
      message: 'Unexpected error in getOrCreateChatRoom',
      user1Id,
      user2Id,
      consultationId,
      error: err.message,
    });
    throw err;
  }
}

/**
 * Generic RPC call with error handling and logging
 * Use this for any RPC function not wrapped above
 * 
 * @param {string} functionName - The database function name
 * @param {Object} params - The function parameters
 * @param {Object} [options] - Additional options
 * @param {boolean} [options.throwOnError=true] - Whether to throw on error
 * @returns {Promise<any>} The function result
 */
async function callRpc(functionName, params = {}, options = { throwOnError: true }) {
  try {
    const { data, error } = await supabaseAdmin.rpc(functionName, params);

    if (error) {
      logger.error({
        message: `RPC call failed: ${functionName}`,
        params,
        error: error.message,
      });

      if (options.throwOnError) {
        throw new Error(`RPC ${functionName} failed: ${error.message}`);
      }
      return null;
    }

    logger.debug({
      message: `RPC call successful: ${functionName}`,
      params,
    });

    return data;
  } catch (err) {
    if (err.message.startsWith('RPC ')) {
      throw err;
    }
    logger.error({
      message: `Unexpected error in RPC call: ${functionName}`,
      params,
      error: err.message,
    });
    if (options.throwOnError) {
      throw err;
    }
    return null;
  }
}

/**
 * Execute multiple operations in a pseudo-transaction
 * Note: Supabase JS client doesn't support true transactions,
 * but this provides rollback-like behavior for common patterns
 * 
 * @param {Function[]} operations - Array of async functions to execute
 * @param {Function[]} [rollbacks] - Array of rollback functions (reverse order)
 * @returns {Promise<any[]>} Results of all operations
 */
async function executeWithRollback(operations, rollbacks = []) {
  const results = [];
  const completedOps = [];

  try {
    for (let i = 0; i < operations.length; i++) {
      const result = await operations[i]();
      results.push(result);
      completedOps.push(i);
    }
    return results;
  } catch (error) {
    logger.error({
      message: 'Transaction failed, initiating rollback',
      completedOps,
      error: error.message,
    });

    // Execute rollbacks in reverse order
    for (let i = completedOps.length - 1; i >= 0; i--) {
      const opIndex = completedOps[i];
      if (rollbacks[opIndex]) {
        try {
          await rollbacks[opIndex](results[opIndex]);
          logger.debug({ message: `Rollback ${opIndex} completed` });
        } catch (rollbackError) {
          logger.error({
            message: `Rollback ${opIndex} failed`,
            error: rollbackError.message,
          });
        }
      }
    }

    throw error;
  }
}

/**
 * Safe batch update with chunking for large datasets
 * 
 * @param {string} tableName - The table to update
 * @param {Object[]} items - Array of items with id and update data
 * @param {number} [chunkSize=100] - Number of items per batch
 * @returns {Promise<number>} Total number of updated rows
 */
async function batchUpdate(tableName, items, chunkSize = 100) {
  let totalUpdated = 0;

  for (let i = 0; i < items.length; i += chunkSize) {
    const chunk = items.slice(i, i + chunkSize);

    await Promise.all(
      chunk.map(async (item) => {
        const { id, ...updateData } = item;
        const { error } = await supabaseAdmin
          .from(tableName)
          .update(updateData)
          .eq('id', id);

        if (!error) {
          totalUpdated++;
        } else {
          logger.warn({
            message: 'Batch update item failed',
            tableName,
            id,
            error: error.message,
          });
        }
      })
    );
  }

  logger.info({
    message: 'Batch update completed',
    tableName,
    totalItems: items.length,
    totalUpdated,
  });

  return totalUpdated;
}

/**
 * Check database health and connection
 * 
 * @returns {Promise<Object>} Health status
 */
async function checkHealth() {
  const startTime = Date.now();

  try {
    const { error } = await supabaseAdmin
      .from('users')
      .select('id', { count: 'exact', head: true });

    const latency = Date.now() - startTime;

    if (error) {
      return {
        status: 'unhealthy',
        latency,
        error: error.message,
      };
    }

    return {
      status: 'healthy',
      latency,
    };
  } catch (err) {
    return {
      status: 'unhealthy',
      latency: Date.now() - startTime,
      error: err.message,
    };
  }
}

module.exports = {
  // RPC Wrappers
  incrementCounter,
  markMessagesAsRead,
  rescheduleConsultation,
  createLawyerFromRegistration,
  getOrCreateChatRoom,
  callRpc,

  // Utilities
  executeWithRollback,
  batchUpdate,
  checkHealth,
};

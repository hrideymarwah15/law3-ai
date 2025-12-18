const { supabaseAdmin } = require('../config/supabase');
const logger = require('../config/logger');

class StorageService {
  /**
   * Upload a file to Supabase Storage
   * @param {Buffer|Blob} file - File content
   * @param {string} bucket - Bucket name
   * @param {string} path - File path in bucket
   * @param {object} options - Upload options
   */
  async uploadFile(file, bucket, path, options = {}) {
    try {
      const { data, error } = await supabaseAdmin.storage
        .from(bucket)
        .upload(path, file, {
          cacheControl: '3600',
          upsert: options.upsert || false,
          contentType: options.contentType,
        });

      if (error) {
        throw error;
      }

      logger.info({ message: 'File uploaded', bucket, path });

      return {
        success: true,
        path: data.path,
        fullPath: data.fullPath,
      };
    } catch (error) {
      logger.error({ message: 'File upload failed', bucket, path, error: error.message });
      throw error;
    }
  }

  /**
   * Get public URL for a file
   * @param {string} bucket - Bucket name
   * @param {string} path - File path
   */
  getPublicUrl(bucket, path) {
    const { data } = supabaseAdmin.storage
      .from(bucket)
      .getPublicUrl(path);

    return data.publicUrl;
  }

  /**
   * Create a signed URL for temporary access
   * @param {string} bucket - Bucket name
   * @param {string} path - File path
   * @param {number} expiresIn - Expiration time in seconds
   */
  async createSignedUrl(bucket, path, expiresIn = 3600) {
    try {
      const { data, error } = await supabaseAdmin.storage
        .from(bucket)
        .createSignedUrl(path, expiresIn);

      if (error) {
        throw error;
      }

      return data.signedUrl;
    } catch (error) {
      logger.error({ message: 'Failed to create signed URL', bucket, path, error: error.message });
      throw error;
    }
  }

  /**
   * Delete files from storage
   * @param {string} bucket - Bucket name
   * @param {string[]} paths - Array of file paths
   */
  async deleteFiles(bucket, paths) {
    try {
      const { data, error } = await supabaseAdmin.storage
        .from(bucket)
        .remove(paths);

      if (error) {
        throw error;
      }

      logger.info({ message: 'Files deleted', bucket, count: paths.length });

      return { success: true, deleted: data };
    } catch (error) {
      logger.error({ message: 'File deletion failed', bucket, error: error.message });
      throw error;
    }
  }

  /**
   * List files in a folder
   * @param {string} bucket - Bucket name
   * @param {string} folder - Folder path
   */
  async listFiles(bucket, folder = '') {
    try {
      const { data, error } = await supabaseAdmin.storage
        .from(bucket)
        .list(folder, {
          limit: 100,
          offset: 0,
          sortBy: { column: 'created_at', order: 'desc' },
        });

      if (error) {
        throw error;
      }

      return data;
    } catch (error) {
      logger.error({ message: 'Failed to list files', bucket, folder, error: error.message });
      throw error;
    }
  }
}

module.exports = new StorageService();

/**
 * BackendApi - Centralized API service for Google Apps Script backend
 * Extracted from dasbor-kuis.js for better maintainability
 * 
 * Handles: API calls, queue management, data fetching
 */

export class BackendApi {
  constructor(appsScriptUrl) {
    this._appsScriptUrl = appsScriptUrl;
    this._isFlushing = false;
  }

  /**
   * Set the Apps Script URL
   * @param {string} url - Apps Script web app URL
   */
  setUrl(url) {
    this._appsScriptUrl = url;
  }

  /**
   * Make API request to Apps Script
   * @param {Object} params - Request parameters
   * @returns {Promise<Object>} Response data
   */
  async apiGet(params) {
    if (!this._appsScriptUrl) {
      throw new Error('Apps Script URL not configured');
    }

    const url = new URL(this._appsScriptUrl);
    Object.keys(params).forEach(key => {
      if (params[key] !== undefined && params[key] !== null) {
        url.searchParams.set(key, String(params[key]));
      }
    });

    try {
      const response = await fetch(url.toString(), {
        method: 'GET',
        mode: 'cors',
        cache: 'no-cache',
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('BackendApi: API request failed', error);
      throw error;
    }
  }

  /**
   * Log activity to backend
   * @param {Object} logData - Activity log data
   * @returns {Promise<void>}
   */
  async logActivity(logData) {
    const { id_log, student_id, id_materi, kategori, tipe_aktivitas, payload_data, timestamp } = logData;
    
    try {
      await this.apiGet({
        action: 'logActivity',
        id_log,
        student_id,
        id_materi,
        kategori,
        tipe_aktivitas,
        payload_data: JSON.stringify(payload_data),
        timestamp: timestamp || new Date().toISOString(),
      });
    } catch (error) {
      console.error('BackendApi: logActivity failed', error);
      // Queue for retry
      this._addToQueue(logData);
    }
  }

  /**
   * Add log to sync queue
   * @param {Object} logData - Log data to queue
   */
  _addToQueue(logData) {
    try {
      let queue = JSON.parse(localStorage.getItem('a3_v5_sync_queue') || '[]');
      if (!Array.isArray(queue)) queue = [];
      
      // Check for duplicate
      const exists = queue.some(q => q && q.id_log === logData.id_log);
      if (!exists) {
        queue.push(logData);
        localStorage.setItem('a3_v5_sync_queue', JSON.stringify(queue));
      }
    } catch (e) {
      console.error('BackendApi: Failed to add to queue', e);
    }
  }

  /**
   * Flush sync queue to backend
   * @returns {Promise<void>}
   */
  async flushQueue() {
    if (this._isFlushing || !this._appsScriptUrl || !navigator.onLine) {
      return;
    }

    this._isFlushing = true;

    try {
      let queue = JSON.parse(localStorage.getItem('a3_v5_sync_queue') || '[]');
      if (!Array.isArray(queue) || queue.length === 0) {
        this._isFlushing = false;
        return;
      }

      // Process queue in batches
      const batchSize = 10;
      let processed = 0;
      
      while (queue.length > 0 && processed < 50) { // Max 50 per flush
        const batch = queue.splice(0, batchSize);
        
        for (const logData of batch) {
          try {
            await this.logActivity(logData);
            processed++;
          } catch (error) {
            // Re-add failed items to queue
            queue.unshift(logData);
            break;
          }
        }
      }

      localStorage.setItem('a3_v5_sync_queue', JSON.stringify(queue));
    } catch (error) {
      console.error('BackendApi: flushQueue failed', error);
    } finally {
      this._isFlushing = false;
    }
  }

  /**
   * Get student roster
   * @param {string} kdMateri - Topic code
   * @returns {Promise<Array>} Student roster
   */
  async getStudentRoster(kdMateri) {
    return this.apiGet({ action: 'getStudentRoster', kdMateri });
  }

  /**
   * Get leaderboard
   * @param {string} kdMateri - Topic code
   * @returns {Promise<Array>} Leaderboard data
   */
  async getLeaderboard(kdMateri) {
    return this.apiGet({ action: 'getLeaderboard', kdMateri });
  }

  /**
   * Get scores
   * @param {string} kdMateri - Topic code
   * @param {string} studentId - Student ID
   * @returns {Promise<Object>} Scores data
   */
  async getScores(kdMateri, studentId) {
    return this.apiGet({ action: 'getScores', kdMateri, student_id: studentId });
  }

  /**
   * Get activity history
   * @param {string} kdMateri - Topic code
   * @returns {Promise<Array>} Activity history
   */
  async getActivityHistory(kdMateri) {
    return this.apiGet({ action: 'getActivityHistory', kdMateri });
  }

  /**
   * Get bank soal (question bank)
   * @param {string} kdMateri - Topic code
   * @returns {Promise<Array>} Question bank
   */
  async getBankSoal(kdMateri) {
    return this.apiGet({ action: 'getBankSoal', kdMateri });
  }
}

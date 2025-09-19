/**
 * Abstract Database Class
 * Defines the interface for all database implementations
 */
class BaseDatabase {
    constructor(parserName) {
        if (this.constructor === BaseDatabase) {
            throw new Error('Cannot instantiate abstract BaseDatabase class');
        }
        this.parserName = parserName;
        this.initialized = false;
    }

    /**
     * Initialize the database
     * @returns {Promise<void>}
     */
    async initialize() {
        throw new Error('initialize() method must be implemented');
    }

    /**
     * Add records to the database
     * @param {Array} records - Array of records to add
     * @param {string} source - Source file name
     * @returns {Object} - Import statistics
     */
    addRecords(records, source) {
        throw new Error('addRecords() method must be implemented');
    }

    /**
     * Get all records
     * @returns {Array} - All records
     */
    getAllRecords() {
        throw new Error('getAllRecords() method must be implemented');
    }

    /**
     * Get records by query
     * @param {Object} query - Query object
     * @returns {Array} - Filtered records
     */
    getRecords(query = {}) {
        throw new Error('getRecords() method must be implemented');
    }

    /**
     * Update a record
     * @param {string} id - Record ID
     * @param {Object} data - Updated data
     * @returns {boolean} - Success status
     */
    updateRecord(id, data) {
        throw new Error('updateRecord() method must be implemented');
    }

    /**
     * Delete a record
     * @param {string} id - Record ID
     * @returns {boolean} - Success status
     */
    deleteRecord(id) {
        throw new Error('deleteRecord() method must be implemented');
    }

    /**
     * Get database statistics
     * @returns {Object} - Statistics
     */
    getStatistics() {
        throw new Error('getStatistics() method must be implemented');
    }

    /**
     * Clear all data
     * @returns {boolean} - Success status
     */
    clearData() {
        throw new Error('clearData() method must be implemented');
    }

    /**
     * Export data
     * @param {string} format - Export format (json, csv, excel)
     * @returns {string|Blob} - Exported data
     */
    exportData(format = 'json') {
        throw new Error('exportData() method must be implemented');
    }

    /**
     * Generate unique record hash for duplicate detection
     * @param {Object} record - Record data
     * @returns {string} - Hash string
     */
    generateRecordHash(record) {
        // Sort keys to ensure consistent hashing
        const sortedKeys = Object.keys(record).sort();
        const hashString = sortedKeys
            .map(key => `${key}:${JSON.stringify(record[key])}`)
            .join('|');
        
        // Simple hash function
        let hash = 0;
        for (let i = 0; i < hashString.length; i++) {
            const char = hashString.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash = hash & hash; // Convert to 32-bit integer
        }
        return hash.toString();
    }

    /**
     * Validate record structure
     * @param {Object} record - Record to validate
     * @returns {boolean} - Is valid
     */
    validateRecord(record) {
        if (!record || typeof record !== 'object') return false;
        
        // Check if record has at least one non-empty field
        return Object.values(record).some(value => 
            value !== null && value !== undefined && value !== ''
        );
    }
}

export default BaseDatabase;

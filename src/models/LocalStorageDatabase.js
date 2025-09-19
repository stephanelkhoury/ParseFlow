import BaseDatabase from './BaseDatabase.js';

/**
 * LocalStorage Database Implementation
 * Stores data in browser's localStorage with parser separation
 */
class LocalStorageDatabase extends BaseDatabase {
    constructor(parserName) {
        super(parserName);
        this.storageKey = `parseflow_${parserName}`;
        this.metaKey = `parseflow_meta_${parserName}`;
        this.records = [];
        this.metadata = {
            created: new Date().toISOString(),
            lastModified: new Date().toISOString(),
            totalRecords: 0,
            sources: []
        };
    }

    async initialize() {
        try {
            // Load existing data
            const stored = localStorage.getItem(this.storageKey);
            const storedMeta = localStorage.getItem(this.metaKey);
            
            if (stored) {
                this.records = JSON.parse(stored);
            }
            
            if (storedMeta) {
                this.metadata = { ...this.metadata, ...JSON.parse(storedMeta) };
            }
            
            this.initialized = true;
            console.log(`LocalStorageDatabase initialized for parser: ${this.parserName}`);
        } catch (error) {
            console.error('Error initializing LocalStorageDatabase:', error);
            this.records = [];
            this.metadata = {
                created: new Date().toISOString(),
                lastModified: new Date().toISOString(),
                totalRecords: 0,
                sources: []
            };
        }
    }

    addRecords(records, source) {
        if (!records || !Array.isArray(records)) {
            throw new Error('Records must be an array');
        }

        const importStats = {
            totalRecords: records.length,
            newRecords: 0,
            duplicates: 0,
            invalid: 0,
            source: source
        };

        // Generate hashes for existing records
        const existingHashes = new Set(this.records.map(r => this.generateRecordHash(r.data)));
        
        records.forEach((record, index) => {
            if (!this.validateRecord(record)) {
                importStats.invalid++;
                return;
            }

            const recordHash = this.generateRecordHash(record);
            
            if (existingHashes.has(recordHash)) {
                importStats.duplicates++;
                return;
            }

            // Add checked field if it doesn't exist
            if (!record.hasOwnProperty('checked')) {
                record.checked = false;
            }

            const newRecord = {
                id: this.generateUniqueId(),
                data: record,
                hash: recordHash,
                source: source,
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };

            this.records.push(newRecord);
            existingHashes.add(recordHash);
            importStats.newRecords++;
        });

        // Update metadata
        this.metadata.totalRecords = this.records.length;
        this.metadata.lastModified = new Date().toISOString();
        
        if (!this.metadata.sources.includes(source)) {
            this.metadata.sources.push(source);
        }

        this.saveToStorage();
        return importStats;
    }

    getAllRecords() {
        return this.records.map(r => ({
            id: r.id,
            ...r.data,
            _metadata: {
                source: r.source,
                createdAt: r.createdAt,
                updatedAt: r.updatedAt
            }
        }));
    }

    getRecords(query = {}) {
        let filteredRecords = this.records;

        // Apply filters
        if (query.source) {
            filteredRecords = filteredRecords.filter(r => r.source === query.source);
        }

        if (query.checked !== undefined) {
            filteredRecords = filteredRecords.filter(r => r.data.checked === query.checked);
        }

        if (query.search) {
            const searchTerm = query.search.toLowerCase();
            filteredRecords = filteredRecords.filter(r => 
                JSON.stringify(r.data).toLowerCase().includes(searchTerm)
            );
        }

        return filteredRecords.map(r => ({
            id: r.id,
            ...r.data,
            _metadata: {
                source: r.source,
                createdAt: r.createdAt,
                updatedAt: r.updatedAt
            }
        }));
    }

    updateRecord(id, data) {
        const recordIndex = this.records.findIndex(r => r.id === id);
        if (recordIndex === -1) {
            return false;
        }

        // Update the record
        this.records[recordIndex].data = { ...this.records[recordIndex].data, ...data };
        this.records[recordIndex].updatedAt = new Date().toISOString();
        
        // Regenerate hash
        this.records[recordIndex].hash = this.generateRecordHash(this.records[recordIndex].data);
        
        this.metadata.lastModified = new Date().toISOString();
        this.saveToStorage();
        return true;
    }

    deleteRecord(id) {
        const recordIndex = this.records.findIndex(r => r.id === id);
        if (recordIndex === -1) {
            return false;
        }

        this.records.splice(recordIndex, 1);
        this.metadata.totalRecords = this.records.length;
        this.metadata.lastModified = new Date().toISOString();
        this.saveToStorage();
        return true;
    }

    getStatistics() {
        const checkedCount = this.records.filter(r => r.data.checked).length;
        const sources = [...new Set(this.records.map(r => r.source))];
        
        return {
            ...this.metadata,
            totalRecords: this.records.length,
            checkedRecords: checkedCount,
            uncheckedRecords: this.records.length - checkedCount,
            sources: sources,
            sourceCount: sources.length
        };
    }

    clearData() {
        this.records = [];
        this.metadata = {
            created: new Date().toISOString(),
            lastModified: new Date().toISOString(),
            totalRecords: 0,
            sources: []
        };
        this.saveToStorage();
        return true;
    }

    exportData(format = 'json') {
        const data = this.getAllRecords();
        
        switch (format.toLowerCase()) {
            case 'json':
                return JSON.stringify(data, null, 2);
            
            case 'csv':
                if (data.length === 0) return '';
                
                const headers = Object.keys(data[0]).filter(key => !key.startsWith('_'));
                const csv = [
                    headers.join(','),
                    ...data.map(row => 
                        headers.map(header => {
                            const value = row[header];
                            return typeof value === 'string' ? `"${value.replace(/"/g, '""')}"` : value;
                        }).join(',')
                    )
                ].join('\n');
                
                return csv;
            
            default:
                throw new Error(`Unsupported export format: ${format}`);
        }
    }

    // Checkbox management methods
    setChecked(ids, checked = true) {
        let updatedCount = 0;
        
        ids.forEach(id => {
            if (this.updateRecord(id, { checked })) {
                updatedCount++;
            }
        });
        
        return updatedCount;
    }

    getCheckedRecords() {
        return this.getRecords({ checked: true });
    }

    getUncheckedRecords() {
        return this.getRecords({ checked: false });
    }

    toggleChecked(id) {
        const record = this.records.find(r => r.id === id);
        if (!record) return false;
        
        return this.updateRecord(id, { checked: !record.data.checked });
    }

    // Private methods
    generateUniqueId() {
        return 'record_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    saveToStorage() {
        try {
            localStorage.setItem(this.storageKey, JSON.stringify(this.records));
            localStorage.setItem(this.metaKey, JSON.stringify(this.metadata));
        } catch (error) {
            console.error('Error saving to localStorage:', error);
            throw new Error('Failed to save data to localStorage');
        }
    }
}

export default LocalStorageDatabase;

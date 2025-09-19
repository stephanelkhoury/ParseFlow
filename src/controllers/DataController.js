import BaseController from './BaseController.js';

/**
 * Data Controller
 * Manages data import, export, and checkbox operations
 */
class DataController extends BaseController {
    constructor(parserManager) {
        super();
        this.parserManager = parserManager;
        this.fileParser = null;
    }

    async initialize() {
        await super.initialize();
        
        // Import the FileParser service when available
        try {
            const { default: FileParser } = await import('../services/FileParser.js');
            this.fileParser = new FileParser();
        } catch (error) {
            console.warn('FileParser service not available yet');
        }
        
        console.log('DataController initialized');
    }

    /**
     * Import files to active parser
     * @param {FileList} files - Files to import
     * @returns {Promise<Object|null>} Import results
     */
    async importFiles(files) {
        return await this.safeExecute(async () => {
            const activeDatabase = this.parserManager.getActiveDatabase();
            if (!activeDatabase) {
                throw new Error('No active parser selected');
            }

            if (!files || files.length === 0) {
                throw new Error('No files provided');
            }

            this.showLoading('Processing files...');

            const results = {
                totalFiles: files.length,
                successfulImports: 0,
                failedImports: 0,
                importDetails: []
            };

            for (const file of Array.from(files)) {
                try {
                    const data = await this.parseFile(file);
                    
                    if (data && data.length > 0) {
                        const importStats = activeDatabase.addRecords(data, file.name);
                        
                        results.importDetails.push({
                            fileName: file.name,
                            status: 'success',
                            ...importStats
                        });
                        
                        results.successfulImports++;
                    } else {
                        results.importDetails.push({
                            fileName: file.name,
                            status: 'warning',
                            message: 'No data found in file'
                        });
                    }
                } catch (error) {
                    results.importDetails.push({
                        fileName: file.name,
                        status: 'error',
                        message: error.message
                    });
                    
                    results.failedImports++;
                }
            }

            this.hideLoading();
            
            // Show results notification
            if (results.successfulImports > 0) {
                this.showNotification(
                    `Successfully imported ${results.successfulImports} file(s)`, 
                    'success'
                );
            }
            
            if (results.failedImports > 0) {
                this.showNotification(
                    `Failed to import ${results.failedImports} file(s)`, 
                    'warning'
                );
            }

            this.emitDataChange('data_imported', results);
            return results;
            
        }, 'importing files');
    }

    /**
     * Parse a single file
     * @param {File} file - File to parse
     * @returns {Promise<Array>} Parsed data
     */
    async parseFile(file) {
        const extension = file.name.toLowerCase().split('.').pop();
        
        switch (extension) {
            case 'json':
                return await this.parseJSONFile(file);
            case 'xlsx':
            case 'xls':
                return await this.parseExcelFile(file);
            default:
                throw new Error(`Unsupported file format: ${extension}`);
        }
    }

    /**
     * Parse JSON file
     * @param {File} file - JSON file
     * @returns {Promise<Array>} Parsed data
     */
    async parseJSONFile(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            
            reader.onload = (e) => {
                try {
                    const text = e.target.result;
                    let data = JSON.parse(text);
                    
                    // Handle different JSON structures
                    if (!Array.isArray(data)) {
                        if (typeof data === 'object' && data !== null) {
                            // Check for common array properties
                            const arrayProps = ['data', 'items', 'records', 'results'];
                            for (const prop of arrayProps) {
                                if (Array.isArray(data[prop])) {
                                    data = data[prop];
                                    break;
                                }
                            }
                            
                            // If still not an array, wrap the object
                            if (!Array.isArray(data)) {
                                data = [data];
                            }
                        } else {
                            data = [];
                        }
                    }
                    
                    // Add checked field to all records
                    data = data.map(record => ({
                        ...record,
                        checked: record.checked || false
                    }));
                    
                    resolve(data);
                } catch (error) {
                    reject(new Error(`Invalid JSON format: ${error.message}`));
                }
            };
            
            reader.onerror = () => reject(new Error('Failed to read file'));
            reader.readAsText(file, 'utf-8');
        });
    }

    /**
     * Parse Excel file
     * @param {File} file - Excel file
     * @returns {Promise<Array>} Parsed data
     */
    async parseExcelFile(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            
            reader.onload = async (e) => {
                try {
                    // Import XLSX library dynamically
                    if (typeof XLSX === 'undefined') {
                        throw new Error('XLSX library not loaded');
                    }
                    
                    const data = new Uint8Array(e.target.result);
                    const workbook = XLSX.read(data, { type: 'array' });
                    
                    // Get first worksheet
                    const firstSheetName = workbook.SheetNames[0];
                    const worksheet = workbook.Sheets[firstSheetName];
                    
                    // Convert to JSON
                    const jsonData = XLSX.utils.sheet_to_json(worksheet, {
                        defval: null,
                        blankrows: false
                    });
                    
                    // Add checked field to all records
                    const dataWithCheckboxes = jsonData.map(record => ({
                        ...record,
                        checked: record.checked || false
                    }));
                    
                    resolve(dataWithCheckboxes);
                } catch (error) {
                    reject(new Error(`Failed to parse Excel file: ${error.message}`));
                }
            };
            
            reader.onerror = () => reject(new Error('Failed to read file'));
            reader.readAsArrayBuffer(file);
        });
    }

    /**
     * Get all data from active parser
     * @returns {Array} All records
     */
    getAllData() {
        try {
            const activeDatabase = this.parserManager.getActiveDatabase();
            if (!activeDatabase) {
                return [];
            }
            
            return activeDatabase.getAllRecords();
        } catch (error) {
            this.handleError(error, 'getting all data');
            return [];
        }
    }

    /**
     * Get filtered data
     * @param {Object} query - Query parameters
     * @returns {Array} Filtered records
     */
    getFilteredData(query = {}) {
        try {
            const activeDatabase = this.parserManager.getActiveDatabase();
            if (!activeDatabase) {
                return [];
            }
            
            return activeDatabase.getRecords(query);
        } catch (error) {
            this.handleError(error, 'getting filtered data');
            return [];
        }
    }

    /**
     * Update record checkbox status
     * @param {string} recordId - Record ID
     * @param {boolean} checked - Checked status
     * @returns {Promise<boolean>} Success status
     */
    async updateRecordCheckbox(recordId, checked) {
        return await this.safeExecute(async () => {
            const activeDatabase = this.parserManager.getActiveDatabase();
            if (!activeDatabase) {
                throw new Error('No active parser selected');
            }
            
            const success = activeDatabase.updateRecord(recordId, { checked });
            
            if (success) {
                this.emitDataChange('record_updated', { recordId, checked });
            }
            
            return success;
        }, 'updating record checkbox');
    }

    /**
     * Toggle record checkbox status
     * @param {string} recordId - Record ID
     * @returns {Promise<boolean>} Success status
     */
    async toggleRecordCheckbox(recordId) {
        return await this.safeExecute(async () => {
            const activeDatabase = this.parserManager.getActiveDatabase();
            if (!activeDatabase) {
                throw new Error('No active parser selected');
            }
            
            const success = activeDatabase.toggleChecked(recordId);
            
            if (success) {
                this.emitDataChange('record_toggled', { recordId });
            }
            
            return success;
        }, 'toggling record checkbox');
    }

    /**
     * Bulk update checkbox status for multiple records
     * @param {Array} recordIds - Array of record IDs
     * @param {boolean} checked - Checked status
     * @returns {Promise<number>} Number of updated records
     */
    async bulkUpdateCheckboxes(recordIds, checked) {
        return await this.safeExecute(async () => {
            const activeDatabase = this.parserManager.getActiveDatabase();
            if (!activeDatabase) {
                throw new Error('No active parser selected');
            }
            
            this.showLoading(`Updating ${recordIds.length} records...`);
            
            const updatedCount = activeDatabase.setChecked(recordIds, checked);
            
            this.hideLoading();
            
            if (updatedCount > 0) {
                this.showNotification(
                    `Updated ${updatedCount} record(s) successfully`, 
                    'success'
                );
                this.emitDataChange('bulk_checkbox_update', { recordIds, checked, updatedCount });
            }
            
            return updatedCount;
        }, 'bulk updating checkboxes');
    }

    /**
     * Get checked records
     * @returns {Array} Checked records
     */
    getCheckedRecords() {
        try {
            const activeDatabase = this.parserManager.getActiveDatabase();
            if (!activeDatabase) {
                return [];
            }
            
            return activeDatabase.getCheckedRecords();
        } catch (error) {
            this.handleError(error, 'getting checked records');
            return [];
        }
    }

    /**
     * Export data with checkbox states
     * @param {string} format - Export format (json, csv, excel)
     * @param {boolean} checkedOnly - Export only checked records
     * @returns {Promise<string|Blob>} Exported data
     */
    async exportData(format = 'json', checkedOnly = false) {
        return await this.safeExecute(async () => {
            const activeDatabase = this.parserManager.getActiveDatabase();
            if (!activeDatabase) {
                throw new Error('No active parser selected');
            }
            
            this.showLoading('Exporting data...');
            
            let data;
            if (checkedOnly) {
                data = activeDatabase.getCheckedRecords();
            } else {
                data = activeDatabase.getAllRecords();
            }
            
            let exportData;
            const activeParser = this.parserManager.getActiveParser();
            
            switch (format.toLowerCase()) {
                case 'json':
                    exportData = JSON.stringify(data, null, 2);
                    break;
                    
                case 'csv':
                    exportData = this.convertToCSV(data);
                    break;
                    
                case 'excel':
                    exportData = await this.convertToExcel(data, activeParser.displayName);
                    break;
                    
                default:
                    throw new Error(`Unsupported export format: ${format}`);
            }
            
            this.hideLoading();
            this.showNotification('Data exported successfully', 'success');
            
            return exportData;
        }, 'exporting data');
    }

    /**
     * Convert data to CSV format
     * @param {Array} data - Data to convert
     * @returns {string} CSV string
     */
    convertToCSV(data) {
        if (data.length === 0) return '';
        
        const headers = Object.keys(data[0]).filter(key => !key.startsWith('_'));
        const csv = [
            headers.join(','),
            ...data.map(row => 
                headers.map(header => {
                    const value = row[header];
                    if (value === null || value === undefined) return '';
                    return typeof value === 'string' ? `"${value.replace(/"/g, '""')}"` : value;
                }).join(',')
            )
        ].join('\n');
        
        return csv;
    }

    /**
     * Convert data to Excel format
     * @param {Array} data - Data to convert
     * @param {string} sheetName - Sheet name
     * @returns {Promise<Blob>} Excel blob
     */
    async convertToExcel(data, sheetName = 'Data') {
        if (typeof XLSX === 'undefined') {
            throw new Error('XLSX library not loaded');
        }
        
        const worksheet = XLSX.utils.json_to_sheet(data);
        const workbook = XLSX.utils.book_new();
        
        XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
        
        const excelBuffer = XLSX.write(workbook, { 
            bookType: 'xlsx', 
            type: 'array' 
        });
        
        return new Blob([excelBuffer], {
            type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
        });
    }

    /**
     * Delete selected records
     * @param {Array} recordIds - Record IDs to delete
     * @returns {Promise<number>} Number of deleted records
     */
    async deleteRecords(recordIds) {
        return await this.safeExecute(async () => {
            const activeDatabase = this.parserManager.getActiveDatabase();
            if (!activeDatabase) {
                throw new Error('No active parser selected');
            }
            
            const confirmed = await this.confirmDeletion(recordIds.length);
            if (!confirmed) {
                return 0;
            }
            
            this.showLoading(`Deleting ${recordIds.length} record(s)...`);
            
            let deletedCount = 0;
            for (const recordId of recordIds) {
                if (activeDatabase.deleteRecord(recordId)) {
                    deletedCount++;
                }
            }
            
            this.hideLoading();
            
            if (deletedCount > 0) {
                this.showNotification(
                    `Deleted ${deletedCount} record(s) successfully`, 
                    'success'
                );
                this.emitDataChange('records_deleted', { recordIds, deletedCount });
            }
            
            return deletedCount;
        }, 'deleting records');
    }

    /**
     * Confirm record deletion
     * @param {number} count - Number of records to delete
     * @returns {Promise<boolean>} User confirmation
     */
    async confirmDeletion(count) {
        return new Promise((resolve) => {
            const event = new CustomEvent('confirmDialog', {
                detail: {
                    title: 'Delete Records',
                    message: `Are you sure you want to delete ${count} record(s)? This action cannot be undone.`,
                    confirmText: 'Delete',
                    cancelText: 'Cancel',
                    type: 'danger',
                    callback: resolve
                }
            });
            document.dispatchEvent(event);
        });
    }
}

export default DataController;

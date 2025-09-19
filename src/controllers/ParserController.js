import BaseController from './BaseController.js';

/**
 * Parser Controller
 * Manages parser creation, selection, and operations
 */
class ParserController extends BaseController {
    constructor(parserManager) {
        super();
        this.parserManager = parserManager;
    }

    async initialize() {
        await super.initialize();
        
        if (!this.parserManager.initialized) {
            await this.parserManager.initialize();
        }
        
        console.log('ParserController initialized');
    }

    /**
     * Get all parsers
     * @returns {Array} List of parsers
     */
    getAllParsers() {
        try {
            return this.parserManager.getAllParsers();
        } catch (error) {
            this.handleError(error, 'getting all parsers');
            return [];
        }
    }

    /**
     * Create a new parser
     * @param {string} name - Parser name
     * @param {string} description - Parser description
     * @param {boolean} setAsActive - Set as active parser
     * @returns {Promise<string|null>} Parser ID or null on error
     */
    async createParser(name, description = '', setAsActive = false) {
        return await this.safeExecute(async () => {
            this.validateParams({ name }, ['name']);
            
            this.showLoading('Creating parser...');
            
            const parserId = await this.parserManager.createParser(name, description, setAsActive);
            
            this.hideLoading();
            this.showNotification(`Parser '${name}' created successfully`, 'success');
            this.emitDataChange('parser_created', { name, id: parserId });
            
            return parserId;
        }, 'creating parser');
    }

    /**
     * Set active parser
     * @param {string} name - Parser name
     * @returns {boolean} Success status
     */
    setActiveParser(name) {
        return this.safeExecute(async () => {
            this.validateParams({ name }, ['name']);
            
            const success = this.parserManager.setActiveParser(name);
            
            if (success) {
                const parser = this.parserManager.getParser(name);
                this.showNotification(`Switched to parser '${parser.displayName}'`, 'success');
                this.emitDataChange('active_parser_changed', { name, parser });
            }
            
            return success;
        }, 'setting active parser');
    }

    /**
     * Get active parser
     * @returns {Object|null} Active parser or null
     */
    getActiveParser() {
        try {
            return this.parserManager.getActiveParser();
        } catch (error) {
            this.handleError(error, 'getting active parser');
            return null;
        }
    }

    /**
     * Delete a parser
     * @param {string} name - Parser name
     * @returns {Promise<boolean>} Success status
     */
    async deleteParser(name) {
        return await this.safeExecute(async () => {
            this.validateParams({ name }, ['name']);
            
            const parser = this.parserManager.getParser(name);
            if (!parser) {
                throw new Error(`Parser '${name}' not found`);
            }

            // Confirm deletion
            const confirmed = await this.confirmDeletion(parser.displayName);
            if (!confirmed) {
                return false;
            }

            this.showLoading('Deleting parser...');
            
            const success = this.parserManager.deleteParser(name);
            
            this.hideLoading();
            
            if (success) {
                this.showNotification(`Parser '${parser.displayName}' deleted successfully`, 'success');
                this.emitDataChange('parser_deleted', { name });
            }
            
            return success;
        }, 'deleting parser');
    }

    /**
     * Duplicate a parser
     * @param {string} sourceName - Source parser name
     * @param {string} newName - New parser name
     * @param {string} newDescription - New parser description
     * @returns {Promise<string|null>} New parser ID or null on error
     */
    async duplicateParser(sourceName, newName, newDescription = '') {
        return await this.safeExecute(async () => {
            this.validateParams({ sourceName, newName }, ['sourceName', 'newName']);
            
            this.showLoading('Duplicating parser...');
            
            const newParserId = this.parserManager.duplicateParser(sourceName, newName, newDescription);
            
            this.hideLoading();
            this.showNotification(`Parser duplicated as '${newName}'`, 'success');
            this.emitDataChange('parser_duplicated', { sourceName, newName, newId: newParserId });
            
            return newParserId;
        }, 'duplicating parser');
    }

    /**
     * Rename a parser
     * @param {string} oldName - Current parser name
     * @param {string} newName - New parser name
     * @returns {Promise<string|null>} New parser ID or null on error
     */
    async renameParser(oldName, newName) {
        return await this.safeExecute(async () => {
            this.validateParams({ oldName, newName }, ['oldName', 'newName']);
            
            this.showLoading('Renaming parser...');
            
            const newParserId = this.parserManager.renameParser(oldName, newName);
            
            this.hideLoading();
            this.showNotification(`Parser renamed to '${newName}'`, 'success');
            this.emitDataChange('parser_renamed', { oldName, newName, newId: newParserId });
            
            return newParserId;
        }, 'renaming parser');
    }

    /**
     * Get parser statistics
     * @returns {Object} Statistics object
     */
    getStatistics() {
        try {
            return this.parserManager.getParserStatistics();
        } catch (error) {
            this.handleError(error, 'getting parser statistics');
            return { totalParsers: 0, totalRecords: 0, parsers: [] };
        }
    }

    /**
     * Export parser data
     * @param {string} name - Parser name
     * @param {string} format - Export format
     * @returns {Promise<Object|null>} Export data or null on error
     */
    async exportParser(name, format = 'json') {
        return await this.safeExecute(async () => {
            this.validateParams({ name }, ['name']);
            
            this.showLoading('Exporting parser data...');
            
            const exportData = this.parserManager.exportParser(name, format);
            
            this.hideLoading();
            this.showNotification('Parser data exported successfully', 'success');
            
            return exportData;
        }, 'exporting parser');
    }

    /**
     * Get active database
     * @returns {Object|null} Active database or null
     */
    getActiveDatabase() {
        try {
            return this.parserManager.getActiveDatabase();
        } catch (error) {
            this.handleError(error, 'getting active database');
            return null;
        }
    }

    /**
     * Confirm parser deletion with user
     * @param {string} parserName - Parser display name
     * @returns {Promise<boolean>} User confirmation
     */
    async confirmDeletion(parserName) {
        return new Promise((resolve) => {
            const event = new CustomEvent('confirmDialog', {
                detail: {
                    title: 'Delete Parser',
                    message: `Are you sure you want to delete the parser '${parserName}'? This action cannot be undone and will delete all associated data.`,
                    confirmText: 'Delete',
                    cancelText: 'Cancel',
                    type: 'danger',
                    callback: resolve
                }
            });
            document.dispatchEvent(event);
        });
    }

    /**
     * Handle parser selection from UI
     * @param {Event} event - Selection event
     */
    handleParserSelection(event) {
        const parserName = event.target.value || event.detail?.name;
        if (parserName) {
            this.setActiveParser(parserName);
        }
    }

    /**
     * Handle new parser creation from UI
     * @param {Event} event - Creation event
     */
    handleParserCreation(event) {
        const { name, description, setAsActive } = event.detail || {};
        if (name) {
            this.createParser(name, description, setAsActive);
        }
    }
}

export default ParserController;

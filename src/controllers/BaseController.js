/**
 * Base Controller Class
 * Provides common functionality for all controllers
 */
class BaseController {
    constructor() {
        if (this.constructor === BaseController) {
            throw new Error('Cannot instantiate abstract BaseController class');
        }
        this.initialized = false;
    }

    /**
     * Initialize the controller
     * @returns {Promise<void>}
     */
    async initialize() {
        this.initialized = true;
    }

    /**
     * Show notification to user
     * @param {string} message - Notification message
     * @param {string} type - Notification type (success, error, warning, info)
     */
    showNotification(message, type = 'info') {
        // Dispatch custom event for the view to handle
        const event = new CustomEvent('notification', {
            detail: { message, type, timestamp: Date.now() }
        });
        document.dispatchEvent(event);
    }

    /**
     * Show loading state
     * @param {string} message - Loading message
     */
    showLoading(message = 'Processing...') {
        const event = new CustomEvent('loading', {
            detail: { show: true, message }
        });
        document.dispatchEvent(event);
    }

    /**
     * Hide loading state
     */
    hideLoading() {
        const event = new CustomEvent('loading', {
            detail: { show: false }
        });
        document.dispatchEvent(event);
    }

    /**
     * Emit data change event
     * @param {string} type - Change type
     * @param {Object} data - Changed data
     */
    emitDataChange(type, data) {
        const event = new CustomEvent('dataChange', {
            detail: { type, data, timestamp: Date.now() }
        });
        document.dispatchEvent(event);
    }

    /**
     * Handle errors consistently
     * @param {Error} error - Error object
     * @param {string} context - Error context
     */
    handleError(error, context = '') {
        console.error(`Error in ${this.constructor.name}${context ? ` (${context})` : ''}:`, error);
        this.showNotification(error.message || 'An unexpected error occurred', 'error');
        this.hideLoading();
    }

    /**
     * Validate required parameters
     * @param {Object} params - Parameters to validate
     * @param {Array} required - Required parameter names
     * @throws {Error} If validation fails
     */
    validateParams(params, required) {
        for (const param of required) {
            if (params[param] === undefined || params[param] === null) {
                throw new Error(`Required parameter '${param}' is missing`);
            }
        }
    }

    /**
     * Safe async execution with error handling
     * @param {Function} asyncFn - Async function to execute
     * @param {string} context - Error context
     * @returns {Promise<any>} Result or null on error
     */
    async safeExecute(asyncFn, context = '') {
        try {
            return await asyncFn();
        } catch (error) {
            this.handleError(error, context);
            return null;
        }
    }
}

export default BaseController;

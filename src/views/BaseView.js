/**
 * Base View Class
 * Provides common functionality for all views
 */
class BaseView {
    constructor(container) {
        if (this.constructor === BaseView) {
            throw new Error('Cannot instantiate abstract BaseView class');
        }
        
        this.container = container;
        this.template = '';
        this.data = {};
        this.eventListeners = new Map();
        this.initialized = false;
    }

    /**
     * Initialize the view
     * @returns {Promise<void>}
     */
    async initialize() {
        this.setupEventListeners();
        this.initialized = true;
    }

    /**
     * Render the view with data
     * @param {Object} data - Data to render
     */
    render(data = {}) {
        this.data = { ...this.data, ...data };
        
        if (this.container) {
            this.container.innerHTML = this.template;
            this.afterRender();
        }
    }

    /**
     * Called after rendering to setup DOM interactions
     */
    afterRender() {
        // Override in subclasses
    }

    /**
     * Update view with new data
     * @param {Object} data - New data
     */
    update(data) {
        this.render(data);
    }

    /**
     * Show the view
     */
    show() {
        if (this.container) {
            this.container.style.display = 'block';
        }
    }

    /**
     * Hide the view
     */
    hide() {
        if (this.container) {
            this.container.style.display = 'none';
        }
    }

    /**
     * Toggle view visibility
     */
    toggle() {
        if (this.container) {
            const isVisible = this.container.style.display !== 'none';
            this.container.style.display = isVisible ? 'none' : 'block';
        }
    }

    /**
     * Add event listener with automatic cleanup
     * @param {string} element - Element selector
     * @param {string} event - Event type
     * @param {Function} handler - Event handler
     */
    addEventListener(element, event, handler) {
        const key = `${element}_${event}`;
        
        // Remove existing listener if any
        if (this.eventListeners.has(key)) {
            const { el, evt, hdlr } = this.eventListeners.get(key);
            el.removeEventListener(evt, hdlr);
        }
        
        const el = typeof element === 'string' 
            ? this.container.querySelector(element) 
            : element;
            
        if (el) {
            el.addEventListener(event, handler);
            this.eventListeners.set(key, { el, evt: event, hdlr: handler });
        }
    }

    /**
     * Setup event listeners for the view
     * Override in subclasses
     */
    setupEventListeners() {
        // Override in subclasses
    }

    /**
     * Create element from HTML string
     * @param {string} html - HTML string
     * @returns {Element} Created element
     */
    createElement(html) {
        const template = document.createElement('template');
        template.innerHTML = html.trim();
        return template.content.firstChild;
    }

    /**
     * Format data for display
     * @param {any} value - Value to format
     * @returns {string} Formatted value
     */
    formatValue(value) {
        if (value === null || value === undefined) {
            return '';
        }
        
        if (typeof value === 'boolean') {
            return value ? 'Yes' : 'No';
        }
        
        if (typeof value === 'number') {
            return value.toLocaleString();
        }
        
        if (typeof value === 'object') {
            return JSON.stringify(value, null, 2);
        }
        
        return String(value);
    }

    /**
     * Escape HTML entities
     * @param {string} text - Text to escape
     * @returns {string} Escaped text
     */
    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }

    /**
     * Show loading state in container
     * @param {string} message - Loading message
     */
    showLoading(message = 'Loading...') {
        if (this.container) {
            this.container.innerHTML = `
                <div class="loading-container">
                    <div class="loading-spinner"></div>
                    <div class="loading-message">${message}</div>
                </div>
            `;
        }
    }

    /**
     * Show error state in container
     * @param {string} message - Error message
     */
    showError(message) {
        if (this.container) {
            this.container.innerHTML = `
                <div class="error-container">
                    <div class="error-icon">⚠️</div>
                    <div class="error-message">${this.escapeHtml(message)}</div>
                </div>
            `;
        }
    }

    /**
     * Show empty state in container
     * @param {string} message - Empty message
     */
    showEmpty(message = 'No data available') {
        if (this.container) {
            this.container.innerHTML = `
                <div class="empty-container">
                    <div class="empty-icon">📄</div>
                    <div class="empty-message">${message}</div>
                </div>
            `;
        }
    }

    /**
     * Cleanup view and remove event listeners
     */
    destroy() {
        // Remove all event listeners
        for (const [key, { el, evt, hdlr }] of this.eventListeners) {
            el.removeEventListener(evt, hdlr);
        }
        this.eventListeners.clear();
        
        // Clear container
        if (this.container) {
            this.container.innerHTML = '';
        }
        
        this.initialized = false;
    }

    /**
     * Emit custom event
     * @param {string} eventName - Event name
     * @param {any} detail - Event detail
     */
    emit(eventName, detail) {
        const event = new CustomEvent(eventName, {
            detail,
            bubbles: true
        });
        
        if (this.container) {
            this.container.dispatchEvent(event);
        } else {
            document.dispatchEvent(event);
        }
    }

    /**
     * Generate unique ID for elements
     * @returns {string} Unique ID
     */
    generateId() {
        return 'view_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }
}

export default BaseView;

import ParserManager from './models/ParserManager.js';
import ParserController from './controllers/ParserController.js';
import DataController from './controllers/DataController.js';
import ParserSelectionView from './views/ParserSelectionView.js';
import DataGridView from './views/DataGridView.js';

/**
 * Main Application Class
 * Orchestrates the MVC architecture and manages application state
 */
class ParseFlowApp {
    constructor() {
        this.initialized = false;
        this.currentView = 'upload';
        
        // Core MVC components
        this.models = {};
        this.controllers = {};
        this.views = {};
        
        // State management
        this.state = {
            activeParser: null,
            currentData: [],
            loading: false,
            error: null
        };
    }

    /**
     * Initialize the application
     */
    async initialize() {
        try {
            console.log('🚀 Initializing ParseFlow MVC Application...');
            
            // Initialize models
            await this.initializeModels();
            
            // Initialize controllers
            await this.initializeControllers();
            
            // Initialize views
            await this.initializeViews();
            
            // Setup global event listeners
            this.setupGlobalEventListeners();
            
            // Setup navigation
            this.setupNavigation();
            
            // Load initial data
            await this.loadInitialData();
            
            this.initialized = true;
            console.log('✅ ParseFlow MVC Application initialized successfully');
            
        } catch (error) {
            console.error('❌ Failed to initialize ParseFlow:', error);
            this.handleError(error);
        }
    }

    /**
     * Initialize model layer
     */
    async initializeModels() {
        console.log('📊 Initializing Models...');
        
        // Initialize Parser Manager
        this.models.parserManager = new ParserManager();
        await this.models.parserManager.initialize();
        
        console.log('✅ Models initialized');
    }

    /**
     * Initialize controller layer
     */
    async initializeControllers() {
        console.log('🎮 Initializing Controllers...');
        
        // Initialize Parser Controller
        this.controllers.parser = new ParserController(this.models.parserManager);
        await this.controllers.parser.initialize();
        
        // Initialize Data Controller
        this.controllers.data = new DataController(this.models.parserManager);
        await this.controllers.data.initialize();
        
        console.log('✅ Controllers initialized');
    }

    /**
     * Initialize view layer
     */
    async initializeViews() {
        console.log('🎨 Initializing Views...');
        
        // Initialize Parser Selection View
        const parserContainer = document.getElementById('parser-section');
        if (parserContainer) {
            this.views.parserSelection = new ParserSelectionView(parserContainer);
            await this.views.parserSelection.initialize();
        }
        
        // Initialize Data Grid View
        const dataContainer = document.getElementById('data-section');
        if (dataContainer) {
            this.views.dataGrid = new DataGridView(dataContainer);
            await this.views.dataGrid.initialize();
        }
        
        // Setup view event handlers
        this.setupViewEventHandlers();
        
        console.log('✅ Views initialized');
    }

    /**
     * Setup view event handlers
     */
    setupViewEventHandlers() {
        // Parser Selection View Events
        if (this.views.parserSelection) {
            this.views.parserSelection.container.addEventListener('parserCreate', (e) => {
                this.controllers.parser.createParser(
                    e.detail.name, 
                    e.detail.description, 
                    e.detail.setAsActive
                );
            });

            this.views.parserSelection.container.addEventListener('parserSelect', (e) => {
                this.controllers.parser.setActiveParser(e.detail.name);
            });

            this.views.parserSelection.container.addEventListener('parserDelete', (e) => {
                this.controllers.parser.deleteParser(e.detail.name);
            });

            this.views.parserSelection.container.addEventListener('parserDuplicate', (e) => {
                this.controllers.parser.duplicateParser(
                    e.detail.sourceName, 
                    e.detail.newName
                );
            });

            this.views.parserSelection.container.addEventListener('parserExport', (e) => {
                this.exportParser(e.detail.name);
            });
        }

        // Data Grid View Events
        if (this.views.dataGrid) {
            this.views.dataGrid.container.addEventListener('recordCheckbox', (e) => {
                this.controllers.data.updateRecordCheckbox(
                    e.detail.recordId, 
                    e.detail.checked
                );
            });

            this.views.dataGrid.container.addEventListener('bulkCheckbox', (e) => {
                this.controllers.data.bulkUpdateCheckboxes(
                    e.detail.recordIds, 
                    e.detail.checked
                );
            });

            this.views.dataGrid.container.addEventListener('bulkDelete', (e) => {
                this.controllers.data.deleteRecords(e.detail.recordIds);
            });

            this.views.dataGrid.container.addEventListener('bulkExport', (e) => {
                this.exportSelectedRecords(e.detail.recordIds);
            });

            this.views.dataGrid.container.addEventListener('recordEdit', (e) => {
                this.editRecord(e.detail.recordId);
            });

            this.views.dataGrid.container.addEventListener('recordDelete', (e) => {
                this.controllers.data.deleteRecords([e.detail.recordId]);
            });
        }
    }

    /**
     * Setup global event listeners
     */
    setupGlobalEventListeners() {
        // Data change events
        document.addEventListener('dataChange', (e) => {
            this.handleDataChange(e.detail);
        });

        // Notification events
        document.addEventListener('notification', (e) => {
            this.showNotification(e.detail.message, e.detail.type);
        });

        // Loading events
        document.addEventListener('loading', (e) => {
            if (e.detail.show) {
                this.showLoading(e.detail.message);
            } else {
                this.hideLoading();
            }
        });

        // Confirm dialog events
        document.addEventListener('confirmDialog', (e) => {
            this.showConfirmDialog(e.detail);
        });

        // File import events
        const fileInput = document.getElementById('fileInput');
        if (fileInput) {
            fileInput.addEventListener('change', (e) => {
                this.handleFileImport(e.target.files);
            });
        }

        // Drag and drop for file import
        const uploadArea = document.getElementById('upload-area');
        if (uploadArea) {
            uploadArea.addEventListener('dragover', (e) => {
                e.preventDefault();
                uploadArea.classList.add('drag-over');
            });

            uploadArea.addEventListener('dragleave', () => {
                uploadArea.classList.remove('drag-over');
            });

            uploadArea.addEventListener('drop', (e) => {
                e.preventDefault();
                uploadArea.classList.remove('drag-over');
                this.handleFileImport(e.dataTransfer.files);
            });
        }
    }

    /**
     * Setup navigation between views
     */
    setupNavigation() {
        const navButtons = document.querySelectorAll('[data-view]');
        navButtons.forEach(button => {
            button.addEventListener('click', (e) => {
                const view = e.target.dataset.view;
                this.switchView(view);
            });
        });

        // Set initial view
        this.switchView('dashboard');
    }

    /**
     * Switch between different views
     */
    switchView(viewName) {
        // Update navigation state
        document.querySelectorAll('[data-view]').forEach(btn => {
            btn.classList.remove('active');
        });
        
        const activeBtn = document.querySelector(`[data-view="${viewName}"]`);
        if (activeBtn) {
            activeBtn.classList.add('active');
        }

        // Show/hide view sections
        document.querySelectorAll('.view-section').forEach(section => {
            section.style.display = 'none';
        });

        const targetSection = document.getElementById(`${viewName}-view`);
        if (targetSection) {
            targetSection.style.display = 'block';
        }

        this.currentView = viewName;

        // Load view-specific data
        if (viewName === 'dashboard') {
            this.loadDashboardData();
        }
    }

    /**
     * Load initial application data
     */
    async loadInitialData() {
        console.log('📡 Loading initial data...');
        
        // Load parser data
        await this.loadParserData();
        
        // Load dashboard data if we have an active parser
        if (this.state.activeParser) {
            await this.loadDashboardData();
        }
        
        console.log('✅ Initial data loaded');
    }

    /**
     * Load parser-related data
     */
    async loadParserData() {
        const parsers = this.controllers.parser.getAllParsers();
        const statistics = this.controllers.parser.getStatistics();
        const activeParser = this.controllers.parser.getActiveParser();

        this.state.activeParser = activeParser;

        // Update parser selection view
        if (this.views.parserSelection) {
            this.views.parserSelection.update({ parsers, statistics });
        }

        // Update active parser display
        this.updateActiveParserDisplay(activeParser);
    }

    /**
     * Load dashboard data
     */
    async loadDashboardData() {
        if (!this.state.activeParser) {
            return;
        }

        const data = this.controllers.data.getAllData();
        this.state.currentData = data;

        // Update data grid view
        if (this.views.dataGrid) {
            this.views.dataGrid.renderData(data);
        }

        // Update statistics
        this.updateDataStatistics(data);
    }

    /**
     * Handle file import
     */
    async handleFileImport(files) {
        if (!files || files.length === 0) {
            return;
        }

        if (!this.state.activeParser) {
            this.showNotification('Please select a parser first', 'warning');
            return;
        }

        const result = await this.controllers.data.importFiles(files);
        
        if (result) {
            // Reload dashboard data
            await this.loadDashboardData();
            
            // Show import results
            this.showImportResults(result);
        }
    }

    /**
     * Handle data change events
     */
    handleDataChange(changeDetail) {
        console.log('📊 Data changed:', changeDetail.type);

        switch (changeDetail.type) {
            case 'parser_created':
            case 'parser_deleted':
            case 'active_parser_changed':
                this.loadParserData();
                if (changeDetail.type === 'active_parser_changed') {
                    this.loadDashboardData();
                }
                break;

            case 'data_imported':
            case 'record_updated':
            case 'records_deleted':
            case 'bulk_checkbox_update':
                this.loadDashboardData();
                break;
        }
    }

    /**
     * Update active parser display
     */
    updateActiveParserDisplay(parser) {
        const display = document.getElementById('active-parser-name');
        if (display) {
            display.textContent = parser ? parser.displayName : 'No parser selected';
        }
    }

    /**
     * Update data statistics display
     */
    updateDataStatistics(data) {
        const totalRecords = data.length;
        const checkedRecords = data.filter(record => record.checked).length;
        
        // Update statistics cards
        const totalElement = document.getElementById('total-records');
        const checkedElement = document.getElementById('checked-records');
        
        if (totalElement) totalElement.textContent = totalRecords;
        if (checkedElement) checkedElement.textContent = checkedRecords;
    }

    /**
     * Export parser data
     */
    async exportParser(parserName) {
        const result = await this.controllers.parser.exportParser(parserName, 'json');
        if (result) {
            this.downloadFile(
                JSON.stringify(result.data, null, 2),
                `${parserName}_export.json`,
                'application/json'
            );
        }
    }

    /**
     * Export selected records
     */
    async exportSelectedRecords(recordIds) {
        const allData = this.controllers.data.getAllData();
        const selectedData = allData.filter(record => recordIds.includes(record.id));
        
        if (selectedData.length > 0) {
            this.downloadFile(
                JSON.stringify(selectedData, null, 2),
                'selected_records.json',
                'application/json'
            );
        }
    }

    /**
     * Edit record (placeholder for future implementation)
     */
    editRecord(recordId) {
        // TODO: Implement record editing modal
        console.log('Edit record:', recordId);
        this.showNotification('Record editing coming soon!', 'info');
    }

    /**
     * Show import results modal
     */
    showImportResults(results) {
        // TODO: Create a dedicated import results view
        const message = `Import completed: ${results.successfulImports} successful, ${results.failedImports} failed`;
        this.showNotification(message, results.failedImports === 0 ? 'success' : 'warning');
    }

    /**
     * Show notification to user
     */
    showNotification(message, type = 'info') {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.innerHTML = `
            <div class="notification-content">
                <i class="fas fa-${this.getNotificationIcon(type)}"></i>
                <span>${message}</span>
            </div>
            <button class="notification-close">
                <i class="fas fa-times"></i>
            </button>
        `;

        // Add to notification container
        let container = document.getElementById('notification-container');
        if (!container) {
            container = document.createElement('div');
            container.id = 'notification-container';
            document.body.appendChild(container);
        }

        container.appendChild(notification);

        // Auto-remove after 5 seconds
        setTimeout(() => {
            if (notification.parentElement) {
                notification.remove();
            }
        }, 5000);

        // Add close button handler
        notification.querySelector('.notification-close').addEventListener('click', () => {
            notification.remove();
        });
    }

    /**
     * Get notification icon based on type
     */
    getNotificationIcon(type) {
        const icons = {
            success: 'check-circle',
            error: 'exclamation-circle',
            warning: 'exclamation-triangle',
            info: 'info-circle'
        };
        return icons[type] || 'info-circle';
    }

    /**
     * Show loading state
     */
    showLoading(message = 'Loading...') {
        this.state.loading = true;
        
        let loader = document.getElementById('global-loader');
        if (!loader) {
            loader = document.createElement('div');
            loader.id = 'global-loader';
            loader.className = 'global-loader';
            document.body.appendChild(loader);
        }

        loader.innerHTML = `
            <div class="loader-content">
                <div class="loader-spinner"></div>
                <div class="loader-message">${message}</div>
            </div>
        `;
        loader.style.display = 'flex';
    }

    /**
     * Hide loading state
     */
    hideLoading() {
        this.state.loading = false;
        
        const loader = document.getElementById('global-loader');
        if (loader) {
            loader.style.display = 'none';
        }
    }

    /**
     * Show confirmation dialog
     */
    showConfirmDialog(options) {
        const modal = document.createElement('div');
        modal.className = 'modal confirm-modal';
        modal.innerHTML = `
            <div class="modal-content">
                <div class="modal-header">
                    <h3>${options.title || 'Confirm Action'}</h3>
                </div>
                <div class="modal-body">
                    <p>${options.message}</p>
                </div>
                <div class="modal-footer">
                    <button class="btn btn-secondary cancel-btn">${options.cancelText || 'Cancel'}</button>
                    <button class="btn ${options.type === 'danger' ? 'btn-danger' : 'btn-primary'} confirm-btn">
                        ${options.confirmText || 'Confirm'}
                    </button>
                </div>
            </div>
        `;

        document.body.appendChild(modal);
        modal.style.display = 'flex';

        // Handle buttons
        modal.querySelector('.cancel-btn').addEventListener('click', () => {
            options.callback(false);
            modal.remove();
        });

        modal.querySelector('.confirm-btn').addEventListener('click', () => {
            options.callback(true);
            modal.remove();
        });

        // Close on backdrop click
        modal.addEventListener('click', (e) => {
            if (e.target === modal) {
                options.callback(false);
                modal.remove();
            }
        });
    }

    /**
     * Download file
     */
    downloadFile(content, filename, mimeType) {
        const blob = new Blob([content], { type: mimeType });
        const url = URL.createObjectURL(blob);
        
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        a.style.display = 'none';
        
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        
        URL.revokeObjectURL(url);
    }

    /**
     * Handle application errors
     */
    handleError(error) {
        console.error('Application Error:', error);
        this.state.error = error;
        this.showNotification(error.message || 'An unexpected error occurred', 'error');
        this.hideLoading();
    }

    /**
     * Get application state
     */
    getState() {
        return { ...this.state };
    }

    /**
     * Cleanup application
     */
    destroy() {
        // Destroy views
        Object.values(this.views).forEach(view => {
            if (view.destroy) {
                view.destroy();
            }
        });

        // Clear state
        this.state = {};
        this.initialized = false;
        
        console.log('ParseFlow application destroyed');
    }
}

export default ParseFlowApp;

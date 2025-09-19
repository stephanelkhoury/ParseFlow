import BaseView from './BaseView.js';

/**
 * Parser Selection View
 * Manages the parser selection interface and creation
 */
class ParserSelectionView extends BaseView {
    constructor(container) {
        super(container);
        this.template = this.getTemplate();
    }

    getTemplate() {
        return `
            <div class="parser-selection-section">
                <div class="parser-header">
                    <h3><i class="fas fa-database"></i> Parser Management</h3>
                    <button class="btn btn-primary" id="createParserBtn">
                        <i class="fas fa-plus"></i> New Parser
                    </button>
                </div>
                
                <div class="parser-grid" id="parserGrid">
                    <!-- Parser cards will be rendered here -->
                </div>
                
                <div class="parser-stats" id="parserStats">
                    <!-- Statistics will be rendered here -->
                </div>
            </div>
            
            <!-- Create Parser Modal -->
            <div class="modal" id="createParserModal" style="display: none;">
                <div class="modal-content">
                    <div class="modal-header">
                        <h3><i class="fas fa-plus"></i> Create New Parser</h3>
                        <button class="modal-close" id="closeCreateModal">
                            <i class="fas fa-times"></i>
                        </button>
                    </div>
                    <div class="modal-body">
                        <form id="createParserForm">
                            <div class="form-group">
                                <label for="parserName">Parser Name</label>
                                <input type="text" id="parserName" name="name" required 
                                       placeholder="Enter parser name">
                            </div>
                            <div class="form-group">
                                <label for="parserDescription">Description</label>
                                <textarea id="parserDescription" name="description" 
                                         placeholder="Enter parser description (optional)"></textarea>
                            </div>
                            <div class="form-group">
                                <label class="checkbox-label">
                                    <input type="checkbox" id="setAsActive" name="setAsActive">
                                    Set as active parser
                                </label>
                            </div>
                        </form>
                    </div>
                    <div class="modal-footer">
                        <button type="button" class="btn btn-secondary" id="cancelCreate">Cancel</button>
                        <button type="submit" form="createParserForm" class="btn btn-primary">Create Parser</button>
                    </div>
                </div>
            </div>
        `;
    }

    setupEventListeners() {
        // Create parser button
        this.addEventListener('#createParserBtn', 'click', () => {
            this.showCreateModal();
        });

        // Close modal buttons
        this.addEventListener('#closeCreateModal', 'click', () => {
            this.hideCreateModal();
        });

        this.addEventListener('#cancelCreate', 'click', () => {
            this.hideCreateModal();
        });

        // Create parser form
        this.addEventListener('#createParserForm', 'submit', (e) => {
            e.preventDefault();
            this.handleCreateParser();
        });

        // Close modal on backdrop click
        this.addEventListener('#createParserModal', 'click', (e) => {
            if (e.target.id === 'createParserModal') {
                this.hideCreateModal();
            }
        });
    }

    renderParsers(parsers) {
        const grid = this.container.querySelector('#parserGrid');
        if (!grid) return;

        if (!parsers || parsers.length === 0) {
            grid.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-database"></i>
                    <p>No parsers available</p>
                    <button class="btn btn-primary" onclick="document.getElementById('createParserBtn').click()">
                        Create Your First Parser
                    </button>
                </div>
            `;
            return;
        }

        grid.innerHTML = parsers.map(parser => `
            <div class="parser-card ${parser.isActive ? 'active' : ''}" data-parser="${parser.name}">
                <div class="parser-card-header">
                    <h4>${this.escapeHtml(parser.displayName)}</h4>
                    <div class="parser-actions">
                        ${!parser.isActive ? `
                            <button class="btn btn-sm btn-outline" data-action="select" data-parser="${parser.name}" title="Select Parser">
                                <i class="fas fa-check"></i>
                            </button>
                        ` : '<span class="active-badge">Active</span>'}
                        <button class="btn btn-sm btn-outline" data-action="export" data-parser="${parser.name}" title="Export">
                            <i class="fas fa-download"></i>
                        </button>
                        <button class="btn btn-sm btn-outline" data-action="duplicate" data-parser="${parser.name}" title="Duplicate">
                            <i class="fas fa-copy"></i>
                        </button>
                        ${parser.name !== 'default' ? `
                            <button class="btn btn-sm btn-outline btn-danger" data-action="delete" data-parser="${parser.name}" title="Delete">
                                <i class="fas fa-trash"></i>
                            </button>
                        ` : ''}
                    </div>
                </div>
                
                <div class="parser-card-body">
                    <p class="parser-description">${this.escapeHtml(parser.description)}</p>
                    
                    <div class="parser-stats-mini">
                        <div class="stat">
                            <span class="stat-label">Records</span>
                            <span class="stat-value">${parser.statistics.totalRecords}</span>
                        </div>
                        <div class="stat">
                            <span class="stat-label">Checked</span>
                            <span class="stat-value">${parser.statistics.checkedRecords}</span>
                        </div>
                        <div class="stat">
                            <span class="stat-label">Sources</span>
                            <span class="stat-value">${parser.statistics.sourceCount}</span>
                        </div>
                    </div>
                    
                    <div class="parser-meta">
                        <small>Created: ${new Date(parser.created).toLocaleDateString()}</small>
                        <small>Last Used: ${new Date(parser.lastUsed).toLocaleDateString()}</small>
                    </div>
                </div>
            </div>
        `).join('');

        // Add event listeners to action buttons
        grid.querySelectorAll('[data-action]').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation();
                const action = btn.dataset.action;
                const parserName = btn.dataset.parser;
                this.handleParserAction(action, parserName);
            });
        });

        // Add click handler for parser selection
        grid.querySelectorAll('.parser-card').forEach(card => {
            card.addEventListener('click', () => {
                const parserName = card.dataset.parser;
                if (!card.classList.contains('active')) {
                    this.emit('parserSelect', { name: parserName });
                }
            });
        });
    }

    renderStatistics(stats) {
        const statsContainer = this.container.querySelector('#parserStats');
        if (!statsContainer) return;

        statsContainer.innerHTML = `
            <div class="stats-grid">
                <div class="stat-card">
                    <div class="stat-icon"><i class="fas fa-database"></i></div>
                    <div class="stat-content">
                        <h4>${stats.totalParsers}</h4>
                        <span>Total Parsers</span>
                    </div>
                </div>
                <div class="stat-card">
                    <div class="stat-icon"><i class="fas fa-table"></i></div>
                    <div class="stat-content">
                        <h4>${stats.totalRecords}</h4>
                        <span>Total Records</span>
                    </div>
                </div>
                <div class="stat-card">
                    <div class="stat-icon"><i class="fas fa-check-circle"></i></div>
                    <div class="stat-content">
                        <h4>${stats.totalChecked}</h4>
                        <span>Checked Records</span>
                    </div>
                </div>
                <div class="stat-card">
                    <div class="stat-icon"><i class="fas fa-file"></i></div>
                    <div class="stat-content">
                        <h4>${stats.totalSources}</h4>
                        <span>Data Sources</span>
                    </div>
                </div>
            </div>
        `;
    }

    showCreateModal() {
        const modal = this.container.querySelector('#createParserModal');
        if (modal) {
            modal.style.display = 'flex';
            // Focus on name input
            const nameInput = modal.querySelector('#parserName');
            if (nameInput) {
                nameInput.focus();
            }
        }
    }

    hideCreateModal() {
        const modal = this.container.querySelector('#createParserModal');
        if (modal) {
            modal.style.display = 'none';
            // Reset form
            const form = modal.querySelector('#createParserForm');
            if (form) {
                form.reset();
            }
        }
    }

    handleCreateParser() {
        const form = this.container.querySelector('#createParserForm');
        if (!form) return;

        const formData = new FormData(form);
        const data = {
            name: formData.get('name').trim(),
            description: formData.get('description').trim(),
            setAsActive: formData.get('setAsActive') === 'on'
        };

        if (!data.name) {
            this.showFormError('Parser name is required');
            return;
        }

        this.emit('parserCreate', data);
        this.hideCreateModal();
    }

    handleParserAction(action, parserName) {
        switch (action) {
            case 'select':
                this.emit('parserSelect', { name: parserName });
                break;
            case 'export':
                this.emit('parserExport', { name: parserName });
                break;
            case 'duplicate':
                this.showDuplicateDialog(parserName);
                break;
            case 'delete':
                this.emit('parserDelete', { name: parserName });
                break;
        }
    }

    showDuplicateDialog(parserName) {
        const newName = prompt(`Enter name for duplicated parser:`, `${parserName}_copy`);
        if (newName && newName.trim()) {
            this.emit('parserDuplicate', { 
                sourceName: parserName, 
                newName: newName.trim() 
            });
        }
    }

    showFormError(message) {
        // Create or update error message
        let errorDiv = this.container.querySelector('.form-error');
        if (!errorDiv) {
            errorDiv = document.createElement('div');
            errorDiv.className = 'form-error';
            const form = this.container.querySelector('#createParserForm');
            form.insertBefore(errorDiv, form.firstChild);
        }
        errorDiv.textContent = message;
        errorDiv.style.display = 'block';

        // Hide after 3 seconds
        setTimeout(() => {
            if (errorDiv) {
                errorDiv.style.display = 'none';
            }
        }, 3000);
    }

    update(data) {
        if (data.parsers) {
            this.renderParsers(data.parsers);
        }
        if (data.statistics) {
            this.renderStatistics(data.statistics);
        }
    }
}

export default ParserSelectionView;

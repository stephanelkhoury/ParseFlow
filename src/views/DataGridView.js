import BaseView from './BaseView.js';

/**
 * Data Grid View with Checkbox Support
 * Displays data in a table format with checkbox selection
 */
class DataGridView extends BaseView {
    constructor(container) {
        super(container);
        this.template = this.getTemplate();
        this.currentData = [];
        this.selectedRecords = new Set();
        this.currentPage = 1;
        this.pageSize = 10;
        this.sortField = '';
        this.sortDirection = 'asc';
        this.searchTerm = '';
    }

    getTemplate() {
        return `
            <div class="data-grid-section">
                <div class="data-grid-header">
                    <div class="data-grid-title">
                        <h3><i class="fas fa-table"></i> Data Records</h3>
                        <div class="record-count" id="recordCount">0 records</div>
                    </div>
                    
                    <div class="data-grid-controls">
                        <div class="search-box">
                            <input type="text" id="searchInput" placeholder="Search records..." />
                            <i class="fas fa-search"></i>
                        </div>
                        
                        <div class="bulk-actions" id="bulkActions" style="display: none;">
                            <button class="btn btn-sm btn-success" id="checkSelectedBtn">
                                <i class="fas fa-check"></i> Check Selected
                            </button>
                            <button class="btn btn-sm btn-warning" id="uncheckSelectedBtn">
                                <i class="fas fa-times"></i> Uncheck Selected
                            </button>
                            <button class="btn btn-sm btn-danger" id="deleteSelectedBtn">
                                <i class="fas fa-trash"></i> Delete Selected
                            </button>
                            <button class="btn btn-sm btn-info" id="exportSelectedBtn">
                                <i class="fas fa-download"></i> Export Selected
                            </button>
                        </div>
                        
                        <div class="view-controls">
                            <select id="pageSizeSelect" class="form-select">
                                <option value="10">10 per page</option>
                                <option value="25">25 per page</option>
                                <option value="50">50 per page</option>
                                <option value="100">100 per page</option>
                            </select>
                            
                            <div class="filter-buttons">
                                <button class="btn btn-sm btn-outline" id="showAllBtn">All</button>
                                <button class="btn btn-sm btn-outline" id="showCheckedBtn">Checked</button>
                                <button class="btn btn-sm btn-outline" id="showUncheckedBtn">Unchecked</button>
                            </div>
                        </div>
                    </div>
                </div>
                
                <div class="data-grid-content">
                    <div class="table-container">
                        <table class="data-table" id="dataTable">
                            <thead id="tableHeader">
                                <!-- Headers will be generated dynamically -->
                            </thead>
                            <tbody id="tableBody">
                                <!-- Data rows will be generated dynamically -->
                            </tbody>
                        </table>
                    </div>
                    
                    <div class="pagination-container" id="paginationContainer">
                        <!-- Pagination will be generated dynamically -->
                    </div>
                </div>
                
                <div class="selection-summary" id="selectionSummary" style="display: none;">
                    <span id="selectionText">0 records selected</span>
                    <button class="btn btn-sm btn-secondary" id="clearSelectionBtn">Clear Selection</button>
                </div>
            </div>
        `;
    }

    setupEventListeners() {
        // Search functionality
        this.addEventListener('#searchInput', 'input', (e) => {
            this.searchTerm = e.target.value;
            this.currentPage = 1;
            this.filterAndRender();
        });

        // Page size change
        this.addEventListener('#pageSizeSelect', 'change', (e) => {
            this.pageSize = parseInt(e.target.value);
            this.currentPage = 1;
            this.renderTable();
        });

        // Filter buttons
        this.addEventListener('#showAllBtn', 'click', () => {
            this.setFilter('all');
        });

        this.addEventListener('#showCheckedBtn', 'click', () => {
            this.setFilter('checked');
        });

        this.addEventListener('#showUncheckedBtn', 'click', () => {
            this.setFilter('unchecked');
        });

        // Bulk actions
        this.addEventListener('#checkSelectedBtn', 'click', () => {
            this.handleBulkCheckbox(true);
        });

        this.addEventListener('#uncheckSelectedBtn', 'click', () => {
            this.handleBulkCheckbox(false);
        });

        this.addEventListener('#deleteSelectedBtn', 'click', () => {
            this.handleBulkDelete();
        });

        this.addEventListener('#exportSelectedBtn', 'click', () => {
            this.handleBulkExport();
        });

        this.addEventListener('#clearSelectionBtn', 'click', () => {
            this.clearSelection();
        });
    }

    renderData(data) {
        this.currentData = data || [];
        this.selectedRecords.clear();
        this.currentPage = 1;
        this.filterAndRender();
    }

    filterAndRender() {
        let filteredData = [...this.currentData];

        // Apply search filter
        if (this.searchTerm) {
            const searchLower = this.searchTerm.toLowerCase();
            filteredData = filteredData.filter(record => 
                JSON.stringify(record).toLowerCase().includes(searchLower)
            );
        }

        // Apply checkbox filter
        if (this.currentFilter) {
            switch (this.currentFilter) {
                case 'checked':
                    filteredData = filteredData.filter(record => record.checked);
                    break;
                case 'unchecked':
                    filteredData = filteredData.filter(record => !record.checked);
                    break;
                // 'all' shows everything, no additional filtering needed
            }
        }

        // Apply sorting
        if (this.sortField) {
            filteredData.sort((a, b) => {
                const aVal = a[this.sortField];
                const bVal = b[this.sortField];
                
                let comparison = 0;
                if (aVal < bVal) comparison = -1;
                if (aVal > bVal) comparison = 1;
                
                return this.sortDirection === 'desc' ? -comparison : comparison;
            });
        }

        this.filteredData = filteredData;
        this.renderTable();
        this.updateRecordCount();
    }

    renderTable() {
        if (!this.filteredData || this.filteredData.length === 0) {
            this.showEmpty('No records match your criteria');
            return;
        }

        this.renderHeaders();
        this.renderRows();
        this.renderPagination();
    }

    renderHeaders() {
        const headerContainer = this.container.querySelector('#tableHeader');
        if (!headerContainer || this.filteredData.length === 0) return;

        const headers = Object.keys(this.filteredData[0]).filter(key => !key.startsWith('_'));
        
        headerContainer.innerHTML = `
            <tr>
                <th class="checkbox-column">
                    <label class="checkbox-label">
                        <input type="checkbox" id="selectAllCheckbox" />
                        <span class="checkbox-custom"></span>
                    </label>
                </th>
                ${headers.map(header => `
                    <th class="sortable" data-field="${header}">
                        ${this.escapeHtml(header)}
                        <i class="fas fa-sort sort-icon" data-field="${header}"></i>
                    </th>
                `).join('')}
                <th class="actions-column">Actions</th>
            </tr>
        `;

        // Add sort event listeners
        headerContainer.querySelectorAll('.sortable').forEach(th => {
            th.addEventListener('click', () => {
                const field = th.dataset.field;
                this.handleSort(field);
            });
        });

        // Add select all checkbox listener
        const selectAllCheckbox = headerContainer.querySelector('#selectAllCheckbox');
        if (selectAllCheckbox) {
            selectAllCheckbox.addEventListener('change', (e) => {
                this.handleSelectAll(e.target.checked);
            });
        }
    }

    renderRows() {
        const tbody = this.container.querySelector('#tableBody');
        if (!tbody) return;

        const startIndex = (this.currentPage - 1) * this.pageSize;
        const endIndex = startIndex + this.pageSize;
        const pageData = this.filteredData.slice(startIndex, endIndex);

        if (pageData.length === 0) {
            tbody.innerHTML = `
                <tr>
                    <td colspan="100%" class="no-data">No records to display</td>
                </tr>
            `;
            return;
        }

        const headers = Object.keys(pageData[0]).filter(key => !key.startsWith('_'));

        tbody.innerHTML = pageData.map(record => `
            <tr class="data-row ${record.checked ? 'checked' : ''}" data-record-id="${record.id}">
                <td class="checkbox-column">
                    <label class="checkbox-label">
                        <input type="checkbox" class="record-checkbox" 
                               data-record-id="${record.id}" 
                               ${record.checked ? 'checked' : ''} />
                        <span class="checkbox-custom"></span>
                    </label>
                </td>
                ${headers.map(header => `
                    <td class="data-cell" data-field="${header}">
                        <div class="cell-content">
                            ${this.formatCellValue(record[header], header)}
                        </div>
                    </td>
                `).join('')}
                <td class="actions-column">
                    <div class="action-buttons">
                        <button class="btn btn-xs btn-outline edit-btn" 
                                data-record-id="${record.id}" title="Edit">
                            <i class="fas fa-edit"></i>
                        </button>
                        <button class="btn btn-xs btn-outline btn-danger delete-btn" 
                                data-record-id="${record.id}" title="Delete">
                            <i class="fas fa-trash"></i>
                        </button>
                    </div>
                </td>
            </tr>
        `).join('');

        // Add event listeners to checkboxes and action buttons
        tbody.querySelectorAll('.record-checkbox').forEach(checkbox => {
            checkbox.addEventListener('change', (e) => {
                const recordId = e.target.dataset.recordId;
                const checked = e.target.checked;
                this.handleRecordCheckbox(recordId, checked);
            });
        });

        tbody.querySelectorAll('.edit-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const recordId = e.target.closest('[data-record-id]').dataset.recordId;
                this.handleEditRecord(recordId);
            });
        });

        tbody.querySelectorAll('.delete-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const recordId = e.target.closest('[data-record-id]').dataset.recordId;
                this.handleDeleteRecord(recordId);
            });
        });

        // Add row selection listeners
        tbody.querySelectorAll('.data-row').forEach(row => {
            row.addEventListener('click', (e) => {
                // Skip if clicking on checkbox or action buttons
                if (e.target.closest('.checkbox-column') || e.target.closest('.actions-column')) {
                    return;
                }
                
                const recordId = row.dataset.recordId;
                this.toggleRowSelection(recordId);
            });
        });
    }

    renderPagination() {
        const container = this.container.querySelector('#paginationContainer');
        if (!container) return;

        const totalPages = Math.ceil(this.filteredData.length / this.pageSize);
        
        if (totalPages <= 1) {
            container.innerHTML = '';
            return;
        }

        const pages = [];
        const showPages = 5; // Number of page buttons to show
        
        let startPage = Math.max(1, this.currentPage - Math.floor(showPages / 2));
        let endPage = Math.min(totalPages, startPage + showPages - 1);
        
        if (endPage - startPage < showPages - 1) {
            startPage = Math.max(1, endPage - showPages + 1);
        }

        container.innerHTML = `
            <div class="pagination">
                <button class="btn btn-sm btn-outline" ${this.currentPage === 1 ? 'disabled' : ''} 
                        data-page="1">First</button>
                <button class="btn btn-sm btn-outline" ${this.currentPage === 1 ? 'disabled' : ''} 
                        data-page="${this.currentPage - 1}">Previous</button>
                
                ${Array.from({length: endPage - startPage + 1}, (_, i) => startPage + i)
                    .map(page => `
                        <button class="btn btn-sm ${page === this.currentPage ? 'btn-primary' : 'btn-outline'}" 
                                data-page="${page}">${page}</button>
                    `).join('')}
                
                <button class="btn btn-sm btn-outline" ${this.currentPage === totalPages ? 'disabled' : ''} 
                        data-page="${this.currentPage + 1}">Next</button>
                <button class="btn btn-sm btn-outline" ${this.currentPage === totalPages ? 'disabled' : ''} 
                        data-page="${totalPages}">Last</button>
            </div>
        `;

        // Add pagination event listeners
        container.querySelectorAll('[data-page]').forEach(btn => {
            btn.addEventListener('click', () => {
                if (!btn.disabled) {
                    this.currentPage = parseInt(btn.dataset.page);
                    this.renderRows();
                    this.renderPagination();
                }
            });
        });
    }

    formatCellValue(value, field) {
        if (field === 'checked') {
            return `<span class="status-badge ${value ? 'checked' : 'unchecked'}">
                ${value ? 'Checked' : 'Unchecked'}
            </span>`;
        }
        
        if (value === null || value === undefined) {
            return '<span class="null-value">—</span>';
        }
        
        if (typeof value === 'boolean') {
            return `<span class="boolean-value ${value}">${value ? 'Yes' : 'No'}</span>`;
        }
        
        if (typeof value === 'number') {
            return `<span class="number-value">${value.toLocaleString()}</span>`;
        }
        
        if (typeof value === 'string' && value.length > 50) {
            return `<span class="long-text" title="${this.escapeHtml(value)}">
                ${this.escapeHtml(value.substring(0, 47))}...
            </span>`;
        }
        
        return this.escapeHtml(String(value));
    }

    handleRecordCheckbox(recordId, checked) {
        this.emit('recordCheckbox', { recordId, checked });
        
        // Update UI immediately for better UX
        const row = this.container.querySelector(`[data-record-id="${recordId}"]`);
        if (row) {
            row.classList.toggle('checked', checked);
        }
        
        // Update selection
        if (checked) {
            this.selectedRecords.add(recordId);
        } else {
            this.selectedRecords.delete(recordId);
        }
        
        this.updateSelectionUI();
    }

    handleSort(field) {
        if (this.sortField === field) {
            this.sortDirection = this.sortDirection === 'asc' ? 'desc' : 'asc';
        } else {
            this.sortField = field;
            this.sortDirection = 'asc';
        }
        
        this.filterAndRender();
        this.updateSortIcons();
    }

    handleSelectAll(checked) {
        const startIndex = (this.currentPage - 1) * this.pageSize;
        const endIndex = startIndex + this.pageSize;
        const pageData = this.filteredData.slice(startIndex, endIndex);
        
        const recordIds = pageData.map(record => record.id);
        
        if (checked) {
            recordIds.forEach(id => this.selectedRecords.add(id));
        } else {
            recordIds.forEach(id => this.selectedRecords.delete(id));
        }
        
        this.emit('bulkCheckbox', { recordIds, checked });
        this.updateSelectionUI();
    }

    toggleRowSelection(recordId) {
        if (this.selectedRecords.has(recordId)) {
            this.selectedRecords.delete(recordId);
        } else {
            this.selectedRecords.add(recordId);
        }
        
        this.updateSelectionUI();
    }

    setFilter(filter) {
        this.currentFilter = filter;
        this.currentPage = 1;
        
        // Update filter button states
        this.container.querySelectorAll('.filter-buttons .btn').forEach(btn => {
            btn.classList.remove('active');
        });
        
        const activeBtn = this.container.querySelector(`#show${filter.charAt(0).toUpperCase() + filter.slice(1)}Btn`);
        if (activeBtn) {
            activeBtn.classList.add('active');
        }
        
        this.filterAndRender();
    }

    updateRecordCount() {
        const countElement = this.container.querySelector('#recordCount');
        if (countElement) {
            const total = this.currentData.length;
            const filtered = this.filteredData.length;
            
            if (filtered === total) {
                countElement.textContent = `${total} records`;
            } else {
                countElement.textContent = `${filtered} of ${total} records`;
            }
        }
    }

    updateSelectionUI() {
        const selectedCount = this.selectedRecords.size;
        const bulkActions = this.container.querySelector('#bulkActions');
        const selectionSummary = this.container.querySelector('#selectionSummary');
        const selectionText = this.container.querySelector('#selectionText');
        
        if (selectedCount > 0) {
            bulkActions.style.display = 'flex';
            selectionSummary.style.display = 'flex';
            selectionText.textContent = `${selectedCount} record${selectedCount > 1 ? 's' : ''} selected`;
        } else {
            bulkActions.style.display = 'none';
            selectionSummary.style.display = 'none';
        }
    }

    updateSortIcons() {
        this.container.querySelectorAll('.sort-icon').forEach(icon => {
            icon.className = 'fas fa-sort sort-icon';
        });
        
        if (this.sortField) {
            const sortIcon = this.container.querySelector(`[data-field="${this.sortField}"] .sort-icon`);
            if (sortIcon) {
                sortIcon.className = `fas fa-sort-${this.sortDirection === 'asc' ? 'up' : 'down'} sort-icon active`;
            }
        }
    }

    clearSelection() {
        this.selectedRecords.clear();
        this.updateSelectionUI();
        
        // Update checkboxes
        this.container.querySelectorAll('.record-checkbox').forEach(checkbox => {
            checkbox.checked = false;
        });
    }

    handleBulkCheckbox(checked) {
        const recordIds = Array.from(this.selectedRecords);
        if (recordIds.length > 0) {
            this.emit('bulkCheckbox', { recordIds, checked });
        }
    }

    handleBulkDelete() {
        const recordIds = Array.from(this.selectedRecords);
        if (recordIds.length > 0) {
            this.emit('bulkDelete', { recordIds });
        }
    }

    handleBulkExport() {
        const recordIds = Array.from(this.selectedRecords);
        if (recordIds.length > 0) {
            this.emit('bulkExport', { recordIds });
        }
    }

    handleEditRecord(recordId) {
        this.emit('recordEdit', { recordId });
    }

    handleDeleteRecord(recordId) {
        this.emit('recordDelete', { recordId });
    }
}

export default DataGridView;

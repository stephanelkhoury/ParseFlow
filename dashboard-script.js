// Database and state management
class ParseFlowDB {
    constructor() {
        this.dbKey = 'parseflow_database';
        this.data = this.loadData();
    }

    loadData() {
        try {
            const saved = localStorage.getItem(this.dbKey);
            return saved ? JSON.parse(saved) : {
                records: [],
                metadata: {
                    totalFiles: 0,
                    lastUpdated: null,
                    uploadHistory: []
                }
            };
        } catch (error) {
            console.error('Error loading data:', error);
            return { records: [], metadata: { totalFiles: 0, lastUpdated: null, uploadHistory: [] } };
        }
    }

    saveData() {
        try {
            localStorage.setItem(this.dbKey, JSON.stringify(this.data));
            return true;
        } catch (error) {
            console.error('Error saving data:', error);
            return false;
        }
    }

    addRecords(newRecords, fileName = 'unknown') {
        // Check for duplicates and filter out identical records
        const timestamp = new Date().toISOString();
        const uniqueRecords = [];
        const duplicateInfo = [];
        
        for (const record of newRecords) {
            const duplicateCheck = this.findDuplicateRecord(record);
            
            if (!duplicateCheck) {
                uniqueRecords.push(record);
            } else {
                duplicateInfo.push({
                    record: record,
                    duplicateOf: duplicateCheck
                });
            }
        }
        
        // Add unique records with metadata
        const recordsWithMeta = uniqueRecords.map((record, index) => ({
            ...record,
            _id: this.generateId(),
            _source: fileName,
            _dateAdded: timestamp,
            _index: this.data.records.length + index
        }));

        this.data.records.push(...recordsWithMeta);
        this.data.metadata.totalFiles++;
        this.data.metadata.lastUpdated = timestamp;
        this.data.metadata.uploadHistory.push({
            fileName,
            recordCount: newRecords.length,
            uniqueRecords: uniqueRecords.length,
            duplicatesSkipped: duplicateInfo.length,
            timestamp
        });

        console.log(`Import Summary for ${fileName}:`);
        console.log(`- Total records processed: ${newRecords.length}`);
        console.log(`- New records added: ${uniqueRecords.length}`);
        console.log(`- Duplicates skipped: ${duplicateInfo.length}`);

        const result = this.saveData();
        
        return {
            ...result,
            importStats: {
                total: newRecords.length,
                added: uniqueRecords.length,
                duplicates: duplicateInfo.length,
                duplicateDetails: duplicateInfo
            }
        };
    }

    findDuplicateRecord(newRecord) {
        // Compare with all existing records
        for (const existingRecord of this.data.records) {
            if (this.recordsAreIdentical(newRecord, existingRecord)) {
                return {
                    _id: existingRecord._id,
                    _source: existingRecord._source,
                    _dateAdded: existingRecord._dateAdded
                };
            }
        }
        return null;
    }

    recordsAreIdentical(record1, record2) {
        // Get all data keys (exclude metadata keys that start with _)
        const keys1 = Object.keys(record1).filter(key => !key.startsWith('_'));
        const keys2 = Object.keys(record2).filter(key => !key.startsWith('_'));
        
        // Check if they have the same number of data fields
        if (keys1.length !== keys2.length) {
            return false;
        }
        
        // Get all unique keys from both records
        const allKeys = [...new Set([...keys1, ...keys2])];
        
        // Compare each field value
        for (const key of allKeys) {
            const value1 = this.normalizeValue(record1[key]);
            const value2 = this.normalizeValue(record2[key]);
            
            if (!this.valuesAreEqual(value1, value2)) {
                return false;
            }
        }
        
        return true;
    }

    normalizeValue(value) {
        // Handle null, undefined, empty string
        if (value === null || value === undefined) {
            return null;
        }
        
        // Handle strings
        if (typeof value === 'string') {
            const trimmed = value.trim();
            // Treat empty strings, "null", "undefined" as null
            if (trimmed === '' || 
                trimmed.toLowerCase() === 'null' || 
                trimmed.toLowerCase() === 'undefined' ||
                trimmed.toLowerCase() === 'n/a' ||
                trimmed === '-') {
                return null;
            }
            return trimmed.toLowerCase(); // Case-insensitive comparison
        }
        
        // Handle numbers (convert string numbers to actual numbers)
        if (typeof value === 'number') {
            return value;
        }
        
        if (typeof value === 'string') {
            const numValue = parseFloat(value);
            if (!isNaN(numValue) && isFinite(numValue)) {
                return numValue;
            }
        }
        
        // Handle booleans
        if (typeof value === 'boolean') {
            return value;
        }
        
        // Handle string booleans
        if (typeof value === 'string') {
            const lower = value.toLowerCase();
            if (lower === 'true' || lower === '1' || lower === 'yes') return true;
            if (lower === 'false' || lower === '0' || lower === 'no') return false;
        }
        
        // Handle dates
        if (value instanceof Date) {
            return value.toISOString();
        }
        
        // Handle objects and arrays by deep comparison
        if (typeof value === 'object') {
            return JSON.stringify(this.sortObjectKeys(value));
        }
        
        return value;
    }

    sortObjectKeys(obj) {
        if (obj === null || typeof obj !== 'object') return obj;
        
        if (Array.isArray(obj)) {
            return obj.map(item => this.sortObjectKeys(item));
        }
        
        const sorted = {};
        Object.keys(obj).sort().forEach(key => {
            sorted[key] = this.sortObjectKeys(obj[key]);
        });
        return sorted;
    }

    valuesAreEqual(value1, value2) {
        // Both null/undefined
        if ((value1 === null || value1 === undefined) && 
            (value2 === null || value2 === undefined)) {
            return true;
        }
        
        // One is null, other is not
        if ((value1 === null || value1 === undefined) !== 
            (value2 === null || value2 === undefined)) {
            return false;
        }
        
        // Direct comparison
        return value1 === value2;
    }

    generateId() {
        return 'pf_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9);
    }

    getAllRecords() {
        return this.data.records;
    }

    getRecord(id) {
        return this.data.records.find(record => record._id === id);
    }

    updateRecord(id, updatedData) {
        const index = this.data.records.findIndex(record => record._id === id);
        if (index !== -1) {
            this.data.records[index] = { ...this.data.records[index], ...updatedData };
            this.data.metadata.lastUpdated = new Date().toISOString();
            return this.saveData();
        }
        return false;
    }

    deleteRecord(id) {
        const index = this.data.records.findIndex(record => record._id === id);
        if (index !== -1) {
            this.data.records.splice(index, 1);
            this.data.metadata.lastUpdated = new Date().toISOString();
            return this.saveData();
        }
        return false;
    }

    clearAll() {
        this.data = {
            records: [],
            metadata: {
                totalFiles: 0,
                lastUpdated: null,
                uploadHistory: []
            }
        };
        return this.saveData();
    }

    getMetadata() {
        return this.data.metadata;
    }

    search(query) {
        if (!query) return this.data.records;
        
        const lowerQuery = query.toLowerCase();
        return this.data.records.filter(record => {
            return Object.values(record).some(value => 
                value && value.toString().toLowerCase().includes(lowerQuery)
            );
        });
    }
}

// Global variables
let db = new ParseFlowDB();
let currentChart = null;
let currentPage = 1;
let recordsPerPage = 12;
let filteredRecords = [];
let selectedRecordId = null;

// Initialize dashboard
document.addEventListener('DOMContentLoaded', function() {
    initializeDashboard();
    setupEventListeners();
    loadDashboardData();
});

function initializeDashboard() {
    // Check if there's data to load from the upload page
    const uploadedData = sessionStorage.getItem('uploadedData');
    if (uploadedData) {
        try {
            const data = JSON.parse(uploadedData);
            const fileName = sessionStorage.getItem('uploadedFileName') || 'imported_data.json';
            
            if (data && data.length > 0) {
                db.addRecords(data, fileName);
                sessionStorage.removeItem('uploadedData');
                sessionStorage.removeItem('uploadedFileName');
                showNotification('Data imported successfully!', 'success');
            }
        } catch (error) {
            console.error('Error loading uploaded data:', error);
        }
    }
}

function setupEventListeners() {
    // Navigation
    document.querySelectorAll('.nav-link').forEach(link => {
        link.addEventListener('click', handleNavigation);
    });

    // Search
    document.getElementById('searchInput').addEventListener('input', handleSearch);
    
    // Filters
    document.getElementById('companyFilter').addEventListener('change', handleFilter);
    document.getElementById('sortBy').addEventListener('change', handleSort);

    // Update data modal
    document.querySelector('.update-data-btn').addEventListener('click', openUpdateModal);
    document.getElementById('updateFileInput').addEventListener('change', handleUpdateFiles);

    // View controls
    document.querySelectorAll('.view-btn').forEach(btn => {
        btn.addEventListener('click', switchView);
    });

    // Chart controls
    document.getElementById('chartType').addEventListener('change', updateChart);
    document.getElementById('xAxis').addEventListener('change', updateChart);
    document.getElementById('yAxis').addEventListener('change', updateChart);
}

function loadDashboardData() {
    updateSummaryStats();
    loadCards();
    updateCompanyFilter();
    loadDataTable();
    loadChartControls();
    loadStatistics();
}

function updateSummaryStats() {
    const metadata = db.getMetadata();
    const totalRecords = db.getAllRecords().length;
    
    document.getElementById('totalRecords').textContent = totalRecords.toLocaleString();
    document.getElementById('totalFiles').textContent = metadata.totalFiles;
    
    const lastUpdated = metadata.lastUpdated 
        ? new Date(metadata.lastUpdated).toLocaleDateString()
        : 'Never';
    document.getElementById('lastUpdated').textContent = lastUpdated;
}

function loadCards() {
    const searchQuery = document.getElementById('searchInput').value;
    const companyFilter = document.getElementById('companyFilter').value;
    const sortBy = document.getElementById('sortBy').value;
    
    let records = db.getAllRecords();
    
    // Apply search
    if (searchQuery) {
        records = db.search(searchQuery);
    }
    
    // Apply company filter
    if (companyFilter) {
        records = records.filter(record => {
            const company = getFieldValue(record, ['company', 'company_name', 'organization']);
            return company && company.toLowerCase().includes(companyFilter.toLowerCase());
        });
    }
    
    // Apply sorting
    records = sortRecords(records, sortBy);
    
    filteredRecords = records;
    
    // Pagination
    const totalPages = Math.ceil(records.length / recordsPerPage);
    const startIndex = (currentPage - 1) * recordsPerPage;
    const endIndex = startIndex + recordsPerPage;
    const pageRecords = records.slice(startIndex, endIndex);
    
    renderCards(pageRecords);
    renderPagination(totalPages);
}

function getFieldValue(record, possibleFields) {
    for (const field of possibleFields) {
        const value = record[field] || record[field.toLowerCase()] || record[field.toUpperCase()];
        if (value) return value;
    }
    return '';
}

function sortRecords(records, sortBy) {
    return records.sort((a, b) => {
        let aValue, bValue;
        
        switch (sortBy) {
            case 'name':
                aValue = getFieldValue(a, ['name', 'full_name', 'first_name', 'fullname']) || '';
                bValue = getFieldValue(b, ['name', 'full_name', 'first_name', 'fullname']) || '';
                break;
            case 'company':
                aValue = getFieldValue(a, ['company', 'company_name', 'organization']) || '';
                bValue = getFieldValue(b, ['company', 'company_name', 'organization']) || '';
                break;
            case 'email':
                aValue = getFieldValue(a, ['email', 'email_address', 'mail']) || '';
                bValue = getFieldValue(b, ['email', 'email_address', 'mail']) || '';
                break;
            case 'date':
                aValue = new Date(a._dateAdded || 0);
                bValue = new Date(b._dateAdded || 0);
                break;
            default:
                return 0;
        }
        
        if (sortBy === 'date') {
            return bValue - aValue; // Newest first
        }
        
        return aValue.toString().localeCompare(bValue.toString());
    });
}

function renderCards(records) {
    const container = document.getElementById('cardsContainer');
    
    if (records.length === 0) {
        container.innerHTML = `
            <div class="no-data">
                <i class="fas fa-inbox"></i>
                <h3>No data found</h3>
                <p>Upload some files to get started or adjust your search filters.</p>
            </div>
        `;
        return;
    }
    
    container.innerHTML = records.map(record => createCardHTML(record)).join('');
    
    // Add click listeners to cards
    container.querySelectorAll('.contact-card').forEach(card => {
        card.addEventListener('click', () => {
            const recordId = card.dataset.recordId;
            showRecordDetails(recordId);
        });
    });
}

function createCardHTML(record) {
    const name = getFieldValue(record, ['name', 'full_name', 'first_name', 'fullname']) || 'Unknown Name';
    const company = getFieldValue(record, ['company', 'company_name', 'organization']) || 'Unknown Company';
    const email = getFieldValue(record, ['email', 'email_address', 'mail']) || 'No email';
    
    const initials = name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
    const dateAdded = record._dateAdded ? new Date(record._dateAdded).toLocaleDateString() : 'Unknown';
    
    return `
        <div class="contact-card" data-record-id="${record._id}">
            <div class="card-header">
                <div class="card-avatar">${initials}</div>
                <div class="card-info">
                    <h3>${formatFieldName(name)}</h3>
                    <div class="card-company">${formatFieldName(company)}</div>
                </div>
            </div>
            <div class="card-body">
                <div class="card-email">
                    <i class="fas fa-envelope"></i>
                    ${email}
                </div>
            </div>
            <div class="card-meta">
                <span class="card-date">Added: ${dateAdded}</span>
                <span class="card-source">${record._source || 'Unknown'}</span>
            </div>
        </div>
    `;
}

function renderPagination(totalPages) {
    const container = document.getElementById('pagination');
    
    if (totalPages <= 1) {
        container.innerHTML = '';
        return;
    }
    
    let paginationHTML = '';
    
    // Previous button
    paginationHTML += `
        <button class="page-btn" ${currentPage === 1 ? 'disabled' : ''} onclick="changePage(${currentPage - 1})">
            <i class="fas fa-chevron-left"></i>
        </button>
    `;
    
    // Page numbers
    for (let i = 1; i <= totalPages; i++) {
        if (i === 1 || i === totalPages || (i >= currentPage - 2 && i <= currentPage + 2)) {
            paginationHTML += `
                <button class="page-btn ${i === currentPage ? 'active' : ''}" onclick="changePage(${i})">
                    ${i}
                </button>
            `;
        } else if (i === currentPage - 3 || i === currentPage + 3) {
            paginationHTML += '<span class="page-ellipsis">...</span>';
        }
    }
    
    // Next button
    paginationHTML += `
        <button class="page-btn" ${currentPage === totalPages ? 'disabled' : ''} onclick="changePage(${currentPage + 1})">
            <i class="fas fa-chevron-right"></i>
        </button>
    `;
    
    container.innerHTML = paginationHTML;
}

function changePage(page) {
    const totalPages = Math.ceil(filteredRecords.length / recordsPerPage);
    if (page >= 1 && page <= totalPages) {
        currentPage = page;
        loadCards();
    }
}

function updateCompanyFilter() {
    const select = document.getElementById('companyFilter');
    const records = db.getAllRecords();
    const companies = new Set();
    
    records.forEach(record => {
        const company = getFieldValue(record, ['company', 'company_name', 'organization']);
        if (company) {
            companies.add(company);
        }
    });
    
    select.innerHTML = '<option value="">All Companies</option>';
    Array.from(companies).sort().forEach(company => {
        const option = document.createElement('option');
        option.value = company;
        option.textContent = formatFieldName(company);
        select.appendChild(option);
    });
}

// Event handlers
function handleNavigation(event) {
    event.preventDefault();
    const section = event.target.dataset.section;
    if (section) {
        showSection(section);
        
        // Update active nav link
        document.querySelectorAll('.nav-link').forEach(link => {
            link.classList.remove('active');
        });
        event.target.classList.add('active');
    }
}

function showSection(sectionName) {
    document.querySelectorAll('.content-section').forEach(section => {
        section.classList.remove('active');
    });
    
    const targetSection = document.getElementById(sectionName + '-section');
    if (targetSection) {
        targetSection.classList.add('active');
        
        // Load section-specific data
        switch (sectionName) {
            case 'data':
                loadDataTable();
                break;
            case 'charts':
                loadChartControls();
                break;
            case 'statistics':
                loadStatistics();
                break;
        }
    }
}

function handleSearch() {
    currentPage = 1;
    loadCards();
}

function handleFilter() {
    currentPage = 1;
    loadCards();
}

function handleSort() {
    currentPage = 1;
    loadCards();
}

// Utility functions
function formatFieldName(fieldName) {
    if (!fieldName) return '';
    return fieldName.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
}

function getAllHeaders(data) {
    const headerSet = new Set();
    data.forEach(row => {
        Object.keys(row).forEach(key => {
            if (!key.startsWith('_')) { // Exclude internal fields
                headerSet.add(key);
            }
        });
    });
    return Array.from(headerSet);
}

// Data table functions
function loadDataTable() {
    const records = db.getAllRecords();
    displayTable(records);
}

function displayTable(data) {
    const tableHead = document.getElementById('tableHead');
    const tableBody = document.getElementById('tableBody');
    const recordCount = document.getElementById('recordCount');
    const columnCount = document.getElementById('columnCount');
    
    tableHead.innerHTML = '';
    tableBody.innerHTML = '';
    
    if (data.length === 0) {
        recordCount.textContent = '0 records';
        columnCount.textContent = '0 columns';
        return;
    }
    
    const headers = getAllHeaders(data);
    
    // Create header row
    const headerRow = document.createElement('tr');
    headers.forEach(header => {
        const th = document.createElement('th');
        th.textContent = formatFieldName(header);
        headerRow.appendChild(th);
    });
    tableHead.appendChild(headerRow);
    
    // Create data rows (limit to 1000 for performance)
    const displayData = data.slice(0, 1000);
    displayData.forEach(row => {
        const tr = document.createElement('tr');
        headers.forEach(header => {
            const td = document.createElement('td');
            const value = row[header];
            td.textContent = value !== null && value !== undefined ? value : '';
            if (value === null || value === undefined) {
                td.classList.add('missing-field');
            }
            tr.appendChild(td);
        });
        tableBody.appendChild(tr);
    });
    
    recordCount.textContent = `${data.length} records${data.length > 1000 ? ' (showing first 1000)' : ''}`;
    columnCount.textContent = `${headers.length} columns`;
}

// Chart functions with enhanced intelligence
function loadChartControls() {
    const records = db.getAllRecords();
    updateChartControls(records);
    generateSmartChartSuggestions(records);
}

function updateChartControls(data) {
    const xAxis = document.getElementById('xAxis');
    const yAxis = document.getElementById('yAxis');
    
    xAxis.innerHTML = '<option value="">Select X-Axis</option>';
    yAxis.innerHTML = '<option value="">Select Y-Axis</option>';
    
    if (data.length === 0) return;
    
    const headers = getAllHeaders(data);
    const fieldAnalysis = analyzeFields(data, headers);
    
    // Sort headers by data type for better UX
    const categoricalFields = fieldAnalysis.categorical;
    const numericFields = fieldAnalysis.numeric;
    const dateFields = fieldAnalysis.dates;
    
    // Add categorical fields (good for X-axis)
    if (categoricalFields.length > 0) {
        const catGroup = document.createElement('optgroup');
        catGroup.label = 'Categorical Fields';
        categoricalFields.forEach(header => {
            const option = document.createElement('option');
            option.value = header;
            option.textContent = `${formatFieldName(header)} (text)`;
            catGroup.appendChild(option);
        });
        xAxis.appendChild(catGroup);
    }
    
    // Add date fields (good for X-axis)
    if (dateFields.length > 0) {
        const dateGroup = document.createElement('optgroup');
        dateGroup.label = 'Date Fields';
        dateFields.forEach(header => {
            const option = document.createElement('option');
            option.value = header;
            option.textContent = `${formatFieldName(header)} (date)`;
            dateGroup.appendChild(option);
        });
        xAxis.appendChild(dateGroup);
    }
    
    // Add numeric fields (good for both axes)
    if (numericFields.length > 0) {
        const numGroup = document.createElement('optgroup');
        numGroup.label = 'Numeric Fields';
        numericFields.forEach(header => {
            const optionX = document.createElement('option');
            optionX.value = header;
            optionX.textContent = `${formatFieldName(header)} (number)`;
            numGroup.appendChild(optionX);
        });
        xAxis.appendChild(numGroup.cloneNode(true));
        yAxis.appendChild(numGroup);
    }
    
    // Add all categorical fields to Y-axis for counting
    if (categoricalFields.length > 0) {
        const catGroupY = document.createElement('optgroup');
        catGroupY.label = 'Categorical Fields (for counting)';
        categoricalFields.forEach(header => {
            const option = document.createElement('option');
            option.value = header;
            option.textContent = `${formatFieldName(header)} (count)`;
            catGroupY.appendChild(option);
        });
        yAxis.appendChild(catGroupY);
    }
}

function analyzeFields(data, headers) {
    const analysis = {
        numeric: [],
        categorical: [],
        dates: [],
        fieldStats: {}
    };
    
    headers.forEach(header => {
        const values = data.map(row => row[header]).filter(val => val !== null && val !== undefined && val !== '');
        
        if (values.length === 0) return;
        
        let numericCount = 0;
        let dateCount = 0;
        const uniqueValues = new Set();
        
        values.forEach(val => {
            uniqueValues.add(val);
            
            // Check if numeric
            const numVal = parseFloat(val);
            if (!isNaN(numVal) && isFinite(numVal)) {
                numericCount++;
            }
            
            // Check if date
            const dateVal = new Date(val);
            if (!isNaN(dateVal.getTime()) && val.toString().match(/\d{4}|\d{2}[\/\-]\d{2}|\d{2}[\/\-]\d{4}/)) {
                dateCount++;
            }
        });
        
        const numericRatio = numericCount / values.length;
        const dateRatio = dateCount / values.length;
        const uniqueRatio = uniqueValues.size / values.length;
        
        analysis.fieldStats[header] = {
            totalValues: values.length,
            uniqueValues: uniqueValues.size,
            numericRatio,
            dateRatio,
            uniqueRatio
        };
        
        // Classify field type
        if (numericRatio > 0.8) {
            analysis.numeric.push(header);
        } else if (dateRatio > 0.6) {
            analysis.dates.push(header);
        } else {
            analysis.categorical.push(header);
        }
    });
    
    return analysis;
}

function generateSmartChartSuggestions(data) {
    if (data.length === 0) return;
    
    const headers = getAllHeaders(data);
    const fieldAnalysis = analyzeFields(data, headers);
    
    // Create suggestions container
    let suggestionsContainer = document.getElementById('chartSuggestions');
    if (!suggestionsContainer) {
        suggestionsContainer = document.createElement('div');
        suggestionsContainer.id = 'chartSuggestions';
        suggestionsContainer.className = 'chart-suggestions';
        
        const chartsSection = document.getElementById('charts-section');
        const chartControls = chartsSection.querySelector('.chart-controls');
        chartControls.parentNode.insertBefore(suggestionsContainer, chartControls.nextSibling);
    }
    
    const suggestions = generateChartSuggestions(fieldAnalysis);
    
    suggestionsContainer.innerHTML = `
        <h3><i class="fas fa-lightbulb"></i> Smart Chart Suggestions</h3>
        <div class="suggestions-grid">
            ${suggestions.map(suggestion => `
                <div class="suggestion-card" onclick="applySuggestion('${suggestion.x}', '${suggestion.y}', '${suggestion.type}')">
                    <div class="suggestion-icon">
                        <i class="fas ${getChartIcon(suggestion.type)}"></i>
                    </div>
                    <div class="suggestion-content">
                        <h4>${suggestion.title}</h4>
                        <p>${suggestion.description}</p>
                        <small>${formatFieldName(suggestion.y)} by ${formatFieldName(suggestion.x)}</small>
                    </div>
                </div>
            `).join('')}
        </div>
    `;
}

function generateChartSuggestions(analysis) {
    const suggestions = [];
    
    // Distribution charts for categorical data
    analysis.categorical.forEach(catField => {
        suggestions.push({
            type: 'pie',
            x: catField,
            y: catField,
            title: `${formatFieldName(catField)} Distribution`,
            description: 'See the breakdown of categories'
        });
    });
    
    // Numeric comparisons
    if (analysis.categorical.length > 0 && analysis.numeric.length > 0) {
        const catField = analysis.categorical[0];
        const numField = analysis.numeric[0];
        
        suggestions.push({
            type: 'bar',
            x: catField,
            y: numField,
            title: `${formatFieldName(numField)} by ${formatFieldName(catField)}`,
            description: 'Compare numeric values across categories'
        });
    }
    
    // Time series if dates available
    if (analysis.dates.length > 0 && analysis.numeric.length > 0) {
        const dateField = analysis.dates[0];
        const numField = analysis.numeric[0];
        
        suggestions.push({
            type: 'line',
            x: dateField,
            y: numField,
            title: `${formatFieldName(numField)} Over Time`,
            description: 'Track changes over time'
        });
    }
    
    // Numeric correlations
    if (analysis.numeric.length >= 2) {
        suggestions.push({
            type: 'bar',
            x: analysis.numeric[0],
            y: analysis.numeric[1],
            title: `${formatFieldName(analysis.numeric[1])} vs ${formatFieldName(analysis.numeric[0])}`,
            description: 'Compare two numeric variables'
        });
    }
    
    return suggestions.slice(0, 4); // Limit to 4 suggestions
}

function getChartIcon(type) {
    const icons = {
        bar: 'fa-chart-bar',
        line: 'fa-chart-line',
        pie: 'fa-chart-pie',
        doughnut: 'fa-chart-pie'
    };
    return icons[type] || 'fa-chart-bar';
}

function applySuggestion(xField, yField, chartType) {
    document.getElementById('xAxis').value = xField;
    document.getElementById('yAxis').value = yField;
    document.getElementById('chartType').value = chartType;
    updateChart();
}

function updateChart() {
    const data = db.getAllRecords();
    const chartType = document.getElementById('chartType').value;
    const xAxis = document.getElementById('xAxis').value;
    const yAxis = document.getElementById('yAxis').value;
    
    if (!xAxis || !yAxis || data.length === 0) {
        return;
    }
    
    const ctx = document.getElementById('dataChart').getContext('2d');
    
    if (currentChart) {
        currentChart.destroy();
    }
    
    // Intelligent data preparation
    const chartData = prepareSmartChartData(data, xAxis, yAxis, chartType);
    
    const config = {
        type: chartType,
        data: chartData,
        options: getSmartChartOptions(chartType, xAxis, yAxis, chartData)
    };
    
    currentChart = new Chart(ctx, config);
    
    // Show chart insights
    displayChartInsights(data, xAxis, yAxis, chartData);
}

function prepareSmartChartData(data, xField, yField, chartType) {
    const fieldAnalysis = analyzeFields(data, [xField, yField]);
    const isXNumeric = fieldAnalysis.numeric.includes(xField);
    const isYNumeric = fieldAnalysis.numeric.includes(yField);
    const isXDate = fieldAnalysis.dates.includes(xField);
    
    let labels = [];
    let chartData = [];
    let backgroundColors = [];
    
    if (chartType === 'pie' || chartType === 'doughnut') {
        // For pie charts, count occurrences or sum values
        const groups = {};
        
        data.forEach(row => {
            const key = row[xField] || 'Unknown';
            if (isYNumeric && xField !== yField) {
                // Sum numeric values
                const value = parseFloat(row[yField]) || 0;
                groups[key] = (groups[key] || 0) + value;
            } else {
                // Count occurrences
                groups[key] = (groups[key] || 0) + 1;
            }
        });
        
        // Sort by value descending and take top 10
        const sortedEntries = Object.entries(groups)
            .sort(([,a], [,b]) => b - a)
            .slice(0, 10);
        
        labels = sortedEntries.map(([key]) => key);
        chartData = sortedEntries.map(([,value]) => value);
        backgroundColors = generateColors(chartData.length);
        
    } else {
        // For other charts
        let processedData = [...data];
        
        // Sort data intelligently
        if (isXDate) {
            processedData.sort((a, b) => new Date(a[xField] || 0) - new Date(b[xField] || 0));
        } else if (isXNumeric) {
            processedData.sort((a, b) => parseFloat(a[xField] || 0) - parseFloat(b[xField] || 0));
        } else {
            processedData.sort((a, b) => (a[xField] || '').toString().localeCompare((b[xField] || '').toString()));
        }
        
        // Limit data points for performance and readability
        const maxPoints = chartType === 'line' ? 100 : 50;
        processedData = processedData.slice(0, maxPoints);
        
        if (isYNumeric && xField !== yField) {
            // Numeric Y-axis
            processedData.forEach(row => {
                labels.push(formatAxisValue(row[xField], isXDate));
                chartData.push(parseFloat(row[yField]) || 0);
            });
        } else {
            // Count occurrences for categorical Y-axis
            const groups = {};
            processedData.forEach(row => {
                const key = formatAxisValue(row[xField], isXDate);
                groups[key] = (groups[key] || 0) + 1;
            });
            
            labels = Object.keys(groups);
            chartData = Object.values(groups);
        }
        
        backgroundColors = chartType === 'line' ? 
            ['rgba(102, 126, 234, 0.8)'] : 
            generateColors(chartData.length);
    }
    
    return {
        labels: labels,
        datasets: [{
            label: xField === yField ? `Count of ${formatFieldName(yField)}` : formatFieldName(yField),
            data: chartData,
            backgroundColor: backgroundColors,
            borderColor: chartType === 'line' ? '#667eea' : backgroundColors,
            borderWidth: chartType === 'line' ? 3 : 2,
            tension: chartType === 'line' ? 0.4 : 0,
            fill: chartType === 'line' ? false : true,
            pointBackgroundColor: chartType === 'line' ? '#667eea' : undefined,
            pointBorderColor: chartType === 'line' ? '#ffffff' : undefined,
            pointBorderWidth: chartType === 'line' ? 2 : undefined,
            pointRadius: chartType === 'line' ? 5 : undefined
        }]
    };
}

function formatAxisValue(value, isDate) {
    if (!value) return 'Unknown';
    
    if (isDate) {
        const date = new Date(value);
        return date.toLocaleDateString();
    }
    
    return value.toString();
}

function getSmartChartOptions(chartType, xField, yField, chartData) {
    const fieldAnalysis = analyzeFields(db.getAllRecords(), [xField, yField]);
    const isYNumeric = fieldAnalysis.numeric.includes(yField);
    
    const baseOptions = {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
            legend: {
                position: chartType === 'pie' || chartType === 'doughnut' ? 'right' : 'top',
                labels: {
                    usePointStyle: true,
                    padding: 20
                }
            },
            title: {
                display: true,
                text: xField === yField ? 
                    `Distribution of ${formatFieldName(yField)}` :
                    `${formatFieldName(yField)} by ${formatFieldName(xField)}`,
                font: {
                    size: 16,
                    weight: 'bold'
                },
                padding: 20
            },
            tooltip: {
                mode: 'index',
                intersect: false,
                backgroundColor: 'rgba(0, 0, 0, 0.8)',
                titleColor: 'white',
                bodyColor: 'white',
                borderColor: '#667eea',
                borderWidth: 1,
                cornerRadius: 8,
                displayColors: true,
                callbacks: {
                    label: function(context) {
                        const value = context.parsed.y || context.parsed;
                        if (isYNumeric) {
                            return `${context.dataset.label}: ${value.toLocaleString()}`;
                        } else {
                            return `${context.dataset.label}: ${value} items`;
                        }
                    }
                }
            }
        },
        interaction: {
            mode: 'nearest',
            axis: 'x',
            intersect: false
        },
        animation: {
            duration: 1000,
            easing: 'easeInOutQuart'
        }
    };
    
    if (chartType !== 'pie' && chartType !== 'doughnut') {
        baseOptions.scales = {
            y: {
                beginAtZero: true,
                title: {
                    display: true,
                    text: xField === yField ? 'Count' : formatFieldName(yField),
                    font: {
                        size: 14,
                        weight: 'bold'
                    }
                },
                grid: {
                    color: 'rgba(0, 0, 0, 0.1)'
                },
                ticks: {
                    callback: function(value) {
                        if (isYNumeric) {
                            return value.toLocaleString();
                        }
                        return value;
                    }
                }
            },
            x: {
                title: {
                    display: true,
                    text: formatFieldName(xField),
                    font: {
                        size: 14,
                        weight: 'bold'
                    }
                },
                grid: {
                    color: 'rgba(0, 0, 0, 0.1)'
                },
                ticks: {
                    maxRotation: 45,
                    minRotation: 0
                }
            }
        };
    }
    
    return baseOptions;
}

function displayChartInsights(data, xField, yField, chartData) {
    let insightsContainer = document.getElementById('chartInsights');
    if (!insightsContainer) {
        insightsContainer = document.createElement('div');
        insightsContainer.id = 'chartInsights';
        insightsContainer.className = 'chart-insights';
        
        const chartContainer = document.querySelector('.chart-container');
        chartContainer.parentNode.insertBefore(insightsContainer, chartContainer.nextSibling);
    }
    
    const insights = generateInsights(data, xField, yField, chartData);
    
    insightsContainer.innerHTML = `
        <h4><i class="fas fa-brain"></i> Chart Insights</h4>
        <div class="insights-list">
            ${insights.map(insight => `
                <div class="insight-item">
                    <i class="fas ${insight.icon}"></i>
                    <span>${insight.text}</span>
                </div>
            `).join('')}
        </div>
    `;
}

function generateInsights(data, xField, yField, chartData) {
    const insights = [];
    const values = chartData.datasets[0].data;
    
    if (values.length === 0) return insights;
    
    const sum = values.reduce((a, b) => a + b, 0);
    const avg = sum / values.length;
    const max = Math.max(...values);
    const min = Math.min(...values);
    const maxIndex = values.indexOf(max);
    const minIndex = values.indexOf(min);
    
    // Total insights
    insights.push({
        icon: 'fa-calculator',
        text: `Total records analyzed: ${data.length.toLocaleString()}`
    });
    
    if (xField === yField) {
        // Distribution insights
        insights.push({
            icon: 'fa-chart-pie',
            text: `Most common value: "${chartData.labels[maxIndex]}" (${max} occurrences)`
        });
        
        if (values.length > 1) {
            insights.push({
                icon: 'fa-chart-pie',
                text: `Least common value: "${chartData.labels[minIndex]}" (${min} occurrences)`
            });
        }
    } else {
        // Comparison insights
        const fieldAnalysis = analyzeFields(data, [yField]);
        const isYNumeric = fieldAnalysis.numeric.includes(yField);
        
        if (isYNumeric) {
            insights.push({
                icon: 'fa-arrow-up',
                text: `Highest ${formatFieldName(yField)}: ${max.toLocaleString()} (${chartData.labels[maxIndex]})`
            });
            
            insights.push({
                icon: 'fa-arrow-down',
                text: `Lowest ${formatFieldName(yField)}: ${min.toLocaleString()} (${chartData.labels[minIndex]})`
            });
            
            insights.push({
                icon: 'fa-balance-scale',
                text: `Average ${formatFieldName(yField)}: ${avg.toLocaleString(undefined, {maximumFractionDigits: 2})}`
            });
        }
    }
    
    // Data quality insights
    const missingX = data.filter(row => !row[xField] || row[xField] === '').length;
    const missingY = data.filter(row => !row[yField] || row[yField] === '').length;
    
    if (missingX > 0 || missingY > 0) {
        insights.push({
            icon: 'fa-exclamation-triangle',
            text: `Missing data: ${missingX} records missing ${formatFieldName(xField)}, ${missingY} missing ${formatFieldName(yField)}`
        });
    }
    
    return insights;
}

function generateColors(count) {
    const colors = [
        '#667eea', '#764ba2', '#f093fb', '#f5576c',
        '#4facfe', '#00f2fe', '#43e97b', '#38f9d7',
        '#ffecd2', '#fcb69f', '#a8edea', '#fed6e3'
    ];
    
    const result = [];
    for (let i = 0; i < count; i++) {
        result.push(colors[i % colors.length]);
    }
    return result;
}

// Statistics functions
function loadStatistics() {
    const records = db.getAllRecords();
    displayStatistics(records);
}

function displayStatistics(data) {
    const statsGrid = document.getElementById('statsGrid');
    statsGrid.innerHTML = '';
    
    if (data.length === 0) return;
    
    const headers = getAllHeaders(data);
    
    const stats = [
        { label: 'Total Records', value: data.length },
        { label: 'Total Columns', value: headers.length }
    ];
    
    // Analyze numeric columns
    headers.forEach(header => {
        const numericValues = data
            .map(row => parseFloat(row[header]))
            .filter(val => !isNaN(val));
        
        if (numericValues.length > 0) {
            const sum = numericValues.reduce((a, b) => a + b, 0);
            const avg = sum / numericValues.length;
            const min = Math.min(...numericValues);
            const max = Math.max(...numericValues);
            
            const formattedName = formatFieldName(header);
            
            stats.push(
                { label: `${formattedName} (Avg)`, value: avg.toFixed(2) },
                { label: `${formattedName} (Min)`, value: min },
                { label: `${formattedName} (Max)`, value: max }
            );
        }
    });
    
    stats.forEach(stat => {
        const card = document.createElement('div');
        card.className = 'stat-card';
        card.innerHTML = `
            <div class="stat-value">${stat.value}</div>
            <div class="stat-label">${stat.label}</div>
        `;
        statsGrid.appendChild(card);
    });
}

// Modal functions
function showRecordDetails(recordId) {
    const record = db.getRecord(recordId);
    if (!record) return;
    
    selectedRecordId = recordId;
    const modal = document.getElementById('detailModal');
    const modalBody = document.getElementById('modalBody');
    
    let detailsHTML = '';
    Object.entries(record).forEach(([key, value]) => {
        if (!key.startsWith('_')) {
            detailsHTML += `
                <div class="detail-row">
                    <strong>${formatFieldName(key)}:</strong>
                    <span>${value || '(not provided)'}</span>
                </div>
            `;
        }
    });
    
    modalBody.innerHTML = detailsHTML;
    modal.style.display = 'flex';
}

function closeModal() {
    document.getElementById('detailModal').style.display = 'none';
    selectedRecordId = null;
}

function editRecord() {
    if (!selectedRecordId) return;
    // TODO: Implement edit functionality
    showNotification('Edit functionality coming soon!', 'info');
}

function deleteRecord() {
    if (!selectedRecordId) return;
    
    if (confirm('Are you sure you want to delete this record?')) {
        if (db.deleteRecord(selectedRecordId)) {
            closeModal();
            loadDashboardData();
            showNotification('Record deleted successfully!', 'success');
        } else {
            showNotification('Error deleting record!', 'error');
        }
    }
}

// Update data functions
function openUpdateModal() {
    document.getElementById('updateModal').style.display = 'flex';
}

function closeUpdateModal() {
    document.getElementById('updateModal').style.display = 'none';
    document.getElementById('updateFileList').innerHTML = '';
}

function handleUpdateFiles(event) {
    const files = Array.from(event.target.files);
    processUpdateFiles(files);
}

async function processUpdateFiles(files) {
    const validFiles = files.filter(file => {
        const ext = file.name.toLowerCase();
        return ext.endsWith('.json') || ext.endsWith('.xlsx') || ext.endsWith('.xls');
    });
    
    if (validFiles.length === 0) {
        showNotification('Please select valid JSON or Excel files.', 'error');
        return;
    }
    
    showLoading();
    
    try {
        let totalRecordsProcessed = 0;
        let totalRecordsAdded = 0;
        let totalDuplicatesSkipped = 0;
        const importStats = [];
        
        for (const file of validFiles) {
            console.log(`Processing file: ${file.name}`);
            const startTime = Date.now();
            
            const data = await parseFile(file);
            const processingTime = Date.now() - startTime;
            
            if (data && data.length > 0) {
                // Validate and clean data
                const validatedData = validateAndCleanData(data, file.name);
                
                // Add to database with duplicate checking
                const addResult = db.addRecords(validatedData, file.name);
                
                totalRecordsProcessed += data.length;
                totalRecordsAdded += addResult.importStats.added;
                totalDuplicatesSkipped += addResult.importStats.duplicates;
                
                importStats.push({
                    fileName: file.name,
                    rawRecords: data.length,
                    validRecords: validatedData.length,
                    addedRecords: addResult.importStats.added,
                    duplicatesSkipped: addResult.importStats.duplicates,
                    processingTime,
                    issues: data.length - validatedData.length,
                    duplicateDetails: addResult.importStats.duplicateDetails
                });
                
                console.log(`Import completed for ${file.name}:`);
                console.log(`- Added: ${addResult.importStats.added} records`);
                console.log(`- Duplicates skipped: ${addResult.importStats.duplicates} records`);
            } else {
                importStats.push({
                    fileName: file.name,
                    rawRecords: 0,
                    validRecords: 0,
                    addedRecords: 0,
                    duplicatesSkipped: 0,
                    processingTime,
                    issues: 1,
                    error: 'No data found in file'
                });
            }
        }
        
        closeUpdateModal();
        loadDashboardData();
        
        // Show detailed import results with duplicate information
        showImportResults(importStats, totalRecordsAdded, totalDuplicatesSkipped);
        
    } catch (error) {
        console.error('Error processing files:', error);
        showNotification('Error processing files: ' + error.message, 'error');
    } finally {
        hideLoading();
    }
}

function validateAndCleanData(data, fileName) {
    const validatedData = [];
    const issues = [];
    
    data.forEach((record, index) => {
        if (!record || typeof record !== 'object') {
            issues.push(`Row ${index + 1}: Invalid record format`);
            return;
        }
        
        // Clean empty string fields
        const cleanedRecord = {};
        let hasValidData = false;
        
        Object.entries(record).forEach(([key, value]) => {
            if (key && key.trim() !== '') {
                // Clean the value
                let cleanValue = value;
                
                if (typeof value === 'string') {
                    cleanValue = value.trim();
                    if (cleanValue === '' || cleanValue.toLowerCase() === 'null' || cleanValue.toLowerCase() === 'undefined') {
                        cleanValue = null;
                    }
                }
                
                cleanedRecord[key.trim()] = cleanValue;
                
                if (cleanValue !== null && cleanValue !== undefined && cleanValue !== '') {
                    hasValidData = true;
                }
            }
        });
        
        // Only include records with at least some valid data
        if (hasValidData) {
            validatedData.push(cleanedRecord);
        } else {
            issues.push(`Row ${index + 1}: No valid data found`);
        }
    });
    
    if (issues.length > 0) {
        console.warn(`Data validation issues in ${fileName}:`, issues.slice(0, 10)); // Log first 10 issues
    }
    
    return validatedData;
}

function showImportResults(importStats, totalRecordsAdded, totalDuplicatesSkipped = 0) {
    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.innerHTML = `
        <div class="modal-content import-results-modal">
            <div class="modal-header">
                <h3><i class="fas fa-file-import"></i> Import Results</h3>
                <button class="modal-close" onclick="this.closest('.modal').remove()">
                    <i class="fas fa-times"></i>
                </button>
            </div>
            <div class="modal-body">
                <div class="import-summary">
                    <div class="summary-card success">
                        <i class="fas fa-check-circle"></i>
                        <div>
                            <h4>${totalRecordsAdded}</h4>
                            <span>New Records Added</span>
                        </div>
                    </div>
                    <div class="summary-card info">
                        <i class="fas fa-file"></i>
                        <div>
                            <h4>${importStats.length}</h4>
                            <span>Files Processed</span>
                        </div>
                    </div>
                    <div class="summary-card warning">
                        <i class="fas fa-copy"></i>
                        <div>
                            <h4>${totalDuplicatesSkipped}</h4>
                            <span>Duplicates Skipped</span>
                        </div>
                    </div>
                    <div class="summary-card warning">
                        <i class="fas fa-exclamation-triangle"></i>
                        <div>
                            <h4>${importStats.reduce((sum, stat) => sum + (stat.issues || 0), 0)}</h4>
                            <span>Data Issues</span>
                        </div>
                    </div>
                </div>
                
                <div class="import-details">
                    <h4>File Details</h4>
                    <div class="file-results">
                        ${importStats.map(stat => `
                            <div class="file-result ${stat.error ? 'error' : 'success'}">
                                <div class="file-result-header">
                                    <i class="fas ${stat.error ? 'fa-times-circle' : 'fa-check-circle'}"></i>
                                    <span class="file-name">${stat.fileName}</span>
                                    <span class="processing-time">${stat.processingTime}ms</span>
                                </div>
                                <div class="file-result-details">
                                    ${stat.error ? 
                                        `<span class="error-message">${stat.error}</span>` :
                                        `
                                        <span>📊 ${stat.rawRecords} total records in file</span>
                                        <span>✅ ${stat.addedRecords || stat.validRecords} new records added</span>
                                        ${(stat.duplicatesSkipped || 0) > 0 ? 
                                            `<span>🔄 ${stat.duplicatesSkipped} duplicates skipped</span>` : ''}
                                        ${(stat.issues || 0) > 0 ? 
                                            `<span>⚠️ ${stat.issues} invalid records skipped</span>` : ''}
                                        `
                                    }
                                </div>
                                ${stat.duplicateDetails && stat.duplicateDetails.length > 0 ? `
                                    <div class="duplicate-info">
                                        <details>
                                            <summary>View Duplicate Details (${stat.duplicateDetails.length})</summary>
                                            <div class="duplicate-list">
                                                ${stat.duplicateDetails.slice(0, 5).map(dup => `
                                                    <div class="duplicate-item">
                                                        <small>Record matched existing data from: <strong>${dup.existingSource || 'Unknown'}</strong></small>
                                                    </div>
                                                `).join('')}
                                                ${stat.duplicateDetails.length > 5 ? 
                                                    `<div class="duplicate-item"><small>... and ${stat.duplicateDetails.length - 5} more</small></div>` : ''}
                                            </div>
                                        </details>
                                    </div>
                                ` : ''}
                            </div>
                        `).join('')}
                    </div>
                </div>
                
                ${totalDuplicatesSkipped > 0 ? `
                    <div class="duplicate-summary">
                        <div class="info-box">
                            <i class="fas fa-info-circle"></i>
                            <div>
                                <strong>Duplicate Detection Active</strong>
                                <p>ParseFlow automatically detects and skips identical records to prevent data duplication. 
                                ${totalDuplicatesSkipped} duplicate records were found and skipped during this import.</p>
                            </div>
                        </div>
                    </div>
                ` : ''}
            </div>
            <div class="modal-footer">
                <button onclick="this.closest('.modal').remove()" class="close-btn">Close</button>
            </div>
        </div>
    `;
    
    document.body.appendChild(modal);
    modal.style.display = 'flex';
    
    // Auto-close successful imports after 5 seconds
    if (totalRecordsAdded > 0 && importStats.every(stat => !stat.error)) {
        setTimeout(() => {
            if (modal.parentElement) {
                modal.remove();
            }
        }, 5000);
    }
}

async function parseFile(file) {
    const ext = file.name.toLowerCase();
    
    if (ext.endsWith('.json')) {
        return parseJSONFile(file);
    } else if (ext.endsWith('.xlsx') || ext.endsWith('.xls')) {
        return parseExcelFile(file);
    }
    
    return [];
}

function parseJSONFile(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = function(e) {
            try {
                const jsonData = JSON.parse(e.target.result);
                let data = [];
                
                console.log('JSON file structure:', jsonData);
                
                if (Array.isArray(jsonData)) {
                    // Direct array of objects
                    data = jsonData;
                } else if (typeof jsonData === 'object' && jsonData !== null) {
                    // Object containing data - search for arrays
                    const keys = Object.keys(jsonData);
                    
                    // Look for arrays in the object
                    const arrayKeys = keys.filter(key => Array.isArray(jsonData[key]));
                    
                    if (arrayKeys.length > 0) {
                        // Use the largest array
                        const largestArrayKey = arrayKeys.reduce((prev, curr) => 
                            jsonData[curr].length > jsonData[prev].length ? curr : prev
                        );
                        data = jsonData[largestArrayKey];
                        console.log(`Using array from key "${largestArrayKey}" with ${data.length} records`);
                    } else {
                        // Look for nested objects that might contain arrays
                        let foundData = false;
                        for (const key of keys) {
                            if (typeof jsonData[key] === 'object' && jsonData[key] !== null) {
                                const nestedKeys = Object.keys(jsonData[key]);
                                const nestedArrayKeys = nestedKeys.filter(nKey => Array.isArray(jsonData[key][nKey]));
                                
                                if (nestedArrayKeys.length > 0) {
                                    const largestNestedKey = nestedArrayKeys.reduce((prev, curr) => 
                                        jsonData[key][curr].length > jsonData[key][prev].length ? curr : prev
                                    );
                                    data = jsonData[key][largestNestedKey];
                                    console.log(`Using nested array from "${key}.${largestNestedKey}" with ${data.length} records`);
                                    foundData = true;
                                    break;
                                }
                            }
                        }
                        
                        if (!foundData) {
                            // Convert single object to array
                            data = [jsonData];
                            console.log('Converting single object to array');
                        }
                    }
                }
                
                // Ensure all data items are objects
                data = data.filter(item => typeof item === 'object' && item !== null);
                
                console.log(`Successfully parsed ${data.length} records from JSON file`);
                resolve(data);
                
            } catch (error) {
                console.error('JSON parsing error:', error);
                reject(new Error('Invalid JSON format: ' + error.message));
            }
        };
        reader.onerror = () => reject(new Error('Error reading file'));
        reader.readAsText(file, 'utf-8'); // Explicitly specify UTF-8 encoding
    });
}

function parseExcelFile(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = function(e) {
            try {
                const arrayBuffer = new Uint8Array(e.target.result);
                const workbook = XLSX.read(arrayBuffer, { 
                    type: 'array',
                    cellDates: true,
                    cellNF: false,
                    cellText: false
                });
                
                console.log('Excel workbook sheets:', workbook.SheetNames);
                
                let allData = [];
                
                // Process all sheets, not just the first one
                workbook.SheetNames.forEach((sheetName, index) => {
                    const worksheet = workbook.Sheets[sheetName];
                    
                    // Convert to JSON with various options to capture all data
                    const jsonData = XLSX.utils.sheet_to_json(worksheet, { 
                        header: 1,
                        defval: '', // Default value for empty cells
                        blankrows: false, // Skip completely blank rows
                        raw: false // Convert to strings for consistency
                    });
                    
                    console.log(`Sheet "${sheetName}" has ${jsonData.length} rows`);
                    
                    if (jsonData.length === 0) return;
                    
                    // Find the header row (first non-empty row)
                    let headerRowIndex = 0;
                    while (headerRowIndex < jsonData.length && 
                           (!jsonData[headerRowIndex] || jsonData[headerRowIndex].every(cell => !cell))) {
                        headerRowIndex++;
                    }
                    
                    if (headerRowIndex >= jsonData.length) return;
                    
                    const headers = jsonData[headerRowIndex].map((header, i) => 
                        header || `Column_${i + 1}`
                    );
                    
                    const dataRows = jsonData.slice(headerRowIndex + 1);
                    
                    // Convert to object array
                    const sheetData = dataRows
                        .filter(row => row && row.some(cell => cell !== null && cell !== undefined && cell !== ''))
                        .map((row, rowIndex) => {
                            const obj = {};
                            headers.forEach((header, colIndex) => {
                                const value = row[colIndex];
                                obj[header] = value !== null && value !== undefined ? value : '';
                            });
                            
                            // Add sheet metadata if multiple sheets
                            if (workbook.SheetNames.length > 1) {
                                obj._sheet = sheetName;
                                obj._sheetIndex = index;
                            }
                            
                            return obj;
                        });
                    
                    console.log(`Processed ${sheetData.length} data rows from sheet "${sheetName}"`);
                    allData = allData.concat(sheetData);
                });
                
                console.log(`Total Excel records processed: ${allData.length}`);
                resolve(allData);
                
            } catch (error) {
                console.error('Excel parsing error:', error);
                reject(new Error('Error parsing Excel file: ' + error.message));
            }
        };
        reader.onerror = () => reject(new Error('Error reading Excel file'));
        reader.readAsArrayBuffer(file);
    });
}

// View switching
function switchView(event) {
    const viewType = event.target.dataset.view;
    
    document.querySelectorAll('.view-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    event.target.classList.add('active');
    
    document.querySelectorAll('.data-view').forEach(view => {
        view.style.display = 'none';
    });
    
    const targetView = document.getElementById(viewType + 'View');
    if (targetView) {
        targetView.style.display = 'block';
        
        if (viewType === 'json') {
            displayJSON();
        }
    }
}

function displayJSON() {
    const records = db.getAllRecords();
    const jsonDisplay = document.getElementById('jsonDisplay');
    jsonDisplay.textContent = JSON.stringify(records, null, 2);
}

// Export functions
function exportAllData() {
    const records = db.getAllRecords();
    if (records.length === 0) {
        showNotification('No data to export!', 'warning');
        return;
    }
    
    const jsonContent = JSON.stringify(records, null, 2);
    downloadFile('parseflow_export.json', jsonContent, 'application/json');
    showNotification('Data exported successfully!', 'success');
}

function clearAllData() {
    if (confirm('Are you sure you want to clear all data? This action cannot be undone.')) {
        if (db.clearAll()) {
            loadDashboardData();
            showNotification('All data cleared successfully!', 'success');
        } else {
            showNotification('Error clearing data!', 'error');
        }
    }
}

// Utility functions
function downloadFile(filename, content, mimeType) {
    const blob = new Blob([content], { type: mimeType });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
}

function showLoading() {
    document.getElementById('loading').style.display = 'flex';
}

function hideLoading() {
    document.getElementById('loading').style.display = 'none';
}

function showNotification(message, type = 'info') {
    // Create notification element
    const notification = document.createElement('div');
    notification.className = `notification notification-${type}`;
    notification.innerHTML = `
        <i class="fas fa-${getNotificationIcon(type)}"></i>
        <span>${message}</span>
        <button onclick="this.parentElement.remove()">
            <i class="fas fa-times"></i>
        </button>
    `;
    
    // Add styles if not already added
    if (!document.querySelector('#notification-styles')) {
        const styles = document.createElement('style');
        styles.id = 'notification-styles';
        styles.textContent = `
            .notification {
                position: fixed;
                top: 20px;
                right: 20px;
                background: white;
                padding: 1rem 1.5rem;
                border-radius: 10px;
                box-shadow: 0 4px 20px rgba(0,0,0,0.15);
                display: flex;
                align-items: center;
                gap: 0.5rem;
                z-index: 5000;
                animation: slideIn 0.3s ease-out;
                max-width: 400px;
            }
            .notification-success { border-left: 4px solid #28a745; }
            .notification-error { border-left: 4px solid #dc3545; }
            .notification-warning { border-left: 4px solid #ffc107; }
            .notification-info { border-left: 4px solid #17a2b8; }
            .notification button {
                background: none;
                border: none;
                cursor: pointer;
                color: #999;
                margin-left: auto;
            }
            @keyframes slideIn {
                from { transform: translateX(100%); opacity: 0; }
                to { transform: translateX(0); opacity: 1; }
            }
        `;
        document.head.appendChild(styles);
    }
    
    document.body.appendChild(notification);
    
    // Auto remove after 5 seconds
    setTimeout(() => {
        if (notification.parentElement) {
            notification.remove();
        }
    }, 5000);
}

function getNotificationIcon(type) {
    const icons = {
        success: 'check-circle',
        error: 'exclamation-circle',
        warning: 'exclamation-triangle',
        info: 'info-circle'
    };
    return icons[type] || 'info-circle';
}

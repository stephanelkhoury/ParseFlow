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
        // Add unique IDs and metadata to new records
        const timestamp = new Date().toISOString();
        const recordsWithMeta = newRecords.map((record, index) => ({
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
            timestamp
        });

        return this.saveData();
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

// Chart functions
function loadChartControls() {
    const records = db.getAllRecords();
    updateChartControls(records);
}

function updateChartControls(data) {
    const xAxis = document.getElementById('xAxis');
    const yAxis = document.getElementById('yAxis');
    
    xAxis.innerHTML = '<option value="">Select X-Axis</option>';
    yAxis.innerHTML = '<option value="">Select Y-Axis</option>';
    
    if (data.length === 0) return;
    
    const headers = getAllHeaders(data);
    
    headers.forEach(header => {
        const formattedName = formatFieldName(header);
        
        const optionX = document.createElement('option');
        optionX.value = header;
        optionX.textContent = formattedName;
        xAxis.appendChild(optionX);
        
        const optionY = document.createElement('option');
        optionY.value = header;
        optionY.textContent = formattedName;
        yAxis.appendChild(optionY);
    });
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
    
    // Prepare data
    const labels = [];
    const chartData = [];
    
    if (chartType === 'pie' || chartType === 'doughnut') {
        const groups = {};
        data.forEach(row => {
            const key = row[xAxis] || 'Unknown';
            const value = parseFloat(row[yAxis]) || 0;
            groups[key] = (groups[key] || 0) + value;
        });
        
        Object.entries(groups).forEach(([key, value]) => {
            labels.push(key);
            chartData.push(value);
        });
    } else {
        const limitedData = data.slice(0, 50);
        limitedData.forEach(row => {
            labels.push(row[xAxis] || 'Unknown');
            chartData.push(parseFloat(row[yAxis]) || 0);
        });
    }
    
    const config = {
        type: chartType,
        data: {
            labels: labels,
            datasets: [{
                label: formatFieldName(yAxis),
                data: chartData,
                backgroundColor: generateColors(chartData.length),
                borderColor: '#667eea',
                borderWidth: 2,
                tension: 0.4
            }]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: chartType === 'pie' || chartType === 'doughnut' ? 'right' : 'top'
                },
                title: {
                    display: true,
                    text: `${formatFieldName(yAxis)} by ${formatFieldName(xAxis)}`
                }
            },
            scales: chartType === 'pie' || chartType === 'doughnut' ? {} : {
                y: {
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: formatFieldName(yAxis)
                    }
                },
                x: {
                    title: {
                        display: true,
                        text: formatFieldName(xAxis)
                    }
                }
            }
        }
    };
    
    currentChart = new Chart(ctx, config);
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
        for (const file of validFiles) {
            const data = await parseFile(file);
            if (data && data.length > 0) {
                db.addRecords(data, file.name);
            }
        }
        
        closeUpdateModal();
        loadDashboardData();
        showNotification(`Successfully added ${validFiles.length} file(s) to database!`, 'success');
    } catch (error) {
        console.error('Error processing files:', error);
        showNotification('Error processing files: ' + error.message, 'error');
    } finally {
        hideLoading();
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
                
                if (Array.isArray(jsonData)) {
                    data = jsonData;
                } else if (typeof jsonData === 'object') {
                    const keys = Object.keys(jsonData);
                    const arrayKey = keys.find(key => Array.isArray(jsonData[key]));
                    
                    if (arrayKey) {
                        data = jsonData[arrayKey];
                    } else {
                        data = [jsonData];
                    }
                }
                
                resolve(data);
            } catch (error) {
                reject(new Error('Invalid JSON format'));
            }
        };
        reader.onerror = () => reject(new Error('Error reading file'));
        reader.readAsText(file);
    });
}

function parseExcelFile(file) {
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = function(e) {
            try {
                const arrayBuffer = new Uint8Array(e.target.result);
                const workbook = XLSX.read(arrayBuffer, { type: 'array' });
                
                const worksheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[worksheetName];
                
                const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
                
                if (jsonData.length === 0) {
                    resolve([]);
                    return;
                }
                
                const headers = jsonData[0];
                const rows = jsonData.slice(1);
                
                const parsedData = rows.map(row => {
                    const obj = {};
                    headers.forEach((header, index) => {
                        obj[header] = row[index] || '';
                    });
                    return obj;
                });
                
                resolve(parsedData);
            } catch (error) {
                reject(new Error('Error parsing Excel file'));
            }
        };
        reader.onerror = () => reject(new Error('Error reading file'));
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

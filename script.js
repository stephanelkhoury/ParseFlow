// Global variables
let currentData = [];
let currentChart = null;
let uploadedFiles = [];

// DOM elements
const fileInput = document.getElementById('fileInput');
const uploadArea = document.getElementById('uploadArea');
const fileList = document.getElementById('fileList');
const dataSection = document.getElementById('data-view');
const statsSection = document.getElementById('statistics-view');
const loading = document.getElementById('loading');

// Initialize the application
document.addEventListener('DOMContentLoaded', function() {
    initializeEventListeners();
});

function initializeEventListeners() {
    // File input change
    fileInput.addEventListener('change', handleFileSelect);
    
    // Drag and drop
    uploadArea.addEventListener('dragover', handleDragOver);
    uploadArea.addEventListener('dragleave', handleDragLeave);
    uploadArea.addEventListener('drop', handleDrop);
    
    // View controls
    document.querySelectorAll('.view-btn').forEach(btn => {
        btn.addEventListener('click', switchView);
    });
    
    // Chart controls
    document.getElementById('chartType').addEventListener('change', updateChart);
    document.getElementById('xAxis').addEventListener('change', updateChart);
    document.getElementById('yAxis').addEventListener('change', updateChart);
}

// File handling functions
function handleFileSelect(event) {
    const files = Array.from(event.target.files);
    processFiles(files);
}

function handleDragOver(event) {
    event.preventDefault();
    uploadArea.classList.add('drag-over');
}

function handleDragLeave(event) {
    event.preventDefault();
    uploadArea.classList.remove('drag-over');
}

function handleDrop(event) {
    event.preventDefault();
    uploadArea.classList.remove('drag-over');
    const files = Array.from(event.dataTransfer.files);
    processFiles(files);
}

function processFiles(files) {
    showLoading();
    
    // Filter valid files
    const validFiles = files.filter(file => {
        const ext = file.name.toLowerCase();
        return ext.endsWith('.json') || ext.endsWith('.xlsx') || ext.endsWith('.xls');
    });
    
    if (validFiles.length === 0) {
        hideLoading();
        alert('Please select valid JSON or Excel files.');
        return;
    }
    
    // Add files to list
    validFiles.forEach(file => {
        if (!uploadedFiles.find(f => f.name === file.name)) {
            uploadedFiles.push(file);
            addFileToList(file);
        }
    });
    
    // Process the first file or merge data if multiple
    if (validFiles.length === 1) {
        parseFile(validFiles[0]);
    } else {
        parseMultipleFiles(validFiles);
    }
}

function addFileToList(file) {
    const fileItem = document.createElement('div');
    fileItem.className = 'file-item';
    fileItem.innerHTML = `
        <i class="fas ${getFileIcon(file.name)}"></i>
        <div class="file-info">
            <div class="file-name">${file.name}</div>
            <div class="file-size">${formatFileSize(file.size)}</div>
        </div>
        <button class="file-remove" onclick="removeFile('${file.name}')">
            <i class="fas fa-times"></i>
        </button>
    `;
    fileList.appendChild(fileItem);
}

function getFileIcon(filename) {
    const ext = filename.toLowerCase();
    if (ext.endsWith('.json')) return 'fa-file-code';
    if (ext.endsWith('.xlsx') || ext.endsWith('.xls')) return 'fa-file-excel';
    return 'fa-file';
}

function formatFileSize(bytes) {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function removeFile(filename) {
    uploadedFiles = uploadedFiles.filter(f => f.name !== filename);
    updateFileList();
    
    if (uploadedFiles.length === 0) {
        currentData = [];
        hideDataSection();
    } else {
        parseMultipleFiles(uploadedFiles);
    }
}

function updateFileList() {
    fileList.innerHTML = '';
    uploadedFiles.forEach(file => addFileToList(file));
}

// File parsing functions
async function parseFile(file) {
    try {
        const ext = file.name.toLowerCase();
        let data = [];
        
        if (ext.endsWith('.json')) {
            data = await parseJSONFile(file);
        } else if (ext.endsWith('.xlsx') || ext.endsWith('.xls')) {
            data = await parseExcelFile(file);
        }
        
        currentData = data;
        
        // Save data to session storage and redirect to dashboard
        sessionStorage.setItem('uploadedData', JSON.stringify(data));
        sessionStorage.setItem('uploadedFileName', file.name);
        
        // Update loading text and redirect
        document.getElementById('loadingText').textContent = 'Redirecting to dashboard...';
        setTimeout(() => {
            window.location.href = 'dashboard.html';
        }, 1000);
        
    } catch (error) {
        console.error('Error parsing file:', error);
        alert('Error parsing file: ' + error.message);
        hideLoading();
    }
}

async function parseMultipleFiles(files) {
    try {
        let allData = [];
        
        for (const file of files) {
            const ext = file.name.toLowerCase();
            let data = [];
            
            if (ext.endsWith('.json')) {
                data = await parseJSONFile(file);
            } else if (ext.endsWith('.xlsx') || ext.endsWith('.xls')) {
                data = await parseExcelFile(file);
            }
            
            // Add source file information
            data = data.map(row => ({
                ...row,
                _source: file.name
            }));
            
            allData = allData.concat(data);
        }
        
        currentData = allData;
        
        // Save data to session storage and redirect to dashboard
        sessionStorage.setItem('uploadedData', JSON.stringify(allData));
        sessionStorage.setItem('uploadedFileName', 'multiple_files.json');
        
        // Update loading text and redirect
        document.getElementById('loadingText').textContent = 'Redirecting to dashboard...';
        setTimeout(() => {
            window.location.href = 'dashboard.html';
        }, 1000);
        
    } catch (error) {
        console.error('Error parsing files:', error);
        alert('Error parsing files: ' + error.message);
        hideLoading();
    }
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
                    // If it's an object, try to find arrays within it
                    const keys = Object.keys(jsonData);
                    const arrayKey = keys.find(key => Array.isArray(jsonData[key]));
                    
                    if (arrayKey) {
                        data = jsonData[arrayKey];
                    } else {
                        // Convert single object to array
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
                
                // Get the first worksheet
                const worksheetName = workbook.SheetNames[0];
                const worksheet = workbook.Sheets[worksheetName];
                
                // Convert to JSON
                const jsonData = XLSX.utils.sheet_to_json(worksheet, { header: 1 });
                
                if (jsonData.length === 0) {
                    resolve([]);
                    return;
                }
                
                // Convert to object array using first row as headers
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

// Utility function to format field names (replace underscores with spaces)
function formatFieldName(fieldName) {
    return fieldName.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
}

// Utility function to get all unique headers from all records
function getAllHeaders(data) {
    const headerSet = new Set();
    data.forEach(row => {
        Object.keys(row).forEach(key => headerSet.add(key));
    });
    return Array.from(headerSet);
}

// Data display functions
function displayData() {
    if (currentData.length === 0) {
        hideDataSection();
        return;
    }
    
    showDataSection();
    displayTable();
    updateChartControls();
    displayStatistics();
}

function displayTable() {
    const tableHead = document.getElementById('tableHead');
    const tableBody = document.getElementById('tableBody');
    const recordCount = document.getElementById('recordCount');
    const columnCount = document.getElementById('columnCount');
    
    // Clear existing content
    tableHead.innerHTML = '';
    tableBody.innerHTML = '';
    
    if (currentData.length === 0) return;
    
    // Get all unique headers from all records (handles missing fields)
    const headers = getAllHeaders(currentData);
    
    // Create header row with formatted names
    const headerRow = document.createElement('tr');
    headers.forEach(header => {
        const th = document.createElement('th');
        th.textContent = formatFieldName(header);
        th.setAttribute('data-field', header); // Keep original field name as data attribute
        headerRow.appendChild(th);
    });
    tableHead.appendChild(headerRow);
    
    // Create data rows (limit to 1000 for performance)
    const displayData = currentData.slice(0, 1000);
    displayData.forEach(row => {
        const tr = document.createElement('tr');
        headers.forEach(header => {
            const td = document.createElement('td');
            const value = row[header];
            // Handle missing fields gracefully
            td.textContent = value !== null && value !== undefined ? value : '';
            // Add a class if field is missing to style differently
            if (value === null || value === undefined) {
                td.classList.add('missing-field');
            }
            tr.appendChild(td);
        });
        tableBody.appendChild(tr);
    });
    
    // Update info
    recordCount.textContent = `${currentData.length} records${currentData.length > 1000 ? ' (showing first 1000)' : ''}`;
    columnCount.textContent = `${headers.length} columns`;
}

function updateChartControls() {
    const xAxis = document.getElementById('xAxis');
    const yAxis = document.getElementById('yAxis');
    
    // Clear existing options
    xAxis.innerHTML = '<option value="">Select X-Axis</option>';
    yAxis.innerHTML = '<option value="">Select Y-Axis</option>';
    
    if (currentData.length === 0) return;
    
    // Get all unique headers from all records
    const headers = getAllHeaders(currentData);
    
    // Populate dropdowns with formatted names
    headers.forEach(header => {
        const formattedName = formatFieldName(header);
        
        const optionX = document.createElement('option');
        optionX.value = header; // Keep original field name as value
        optionX.textContent = formattedName; // Show formatted name
        xAxis.appendChild(optionX);
        
        const optionY = document.createElement('option');
        optionY.value = header; // Keep original field name as value
        optionY.textContent = formattedName; // Show formatted name
        yAxis.appendChild(optionY);
    });
}

function displayStatistics() {
    const statsGrid = document.getElementById('statsGrid');
    statsGrid.innerHTML = '';
    
    if (currentData.length === 0) return;
    
    // Get all unique headers from all records
    const headers = getAllHeaders(currentData);
    
    // Basic statistics
    const stats = [
        { label: 'Total Records', value: currentData.length },
        { label: 'Total Columns', value: headers.length }
    ];
    
    // Analyze numeric columns
    headers.forEach(header => {
        const numericValues = currentData
            .map(row => parseFloat(row[header]))
            .filter(val => !isNaN(val));
        
        if (numericValues.length > 0) {
            const sum = numericValues.reduce((a, b) => a + b, 0);
            const avg = sum / numericValues.length;
            const min = Math.min(...numericValues);
            const max = Math.max(...numericValues);
            
            // Use formatted field names in statistics
            const formattedName = formatFieldName(header);
            
            stats.push(
                { label: `${formattedName} (Avg)`, value: avg.toFixed(2) },
                { label: `${formattedName} (Min)`, value: min },
                { label: `${formattedName} (Max)`, value: max }
            );
        }
    });
    
    // Create stat cards
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

// Chart functions
function updateChart() {
    const chartType = document.getElementById('chartType').value;
    const xAxis = document.getElementById('xAxis').value;
    const yAxis = document.getElementById('yAxis').value;
    
    if (!xAxis || !yAxis || currentData.length === 0) {
        return;
    }
    
    const ctx = document.getElementById('dataChart').getContext('2d');
    
    // Destroy existing chart
    if (currentChart) {
        currentChart.destroy();
    }
    
    // Prepare data
    const labels = [];
    const data = [];
    
    if (chartType === 'pie' || chartType === 'doughnut') {
        // For pie charts, group by x-axis values
        const groups = {};
        currentData.forEach(row => {
            const key = row[xAxis];
            const value = parseFloat(row[yAxis]) || 0;
            groups[key] = (groups[key] || 0) + value;
        });
        
        Object.entries(groups).forEach(([key, value]) => {
            labels.push(key);
            data.push(value);
        });
    } else {
        // For other charts, use data directly (limit to 50 points for readability)
        const limitedData = currentData.slice(0, 50);
        limitedData.forEach(row => {
            labels.push(row[xAxis]);
            data.push(parseFloat(row[yAxis]) || 0);
        });
    }
    
    // Chart configuration
    const config = {
        type: chartType,
        data: {
            labels: labels,
            datasets: [{
                label: formatFieldName(yAxis),
                data: data,
                backgroundColor: generateColors(data.length),
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

// View switching
function switchView(event) {
    const viewType = event.target.dataset.view;
    
    // Update button states
    document.querySelectorAll('.view-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    event.target.classList.add('active');
    
    // Hide all views
    document.querySelectorAll('.data-view').forEach(view => {
        view.style.display = 'none';
    });
    
    // Show selected view
    const targetView = document.getElementById(viewType + 'View');
    if (targetView) {
        targetView.style.display = 'block';
        
        if (viewType === 'json') {
            displayJSON();
        } else if (viewType === 'chart') {
            updateChart();
        }
    }
}

function displayJSON() {
    const jsonDisplay = document.getElementById('jsonDisplay');
    jsonDisplay.textContent = JSON.stringify(currentData, null, 2);
}

// Utility functions
function showLoading() {
    loading.style.display = 'flex';
}

function hideLoading() {
    loading.style.display = 'none';
}

function showDataSection() {
    // Switch to data view automatically when data is loaded
    const navItems = document.querySelectorAll('.nav-item');
    const viewSections = document.querySelectorAll('.view-section');
    
    // Remove active class from all nav items
    navItems.forEach(nav => nav.classList.remove('active'));
    
    // Add active class to data nav item
    const dataNavItem = document.querySelector('.nav-item[data-view="data"]');
    if (dataNavItem) {
        dataNavItem.classList.add('active');
    }
    
    // Hide all view sections
    viewSections.forEach(section => {
        section.style.display = 'none';
        section.classList.remove('active');
    });
    
    // Show data view section
    if (dataSection) {
        dataSection.style.display = 'block';
        dataSection.classList.add('active');
    }
}

function hideDataSection() {
    if (dataSection) {
        dataSection.style.display = 'none';
    }
    if (statsSection) {
        statsSection.style.display = 'none';
    }
}

// Export functions
function exportToCSV() {
    if (currentData.length === 0) return;
    
    // Get all unique headers from all records
    const headers = getAllHeaders(currentData);
    const formattedHeaders = headers.map(header => formatFieldName(header));
    
    const csvContent = [
        formattedHeaders.join(','),
        ...currentData.map(row => 
            headers.map(header => 
                JSON.stringify(row[header] || '')
            ).join(',')
        )
    ].join('\n');
    
    downloadFile('data.csv', csvContent, 'text/csv');
}

function exportToJSON() {
    if (currentData.length === 0) return;
    
    const jsonContent = JSON.stringify(currentData, null, 2);
    downloadFile('data.json', jsonContent, 'application/json');
}

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

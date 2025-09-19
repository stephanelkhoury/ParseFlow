// MVC Application Initializer
document.addEventListener('DOMContentLoaded', function() {
    // Initialize view switching
    const navItems = document.querySelectorAll('.nav-item');
    const viewSections = document.querySelectorAll('.view-section');
    
    // Set initial view
    showView('dashboard');
    
    // Add click handlers for navigation
    navItems.forEach(item => {
        item.addEventListener('click', function() {
            const viewName = this.getAttribute('data-view');
            if (viewName) {
                showView(viewName);
                setActiveNav(this);
            }
        });
    });
    
    function showView(viewName) {
        // Hide all views
        viewSections.forEach(section => {
            section.style.display = 'none';
            section.classList.remove('active');
        });
        
        // Show target view
        const targetView = document.getElementById(viewName + '-view');
        if (targetView) {
            targetView.style.display = 'block';
            targetView.classList.add('active');
        }
    }
    
    function setActiveNav(activeItem) {
        // Remove active class from all nav items
        navItems.forEach(item => {
            item.classList.remove('active');
        });
        
        // Add active class to clicked item
        activeItem.classList.add('active');
    }
    
    // Initialize notification container
    if (!document.getElementById('notification-container')) {
        const notificationContainer = document.createElement('div');
        notificationContainer.id = 'notification-container';
        document.body.appendChild(notificationContainer);
    }
    
    // Add global loader
    if (!document.getElementById('global-loader')) {
        const loader = document.createElement('div');
        loader.id = 'global-loader';
        loader.className = 'global-loader';
        loader.style.display = 'none';
        loader.innerHTML = `
            <div class="loader-content">
                <div class="loader-spinner"></div>
                <div class="loader-message">Loading...</div>
            </div>
        `;
        document.body.appendChild(loader);
    }
    
    // File upload drag and drop functionality
    const uploadAreas = document.querySelectorAll('.upload-area, .upload-zone');
    uploadAreas.forEach(area => {
        area.addEventListener('dragover', function(e) {
            e.preventDefault();
            this.classList.add('drag-over');
        });
        
        area.addEventListener('dragleave', function(e) {
            e.preventDefault();
            this.classList.remove('drag-over');
        });
        
        area.addEventListener('drop', function(e) {
            e.preventDefault();
            this.classList.remove('drag-over');
            
            const files = e.dataTransfer.files;
            if (files.length > 0) {
                // Trigger file input change event or custom handler
                console.log('Files dropped:', files);
                // You can dispatch a custom event here for the MVC app to handle
                const event = new CustomEvent('filesDropped', { detail: { files: files } });
                document.dispatchEvent(event);
            }
        });
    });
    
    // Initialize MVC Application when ready
    if (window.ParseFlowApp && typeof window.ParseFlowApp.initialize === 'function') {
        window.ParseFlowApp.initialize();
    } else {
        // Wait for ParseFlowApp to load
        const checkForApp = setInterval(() => {
            if (window.ParseFlowApp && typeof window.ParseFlowApp.initialize === 'function') {
                clearInterval(checkForApp);
                window.ParseFlowApp.initialize();
            }
        }, 100);
    }
});

// Global utility functions for the MVC app
window.MVCUtils = {
    showLoader: function(message = 'Loading...') {
        const loader = document.getElementById('global-loader');
        if (loader) {
            loader.querySelector('.loader-message').textContent = message;
            loader.style.display = 'flex';
        }
    },
    
    hideLoader: function() {
        const loader = document.getElementById('global-loader');
        if (loader) {
            loader.style.display = 'none';
        }
    },
    
    showNotification: function(message, type = 'info', duration = 5000) {
        const container = document.getElementById('notification-container');
        if (!container) return;
        
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        
        const iconMap = {
            success: 'fas fa-check-circle',
            error: 'fas fa-exclamation-triangle',
            warning: 'fas fa-exclamation-circle',
            info: 'fas fa-info-circle'
        };
        
        notification.innerHTML = `
            <div class="notification-content">
                <i class="${iconMap[type] || iconMap.info}"></i>
                <span>${message}</span>
            </div>
            <button class="notification-close" onclick="this.parentElement.remove()">
                <i class="fas fa-times"></i>
            </button>
        `;
        
        container.appendChild(notification);
        
        // Auto remove after duration
        if (duration > 0) {
            setTimeout(() => {
                if (notification.parentElement) {
                    notification.remove();
                }
            }, duration);
        }
    },
    
    formatFileSize: function(bytes) {
        if (bytes === 0) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    },
    
    formatDate: function(date) {
        if (!date) return 'N/A';
        const d = new Date(date);
        return d.toLocaleDateString() + ' ' + d.toLocaleTimeString();
    },
    
    debounce: function(func, wait) {
        let timeout;
        return function executedFunction(...args) {
            const later = () => {
                clearTimeout(timeout);
                func(...args);
            };
            clearTimeout(timeout);
            timeout = setTimeout(later, wait);
        };
    }
};

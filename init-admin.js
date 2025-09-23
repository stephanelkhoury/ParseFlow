// Initialize default admin user
// Run this in browser console or include in HTML to set up the default admin

function initializeDefaultAdmin() {
    // Check if admin already exists
    const approvedUsers = JSON.parse(localStorage.getItem('approvedUsers') || '[]');
    
    // Obfuscated admin credentials
    const adminEmail = atob('bXVsdGlncmFwaGljLmxiQGdtYWlsLmNvbQ==');
    const adminPass = atob('SWxvdmVKZXN1c0AxODAxMDA=');
    
    const adminExists = approvedUsers.some(user => user.email === adminEmail);
    
    if (!adminExists) {
        const defaultAdmin = {
            fullName: 'System Administrator',
            email: adminEmail,
            password: adminPass,
            role: 'admin',
            status: 'approved',
            registeredAt: Date.now(),
            approvedAt: Date.now()
        };
        
        approvedUsers.push(defaultAdmin);
        localStorage.setItem('approvedUsers', JSON.stringify(approvedUsers));
        
        console.log('✅ Default admin user created');
        console.log('Please use the designated admin credentials to access admin features');
    } else {
        console.log('ℹ️ Admin user already exists');
    }
}

// Auto-initialize when script loads
initializeDefaultAdmin();

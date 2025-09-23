# ParseFlow Dashboard - Enhanced Authentication & Card Management System

## Overview
ParseFlow is a comprehensive dashboard application with user authentication, admin panel, and enhanced card management features. The system includes login/registration functionality, admin approval workflow, and advanced card interactions.

## Features

### 🔐 Authentication System
- **User Registration**: New users can register and await admin approval
- **Login System**: Secure login with credential validation
- **Admin Panel**: Complete user management interface
- **Role-based Access**: Admin and regular user roles

### 📊 Dashboard Features
- **Data Visualization**: Charts and analytics
- **Contact Management**: Enhanced contact cards with actions
- **File Upload**: CSV file parsing and data import
- **Multiple Views**: Card view and table view

### 🎯 Enhanced Card Features
- **Done Button**: Mark cards as completed with visual feedback
- **Label System**: Add colored labels with notes to cards
- **Hide Functionality**: Hide cards and manage hidden cards section
- **Restore Feature**: Restore hidden cards back to main view

### 👑 Admin Panel
- **User Management**: Approve/reject pending users
- **User Actions**: Suspend or remove approved users
- **System Settings**: Configure application settings
- **User Overview**: View all registered and approved users

## Setup Instructions

### 1. File Structure
```
ParseFlow/
├── index.html          # Landing page
├── login.html          # User login page
├── register.html       # User registration page
├── dashboard.html      # Main dashboard
├── style.css          # Unified styles
└── init-admin.js      # Admin initialization script
```

### 2. Default Admin Account

The system automatically creates a default admin account:

- **Email**: `multigraphic.lb@gmail.com`
- **Password**: `IloveJesus@180100`
- **Role**: Administrator

⚠️ **Important**: Change the default password after first login!

### 3. Getting Started
1. Open `login.html` in your browser
2. Log in with the default admin credentials
3. Create new users via the registration page
4. Approve new users through the admin panel
5. Start using the enhanced card features

## User Guide

### For Regular Users
1. **Register**: Go to registration page and create an account
2. **Wait for Approval**: Admin must approve your account
3. **Login**: Use approved credentials to access the dashboard
4. **Upload Data**: Use CSV upload to import contact data
5. **Manage Cards**: Use Done/Label/Hide features on contact cards

### For Administrators
1. **Login**: Use admin credentials to access the dashboard
2. **Admin Panel**: Access admin features from the navigation
3. **User Management**: 
   - View pending registrations
   - Approve or reject new users
   - Manage existing users (suspend/remove)
4. **System Settings**: Configure application preferences

## Card Management Features

### Done Button (✓)
- **Click**: Mark card as completed
- **Visual**: Card gets overlay effect and done icon
- **Storage**: Status saved to localStorage
- **Toggle**: Click again to unmark

### Label Button (🏷️)
- **Click**: Opens label modal
- **Colors**: 8 predefined colors available
- **Text**: Add label text (max 50 characters)
- **Notes**: Add additional notes
- **Storage**: Labels saved to localStorage

### Hide Button (🗑️)
- **Click**: Confirms and hides card from main view
- **Animation**: Smooth scale-out transition
- **Storage**: Hidden cards saved to localStorage
- **Recovery**: Hidden cards shown in separate section

### Hidden Cards Section
- **Auto-show**: Appears when cards are hidden
- **Count**: Shows number of hidden cards
- **Restore**: One-click restore to main view
- **Management**: Bulk operations on hidden cards

## Technical Details

### Data Storage
- **LocalStorage**: All user data, card states, and settings
- **JSON Format**: Structured data storage
- **Persistence**: Data survives browser sessions

### Authentication Flow
1. User registers → Stored in `pendingUsers`
2. Admin approves → Moved to `approvedUsers`
3. User logs in → Creates `currentUser` session
4. Dashboard loads → Validates session and role

### Card State Management
- **cardStatuses**: Stores done/completion states
- **cardLabels**: Stores label text, colors, and notes
- **hiddenCards**: Stores hidden card data for restoration

### Responsive Design
- **Mobile-first**: Optimized for all screen sizes
- **Flexible Layout**: Cards adapt to screen width
- **Touch-friendly**: Large buttons and touch targets

## Browser Compatibility
- **Chrome**: Fully supported
- **Firefox**: Fully supported  
- **Safari**: Fully supported
- **Edge**: Fully supported

## Security Notes
- **Client-side**: All authentication is localStorage-based
- **Demo Purpose**: Not suitable for production without server-side authentication
- **Passwords**: Stored in plain text (hash in production)
- **Sessions**: Browser-based session management

## Customization

### Adding New Colors
Edit the color picker in `dashboard.html`:
```html
<div class="color-option" style="background-color: #yourcolor;" onclick="selectColor(this)"></div>
```

### Modifying User Roles
Edit the user approval function to add new roles:
```javascript
user.role = 'custom-role'; // Add custom roles
```

### Styling Changes
All styles are consolidated in `style.css` for easy customization.

## Troubleshooting

### Common Issues
1. **Admin not appearing**: Clear localStorage and reload
2. **Cards not saving state**: Check browser localStorage permissions
3. **Login issues**: Verify credentials and approval status
4. **Missing features**: Ensure JavaScript is enabled

### Reset System
To completely reset the system:
```javascript
localStorage.clear();
location.reload();
```

## Version Information
- **Version**: 2.0.0
- **Last Updated**: 2024
- **Features**: Authentication, Admin Panel, Enhanced Cards
- **CSS**: Unified single file (style.css)

## Support
For issues or questions, check the browser console for error messages and ensure all files are properly linked.

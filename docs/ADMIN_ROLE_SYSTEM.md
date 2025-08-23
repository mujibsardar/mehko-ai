# Admin Role System

## Overview

The Mehko AI project now uses a secure, role-based admin system instead of hardcoded email checks. This provides better security and maintainability.

## How It Works

### 1. Firebase Custom Claims (Recommended)

- **Most Secure**: Admin status is stored in Firebase Auth custom claims
- **Immediate**: Changes take effect after user re-authentication
- **Server-side**: Cannot be modified by client-side code

### 2. Firestore User Document (Fallback)

- **Alternative**: Admin status stored in Firestore user collection
- **Flexible**: Easy to manage and update
- **Client-side**: Checked during authentication

## Setting Up Admin Users

### Option 1: Using the Utility Script (Recommended)

```bash
# Set admin role via custom claims (most secure)
node scripts/set-admin-role.mjs --email=admin@example.com --method=claims

# Set admin role via Firestore document
node scripts/set-admin-role.mjs --email=admin@example.com --method=firestore

# Remove admin role
node scripts/set-admin-role.mjs --email=admin@example.com --remove
```

### Option 2: Manual Firebase Console

#### Custom Claims Method:

1. Go to Firebase Console > Authentication > Users
2. Find the user and click on their UID
3. Go to "Custom claims" tab
4. Add: `{ "admin": true }`
5. Save changes

#### Firestore Method:

1. Go to Firebase Console > Firestore Database
2. Create/update document in `users/{userId}` collection
3. Add field: `role: "admin"`

## Code Changes Made

### Updated Components:

- `src/hooks/useAuth.jsx` - Added admin role checking
- `src/components/layout/Header.jsx` - Added admin dashboard link
- `src/components/auth/ProtectedAdminRoute.jsx` - Uses new role system
- `src/components/admin/Admin.jsx` - Removed hardcoded email check
- `src/components/overlay/Mapper.jsx` - Removed hardcoded email check
- `src/components/overlay/Interview.jsx` - Removed hardcoded email check

### New Features:

- Admin dashboard link appears in header for admin users
- Secure role-based access control
- Fallback authentication methods
- Utility script for managing admin roles

## Security Benefits

1. **No Hardcoded Emails**: Admin access is not tied to specific email addresses
2. **Role-Based Access**: Easy to manage multiple admin users
3. **Firebase Security**: Leverages Firebase's built-in security features
4. **Audit Trail**: Changes to admin roles can be tracked
5. **Flexible**: Easy to add/remove admin privileges

## Migration from Old System

The old hardcoded email check (`avansardar@outlook.com`) has been replaced with the new role system. To migrate:

1. **Set up admin role** for existing admin users using the utility script
2. **Test admin access** to ensure everything works correctly
3. **Remove old hardcoded checks** (already completed in this update)

## Troubleshooting

### Admin Link Not Showing

- Ensure user has admin role set
- Check browser console for authentication errors
- Verify Firebase configuration

### Access Denied Errors

- Confirm admin role is properly set
- Check if using correct authentication method
- Verify user is signed in

### Role Changes Not Taking Effect

- **Custom Claims**: User must sign out and sign back in
- **Firestore**: Changes take effect on next authentication

## Best Practices

1. **Use Custom Claims** for production environments
2. **Regular Audits** of admin user list
3. **Principle of Least Privilege** - only grant admin access when needed
4. **Monitor Access** to admin areas
5. **Backup Admin Users** - ensure multiple users have admin access

## Future Enhancements

- Role hierarchy (super admin, regular admin, etc.)
- Time-based admin access
- Admin action logging
- Bulk admin role management
- Integration with external identity providers

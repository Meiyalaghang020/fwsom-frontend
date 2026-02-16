# Authentication Hooks Documentation

This directory contains reusable authentication hooks for the FWSOM Dashboard.

## Available Hooks

### 1. `useAuthCheck(options)` - Basic Hook
The main authentication hook with customizable options.

```javascript
import { useAuthCheck } from '../hooks/useAuthCheck';

function MyComponent() {
  // Check authentication and role_id (default behavior)
  useAuthCheck();
  
  // Or with custom options
  useAuthCheck({
    checkRoleId: false,        // Don't check role_id
    storeRedirectUrl: true,    // Store current URL for redirect
    redirectPath: '/custom-login' // Custom redirect path
  });
  
  return <div>Protected Content</div>;
}
```

### 2. `useBasicAuthCheck()` - Simple Authentication
Only checks if user is authenticated, ignores role_id.

```javascript
import { useBasicAuthCheck } from '../hooks/useAuthCheck';

function PublicButAuthRequired() {
  useBasicAuthCheck(); // Only checks if user exists
  
  return <div>Content for any authenticated user</div>;
}
```

### 3. `useFullAuthCheck()` - Complete Authentication
Checks both authentication and valid role_id.

```javascript
import { useFullAuthCheck } from '../hooks/useAuthCheck';

function AdminPanel() {
  useFullAuthCheck(); // Checks auth + role_id !== null
  
  return <div>Admin only content</div>;
}
```

### 4. `useServiceHubAuthCheck()` - ServiceHub Specific
Allows role_id null users (for ServiceHub component).

```javascript
import { useServiceHubAuthCheck } from '../hooks/useAuthCheck';

function ServiceHub() {
  useServiceHubAuthCheck(); // Allows role_id null users
  
  return <div>ServiceHub content</div>;
}
```

### 5. `useAdminAuthCheck()` - Admin Pages
Strict authentication for admin pages.

```javascript
import { useAdminAuthCheck } from '../hooks/useAuthCheck';

function Dashboard() {
  useAdminAuthCheck(); // Strict auth + role_id check
  
  return <div>Dashboard content</div>;
}
```

### 6. `withAuthCheck(Component, options)` - Higher-Order Component
Wraps components with authentication check.

```javascript
import { withAuthCheck } from '../hooks/useAuthCheck';

// Wrap your component
const ProtectedComponent = withAuthCheck(MyComponent, {
  checkRoleId: true,
  storeRedirectUrl: true
});

// Use the wrapped component
function App() {
  return <ProtectedComponent />;
}
```

## Hook Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| `checkRoleId` | boolean | `true` | Whether to check if role_id is null |
| `storeRedirectUrl` | boolean | `true` | Store current URL in localStorage for post-login redirect |
| `redirectPath` | string | `'/login'` | Custom path to redirect to |

## Usage Examples

### Dashboard Component (Strict)
```javascript
import { useAdminAuthCheck } from '../hooks/useAuthCheck';

export default function Dashboard() {
  useAdminAuthCheck(); // Redirects to login if not authenticated or role_id is null
  
  // Component logic here...
}
```

### ServiceHub Component (Allows role_id null)
```javascript
import { useServiceHubAuthCheck } from '../hooks/useAuthCheck';

export default function ServiceHub() {
  useServiceHubAuthCheck(); // Only checks authentication, allows role_id null
  
  // Component logic here...
}
```

### Settings Page (Custom Redirect)
```javascript
import { useAuthCheck } from '../hooks/useAuthCheck';

export default function Settings() {
  useAuthCheck({
    redirectPath: '/auth/login' // Custom login path
  });
  
  // Component logic here...
}
```

### Public Page (No role_id check)
```javascript
import { useBasicAuthCheck } from '../hooks/useAuthCheck';

export default function UserProfile() {
  useBasicAuthCheck(); // Only checks if user exists
  
  // Component logic here...
}
```

## How It Works

1. **Check Authentication**: Verifies user data exists in localStorage
2. **Parse User Data**: Safely parses JSON user data
3. **Check Role ID**: (optional) Validates role_id is not null
4. **Store Redirect URL**: (optional) Saves current URL for post-login redirect
5. **Redirect**: Sends user to login page if checks fail

## Security Features

- **Automatic Redirect**: Users are redirected to login if not authenticated
- **URL Preservation**: Current URL is stored for seamless post-login redirect
- **Error Handling**: Invalid user data is automatically cleaned up
- **Role-Based Access**: Different hooks for different access levels

## Migration from Manual Checks

### Before (Manual)
```javascript
useEffect(() => {
  const userData = localStorage.getItem('user');
  if (!userData) {
    const currentUrl = window.location.pathname + window.location.search;
    localStorage.setItem('redirectAfterLogin', currentUrl);
    window.location.href = '/login';
    return;
  }
  
  const parsedUser = JSON.parse(userData);
  if (parsedUser.role_id === null) {
    window.location.href = '/login';
    return;
  }
}, []);
```

### After (Using Hook)
```javascript
import { useAdminAuthCheck } from '../hooks/useAuthCheck';

function MyComponent() {
  useAdminAuthCheck(); // One line replaces all manual checks
  
  // Component logic here...
}
```

## Benefits

- ✅ **DRY Principle**: No repeated authentication code
- ✅ **Consistency**: Same behavior across all components
- ✅ **Maintainability**: Update logic in one place
- ✅ **Type Safety**: Proper error handling and validation
- ✅ **Flexibility**: Multiple hooks for different use cases
- ✅ **Testing**: Easier to test authentication logic

## File Structure

```
src/hooks/
├── useAuthCheck.js    # Main authentication hooks
└── README.md         # This documentation
```

## Adding New Hooks

To add a new authentication hook:

1. Add it to `useAuthCheck.js`
2. Export it with a descriptive name
3. Update this documentation

Example:
```javascript
// In useAuthCheck.js
export const useCustomAuthCheck = () => {
  return useAuthCheck({ 
    checkRoleId: false, 
    redirectPath: '/custom-auth' 
  });
};
```

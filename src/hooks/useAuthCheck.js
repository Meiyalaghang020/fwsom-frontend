import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

/**
 * Custom hook to check user authentication and role_id
 * Redirects to login if user is not authenticated or has role_id === null
 * 
 * @param {Object} options - Configuration options
 * @param {boolean} options.checkRoleId - Whether to check role_id (default: true)
 * @param {boolean} options.storeRedirectUrl - Whether to store current URL for redirect (default: true)
 * @param {string} options.redirectPath - Custom redirect path (default: '/login')
 */
export const useAuthCheck = (options = {}) => {
  const {
    checkRoleId = true,
    storeRedirectUrl = true,
    redirectPath = '/login'
  } = options;

  useEffect(() => {
    // Check if user data exists in localStorage
    const userData = localStorage.getItem('user');
    
    if (!userData) {
      // User is not authenticated
      if (storeRedirectUrl) {
        const currentUrl = window.location.pathname + window.location.search;
        localStorage.setItem('redirectAfterLogin', currentUrl);
      }
      window.location.href = redirectPath;
      return;
    }

    // Parse user data
    let parsedUser;
    try {
      parsedUser = JSON.parse(userData);
    } catch (error) {
      console.error('Failed to parse user data:', error);
      localStorage.removeItem('user');
      if (storeRedirectUrl) {
        const currentUrl = window.location.pathname + window.location.search;
        localStorage.setItem('redirectAfterLogin', currentUrl);
      }
      window.location.href = redirectPath;
      return;
    }

    // Check role_id if required
    if (checkRoleId && parsedUser.role_id === null) {
      // User has null role_id, redirect to login
      if (storeRedirectUrl) {
        const currentUrl = window.location.pathname + window.location.search;
        localStorage.setItem('redirectAfterLogin', currentUrl);
      }
      window.location.href = redirectPath;
      return;
    }

    // User is authenticated and has valid role_id
    // Continue with normal component rendering

  }, [checkRoleId, storeRedirectUrl, redirectPath]);
};

/**
 * Higher-order component (HOC) to wrap components with authentication check
 * 
 * @param {React.Component} Component - Component to wrap
 * @param {Object} options - Authentication options (same as useAuthCheck)
 * @returns {React.Component} Wrapped component with authentication check
 */
export const withAuthCheck = (Component, options = {}) => {
  return function AuthCheckedComponent(props) {
    useAuthCheck(options);
    return <Component {...props} />;
  };
};

/**
 * Specific hooks for different authentication scenarios
 */

// For pages that require authentication but don't care about role_id
export const useBasicAuthCheck = () => {
  return useAuthCheck({ checkRoleId: false });
};

// For pages that require authentication and valid role_id (most common)
export const useFullAuthCheck = () => {
  return useAuthCheck({ checkRoleId: true });
};

// For ServiceHub specifically (doesn't store redirect URL since it handles its own)
export const useServiceHubAuthCheck = () => {
  return useAuthCheck({ 
    checkRoleId: false, // ServiceHub allows role_id null users
    storeRedirectUrl: true 
  });
};

// For Dashboard and other admin pages (strict authentication)
export const useAdminAuthCheck = () => {
  return useAuthCheck({ 
    checkRoleId: true, 
    storeRedirectUrl: true 
  });
};

export default useAuthCheck;

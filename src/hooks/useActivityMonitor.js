import { useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';

export const useActivityMonitor = (timeoutMinutes = 1, enabled = true) => {
  const navigate = useNavigate();
  const timeoutRef = useRef(null);
  const lastActivityRef = useRef(Date.now());
  const clearStorage = useCallback(() => {
    const rememberMe = localStorage.getItem("fws_remember_me");
    
    localStorage.removeItem("access_token");
    localStorage.removeItem("token_type");
    localStorage.removeItem("user");
    localStorage.removeItem("auth");
    sessionStorage.clear();
    
    // Only clear remember me data if it's an explicit logout, not token expiry
    if (!rememberMe) {
      localStorage.removeItem("fws_last_email");
      localStorage.removeItem("fws_remember_me");
    }
  }, []);
  const logout = useCallback(() => {
    clearStorage();
    navigate('/login', { replace: true });
  }, [clearStorage, navigate]);
  const isTokenExpired = useCallback(() => {
    // Check if this is Microsoft auth (bypass expiry check)
    const microsoftAuth = localStorage.getItem("microsoft_auth");
    if (microsoftAuth === "true") {
      console.log('Microsoft auth detected, bypassing token expiry check');
      return false;
    }
    
    try {
      const authData = localStorage.getItem("auth");
      if (!authData) return true;
      
      const parsed = JSON.parse(authData);
      const { timestamp, expiresIn } = parsed;
      
      if (!timestamp || !expiresIn) return false; // Legacy tokens, assume valid
      
      return Date.now() - timestamp > expiresIn;
    } catch {
      return true; // Invalid auth data
    }
  }, []);

  const resetTimer = useCallback(() => {
    if (!enabled) return;
    
    // Check if token is expired first
    if (isTokenExpired()) {
      logout();
      return;
    }
    
    const rememberMe = localStorage.getItem("fws_remember_me");
    lastActivityRef.current = Date.now();
    
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }
    
    // Set different timeout based on remember me
    const timeoutDuration = rememberMe 
      ? 4 * 60 * 60 * 1000 // 4 hours for remember me users
      : timeoutMinutes * 60 * 1000; // Original timeout for regular users
    
    timeoutRef.current = setTimeout(() => {
      // Double-check token expiry before logout
      if (isTokenExpired()) {
        logout();
      } else if (!rememberMe) {
        // Only auto-logout non-remember-me users due to inactivity
        logout();
      }
    }, timeoutDuration);
  }, [enabled, timeoutMinutes, logout, isTokenExpired]);
  const isAuthenticated = useCallback(() => {
    const token = localStorage.getItem("access_token");
    const user = localStorage.getItem("user");
    return !!(token && user && user !== "null" && user !== "undefined");
  }, []);
  const handleActivity = useCallback(() => {
    if (!enabled || !isAuthenticated()) return;
    
    // Check token expiry on every activity
    if (isTokenExpired()) {
      logout();
      return;
    }
    
    resetTimer();
  }, [enabled, isAuthenticated, resetTimer, isTokenExpired, logout]);
  useEffect(() => {
    if (!enabled || !isAuthenticated()) {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
      return;
    }
    
    // Check token expiry on mount
    if (isTokenExpired()) {
      logout();
      return;
    }
    const events = [
      'mousedown',
      'mousemove',
      'keypress',
      'scroll',
      'touchstart',
      'click',
      'focus',
      'blur'
    ];
    events.forEach(event => {
      document.addEventListener(event, handleActivity, true);
    });
    resetTimer();
    return () => {
      events.forEach(event => {
        document.removeEventListener(event, handleActivity, true);
      });
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
        timeoutRef.current = null;
      }
    };
  }, [enabled, isAuthenticated, handleActivity, resetTimer]);
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);
  return {
    resetTimer,
    logout,
    isAuthenticated: isAuthenticated(),
    lastActivity: lastActivityRef.current
  };
};
export default useActivityMonitor;

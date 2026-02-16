// Token utility functions for session management

/**
 * Check if the stored token is expired
 * @returns {boolean} True if token is expired, false otherwise
 */
export const isTokenExpired = () => {
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
};

/**
 * Get remaining time until token expires
 * @returns {number} Milliseconds until expiry, or 0 if expired/invalid
 */
export const getTokenTimeRemaining = () => {
  try {
    const authData = localStorage.getItem("auth");
    if (!authData) return 0;
    
    const parsed = JSON.parse(authData);
    const { timestamp, expiresIn } = parsed;
    
    if (!timestamp || !expiresIn) return Infinity; // Legacy tokens
    
    const remaining = (timestamp + expiresIn) - Date.now();
    return Math.max(0, remaining);
  } catch {
    return 0;
  }
};

/**
 * Check if user has remember me enabled
 * @returns {boolean} True if remember me is enabled
 */
export const hasRememberMe = () => {
  return !!localStorage.getItem("fws_remember_me");
};

/**
 * Clear authentication data while preserving remember me settings
 * @param {boolean} clearRememberMe - Whether to also clear remember me data
 */
export const clearAuthData = (clearRememberMe = false) => {
  const rememberMe = localStorage.getItem("fws_remember_me");
  const lastEmail = localStorage.getItem("fws_last_email");
  
  localStorage.removeItem("access_token");
  localStorage.removeItem("token_type");
  localStorage.removeItem("user");
  localStorage.removeItem("auth");
  sessionStorage.clear();
  
  // Restore remember me data unless explicitly clearing it
  if (!clearRememberMe) {
    if (rememberMe) localStorage.setItem("fws_remember_me", rememberMe);
    if (lastEmail) localStorage.setItem("fws_last_email", lastEmail);
  } else {
    localStorage.removeItem("fws_remember_me");
    localStorage.removeItem("fws_last_email");
  }
};

/**
 * Format time remaining for display
 * @param {number} milliseconds - Time remaining in milliseconds
 * @returns {string} Formatted time string
 */
export const formatTimeRemaining = (milliseconds) => {
  if (milliseconds <= 0) return "Expired";
  if (milliseconds === Infinity) return "No expiry";
  
  const hours = Math.floor(milliseconds / (1000 * 60 * 60));
  const minutes = Math.floor((milliseconds % (1000 * 60 * 60)) / (1000 * 60));
  
  if (hours > 0) {
    return `${hours}h ${minutes}m`;
  } else {
    return `${minutes}m`;
  }
};

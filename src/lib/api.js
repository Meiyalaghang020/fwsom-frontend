import axios from "axios";

// Token expiry utility function

const baseURL = import.meta.env.DEV
  ? "/api" // Use Vite proxy in development
  : `${import.meta.env.VITE_API_BASE_URL}${import.meta.env.VITE_API_PREFIX || "/api"}`;

const api = axios.create({ baseURL });

// Check if token is expired
const isTokenExpired = () => {
  try {
    const authData = localStorage.getItem("auth");
    if (!authData) return false; // No auth data, let server handle
    
    const parsed = JSON.parse(authData);
    const { timestamp, expiresIn } = parsed;
    
    if (!timestamp || !expiresIn) return false; // Legacy tokens, let server handle
    
    return Date.now() - timestamp > expiresIn;
  } catch {
    return false; // Invalid auth data, let server handle
  }
};

// Attach token and cache-control headers automatically
api.interceptors.request.use((config) => {
  // Add cache-control headers to GET requests to prevent 304 statuses
  if (config.method === 'get') {
    config.headers['Cache-Control'] = 'no-cache';
    config.headers['Pragma'] = 'no-cache';
    config.headers['Expires'] = '0';
  }

  const token = localStorage.getItem("access_token");
  const type  = localStorage.getItem("token_type") || "Bearer";

  // Check if this is a public route that doesn't require authentication
  const publicRoutes = [
    "/adhoc/tasks",
    "/potential-form",
    "/potential-form/submit", 
    "/potential-form/meta",
    "/global-form-submit"
  ];
  
  const isPublicRoute = publicRoutes.some(route => config.url?.includes(route));
  
  // Check token expiry before making request (only for non-public routes)
  if (token && isTokenExpired() && !isPublicRoute) {
    // Token is expired, clear it and redirect to login
    const rememberMe = localStorage.getItem("fws_remember_me");
    const lastEmail = localStorage.getItem("fws_last_email");
    
    localStorage.removeItem("access_token");
    localStorage.removeItem("token_type");
    localStorage.removeItem("user");
    localStorage.removeItem("auth");
    
    // Restore remember me data
    if (rememberMe) localStorage.setItem("fws_remember_me", rememberMe);
    if (lastEmail) localStorage.setItem("fws_last_email", lastEmail);
    
    // Only redirect if not already on login page
    if (window.location.pathname !== "/login") {
      window.location.href = "/login";
    }
    
    return Promise.reject(new Error("Token expired"));
  }

  if (token && !config.headers?.Authorization) {
    config.headers = { ...(config.headers || {}), Authorization: `${type} ${token}` };
  }
  if (!config.headers["Content-Type"]) {
    config.headers["Content-Type"] = "application/json";
  }
  return config;
});

// Add a response interceptor to handle 401 errors globally
api.interceptors.response.use(
  (response) => response, // Pass through successful responses
  (error) => {
    // Check if the error is a 401 Unauthorized response
    if (error.response && error.response.status === 401) {
      // Routes that should NOT redirect to login on 401 (allow unauthenticated access)
      const publicRoutes = [
        "/adhoc/tasks",
        "/potential-form",
        "/potential-form/submit",
        "/potential-form/meta",
        "/global-form-submit"
      ];
      
      const currentPath = window.location.pathname;
      const isPublicRoute = publicRoutes.some(route => currentPath.startsWith(route));
      
      // Avoid redirect loops if we are already on the login page or on a public route
      if (window.location.pathname !== "/login" && !isPublicRoute) {
        // Preserve remember me data when clearing tokens
        const rememberMe = localStorage.getItem("fws_remember_me");
        const lastEmail = localStorage.getItem("fws_last_email");
        
        // Clear the authentication tokens from local storage
        localStorage.removeItem("access_token");
        localStorage.removeItem("token_type");
        localStorage.removeItem("user");
        localStorage.removeItem("auth");
        
        // Restore remember me data if it existed
        if (rememberMe) {
          localStorage.setItem("fws_remember_me", rememberMe);
        }
        if (lastEmail) {
          localStorage.setItem("fws_last_email", lastEmail);
        }

        // Redirect the user to the login page
        window.location.href = "/login";
      }
    }

    // IMPORTANT: Reject the promise to allow individual .catch() blocks to handle other errors
    return Promise.reject(error);
  }
);

export default api;

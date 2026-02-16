import React, { useEffect, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import loginBg from "../asset/login.webp";
import { Eye, EyeOff, Monitor } from "lucide-react";
import api from "../lib/api";

// Microsoft Logo SVG Component
const MicrosoftLogo = () => (
  <svg width="20" height="20" viewBox="0 0 21 21" xmlns="http://www.w3.org/2000/svg">
    <rect x="1" y="1" width="9" height="9" fill="#f25022" />
    <rect x="11" y="1" width="9" height="9" fill="#7fba00" />
    <rect x="1" y="11" width="9" height="9" fill="#00a4ef" />
    <rect x="11" y="11" width="9" height="9" fill="#ffb900" />
  </svg>
);

export default function Login() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();


  // Panel state for sliding animation
  const [isLinksMode, setIsLinksMode] = useState(false);

  // Sign In form state
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  // Microsoft Auth state
  const [isMicrosoftLoading, setIsMicrosoftLoading] = useState(false);

  // Forgot Password state
  const [showForgotPassword, setShowForgotPassword] = useState(false);
  const [forgotEmail, setForgotEmail] = useState("");
  const [forgotLoading, setForgotLoading] = useState(false);
  const [forgotMessage, setForgotMessage] = useState("");
  const [forgotError, setForgotError] = useState("");

  // Clear auth on mount if not remembered
  useEffect(() => {
    const rememberFlag =
      localStorage.getItem("fws_remember_me") ||
      localStorage.getItem("fws_last_email");

    if (!rememberFlag) {
      localStorage.removeItem("access_token");
      localStorage.removeItem("token_type");
      localStorage.removeItem("user");
      localStorage.removeItem("auth");
    }
  }, []);

  // Note: Microsoft OAuth callback is handled by MicrosoftCallback.jsx component



  const onForgotPasswordSubmit = (e) => {
    e.preventDefault();
    if (forgotLoading) return;

    setForgotError("");
    setForgotMessage("");
    setForgotLoading(true);

    api
      .post("/forgot-password", {
        email: forgotEmail,
      })
      .then((res) => {
        const d = res?.data ?? {};
        const message = d?.message || "Password reset link has been sent to your email address.";
        setForgotMessage(message);
        setForgotEmail("");
      })
      .catch((err) => {
        // console.error("Forgot Password Error:", err);
        const apiMsg =
          err?.response?.data?.message ||
          err?.response?.data?.error ||
          err?.message ||
          "Failed to send reset email. Please try again.";
        setForgotError(apiMsg);
      })
      .finally(() => {
        setForgotLoading(false);
      });
  };

  const closeForgotPasswordModal = () => {
    setShowForgotPassword(false);
    setForgotEmail("");
    setForgotError("");
    setForgotMessage("");
    setForgotLoading(false);
  };

  const onSignInSubmit = async (e) => {
    e.preventDefault();
    if (isLoading) return;

    setErrorMsg("");
    setIsLoading(true);

    try {
      const res = await api.post("/login", {
        email,
        password,
        device_name: "Desktop",
      });

      const d = res?.data ?? {};

      const token =
        d?.data?.access_token ??
        d?.access_token ??
        d?.token ??
        null;

      const tokenType = (d?.data?.token_type ?? d?.token_type ?? "Bearer") || "Bearer";
      let user = d?.data?.user ?? d?.user ?? null;

      if (!token) {
        throw new Error("No access token returned from API");
      }

      // Store token first
      localStorage.setItem("access_token", token);
      localStorage.setItem("token_type", tokenType);

      // Set authorization header for API calls
      api.defaults.headers.common.Authorization = `${tokenType} ${token}`;

      // Fetch complete user data from API
      let completeUserData = user;
      try {
        // console.log('👤 [Login] Fetching complete user data...');
        const userRes = await api.get('/user/profile');

        if (userRes.data && userRes.data.data) {
          completeUserData = userRes.data.data;
          // console.log('✅ [Login] Complete user data fetched:', completeUserData);
        } else if (userRes.data) {
          completeUserData = userRes.data;
          // console.log('✅ [Login] User data fetched (alternative structure):', completeUserData);
        }
      } catch (userError) {
        // console.error('❌ [Login] Failed to fetch complete user data:', userError);
        // console.log('⚠️ [Login] Using basic user data from login response');
        // Keep the basic user data from login response
      }

      const tokenData = {
        token,
        tokenType,
        user: completeUserData,
        timestamp: Date.now(),
        expiresIn: 24 * 60 * 60 * 1000 // 24 hours default
      };

      if (completeUserData) localStorage.setItem("user", JSON.stringify(completeUserData));
      localStorage.setItem("auth", JSON.stringify(tokenData));

      if (remember) {
        localStorage.setItem("fws_last_email", email);
        localStorage.setItem("fws_remember_me", "1");
        tokenData.expiresIn = 7 * 24 * 60 * 60 * 1000;
        localStorage.setItem("auth", JSON.stringify(tokenData));
      } else {
        localStorage.removeItem("fws_last_email");
        localStorage.removeItem("fws_remember_me");
      }

      // Fetch and cache navigation permissions
      const fetchNavigationPermissions = async () => {
        try {
          // console.log('🔐 [Login] Fetching navigation permissions...');
          const permissionsRes = await api.get('/user-permissions');

          if (permissionsRes.data && permissionsRes.data.permissions) {
            // console.log('✅ [Login] Navigation permissions fetched:', permissionsRes.data.permissions);
            localStorage.setItem('cachedNavigationPermissions', JSON.stringify(permissionsRes.data.permissions));
          } else {
            // console.log('⚠️ [Login] No permissions data received, using empty object');
            localStorage.setItem('cachedNavigationPermissions', JSON.stringify({}));
          }
        } catch (permError) {
          // console.error('❌ [Login] Failed to fetch navigation permissions:', permError);
          localStorage.setItem('cachedNavigationPermissions', JSON.stringify({}));
        }
      };

      // Fetch permissions before redirecting
      await fetchNavigationPermissions();

      // Check if there's a stored redirect URL after login
      const storedRedirect = localStorage.getItem('redirectAfterLogin');

      if (storedRedirect) {
        // Clear the stored redirect before navigating
        localStorage.removeItem('redirectAfterLogin');
        
        console.log('🚀 [Login] Using stored redirect:', storedRedirect);
        // Use window.location.href for guaranteed URL accuracy
        window.location.href = window.location.origin + storedRedirect;
        return; // Stop execution here
      } else {
        // Check if user has role_id: null and redirect accordingly
        if (user?.role_id === null) {
          // For users with role_id null, check if there's a redirectAfterLogin
          const fallbackRedirect = localStorage.getItem('redirectAfterLogin');
          console.log('🔍 [Login] role_id null, fallbackRedirect:', fallbackRedirect);
          if (fallbackRedirect) {
            // Clear the stored redirect
            localStorage.removeItem('redirectAfterLogin');
            console.log('🚀 [Login] Using fallback redirect:', fallbackRedirect);
            // Navigate to the redirect URL
            window.location.href = window.location.origin + fallbackRedirect;
          } else {
            console.log('🚀 [Login] No fallback, going to /resources/service');
            // No redirect URL, go to default service page
            window.location.href = window.location.origin + '/resources/service';
          }
        } else {
          console.log('🚀 [Login] role_id not null, going to /dashboard');
          // Users with role_id not null go to dashboard
          window.location.href = window.location.origin + '/dashboard';
        }
      }
    } catch (err) {
      // console.error("Login Error:", err);
      const apiMsg =
        err?.response?.data?.message ||
        err?.response?.data?.error ||
        err?.message ||
        "Login failed";
      setErrorMsg(apiMsg);
    } finally {
      setIsLoading(false);
    }
  };

  // Microsoft login - Full page redirect to Laravel backend
  const onMicrosoftSignIn = (e) => {
    e.preventDefault();
    // console.log('🚀 [Login] Microsoft login button clicked');
    // console.log('⏳ [Login] Setting loading state to true');
    setIsMicrosoftLoading(true);
    setErrorMsg("");

    // Get backend API URL from environment or use default
    const apiUrl = import.meta.env.VITE_API_BASE_URL || 'https://dev.fwsom.com';
    const redirectUrl = `${apiUrl}/auth/microsoft/redirect`;

    // console.log('🔗 [Login] API URL:', apiUrl);
    // console.log('🔄 [Login] Redirecting to:', redirectUrl);
    // console.log('📍 [Login] Current URL before redirect:', window.location.href);

    // Redirect to Laravel Microsoft OAuth endpoint
    window.location.href = redirectUrl;
  };

  useEffect(() => {
    const savedEmail = localStorage.getItem("fws_last_email");
    if (savedEmail) {
      setEmail(savedEmail);
      setRemember(true);
    }
  }, []);

  const quickLinks = [
    // { label: "Task Assignments", to: "/adhoc/tasks" },
    { label: "Universal Form", to: "/tollfree-form" },
    { label: "Potential Form", to: "/resources/potential-form" },
    // { label: "Potential Lookup", to: "/resources/potential-lookup" },
    // { label: "CallRail Tracker", to: "/resources/callrail-tracker" },
    // { label: "Chat Tracker", to: "/resources/chat-tracker" },
    { label: "UTM Builder", to: "/resources/utm-builder" },
    // { label: "UTM Enrich", to: "/resources/utm-enrich" },
  ];

  return (
    <div className="min-h-screen flex items-center justify-center overflow-hidden">
      <style>{`
        :root {
          --white: #e9e9e9;
          --gray: #333;
          --blue: #0367a6;
          --lightblue: #008997;
          --button-radius: 0.7rem;
          --max-width: 758px;
          --max-height: 420px;
        }

        body {
          background: url("${loginBg}");
          background-attachment: fixed;
          background-position: center;
          background-repeat: no-repeat;
          background-size: cover;
        }

        .container {
          background-color: var(--white);
          border-radius: var(--button-radius);
          box-shadow: 0 0.9rem 1.7rem rgba(0, 0, 0, 0.25), 0 0.7rem 0.7rem rgba(0, 0, 0, 0.22);
          height: var(--max-height);
          max-width: var(--max-width);
          overflow: hidden;
          position: relative;
          width: 100%;
        }

        .container__form {
          height: 100%;
          position: absolute;
          top: 0;
          transition: all 0.6s ease-in-out;
        }

        .container--signin {
          left: 0;
          width: 50%;
          z-index: 2;
        }

        .container.right-panel-active .container--signin {
          transform: translateX(100%);
        }

        .container--links {
          left: 0;
          opacity: 0;
          width: 50%;
          z-index: 1;
        }

        .container.right-panel-active .container--links {
          animation: show 0.6s;
          opacity: 1;
          transform: translateX(100%);
          z-index: 5;
        }

        .container__overlay {
          height: 100%;
          left: 50%;
          overflow: hidden;
          position: absolute;
          top: 0;
          transition: transform 0.6s ease-in-out;
          width: 50%;
          z-index: 100;
        }

        .container.right-panel-active .container__overlay {
          transform: translateX(-100%);
        }

        .overlay {
          background: url("${loginBg}");
          background-attachment: fixed;
          background-position: center;
          background-repeat: no-repeat;
          background-size: cover;
          height: 100%;
          left: -100%;
          position: relative;
          transform: translateX(0);
          transition: transform 0.6s ease-in-out;
          width: 200%;
        }

        .container.right-panel-active .overlay {
          transform: translateX(50%);
        }

        .overlay__panel {
          align-items: center;
          display: flex;
          flex-direction: column;
          height: 100%;
          justify-content: center;
          position: absolute;
          text-align: center;
          top: 0;
          transform: translateX(0);
          transition: transform 0.6s ease-in-out;
          width: 50%;
        }

        .overlay--left {
          transform: translateX(-20%);
        }

        .container.right-panel-active .overlay--left {
          transform: translateX(0);
        }

        .overlay--right {
          right: 0;
          transform: translateX(0);
        }

        .container.right-panel-active .overlay--right {
          transform: translateX(20%);
        }

        .btn {
          background-color: var(--blue);
          background-image: linear-gradient(90deg, var(--blue) 0%, var(--lightblue) 74%);
          border-radius: 20px;
          border: 1px solid var(--blue);
          color: var(--white);
          cursor: pointer;
          font-size: 0.8rem;
          font-weight: bold;
          letter-spacing: 0.1rem;
          padding: 0.9rem 4rem;
          text-transform: uppercase;
          transition: transform 80ms ease-in;
        }

        .form > .btn {
          margin-top: 1.5rem;
        }

        .btn:active {
          transform: scale(0.95);
        }

        .btn:focus {
          outline: none;
        }

        .form {
          background-color: var(--white);
          display: flex;
          align-items: center;
          justify-content: center;
          flex-direction: column;
          padding: 0 3rem;
          height: 100%;
          text-align: center;
        }

        .links-panel {
          background: linear-gradient(135deg, #1e293b 0%, #334155 100%);
          display: flex;
          align-items: center;
          justify-content: center;
          flex-direction: column;
          padding: 2rem;
          height: 100%;
          text-align: center;
        }

        .input {
          background-color: #fff;
          border: none;
          padding: 0.9rem 0.9rem;
          margin: 0.5rem 0;
          width: 100%;
          border-radius: 4px;
          border: 1px solid #ddd;
        }

        .input:focus {
          outline: none;
          border-color: var(--blue);
          box-shadow: 0 0 0 2px rgba(3, 103, 166, 0.1);
        }

        .form__title {
          font-weight: 300;
          margin: 0;
          margin-bottom: 1.25rem;
          color: var(--gray);
        }

        .link {
          color: var(--gray);
          font-size: 0.9rem;
          margin: 1.5rem 0;
          text-decoration: none;
        }

        .link:hover {
          text-decoration: underline;
        }

        .welcome {
          font-size: 3em;
          background: linear-gradient(90deg, rgb(130, 169, 223) 30%, rgb(232, 238, 176) 120%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Oxygen, Ubuntu, Cantarell, "Open Sans", "Helvetica Neue", sans-serif;
          opacity: 90%;
        }

        @keyframes show {
          0%, 49.99% {
            opacity: 0;
            z-index: 1;
          }
          50%, 100% {
            opacity: 1;
            z-index: 5;
          }
        }

        @keyframes spin { 
          to { transform: rotate(360deg); } 
        }

        .error-message {
          background-color: #fee;
          border: 1px solid #fcc;
          color: #c33;
          padding: 0.5rem;
          border-radius: 4px;
          margin: 0.5rem 0;
          font-size: 0.8rem;
        }

        .password-toggle {
          position: absolute;
          right: 10px;
          top: 50%;
          transform: translateY(-50%);
          background: none;
          border: none;
          cursor: pointer;
          color: var(--gray);
        }

        .input-container {
          position: relative;
          width: 100%;
        }

        .quick-link {
          display: block;
          width: 100%;
          padding: 0.75rem 1rem;
          margin: 0.5rem 0;
          background: rgba(255, 255, 255, 0.1);
          border: 1px solid rgba(255, 255, 255, 0.2);
          border-radius: 8px;
          color: white;
          text-decoration: none;
          font-size: 0.85rem;
          transition: all 0.3s ease;
          backdrop-filter: blur(10px);
        }

        .quick-link:hover {
          background: rgba(255, 255, 255, 0.2);
          transform: translateY(-2px);
          box-shadow: 0 4px 12px rgba(0, 0, 0, 0.3);
        }

        .links-title {
          color: white;
          font-size: 1.5rem;
          font-weight: 300;
          margin-bottom: 2rem;
          text-align: center;
        }

        .links-container {
          width: 100%;
          max-width: 280px;
          max-height: 300px;
          overflow-y: auto;
          scrollbar-width: thin;
          scrollbar-color: rgba(255, 255, 255, 0.3) transparent;
        }

        .links-container::-webkit-scrollbar {
          width: 6px;
        }

        .links-container::-webkit-scrollbar-track {
          background: transparent;
        }

        .links-container::-webkit-scrollbar-thumb {
          background: rgba(255, 255, 255, 0.3);
          border-radius: 3px;
        }

        .modal-overlay {
          position: fixed;
          top: 0;
          left: 0;
          right: 0;
          bottom: 0;
          background: rgba(0, 0, 0, 0.5);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 1000;
        }

        .modal-content {
          background: var(--white);
          border-radius: var(--button-radius);
          padding: 2rem;
          width: 90%;
          max-width: 400px;
          box-shadow: 0 0.9rem 1.7rem rgba(0, 0, 0, 0.25);
        }

        .modal-title {
          font-size: 1.5rem;
          font-weight: 300;
          margin: 0 0 1rem 0;
          color: var(--gray);
          text-align: center;
        }

        .modal-text {
          font-size: 0.9rem;
          color: #666;
          margin-bottom: 1.5rem;
          text-align: center;
          line-height: 1.4;
        }

        .modal-buttons {
          display: flex;
          gap: 1rem;
          justify-content: center;
          margin-top: 1.5rem;
        }

        .btn-secondary {
          background: transparent;
          border: 1px solid #ddd;
          color: var(--gray);
          padding: 0.7rem 2rem;
          border-radius: 20px;
          cursor: pointer;
          font-size: 0.8rem;
          font-weight: bold;
          text-transform: uppercase;
          transition: all 0.3s ease;
        }

        .btn-secondary:hover {
          background: #f5f5f5;
          border-color: #ccc;
        }

        .success-message {
          background-color: #d4edda;
          border: 1px solid #c3e6cb;
          color: #155724;
          padding: 0.75rem;
          border-radius: 4px;
          margin: 1rem 0;
          font-size: 0.85rem;
          text-align: center;
        }
      `}</style>

      <div
        className="absolute inset-0 -z-10"
        style={{
          backgroundImage: `url(${loginBg})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          backgroundRepeat: "no-repeat",
        }}
      />

      <div className={`container ${isLinksMode ? 'right-panel-active' : ''}`}>
        {/* Quick Links Panel */}
        <div className="container__form container--links">
          <div className="links-panel">
            <h2 className="links-title">Additional Links</h2>
            <div className="links-container">
              {quickLinks.map((l, i) => (
                <button
                  key={i}
                  className="quick-link"
                  onClick={() => navigate(l.to.startsWith("/") ? l.to : `/${l.to}`)}
                  title={l.label}
                >
                  {l.label}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Sign In Form - Microsoft Only */}
        <div className="container__form container--signin">
          <div className="form">
            <h2 className="form__title" style={{ fontSize: '1.8rem', marginBottom: '2rem' }}>Welcome Back</h2>

            {/* Error Message */}
            {errorMsg && (
              <div className="error-message" style={{ width: '100%', maxWidth: '320px', marginBottom: '1rem' }}>
                {errorMsg}
              </div>
            )}

            {/* Microsoft Login Button */}
            <button
              className="microsoft-login-btn"
              type="button"
              disabled={isMicrosoftLoading}
              onClick={onMicrosoftSignIn}
              style={{
                width: '100%',
                maxWidth: '320px',
                padding: '0.875rem 1.5rem',
                fontSize: '0.9rem',
                fontWeight: '500',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '0.75rem',
                background: '#fff',
                color: '#323130',
                border: '1px solid #8a8886',
                borderRadius: '4px',
                opacity: isMicrosoftLoading ? 0.6 : 1,
                cursor: isMicrosoftLoading ? 'not-allowed' : 'pointer',
                transition: 'all 0.2s ease',
                fontFamily: 'Segoe UI, system-ui, -apple-system, sans-serif'
              }}
              onMouseEnter={(e) => {
                if (!isMicrosoftLoading) {
                  e.currentTarget.style.background = '#f3f2f1';
                  e.currentTarget.style.borderColor = '#323130';
                  e.currentTarget.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.1)';
                  e.currentTarget.style.transform = 'translateY(-1px)';
                }
              }}
              onMouseLeave={(e) => {
                if (!isMicrosoftLoading) {
                  e.currentTarget.style.background = '#fff';
                  e.currentTarget.style.borderColor = '#8a8886';
                  e.currentTarget.style.boxShadow = 'none';
                  e.currentTarget.style.transform = 'translateY(0)';
                }
              }}
              onMouseDown={(e) => {
                if (!isMicrosoftLoading) {
                  e.currentTarget.style.background = '#edebe9';
                  e.currentTarget.style.transform = 'translateY(0)';
                }
              }}
              onMouseUp={(e) => {
                if (!isMicrosoftLoading) {
                  e.currentTarget.style.background = '#f3f2f1';
                  e.currentTarget.style.transform = 'translateY(-1px)';
                }
              }}
            >
              {isMicrosoftLoading ? (
                <>
                  <div
                    className="inline-block h-4 w-4 border-2 border-slate-600 border-t-transparent rounded-full"
                    style={{ animation: "spin 0.8s linear infinite" }}
                  />
                  <span>Connecting to Microsoft...</span>
                </>
              ) : (
                <>
                  <MicrosoftLogo />
                  <span>Sign in with Microsoft</span>
                </>
              )}
            </button>

            <p style={{
              marginTop: '2rem',
              fontSize: '0.75rem',
              color: '#666',
              maxWidth: '320px',
              lineHeight: '1.4'
            }}>
              Use your Microsoft account to securely access the dashboard
            </p>
          </div>
        </div>

        {/* Overlay */}
        <div className="container__overlay">
          <div className="overlay">
            <div className="overlay__panel overlay--left">
              <h1 className="welcome">Welcome Back!</h1>
              <p style={{ color: 'white', margin: '1rem 0', fontSize: '0.9rem' }}>
                Ready to access your dashboard? Sign in to continue
              </p>
              <button
                className="btn"
                onClick={() => setIsLinksMode(false)}
                style={{ backgroundColor: 'transparent', border: '1px solid white' }}
              >
                Sign In
              </button>
            </div>
            <div className="overlay__panel overlay--right">
              <h1 className="welcome">Quick Access</h1>
              <button
                className="btn"
                onClick={() => setIsLinksMode(true)}
                style={{ backgroundColor: 'transparent', border: '1px solid white' }}
              >
                View Links
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Forgot Password Modal */}
      {showForgotPassword && (
        <div className="modal-overlay" onClick={closeForgotPasswordModal}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2 className="modal-title">Reset Password</h2>
            <p className="modal-text">
              Enter your email address and we'll send you a link to reset your password.
            </p>

            <form onSubmit={onForgotPasswordSubmit}>
              <input
                type="email"
                placeholder="Enter your email address"
                className="input"
                value={forgotEmail}
                onChange={(e) => setForgotEmail(e.target.value)}
                required
                disabled={forgotLoading}
              />

              {forgotError && (
                <div className="error-message">
                  {forgotError}
                </div>
              )}

              {forgotMessage && (
                <div className="success-message">
                  {forgotMessage}
                </div>
              )}

              <div className="modal-buttons">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={closeForgotPasswordModal}
                  disabled={forgotLoading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn"
                  disabled={forgotLoading || !forgotEmail.trim()}
                  style={{
                    opacity: (forgotLoading || !forgotEmail.trim()) ? 0.6 : 1,
                    cursor: (forgotLoading || !forgotEmail.trim()) ? 'not-allowed' : 'pointer',
                    padding: '0.7rem 2rem'
                  }}
                >
                  {forgotLoading && (
                    <span
                      className="inline-block h-4 w-4 border-2 border-white/70 border-t-transparent rounded-full mr-2"
                      style={{ animation: "spin 0.8s linear infinite" }}
                    />
                  )}
                  {forgotLoading ? "Sending..." : "Send Reset Link"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

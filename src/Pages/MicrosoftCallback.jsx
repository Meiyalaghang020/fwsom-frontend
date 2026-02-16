import { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import api from '../lib/api';

export default function MicrosoftCallback() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [status, setStatus] = useState('processing'); // processing, success, error
  const [message, setMessage] = useState('Authenticating...');

  useEffect(() => {
    // console.log('🚀 [AuthCallback] Authentication flow started');
    // console.log('📍 [AuthCallback] Current URL:', window.location.href);
    // console.log('🔍 [AuthCallback] All URL params:', Object.fromEntries(searchParams.entries()));
    
    const handleCallback = async () => {
      // console.log('🔧 [AuthCallback] Processing callback...');
      
      // Check for error in URL params
      const error = searchParams.get('error');
      const errorMessage = searchParams.get('message');
      
      // console.log('❓ [AuthCallback] Error in URL:', { error, errorMessage });

      if (error) {
        // console.log('❌ [AuthCallback] Authentication failed - Setting error state');
        setStatus('error');
        setMessage(errorMessage || 'Authentication failed. Please try again.');
        
        // console.log('⏰ [AuthCallback] Setting up redirect to login in 3 seconds');
        setTimeout(() => {
          // console.log('🔄 [AuthCallback] Redirecting to login page');
          navigate('/login', { replace: true });
        }, 3000);
        return;
      }

      // Get token and user data from URL params
      const token = searchParams.get('token');
      const name = searchParams.get('name');
      const email = searchParams.get('email');
      const id = searchParams.get('id');
      const role = searchParams.get('role');
      const role_id = searchParams.get('role_id');
      const team_id = searchParams.get('team_id');
      const dept_id = searchParams.get('dept_id');


      if (token) {
        // console.log('💾 [AuthCallback] Storing authentication data...');
        
        const tokenType = 'Bearer';
        
        // Store token in localStorage
        localStorage.setItem('access_token', token);
        localStorage.setItem('token_type', tokenType);
        // console.log('✅ [AuthCallback] Token stored in localStorage');

        // Set authorization header for subsequent API requests
        const authHeader = `${tokenType} ${token}`;
        api.defaults.headers.common.Authorization = authHeader;
        // console.log('✅ [AuthCallback] Authorization header set');

        // Fetch complete user data from API
        let completeUserData = null;
        try {
          // console.log('👤 [AuthCallback] Fetching complete user data...');
          const userRes = await api.get('/user/profile');
          
          // console.log('🔍 [AuthCallback] API Response Structure:', userRes.data);
          
          if (userRes.data && userRes.data.data) {
            completeUserData = userRes.data.data;
            // console.log('✅ [AuthCallback] Complete user data fetched:', completeUserData);
          } else if (userRes.data) {
            completeUserData = userRes.data;
            // console.log('✅ [AuthCallback] User data fetched (alternative structure):', completeUserData);
          } else {
            throw new Error('No user data received from API');
          }

          // Ensure we have the basic required fields, fallback to URL params if missing
          if (!completeUserData.id && id) {
            completeUserData.id = id;
            // console.log('🔧 [AuthCallback] Added missing id from URL params:', id);
          }
          if (!completeUserData.name && name) {
            completeUserData.name = name;
            // console.log('🔧 [AuthCallback] Added missing name from URL params:', name);
          }
          if (!completeUserData.email && email) {
            completeUserData.email = email;
            // console.log('🔧 [AuthCallback] Added missing email from URL params:', email);
          }
          if (!completeUserData.role && role) {
            completeUserData.role = role;
            // console.log('🔧 [AuthCallback] Added missing role from URL params:', role);
          }
          if (!completeUserData.role_id && role_id) {
            completeUserData.role_id = parseInt(role_id);
            // console.log('🔧 [AuthCallback] Added missing role_id from URL params:', role_id);
          }
          if (!completeUserData.team_id && team_id) {
            completeUserData.team_id = parseInt(team_id);
            // console.log('🔧 [AuthCallback] Added missing team_id from URL params:', team_id);
          }
          if (!completeUserData.dept_id && dept_id) {
            completeUserData.dept_id = parseInt(dept_id);
            // console.log('🔧 [AuthCallback] Added missing dept_id from URL params:', dept_id);
          }
        } catch (userError) {
          console.error('❌ [AuthCallback] Failed to fetch complete user data:', userError);
          // Fallback to URL parameters if API fails
          completeUserData = {
            id: id || '',
            name: name || '',
            email: email || '',
            role: role || 'other',
            linked_campaigns: [],
            role_id: role_id ? parseInt(role_id) : (role === 'admin' ? 1 : role === 'manager' ? 2 : role === 'user' ? 3 : null),
            team_id: team_id ? parseInt(team_id) : null,
            dept_id: dept_id ? parseInt(dept_id) : null
          };
        }
        
        // Store complete user data
        localStorage.setItem('user', JSON.stringify(completeUserData));
        // console.log('✅ [AuthCallback] Complete user data stored:', completeUserData);
        
        // Create tokenData for compatibility
        const tokenData = {
          token,
          tokenType,
          user: completeUserData,
          timestamp: Date.now(),
          expiresIn: 7 * 24 * 60 * 60 * 1000 // 7 days
        };
        localStorage.setItem('auth', JSON.stringify(tokenData));
        localStorage.setItem('fws_last_email', completeUserData.email || '');
        localStorage.setItem('fws_remember_me', '1');
        
        // Store default preferences
        localStorage.setItem('fws_remember_user', '1');
        localStorage.setItem('modules_per_Page', '25');
        
        // Initialize empty objects for permissions if not provided
        localStorage.setItem('ca.fws.fhsyasgv.mPermissions', JSON.stringify({}));
        localStorage.setItem('hiddencols', JSON.stringify({}));

        // Fetch and cache navigation permissions
        const fetchNavigationPermissions = async () => {
          try {
            // console.log('🔐 [AuthCallback] Fetching navigation permissions...');
            const permissionsRes = await api.get('/user-permissions');
            
            if (permissionsRes.data && permissionsRes.data.permissions) {
              // console.log('✅ [AuthCallback] Navigation permissions fetched:', permissionsRes.data.permissions);
              localStorage.setItem('cachedNavigationPermissions', JSON.stringify(permissionsRes.data.permissions));
            } else {
              // console.log('⚠️ [AuthCallback] No permissions data received, using empty object');
              localStorage.setItem('cachedNavigationPermissions', JSON.stringify({}));
            }
          } catch (permError) {
            console.error('❌ [AuthCallback] Failed to fetch navigation permissions:', permError);
            localStorage.setItem('cachedNavigationPermissions', JSON.stringify({}));
          }
        };

        // Fetch permissions before redirecting
        await fetchNavigationPermissions();

        // Check if user has role_id: null and redirect accordingly
        const redirectPath = completeUserData.role_id === null ? '/resources/service' : '/dashboard';
        
        setStatus('success');
        setMessage('Authentication successful! Redirecting...');
        // console.log('✅ [AuthCallback] Authentication successful - Setting success state');
        // console.log('🎯 [AuthCallback] User role_id:', completeUserData.role_id, '-> Redirecting to:', redirectPath);

        // console.log('⏰ [AuthCallback] Setting up redirect in 1.5 seconds');
        // Redirect based on role
        setTimeout(() => {
          // console.log('🔄 [AuthCallback] Redirecting to:', redirectPath);
          navigate(redirectPath, { replace: true });
        }, 1500);
      } else {
        // console.log('❌ [AuthCallback] No token received - Authentication failed');
        setStatus('error');
        setMessage('No authentication token received. Please try again.');

        // console.log('⏰ [AuthCallback] Setting up redirect to login in 3 seconds');
        setTimeout(() => {
          // console.log('🔄 [AuthCallback] Redirecting to login page');
          navigate('/login', { replace: true });
        }, 3000);
      }
    };

    handleCallback();
  }, [searchParams, navigate]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-50">
      <div className="text-center max-w-md mx-auto p-8">
        {/* Status Icon */}
        <div className={`inline-flex items-center justify-center w-20 h-20 rounded-full mb-6 ${
          status === 'processing' ? 'bg-blue-100' : 
          status === 'success' ? 'bg-green-100' : 
          'bg-red-100'
        }`}>
          {status === 'processing' && (
            <div className="inline-block h-10 w-10 rounded-full border-4 border-blue-200 border-t-blue-600 animate-spin"></div>
          )}
          {status === 'success' && (
            <svg className="w-10 h-10 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
            </svg>
          )}
          {status === 'error' && (
            <svg className="w-10 h-10 text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          )}
        </div>

        {/* Status Title */}
        <h2 className={`text-2xl font-semibold mb-3 ${
          status === 'processing' ? 'text-slate-800' : 
          status === 'success' ? 'text-green-700' : 
          'text-red-700'
        }`}>
          {status === 'processing' && 'Processing'}
          {status === 'success' && 'Success!'}
          {status === 'error' && 'Error'}
        </h2>
        
        {/* Status Message */}
        <p className="text-slate-600 mb-6">{message}</p>

        {/* Manual redirect button for errors */}
        {status === 'error' && (
          <button 
            className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            onClick={() => navigate('/login', { replace: true })}
          >
            Return to Login
          </button>
        )}
      </div>
    </div>
  );
}

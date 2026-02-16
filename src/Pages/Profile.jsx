import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import api from "../lib/api";
import { LogOut, User as UserIcon, Mail, Briefcase, Users, Shield } from 'lucide-react';

const Profile = () => {
    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [isLoggingOut, setIsLoggingOut] = useState(false);
    const navigate = useNavigate();

    const fetchProfile = async () => {
        try {
            const user = JSON.parse(localStorage.getItem('user'));
            if (!user?.id) {
                // Redirect to login if user data is not found
              //  console.log('No user data found, redirecting to login...');
                navigate('/login');
                return;
            }

            const response = await api.get(`/user/fetch?id=${user.id}`);
            if (response.data.status === 'success') {
                setProfile(response.data.data);
            } else {
                throw new Error('Failed to fetch profile');
            }
        } catch (err) {
            console.error('Error fetching profile:', err);
            setError(err.message || 'Failed to load profile');
            // Redirect to login on any error if user data is critical
            if (!localStorage.getItem('user')) {
                navigate('/login');
            }
        } finally {
            setLoading(false);
        }
    };
    const handleLogout = async () => {
        try {
            setIsLoggingOut(true);
            // Add your logout logic here
            localStorage.removeItem('user');
            localStorage.removeItem('access_token');
            navigate('/login');
        } catch (err) {
            console.error('Error during logout:', err);
        } finally {
            setIsLoggingOut(false);
        }
    };

    useEffect(() => {
        fetchProfile();
    }, []);

    // Loading state
    if (loading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-50 flex items-center justify-center p-4">
                <div className="text-center space-y-4">
                    <div className="w-16 h-16 border-4 border-blue-400 border-t-transparent rounded-full animate-spin mx-auto"></div>
                    <p className="text-lg font-medium text-gray-700">Loading your profile...</p>
                </div>
            </div>
        );
    }

    // Error state
    if (error) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-red-50 to-pink-50 flex items-center justify-center p-4">
                <div className="bg-white p-8 rounded-2xl shadow-xl text-center max-w-md w-full">
                    <div className="text-red-500 mb-4">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-16 w-16 mx-auto" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                        </svg>
                    </div>
                    <h2 className="text-2xl font-bold text-gray-800 mb-2">Something went wrong</h2>
                    <p className="text-gray-600 mb-6">{error}</p>
                    <button
                        onClick={() => window.location.reload()}
                        className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                        Try Again
                    </button>
                </div>
            </div>
        );
    }

    // No profile data
    if (!profile) {
        return (
            <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
                <div className="text-center">
                    <h2 className="text-2xl font-bold text-gray-800 mb-2">No Profile Data</h2>
                    <p className="text-gray-600 mb-6">We couldn't find any profile information.</p>
                    <button
                        onClick={() => window.location.reload()}
                        className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
                    >
                        Refresh
                    </button>
                </div>
            </div>
        );
    }

    // Format user initials
    const getInitials = (name) => {
        if (!name) return 'U';
        return name
            .split(' ')
            .map(word => word[0])
            .join('')
            .toUpperCase()
            .substring(0, 2);
    };

    return (
        <div className="p-4 md:p-8">
            <div className="max-w-5xl mx-auto">
                <div className="bg-white rounded-2xl shadow-xl">
                    {/* Profile Header */}
                    <div className="bg-gradient-to-r from-blue-600 to-indigo-700 p-6 md:p-8 text-white">
                        <div className="flex flex-col md:flex-row md:items-center md:justify-between">
                            <div className="flex items-center space-x-4">
                                <div className="w-20 h-20 md:w-24 md:h-24 rounded-full bg-white/20 flex items-center justify-center text-3xl font-bold">
                                    {getInitials(profile.name)}
                                </div>
                                <div>
                                    <h1 className="text-2xl md:text-3xl font-bold">{profile.name}</h1>
                                    <p className="text-blue-100 flex items-center mt-1">
                                        <Mail className="w-4 h-4 mr-1" />
                                        {profile.email}
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={handleLogout}
                                disabled={isLoggingOut}
                                className="mt-4 md:mt-0 px-6 py-2.5 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium flex items-center space-x-2 transition-colors disabled:opacity-70"
                            >
                                <LogOut className="w-5 h-5" />
                                <span>{isLoggingOut ? 'Logging Out...' : 'Logout'}</span>
                            </button>
                        </div>
                    </div>

                    {/* Profile Content */}
                    <div className="p-6 md:p-8 max-h-[calc(100vh-220px)] overflow-y-auto">
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                            {/* Personal Information */}
                            <div className="bg-gray-50 rounded-xl p-6">
                                <div className="flex items-center mb-4">
                                    <UserIcon className="w-5 h-5 text-blue-600 mr-2" />
                                    <h2 className="text-xl font-semibold text-gray-800">Personal Information</h2>
                                </div>
                                <div className="space-y-4">
                                    <div>
                                        <p className="text-sm text-gray-500">Full Name</p>
                                        <p className="font-medium">{profile.name || 'Not provided'}</p>
                                    </div>
                                    <div>
                                        <p className="text-sm text-gray-500">Email Address</p>
                                        <p className="font-medium">{profile.email || 'Not provided'}</p>
                                    </div>
                                </div>
                            </div>

                            {/* Role & Department */}
                            <div className="bg-gray-50 rounded-xl p-6">
                                <div className="flex items-center mb-4">
                                    <Briefcase className="w-5 h-5 text-indigo-600 mr-2" />
                                    <h2 className="text-xl font-semibold text-gray-800">Work Information</h2>
                                </div>
                                <div className="space-y-4">
                                    <div>
                                        <p className="text-sm text-gray-500">Role</p>
                                        <div className="flex items-center">
                                            <Shield className="w-4 h-4 text-indigo-500 mr-2" />
                                            <span className="font-medium capitalize">{profile.role?.name || 'Not assigned'}</span>
                                        </div>
                                    </div>
                                    <div>
                                        <p className="text-sm text-gray-500">Department</p>
                                        <div className="flex items-center">
                                            <Users className="w-4 h-4 text-indigo-500 mr-2" />
                                            <span className="font-medium">
                                                {profile.department ? `${profile.department.name} (${profile.department.short_code})` : 'Not assigned'}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        {/* Linked Campaigns */}
                        <div className="mt-6 pb-6">
                            <h3 className="text-base font-medium text-gray-500 mb-3 flex items-center">
                                <Users className="w-4 h-4 mr-2 text-gray-400" />
                                LINKED CAMPAIGNS
                                <span className="ml-2 text-xs font-normal text-gray-400">
                                    ({profile.campaign_details?.length || 0} Campaigns)
                                </span>
                            </h3>
                            
                            {profile.campaign_details?.length > 0 ? (
                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                                    {profile.campaign_details.map((campaign) => (
                                        <div key={campaign.id} className="bg-gray-50 rounded-lg p-3 border border-gray-200 h-full">
                                            <div className="flex items-center">
                                                <div className="flex-shrink-0 h-8 w-8 rounded bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-xs font-semibold">
                                                    {campaign.short_code || campaign.name.substring(0, 2).toUpperCase()}
                                                </div>
                                                <div className="ml-3 min-w-0 flex-1">
                                                    <p className="text-sm font-medium text-gray-900 truncate">{campaign.name}</p>
                                                    {campaign.url && (
                                                        <a 
                                                            href={campaign.url.startsWith('http') ? campaign.url : `https://${campaign.url}`}
                                                            target="_blank" 
                                                            rel="noopener noreferrer"
                                                            className="text-xs text-blue-600 hover:underline flex items-center mt-0.5"
                                                        >
                                                            <svg className="w-3 h-3 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                                            </svg>
                                                            {campaign.url.replace(/^https?:\/\//, '')}
                                                        </a>
                                                    )}
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-4 text-sm text-gray-500">
                                    No campaigns linked to this account.
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Profile;

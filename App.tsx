
import React, { Suspense, useState, useEffect } from 'react';
import { HashRouter, Routes, Route, useLocation, useNavigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import Header from './components/Header';
import Home from './pages/Home';
import EventDetails from './pages/EventDetails';
import HostPage from './pages/HostPage';
import EventAdmin from './pages/EventAdmin';
import Settings from './pages/Settings';
import UserPortal from './pages/UserPortal';
import HostPortal from './pages/HostPortal';
import PromoterPortal from './pages/PromoterPortal';
import ProfilePage from './pages/ProfilePage';
import PublicFormPage from './pages/PublicFormPage';
import { useGoogleOneTapLogin } from '@react-oauth/google';
import { jwtDecode } from "jwt-decode";
import * as api from './services/api';
import { ShieldIcon } from './components/Icons';

// Lazy load System Admin to isolate code
const SystemAdmin = React.lazy(() => import('./pages/SystemAdmin'));

// AppContent uses useLocation to determine the background style
const AppContent: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate(); // Use hook inside component within Router context
  const { login, user, refreshUser, isLoading } = useAuth();
  
  // Maintenance Mode State
  const [isMaintenanceMode, setIsMaintenanceMode] = useState(false);

  useEffect(() => {
      // Catch error here to prevent app crash if API returns 401 (Unauthorized) for public users
      api.getSystemSettings()
          .then(settings => {
              setIsMaintenanceMode(settings.maintenanceMode);
          })
          .catch(err => {
              // Only log if it's not a 403 (Forbidden) which is currently expected for non-admins
              if (!err.message.includes('403') && !err.message.includes('Forbidden')) {
                  console.warn("Failed to fetch system settings:", err.message);
              }
              setIsMaintenanceMode(false);
          });
  }, []);

  // Determine if we are on a public form page
  const isPublicForm = location.pathname.startsWith('/form/');

  // Google One Tap Implementation
  useGoogleOneTapLogin({
    onSuccess: async (credentialResponse) => {
        if (credentialResponse.credential) {
            const token = credentialResponse.credential;
            const decoded: any = jwtDecode(token);
            if (decoded.email) {
                const email = decoded.email;
                const name = decoded.name || email.split('@')[0];
                
                try {
                    // Try to login directly, passing decoded info to help backend
                    const loggedInUser = await login('google-one-tap', token, { name, email });
                    
                    // FIX: Ensure actual user info is saved if backend used placeholders
                    if (loggedInUser) {
                        const isPlaceholder = 
                            loggedInUser.name === 'Google User' || 
                            loggedInUser.email.includes('placeholder') ||
                            loggedInUser.email.includes('fake');
                        
                        // Also update if details don't match Google data (and we trust Google data more for login)
                        const mismatch = loggedInUser.email !== email || (loggedInUser.name !== name && name);

                        if (isPlaceholder || mismatch) {
                            try {
                                console.log("Updating user profile with Google data...");
                                await api.updateUser(loggedInUser.id, { name, email });
                                await refreshUser();
                            } catch (updateErr) {
                                console.warn("Failed to auto-update user details after Google login", updateErr);
                            }
                        }
                    }
                    
                    // Check for pending checkout
                    const pendingEventId = sessionStorage.getItem('pendingCheckoutEventId');
                    if (pendingEventId) {
                        const pendingPromo = sessionStorage.getItem('pendingCheckoutPromoCode');
                        if (pendingPromo) {
                            navigate(`/event/${pendingEventId}?promo=${pendingPromo}`);
                        } else {
                            navigate(`/event/${pendingEventId}`);
                        }
                    }
                } catch (e) {
                    // Login failed, assumes user needs registration.
                    // Automatically register with default 'attendee' role (api.registerUser also auto-creates host profile)
                    try {
                        await api.registerUser(email, name, 'attendee');
                        // Login again with explicit info
                        await login('google-one-tap', token, { name, email });
                        
                        // Check for pending checkout
                        const pendingEventId = sessionStorage.getItem('pendingCheckoutEventId');
                        if (pendingEventId) {
                            const pendingPromo = sessionStorage.getItem('pendingCheckoutPromoCode');
                            if (pendingPromo) {
                                navigate(`/event/${pendingEventId}?promo=${pendingPromo}`);
                            } else {
                                navigate(`/event/${pendingEventId}`);
                            }
                        }
                    } catch (regError) {
                        console.error("Auto-registration failed", regError);
                    }
                }
            }
        }
    },
    onError: () => {
        console.log('Google One Tap Login Failed');
    },
    disabled: !!user, // Do not show if user is already logged in
  });
  
  // Show loading spinner while restoring session
  if (isLoading) {
      return (
          <div className="flex items-center justify-center h-screen bg-[#0a0a0a]">
              <div className="w-8 h-8 border-4 border-purple-600 border-t-transparent rounded-full animate-spin"></div>
          </div>
      );
  }
  
  // Determine if the current page renders its own background (like a blurred hero image).
  // We exclude the event admin pages (containing '/admin/') so they use the standard dark background.
  const isDetailsPage = 
    (location.pathname.startsWith('/event/') && !location.pathname.includes('/admin/')) || 
    location.pathname.startsWith('/host/') || 
    location.pathname.startsWith('/profile/') ||
    location.pathname === '/';
  
  // System admin route has its own layout structure
  const isSystemAdminRoute = location.pathname.startsWith('/system-admin');
  
  // Should we show maintenance banner?
  // Hide if: Not maintenance mode OR User is on System Admin Route OR User is a System Admin
  const showMaintenanceBanner = isMaintenanceMode && !isSystemAdminRoute && !user?.isSystemAdmin;

  // For the event/host/profile details pages, the background is transparent to allow their custom blurred background to show.
  // For all other pages, a default dark background is applied.
  const backgroundClass = (isDetailsPage || isPublicForm) ? '' : 'bg-[#0a0a0a]';

  return (
    <div className={`min-h-screen w-full ${backgroundClass}`}>
      {showMaintenanceBanner && (
          <div className="fixed top-0 left-0 right-0 h-10 bg-yellow-500 text-black z-[100] flex items-center justify-center font-bold text-sm px-4">
              <ShieldIcon className="w-4 h-4 mr-2" />
              Maintenance Mode Active - Some features may be unavailable.
          </div>
      )}
      
      {!isSystemAdminRoute && !isPublicForm && (
          <div className={showMaintenanceBanner ? "pt-10" : ""}>
              <Header />
          </div>
      )}
      
      <main className={(!isSystemAdminRoute && !isPublicForm) ? "pt-20" : ""}>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/event/:id/admin/:tab" element={<EventAdmin />} />
          <Route path="/event/:id" element={<EventDetails />} />
          <Route path="/host/:id" element={<HostPage />} />
          <Route path="/profile/:id" element={<ProfilePage />} />
          <Route path="/form/:id" element={<PublicFormPage />} />
          <Route path="/my-tickets" element={<UserPortal />} />
          <Route path="/events" element={<HostPortal />} />
          <Route path="/promotions" element={<PromoterPortal />} />
          <Route path="/settings" element={<Settings />} />
          <Route 
            path="/system-admin/*" 
            element={
              <Suspense fallback={<div className="flex items-center justify-center h-screen bg-[#050505] text-white">Loading System Admin...</div>}>
                <SystemAdmin />
              </Suspense>
            } 
          />
        </Routes>
      </main>
    </div>
  );
};


const App: React.FC = () => {
  return (
    <AuthProvider>
      <HashRouter>
        <AppContent />
      </HashRouter>
    </AuthProvider>
  );
};

export default App;

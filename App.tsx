
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
import RoleSelectionModal from './components/RoleSelectionModal';
import { ShieldIcon } from './components/Icons';

// Lazy load System Admin to isolate code
const SystemAdmin = React.lazy(() => import('./pages/SystemAdmin'));

// AppContent uses useLocation to determine the background style
const AppContent: React.FC = () => {
  const location = useLocation();
  const navigate = useNavigate(); // Use hook inside component within Router context
  const { login, user } = useAuth();
  const [showRoleSelectionModal, setShowRoleSelectionModal] = useState(false);
  const [pendingGoogleUser, setPendingGoogleUser] = useState<{ email: string; name: string; token: string } | null>(null);
  
  // Maintenance Mode State
  const [isMaintenanceMode, setIsMaintenanceMode] = useState(false);

  useEffect(() => {
      api.getSystemSettings().then(settings => {
          setIsMaintenanceMode(settings.maintenanceMode);
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
                    // Try to login directly
                    await login('google-one-tap', token);
                    
                    // Check for pending checkout
                    const pendingEventId = sessionStorage.getItem('pendingCheckoutEventId');
                    if (pendingEventId) {
                        navigate(`/event/${pendingEventId}`);
                    }
                } catch (e) {
                    // Login failed, assume user needs registration or selection
                    if (isPublicForm) {
                        try {
                            await api.registerUser(email, name, 'attendee');
                            await login('google-one-tap', token);
                        } catch (regError) {
                            console.error("Registration failed", regError);
                        }
                    } else {
                        // Store token for registration
                        setPendingGoogleUser({ email, name, token });
                        setShowRoleSelectionModal(true);
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
  
  const handleRoleSelect = async (role: 'attendee' | 'host') => {
      if (pendingGoogleUser) {
          try {
              // Register the new user with the selected role
              await api.registerUser(pendingGoogleUser.email, pendingGoogleUser.name, role);
              // Log them in using the stored token
              await login('google-one-tap', pendingGoogleUser.token);
              
              // Cleanup
              setPendingGoogleUser(null);
              setShowRoleSelectionModal(false);
              
              // Check for pending checkout logic here as well if new user wants to buy immediately
              const pendingEventId = sessionStorage.getItem('pendingCheckoutEventId');
              if (pendingEventId) {
                  navigate(`/event/${pendingEventId}`);
              }
          } catch (e) {
              alert("Registration failed. Please try again later.");
              setPendingGoogleUser(null);
              setShowRoleSelectionModal(false);
          }
      }
  };
  
  // Determine if the current page renders its own background (like a blurred hero image).
  // We exclude the event admin pages (containing '/admin/') so they use the standard dark background.
  const isDetailsPage = 
    (location.pathname.startsWith('/event/') && !location.pathname.includes('/admin/')) || 
    location.pathname.startsWith('/host/') || 
    location.pathname.startsWith('/profile/') ||
    location.pathname === '/';
  
  // System admin page has its own layout structure
  const isSystemAdmin = location.pathname.startsWith('/system-admin');
  

  // For the event/host/profile details pages, the background is transparent to allow their custom blurred background to show.
  // For all other pages, a default dark background is applied.
  const backgroundClass = (isDetailsPage || isPublicForm) ? '' : 'bg-[#0a0a0a]';

  return (
    <div className={`min-h-screen w-full ${backgroundClass}`}>
      {isMaintenanceMode && !isSystemAdmin && (
          <div className="fixed top-0 left-0 right-0 h-10 bg-yellow-500 text-black z-[100] flex items-center justify-center font-bold text-sm px-4">
              <ShieldIcon className="w-4 h-4 mr-2" />
              Maintenance Mode Active - Some features may be unavailable.
          </div>
      )}
      
      {!isSystemAdmin && !isPublicForm && (
          <div className={isMaintenanceMode ? "pt-10" : ""}>
              <Header />
          </div>
      )}
      
      <main className={(!isSystemAdmin && !isPublicForm) ? "pt-20" : ""}>
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
      
      <RoleSelectionModal 
        isOpen={showRoleSelectionModal} 
        onClose={() => setShowRoleSelectionModal(false)}
        onSelectRole={handleRoleSelect}
        userName={pendingGoogleUser?.name || 'Guest'}
      />
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

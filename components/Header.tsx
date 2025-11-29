
import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { UserIcon, TicketIcon, CalendarPlusIcon, MegaphoneIcon, SettingsIcon, LogOutIcon, ShieldIcon } from './Icons';
import SignInModal from './SignInModal';

const Header: React.FC = () => {
  const { isAuthenticated, user, logout } = useAuth();
  const [isDropdownOpen, setDropdownOpen] = useState(false);
  const [isSignInModalOpen, setSignInModalOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const navigate = useNavigate();
  const location = useLocation();

  const toggleDropdown = () => setDropdownOpen(!isDropdownOpen);
  
  const handleSignOut = () => {
    logout();
    setDropdownOpen(false);
    navigate('/');
  };

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);
  
  useEffect(() => {
      setDropdownOpen(false);
  }, [location.pathname]);

  const handleNavigation = (path: string) => {
    if (isAuthenticated) {
        navigate(path);
    } else {
        setSignInModalOpen(true);
    }
    setDropdownOpen(false);
  };

  return (
    <>
      <header className="fixed top-0 left-0 right-0 z-50 h-20 flex items-center bg-black/50 backdrop-blur-lg border-b border-neutral-800/50">
        <nav className="w-full flex items-center justify-between">
          <div className="flex items-center container mx-auto max-w-7xl px-6">
            <Link to="/" className="text-3xl font-black tracking-tighter text-white text-glow mr-10">
              Eventsta<span className="text-purple-500">.</span>
            </Link>
            <div className="hidden md:flex items-center space-x-8">
              <Link to="/" className="text-neutral-400 hover:text-white transition-colors duration-200">Discover</Link>
              <button onClick={() => handleNavigation('/events')} className="text-neutral-400 hover:text-white transition-colors duration-200">Host</button>
              <button onClick={() => handleNavigation('/promotions')} className="text-neutral-400 hover:text-white transition-colors duration-200">Promote</button>
            </div>
          </div>

          <div id="auth-container" className="relative" ref={dropdownRef}>
            {isAuthenticated ? (
              <button onClick={toggleDropdown} className={`h-10 w-10 rounded-full flex items-center justify-center border transition-all mr-6 ${user?.isSystemAdmin ? 'bg-purple-900/50 border-purple-500 text-purple-200' : 'bg-neutral-800 border-neutral-700 text-neutral-400 hover:border-purple-500'}`}>
                {user?.isSystemAdmin ? <ShieldIcon className="w-5 h-5" /> : <UserIcon className="w-5 h-5" />}
              </button>
            ) : (
              <button onClick={() => setSignInModalOpen(true)} className="px-5 py-2 bg-purple-600 text-white text-sm font-semibold rounded-l-full hover:bg-purple-500 transition-all duration-300 shadow-lg shadow-purple-500/20 whitespace-nowrap">
                Sign In
              </button>
            )}

            {isDropdownOpen && (
              <div 
                className="absolute top-full right-6 mt-4 w-56 bg-neutral-900 border border-neutral-700 rounded-xl shadow-2xl shadow-black/50 origin-top-right transition-all duration-200 ease-in-out"
                style={{ transform: 'scale(1)', opacity: 1 }}
              >
                <div className="p-2">
                  {user?.isSystemAdmin && (
                     <button onClick={() => handleNavigation('/system-admin')} className="flex items-center w-full px-4 py-2 rounded-lg text-sm text-purple-300 bg-purple-500/10 hover:bg-purple-500/20 transition-colors mb-2 border border-purple-500/20">
                      <ShieldIcon className="w-4 h-4 mr-3" /> Master Admin Panel
                    </button>
                  )}
                  {user?.isArtist && (
                    <button onClick={() => handleNavigation(`/profile/${user.id}`)} className="flex items-center w-full px-4 py-2 rounded-lg text-sm text-neutral-300 hover:bg-neutral-800 hover:text-white transition-colors">
                      <UserIcon className="w-4 h-4 mr-3" /> My Public Profile
                    </button>
                  )}
                  <button onClick={() => handleNavigation('/my-tickets')} className="flex items-center w-full px-4 py-2 rounded-lg text-sm text-neutral-300 hover:bg-neutral-800 hover:text-white transition-colors">
                    <TicketIcon className="w-4 h-4 mr-3" /> My Tickets
                  </button>
                  <button onClick={() => handleNavigation('/events')} className="flex items-center w-full px-4 py-2 rounded-lg text-sm text-neutral-300 hover:bg-neutral-800 hover:text-white transition-colors">
                    <CalendarPlusIcon className="w-4 h-4 mr-3" /> Host Dashboard
                  </button>
                  <button onClick={() => handleNavigation('/promotions')} className="flex items-center w-full px-4 py-2 rounded-lg text-sm text-neutral-300 hover:bg-neutral-800 hover:text-white transition-colors">
                    <MegaphoneIcon className="w-4 h-4 mr-3" /> Promotions
                  </button>
                </div>
                <div className="border-t border-neutral-700/50 p-2">
                  <Link to="/settings" className="flex items-center w-full px-4 py-2 rounded-lg text-sm text-neutral-300 hover:bg-neutral-800 hover:text-white transition-colors">
                    <SettingsIcon className="w-4 h-4 mr-3" /> Settings
                  </Link>
                </div>
                <div className="border-t border-neutral-700/50 p-2">
                  <button onClick={handleSignOut} className="flex items-center w-full px-4 py-2 rounded-lg text-sm text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-colors">
                    <LogOutIcon className="w-4 h-4 mr-3" /> Sign Out
                  </button>
                </div>
              </div>
            )}
          </div>
        </nav>
      </header>
      <SignInModal isOpen={isSignInModalOpen} onClose={() => setSignInModalOpen(false)} />
    </>
  );
};

export default Header;


import React, { useState, useEffect } from 'react';
import Modal from './Modal';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate, useLocation } from 'react-router-dom';
import { ShieldIcon, GoogleIcon, ArrowLeftIcon, MailIcon, XIcon, PlayCircleIcon } from './Icons';
import { User } from '../types';
import * as api from '../services/api';
import { useGoogleLogin } from '@react-oauth/google';


interface SignInModalProps {
  isOpen: boolean;
  onClose: () => void;
  context?: 'default' | 'application'; // New prop
}

const determineRedirectPath = async (user: User, currentPath: string): Promise<string | null> => {
    // 1. Check if there is a pending checkout return path (Highest Priority)
    // This happens if a user clicked "Checkout" and was forced to login.
    const pendingEventId = sessionStorage.getItem('pendingCheckoutEventId');
    if (pendingEventId) {
        // FIX: Re-attach promo code to the URL if it exists, ensuring attribution persists
        const pendingPromo = sessionStorage.getItem('pendingCheckoutPromoCode');
        if (pendingPromo) {
            return `/event/${pendingEventId}?promo=${pendingPromo}`;
        }
        return `/event/${pendingEventId}`;
    }

    // 2. Context Preservation
    // If the user is currently on an event page or a form, we generally want to keep them there
    // so they can continue their journey (viewing event, using promo code, filling form).
    if (currentPath.startsWith('/event/') || currentPath.startsWith('/form/')) {
        return null; // Stay on current page
    }

    // 3. Role-based Routing (Only for users logging in from generic pages like Home)
    
    // Check for System Admin
    if (user.isSystemAdmin) {
        return '/system-admin';
    }

    // Check for active hosting (upcoming events)
    if (user.managedHostIds && user.managedHostIds.length > 0) {
        const hosts = await api.getHostsByIds(user.managedHostIds);
        const allEventIds = hosts.flatMap(h => h.eventIds);
        if (allEventIds.length > 0) {
            const events = await api.getEventsByIds(allEventIds);
            const hasUpcomingEvents = events.some(e => new Date(e.date) > new Date());
            if (hasUpcomingEvents) {
                return '/events';
            }
        }
    }

    // Check for active promotions
    if (user.promoStats && user.promoStats.some(p => p.status === 'active')) {
        return '/promotions';
    }

    // Check for purchased tickets
    if (user.purchasedTickets && user.purchasedTickets.length > 0) {
        return '/my-tickets';
    }

    // 4. Default: Stay on current page (Important for new users)
    return null;
};


const SignInModal: React.FC<SignInModalProps> = ({ isOpen, onClose, context = 'default' }) => {
  const { login, isLoading, refreshUser } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  
  // Flow State
  const [view, setView] = useState<'main' | 'email' | 'name_input' | 'forgot_password'>('main');
  
  // Form State
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [error, setError] = useState('');
  const [forgotPasswordSuccess, setForgotPasswordSuccess] = useState(false);
  const [isCheckingUser, setIsCheckingUser] = useState(false);

  const isApplication = context === 'application';

  // Reset state when modal opens/closes
  useEffect(() => {
      if (isOpen) {
          setView('main');
          setEmail('');
          setPassword('');
          setName('');
          setError('');
          setForgotPasswordSuccess(false);
          setIsCheckingUser(false);
      }
  }, [isOpen]);

  const handleGoogleLogin = async (token: string, email: string, name: string) => {
      try {
          // Attempt to login with Google token directly, passing extra info
          const user = await login('google-one-tap', token, { name, email });
          
          if (user) {
              // FIX: Ensure actual user info is saved if backend used placeholders
              const isPlaceholder = 
                  user.name === 'Google User' || 
                  user.email.includes('placeholder') ||
                  user.email.includes('fake');
              
              const mismatch = user.email !== email || (user.name !== name && name);

              if (isPlaceholder || mismatch) {
                  try {
                      console.log("Updating user profile with Google data...");
                      await api.updateUser(user.id, { name, email });
                      await refreshUser();
                  } catch (updateErr) {
                      console.warn("Failed to auto-update user details after Google login", updateErr);
                  }
              }

              onClose();
              if (context === 'default') {
                  const destination = await determineRedirectPath(user, location.pathname);
                  if (destination) navigate(destination);
              }
          }
      } catch (error) {
          // If login fails (throws), it implies user might not exist or token invalid.
          // We assume it's a new user needing registration.
          console.warn("Google login failed, attempting auto-registration:", error);
          
          try {
              // Automatically register as 'attendee' (creates host profile anyway)
              await api.registerUser(email, name, 'attendee');
              const user = await login('google-one-tap', token, { name, email });
              
              onClose();
              if (user && context === 'default') {
                  const destination = await determineRedirectPath(user, location.pathname);
                  if (destination) navigate(destination);
              }
          } catch (regError: any) {
              setError(regError.message || "Registration failed.");
          }
      }
  };

  const loginToGoogle = useGoogleLogin({
    onSuccess: async (tokenResponse) => {
        // We need user details if registration is required, fetch them
        try {
            const userInfoResponse = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
                headers: { Authorization: `Bearer ${tokenResponse.access_token}` },
            });
            const userInfo = await userInfoResponse.json();
            // Use access_token as the credential for our API
            handleGoogleLogin(tokenResponse.access_token, userInfo.email, userInfo.name);
        } catch (error) {
            console.error("Failed to fetch user info", error);
            setError('Failed to get user info from Google.');
        }
    },
    onError: () => setError('Google Login Failed'),
  });

  const handleEmailSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      setError('');
      if (!email || !password) {
          setError('Please enter both email and password.');
          return;
      }

      setIsCheckingUser(true);

      try {
          // 1. Check if user exists
          let userExists = false;
          try {
              userExists = await api.checkUserExists(email);
          } catch (checkErr: any) {
              // If we get a 404, it might strictly mean user not found depending on API implementation
              // If we get network error, we default to trying login to be safe (let login endpoint handle auth)
              console.warn("Check user failed", checkErr);
              userExists = true; 
          }

          if (!userExists) {
              setIsCheckingUser(false);
              // Go to registration flow
              setView('name_input');
              return;
          }

          // 2. Try Login - pass full credentials to context login which calls api.signIn
          const user = await login('email', `${email}|${password}`); 
          
          if (user) {
              onClose();
              if (context === 'default') {
                  const destination = await determineRedirectPath(user, location.pathname);
                  if (destination) navigate(destination);
              }
          }
      } catch (err: any) {
          // If login fails
          const msg = err.message || '';
          if (msg.includes('not found') || msg.includes('No user')) {
               setView('name_input');
          } else {
               // This handles the "Invalid credentials" error from API
               setError('Incorrect email or password. Please try again.');
          }
      } finally {
          setIsCheckingUser(false);
      }
  };

  const handleNameSubmit = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!name.trim()) {
          setError('Please enter your full name.');
          return;
      }
      
      try {
          // Auto-register with default 'attendee' role
          await api.registerUser(email, name, 'attendee', password);
          // Ensure we pass credentials to login so api.signIn sends the correct password
          const user = await login('email', `${email}|${password}`);
          
          onClose();
          if (user && context === 'default') {
              const destination = await determineRedirectPath(user, location.pathname);
              if (destination) navigate(destination);
          }
      } catch (regError: any) {
          setError(regError.message || "Registration failed.");
      }
  };

  const handleForgotPassword = async (e: React.FormEvent) => {
      e.preventDefault();
      if (!email) {
          setError("Please enter your email address.");
          return;
      }
      try {
          await api.requestPasswordReset(email);
          setForgotPasswordSuccess(true);
      } catch (err) {
          setError("Failed to send reset email.");
      }
  };

  const handleAdminLogin = async () => {
      try {
          const user = await login('admin');
          onClose();
          if (user) {
              navigate('/system-admin');
          }
      } catch (error) {
          setError("Admin login failed.");
      }
  }

  const handleDemoLogin = async () => {
      try {
          const user = await login('demo');
          onClose();
          if (user && context === 'default') {
              const destination = await determineRedirectPath(user, location.pathname);
              if (destination) navigate(destination);
          }
      } catch (error) {
          setError("Demo login failed.");
      }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} showCloseButton={false}>
      <div className="relative w-full max-w-md bg-neutral-900 border border-neutral-800 rounded-2xl shadow-2xl shadow-purple-500/10">
        <button
            onClick={onClose}
            className="absolute top-4 right-4 text-neutral-500 hover:text-white p-2 rounded-full hover:bg-neutral-800 transition-colors z-10"
            aria-label="Close"
        >
            <XIcon className="w-5 h-5" />
        </button>
        <div className="p-8">
            {view === 'main' && (
                <>
                    <h2 className="text-2xl font-bold text-center text-white mb-2">
                        {isApplication ? 'Verify your email to apply' : 'Sign In'}
                    </h2>
                    <p className="text-neutral-400 text-center mb-8">
                        {isApplication ? 'Log in with Google to confirm your submission.' : 'to continue to Eventsta'}
                    </p>
                    
                    {error && <p className="text-red-400 text-sm text-center mb-6 bg-red-900/20 p-3 rounded-lg border border-red-900/50">{error}</p>}

                    <div className="space-y-6">
                        <button
                            onClick={() => loginToGoogle()}
                            disabled={isLoading}
                            className="social-login-btn w-full h-12 px-6 bg-white text-black rounded-full flex items-center justify-center text-sm font-bold hover:bg-neutral-200 transition-colors disabled:opacity-50"
                        >
                            <GoogleIcon className="w-5 h-5 mr-3" />
                            Continue with Google
                        </button>

                        <button
                            onClick={handleDemoLogin}
                            disabled={isLoading}
                            className="w-full h-12 px-6 bg-neutral-800 text-white border border-neutral-700 rounded-full flex items-center justify-center text-sm font-bold hover:bg-neutral-700 transition-colors disabled:opacity-50 group"
                        >
                            <PlayCircleIcon className="w-5 h-5 mr-3 text-purple-400 group-hover:text-purple-300" />
                            Try Demo Account
                        </button>

                        <div className="text-center pt-2">
                            <button 
                                onClick={() => setView('email')}
                                className="text-sm text-neutral-400 hover:text-white font-medium transition-colors underline underline-offset-4 decoration-neutral-700 hover:decoration-white"
                            >
                                User email / password
                            </button>
                        </div>
                    </div>

                    {!isApplication && (
                        <div className="border-t border-neutral-800 mt-8 pt-6 w-full text-center">
                            <button
                                onClick={handleAdminLogin}
                                disabled={isLoading}
                                className="text-neutral-600 text-xs font-medium hover:text-purple-400 transition-colors flex items-center justify-center gap-2 mx-auto"
                            >
                                <ShieldIcon className="w-3 h-3" />
                                System Admin Login
                            </button>
                        </div>
                    )}
                </>
            )}

            {view === 'email' && (
                <form onSubmit={handleEmailSubmit}>
                    <button 
                        type="button" 
                        onClick={() => setView('main')} 
                        className="mb-6 text-neutral-400 hover:text-white transition-colors flex items-center text-sm"
                    >
                        <ArrowLeftIcon className="w-4 h-4 mr-1" /> Back
                    </button>
                    
                    <h2 className="text-2xl font-bold text-white mb-6">
                        {isApplication ? 'Verify Email' : 'Sign In / Create Account'}
                    </h2>
                    
                    <div className="space-y-4">
                        <div>
                            <label className="block text-xs font-medium text-neutral-400 mb-1">Email Address</label>
                            <input 
                                type="email" 
                                value={email}
                                onChange={e => setEmail(e.target.value)}
                                className="w-full h-12 px-4 bg-neutral-800 border border-neutral-700 rounded-lg text-white focus:outline-none focus:border-purple-500 transition-colors"
                                placeholder="name@example.com"
                                required
                            />
                        </div>
                        <div>
                            <div className="flex justify-between mb-1">
                                <label className="block text-xs font-medium text-neutral-400">Password</label>
                                <button type="button" onClick={() => setView('forgot_password')} className="text-xs font-medium text-purple-400 hover:text-purple-300">Forgot Password?</button>
                            </div>
                            <input 
                                type="password" 
                                value={password}
                                onChange={e => setPassword(e.target.value)}
                                className="w-full h-12 px-4 bg-neutral-800 border border-neutral-700 rounded-lg text-white focus:outline-none focus:border-purple-500 transition-colors"
                                placeholder="••••••••"
                                required
                            />
                        </div>
                        
                        {error && <p className="text-red-400 text-sm">{error}</p>}

                        <button
                            type="submit"
                            disabled={isLoading || isCheckingUser}
                            className="w-full h-12 bg-purple-600 hover:bg-purple-500 text-white rounded-full font-bold text-sm transition-colors disabled:opacity-50 shadow-lg shadow-purple-600/20"
                        >
                            {isLoading || isCheckingUser ? 'Processing...' : 'Continue'}
                        </button>
                    </div>
                </form>
            )}

            {view === 'name_input' && (
                <form onSubmit={handleNameSubmit}>
                    <button 
                        type="button" 
                        onClick={() => setView('email')} 
                        className="mb-6 text-neutral-400 hover:text-white transition-colors flex items-center text-sm"
                    >
                        <ArrowLeftIcon className="w-4 h-4 mr-1" /> Back
                    </button>

                    <h2 className="text-2xl font-bold text-white mb-2">Nice to meet you!</h2>
                    <p className="text-neutral-400 text-sm mb-6">It looks like you're new here. Please enter your name to create your account.</p>

                    <div className="space-y-4">
                        <div>
                            <label className="block text-xs font-medium text-neutral-400 mb-1">Full Name</label>
                            <input 
                                type="text" 
                                value={name}
                                onChange={e => setName(e.target.value)}
                                className="w-full h-12 px-4 bg-neutral-800 border border-neutral-700 rounded-lg text-white focus:outline-none focus:border-purple-500 transition-colors"
                                placeholder="e.g. Alex Smith"
                                autoFocus
                                required
                            />
                        </div>

                        {error && <p className="text-red-400 text-sm">{error}</p>}

                        <button
                            type="submit"
                            className="w-full h-12 bg-purple-600 hover:bg-purple-500 text-white rounded-full font-bold text-sm transition-colors shadow-lg shadow-purple-600/20"
                        >
                            {isApplication ? 'Verify & Submit' : 'Create Account'}
                        </button>
                    </div>
                </form>
            )}

            {view === 'forgot_password' && (
                <form onSubmit={handleForgotPassword}>
                    <button 
                        type="button" 
                        onClick={() => setView('email')} 
                        className="mb-6 text-neutral-400 hover:text-white transition-colors flex items-center text-sm"
                    >
                        <ArrowLeftIcon className="w-4 h-4 mr-1" /> Back
                    </button>

                    <h2 className="text-2xl font-bold text-white mb-2">Reset Password</h2>
                    
                    {forgotPasswordSuccess ? (
                        <div className="text-center py-6">
                            <div className="w-16 h-16 bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
                                <MailIcon className="w-8 h-8 text-green-400" />
                            </div>
                            <p className="text-green-400 font-medium">Reset link sent!</p>
                            <p className="text-neutral-400 text-sm mt-2 mb-6">Check your email inbox for instructions.</p>
                            <button 
                                type="button"
                                onClick={() => setView('email')}
                                className="w-full h-12 bg-neutral-800 hover:bg-neutral-700 text-white rounded-full font-bold text-sm transition-colors"
                            >
                                Back to Login
                            </button>
                        </div>
                    ) : (
                        <>
                            <p className="text-neutral-400 text-sm mb-6">Enter your email address and we'll send you a link to reset your password.</p>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-xs font-medium text-neutral-400 mb-1">Email Address</label>
                                    <input 
                                        type="email" 
                                        value={email}
                                        onChange={e => setEmail(e.target.value)}
                                        className="w-full h-12 px-4 bg-neutral-800 border border-neutral-700 rounded-lg text-white focus:outline-none focus:border-purple-500 transition-colors"
                                        placeholder="name@example.com"
                                        required
                                        autoFocus
                                    />
                                </div>

                                {error && <p className="text-red-400 text-sm">{error}</p>}

                                <button
                                    type="submit"
                                    disabled={isLoading}
                                    className="w-full h-12 bg-purple-600 hover:bg-purple-500 text-white rounded-full font-bold text-sm transition-colors disabled:opacity-50"
                                >
                                    Send Reset Link
                                </button>
                            </div>
                        </>
                    )}
                </form>
            )}
        </div>
      </div>
    </Modal>
  );
};

export default SignInModal;

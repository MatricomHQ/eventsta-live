
import React, { useState, useEffect, useMemo, useRef, useCallback } from 'react';
import { useParams, Link, useLocation } from 'react-router-dom';
import * as api from '../services/api';
import { Event as EventType, CheckoutCart, User, PromoCode, Competition } from '../types';
import { CalendarIcon, MapPinIcon, SettingsIcon, MegaphoneIcon, ClipboardIcon, MinusIcon, PlusIcon, PackageIcon, EyeIcon, ArrowLeftIcon, ClockIcon, ArrowRightIcon, UserIcon, CheckCircleIcon } from '../components/Icons';
import QuantitySelector from '../components/QuantitySelector';
import { useAuth } from '../contexts/AuthContext';
import SignInModal from '../components/SignInModal';
import CheckoutModal from '../components/CheckoutModal';
import { RatingDisplay } from '../components/RatingDisplay';
import HostLink from '../components/HostLink';
import FloatingTicketButton from '../components/FloatingTicketButton';
import EventSchedule from '../components/EventSchedule';
import DonationItemSelector from '../components/DonationItemSelector';
import { createEventSlug, extractEventId } from '../utils/url';
import SEOHead from '../components/SEOHead';
import SocialShareButtons from '../components/SocialShareButtons';

const EVENT_DETAIL_SLIDER_DURATION = 5000;

const EventDetails: React.FC = () => {
  const { id: slugParam } = useParams<{ id: string }>();
  const id = extractEventId(slugParam);
  
  const location = useLocation();
  const [event, setEvent] = useState<EventType | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [outgoingIndex, setOutgoingIndex] = useState<number | null>(null); // New state for smooth transitions
  const [cart, setCart] = useState<CheckoutCart>({});
  const { isAuthenticated, user, refreshUser } = useAuth();
  const [isSignInModalOpen, setSignInModalOpen] = useState(false);
  const [isCheckoutModalOpen, setCheckoutModalOpen] = useState(false);
  
  const [isPromoting, setIsPromoting] = useState(false);
  const [promoLink, setPromoLink] = useState('');
  const [isPromotingLoading, setIsPromotingLoading] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isJoiningCompetition, setIsJoiningCompetition] = useState(false);

  // For fundraisers/competitions, which artist to support
  const [selectedRecipient, setSelectedRecipient] = useState<string>('');
  
  // For promo codes
  const [promoCodeInput, setPromoCodeInput] = useState('');
  const [appliedPromoCode, setAppliedPromoCode] = useState<PromoCode | null>(null);
  const [urlTrackingCode, setUrlTrackingCode] = useState<string>(''); // Tracking-only code fallback
  const [promoError, setPromoError] = useState('');
  // Only admins need the full list
  const [eventPromoCodes, setEventPromoCodes] = useState<PromoCode[]>([]);

  // For ended events: Related events from host
  const [moreEventsFromHost, setMoreEventsFromHost] = useState<EventType[]>([]);

  // Refs for slider, filmstrips, and ticket section visibility
  const timerRef = useRef<number | null>(null);
  const mobileFilmstripRef = useRef<HTMLDivElement>(null);
  const desktopFilmstripRef = useRef<HTMLDivElement>(null);
  const ticketSectionRef = useRef<HTMLDivElement>(null);
  const trackPromoRef = useRef<string | null>(null); // Prevent duplicate tracking

  const [isTicketSectionVisible, setIsTicketSectionVisible] = useState(false);


  const isOwner = useMemo(() => {
    if (!user || !event) return false;
    return user.managedHostIds.includes(event.hostId) || user.isSystemAdmin;
  }, [user, event]);
  
  const isCompetitor = useMemo(() => {
    if (!user || !event || !event.competitions || event.competitions.length === 0) return false;
    // Check if user is a competitor in ANY competition for this event
    return event.competitions.some(c => c.competitorIds.includes(user.id));
  }, [user, event]);
  
  const hasActiveCompetition = useMemo(() => {
    if (!event || !event.competitions || event.competitions.length === 0) return false;
    return event.competitions.some(c => c.status === 'ACTIVE' && c.competitorIds.length > 0);
  }, [event]);

  useEffect(() => {
    if (user && event) {
        const existingPromo = user.promoStats.find(p => p.eventId === event.id && p.status === 'active');
        if (existingPromo) {
            setIsPromoting(true);
            setPromoLink(existingPromo.promoLink || `${window.location.origin}/#/event/${createEventSlug(event.title, event.id)}`);
        } else {
            setIsPromoting(false);
            setPromoLink('');
        }
    }
  }, [user, event]);


  useEffect(() => {
    const fetchEvent = async () => {
      if (!id) return;
      try {
        setIsLoading(true);
        const eventData = await api.getEventDetails(id);
        
        // Double check: if host name is generic 'Host' and we have an ID, try fetching host info
        if ((!eventData.hostName || eventData.hostName === 'Host') && eventData.hostId) {
            try {
                const hostData = await api.getHostDetails(eventData.hostId);
                eventData.hostName = hostData.name;
            } catch (hostErr) {
                console.warn("Could not fetch host details to populate name", hostErr);
            }
        }

        setEvent(eventData);
        if (eventData.competitions && eventData.competitions.length > 0 && eventData.competitions[0].competitorIds.length > 0) {
            // Default to first competitor if none selected
            if (!selectedRecipient) {
                setSelectedRecipient(eventData.competitions[0].competitorIds[0]);
            }
        }

        // If event is ended, fetch other events from this host
        if (new Date(eventData.endDate || eventData.date) < new Date()) {
            const otherEvents = await api.getOtherEventsByHost(eventData.hostId, eventData.id);
            setMoreEventsFromHost(otherEvents.slice(0, 3)); // Take top 3
        }

      } catch (err) {
        setError('Failed to load event details.');
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };
    
    // Only owners should fetch full list of codes
    const fetchPromoCodesForAdmin = async () => {
        if (id && isOwner) {
            try {
                const codes = await api.getPromoCodesForEvent(id);
                setEventPromoCodes(codes);
            } catch (e) {
                console.warn("Could not fetch promo codes for admin");
            }
        }
    };

    fetchEvent();
    if (isOwner) fetchPromoCodesForAdmin();
  }, [id, isOwner]);

  // Handle URL Promo Parameters & Tracking
  useEffect(() => {
      const handlePromoLogic = async () => {
          if (!event) return;
          console.debug("[Promo Debug] 🔗 URL Parameter Check. Search:", location.search);
          const searchParams = new URLSearchParams(location.search);
          const urlPromo = searchParams.get('promo');
          
          if (urlPromo) {
              console.debug("[Promo Debug] 🎯 Found promo code in URL:", urlPromo);
              // Store tracking code regardless of validation status
              setUrlTrackingCode(urlPromo);

              // 1. Track Click (Fire and Forget - do not wait for validation)
              if (trackPromoRef.current !== urlPromo) {
                  console.debug(`[Promo Debug] Tracking click for code: ${urlPromo}`);
                  api.trackPromoClick(event.id, urlPromo).catch(e => console.warn("Failed to track promo click", e));
                  trackPromoRef.current = urlPromo;
              }
              
              try {
                  // 2. Validate Code (for Discount Logic)
                  console.debug(`[Promo Debug] ⏳ Validating URL code '${urlPromo}' against event '${event.id}'...`);
                  const result = await api.validatePromoCode(event.id, urlPromo);
                  console.debug("[Promo Debug] 🏁 Validation Result:", result);
                  
                  if (result.valid) {
                      setAppliedPromoCode({
                          id: 'validated-code',
                          eventId: event.id,
                          code: result.code,
                          discountPercent: result.discountPercent,
                          uses: 0,
                          maxUses: null,
                          isActive: true
                      });
                      setPromoCodeInput(result.code);
                  } else {
                      // Code is invalid for discount, but we still keep urlTrackingCode for potential affiliate tracking during checkout
                      console.log("Promo code not valid for discount, treated as tracking only.");
                  }
              } catch (e) {
                  // Ignore validation error from URL param
                  console.warn("Promo validation failed from URL", e);
              }
          } else {
              console.debug("[Promo Debug] ⚪ No promo code found in URL.");
          }
      };
      handlePromoLogic();
  }, [location.search, event]);

  // PENDING CHECKOUT RESTORATION LOGIC
  useEffect(() => {
      if (isAuthenticated && id) {
          const pendingEventId = sessionStorage.getItem('pendingCheckoutEventId');
          
          if (pendingEventId === id) {
              const savedCart = sessionStorage.getItem('pendingCheckoutCart');
              if (savedCart) {
                  try {
                      const parsedCart = JSON.parse(savedCart);
                      setCart(parsedCart);
                      setCheckoutModalOpen(true);
                  } catch (e) {
                      console.error("Failed to restore cart", e);
                  }
              }
              // Clear storage
              sessionStorage.removeItem('pendingCheckoutEventId');
              sessionStorage.removeItem('pendingCheckoutCart');
          }
      }
  }, [isAuthenticated, id]);
  
  // New slider logic with pause/resume and timer reset
  const startTimer = useCallback(() => {
    if (typeof window === 'undefined') return;
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    if (event && event.imageUrls.length > 1) {
        timerRef.current = window.setInterval(() => {
            setActiveIndex((prevIndex) => {
                setOutgoingIndex(prevIndex);
                const nextIndex = (prevIndex + 1) % event.imageUrls.length;
                // After the fade, clear the outgoing index to remove its animation class
                setTimeout(() => {
                    setOutgoingIndex(null);
                }, 1000); // Must match opacity transition duration
                return nextIndex;
            });
        }, EVENT_DETAIL_SLIDER_DURATION);
    }
  }, [event]);

  useEffect(() => {
    startTimer();
    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [startTimer]);
  
  const handleThumbnailClick = (index: number) => {
    if (index === activeIndex) return; // Prevent re-triggering on the same thumbnail
    
    setOutgoingIndex(activeIndex);
    setActiveIndex(index);
    startTimer(); // Reset timer on click
    
    // After the fade, clear the outgoing index
    setTimeout(() => {
        setOutgoingIndex(null);
    }, 1000); // Must match opacity transition duration
  };

  // Effect to scroll the filmstrip to the active thumbnail
  useEffect(() => {
    if (!event || event.imageUrls.length <= 1) return;

    const scrollFilmstrip = (ref: React.RefObject<HTMLDivElement>) => {
        if (ref.current) {
            const activeChild = ref.current.children[activeIndex] as HTMLElement;
            if (activeChild) {
                const container = ref.current;
                const scrollLeft = activeChild.offsetLeft - (container.offsetWidth / 2) + (activeChild.offsetWidth / 2);
                container.scrollTo({
                    left: scrollLeft,
                    behavior: 'smooth'
                });
            }
        }
    };
    
    // Scroll both; only the visible one will matter.
    scrollFilmstrip(mobileFilmstripRef);
    scrollFilmstrip(desktopFilmstripRef);
  }, [activeIndex, event]);

  
    // Observer for ticket section visibility
    useEffect(() => {
        if (typeof window === 'undefined') return;
        const currentRef = ticketSectionRef.current;
        if (!currentRef) return;

        const observer = new IntersectionObserver(
            ([entry]) => {
                setIsTicketSectionVisible(entry.isIntersecting);
            },
            {
                root: null,
                rootMargin: '0px',
                threshold: 0.1, // Trigger when 10% of the element is visible
            }
        );

        observer.observe(currentRef);

        return () => {
            if (currentRef) {
                observer.unobserve(currentRef);
            }
        };
    }, [isLoading]);


  // FIX: Wrap handleQuantityChange in useCallback to prevent infinite re-renders when passed to child components like DonationItemSelector.
  const handleQuantityChange = useCallback((itemType: string, quantity: number, donationAmount?: number) => {
      setCart(prevCart => {
          const newCart = { ...prevCart };
          if (quantity > 0) {
              newCart[itemType] = { quantity, donationAmount };
          } else {
              delete newCart[itemType];
          }
          return newCart;
      });
  }, []);
  
  const totalTicketsInCart = useMemo(() => {
    if (!event) return 0;
    return Object.keys(cart).reduce((total, itemType) => {
        const isTicket = event.tickets.some(t => t.type === itemType);
        if (isTicket) {
            return total + cart[itemType].quantity;
        }
        return total;
    }, 0);
  }, [cart, event]);


  const { totalPrice, discountAmount, finalPrice } = useMemo(() => {
    if (!event) return { totalPrice: 0, discountAmount: 0, finalPrice: 0 };
    let total = 0;
    let discount = 0;

    Object.keys(cart).forEach(itemType => {
        const details = cart[itemType];
        let price = 0;
        let isTicket = false;

        if (event.type === 'ticketed') {
            const ticketOption = event.tickets.find(t => t.type === itemType);
            const addOnOption = event.addOns?.find(a => a.name === itemType);
            
            if (ticketOption) {
                price = ticketOption.price;
                isTicket = true;
            } else if (addOnOption) {
                price = addOnOption.price;
            }
        } else { // fundraiser
            price = details.donationAmount || 0;
        }
        
        const itemTotal = price * details.quantity;
        total += itemTotal;

        // Discount only applies to tickets in ticketed events
        if (appliedPromoCode && event.type === 'ticketed' && isTicket) {
            discount += itemTotal * (appliedPromoCode.discountPercent / 100);
        }
    });
    
    return { totalPrice: total, discountAmount: discount, finalPrice: total - discount };
  }, [cart, event, appliedPromoCode]);

  const handleApplyPromoCode = async () => {
    if (!event) return;
    setPromoError('');
    setAppliedPromoCode(null);
    
    if (!promoCodeInput) return;
    
    console.debug(`[Promo Debug] ✍️ Manual Promo Entry: '${promoCodeInput}'`);

    try {
        // Use the new public validation endpoint
        const result = await api.validatePromoCode(event.id, promoCodeInput);
        if (result.valid) {
            setAppliedPromoCode({
                id: 'validated-code', // Dummy ID since we don't need real ID for display
                eventId: event.id,
                code: result.code,
                discountPercent: result.discountPercent,
                uses: 0,
                maxUses: null,
                isActive: true
            });
            setPromoCodeInput(result.code);
        } else {
            setPromoError('Invalid or expired promo code.');
        }
    } catch (e) {
        setPromoError("Validation failed. Please try again.");
    }
  };

  const removePromoCode = () => {
    setAppliedPromoCode(null);
    setPromoError('');
    setPromoCodeInput('');
  };

  const handleCheckout = () => {
      if (!isAuthenticated) {
          // Save intent to checkout
          if (event) {
              sessionStorage.setItem('pendingCheckoutEventId', event.id);
              sessionStorage.setItem('pendingCheckoutCart', JSON.stringify(cart));
          }
          setSignInModalOpen(true);
      } else {
          setCheckoutModalOpen(true);
      }
  }
  
  const handlePromote = async () => {
    if (!isAuthenticated) {
        setSignInModalOpen(true);
        return;
    }
    if (!user || !event) return;
    setIsPromotingLoading(true);
    try {
        const newPromo: any = await api.startPromotion(user.id, event);
        await refreshUser();
        setIsPromoting(true);
        
        // Use returned code or fallback if response doesn't contain code (depends on backend)
        const code = newPromo.code || newPromo.promo_code || `PROMO_${user.id.slice(0,4)}`;
        
        setPromoLink(`${window.location.origin}/#/event/${createEventSlug(event.title, event.id)}?promo=${code}`);
    } catch (error) {
        console.error("Failed to start promotion:", error);
    } finally {
        setIsPromotingLoading(false);
    }
  };

   const handleJoinCompetition = async () => {
    if (!isAuthenticated) {
        setSignInModalOpen(true);
        return;
    }
    if (!user || !event) return;
    setIsJoiningCompetition(true);
    try {
        // Pass the specific competition ID if multiple exist, assuming UI defaults to first/active
        const targetCompetition = event.competitions?.find(c => c.status === 'ACTIVE') || event.competitions?.[0];
        const competitionId = targetCompetition ? targetCompetition.id : undefined;

        await api.joinCompetition(user.id, event, competitionId);
        await refreshUser();
        // The user is now a competitor and a promoter
        setIsPromoting(true);
        
        // Refresh event data to include new competitor
        const refreshedEvent = await api.getEventDetails(event.id);
        setEvent(refreshedEvent);
    } catch (error) {
        console.error("Failed to join competition:", error);
    } finally {
        setIsJoiningCompetition(false);
    }
  };
  
  const handleCopyLink = () => {
    navigator.clipboard.writeText(promoLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (isLoading) return <div className="text-center py-20 text-neutral-400">Loading event...</div>;
  if (error) return <div className="text-center py-20 text-red-400">{error}</div>;
  if (!event) return <div className="text-center py-20 text-neutral-400">Event not found.</div>;
  
  // DRAFT MODE CHECK
  if (event.status === 'DRAFT' && !isOwner) {
      return (
          <div className="min-h-screen flex flex-col items-center justify-center text-center px-6 -mt-20 bg-[#0a0a0a]">
              <h2 className="text-3xl font-bold text-white mb-4">Event Unavailable</h2>
              <p className="text-neutral-400 max-w-md">This event is currently hidden or does not exist. Please check back later.</p>
              <Link to="/" className="mt-8 px-6 py-3 bg-neutral-800 hover:bg-neutral-700 text-white rounded-full font-semibold transition-colors">
                  Browse Events
              </Link>
          </div>
      );
  }

  const formattedDate = new Date(event.date).toLocaleDateString(undefined, { month: 'long', day: 'numeric', year: 'numeric' });
  const isEventEnded = new Date(event.endDate || event.date) < new Date();
  const isCompetitionEvent = event.competitions && event.competitions.length > 0;

  const Thumbnails = () => (
    <>
      {event!.imageUrls.map((url, index) => (
        <button
          key={index}
          onClick={() => handleThumbnailClick(index)}
          aria-label={`View image ${index + 1}`}
          className={`filmstrip-button relative w-16 h-16 rounded-full flex-shrink-0 focus:outline-none shadow-lg shadow-black/50 ${
            activeIndex === index ? 'is-active' : ''
          }`}
        >
          <div className="w-full h-full rounded-full overflow-hidden">
            <img src={url} alt={`thumbnail ${index + 1}`} className="w-full h-full object-cover" />
          </div>
        </button>
      ))}
    </>
  );

  return (
    <>
      <SEOHead 
        title={event.title}
        description={event.description}
        image={event.imageUrls[0]}
        type="event"
      />

      {/* Draft Banner */}
      {event.status === 'DRAFT' && isOwner && (
          <div className="fixed top-20 left-0 right-0 z-40 bg-yellow-500 text-black px-6 py-3 text-center font-bold text-sm flex items-center justify-center gap-3 shadow-md">
              <EyeIcon className="w-5 h-5" />
              <span>This event is in DRAFT mode. Only you can see this page.</span>
              <Link to={`/event/${event.id}/admin/details`} className="underline hover:text-neutral-800">Edit Details</Link>
          </div>
      )}

      {/* Blurred Background Layer - Fixed, No Parallax */}
      <div 
        className="fixed top-0 left-0 w-full h-screen z-0 pointer-events-none overflow-hidden"
      >
        {event.imageUrls.map((url, index) => (
          <div
            key={`bg-${index}`}
            className="absolute inset-0 bg-cover bg-center transition-opacity duration-[1500ms] ease-in-out"
            style={{ 
                backgroundImage: `url(${url})`, 
                opacity: index === activeIndex ? 1 : 0,
                filter: 'blur(60px) brightness(0.3) saturate(1.2)',
                transform: 'scale(1.2)'
            }}
          />
        ))}
        <div className="absolute inset-0 bg-black/40"></div>
      </div>

      <section className={`relative w-full -mt-20 pt-20 ${event.status === 'DRAFT' ? 'mt-8' : ''}`}>
        <div className="md:container md:mx-auto md:max-w-7xl md:px-6">
            {/* Main hero container: flex for mobile (col) and desktop (row) */}
            <div className="relative z-10 flex flex-col md:flex-row md:items-center">
            
            {/* Image Container: Full width on mobile, 5/12 on desktop. */}
            <div
              className="relative aspect-video md:aspect-auto md:h-[75vh] w-full md:w-5/12 md:flex-shrink-0 shadow-[0_0_35px_rgba(0,0,0,0.8)] overflow-visible md:overflow-hidden md:rounded-bl-2xl md:rounded-br-2xl"
            >
                <div className="relative h-full w-full overflow-hidden md:rounded-bl-2xl md:rounded-br-2xl">
                    {event.imageUrls.map((url, index) => {
                        const isActive = index === activeIndex;
                        const kenburnsClass = `event-details-kenburns-${(index % 3) + 1}`;
                        
                        return (
                            <img
                                key={index}
                                src={url}
                                alt={`${event.title} view ${index + 1}`}
                                className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-1000 ease-in-out ${isActive ? kenburnsClass : ''}`}
                                style={{ opacity: isActive ? 1 : 0 }}
                            />
                        );
                    })}
                </div>
                {/* MOBILE-ONLY FILMSTRIP */}
                {event.imageUrls.length > 1 && (
                    <div className="md:hidden absolute bottom-0 translate-y-1/2 left-1/2 -translate-x-1/2 w-full max-w-[90%] z-10">
                        <div 
                            ref={mobileFilmstripRef}
                            className="flex items-center justify-center space-x-3 overflow-x-auto px-12 py-12"
                            style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                        >
                            <Thumbnails />
                        </div>
                    </div>
                )}
            </div>

            {/* Details Container: Padded on mobile, specific left padding on desktop. */}
            <div
              className="w-full md:w-7/12 flex-grow flex items-center px-6 pt-24 pb-8 md:py-0 md:px-0 md:pl-16"
            >
                <div>
                    {isEventEnded && <p className="text-yellow-400 font-bold mb-2 text-glow flex items-center gap-2"><ClockIcon className="w-4 h-4" /> PAST EVENT</p>}
                    
                    {/* ENHANCED PROMO BADGE */}
                    {appliedPromoCode && appliedPromoCode.discountPercent > 0 && event.type === 'ticketed' && !isEventEnded && (
                        <div className="mb-4 inline-block bg-gradient-to-r from-green-600/30 to-green-500/20 border border-green-500/40 rounded-lg px-4 py-2 backdrop-blur-md shadow-lg shadow-green-900/20 animate-fade-in-up">
                            <span className="text-base font-bold text-green-300 flex items-center gap-2">
                                <CheckCircleIcon className="w-5 h-5 text-green-400" />
                                Deal Unlocked: <span className="text-white">{appliedPromoCode.discountPercent}% Off Tickets</span>
                            </span>
                        </div>
                    )}

                    <h1 className="text-4xl font-bold tracking-tighter text-white md:text-7xl">{event.title}</h1>
                    <HostLink 
                        hostId={event.hostId} 
                        hostName={event.hostName} 
                        className="mt-1 text-2xl font-light text-purple-400 md:text-4xl hover:text-purple-300"
                    />
                    
                    <SocialShareButtons url={window.location.href} title={event.title} />

                    <div className="mt-6 flex flex-col sm:flex-row sm:items-center sm:space-x-6 text-lg text-neutral-200 space-y-3 sm:space-y-0">
                        <div className="flex items-center space-x-2"><CalendarIcon className="w-5 h-5 text-neutral-400" /><span>{formattedDate}</span></div>
                        <div className="flex items-center space-x-2"><MapPinIcon className="w-5 h-5 text-neutral-400" /><span>{event.location}</span></div>
                    </div>

                    {/* DESKTOP-ONLY FILMSTRIP */}
                    {event.imageUrls.length > 1 && (
                      <div className="hidden md:block mt-8">
                        <style>{`
                          .overflow-x-auto::-webkit-scrollbar { display: none; }
                          
                          @keyframes breathe-ring {
                              0%, 100% {
                                  transform: scale(1);
                                  box-shadow: 0 0 4px rgba(168, 85, 247, 0.4);
                                  opacity: 0.7;
                              }
                              50% {
                                  transform: scale(1.02);
                                  box-shadow: 0 0 8px rgba(168, 85, 247, 0.6);
                                  opacity: 1;
                              }
                          }

                          .filmstrip-button {
                            transform: scale(1);
                            transition: transform 0.4s cubic-bezier(0.175, 0.885, 0.32, 1.275); /* Springy scale */
                          }

                          .filmstrip-button::before {
                              content: "";
                              position: absolute;
                              inset: -2px; /* Creates space for the ring */
                              border-radius: 50%;
                              border: 1px solid rgba(168, 85, 247, 0); /* purple-500 with alpha */
                              opacity: 0;
                              transform: scale(0.8);
                              transition: opacity 0.4s ease-out, transform 0.4s cubic-bezier(0.16, 1, 0.3, 1), border-color 0.4s ease;
                              pointer-events: none;
                          }
                          
                          .filmstrip-button.is-active {
                            transform: scale(1.1);
                          }

                          .filmstrip-button.is-active::before {
                              opacity: 1;
                              transform: scale(1);
                              animation: breathe-ring 2.5s ease-in-out infinite;
                              border-color: rgba(168, 85, 247, 0.4);
                          }

                          .filmstrip-button::after {
                            content: "";
                            position: absolute;
                            inset: 0;
                            border-radius: 50%;
                            background-color: black;
                            opacity: 0.4;
                            transition: opacity 0.4s ease;
                          }

                          .filmstrip-button.is-active::after, .filmstrip-button:hover::after {
                              opacity: 0;
                          }

                          .filmstrip-button:focus-visible {
                            outline: 2px solid #a855f7;
                            outline-offset: 4px;
                          }
                        `}</style>
                        <div 
                          ref={desktopFilmstripRef}
                          className="flex items-center space-x-3 overflow-x-auto py-12 -mx-12 px-12"
                          style={{ scrollbarWidth: 'none', msOverflowStyle: 'none' }}
                        >
                          <Thumbnails />
                        </div>
                      </div>
                    )}

                    {event.rating && event.reviewCount && (
                        <div className="mt-6">
                            <RatingDisplay rating={event.rating} reviewCount={event.reviewCount} />
                        </div>
                    )}
                </div>
            </div>
            </div>
        </div>
      </section>

      <div className="relative z-10 container mx-auto max-w-7xl px-6 pt-16 pb-16">
         {isOwner && (
            <div className="mb-12">
                 <Link to={`/event/${event.id}/admin/reports`} className="w-full md:w-auto flex items-center justify-center px-8 py-4 bg-purple-600 text-white text-base font-semibold rounded-full hover:bg-purple-500 transition-all duration-300 shadow-lg shadow-purple-500/20 space-x-3">
                    <SettingsIcon className="w-5 h-5" />
                    <span>Manage Event</span>
                </Link>
            </div>
        )}
        <div className="flex flex-col lg:flex-row gap-16">
          <div className="w-full lg:w-2/3">
             <div className="bg-neutral-900/50 border border-neutral-800 rounded-2xl p-8 backdrop-blur-md">
                <h2 className="text-2xl font-bold text-white mb-6">About This Event</h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
                    <div className="flex items-start gap-4"><CalendarIcon className="w-8 h-8 text-purple-400 flex-shrink-0 mt-1" /><div><h3 className="text-lg font-semibold text-white">Date & Time</h3><p className="text-neutral-400">{new Date(event.date).toLocaleString('en-US', { dateStyle: 'full', timeStyle: 'short' })}</p></div></div>
                    <div className="flex items-start gap-4"><MapPinIcon className="w-8 h-8 text-purple-400 flex-shrink-0 mt-1" /><div><h3 className="text-lg font-semibold text-white">Location</h3><p className="text-neutral-400">{event.location}</p></div></div>
                </div>
                <div className="border-t border-neutral-700 my-6"></div>
                <p className="text-neutral-300 leading-relaxed">{event.description}</p>
            </div>
            
            {event && <EventSchedule event={event} />}

          </div>
          <div ref={ticketSectionRef} className="w-full lg:w-1/3">
            <div className="sticky top-28">
                {isEventEnded ? (
                    <div className="bg-neutral-900/50 border border-neutral-800 rounded-2xl p-6 backdrop-blur-md">
                        <h2 className="text-xl font-bold text-white mb-4">Event Ended</h2>
                        <p className="text-neutral-400 mb-6 text-sm">This event has passed. Check out what's next!</p>
                        
                        {moreEventsFromHost.length > 0 ? (
                            <div>
                                <p className="text-xs font-bold text-neutral-500 uppercase tracking-wider mb-3">Upcoming from {event.hostName}</p>
                                <div className="space-y-3">
                                    {moreEventsFromHost.map(otherEvent => (
                                        <Link key={otherEvent.id} to={`/event/${createEventSlug(otherEvent.title, otherEvent.id)}`} className="block group">
                                            <div className="flex items-center gap-3 p-2 rounded-lg hover:bg-neutral-800 transition-colors">
                                                <img src={otherEvent.imageUrls[0]} className="w-12 h-12 rounded-lg object-cover" alt="" />
                                                <div className="min-w-0">
                                                    <p className="text-white font-medium text-sm truncate group-hover:text-purple-400 transition-colors">{otherEvent.title}</p>
                                                    <p className="text-xs text-neutral-500">{new Date(otherEvent.date).toLocaleDateString()}</p>
                                                </div>
                                            </div>
                                        </Link>
                                    ))}
                                </div>
                                <div className="mt-6 pt-4 border-t border-neutral-800 text-center">
                                     <Link to={`/host/${event.hostId}`} className="text-sm text-purple-400 hover:text-purple-300 font-semibold">View Host Profile</Link>
                                </div>
                            </div>
                        ) : (
                            <div className="text-center py-4">
                                <Link 
                                    to={`/host/${event.hostId}`}
                                    className="inline-block px-6 py-3 bg-neutral-800 hover:bg-neutral-700 text-white rounded-full font-medium transition-colors"
                                >
                                    View {event.hostName}'s Profile
                                </Link>
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="bg-neutral-900/50 border border-neutral-800 rounded-2xl p-6 backdrop-blur-md">
                        <h2 className="text-2xl font-bold text-white mb-6">{event.type === 'ticketed' ? 'Select Tickets' : 'Make a Donation'}</h2>
                        <div className="space-y-4 mb-6">
                            {event.type === 'ticketed' && event.tickets.map((ticket, idx) => {
                                // Calculate discount for this ticket
                                const hasDiscount = appliedPromoCode && appliedPromoCode.discountPercent > 0 && event.type === 'ticketed';
                                const discountPct = hasDiscount ? appliedPromoCode!.discountPercent : 0;
                                const discountedPrice = ticket.price * (1 - discountPct / 100);
                                
                                // Check availability
                                const now = new Date();
                                const isSalesEnded = ticket.saleEndDate ? new Date(ticket.saleEndDate) < now : false;
                                const isSoldOut = (ticket.quantity !== undefined && (ticket.sold || 0) >= ticket.quantity);
                                const isUnavailable = isSalesEnded || isSoldOut;

                                return (
                                    <div key={ticket.id || ticket.type || idx} className={`bg-neutral-900 border border-neutral-800 rounded-xl p-5 flex items-center justify-between gap-4 ${isUnavailable ? 'opacity-60 grayscale' : ''}`}>
                                        <div>
                                            <h4 className="text-lg font-semibold text-white">{ticket.type}</h4>
                                            <p className="text-neutral-400 text-sm mb-2">{ticket.description || ''}</p>
                                            {hasDiscount && !isUnavailable ? (
                                                <div className="flex flex-col">
                                                    <span className="text-sm text-neutral-500 line-through">${ticket.price.toFixed(2)}</span>
                                                    <span className="text-xl font-bold text-green-400">${discountedPrice.toFixed(2)}</span>
                                                </div>
                                            ) : (
                                                <span className="text-xl font-bold text-purple-400">${ticket.price.toFixed(2)}</span>
                                            )}
                                            
                                            {isSoldOut && <p className="text-red-500 text-xs font-bold mt-1 uppercase">Sold Out</p>}
                                            {isSalesEnded && !isSoldOut && <p className="text-yellow-500 text-xs font-bold mt-1 uppercase">Sales Ended</p>}
                                        </div>
                                        {isUnavailable ? (
                                            <button disabled className="px-3 py-1.5 bg-neutral-800 text-neutral-500 text-xs font-bold rounded cursor-not-allowed">Unavailable</button>
                                        ) : (
                                            <QuantitySelector initialQuantity={cart[ticket.type]?.quantity} ticketType={ticket.type} onChange={(type, qty) => handleQuantityChange(type, qty)} />
                                        )}
                                    </div>
                                );
                            })}
                            
                            {event.type === 'fundraiser' && event.tickets.map((ticket, idx) => (
                                <DonationItemSelector key={ticket.id || ticket.type || idx} item={ticket} onChange={handleQuantityChange} cartItem={cart[ticket.type]} />
                            ))}

                            {event.addOns && event.addOns.length > 0 && (
                                <div className={`pt-4 transition-opacity ${totalTicketsInCart === 0 ? 'opacity-50' : ''}`}>
                                    <h3 className="text-lg font-bold text-white mb-4 flex items-center"><PackageIcon className="w-5 h-5 mr-3 text-purple-400"/>Add-ons</h3>
                                     <div className="space-y-4">
                                        {event.type === 'ticketed' && event.addOns.map(addOn => (
                                            <div key={addOn.name} className="bg-neutral-900 border border-neutral-800 rounded-xl p-5 flex items-center justify-between gap-4">
                                                <div>
                                                    <h4 className="text-lg font-semibold text-white">{addOn.name}</h4>
                                                    <p className="text-neutral-400 text-sm mb-2">{addOn.description || ''}</p>
                                                    {/* Add-ons do not get discounted */}
                                                    <span className="text-xl font-bold text-purple-400">${addOn.price.toFixed(2)}</span>
                                                </div>
                                                <QuantitySelector disabled={totalTicketsInCart === 0} initialQuantity={cart[addOn.name]?.quantity} ticketType={addOn.name} onChange={(type, qty) => handleQuantityChange(type, qty)} />
                                            </div>
                                        ))}
                                        {event.type === 'fundraiser' && event.addOns.map(addOn => (
                                            <DonationItemSelector key={addOn.name} item={addOn} onChange={handleQuantityChange} cartItem={cart[addOn.name]} />
                                        ))}
                                     </div>
                                     {totalTicketsInCart === 0 && <p className="text-xs text-neutral-500 text-center mt-2">You must select a ticket before adding add-ons.</p>}
                                </div>
                            )}
                        </div>
                        {hasActiveCompetition && (
                          <div className="mb-6">
                              <label htmlFor="support-artist" className="block text-sm font-medium text-neutral-300 mb-2">Support a Competitor</label>
                              <CompetitorDropdown eventId={event.id} selected={selectedRecipient} onSelect={setSelectedRecipient} />
                          </div>
                        )}
                        {event.type === 'ticketed' && (
                          <div className="border-t border-neutral-800 pt-4">
                              {appliedPromoCode ? (
                                  <div className="bg-green-500/10 border border-green-500/20 text-green-300 rounded-lg p-3 text-sm flex justify-between items-center">
                                      <div>
                                          <span className="font-bold">'{appliedPromoCode.code}'</span> applied! Saving ${discountAmount.toFixed(2)}.
                                      </div>
                                      <button onClick={removePromoCode} className="font-bold text-lg">&times;</button>
                                  </div>
                              ) : (
                                  <div className="flex gap-2">
                                      <input 
                                          type="text" 
                                          value={promoCodeInput}
                                          onChange={e => setPromoCodeInput(e.target.value.toUpperCase())}
                                          placeholder="Promo Code" 
                                          className="w-full h-12 px-4 bg-neutral-800 border border-neutral-700 rounded-lg text-white" 
                                      />
                                      <button 
                                          onClick={handleApplyPromoCode}
                                          className="h-12 px-5 bg-purple-600 text-white font-semibold rounded-lg hover:bg-purple-500 disabled:opacity-50"
                                          disabled={!promoCodeInput}
                                      >
                                          Apply
                                      </button>
                                  </div>
                              )}
                              {promoError && <p className="text-red-400 text-xs mt-2">{promoError}</p>}
                          </div>
                        )}
                        <div className="border-t border-neutral-800 pt-4 flex justify-between items-center mb-6 mt-4">
                            <span className="text-lg font-semibold text-neutral-300">Total</span>
                            <span id="event-total-price" className="text-3xl font-bold text-white">${finalPrice.toFixed(2)}</span>
                        </div>
                        <button onClick={handleCheckout} disabled={totalPrice === 0} className="w-full h-14 px-6 bg-purple-600 text-white text-lg font-semibold rounded-full hover:bg-purple-500 transition-all duration-300 shadow-lg shadow-purple-500/20 disabled:bg-neutral-700 disabled:text-neutral-500 disabled:shadow-none">
                            {event.type === 'ticketed' ? 'Checkout' : 'Donate Now'}
                        </button>
                        <div className="border-t border-neutral-800 mt-6 pt-6">
                            {isCompetitionEvent && !isCompetitor && !isOwner && !isEventEnded && (
                                <button onClick={handleJoinCompetition} disabled={isJoiningCompetition} className="w-full h-12 px-6 bg-green-500/20 text-green-300 text-sm font-semibold rounded-full hover:bg-green-500/30 hover:text-green-200 transition-colors flex items-center justify-center space-x-2 mb-4">
                                    <span>Join "{event.competitions?.find(c => c.status === 'ACTIVE')?.name || event.competitions?.[0].name}"</span>
                                </button>
                            )}
                            {!isPromoting && !isEventEnded ? (
                                 <button onClick={handlePromote} disabled={isPromotingLoading || isOwner} className="w-full h-12 px-6 bg-purple-500/20 text-purple-300 text-sm font-semibold rounded-full hover:bg-purple-500/30 hover:text-purple-200 transition-colors flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed">
                                    <MegaphoneIcon className="w-4 h-4" />
                                    <span>
                                        {event.defaultPromoDiscount > 0 
                                            ? `Promote: Earn ${event.commission}% + Give ${event.defaultPromoDiscount}% Off`
                                            : `Promote & Earn ${event.commission}%`}
                                    </span>
                                </button>
                            ) : isPromoting ? (
                                <div className="text-center">
                                    <p className="text-sm text-green-400 mb-3 font-semibold">✓ You are promoting this event!</p>
                                    <div className="flex">
                                        <input type="text" readOnly value={promoLink} className="w-full h-10 px-4 bg-neutral-800 border border-neutral-700 rounded-l-full text-white text-sm focus:outline-none"/>
                                        <button onClick={handleCopyLink} className="h-10 px-4 bg-purple-600 text-white text-sm font-semibold rounded-r-full hover:bg-purple-500 transition-colors flex-shrink-0">
                                            {copied ? 'Copied!' : <ClipboardIcon className="w-4 h-4" />}
                                        </button>
                                    </div>
                                     <Link to="/promotions" className="text-xs text-neutral-400 hover:text-white mt-3 inline-block">Manage promotions &rarr;</Link>
                                </div>
                            ) : null}
                       </div>
                    </div>
                )}
            </div>
          </div>
        </div>
      </div>
      <SignInModal isOpen={isSignInModalOpen} onClose={() => setSignInModalOpen(false)} />
      <CheckoutModal 
        isOpen={isCheckoutModalOpen}
        onClose={() => setCheckoutModalOpen(false)}
        cart={cart}
        event={event}
        recipientUserId={selectedRecipient}
        promoCode={appliedPromoCode?.code || urlTrackingCode}
        appliedDiscountPercent={appliedPromoCode?.discountPercent}
      />
      {/* Pass necessary props to FloatingTicketButton to enable drawer functionality */}
      <FloatingTicketButton 
        ticketSectionRef={ticketSectionRef}
        isVisible={!isTicketSectionVisible && !isEventEnded && event.status === 'PUBLISHED'}
        event={event}
        cart={cart}
        onQuantityChange={handleQuantityChange}
        onCheckout={handleCheckout}
        appliedPromoCode={appliedPromoCode}
      />
    </>
  );
};

// --- Sub-components for EventDetails Page ---
const CompetitorDropdown: React.FC<{ eventId: string, selected: string, onSelect: (userId: string) => void }> = ({ eventId, selected, onSelect }) => {
    const [competitors, setCompetitors] = useState<User[]>([]);
    
    useEffect(() => {
        const fetchCompetitors = async () => {
            try {
                const event = await api.getEventDetails(eventId);
                if (event.competitions && event.competitions.length > 0) {
                     const comp = event.competitions.find(c => c.status === 'ACTIVE') || event.competitions[0];
                     if (comp && comp.competitorIds.length > 0) {
                         const users = await api.getUsersByIds(comp.competitorIds);
                         setCompetitors(users);
                     }
                }
            } catch (e) {
                console.error("Failed to load competitors", e);
            }
        };
        fetchCompetitors();
    }, [eventId]);

    if (competitors.length === 0) return null;

    return (
        <div className="relative">
            <select 
                id="support-artist"
                value={selected} 
                onChange={(e) => onSelect(e.target.value)}
                className="w-full h-12 px-4 bg-neutral-800 border border-neutral-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500 appearance-none"
            >
                {competitors.map(comp => (
                    <option key={comp.id} value={comp.id}>Support {comp.name}</option>
                ))}
            </select>
             <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-neutral-400">
                <svg className="fill-current h-4 w-4" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
            </div>
        </div>
    );
};

export default EventDetails;

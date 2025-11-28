
import React, { useState, useEffect, useMemo } from 'react';
import { useParams, useLocation, useNavigate } from 'react-router-dom';
import * as api from '../services/api';
import { Host, Event as EventType, Review } from '../types';
import { EventCard } from '../components/EventCard';
import { RatingDisplay } from '../components/RatingDisplay';
import { useAuth } from '../contexts/AuthContext';
import { ArrowLeftIcon } from '../components/Icons';
import SEOHead from '../components/SEOHead';

const HostPage: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const { user } = useAuth();
    const location = useLocation();
    const navigate = useNavigate();
    const [host, setHost] = useState<Host | null>(null);
    const [events, setEvents] = useState<EventType[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<'upcoming' | 'past'>('upcoming');

    const fromLocation = location.state?.from;

    useEffect(() => {
        const fetchHostData = async () => {
            if (!id) return;
            try {
                setIsLoading(true);
                const hostData = await api.getHostDetails(id);
                setHost(hostData);
                if (hostData.eventIds.length > 0) {
                    const eventData = await api.getEventsByIds(hostData.eventIds);
                    setEvents(eventData);
                }
            } catch (err) {
                setError('Failed to load host details.');
                console.error(err);
            } finally {
                setIsLoading(false);
            }
        };
        fetchHostData();
    }, [id]);

    const { upcomingEvents, pastEvents } = useMemo(() => {
        const now = new Date();
        const upcoming = events
            .filter(event => new Date(event.date) >= now)
            .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
        const past = events
            .filter(event => new Date(event.date) < now)
            .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        return { upcomingEvents: upcoming, pastEvents: past };
    }, [events]);
    
    const averageRating = useMemo(() => {
        if (!host || host.reviews.length === 0) return 0;
        const total = host.reviews.reduce((sum, review) => sum + review.rating, 0);
        return total / host.reviews.length;
    }, [host]);

    if (isLoading) return <div className="text-center py-20 text-neutral-400">Loading host profile...</div>;
    if (error) return <div className="text-center py-20 text-red-400">{error}</div>;
    if (!host) return <div className="text-center py-20 text-neutral-400">Host not found.</div>;
    
    const eventsToShow = activeTab === 'upcoming' ? upcomingEvents : pastEvents;
    const canLeaveReview = host.reviewsEnabled && user && user.id !== host.ownerUserId;

    return (
        <>
            <SEOHead 
                title={host.name}
                description={host.description || `Check out events by ${host.name} on Eventsta.`}
                image={host.coverImageUrl || host.imageUrl}
                type="profile"
            />

            {/* Blurred Background Layer - Fixed, No Scroll Movement */}
            <div 
                className="fixed inset-0 z-[-1]"
            >
                <div
                    className="absolute inset-0 bg-cover bg-center filter blur-3xl transition-opacity duration-1000 ease-in-out"
                    style={{ backgroundImage: `url(${host.coverImageUrl})`, transform: 'scale(1.2)' }}
                />
            </div>
            <div className="fixed inset-0 bg-black/70 z-[-1]"></div>

            <div className="-mt-20">
                {/* Hero Section */}
                <div className="relative h-[50vh] min-h-[400px] w-full overflow-hidden flex flex-col justify-end">
                    <div
                        className="absolute top-0 left-0 w-full h-[120%] bg-cover bg-center"
                        style={{ backgroundImage: `url(${host.coverImageUrl})` }}
                    />
                    <div className="absolute inset-0 bg-gradient-to-t from-[#0a0a0a] via-[#0a0a0a]/50 to-transparent" />
                    
                    <div className="relative container mx-auto max-w-7xl px-6 pb-8 z-10">
                        <div className="flex flex-col items-center md:flex-row md:items-end">
                        <div className="w-32 h-32 md:w-40 md:h-40 rounded-full border-4 border-[#0a0a0a] bg-neutral-800 overflow-hidden flex-shrink-0">
                            <img src={host.imageUrl} alt={host.name} className="w-full h-full object-cover" />
                        </div>
                        <div className="mt-4 md:mt-0 md:ml-6 text-center md:text-left">
                            <h1 className="text-3xl md:text-5xl font-bold text-white text-glow">{host.name}</h1>
                            {host.reviewsEnabled && host.reviews.length > 0 && (
                                <div className="mt-2 flex justify-center md:justify-start">
                                    <RatingDisplay rating={averageRating} reviewCount={host.reviews.length} />
                                </div>
                            )}
                        </div>
                        </div>
                    </div>
                </div>

                {/* Main Content */}
                <div className="container mx-auto max-w-7xl px-6 py-16">
                    {fromLocation && (
                        <button onClick={() => navigate(fromLocation)} className="flex items-center space-x-2 text-sm font-semibold text-purple-400 hover:text-purple-300 transition-colors mb-8">
                            <ArrowLeftIcon className="w-4 h-4" />
                            <span>Back to previous page</span>
                        </button>
                    )}
                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-x-12 gap-y-8">
                        {/* Left/Main Column - Events */}
                        <div className="lg:col-span-2">
                            <div className="border-b border-neutral-800 mb-8">
                                <nav className="flex -mb-px space-x-8">
                                    <button onClick={() => setActiveTab('upcoming')} className={`tab-btn whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-all ${activeTab === 'upcoming' ? 'border-purple-500 text-white' : 'border-transparent text-neutral-400 hover:text-white'}`}>
                                        Upcoming Events ({upcomingEvents.length})
                                    </button>
                                    <button onClick={() => setActiveTab('past')} className={`tab-btn whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-all ${activeTab === 'past' ? 'border-purple-500 text-white' : 'border-transparent text-neutral-400 hover:text-white'}`}>
                                        Past Events ({pastEvents.length})
                                    </button>
                                </nav>
                            </div>
                            <div className="space-y-8">
                                {eventsToShow.length > 0 ? (
                                    eventsToShow.map(event => <EventCard key={event.id} event={event} />)
                                ) : (
                                    <div className="text-center py-16 bg-neutral-900/50 border border-neutral-800 rounded-2xl">
                                        <p className="text-neutral-500">No {activeTab} events found.</p>
                                    </div>
                                )}
                            </div>
                        </div>
                        
                        {/* Right/Side Column - About & Reviews */}
                        <div className="relative">
                            <div className="lg:sticky top-28 space-y-8">
                                {host.description && (
                                    <div className="bg-neutral-900/50 border border-neutral-800 rounded-2xl p-6 backdrop-blur-md">
                                        <h2 className="text-xl font-bold text-white mb-4">About {host.name}</h2>
                                        <p className="text-neutral-300 leading-relaxed text-sm">{host.description}</p>
                                    </div>
                                )}
                                {host.reviewsEnabled && host.reviews.length > 0 && (
                                     <div className="bg-neutral-900/50 border border-neutral-800 rounded-2xl p-6 backdrop-blur-md">
                                        <h2 className="text-xl font-bold text-white mb-4">Reviews</h2>
                                        <div className="space-y-4">
                                            {host.reviews.slice(0, 3).map((review, index) => (
                                                <div key={index} className="border-b border-neutral-800 pb-4 last:border-b-0 last:pb-0">
                                                    <RatingDisplay rating={review.rating} reviewCount={0} size="sm" />
                                                    <p className="text-neutral-300 text-sm mt-2">"{review.comment}"</p>
                                                    <p className="text-neutral-500 text-xs mt-2 text-right">- {review.author}</p>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                                {canLeaveReview && (
                                     <button className="w-full py-3 text-sm font-semibold text-center bg-purple-600 hover:bg-purple-500 rounded-lg text-white transition-colors">
                                        Leave a Review
                                     </button>
                                )}
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </>
    );
};

export default HostPage;

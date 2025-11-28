














import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import * as api from '../services/api';
import { Event, Host } from '../types';
import HostEventFlow from '../components/HostEventFlow';
import PortalHeader from '../components/PortalHeader';
import { PlusIcon, SettingsIcon, MapPinIcon, ArrowRightIcon, BarChartIcon, CalendarPlusIcon, DollarSignIcon, ClockIcon } from '../components/Icons';
import HostFinancialsDashboard from '../components/HostFinancialsDashboard';

const HostPortal: React.FC = () => {
    const { user, isAuthenticated, refreshUser } = useAuth();
    const navigate = useNavigate();
    const [isHostFlowOpen, setHostFlowOpen] = useState(false);
    const [selectedHostForNewEvent, setSelectedHostForNewEvent] = useState<Host | null>(null);
    const [activeTab, setActiveTab] = useState<'events' | 'financials'>('events');

    useEffect(() => {
        if (!isAuthenticated) {
        navigate('/');
        }
    }, [isAuthenticated, navigate]);

    const handleOpenHostFlow = (host: Host) => {
        setSelectedHostForNewEvent(host);
        setHostFlowOpen(true);
    };

    const handleEventCreated = (newEvent: Event) => {
        refreshUser();
        setHostFlowOpen(false);
        navigate(`/event/${newEvent.id}/admin/details`);
    };

    if (!user) {
        return <div className="text-center py-20">Loading...</div>;
    }

    return (
        <>
            <div className="container mx-auto max-w-7xl px-6 py-16">
                <PortalHeader 
                    title={activeTab === 'events' ? "Events" : "Financials"}
                    subtitle={activeTab === 'events' ? "Manage your host profiles and create new events." : "Track earnings, fees, and payouts across all your events."}
                >
                    <div className="flex bg-neutral-900 p-1 rounded-lg border border-neutral-800">
                        <button 
                            onClick={() => setActiveTab('events')}
                            className={`px-4 py-2 text-sm font-medium rounded-md transition-all flex items-center gap-2 ${activeTab === 'events' ? 'bg-neutral-800 text-white shadow-sm' : 'text-neutral-400 hover:text-white'}`}
                        >
                            <CalendarPlusIcon className="w-4 h-4" /> Events
                        </button>
                        <button 
                            onClick={() => setActiveTab('financials')}
                            className={`px-4 py-2 text-sm font-medium rounded-md transition-all flex items-center gap-2 ${activeTab === 'financials' ? 'bg-neutral-800 text-white shadow-sm' : 'text-neutral-400 hover:text-white'}`}
                        >
                            <DollarSignIcon className="w-4 h-4" /> Financials
                        </button>
                    </div>
                </PortalHeader>
                
                {activeTab === 'events' ? (
                    <HostingContent user={user} onAddEventClick={handleOpenHostFlow} />
                ) : (
                    <HostFinancialsDashboard user={user} />
                )}
            </div>
            <HostEventFlow 
                isOpen={isHostFlowOpen} 
                onClose={() => setHostFlowOpen(false)} 
                onEventCreated={handleEventCreated}
                host={selectedHostForNewEvent}
            />
        </>
    );
};

const HostingContent: React.FC<{ user: any, onAddEventClick: (host: Host) => void }> = ({ user, onAddEventClick }) => {
    const navigate = useNavigate();
    const [hosts, setHosts] = useState<Host[]>([]);
    const [events, setEvents] = useState<Event[]>([]);
    const [selectedHostId, setSelectedHostId] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [eventFilter, setEventFilter] = useState<'upcoming' | 'ended'>('upcoming');

    const fetchHosts = async () => {
        if (user.managedHostIds.length > 0) {
            const fetchedHosts = await api.getHostsByIds(user.managedHostIds);
            setHosts(fetchedHosts);
            if (!selectedHostId) {
                setSelectedHostId(fetchedHosts[0]?.id || null);
            }
        }
        setIsLoading(false);
    };

    useEffect(() => {
        setIsLoading(true);
        fetchHosts();
    }, [user.managedHostIds]);

    useEffect(() => {
        const fetchEvents = async () => {
            if (!selectedHostId) {
                setEvents([]);
                return;
            };
            // Fetch directly by host_id, ignoring the potentially stale eventIds array in the host object
            try {
                const fetchedEvents = await api.getEventsByHost(selectedHostId);
                setEvents(fetchedEvents.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()));
            } catch (e) {
                console.error("Failed to fetch events for host", e);
                setEvents([]);
            }
        };
        if (selectedHostId) {
            fetchEvents();
        }
    }, [selectedHostId]);

    const selectedHost = hosts.find(h => h.id === selectedHostId);

    const filteredEvents = events.filter(event => {
        const isEnded = new Date(event.endDate || event.date) < new Date();
        return eventFilter === 'upcoming' ? !isEnded : isEnded;
    });

    if (isLoading) {
        return <p className="text-neutral-500">Loading hosts...</p>;
    }

    return (
        <div className="flex flex-col md:flex-row gap-8">
            <div className="w-full md:w-1/3 lg:w-1/4">
                <h3 className="text-xl font-bold text-white mb-4">Your Hosts</h3>
                <div className="space-y-2 mb-4">
                    {hosts.map(host => (
                         <button 
                            key={host.id} 
                            onClick={() => setSelectedHostId(host.id)} 
                            className={`w-full text-left px-4 py-3 font-medium rounded-lg transition-colors ${selectedHostId === host.id ? 'bg-purple-600/20 text-purple-300' : 'text-neutral-300 hover:bg-neutral-800'}`}
                         >
                            {host.name}
                        </button>
                    ))}
                </div>
                <button onClick={() => navigate('/settings', { state: { defaultTab: 'hosts' }})} className="w-full px-4 py-3 text-sm font-semibold text-purple-400 hover:text-white bg-purple-500/10 hover:bg-purple-500/20 rounded-lg transition-colors flex items-center justify-center space-x-2">
                    <span>Manage Host Profiles</span>
                    <ArrowRightIcon className="w-4 h-4" />
                </button>
            </div>
            <div className="w-full md:w-2/3 lg:w-3/4">
                {selectedHost ? (
                    <div>
                         <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center mb-6 gap-4">
                            <h3 className="text-2xl font-bold text-white">Events for {selectedHost.name}</h3>
                            <button onClick={() => onAddEventClick(selectedHost)} className="w-full sm:w-auto px-6 py-3 bg-purple-600 text-white text-sm font-semibold rounded-full hover:bg-purple-500 transition-all duration-300 shadow-lg shadow-purple-500/20 flex items-center justify-center space-x-2">
                                <PlusIcon className="w-4 h-4" /><span>Host New Event</span>
                            </button>
                        </div>

                        {/* Event Filters */}
                        <div className="flex border-b border-neutral-800 mb-6">
                            <button 
                                onClick={() => setEventFilter('upcoming')}
                                className={`pb-3 px-4 text-sm font-medium border-b-2 transition-colors ${eventFilter === 'upcoming' ? 'border-purple-500 text-white' : 'border-transparent text-neutral-400 hover:text-white'}`}
                            >
                                Upcoming
                            </button>
                            <button 
                                onClick={() => setEventFilter('ended')}
                                className={`pb-3 px-4 text-sm font-medium border-b-2 transition-colors ${eventFilter === 'ended' ? 'border-purple-500 text-white' : 'border-transparent text-neutral-400 hover:text-white'}`}
                            >
                                Ended
                            </button>
                        </div>

                        {filteredEvents.length > 0 ? (
                             <div className="space-y-6">
                                {filteredEvents.map(event => (
                                    <div key={event.id} className="event-card w-full text-left bg-neutral-900 rounded-2xl overflow-hidden flex flex-row shadow-lg border border-neutral-800 relative group">
                                        {event.status === 'DRAFT' && (
                                            <div className="absolute top-3 left-3 z-10 bg-neutral-800 text-neutral-300 text-xs font-bold px-2 py-1 rounded border border-neutral-700 shadow-md">
                                                DRAFT
                                            </div>
                                        )}
                                        {eventFilter === 'ended' && (
                                            <div className="absolute top-3 left-3 z-10 bg-neutral-800 text-neutral-400 text-xs font-bold px-2 py-1 rounded border border-neutral-700 shadow-md flex items-center gap-1">
                                                <ClockIcon className="w-3 h-3" /> ENDED
                                            </div>
                                        )}
                                        <div className="relative w-32 md:w-40 flex-shrink-0 bg-neutral-800">
                                            <img src={event.imageUrls[0]} alt={event.title} className={`w-full h-36 object-cover ${event.status === 'DRAFT' || eventFilter === 'ended' ? 'opacity-50 grayscale' : ''}`}/>
                                        </div>
                                        <div className="p-5 md:p-6 flex-grow flex flex-col justify-center overflow-hidden">
                                            <h3 className="text-lg md:text-xl font-bold text-white mb-2 truncate">{event.title}</h3>
                                            <p className="text-neutral-400 text-sm flex items-center gap-2 truncate">
                                                <MapPinIcon className="w-4 h-4 text-neutral-500 shrink-0" />
                                                <span>{new Date(event.date).toLocaleDateString()} • {event.location}</span>
                                            </p>
                                        </div>
                                        <div className="flex-shrink-0 flex flex-col">
                                            <button 
                                                onClick={() => navigate(`/event/${event.id}/admin/reports`)} 
                                                className="flex-1 flex flex-col items-center justify-center w-28 bg-neutral-900 hover:bg-purple-600 text-neutral-400 hover:text-white transition-all duration-300 border-b border-neutral-800"
                                                aria-label={`Manage event ${event.title}`}
                                            >
                                                <SettingsIcon className="w-6 h-6" />
                                                <span className="text-xs font-medium mt-1">MANAGE</span>
                                            </button>
                                            <button 
                                                onClick={() => navigate(`/event/${event.id}/admin/reports`)} 
                                                className="flex-1 flex flex-col items-center justify-center w-28 bg-neutral-900 hover:bg-blue-600 text-neutral-400 hover:text-white transition-all duration-300"
                                                aria-label={`View reports for ${event.title}`}
                                            >
                                                <BarChartIcon className="w-6 h-6" />
                                                <span className="text-xs font-medium mt-1">REPORTS</span>
                                            </button>
                                        </div>
                                    </div>
                                ))
                            }
                            </div>
                        ) : (
                             <div className="text-center py-16 bg-neutral-900/50 border-2 border-dashed border-neutral-800 rounded-2xl">
                                <CalendarPlusIcon className="w-12 h-12 mx-auto text-neutral-600 mb-4" />
                                <h3 className="text-xl font-bold text-white">
                                    {eventFilter === 'upcoming' ? 'No Upcoming Events' : 'No Past Events'}
                                </h3>
                                <p className="text-neutral-500 mt-2 mb-6 max-w-md mx-auto">
                                    {eventFilter === 'upcoming' ? "Ready to get the party started?" : "Your completed events will appear here."}
                                </p>
                                {eventFilter === 'upcoming' && (
                                    <button onClick={() => onAddEventClick(selectedHost)} className="px-6 py-3 bg-purple-600 text-white text-sm font-semibold rounded-full hover:bg-purple-500 transition-all duration-300 shadow-lg shadow-purple-500/20 flex items-center justify-center space-x-2 mx-auto">
                                        <PlusIcon className="w-4 h-4" /><span>Host New Event</span>
                                    </button>
                                )}
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="text-center py-10">
                        <h3 className="text-xl font-bold text-white mb-2">No Host Accounts Found</h3>
                        <p className="text-neutral-500">Create a host profile in the settings to get started.</p>
                         <button onClick={() => navigate('/settings', { state: { defaultTab: 'hosts' }})} className="mt-6 px-5 py-2 bg-purple-600 text-white text-sm font-semibold rounded-full hover:bg-purple-500 transition-all duration-300 shadow-lg shadow-purple-500/20">
                            Go to Settings
                          </button>
                    </div>
                )}
            </div>
        </div>
    );
};

export default HostPortal;

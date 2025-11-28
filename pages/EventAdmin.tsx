
import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Navigate } from 'react-router-dom';
import * as api from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { Event as EventType } from '../types';
import { extractEventId } from '../utils/url';

// Import new modular components
import AdminSidebar from '../components/admin/AdminSidebar';
import ReportsTab from '../components/admin/ReportsTab';
import CheckInTab from '../components/admin/CheckInTab';
import DetailsTab from '../components/admin/DetailsTab';
import TicketingTab from '../components/admin/TicketingTab'; // NEW
import MarketingTab from '../components/admin/MarketingTab'; // NEW
import SectionsTab from '../components/admin/SectionsTab';
import ScheduleTab from '../components/admin/ScheduleTab';
import OrdersTab from '../components/admin/OrdersTab';

const EventAdmin: React.FC = () => {
    const { id: slugParam, tab } = useParams<{ id: string, tab: string }>();
    const eventId = extractEventId(slugParam);
    const navigate = useNavigate();
    const { user, isAuthenticated } = useAuth();
    
    const [event, setEvent] = useState<EventType | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const activeTab = tab || 'reports';

    const fetchEvent = useCallback(async () => {
        if (!eventId) {
            navigate('/events');
            return;
        }
        try {
            const eventData = await api.getEventDetails(eventId);
            
            if (user && (user.isSystemAdmin || user.managedHostIds.includes(eventData.hostId))) {
                setEvent(eventData);
            } else {
                setError("You are not authorized to manage this event.");
            }
        } catch (err) {
            setError('Failed to load event details.');
            console.error(err);
        } finally {
            setIsLoading(false);
        }
    }, [eventId, user, navigate]);
    
    useEffect(() => {
        if (!isAuthenticated) {
            navigate('/');
            return;
        }
        if (user) {
            fetchEvent();
        }
    }, [user, isAuthenticated, fetchEvent, navigate]);

    const renderContent = () => {
        if (!event) return null;
        switch (activeTab) {
            case 'reports': return <ReportsTab eventId={event.id} />;
            case 'checkin': return <CheckInTab eventId={event.id} />;
            case 'details': return <DetailsTab event={event} onEventUpdate={fetchEvent}/>;
            case 'ticketing': return <TicketingTab event={event} onEventUpdate={fetchEvent} />;
            case 'marketing': return <MarketingTab event={event} onEventUpdate={fetchEvent} />;
            case 'sections': return <SectionsTab event={event} onEventUpdate={fetchEvent} />;
            case 'schedule': return <ScheduleTab event={event} onEventUpdate={fetchEvent} />;
            case 'orders': return <OrdersTab eventId={event.id} />;
            default: return <Navigate to={`/event/${eventId}/admin/reports`} replace />;
        }
    };

    if (isLoading) return <div className="text-center py-20 text-neutral-400">Loading Event Dashboard...</div>;
    if (error) return <div className="text-center py-20 text-red-400">{error}</div>;
    if (!event) return <div className="text-center py-20 text-neutral-400">Event not found.</div>;

    return (
        <div className="container mx-auto max-w-7xl px-6 py-16">
             <div className="flex flex-col md:flex-row gap-8 lg:gap-12">
                <AdminSidebar event={event} activeTab={activeTab} user={user} />
                <main className="flex-1 min-w-0">
                    {renderContent()}
                </main>
             </div>
        </div>
    );
};

export default EventAdmin;

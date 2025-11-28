
import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import * as api from '../../services/api';
import { Event as EventType, TicketOption } from '../../types';
import TicketEditor from '../TicketEditor';

const TicketsTab: React.FC<{ event: EventType, onEventUpdate: () => void }> = ({ event, onEventUpdate }) => {
    const { user } = useAuth();
    const [tickets, setTickets] = useState<TicketOption[]>(event.tickets);
    const [isSaving, setIsSaving] = useState(false);

    const handleSave = async () => {
        if (!user) return;
        setIsSaving(true);
        try {
            await api.updateEvent(user.id, event.id, { tickets });
            onEventUpdate();
            alert("Tickets updated!");
        } catch (e) {
            console.error(e);
            alert("Failed to update tickets.");
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="space-y-6 max-w-3xl">
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold tracking-tight text-white">{event.type === 'fundraiser' ? 'Donation Tiers' : 'Tickets'}</h1>
                <button onClick={handleSave} disabled={isSaving} className="bg-purple-600 text-white px-6 py-2 rounded-full font-semibold disabled:opacity-50">
                    {isSaving ? 'Saving...' : 'Save Changes'}
                </button>
            </div>
            <TicketEditor tickets={tickets} onTicketsChange={setTickets} isFundraiser={event.type === 'fundraiser'} />
        </div>
    );
};

export default TicketsTab;


import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import * as api from '../services/api';
import { PurchasedTicket } from '../types';
import TicketViewModal from '../components/TicketViewModal';
import PortalHeader from '../components/PortalHeader';
import { CalendarIcon, EyeIcon } from '../components/Icons';

interface PurchasedTicketWithEventImage extends PurchasedTicket {
  imageUrl: string;
}

const UserPortal: React.FC = () => {
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const [isTicketViewModalOpen, setTicketViewModalOpen] = useState(false);
  const [selectedTicket, setSelectedTicket] = useState<PurchasedTicket | null>(null);
  const [ticketsWithDetails, setTicketsWithDetails] = useState<PurchasedTicketWithEventImage[]>([]);

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/');
    }
  }, [isAuthenticated, navigate]);

  useEffect(() => {
    const fetchTicketEventDetails = async () => {
      if (user && user.purchasedTickets.length > 0) {
        const eventIds = user.purchasedTickets.map(t => t.eventId);
        const uniqueEventIds = [...new Set(eventIds)];
        try {
          const events = await api.getEventsByIds(uniqueEventIds);
          const eventsMap = new Map(events.map(e => [e.id, e]));

          const ticketsDetails = user.purchasedTickets.map(ticket => {
            const event = eventsMap.get(ticket.eventId);
            return {
              ...ticket,
              imageUrl: event?.imageUrls[0] || `https://picsum.photos/seed/${ticket.eventId}/400/400`
            };
          });
          setTicketsWithDetails(ticketsDetails);
        } catch (error) {
          console.error("Failed to fetch event details for tickets:", error);
          const ticketsDetails = user.purchasedTickets.map(ticket => ({
            ...ticket,
            imageUrl: `https://picsum.photos/seed/${ticket.eventId}/400/400`
          }));
          setTicketsWithDetails(ticketsDetails);
        }
      } else if (user && user.purchasedTickets.length === 0) {
        setTicketsWithDetails([]);
      }
    };

    fetchTicketEventDetails();
  }, [user]);

  const handleViewTicket = (ticket: PurchasedTicket) => {
    setSelectedTicket(ticket);
    setTicketViewModalOpen(true);
  };

  if (!user) {
    return <div className="text-center py-20">Loading...</div>;
  }

  return (
    <>
      <div className="container mx-auto max-w-7xl px-6 py-16">
        <PortalHeader 
            title="My Tickets"
            subtitle="View and manage all your purchased event tickets."
        />
        <div className="space-y-6">
            {ticketsWithDetails.length > 0 ? (
            ticketsWithDetails.map(ticket => (
                <button key={ticket.id} onClick={() => handleViewTicket(ticket)} className="event-card group w-full text-left bg-neutral-900 rounded-2xl overflow-hidden flex flex-row shadow-lg border border-neutral-800 hover:border-purple-500 hover:shadow-purple-500/10 hover:-translate-y-1 transition-all duration-300">
                <div className="relative w-32 md:w-40 flex-shrink-0 bg-neutral-800"><img src={ticket.imageUrl} alt={ticket.eventName} className="w-full h-36 object-cover"/></div>
                <div className="p-5 md:p-6 flex-grow flex flex-col justify-center overflow-hidden">
                    <span className="text-sm font-semibold text-purple-400 mb-1 block">{ticket.ticketType.toUpperCase()} (x{ticket.qty})</span>
                    <h3 className="text-lg md:text-xl font-bold text-white mb-2 truncate">{ticket.eventName}</h3>
                    <p className="text-neutral-400 text-sm flex items-center gap-2 truncate"><CalendarIcon className="w-4 h-4 text-neutral-500 shrink-0" /><span>Purchased: {new Date(ticket.purchaseDate).toLocaleDateString()}</span></p>
                </div>
                <div className="flex-shrink-0 flex flex-col items-center justify-center w-16 md:w-20 bg-neutral-900 group-hover:bg-purple-600 text-neutral-400 group-hover:text-white transition-all duration-300">
                    <EyeIcon className="w-6 h-6" /><span className="text-xs font-medium mt-1">VIEW</span>
                </div>
                </button>
            ))
            ) : (
            <p className="text-neutral-500">You haven't purchased any tickets yet.</p>
            )}
        </div>
      </div>
      <TicketViewModal 
        isOpen={isTicketViewModalOpen}
        onClose={() => setTicketViewModalOpen(false)}
        ticket={selectedTicket}
      />
    </>
  );
};

export default UserPortal;

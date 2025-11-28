
import React, { useState, useEffect } from 'react';
import Modal from './Modal';
import { useAuth } from '../contexts/AuthContext';
import { getEventDetails } from '../services/api';
import { PurchasedTicket, Event as EventType } from '../types';
import { CalendarIcon, MapPinIcon, UserIcon, XIcon } from './Icons';
import QRCode from "qrcode";

interface TicketViewModalProps {
  isOpen: boolean;
  onClose: () => void;
  ticket: PurchasedTicket | null;
}

const abbreviateTicketType = (type: string): string => {
    if (!type) return '';
    return type
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase();
};

const TicketViewModal: React.FC<TicketViewModalProps> = ({ isOpen, onClose, ticket }) => {
  const { user } = useAuth();
  const [event, setEvent] = useState<EventType | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTicketIndex, setActiveTicketIndex] = useState(0);
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('');

  useEffect(() => {
    if (isOpen && ticket) {
      const fetchEvent = async () => {
        setIsLoading(true);
        setError(null);
        try {
          const eventData = await getEventDetails(ticket.eventId);
          setEvent(eventData);
        } catch (err) {
          setError('Failed to load event details.');
          console.error(err);
        } finally {
          setIsLoading(false);
        }
      };
      fetchEvent();
      // Reset active ticket when a new one is opened
      setActiveTicketIndex(0);
    }
  }, [isOpen, ticket]);

  const ticketArray = ticket ? Array.from({ length: ticket.qty }, (_, i) => i) : [];
  
  // This format must match the parsing logic in api.ts validateTicket
  // Format: {orderId}-{ticketIndex}
  const safeOrderId = ticket?.orderId || 'unknown_order';
  const qrValue = `${safeOrderId}-${activeTicketIndex}`;

  useEffect(() => {
      if (qrValue && isOpen) {
          QRCode.toDataURL(qrValue, { 
              width: 300,
              margin: 1,
              color: {
                  dark: '#000000',
                  light: '#ffffff'
              },
              errorCorrectionLevel: 'H'
          })
          .then((url) => {
              setQrCodeUrl(url);
          })
          .catch((err) => {
              console.error("Error generating QR code", err);
          });
      }
  }, [qrValue, isOpen]);

  if (!isOpen || !ticket) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} showCloseButton={false}>
      <div className="relative w-full max-w-4xl bg-neutral-900 border border-neutral-800 rounded-2xl shadow-2xl shadow-purple-500/10 flex flex-col md:flex-row overflow-hidden">
        
        {/* Custom Close Button */}
        <button 
            onClick={onClose}
            className="absolute top-3 right-3 z-50 p-2 text-neutral-400 hover:text-white bg-black/40 hover:bg-black/60 backdrop-blur-md rounded-full transition-colors"
            aria-label="Close"
        >
            <XIcon className="w-5 h-5" />
        </button>

        <div className="w-full md:w-1/4 bg-neutral-950/50 p-4 border-b md:border-b-0 md:border-r border-neutral-800">
            <h3 className="text-lg font-bold text-white mb-4 px-2">Tickets</h3>
            <div className="flex md:flex-col space-x-2 md:space-x-0 md:space-y-2 overflow-x-auto md:overflow-visible pb-2 md:pb-0">
              {ticketArray.map(index => (
                <button
                  key={index}
                  onClick={() => setActiveTicketIndex(index)}
                  className={`w-full text-left px-4 py-3 rounded-lg text-sm font-medium transition-colors flex-shrink-0 whitespace-nowrap ${
                    activeTicketIndex === index
                      ? 'bg-purple-600 text-white'
                      : 'text-neutral-300 hover:bg-neutral-800'
                  }`}
                >
                  {abbreviateTicketType(ticket.ticketType)} - {index + 1}
                </button>
              ))}
            </div>
        </div>
        
        <div className="flex-1">
          {isLoading ? (
            <div className="flex items-center justify-center h-full min-h-[400px]">
              <p className="text-neutral-400">Loading Ticket...</p>
            </div>
          ) : error || !event ? (
            <div className="flex items-center justify-center h-full min-h-[400px]">
              <p className="text-red-400">{error || 'Could not load event information.'}</p>
            </div>
          ) : (
            <div className="relative overflow-hidden h-full flex flex-col">
                <div className="absolute inset-x-0 top-0 h-48">
                    <img src={event.imageUrls[0]} alt="" className="w-full h-full object-cover filter blur-md opacity-30" />
                    <div className="absolute inset-0 bg-gradient-to-t from-neutral-900 to-transparent"></div>
                </div>

                <div className="relative p-8 flex-grow flex flex-col items-center justify-center">
                    <div className="bg-white/95 rounded-2xl p-6 md:p-8 flex flex-col items-center shadow-2xl shadow-black/50 text-black max-w-sm w-full mx-auto transform transition-all">
                        <div className="bg-white p-1 rounded-lg mb-4 shadow-sm border border-gray-100">
                            {qrCodeUrl ? (
                                <img 
                                    src={qrCodeUrl} 
                                    alt="Ticket QR Code" 
                                    className="w-40 h-40 object-contain"
                                />
                            ) : (
                                <div className="w-40 h-40 flex items-center justify-center bg-gray-100 text-gray-400 text-xs">
                                    Generating QR...
                                </div>
                            )}
                        </div>
                        <span className="text-xs font-mono text-neutral-500 mb-4 tracking-wider">
                           ID: {ticket.id.slice(0, 8)}-{activeTicketIndex + 1}
                        </span>
                        
                        <div className="w-full border-t border-dashed border-neutral-400 mb-4"></div>

                        <h2 className="w-full text-xl md:text-2xl font-extrabold text-center tracking-tight mb-1 truncate" title={event.title}>{event.title}</h2>
                        <p className="text-lg font-semibold text-purple-700 mb-4">{ticket.ticketType}</p>
                        
                        <div className="space-y-3 text-sm text-neutral-700 w-full">
                            <div className="flex items-center"><UserIcon className="w-4 h-4 mr-3 flex-shrink-0" /><span className="font-medium">{user?.name}</span></div>
                            <div className="flex items-center"><CalendarIcon className="w-4 h-4 mr-3 flex-shrink-0" /><span>{new Date(event.date).toLocaleString('en-US', { dateStyle: 'full', timeStyle: 'short' })}</span></div>
                            <div className="flex items-center"><MapPinIcon className="w-4 h-4 mr-3 flex-shrink-0" /><span>{event.location}</span></div>
                        </div>

                    </div>
                </div>
            </div>
          )}
        </div>
      </div>
    </Modal>
  );
};

export default TicketViewModal;

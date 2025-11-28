
import React, { useState, useEffect, useRef } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import * as api from '../services/api';
import { Order, Event as EventType } from '../types';
import TicketViewModal from '../components/TicketViewModal';
import PortalHeader from '../components/PortalHeader';
import { CalendarIcon, EyeIcon, TicketIcon, ClockIcon, XCircleIcon, MapPinIcon, PackageIcon, ArrowLeftIcon } from '../components/Icons';

// Helper for FLIP animation
interface Rect {
    top: number;
    left: number;
    width: number;
    height: number;
}

const UserPortal: React.FC = () => {
  const { user, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  
  const [activeTab, setActiveTab] = useState<'available' | 'used'>('available');
  const [orders, setOrders] = useState<Order[]>([]);
  const [eventsMap, setEventsMap] = useState<Map<string, EventType>>(new Map());
  const [isLoading, setIsLoading] = useState(true);

  // Expansion State
  const [expandedOrderId, setExpandedOrderId] = useState<string | null>(null);
  const [originRect, setOriginRect] = useState<Rect | null>(null);
  
  // QR Modal State
  const [selectedTicketItem, setSelectedTicketItem] = useState<{ id: string; type: string; name: string; holderName: string } | null>(null);

  // Refs for items to capture position
  const orderRefs = useRef<Map<string, HTMLButtonElement>>(new Map());

  useEffect(() => {
    if (!isAuthenticated) {
      navigate('/');
    }
  }, [isAuthenticated, navigate]);

  useEffect(() => {
    const fetchOrderData = async () => {
      if (user) {
        setIsLoading(true);
        try {
          const myOrders = await api.getUserOrders();
          setOrders(myOrders);

          if (myOrders.length > 0) {
              const eventIds = [...new Set(myOrders.map(o => o.eventId))];
              const eventPromises = eventIds.map(id => api.getEventDetails(id).catch(e => null));
              const eventsResults = await Promise.all(eventPromises);
              const events = eventsResults.filter(e => e !== null);
              setEventsMap(new Map(events.map(e => [e!.id, e!])));
          }
        } catch (error) {
          console.error("Failed to fetch user orders:", error);
        } finally {
          setIsLoading(false);
        }
      } else {
        setOrders([]);
        setIsLoading(false);
      }
    };

    fetchOrderData();
  }, [user]);

  const handleExpandOrder = (orderId: string) => {
      const el = orderRefs.current.get(orderId);
      if (el) {
          const rect = el.getBoundingClientRect();
          setOriginRect({
              top: rect.top,
              left: rect.left,
              width: rect.width,
              height: rect.height
          });
          setExpandedOrderId(orderId);
      }
  };

  const handleCloseExpanded = () => {
      setExpandedOrderId(null);
      // Wait for animation to finish before clearing rect? 
      // For simplicity, we just clear immediately, the component unmounts.
      setTimeout(() => setOriginRect(null), 500); 
  };

  const handleItemClick = (ticketId: string, type: string, name: string) => {
      setSelectedTicketItem({
          id: ticketId,
          type,
          name,
          holderName: user?.name || 'Guest'
      });
  };

  if (!user) {
    return <div className="text-center py-20 text-neutral-400">Loading...</div>;
  }

  const displayedOrders = orders.filter(order => {
      const event = eventsMap.get(order.eventId);
      const isPast = event ? new Date(event.endDate || event.date) < new Date() : false;
      if (activeTab === 'available') return order.status === 'Completed' && !isPast;
      return order.status !== 'Completed' || isPast;
  }).sort((a, b) => new Date(b.purchaseDate).getTime() - new Date(a.purchaseDate).getTime());

  const expandedOrder = orders.find(o => o.orderId === expandedOrderId);
  const expandedEvent = expandedOrder ? eventsMap.get(expandedOrder.eventId) : null;

  return (
    <>
      <div className="container mx-auto max-w-7xl px-6 py-16 relative">
        <PortalHeader 
            title="My Tickets"
            subtitle="View and manage all your purchased event tickets."
        >
            <div className="flex bg-neutral-900 p-1 rounded-lg border border-neutral-800">
                <button 
                    onClick={() => setActiveTab('available')}
                    className={`px-4 py-2 text-sm font-medium rounded-md transition-all flex items-center gap-2 ${activeTab === 'available' ? 'bg-neutral-800 text-white shadow-sm' : 'text-neutral-400 hover:text-white'}`}
                >
                    <TicketIcon className="w-4 h-4" /> Available
                </button>
                <button 
                    onClick={() => setActiveTab('used')}
                    className={`px-4 py-2 text-sm font-medium rounded-md transition-all flex items-center gap-2 ${activeTab === 'used' ? 'bg-neutral-800 text-white shadow-sm' : 'text-neutral-400 hover:text-white'}`}
                >
                    <ClockIcon className="w-4 h-4" /> Past / Cancelled
                </button>
            </div>
        </PortalHeader>

        {isLoading ? (
            <div className="text-center py-12 text-neutral-500">Loading orders...</div>
        ) : (
            <div className="space-y-6">
                {displayedOrders.length > 0 ? (
                displayedOrders.map(order => {
                    const event = eventsMap.get(order.eventId);
                    const eventImage = event?.imageUrls[0] || `https://picsum.photos/seed/${order.eventId}/400/400`;
                    const eventName = event?.title || 'Unknown Event';
                    const summary = order.items.map(item => `${item.quantity} x ${item.ticketType}`).join(', ');
                    const isRefunded = order.status === 'Refunded';

                    // If this order is the one expanded, render a placeholder to keep layout stable
                    if (expandedOrderId === order.orderId) {
                        // FIX: Use the captured height to prevent layout shifts ("the shove")
                        const placeholderHeight = originRect ? originRect.height : '9rem';
                        return <div key={order.orderId} style={{ height: placeholderHeight }} className="w-full rounded-2xl bg-transparent transition-all"></div>;
                    }

                    return (
                        <button 
                            key={order.orderId} 
                            ref={el => { if (el) orderRefs.current.set(order.orderId, el); }}
                            onClick={() => handleExpandOrder(order.orderId)} 
                            className={`event-card group w-full text-left bg-neutral-900 rounded-2xl overflow-hidden flex flex-row shadow-lg border border-neutral-800 transition-all duration-300 ${activeTab === 'available' ? 'hover:border-purple-500 hover:shadow-purple-500/10 hover:-translate-y-1' : 'opacity-75 hover:opacity-100 hover:border-neutral-700'}`}
                        >
                            <div className="relative w-32 md:w-40 flex-shrink-0 bg-neutral-800 h-full min-h-[9rem]">
                                <img src={eventImage} alt={eventName} className={`w-full h-full object-cover absolute inset-0 ${activeTab === 'used' ? 'grayscale' : ''}`}/>
                                {isRefunded && (
                                    <div className="absolute inset-0 bg-black/60 flex items-center justify-center backdrop-blur-sm">
                                        <div className="text-red-400 font-bold text-xs uppercase border border-red-400/50 px-2 py-1 rounded bg-red-900/20 flex items-center gap-1">
                                            <XCircleIcon className="w-3 h-3" /> Refunded
                                        </div>
                                    </div>
                                )}
                            </div>
                            <div className="p-5 md:p-6 flex-grow flex flex-col justify-center overflow-hidden">
                                <div className="flex justify-between items-start">
                                    <span className="text-sm font-semibold text-purple-400 mb-1 block">ORDER #{order.orderId.slice(-6).toUpperCase()}</span>
                                    {isRefunded && <span className="text-xs font-bold text-red-500 uppercase tracking-wider">Cancelled</span>}
                                </div>
                                <h3 className={`text-lg md:text-xl font-bold text-white mb-1 truncate ${isRefunded ? 'line-through text-neutral-500' : ''}`}>{eventName}</h3>
                                <p className="text-neutral-300 text-sm mb-2 truncate">{summary}</p>
                                
                                <div className="flex flex-col sm:flex-row sm:items-center gap-3 text-neutral-400 text-xs">
                                    <span className="flex items-center gap-2"><CalendarIcon className="w-3.5 h-3.5 shrink-0" />Purchased: {new Date(order.purchaseDate).toLocaleDateString()}</span>
                                </div>
                            </div>
                            <div className={`flex-shrink-0 flex flex-col items-center justify-center w-16 md:w-24 bg-neutral-950 transition-all duration-300 ${activeTab === 'available' ? 'group-hover:bg-purple-600 text-neutral-400 group-hover:text-white' : 'text-neutral-600'}`}>
                                <EyeIcon className="w-6 h-6" />
                                <span className="text-xs font-medium mt-1 text-center px-1">VIEW</span>
                            </div>
                        </button>
                    );
                })
                ) : (
                <div className="text-center py-12 border-2 border-dashed border-neutral-800 rounded-2xl">
                    <p className="text-neutral-500">
                        {activeTab === 'available' ? "You don't have any upcoming orders." : "No past orders found."}
                    </p>
                </div>
                )}
            </div>
        )}
      </div>

      {/* EXPANDED VIEW OVERLAY */}
      {expandedOrder && expandedEvent && originRect && (
          <ExpandedOrderOverlay 
            order={expandedOrder}
            event={expandedEvent}
            originRect={originRect}
            onClose={handleCloseExpanded}
            onItemClick={handleItemClick}
          />
      )}

      {/* QR MODAL */}
      <TicketViewModal 
        isOpen={!!selectedTicketItem}
        onClose={() => setSelectedTicketItem(null)}
        ticketData={selectedTicketItem}
        eventData={selectedTicketItem && expandedEvent ? expandedEvent : null}
      />
    </>
  );
};

const ExpandedOrderOverlay: React.FC<{ 
    order: Order, 
    event: EventType, 
    originRect: Rect, 
    onClose: () => void,
    onItemClick: (id: string, type: string, name: string) => void
}> = ({ order, event, originRect, onClose, onItemClick }) => {
    const [isExpanded, setIsExpanded] = useState(false);
    const [isClosing, setIsClosing] = useState(false);
    
    useEffect(() => {
        // Trigger standard browser reflow to ensure initial state is rendered before animating
        requestAnimationFrame(() => {
            setIsExpanded(true);
        });
    }, []);

    const handleCloseInternal = () => {
        setIsClosing(true);
        setIsExpanded(false);
        // Wait for animation duration before actually unmounting
        setTimeout(() => {
            onClose();
        }, 500);
    };

    // Style Calculation:
    // 1. Initial Mount (isExpanded false, closing false): Origin Rect
    // 2. Active (isExpanded true, closing false): Expanded Insets
    // 3. Closing (isExpanded false, closing true): Origin Rect
    const style = isExpanded
        ? { top: '16px', left: '16px', right: '16px', bottom: '16px', borderRadius: '1rem' } 
        : { top: `${originRect.top}px`, left: `${originRect.left}px`, width: `${originRect.width}px`, height: `${originRect.height}px`, borderRadius: '1rem' };

    // Build flat list of items
    const tickets = React.useMemo(() => {
        const flatItems: any[] = [];
        let globalIndex = 0;
        order.items.forEach(item => {
            const isAddon = event.addOns?.some(a => a.name === item.ticketType);
            for(let i=0; i<item.quantity; i++) {
                flatItems.push({
                    id: `${order.orderId}-${globalIndex}`,
                    name: item.ticketType,
                    type: isAddon ? 'Add-on' : 'Ticket',
                    index: globalIndex
                });
                globalIndex++;
            }
        });
        return flatItems;
    }, [order, event]);

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
            {/* Backdrop */}
            <div 
                className={`absolute inset-0 bg-black/80 transition-opacity duration-500 ease-out ${isExpanded ? 'opacity-100' : 'opacity-0'}`} 
                onClick={handleCloseInternal}
            ></div>

            {/* The Morphing Card */}
            <div 
                className="absolute bg-neutral-900 overflow-hidden shadow-2xl border border-neutral-800"
                style={{
                    ...style,
                    transition: 'all 0.5s cubic-bezier(0.16, 1, 0.3, 1)',
                    maxWidth: isExpanded ? '800px' : undefined,
                    margin: isExpanded ? '0 auto' : undefined
                }}
            >
                {/* Background Blur Image */}
                <div className={`absolute inset-0 opacity-20 pointer-events-none transition-opacity duration-500 ${isExpanded ? 'opacity-20' : 'opacity-0'}`}>
                    <img src={event.imageUrls[0]} alt="" className="w-full h-full object-cover blur-2xl scale-125"/>
                </div>

                <div className="relative z-10 flex flex-col h-full">
                    
                    {/* Header: Slides Up */}
                    <div className="flex-shrink-0 p-6 md:p-8 flex items-start justify-between border-b border-white/5 bg-neutral-900/50 backdrop-blur-md">
                        <div className="flex gap-6 items-center">
                            <div 
                                className={`flex-shrink-0 bg-neutral-800 overflow-hidden shadow-lg transition-all duration-500 rounded-xl ${isExpanded ? 'w-24 h-24' : 'w-20 h-20'}`}
                            >
                                <img src={event.imageUrls[0]} alt={event.title} className="w-full h-full object-cover"/>
                            </div>
                            <div className={`transition-all duration-500 delay-100 ${isExpanded ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-4'}`}>
                                <h2 className="text-2xl md:text-3xl font-bold text-white mb-2">{event.title}</h2>
                                {/* Requested Layout: Title -> Location -> Date */}
                                <div className="flex flex-col gap-1 text-neutral-400 text-sm">
                                    <span className="flex items-center gap-2"><MapPinIcon className="w-4 h-4 text-neutral-500 shrink-0"/> {event.location}</span>
                                    <span className="flex items-center gap-2"><CalendarIcon className="w-4 h-4 text-neutral-500 shrink-0"/> {new Date(event.date).toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}</span>
                                </div>
                            </div>
                        </div>
                        <button 
                            onClick={(e) => { e.stopPropagation(); handleCloseInternal(); }}
                            className="p-2 bg-black/20 hover:bg-black/40 rounded-full text-neutral-400 hover:text-white transition-colors"
                        >
                            <XCircleIcon className="w-8 h-8" />
                        </button>
                    </div>

                    {/* Scrollable Items List */}
                    <div className="flex-grow overflow-y-auto p-6 md:p-8 space-y-4 custom-scrollbar">
                        <h3 className={`text-sm font-bold text-neutral-500 uppercase tracking-wider mb-4 transition-opacity duration-500 ${isExpanded ? 'opacity-100' : 'opacity-0'}`}>Your Items</h3>
                        
                        {tickets.map((ticket, idx) => (
                            <div 
                                key={ticket.id}
                                onClick={() => onItemClick(ticket.id, ticket.type, ticket.name)}
                                className={`
                                    bg-neutral-800/60 hover:bg-neutral-700/80 border border-white/5 rounded-xl p-4 flex items-center justify-between cursor-pointer transition-all duration-500 ease-out transform
                                    ${isExpanded ? 'translate-y-0 opacity-100' : 'translate-y-20 opacity-0'}
                                `}
                                style={{ transitionDelay: isClosing ? '0ms' : `${150 + (idx * 50)}ms` }}
                            >
                                <div className="flex items-center gap-4">
                                    <div className={`w-12 h-12 rounded-full flex items-center justify-center ${ticket.type === 'Ticket' ? 'bg-purple-600/20 text-purple-400' : 'bg-blue-600/20 text-blue-400'}`}>
                                        {ticket.type === 'Ticket' ? <TicketIcon className="w-6 h-6"/> : <PackageIcon className="w-6 h-6"/>}
                                    </div>
                                    <div>
                                        <h4 className="text-white font-bold text-lg">{ticket.name}</h4>
                                        <p className="text-neutral-400 text-xs uppercase font-mono tracking-wider">{ticket.id}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3 text-neutral-400 group-hover:text-white">
                                    <span className="text-sm font-medium">View QR</span>
                                    <div className="bg-black/30 p-2 rounded-lg">
                                        <EyeIcon className="w-5 h-5" />
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Footer Stats */}
                    <div className={`flex-shrink-0 p-6 bg-neutral-950/80 border-t border-white/5 flex justify-between items-center text-sm transition-opacity duration-300 ${isExpanded ? 'opacity-100' : 'opacity-0'}`}>
                        <span className="text-neutral-500 font-mono">Order ID: {order.orderId}</span>
                        <div className="flex items-center gap-2">
                            <span className="text-neutral-400">Total Paid:</span>
                            <span className="text-white font-bold text-lg">${order.totalPaid.toFixed(2)}</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default UserPortal;

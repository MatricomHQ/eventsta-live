
import React, { useState, useEffect, useMemo } from 'react';
import { TicketIcon, PackageIcon, ShieldCheckIcon } from './Icons';
import { Event, CheckoutCart, PromoCode } from '../types';
import QuantitySelector from './QuantitySelector';
import DonationItemSelector from './DonationItemSelector';

interface FloatingTicketButtonProps {
  ticketSectionRef: React.RefObject<HTMLElement>;
  isVisible: boolean;
  // New Props for Drawer Functionality
  event?: Event;
  cart?: CheckoutCart;
  onQuantityChange?: (itemType: string, quantity: number, donationAmount?: number) => void;
  onCheckout?: () => void;
  appliedPromoCode?: PromoCode | null;
}

const FloatingTicketButton: React.FC<FloatingTicketButtonProps> = ({ 
    ticketSectionRef, 
    isVisible,
    event,
    cart,
    onQuantityChange,
    onCheckout,
    appliedPromoCode
}) => {
  const [isOpen, setIsOpen] = useState(false);

  // Check if event is ended
  const isEventEnded = event ? new Date(event.endDate || event.date) < new Date() : false;

  // Auto-close if the static section becomes visible on scroll
  useEffect(() => {
      if (!isVisible && isOpen) {
          setIsOpen(false);
      }
  }, [isVisible, isOpen]);

  // Calculate total from cart for the drawer footer
  const drawerTotal = useMemo(() => {
      if (!event || !cart) return 0;
      return Object.keys(cart).reduce((total, itemType) => {
          const details = cart[itemType];
          let price = 0;
          
          if (event.type === 'ticketed') {
              const ticketOption = event.tickets.find(t => t.type === itemType);
              const addOnOption = event.addOns?.find(a => a.name === itemType);
              
              if (ticketOption) {
                  price = ticketOption.price;
                  // Apply discount if available
                  if (appliedPromoCode) {
                      price = price * (1 - appliedPromoCode.discountPercent / 100);
                  }
              } else if (addOnOption) {
                  price = addOnOption.price;
              }
          } else {
              price = details.donationAmount || 0;
          }
          return total + (price * details.quantity);
      }, 0);
  }, [cart, event, appliedPromoCode]);

  const handleToggle = () => {
      if (!event) {
          // Fallback for pages that don't pass event data (legacy support)
          ticketSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
          return;
      }
      setIsOpen(!isOpen);
  };

  // Calculate total tickets for add-on logic
  const totalTicketsInCart = useMemo(() => {
    if (!event || !cart) return 0;
    return Object.keys(cart).reduce((total, itemType) => {
        const isTicket = event.tickets.some(t => t.type === itemType);
        if (isTicket) {
            return total + cart[itemType].quantity;
        }
        return total;
    }, 0);
  }, [cart, event]);

  // If event is ended, do not render the button
  if (isEventEnded) return null;

  return (
    <>
        {/* Backdrop for Focus */}
        <div 
            className={`fixed inset-0 bg-black/60 backdrop-blur-sm z-40 transition-opacity duration-500 ease-in-out ${isOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}
            onClick={() => setIsOpen(false)}
        />

        {/* Drawer Container */}
        <div 
            className={`fixed bottom-0 left-0 right-0 z-50 w-full
                        transition-transform duration-500 cubic-bezier(0.16, 1, 0.3, 1)
                        ${isOpen ? 'translate-y-0' : 'translate-y-[calc(100%-0px)]'} 
                        ${!isVisible && !isOpen ? 'translate-y-[200%]' : ''}
            `}
        >
            {/* Drawer Body */}
            <div className="relative w-full max-w-3xl mx-auto">
                
                {/* The "Handle" Button - Positioned absolutely on top of the drawer content */}
                {/* Adjusted to -56px to sit nicely on top and match border alignment */}
                <div className="absolute -top-[56px] left-1/2 -translate-x-1/2 pointer-events-auto z-30">
                    <button
                        onClick={handleToggle}
                        aria-label={isOpen ? "Close tickets" : "Select tickets"}
                        className={`group relative
                                    w-32 h-16
                                    ${isOpen ? 'bg-neutral-900' : 'bg-[#13031C]/95'} 
                                    backdrop-blur-xl
                                    border-t border-l border-r border-purple-500/30
                                    rounded-t-full
                                    flex items-center justify-center
                                    text-white
                                    transition-all duration-300
                                    hover:bg-[#1f052e] hover:border-purple-500/60
                                    focus:outline-none
                                    ${isOpen ? 'border-b-0' : 'radar-animated'}
                        `}
                    >
                        <TicketIcon 
                            className={`w-10 h-10 text-white/60 transition-all duration-300 ease-in-out group-hover:text-white group-hover:scale-105 translate-y-2 ${isOpen ? 'text-purple-400' : ''}`} 
                            style={{ textShadow: '0 -1px 1px rgba(0,0,0,0.6), 0 1px 1px rgba(255,255,255,0.1)' }}
                        />
                    </button>
                </div>

                {/* Actual Drawer Content Area */}
                <div className="relative bg-neutral-900/95 backdrop-blur-xl border-t border-l border-r border-purple-500/30 rounded-t-3xl max-h-[75vh] flex flex-col">
                    
                    {/* Masking Patch to hide border seam under handle */}
                    {isOpen && (
                        <div className="absolute -top-[2px] left-1/2 -translate-x-1/2 w-[7.8rem] h-[4px] bg-neutral-900 z-20"></div>
                    )}

                    {/* Header */}
                    <div className="px-6 py-4 border-b border-white/5 flex justify-between items-center">
                        <h3 className="text-xl font-bold text-white">Select Tickets</h3>
                        <button onClick={() => setIsOpen(false)} className="text-neutral-400 hover:text-white text-sm">Close</button>
                    </div>

                    {/* Scrollable List */}
                    <div className="p-6 overflow-y-auto custom-scrollbar space-y-4 flex-grow">
                        {event && event.tickets.map((ticket, idx) => {
                            const hasDiscount = appliedPromoCode && event.type === 'ticketed';
                            const discountPct = hasDiscount ? appliedPromoCode.discountPercent : 0;
                            const discountedPrice = ticket.price * (1 - discountPct / 100);
                            
                            // Check availability
                            const now = new Date();
                            const isSalesEnded = ticket.saleEndDate ? new Date(ticket.saleEndDate) < now : false;
                            const isSoldOut = (ticket.quantity !== undefined && (ticket.sold || 0) >= ticket.quantity);
                            const isUnavailable = isSalesEnded || isSoldOut;

                            return event.type === 'ticketed' ? (
                                <div key={ticket.id || ticket.type || idx} className={`bg-neutral-800/50 border border-white/10 rounded-xl p-4 flex items-center justify-between gap-4 ${isUnavailable ? 'opacity-50 grayscale' : ''}`}>
                                    <div>
                                        <h4 className="font-bold text-white">{ticket.type}</h4>
                                        <p className="text-xs text-neutral-400">{ticket.description}</p>
                                        {hasDiscount && !isUnavailable ? (
                                            <div className="flex items-center gap-2 mt-1">
                                                <span className="text-xs text-neutral-500 line-through">${ticket.price.toFixed(2)}</span>
                                                <span className="text-purple-400 font-bold">${discountedPrice.toFixed(2)}</span>
                                            </div>
                                        ) : (
                                            <span className="text-purple-400 font-bold">${ticket.price.toFixed(2)}</span>
                                        )}
                                        {isSoldOut && <p className="text-red-500 text-[10px] font-bold mt-1 uppercase">Sold Out</p>}
                                    </div>
                                    {isUnavailable ? (
                                        <button disabled className="px-3 py-1.5 bg-neutral-800 text-neutral-500 text-xs font-bold rounded cursor-not-allowed">Unavailable</button>
                                    ) : (
                                        <QuantitySelector 
                                            initialQuantity={cart?.[ticket.type]?.quantity} 
                                            ticketType={ticket.type} 
                                            onChange={onQuantityChange || (() => {})} 
                                        />
                                    )}
                                </div>
                            ) : (
                                <DonationItemSelector 
                                    key={ticket.id || ticket.type || idx} 
                                    item={ticket} 
                                    onChange={onQuantityChange || (() => {})} 
                                    cartItem={cart?.[ticket.type]} 
                                />
                            );
                        })}

                        {event && event.addOns && event.addOns.length > 0 && (
                            <div className={`pt-4 border-t border-white/10 ${totalTicketsInCart === 0 ? 'opacity-50 pointer-events-none' : ''}`}>
                                <h4 className="text-sm font-bold text-neutral-400 mb-3 uppercase tracking-wider flex items-center gap-2">
                                    <PackageIcon className="w-4 h-4" /> Add-ons
                                </h4>
                                <div className="space-y-3">
                                    {event.addOns.map(addOn => (
                                        event.type === 'ticketed' ? (
                                            <div key={addOn.name} className="bg-neutral-800/50 border border-white/10 rounded-xl p-4 flex items-center justify-between gap-4">
                                                <div>
                                                    <h4 className="font-semibold text-white">{addOn.name}</h4>
                                                    <p className="text-xs text-neutral-400">{addOn.description}</p>
                                                    <span className="text-purple-400 font-bold text-sm">${addOn.price.toFixed(2)}</span>
                                                </div>
                                                <QuantitySelector 
                                                    disabled={totalTicketsInCart === 0} 
                                                    initialQuantity={cart?.[addOn.name]?.quantity} 
                                                    ticketType={addOn.name} 
                                                    onChange={onQuantityChange || (() => {})} 
                                                />
                                            </div>
                                        ) : (
                                            <DonationItemSelector 
                                                key={addOn.name} 
                                                item={addOn} 
                                                onChange={onQuantityChange || (() => {})} 
                                                cartItem={cart?.[addOn.name]} 
                                            />
                                        )
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>

                    {/* Footer Action */}
                    <div className="p-6 border-t border-white/10 bg-black/20">
                        <div className="flex justify-between items-center mb-4">
                            <span className="text-neutral-400">Total</span>
                            <span className="text-2xl font-bold text-white">${drawerTotal.toFixed(2)}</span>
                        </div>
                        <button 
                            onClick={() => { setIsOpen(false); onCheckout?.(); }}
                            disabled={drawerTotal === 0}
                            className="w-full h-14 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-xl shadow-lg shadow-purple-600/20 transition-all flex items-center justify-center gap-3 disabled:bg-neutral-800 disabled:text-neutral-500 disabled:shadow-none"
                        >
                            <ShieldCheckIcon className="w-5 h-5" />
                            {event?.type === 'fundraiser' ? 'Donate Now' : 'Checkout'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    </>
  );
};

// Add keyframes for radar pulse
const radarStyle = document.createElement('style');
radarStyle.innerHTML = `
  @keyframes radar-pulse {
    0% {
      box-shadow: 0 0 0 0px rgba(168, 85, 247, 0.7);
    }
    100% {
      box-shadow: 0 0 0 25px rgba(168, 85, 247, 0);
    }
  }
  .radar-animated {
    animation: radar-pulse 2s infinite;
  }
`;
document.head.appendChild(radarStyle);

export default FloatingTicketButton;


import React, { useState, useMemo, useEffect } from 'react';
import Modal from './Modal';
import { useAuth } from '../contexts/AuthContext';
import { Event, CheckoutCart } from '../types';
import * as api from '../services/api';
import { CheckCircleIcon, ShieldCheckIcon } from './Icons';

interface CheckoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  cart: CheckoutCart;
  event: Event;
  recipientUserId?: string; // For competitions/fundraisers
  promoCode?: string;
  appliedDiscountPercent?: number;
}

type View = 'checkout' | 'success' | 'loading';

const CheckoutModal: React.FC<CheckoutModalProps> = ({ isOpen, onClose, cart, event, recipientUserId, promoCode, appliedDiscountPercent }) => {
  const { user } = useAuth();
  const [view, setView] = useState<View>('checkout');
  const [platformDonation, setPlatformDonation] = useState(0);
  const [feesConfig, setFeesConfig] = useState({ percent: 5.9, fixed: 0.35 });

  // Fetch dynamic fee settings
  useEffect(() => {
      if (isOpen) {
          api.getSystemSettings().then(settings => {
              setFeesConfig({
                  percent: settings.platformFeePercent,
                  fixed: settings.platformFeeFixed
              });
          });
      }
  }, [isOpen]);

  const { items, subtotal, discount, mandatoryFees, finalTotal } = useMemo(() => {
    const isFundraiser = event.type === 'fundraiser';
    const cartItems = Object.keys(cart).map((itemType) => {
      const details = cart[itemType];
      let price = 0;
      let itemSubtotal = 0;
      let isTicket = false;

      if (isFundraiser) {
        // Find the item definition to check minimum
        const ticketOption = event.tickets.find(t => t.type === itemType);
        const addOnOption = event.addOns?.find(a => a.name === itemType);
        const minDonation = ticketOption?.minimumDonation || addOnOption?.minimumDonation || 0;

        // Enforce minimum donation validation
        price = Math.max(details.donationAmount || 0, minDonation);
        itemSubtotal = price * details.quantity;
        
        if (ticketOption) isTicket = true;
      } else {
        const ticketOption = event.tickets.find(t => t.type === itemType);
        if (ticketOption) {
            price = ticketOption.price;
            isTicket = true; // Identify as a ticket
        } else {
            const addOnOption = event.addOns?.find(a => a.name === itemType);
            if (addOnOption) {
                price = addOnOption.price;
            }
        }
        itemSubtotal = price * details.quantity;
      }
      return {
        type: itemType,
        quantity: details.quantity,
        price,
        subtotal: itemSubtotal,
        isTicket // Passed for discount logic
      };
    });
    
    const calculatedSubtotal = cartItems.reduce((sum, item) => sum + item.subtotal, 0);
    
    let discountAmount = 0;
    if (appliedDiscountPercent && event.type === 'ticketed') {
        // Apply discount ONLY to tickets, NOT add-ons
        const ticketSubtotal = cartItems
            .filter(item => item.isTicket)
            .reduce((sum, item) => sum + item.subtotal, 0);
            
        discountAmount = ticketSubtotal * (appliedDiscountPercent / 100);
    }
    
    const subtotalAfterDiscount = calculatedSubtotal - discountAmount;

    // Mandatory Fees: System Configured % + Fixed Fee
    const calculatedFees = subtotalAfterDiscount > 0 ? (subtotalAfterDiscount * (feesConfig.percent / 100)) + feesConfig.fixed : 0;

    // Final Total including donation (handled in component state)
    const totalToPay = subtotalAfterDiscount + calculatedFees + (platformDonation || 0);

    return { 
        items: cartItems, 
        subtotal: calculatedSubtotal, 
        discount: discountAmount, 
        mandatoryFees: calculatedFees,
        finalTotal: totalToPay 
    };
  }, [cart, event, appliedDiscountPercent, platformDonation, feesConfig]);

  // Initialize default donation when modal opens or subtotal changes significantly
  useEffect(() => {
      if (isOpen && subtotal > 0) {
          // Default donation: 10% of subtotal, rounded UP to nearest dollar
          const defaultDonation = Math.ceil((subtotal - discount) * 0.10);
          setPlatformDonation(defaultDonation);
      }
  }, [isOpen, subtotal, discount]);

  const handlePayment = async () => {
    if (!user) return;
    setView('loading');
    try {
      await api.purchaseTicket(
          user.id, 
          event.id, 
          cart, 
          recipientUserId, 
          promoCode,
          { mandatory: mandatoryFees, donation: platformDonation }
        );
      setView('success');
    } catch (error) {
      console.error("Payment failed", error);
      setView('checkout'); // Or an error view
    }
  };

  const handleClose = () => {
      onClose();
      // Reset view for next time modal opens
      setTimeout(() => setView('checkout'), 300);
  }

  return (
    <Modal isOpen={isOpen} onClose={handleClose}>
        <div className="w-full max-w-lg bg-neutral-900 border border-neutral-800 rounded-2xl shadow-2xl shadow-purple-500/10 overflow-hidden">
            {view === 'checkout' && (
                <div>
                    <div className="p-8">
                        <h2 className="text-2xl font-bold text-white mb-6">Checkout Summary</h2>
                        <div className="space-y-4 mb-8 border-b border-neutral-800 pb-6">
                            {items.map(item => (
                                <div key={item.type} className="flex justify-between items-center">
                                    <div>
                                        <p className="text-lg font-medium text-white">{item.type} (x{item.quantity})</p>
                                        <p className="text-sm text-neutral-400">${item.price.toFixed(2)} {event.type === 'fundraiser' ? 'donation' : 'each'}</p>
                                    </div>
                                    <span className="text-lg font-semibold text-white">${item.subtotal.toFixed(2)}</span>
                                </div>
                            ))}
                        </div>
                        
                        <div className="space-y-3">
                            <div className="flex justify-between items-center text-neutral-300">
                                <p>Subtotal</p>
                                <span>${subtotal.toFixed(2)}</span>
                            </div>
                            {discount > 0 && (
                                <div className="flex justify-between items-center text-green-400">
                                    <p>Promo Discount ({promoCode})</p>
                                    <span>-${discount.toFixed(2)}</span>
                                </div>
                            )}
                            <div className="flex justify-between items-center text-neutral-300">
                                <p>Processing & Taxes</p>
                                <span>${mandatoryFees.toFixed(2)}</span>
                            </div>
                            
                            <div className="bg-neutral-800/50 p-4 rounded-xl border border-neutral-800 mt-4">
                                <div className="flex justify-between items-center mb-2">
                                    <label htmlFor="donation-input" className="text-sm font-medium text-purple-300">
                                        Platform Donation
                                    </label>
                                    <div className="relative w-24">
                                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400">$</span>
                                        <input 
                                            id="donation-input"
                                            type="number" 
                                            min="0"
                                            step="1"
                                            value={platformDonation}
                                            onChange={(e) => setPlatformDonation(Math.max(0, parseFloat(e.target.value) || 0))}
                                            className="w-full bg-neutral-900 border border-neutral-700 rounded-lg py-1.5 pl-6 pr-2 text-right text-white focus:border-purple-500 outline-none transition-colors"
                                        />
                                    </div>
                                </div>
                                <p className="text-xs text-neutral-500">
                                    ❤️ Evensta is a non-profit event management platform. Your donation is optional and supports our operations.
                                </p>
                            </div>
                        </div>

                        <div className="border-t-2 border-neutral-700 mt-6 pt-4 flex justify-between items-center">
                            <span className="text-lg font-semibold text-neutral-300">Total</span>
                            <span className="text-3xl font-bold text-white">${finalTotal.toFixed(2)}</span>
                        </div>
                    </div>
                     <button onClick={handlePayment} className="w-full h-16 px-6 bg-purple-600 text-white text-lg font-semibold hover:bg-purple-500 transition-all duration-300 flex items-center justify-center space-x-3">
                        <ShieldCheckIcon className="w-5 h-5" />
                        <span>Pay ${finalTotal.toFixed(2)}</span>
                    </button>
                </div>
            )}
             {view === 'loading' && (
                 <div>
                    <div className="p-8 h-64 flex items-center justify-center">
                        <p className="text-neutral-300">Processing payment...</p>
                    </div>
                     <button disabled className="w-full h-16 px-6 bg-purple-700 text-white text-lg font-semibold transition-all duration-300 flex items-center justify-center space-x-3">
                        <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        <span>Processing...</span>
                    </button>
                </div>
            )}
            {view === 'success' && (
                <div>
                    <div className="p-12 text-center">
                        <div className="w-20 h-20 bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-6">
                            <CheckCircleIcon className="w-12 h-12 text-green-400" />
                        </div>
                        <h2 className="text-3xl font-bold text-white mb-3">Payment Successful!</h2>
                        <p className="text-neutral-400 mb-8">Your tickets are confirmed. See you there!</p>
                    </div>
                     <button onClick={handleClose} className="w-full h-16 px-6 bg-purple-600 text-white text-lg font-semibold hover:bg-purple-500 transition-all duration-300">
                        Done
                    </button>
                </div>
            )}
        </div>
    </Modal>
  );
};

export default CheckoutModal;
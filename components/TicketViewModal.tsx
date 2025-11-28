
import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { Event as EventType } from '../types';
import { CalendarIcon, UserIcon, XIcon, MapPinIcon } from './Icons';
import QRCode from "qrcode";

interface TicketViewModalProps {
  isOpen: boolean;
  onClose: () => void;
  // We pass the specific ticket details now
  ticketData: {
      id: string;
      type: string;
      name: string;
      holderName: string;
  } | null;
  eventData?: EventType | null;
}

const TicketViewModal: React.FC<TicketViewModalProps> = ({ isOpen, onClose, ticketData, eventData }) => {
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('');

  // Generate QR
  useEffect(() => {
      if (ticketData && isOpen) {
          const qrValue = ticketData.id; 
          QRCode.toDataURL(qrValue, { 
              width: 600,
              margin: 2,
              color: {
                  dark: '#000000',
                  light: '#ffffff'
              },
              errorCorrectionLevel: 'M'
          })
          .then((url) => {
              setQrCodeUrl(url);
          })
          .catch((err) => {
              console.error("Error generating QR code", err);
          });
      }
  }, [ticketData, isOpen]);

  if (!isOpen || !ticketData || !eventData) return null;

  return (
    <div 
        className="fixed inset-0 z-[100] flex items-center justify-center p-4 animate-in fade-in duration-300"
        role="dialog"
        aria-modal="true"
    >
        {/* Heavy Blur Backdrop */}
        <div 
            className="absolute inset-0 bg-black/80 backdrop-blur-xl transition-opacity"
            onClick={onClose}
        ></div>

        {/* The White Ticket Card - No Image Header, Rounded Corners */}
        <div 
            className="relative z-10 w-full max-w-sm bg-white text-black rounded-3xl overflow-hidden shadow-2xl transform transition-all scale-100 animate-in zoom-in-95 duration-300 max-h-[85vh] overflow-y-auto my-8"
            style={{ 
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255,255,255,0.1)'
            }}
        >
            {/* Close Button */}
            <button 
                onClick={onClose}
                className="absolute top-4 right-4 z-20 p-2 bg-neutral-100 hover:bg-neutral-200 rounded-full text-neutral-500 transition-colors"
            >
                <XIcon className="w-5 h-5" />
            </button>

            {/* QR Code Section & Details */}
            <div className="px-8 py-10 flex flex-col items-center text-center bg-white">
                
                {/* Header Info */}
                <h2 className="text-2xl font-black text-neutral-900 mb-2 leading-tight">{eventData.title}</h2>
                <div className="flex items-center gap-2 text-sm font-medium text-neutral-500 mb-6">
                    <CalendarIcon className="w-4 h-4" />
                    <span>{new Date(eventData.date).toLocaleDateString('en-US', { weekday: 'short', month: 'long', day: 'numeric' })}</span>
                </div>

                {/* Ticket Type Pill */}
                <div className="mb-6">
                    <span className="inline-block px-4 py-1.5 bg-black text-white text-xs font-bold tracking-widest uppercase rounded-full shadow-lg">
                        {ticketData.name}
                    </span>
                </div>
                
                {/* QR Code */}
                <div className="mb-8 p-3 bg-white rounded-2xl border-2 border-neutral-100 shadow-sm w-64 h-64 flex items-center justify-center">
                    {qrCodeUrl ? (
                        <img src={qrCodeUrl} alt="QR Code" className="w-full h-full object-contain mix-blend-multiply" />
                    ) : (
                        <div className="animate-pulse w-full h-full bg-neutral-100 rounded-lg"></div>
                    )}
                </div>

                {/* Tear Line Visual */}
                <div className="w-full border-t-2 border-dashed border-neutral-200 mb-6 relative">
                    <div className="absolute -left-10 -top-3 w-6 h-6 bg-black/80 rounded-full"></div> {/* Matching bg color of modal backdrop approx */}
                    <div className="absolute -right-10 -top-3 w-6 h-6 bg-black/80 rounded-full"></div>
                </div>

                {/* Footer Details */}
                <div className="w-full">
                    <div className="flex flex-col items-center gap-1 text-neutral-900">
                        <UserIcon className="w-5 h-5 text-neutral-400 mb-1" />
                        <span className="font-bold text-lg">{ticketData.holderName}</span>
                    </div>
                    <div className="text-neutral-400 font-mono text-[10px] mt-2 uppercase tracking-wider">
                        ID: {ticketData.id.split('-').slice(-2).join('-')}
                    </div>
                </div>
            </div>
            
            {/* Scan Prompt Bar */}
            <div className="bg-neutral-50 py-3 text-center border-t border-neutral-100">
                <p className="text-[10px] text-neutral-400 uppercase tracking-widest font-semibold flex items-center justify-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span>
                    Ready to Scan
                </p>
            </div>
        </div>
    </div>
  );
};

export default TicketViewModal;

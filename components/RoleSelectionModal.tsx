
import React from 'react';
import Modal from './Modal';
import { CalendarPlusIcon, TicketIcon } from './Icons';

interface RoleSelectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectRole: (role: 'attendee' | 'host') => void;
  userName: string;
}

const RoleSelectionModal: React.FC<RoleSelectionModalProps> = ({ isOpen, onClose, onSelectRole, userName }) => {
  return (
    <Modal isOpen={isOpen} onClose={onClose} showCloseButton={false}>
      <div className="w-full max-w-lg bg-neutral-900 border border-neutral-800 rounded-2xl shadow-2xl p-8">
        <h2 className="text-3xl font-bold text-white text-center mb-2">Welcome, {userName}!</h2>
        <p className="text-neutral-400 text-center mb-8">How do you plan to use Eventsta?</p>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <button
            onClick={() => onSelectRole('attendee')}
            className="flex flex-col items-center justify-center p-6 bg-neutral-800 hover:bg-neutral-700 border-2 border-transparent hover:border-purple-500 rounded-xl transition-all group"
          >
            <div className="w-16 h-16 bg-neutral-900 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <TicketIcon className="w-8 h-8 text-purple-400" />
            </div>
            <h3 className="text-lg font-bold text-white mb-1">Discover Events</h3>
            <p className="text-sm text-neutral-400 text-center">I want to buy tickets and find parties.</p>
          </button>

          <button
            onClick={() => onSelectRole('host')}
            className="flex flex-col items-center justify-center p-6 bg-neutral-800 hover:bg-neutral-700 border-2 border-transparent hover:border-purple-500 rounded-xl transition-all group"
          >
            <div className="w-16 h-16 bg-neutral-900 rounded-full flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
              <CalendarPlusIcon className="w-8 h-8 text-purple-400" />
            </div>
            <h3 className="text-lg font-bold text-white mb-1">Host & Promote</h3>
            <p className="text-sm text-neutral-400 text-center">I want to organize events or earn by promoting.</p>
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default RoleSelectionModal;

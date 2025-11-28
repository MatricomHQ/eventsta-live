import React, { useState } from 'react';
import Modal from './Modal';
import { useAuth } from '../contexts/AuthContext';
import * as api from '../services/api';
import { Host } from '../types';

interface AddHostModalProps {
  isOpen: boolean;
  onClose: () => void;
  onHostCreated: (newHost: Host) => void;
}

const AddHostModal: React.FC<AddHostModalProps> = ({ isOpen, onClose, onHostCreated }) => {
  const { user } = useAuth();
  const [hostName, setHostName] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !hostName.trim()) return;

    setIsLoading(true);
    try {
      const newHost = await api.createHost(user.id, hostName);
      onHostCreated(newHost);
      setHostName('');
    } catch (error) {
      console.error("Failed to create host", error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose}>
      <div className="w-full max-w-md bg-neutral-900 border border-neutral-800 rounded-2xl shadow-2xl shadow-purple-500/10">
        <form onSubmit={handleSubmit}>
          <div className="p-8">
            <h2 className="text-2xl font-bold text-center text-white mb-2">Create New Host</h2>
            <p className="text-neutral-400 text-center mb-8">Create a new profile to host events under.</p>
            <div>
              <label htmlFor="host-name" className="block text-sm font-medium text-neutral-300 mb-2">Host Name</label>
              <input
                type="text"
                id="host-name"
                value={hostName}
                onChange={e => setHostName(e.target.value)}
                placeholder="e.g., Underground Collective"
                className="w-full h-12 px-4 bg-neutral-800 border border-neutral-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                required
              />
            </div>
          </div>
          <div className="p-4 bg-neutral-900/50 border-t border-neutral-800">
             <button
                type="submit"
                disabled={isLoading || !hostName.trim()}
                className="w-full h-12 px-6 bg-purple-600 text-white text-base font-semibold rounded-full hover:bg-purple-500 transition-all duration-300 shadow-lg shadow-purple-500/20 disabled:bg-neutral-700 disabled:text-neutral-500 disabled:shadow-none flex items-center justify-center"
            >
              {isLoading ? 'Creating...' : 'Create Host'}
            </button>
          </div>
        </form>
      </div>
    </Modal>
  );
};

export default AddHostModal;


import React, { useState } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { useAuth } from '../../contexts/AuthContext';
import * as api from '../../services/api';
import { Event as EventType, VenueArea } from '../../types';
import { TrashIcon } from '../Icons';

const SectionsTab: React.FC<{ event: EventType, onEventUpdate: () => void }> = ({ event, onEventUpdate }) => {
    const { user } = useAuth();
    const [sections, setSections] = useState<VenueArea[]>(event.venueAreas || []);
    const [isSaving, setIsSaving] = useState(false);

    const handleSave = async () => {
        if (!user) return;
        setIsSaving(true);
        try {
            await api.updateEvent(user.id, event.id, { venueAreas: sections });
            onEventUpdate();
            alert("Sections updated!");
        } catch (e) {
            console.error(e);
            alert("Failed to update sections.");
        } finally {
            setIsSaving(false);
        }
    };

    const handleAdd = () => {
        setSections([...sections, { id: uuidv4(), name: 'New Section' }]);
    };

    const handleRemove = (id: string) => {
        setSections(sections.filter(s => s.id !== id));
    };

    const handleUpdate = (id: string, name: string) => {
        setSections(sections.map(s => s.id === id ? { ...s, name } : s));
    };

    return (
        <div className="space-y-6 max-w-3xl">
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold tracking-tight text-white">Venue Sections</h1>
                <button onClick={handleSave} disabled={isSaving} className="bg-purple-600 text-white px-6 py-2 rounded-full font-semibold disabled:opacity-50">
                    {isSaving ? 'Saving...' : 'Save Changes'}
                </button>
            </div>
            
            <div className="space-y-4">
                {sections.map(section => (
                    <div key={section.id} className="bg-neutral-800 p-4 rounded-lg flex gap-4 items-center">
                        <input 
                            type="text" 
                            value={section.name} 
                            onChange={e => handleUpdate(section.id, e.target.value)}
                            className="flex-1 bg-neutral-700 border border-neutral-600 rounded px-3 py-2 text-white"
                            placeholder="Section Name"
                        />
                        <button onClick={() => handleRemove(section.id)} className="text-red-400 hover:text-red-300">
                            <TrashIcon className="w-5 h-5" />
                        </button>
                    </div>
                ))}
                <button onClick={handleAdd} className="w-full py-3 border-2 border-dashed border-neutral-700 rounded-lg text-neutral-400 hover:text-white hover:border-purple-500 transition-colors">
                    + Add Section
                </button>
            </div>
        </div>
    );
};

export default SectionsTab;

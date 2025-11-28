
import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import * as api from '../../services/api';
import { Event as EventType, AddOn } from '../../types';
import AddOnEditor from '../AddOnEditor';

const AddOnsTab: React.FC<{ event: EventType, onEventUpdate: () => void }> = ({ event, onEventUpdate }) => {
    const { user } = useAuth();
    const [addOns, setAddOns] = useState<AddOn[]>(event.addOns || []);
    const [isSaving, setIsSaving] = useState(false);

    const handleSave = async () => {
        if (!user) return;
        setIsSaving(true);
        try {
            await api.updateEvent(user.id, event.id, { addOns });
            onEventUpdate();
            alert("Add-ons updated!");
        } catch (e) {
            console.error(e);
            alert("Failed to update add-ons.");
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="space-y-6 max-w-3xl">
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold tracking-tight text-white">Add-ons</h1>
                <button onClick={handleSave} disabled={isSaving} className="bg-purple-600 text-white px-6 py-2 rounded-full font-semibold disabled:opacity-50">
                    {isSaving ? 'Saving...' : 'Save Changes'}
                </button>
            </div>
            <AddOnEditor addOns={addOns} onAddOnsChange={setAddOns} isFundraiser={event.type === 'fundraiser'} />
        </div>
    );
};

export default AddOnsTab;

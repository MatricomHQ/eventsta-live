import React, { useState, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { AddOn } from '../types';
import { TrashIcon } from './Icons';

// The API model doesn't have an ID, but we need one for client-side keying.
interface EditableAddOn extends AddOn {
    id: string;
}

interface AddOnEditorProps {
    addOns: AddOn[];
    onAddOnsChange: (addOns: AddOn[]) => void;
    isFundraiser?: boolean;
}

const AddOnEditor: React.FC<AddOnEditorProps> = ({ addOns, onAddOnsChange, isFundraiser = false }) => {
    const [editableAddOns, setEditableAddOns] = useState<EditableAddOn[]>([]);

    useEffect(() => {
        // Sync state with props, preserving IDs where possible to maintain stable keys.
        setEditableAddOns(currentAddOns => {
            return addOns.map((addOn, index) => {
                const existingId = currentAddOns[index]?.id || uuidv4();
                return { ...addOn, id: existingId };
            });
        });
    }, [addOns]);
    
    const handleAddOnChange = (id: string, field: keyof AddOn, value: any) => {
        const newAddOns = editableAddOns.map(addOn => {
             if (addOn.id === id) {
                const isNumericField = field === 'price' || field === 'minimumDonation';
                const updatedValue = isNumericField ? parseFloat(value) || 0 : value;
                return { ...addOn, [field]: updatedValue };
            }
            return addOn;
        });
        // Strip temporary ID before calling parent callback
        onAddOnsChange(newAddOns.map(({ id, ...rest }) => rest));
    };

    const addAddOn = () => {
        const newAddOn = { name: '', price: 0.00, description: '', minimumDonation: 0 };
        onAddOnsChange([...addOns, newAddOn]);
    };

    const removeAddOn = (indexToRemove: number) => {
        onAddOnsChange(addOns.filter((_, index) => index !== indexToRemove));
    };

    return (
        <div className="space-y-4">
            {editableAddOns.map((addOn, index) => (
                <div key={addOn.id} className="bg-neutral-800 p-4 rounded-lg border border-neutral-700">
                    <div className="flex items-center justify-between mb-4">
                        <h4 className="text-md font-semibold text-white">{isFundraiser ? 'Donation Add-on' : 'Add-on Option'} #{index + 1}</h4>
                        <button onClick={() => removeAddOn(index)} className="text-red-500 hover:text-red-400"><TrashIcon className="w-5 h-5"/></button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <input 
                            type="text" 
                            placeholder="Add-on Name (e.g., VIP Access)" 
                            value={addOn.name} 
                            onChange={e => handleAddOnChange(addOn.id, 'name', e.target.value)} 
                            className="w-full h-10 px-4 bg-neutral-700 border border-neutral-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-purple-500" 
                        />
                        <input 
                            type="number" 
                            placeholder={isFundraiser ? 'Recommended Donation' : 'Price'}
                            value={addOn.price} 
                            onChange={e => handleAddOnChange(addOn.id, 'price', e.target.value)} 
                            className="w-full h-10 px-4 bg-neutral-700 border border-neutral-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                            step="0.01"
                            min="0"
                        />
                    </div>
                    {isFundraiser && (
                         <div className="mt-4">
                             <input 
                                type="number" 
                                placeholder="Minimum Donation" 
                                value={addOn.minimumDonation || ''}
                                onChange={e => handleAddOnChange(addOn.id, 'minimumDonation', e.target.value)} 
                                className="w-full md:w-1/2 h-10 px-4 bg-neutral-700 border border-neutral-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                                step="0.01"
                                min="0"
                            />
                         </div>
                    )}
                     <textarea 
                        placeholder="Optional description..." 
                        value={addOn.description || ''} 
                        onChange={e => handleAddOnChange(addOn.id, 'description', e.target.value)} 
                        rows={2} 
                        className="w-full mt-4 p-3 bg-neutral-700 border border-neutral-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none" 
                    />
                </div>
            ))}
            <button onClick={addAddOn} className="w-full mt-2 px-5 py-3 text-sm font-semibold text-purple-400 hover:text-white transition-colors bg-purple-500/10 hover:bg-purple-500/20 rounded-lg">Add Add-on</button>
        </div>
    );
};

export default AddOnEditor;
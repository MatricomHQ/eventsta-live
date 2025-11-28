




import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import * as api from '../../services/api';
import { Event as EventType } from '../../types';
import ImageGalleryEditor from '../ImageGalleryEditor';
import { EyeIcon } from '../Icons';

const DetailsTab: React.FC<{ event: EventType, onEventUpdate: () => void }> = ({ event, onEventUpdate }) => {
    const { user } = useAuth();
    const [formData, setFormData] = useState<Partial<EventType>>({
        title: event.title,
        description: event.description,
        date: event.date,
        endDate: event.endDate,
        location: event.location,
        imageUrls: event.imageUrls,
        commission: event.commission,
        defaultPromoDiscount: event.defaultPromoDiscount,
        status: event.status || 'DRAFT'
    });
    const [isSaving, setIsSaving] = useState(false);

    const handleSave = async () => {
        if (!user) return;
        setIsSaving(true);
        try {
            await api.updateEvent(user.id, event.id, formData);
            onEventUpdate();
            alert("Event details updated!");
        } catch (e) {
            console.error(e);
            alert("Failed to update details.");
        } finally {
            setIsSaving(false);
        }
    };

    const toggleStatus = () => {
        setFormData(prev => ({ ...prev, status: prev.status === 'PUBLISHED' ? 'DRAFT' : 'PUBLISHED' }));
    };

    return (
        <div className="space-y-6 max-w-3xl">
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold tracking-tight text-white">Event Details</h1>
                <button onClick={handleSave} disabled={isSaving} className="bg-purple-600 text-white px-6 py-2 rounded-full font-semibold disabled:opacity-50 shadow-lg shadow-purple-600/20 hover:bg-purple-500 transition-colors">
                    {isSaving ? 'Saving...' : 'Save Changes'}
                </button>
            </div>
            
            {/* Status Card */}
            <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center ${formData.status === 'PUBLISHED' ? 'bg-green-500/10 text-green-400' : 'bg-neutral-800 text-neutral-400'}`}>
                        <EyeIcon className="w-6 h-6" />
                    </div>
                    <div>
                        <h3 className="text-lg font-bold text-white">Event Visibility</h3>
                        <p className="text-sm text-neutral-400">
                            {formData.status === 'PUBLISHED' 
                                ? 'This event is live and visible to the public.' 
                                : 'This event is currently a draft and hidden from the public.'}
                        </p>
                    </div>
                </div>
                <div className="flex items-center">
                    <button 
                        onClick={toggleStatus}
                        className={`relative inline-flex h-8 w-14 items-center rounded-full transition-colors ${formData.status === 'PUBLISHED' ? 'bg-green-600' : 'bg-neutral-700'}`}
                    >
                        <span className={`inline-block h-6 w-6 transform rounded-full bg-white transition-transform ${formData.status === 'PUBLISHED' ? 'translate-x-7' : 'translate-x-1'}`} />
                    </button>
                    <span className={`ml-3 text-sm font-bold ${formData.status === 'PUBLISHED' ? 'text-green-400' : 'text-neutral-500'}`}>
                        {formData.status === 'PUBLISHED' ? 'PUBLISHED' : 'DRAFT'}
                    </span>
                </div>
            </div>

            <div className="space-y-6">
                <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 space-y-4">
                    <h3 className="text-lg font-bold text-white mb-4">Basic Info</h3>
                    <div>
                        <label className="block text-sm font-medium text-neutral-400 mb-1">Title</label>
                        <input 
                            type="text" 
                            value={formData.title} 
                            onChange={e => setFormData({...formData, title: e.target.value})}
                            className="w-full bg-neutral-800 border border-neutral-700 rounded-lg p-3 text-white focus:outline-none focus:border-purple-500"
                        />
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-neutral-400 mb-1">Start Date</label>
                            <input 
                                type="datetime-local" 
                                value={formData.date} 
                                onChange={e => setFormData({...formData, date: e.target.value})}
                                className="w-full bg-neutral-800 border border-neutral-700 rounded-lg p-3 text-white focus:outline-none focus:border-purple-500"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-neutral-400 mb-1">End Date</label>
                            <input 
                                type="datetime-local" 
                                value={formData.endDate} 
                                onChange={e => setFormData({...formData, endDate: e.target.value})}
                                className="w-full bg-neutral-800 border border-neutral-700 rounded-lg p-3 text-white focus:outline-none focus:border-purple-500"
                            />
                        </div>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-neutral-400 mb-1">Location</label>
                        <input 
                            type="text" 
                            value={formData.location} 
                            onChange={e => setFormData({...formData, location: e.target.value})}
                            className="w-full bg-neutral-800 border border-neutral-700 rounded-lg p-3 text-white focus:outline-none focus:border-purple-500"
                        />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-neutral-400 mb-1">Description</label>
                        <textarea 
                            rows={5}
                            value={formData.description} 
                            onChange={e => setFormData({...formData, description: e.target.value})}
                            className="w-full bg-neutral-800 border border-neutral-700 rounded-lg p-3 text-white focus:outline-none focus:border-purple-500"
                        />
                    </div>
                </div>

                <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6">
                    <h3 className="text-lg font-bold text-white mb-4">Promotions</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-medium text-neutral-400 mb-1">Promoter Commission (%)</label>
                            <div className="relative">
                                <input 
                                    type="number" 
                                    value={formData.commission} 
                                    onChange={e => setFormData({...formData, commission: parseFloat(e.target.value)})}
                                    className="w-full bg-neutral-800 border border-neutral-700 rounded-lg p-3 text-white focus:outline-none focus:border-purple-500"
                                    min="0"
                                    max="100"
                                />
                                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-neutral-500">%</span>
                            </div>
                            <p className="text-xs text-neutral-500 mt-1">Percentage of ticket sales (excluding add-ons) that promoters earn.</p>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-neutral-400 mb-1">Customer Discount (%)</label>
                            <div className="relative">
                                <input 
                                    type="number" 
                                    value={formData.defaultPromoDiscount} 
                                    onChange={e => setFormData({...formData, defaultPromoDiscount: parseFloat(e.target.value)})}
                                    className="w-full bg-neutral-800 border border-neutral-700 rounded-lg p-3 text-white focus:outline-none focus:border-purple-500"
                                    min="0"
                                    max="100"
                                />
                                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-neutral-500">%</span>
                            </div>
                            <p className="text-xs text-neutral-500 mt-1">Percentage discount applied to tickets when using a promoter's link.</p>
                        </div>
                    </div>
                </div>

                <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6">
                    <h3 className="text-lg font-bold text-white mb-4">Media</h3>
                    <div>
                        <label className="block text-sm font-medium text-neutral-400 mb-1">Images</label>
                        <ImageGalleryEditor 
                            images={formData.imageUrls || []} 
                            onImagesChange={imgs => setFormData({...formData, imageUrls: imgs})}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
};

export default DetailsTab;
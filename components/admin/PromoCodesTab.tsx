
import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import * as api from '../../services/api';
import { Event as EventType, PromoCode } from '../../types';
import { PlusIcon, TrashIcon } from '../Icons';
import Modal from '../Modal';

const PromoCodesTab: React.FC<{ event: EventType }> = ({ event }) => {
    const [codes, setCodes] = useState<PromoCode[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const { user } = useAuth();

    const fetchCodes = useCallback(async () => {
        setIsLoading(true);
        try {
            const promoCodes = await api.getPromoCodesForEvent(event.id);
            setCodes(promoCodes);
        } catch (err) {
            console.error(err);
        } finally {
            setIsLoading(false);
        }
    }, [event.id]);

    useEffect(() => {
        fetchCodes();
    }, [fetchCodes]);

    const handleCodeCreated = (newCode: PromoCode) => {
        setCodes(prev => [...prev, newCode]);
        setIsModalOpen(false);
    };

    const handleDeleteCode = async (codeId: string) => {
        if (!user) return;
        const originalCodes = codes;
        setCodes(prev => prev.filter(c => c.id !== codeId));
        try {
            const result = await api.deletePromoCode(user.id, event.id, codeId);
            if (!result.success) {
                setCodes(originalCodes);
                alert("Failed to delete promo code.");
            }
        } catch (error) {
            console.error(error);
            setCodes(originalCodes);
            alert("Failed to delete promo code.");
        }
    };

    return (
        <div className="space-y-8">
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold tracking-tight text-white">Promo Codes</h1>
                <button onClick={() => setIsModalOpen(true)} className="px-5 py-2 bg-purple-600 text-white text-sm font-semibold rounded-full hover:bg-purple-500 transition-all duration-300 shadow-lg shadow-purple-500/20 flex items-center justify-center space-x-2">
                    <PlusIcon className="w-4 h-4" /><span>Create Code</span>
                </button>
            </div>

            <div className="bg-neutral-900 border border-neutral-800 rounded-2xl overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left text-neutral-300">
                        <thead className="text-xs text-neutral-400 uppercase bg-neutral-800/50">
                            <tr>
                                <th scope="col" className="px-6 py-3">Code</th>
                                <th scope="col" className="px-6 py-3 text-center">Discount</th>
                                <th scope="col" className="px-6 py-3 text-center">Uses</th>
                                <th scope="col" className="px-6 py-3 text-center">Status</th>
                                <th scope="col" className="px-6 py-3"></th>
                            </tr>
                        </thead>
                        <tbody>
                            {isLoading ? (
                                <tr><td colSpan={5} className="text-center py-8 text-neutral-500">Loading codes...</td></tr>
                            ) : codes.length > 0 ? (
                                codes.map(code => (
                                    <tr key={code.id} className="border-b border-neutral-800">
                                        <td className="px-6 py-4 font-mono font-medium text-white">{code.code}</td>
                                        <td className="px-6 py-4 text-center">{code.discountPercent}%</td>
                                        <td className="px-6 py-4 text-center">{code.uses} / {code.maxUses ?? '∞'}</td>
                                        <td className="px-6 py-4 text-center">
                                            <span className={`px-2 py-1 text-xs font-medium rounded-full ${code.isActive ? 'bg-green-500/10 text-green-400' : 'bg-neutral-700 text-neutral-400'}`}>
                                                {code.isActive ? 'Active' : 'Inactive'}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right">
                                            <button onClick={() => handleDeleteCode(code.id)} className="text-neutral-500 hover:text-red-400 transition-colors"><TrashIcon className="w-5 h-5"/></button>
                                        </td>
                                    </tr>
                                ))
                            ) : (
                                <tr><td colSpan={5} className="text-center py-8 text-neutral-500">No promo codes created yet.</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            <CreatePromoCodeModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onCreated={handleCodeCreated}
                eventId={event.id}
            />
        </div>
    );
};

const CreatePromoCodeModal: React.FC<{ isOpen: boolean, onClose: () => void, onCreated: (code: PromoCode) => void, eventId: string }> = ({ isOpen, onClose, onCreated, eventId }) => {
    const { user } = useAuth();
    const [code, setCode] = useState('');
    const [discount, setDiscount] = useState(10);
    const [maxUses, setMaxUses] = useState<number | ''>('');
    const [isLoading, setIsLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user || !code.trim()) return;

        setIsLoading(true);
        const newCodeData = {
            code: code.trim().toUpperCase(),
            discountPercent: discount,
            maxUses: maxUses === '' ? null : Number(maxUses)
        };
        try {
            const createdCode = await api.createPromoCode(user.id, eventId, newCodeData);
            onCreated(createdCode);
            setCode('');
            setDiscount(10);
            setMaxUses('');
        } catch (error) {
            console.error(error);
        } finally {
            setIsLoading(false);
        }
    }
    
    return (
        <Modal isOpen={isOpen} onClose={onClose}>
            <form onSubmit={handleSubmit} className="w-full max-w-md bg-neutral-900 border border-neutral-800 rounded-2xl shadow-2xl">
                <div className="p-8">
                    <h2 className="text-xl font-bold text-white mb-6">Create Promo Code</h2>
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-neutral-300 mb-2">Code</label>
                            <input type="text" value={code} onChange={e => setCode(e.target.value)} placeholder="e.g., EARLYBIRD20" className="w-full h-12 px-4 bg-neutral-800 border border-neutral-700 rounded-lg text-white font-mono uppercase" required />
                        </div>
                         <div>
                            <label className="block text-sm font-medium text-neutral-300 mb-2">Discount (%)</label>
                            <input type="number" value={discount} onChange={e => setDiscount(Number(e.target.value))} min="1" max="100" className="w-full h-12 px-4 bg-neutral-800 border border-neutral-700 rounded-lg text-white" required />
                        </div>
                         <div>
                            <label className="block text-sm font-medium text-neutral-300 mb-2">Max Uses (optional)</label>
                            <input type="number" value={maxUses} onChange={e => setMaxUses(e.target.value === '' ? '' : Number(e.target.value))} min="1" placeholder="Leave blank for unlimited" className="w-full h-12 px-4 bg-neutral-800 border border-neutral-700 rounded-lg text-white" />
                        </div>
                    </div>
                </div>
                <div className="p-4 bg-neutral-900/50 border-t border-neutral-800 flex justify-end">
                    <button type="submit" disabled={isLoading} className="px-5 py-2 text-sm font-semibold rounded-full bg-purple-600 text-white hover:bg-purple-500 disabled:opacity-50">
                        {isLoading ? 'Creating...' : 'Create Code'}
                    </button>
                </div>
            </form>
        </Modal>
    );
};

export default PromoCodesTab;

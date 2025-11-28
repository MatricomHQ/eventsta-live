
import React, { useState, useMemo, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import * as api from '../services/api';
import { PromoStat, User, Event as EventType, PayoutRequest } from '../types';
import PortalHeader from '../components/PortalHeader';
import { TrashIcon, ClipboardIcon, MegaphoneIcon, DollarSignIcon, CreditCardIcon, ArrowRightIcon, CheckCircleIcon, ClockIcon } from '../components/Icons';
import CompetitionLeaderboard from '../components/CompetitionLeaderboard';
import Modal from '../components/Modal';

const PromoterPortal: React.FC = () => {
    const { user, isAuthenticated, refreshUser } = useAuth();
    const navigate = useNavigate();

    useEffect(() => {
        if (!isAuthenticated) {
            navigate('/');
        }
    }, [isAuthenticated, navigate]);

    if (!user) {
        return <div className="text-center py-20">Loading...</div>;
    }

    return (
        <div className="container mx-auto max-w-7xl px-6 py-16">
            <PortalHeader 
                title="Promoter Portal"
                subtitle="Track your campaign performance and manage your earnings."
            />
            <PromotionsContent user={user} onUserUpdate={refreshUser} />
        </div>
    );
};

const PromotionsContent: React.FC<{ user: User, onUserUpdate: () => void }> = ({ user, onUserUpdate }) => {
    const [activeSubTab, setActiveSubTab] = useState('active');
    const [promoToStop, setPromoToStop] = useState<PromoStat | null>(null);
    const [copiedLink, setCopiedLink] = useState<string | null>(null);
    const navigate = useNavigate();
    
    // Note: User profile already fetches promotions and enriches them in api.ts
    // eventsMap is mostly redundant if api.ts does its job, but we keep it for competition data
    const [eventsMap, setEventsMap] = useState<Map<string, EventType>>(new Map());
    const [isLoadingEvents, setIsLoadingEvents] = useState(true);
    
    const [showPayoutSetupModal, setShowPayoutSetupModal] = useState(false);
    const [showEarlyPayoutModal, setShowEarlyPayoutModal] = useState(false);
    const [hasPendingRequest, setHasPendingRequest] = useState(false);

    // Track locally deleted IDs to support optimistic UI updates when API returns stale data
    const [deletedEventIds, setDeletedEventIds] = useState<string[]>([]);

    const { activePromos, currentBalance, totalEarned } = useMemo(() => {
        const active = user.promoStats
            .filter(p => p.status === 'active')
            .filter(p => !deletedEventIds.includes(p.eventId)); // Filter out locally deleted items

        const balance = active.reduce((sum, p) => sum + p.earned, 0);
        const total = user.promoStats.reduce((sum, p) => sum + p.earned, 0);
        return { activePromos: active, currentBalance: balance, totalEarned: total };
    }, [user.promoStats, deletedEventIds]);

     useEffect(() => {
        const fetchEventDetails = async () => {
            if (activePromos.length === 0) {
                setIsLoadingEvents(false);
                return;
            }
            try {
                setIsLoadingEvents(true);
                const eventIds = activePromos.map(p => p.eventId);
                const events = await api.getEventsByIds(eventIds);
                setEventsMap(new Map(events.map(e => [e.id, e])));
            } catch (error) {
                console.error("Failed to fetch event details for promos:", error);
            } finally {
                setIsLoadingEvents(false);
            }
        };

        fetchEventDetails();
    }, [activePromos]);

    // Check for pending payout requests
    useEffect(() => {
        const checkPendingPayouts = async () => {
            try {
                // Use the correct user endpoint, not admin
                const requests = await api.getUserPayoutRequests();
                const isPending = requests.some(r => r.status === 'pending');
                setHasPendingRequest(isPending);
            } catch (e) {
                console.error("Error checking payout status", e);
            }
        };
        checkPendingPayouts();
    }, [user.id, showEarlyPayoutModal]);

    const handleStopPromotion = async () => {
        if (!promoToStop) return;
        try {
            await api.stopPromotion(user.id, promoToStop.eventId);
            
            // Optimistic Update: Remove from UI immediately
            setDeletedEventIds(prev => [...prev, promoToStop.eventId]);
            
            // Trigger background refresh (even if it returns stale data, our local filter handles it)
            onUserUpdate(); 
        } catch (error) {
            console.error("Failed to stop promotion", error);
            alert("Failed to stop promotion. Please try again.");
        } finally {
            setPromoToStop(null);
        }
    };

    const handleCopyLink = (link: string) => {
        navigator.clipboard.writeText(link);
        setCopiedLink(link);
        setTimeout(() => setCopiedLink(null), 2000);
    };
    
    const handleRequestPayout = () => {
        if (!user.stripeConnected) {
            setShowPayoutSetupModal(true);
        } else {
            setShowEarlyPayoutModal(true);
        }
    };
    
    const confirmEarlyPayout = async () => {
        try {
            await api.requestEarlyPayout(user.id, currentBalance);
            setShowEarlyPayoutModal(false);
            setHasPendingRequest(true);
            alert("Payout request submitted! You will be notified once it's approved.");
            onUserUpdate();
        } catch (e) {
            console.error(e);
            alert("Failed to submit payout request.");
        }
    };
    
    const SubTabButton: React.FC<{ tabName: string, label: string }> = ({ tabName, label }) => (
        <button
            onClick={() => setActiveSubTab(tabName)}
            className={`px-4 py-2 rounded-full text-sm font-semibold transition-colors ${
                activeSubTab === tabName ? 'bg-purple-600 text-white' : 'text-neutral-400 hover:bg-neutral-800 hover:text-white'
            }`}
        >
            {label}
        </button>
    );

    return (
        <div>
            {/* Header Stats */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">
                <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 relative">
                    <h3 className="text-sm font-medium text-neutral-400 mb-2">Current Balance</h3>
                    <p className="text-4xl font-bold text-green-400 text-glow">${currentBalance.toFixed(2)}</p>
                    {currentBalance > 0 && (
                        <button 
                            onClick={handleRequestPayout}
                            disabled={hasPendingRequest}
                            className={`mt-4 w-full py-2 bg-green-600/20 text-green-400 border border-green-600/30 rounded-lg transition-colors flex items-center justify-center gap-2 ${hasPendingRequest ? 'opacity-50 cursor-not-allowed' : 'hover:bg-green-600/30'}`}
                        >
                            {hasPendingRequest ? (
                                <>
                                    <ClockIcon className="w-4 h-4" />
                                    <span className="text-sm font-semibold">Payout Requested</span>
                                </>
                            ) : (
                                <>
                                    <DollarSignIcon className="w-4 h-4" />
                                    <span className="text-sm font-semibold">Request Early Payout</span>
                                </>
                            )}
                        </button>
                    )}
                </div>
                <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6">
                    <h3 className="text-sm font-medium text-neutral-400 mb-2">Total Earned (All Time)</h3>
                    <p className="text-4xl font-bold text-white">${totalEarned.toFixed(2)}</p>
                </div>
                <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6">
                    <h3 className="text-sm font-medium text-neutral-400 mb-2">Next Payout</h3>
                    <p className="text-3xl font-bold text-white">July 1, 2025</p>
                </div>
            </div>

            {/* Sub-tabs */}
            <div className="flex items-center space-x-2 mb-8">
                <SubTabButton tabName="active" label={`Active Promotions (${activePromos.length})`} />
                <SubTabButton tabName="payouts" label={`Payout History (${user.payouts.length})`} />
            </div>

            {/* Content */}
            {activeSubTab === 'active' && (
                <div className="space-y-6">
                    {activePromos.length > 0 ? (
                        activePromos.map(promo => {
                             // Use enriched data from promoStats, fallback to map if needed
                             const event = eventsMap.get(promo.eventId);
                             const competition = event?.competitions?.find(c => c.status === 'ACTIVE');

                            return (
                                <div key={promo.eventId} className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6">
                                    <div className="flex flex-col md:flex-row md:items-center gap-6">
                                        <div className="flex-grow">
                                            <div className="flex justify-between items-start">
                                                <h4 className="text-xl font-bold text-white mb-2">{promo.eventName}</h4>
                                                <button onClick={() => setPromoToStop(promo)} className="text-neutral-500 hover:text-red-400 transition-colors"><TrashIcon className="w-5 h-5"/></button>
                                            </div>
                                        
                                            <div className="flex items-center space-x-2">
                                                <input type="text" readOnly value={promo.promoLink} className="w-full h-10 px-4 bg-neutral-800 border border-neutral-700 rounded-l-full text-white text-sm focus:outline-none"/>
                                                <button onClick={() => handleCopyLink(promo.promoLink)} className="h-10 px-4 bg-purple-600 text-white text-sm font-semibold rounded-r-full hover:bg-purple-500 transition-colors flex-shrink-0">
                                                    {copiedLink === promo.promoLink ? 'Copied!' : <ClipboardIcon className="w-4 h-4" />}
                                                </button>
                                            </div>
                                        </div>
                                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 flex-shrink-0 md:w-1/2">
                                            <div className="text-center md:text-left"><p className="text-sm text-neutral-400">Clicks</p><p className="text-2xl font-bold text-white">{promo.clicks}</p></div>
                                            <div className="text-center md:text-left"><p className="text-sm text-neutral-400">Sales</p><p className="text-2xl font-bold text-white">{promo.sales}</p></div>
                                            <div className="text-center md:text-left"><p className="text-sm text-neutral-400">Commission</p><p className="text-2xl font-bold text-white">{promo.commissionPct}%</p></div>
                                            <div className="text-center md:text-left"><p className="text-sm text-neutral-400">Earned</p><p className="text-2xl font-bold text-green-400">${promo.earned.toFixed(2)}</p></div>
                                        </div>
                                    </div>
                                    {competition && !isLoadingEvents && (
                                        <CompetitionLeaderboard eventId={promo.eventId} userId={user.id} />
                                    )}
                                </div>
                            )
                        })
                    ) : (
                        <div className="text-center py-16 bg-neutral-900/50 border border-neutral-800 rounded-2xl">
                            <MegaphoneIcon className="w-12 h-12 mx-auto text-neutral-600 mb-4" />
                            <h3 className="text-xl font-bold text-white">No Active Promotions</h3>
                            <p className="text-neutral-500 mt-2 mb-6">Find an event you love and start promoting to earn commissions.</p>
                            <button onClick={() => navigate('/')} className="px-5 py-2 bg-purple-600 text-white text-sm font-semibold rounded-full hover:bg-purple-500 transition-all duration-300 shadow-lg shadow-purple-500/20">Discover Events</button>
                        </div>
                    )}
                </div>
            )}
            
             {activeSubTab === 'payouts' && (
                <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6">
                    {user.payouts.length > 0 ? (
                        <div className="divide-y divide-neutral-800">
                            {user.payouts.map(payout => (
                                <div key={payout.id} className="flex items-center justify-between py-4">
                                    <div className="flex items-center">
                                        <div className="w-10 h-10 rounded-full bg-green-500/10 flex items-center justify-center mr-4"><DollarSignIcon className="w-5 h-5 text-green-400"/></div>
                                        <div>
                                            <p className="font-semibold text-white">Payout Received</p>
                                            <p className="text-sm text-neutral-400">{new Date(payout.date).toLocaleDateString(undefined, { year: 'numeric', month: 'long', day: 'numeric' })}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3">
                                        <p className="text-lg font-bold text-white">${payout.amount.toFixed(2)}</p>
                                        {payout.status === 'Completed' ? (
                                            <div title="Completed">
                                                <CheckCircleIcon className="w-5 h-5 text-green-400" />
                                            </div>
                                        ) : (
                                            <p className="text-sm font-medium text-yellow-400 bg-yellow-500/10 px-3 py-1 rounded-full">{payout.status}</p>
                                        )}
                                    </div>
                                </div>
                            ))}
                        </div>
                    ) : (
                         <div className="text-center py-16">
                            <h3 className="text-xl font-bold text-white">No Payout History</h3>
                            <p className="text-neutral-500 mt-2">Your completed payouts will appear here.</p>
                        </div>
                    )}
                </div>
            )}

            {promoToStop && (
                <div className="fixed inset-0 z-[100] flex items-center justify-center p-6 bg-black/80 backdrop-blur-sm">
                    <div className="w-full max-w-sm bg-neutral-900 border border-neutral-700 rounded-2xl p-8 text-center">
                        <h3 className="text-xl font-bold text-white mb-2">Are you sure?</h3>
                        <p className="text-neutral-400 mb-6">This will stop your promotion for "{promoToStop.eventName}". You will keep your earnings.</p>
                        <div className="flex justify-center space-x-4">
                            <button onClick={() => setPromoToStop(null)} className="px-6 py-2 text-sm font-semibold text-neutral-300 bg-neutral-800 hover:bg-neutral-700 rounded-full transition-colors">Cancel</button>
                            <button onClick={handleStopPromotion} className="px-6 py-2 text-sm font-semibold text-white bg-red-600 hover:bg-red-500 rounded-full transition-colors">Stop Promoting</button>
                        </div>
                    </div>
                </div>
            )}

            <Modal isOpen={showPayoutSetupModal} onClose={() => setShowPayoutSetupModal(false)}>
                <div className="w-full max-w-sm bg-neutral-900 border border-neutral-800 rounded-2xl p-8 text-center shadow-2xl">
                    <div className="w-16 h-16 bg-neutral-800 rounded-full flex items-center justify-center mx-auto mb-4 border border-neutral-700">
                        <CreditCardIcon className="w-8 h-8 text-neutral-400" />
                    </div>
                    <h3 className="text-xl font-bold text-white mb-2">Payout Setup Required</h3>
                    <p className="text-neutral-400 mb-6 text-sm">You need to connect your bank account via Stripe before you can request a payout.</p>
                    <button 
                        onClick={() => navigate('/settings', { state: { defaultTab: 'payouts' } })}
                        className="w-full px-6 py-3 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-full transition-colors flex items-center justify-center gap-2"
                    >
                        Connect Bank Account <ArrowRightIcon className="w-4 h-4" />
                    </button>
                </div>
            </Modal>

            <Modal isOpen={showEarlyPayoutModal} onClose={() => setShowEarlyPayoutModal(false)}>
                <div className="w-full max-w-md bg-neutral-900 border border-neutral-800 rounded-2xl overflow-hidden shadow-2xl">
                    <div className="p-8">
                        <div className="w-16 h-16 bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-6 border border-green-500/20">
                            <DollarSignIcon className="w-8 h-8 text-green-400" />
                        </div>
                        <h3 className="text-2xl font-bold text-white text-center mb-2">Request Early Payout</h3>
                        <p className="text-neutral-400 text-center text-sm mb-8">
                            Instead of waiting for the standard monthly payout schedule, you can request to have your funds transferred immediately.
                        </p>
                        
                        <div className="bg-neutral-800 rounded-xl p-4 space-y-3 border border-neutral-700">
                            <div className="flex justify-between text-sm">
                                <span className="text-neutral-400">Gross Amount</span>
                                <span className="text-white font-medium">${currentBalance.toFixed(2)}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-neutral-400">Instant Transfer Fee (2%)</span>
                                <span className="text-red-400 font-medium">-${(currentBalance * 0.02).toFixed(2)}</span>
                            </div>
                            <div className="border-t border-neutral-700 pt-3 flex justify-between items-center">
                                <span className="text-white font-semibold">Net Payout</span>
                                <span className="text-green-400 font-bold text-xl">${(currentBalance * 0.98).toFixed(2)}</span>
                            </div>
                        </div>
                    </div>
                    <div className="bg-neutral-800/50 p-6 flex justify-center gap-4 border-t border-neutral-800">
                        <button 
                            onClick={() => setShowEarlyPayoutModal(false)}
                            className="px-6 py-2.5 text-sm font-semibold text-neutral-300 hover:text-white transition-colors"
                        >
                            Cancel
                        </button>
                        <button 
                            onClick={confirmEarlyPayout}
                            className="px-6 py-2.5 bg-green-600 hover:bg-green-500 text-white font-bold rounded-full shadow-lg shadow-green-600/20 transition-colors"
                        >
                            Confirm & Payout
                        </button>
                    </div>
                </div>
            </Modal>
        </div>
    );
};

export default PromoterPortal;

import React, { useState, useMemo, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { useNavigate } from 'react-router-dom';
import * as api from '../services/api';
import { PromoStat, User, Event as EventType, HostFinancials, LedgerEntry } from '../types';
import PortalHeader from '../components/PortalHeader';
import { TrashIcon, ClipboardIcon, MegaphoneIcon, DollarSignIcon, ArrowRightIcon, CheckCircleIcon, ClockIcon } from '../components/Icons';
import CompetitionLeaderboard from '../components/CompetitionLeaderboard';

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

const TransactionRow: React.FC<{ entry: LedgerEntry }> = ({ entry }) => (
    <tr className="border-b border-neutral-800 hover:bg-neutral-800/30">
        <td className="px-6 py-4 text-neutral-400 text-sm">
            {new Date(entry.createdAt).toLocaleDateString()}
        </td>
        <td className="px-6 py-4">
            <div className="font-medium text-white">{entry.description}</div>
            <div className="text-xs text-neutral-500 font-mono mt-1">{entry.referenceId}</div>
            <span className={`mt-1 inline-block text-[10px] font-bold px-1.5 py-0.5 rounded border uppercase ${
                entry.type === 'COMMISSION' ? 'bg-blue-500/10 text-blue-400 border-blue-500/20' : 
                entry.type === 'PAYOUT' ? 'bg-yellow-500/10 text-yellow-400 border-yellow-500/20' : 
                entry.type === 'CLAWBACK' ? 'bg-red-500/10 text-red-400 border-red-500/20' : 
                'bg-neutral-800 text-neutral-500 border-neutral-700'
            }`}>
                {entry.type}
            </span>
        </td>
        <td className={`px-6 py-4 font-mono font-bold text-right ${entry.amount >= 0 ? 'text-green-400' : 'text-red-400'}`}>
            {entry.amount >= 0 ? '+' : ''}{entry.amount.toFixed(2)}
        </td>
        <td className="px-6 py-4 text-center">
            <span className="text-xs bg-neutral-800 text-neutral-400 px-2 py-1 rounded">
                {entry.status}
            </span>
        </td>
    </tr>
);

const PromotionsContent: React.FC<{ user: User, onUserUpdate: () => void }> = ({ user, onUserUpdate }) => {
    const [activeSubTab, setActiveSubTab] = useState('active');
    const [promoToStop, setPromoToStop] = useState<PromoStat | null>(null);
    const [copiedLink, setCopiedLink] = useState<string | null>(null);
    const navigate = useNavigate();
    
    // Note: User profile already fetches promotions and enriches them in api.ts
    // eventsMap is mostly redundant if api.ts does its job, but we keep it for competition data
    const [eventsMap, setEventsMap] = useState<Map<string, EventType>>(new Map());
    const [isLoadingEvents, setIsLoadingEvents] = useState(true);
    
    // Track locally deleted IDs to support optimistic UI updates when API returns stale data
    const [deletedEventIds, setDeletedEventIds] = useState<string[]>([]);

    // New State for Ledger
    const [financials, setFinancials] = useState<HostFinancials | null>(null);
    const [ledger, setLedger] = useState<LedgerEntry[]>([]);

    // ADD THIS EFFECT: Force a refresh of user data (including promoStats) on mount
    useEffect(() => {
        onUserUpdate();
    }, []); // Empty dependency array ensures this runs once when the tab opens

    useEffect(() => {
        const loadFinancials = async () => {
            try {
                const finData = await api.getHostFinancials(user.id);
                setFinancials(finData);
                
                const ledgerData = await api.getLedgerHistory(user.id);
                setLedger(ledgerData);
            } catch (error) {
                console.error("Error loading financials or ledger", error);
            }
        };
        loadFinancials();
    }, [user.id]);

    const activePromos = useMemo(() => {
        return user.promoStats
            .filter(p => p.status === 'active')
            .filter(p => !deletedEventIds.includes(p.eventId)); // Filter out locally deleted items
    }, [user.promoStats, deletedEventIds]);

    const currentBalance = financials?.pendingBalance || 0;
    const totalEarned = financials?.netRevenue || 0;

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
                <SubTabButton tabName="transactions" label="Transaction History" />
                <SubTabButton tabName="payouts" label={`Payout History (${user.payouts.length})`} />
            </div>

            {/* Content */}
            {activeSubTab === 'active' && (
                <div className="space-y-6">
                    {activePromos.length > 0 ? (
                        activePromos.map(promo => {
                             // Use enriched data from promoStats, fallback to map if needed
                             const event = eventsMap.get(promo.eventId);
                             // REPLACEMENT LOGIC:
                             // 1. Try to find the competition specifically linked to this promotion
                             // 2. If not found, find the first one that is either ACTIVE or SETUP
                             let competition = null;
                             if (event?.competitions) {
                                 // Check if the promo object has a specific competition ID (handle both camel and snake case if unsure of API)
                                 const linkedCompId = (promo as any).competitionId || (promo as any).competition_id;
                                 
                                 if (linkedCompId) {
                                     competition = event.competitions.find(c => c.id === linkedCompId);
                                 }
                                 
                                 // Fallback: If we still don't have one, grab the first valid one
                                 if (!competition) {
                                     competition = event.competitions.find(c => c.status === 'ACTIVE' || c.status === 'SETUP');
                                 }
                             }

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

            {activeSubTab === 'transactions' && (
                <div className="bg-neutral-900 border border-neutral-800 rounded-2xl overflow-hidden">
                    {ledger.length > 0 ? (
                        <table className="w-full text-left">
                            <thead className="bg-neutral-950 border-b border-neutral-800 text-xs text-neutral-500 uppercase">
                                <tr>
                                    <th className="px-6 py-4">Date</th>
                                    <th className="px-6 py-4">Description</th>
                                    <th className="px-6 py-4 text-right">Amount</th>
                                    <th className="px-6 py-4 text-center">Status</th>
                                </tr>
                            </thead>
                            <tbody>
                                {ledger.map(entry => (
                                    <TransactionRow key={entry.id} entry={entry} />
                                ))}
                            </tbody>
                        </table>
                    ) : (
                        <div className="text-center py-16">
                            <h3 className="text-xl font-bold text-white">No Transactions Yet</h3>
                            <p className="text-neutral-500 mt-2">Transactions from your sales and payouts will appear here.</p>
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
        </div>
    );
};

export default PromoterPortal;

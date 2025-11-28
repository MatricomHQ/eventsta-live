
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { HostFinancials, User } from '../types';
import * as api from '../services/api';
import { DollarSignIcon, BarChartIcon, CreditCardIcon, CheckCircleIcon, ClockIcon, ArrowRightIcon } from './Icons';
import Modal from './Modal';

interface HostFinancialsDashboardProps {
    user: User;
    onPayoutRequest?: () => void;
}

const HostFinancialsDashboard: React.FC<HostFinancialsDashboardProps> = ({ user }) => {
    const [financials, setFinancials] = useState<HostFinancials | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [showPayoutModal, setShowPayoutModal] = useState(false);
    const navigate = useNavigate();

    useEffect(() => {
        const fetchData = async () => {
            setIsLoading(true);
            try {
                const data = await api.getHostFinancials(user.id);
                setFinancials(data);
            } catch (e) {
                console.error("Error loading financials", e);
            } finally {
                setIsLoading(false);
            }
        };
        fetchData();
    }, [user.id]);

    if (isLoading) {
        return <div className="text-center py-12 text-neutral-500">Loading financial data...</div>;
    }

    if (!financials) return null;

    return (
        <div className="space-y-8 animate-fade-in">
            
            {/* Account Status Banner */}
            <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 flex flex-col md:flex-row justify-between items-center gap-6">
                <div className="flex items-center gap-4">
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center ${user.stripeConnected ? 'bg-green-500/10 text-green-400' : 'bg-yellow-500/10 text-yellow-400'}`}>
                        <CreditCardIcon className="w-6 h-6" />
                    </div>
                    <div>
                        <h3 className="font-bold text-white text-lg">Payout Account</h3>
                        <p className="text-sm text-neutral-400">
                            {user.stripeConnected 
                                ? `Connected via Stripe (${user.stripeAccountId})` 
                                : "Connect a bank account to receive payouts."}
                        </p>
                    </div>
                </div>
                {user.stripeConnected ? (
                    <div className="flex items-center gap-2 px-4 py-2 bg-green-900/20 border border-green-900/50 rounded-full text-green-400 text-sm font-medium">
                        <CheckCircleIcon className="w-4 h-4" /> Active & Ready
                    </div>
                ) : (
                    <button 
                        onClick={() => navigate('/settings', { state: { defaultTab: 'payouts' } })}
                        className="px-6 py-3 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-full transition-colors"
                    >
                        Go To Settings
                    </button>
                )}
            </div>

            {/* KPI Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6">
                    <p className="text-sm text-neutral-400 font-medium uppercase mb-2">Pending Balance</p>
                    <h2 className="text-4xl font-bold text-white text-glow">${financials.pendingBalance.toFixed(2)}</h2>
                    <button 
                        onClick={() => setShowPayoutModal(true)}
                        disabled={financials.pendingBalance <= 0 || !user.stripeConnected}
                        className="mt-4 w-full py-2.5 rounded-lg bg-green-600/10 text-green-400 hover:bg-green-600/20 border border-green-600/20 font-semibold text-sm transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                        Request Payout <ArrowRightIcon className="w-4 h-4" />
                    </button>
                </div>
                <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6">
                    <p className="text-sm text-neutral-400 font-medium uppercase mb-2">Net Revenue</p>
                    <h2 className="text-3xl font-bold text-white">${financials.netRevenue.toFixed(2)}</h2>
                    <p className="text-xs text-neutral-500 mt-2">Total earnings after fees & commissions.</p>
                </div>
                <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6">
                    <p className="text-sm text-neutral-400 font-medium uppercase mb-2">Gross Volume</p>
                    <h2 className="text-3xl font-bold text-white">${financials.grossVolume.toFixed(2)}</h2>
                    <p className="text-xs text-neutral-500 mt-2">Total value of tickets sold.</p>
                </div>
            </div>

            {/* Detailed Breakdown */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Revenue Chart / Breakdown */}
                <div className="lg:col-span-2 bg-neutral-900 border border-neutral-800 rounded-2xl p-8">
                    <h3 className="text-xl font-bold text-white mb-6 flex items-center">
                        <BarChartIcon className="w-5 h-5 mr-3 text-purple-400" /> Revenue Breakdown
                    </h3>
                    
                    <div className="space-y-4">
                        <div className="bg-neutral-800/50 rounded-xl p-4 border border-neutral-800">
                            <div className="flex justify-between items-center mb-2">
                                <span className="text-neutral-300 font-medium">Gross Ticket Sales</span>
                                <span className="text-white font-bold">${financials.grossVolume.toFixed(2)}</span>
                            </div>
                            <div className="w-full bg-neutral-700 h-2 rounded-full overflow-hidden">
                                <div className="bg-purple-500 h-full w-full"></div>
                            </div>
                        </div>

                        <div className="bg-neutral-800/50 rounded-xl p-4 border border-neutral-800">
                            <div className="flex justify-between items-center mb-2">
                                <span className="text-neutral-300 font-medium">Platform & Processing Fees</span>
                                <span className="text-white font-bold">-${financials.platformFees.toFixed(2)}</span>
                            </div>
                            <div className="w-full bg-neutral-700 h-2 rounded-full overflow-hidden">
                                <div className="bg-red-400 h-full" style={{ width: `${(financials.platformFees / financials.grossVolume) * 100}%` }}></div>
                            </div>
                            <p className="text-xs text-neutral-500 mt-2">Includes credit card processing and platform service fees.</p>
                        </div>

                        <div className="bg-neutral-800/50 rounded-xl p-4 border border-neutral-800">
                            <div className="flex justify-between items-center mb-2">
                                <span className="text-neutral-300 font-medium">Net Earnings</span>
                                <span className="text-green-400 font-bold">${financials.netRevenue.toFixed(2)}</span>
                            </div>
                            <div className="w-full bg-neutral-700 h-2 rounded-full overflow-hidden">
                                <div className="bg-green-500 h-full" style={{ width: `${(financials.netRevenue / financials.grossVolume) * 100}%` }}></div>
                            </div>
                        </div>
                    </div>
                </div>

                {/* Recent Payouts */}
                <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-8 flex flex-col">
                    <h3 className="text-xl font-bold text-white mb-6 flex items-center">
                        <DollarSignIcon className="w-5 h-5 mr-3 text-green-400" /> Recent Payouts
                    </h3>
                    
                    <div className="flex-grow overflow-y-auto custom-scrollbar pr-2 space-y-4 max-h-[300px]">
                        {financials.payouts.length === 0 ? (
                            <p className="text-neutral-500 text-center py-8 text-sm">No payouts yet.</p>
                        ) : (
                            financials.payouts.map(payout => (
                                <div key={payout.id} className="flex items-center justify-between p-3 rounded-lg hover:bg-neutral-800/50 transition-colors">
                                    <div className="flex items-center gap-3">
                                        <div className={`w-8 h-8 rounded-full flex items-center justify-center ${payout.status === 'Completed' ? 'bg-green-500/10 text-green-400' : 'bg-yellow-500/10 text-yellow-400'}`}>
                                            {payout.status === 'Completed' ? <CheckCircleIcon className="w-4 h-4" /> : <ClockIcon className="w-4 h-4" />}
                                        </div>
                                        <div>
                                            <p className="text-sm font-bold text-white">${payout.amount.toFixed(2)}</p>
                                            <p className="text-xs text-neutral-500">{new Date(payout.date).toLocaleDateString()}</p>
                                        </div>
                                    </div>
                                    <span className={`text-xs font-bold px-2 py-1 rounded-md ${payout.status === 'Completed' ? 'text-green-500 bg-green-900/20' : 'text-yellow-500 bg-yellow-900/20'}`}>
                                        {payout.status}
                                    </span>
                                </div>
                            ))
                        )}
                    </div>
                    {financials.payouts.length > 0 && (
                        <div className="mt-4 pt-4 border-t border-neutral-800 text-center">
                            <p className="text-sm text-neutral-400">Total Payouts: <span className="text-white font-bold">${financials.totalPayouts.toFixed(2)}</span></p>
                        </div>
                    )}
                </div>
            </div>

            <Modal isOpen={showPayoutModal} onClose={() => setShowPayoutModal(false)}>
                <div className="w-full max-w-md bg-neutral-900 border border-neutral-800 rounded-2xl p-8 shadow-2xl text-center">
                    <div className="w-16 h-16 bg-green-500/10 rounded-full flex items-center justify-center mx-auto mb-6 border border-green-500/20">
                        <DollarSignIcon className="w-8 h-8 text-green-400" />
                    </div>
                    <h3 className="text-2xl font-bold text-white mb-2">Request Payout</h3>
                    <p className="text-neutral-400 mb-6">
                        You are requesting a payout of <span className="text-white font-bold">${financials.pendingBalance.toFixed(2)}</span>. 
                        Funds typically arrive in 1-2 business days.
                    </p>
                    <div className="flex gap-3 justify-center">
                        <button 
                            onClick={() => setShowPayoutModal(false)}
                            className="px-6 py-2 rounded-full text-neutral-300 hover:text-white hover:bg-neutral-800 transition-colors"
                        >
                            Cancel
                        </button>
                        <button 
                            onClick={() => {
                                alert("Payout requested successfully!");
                                setShowPayoutModal(false);
                            }}
                            className="px-6 py-2 bg-green-600 hover:bg-green-500 text-white font-bold rounded-full shadow-lg shadow-green-900/20 transition-colors"
                        >
                            Confirm Payout
                        </button>
                    </div>
                </div>
            </Modal>
        </div>
    );
};

export default HostFinancialsDashboard;

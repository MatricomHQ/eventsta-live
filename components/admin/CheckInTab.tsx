
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import * as api from '../../services/api';
import { Order } from '../../types';
import { CheckCircleIcon, CameraIcon, UsersIcon, SearchIcon, XCircleIcon, TicketIcon } from '../Icons';
import QRScanner from '../QRScanner';
import Modal from '../Modal';

interface CheckInTicketItem {
    uniqueId: string;
    orderId: string;
    purchaserName: string;
    purchaserEmail: string;
    type: string;
    status: 'Checked In' | 'Out';
    checkInTime?: string;
    ticketNumber: number;
}

const CheckInTab: React.FC<{ eventId: string }> = ({ eventId }) => {
    const [mode, setMode] = useState<'scanner' | 'list'>('list');
    const [scanResult, setScanResult] = useState<{ valid: boolean; message: string; ticket?: any } | null>(null);
    const [isScanning, setIsScanning] = useState(true);
    const [manualCode, setManualCode] = useState('');
    
    // List Mode State
    const [tickets, setTickets] = useState<CheckInTicketItem[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [isLoadingList, setIsLoadingList] = useState(false);
    const [stats, setStats] = useState({ checkedIn: 0, total: 0 });
    
    // Modal State
    const [selectedTicketForModal, setSelectedTicketForModal] = useState<CheckInTicketItem | null>(null);

    const fetchTickets = useCallback(async () => {
        setIsLoadingList(true);
        try {
            const [orders, event] = await Promise.all([
                api.getOrdersForEvent(eventId),
                api.getEventDetails(eventId)
            ]);

            const checkIns = event.checkIns || {};
            const flatTickets: CheckInTicketItem[] = [];

            orders.forEach(order => {
                if (order.status !== 'Completed') return;
                
                let ticketIndex = 0;
                order.items.forEach(item => {
                    for (let i = 0; i < item.quantity; i++) {
                        const uniqueId = `${order.orderId}-${ticketIndex}`;
                        const isCheckedIn = !!checkIns[uniqueId];
                        
                        flatTickets.push({
                            uniqueId,
                            orderId: order.orderId,
                            purchaserName: order.purchaserName,
                            purchaserEmail: order.purchaserEmail,
                            type: item.ticketType,
                            status: isCheckedIn ? 'Checked In' : 'Out',
                            checkInTime: isCheckedIn ? checkIns[uniqueId] : undefined,
                            ticketNumber: ticketIndex + 1
                        });
                        ticketIndex++;
                    }
                });
            });

            setTickets(flatTickets);
            setStats({
                checkedIn: flatTickets.filter(t => t.status === 'Checked In').length,
                total: flatTickets.length
            });

        } catch (e) {
            console.error("Error fetching check-in data", e);
        } finally {
            setIsLoadingList(false);
        }
    }, [eventId]);

    useEffect(() => {
        fetchTickets();
    }, [fetchTickets]);

    // Filter logic
    const filteredTickets = useMemo(() => {
        if (!searchTerm) return tickets;
        const lowerSearch = searchTerm.toLowerCase();
        return tickets.filter(t => 
            t.purchaserName.toLowerCase().includes(lowerSearch) ||
            t.uniqueId.toLowerCase().includes(lowerSearch) ||
            t.purchaserEmail.toLowerCase().includes(lowerSearch)
        );
    }, [tickets, searchTerm]);

    // Scanner Logic
    const handleScan = async (data: string) => {
        if (!isScanning) return;
        setIsScanning(false);
        try {
            const result = await api.validateTicket(eventId, data);
            setScanResult(result);
            // Refresh list data silently to keep sync
            fetchTickets();
        } catch (e) {
            console.error(e);
            setScanResult({ valid: false, message: 'Error validating ticket' });
        }
    };

    const handleCheckIn = async (ticketId: string, e?: React.MouseEvent) => {
        if (e) e.stopPropagation();
        try {
            await api.checkInTicket(eventId, ticketId);
            const now = new Date().toISOString();
            // Update local state immediately for responsiveness
            setTickets(prev => prev.map(t => t.uniqueId === ticketId ? { ...t, status: 'Checked In', checkInTime: now } : t));
            setStats(prev => ({ ...prev, checkedIn: prev.checkedIn + 1 }));
            
            // Update modal state if open
            if (selectedTicketForModal?.uniqueId === ticketId) {
                setSelectedTicketForModal(prev => prev ? { ...prev, status: 'Checked In', checkInTime: now } : null);
            }

            // If scanning, update scan result
            if (mode === 'scanner' && scanResult?.ticket?.id === ticketId) {
               setScanResult(prev => prev ? { ...prev, ticket: { ...prev.ticket, checkedIn: true } } : null);
            }
        } catch (e) {
            alert("Failed to check in");
        }
    };

    const handleUndoCheckIn = async (ticketId: string, e?: React.MouseEvent) => {
        if (e) e.stopPropagation();
        try {
            await api.undoCheckIn(eventId, ticketId);
            setTickets(prev => prev.map(t => t.uniqueId === ticketId ? { ...t, status: 'Out', checkInTime: undefined } : t));
            setStats(prev => ({ ...prev, checkedIn: prev.checkedIn - 1 }));
            
            // Update modal state if open
            if (selectedTicketForModal?.uniqueId === ticketId) {
                setSelectedTicketForModal(prev => prev ? { ...prev, status: 'Out', checkInTime: undefined } : null);
            }

             if (mode === 'scanner' && scanResult?.ticket?.id === ticketId) {
               setScanResult(prev => prev ? { ...prev, ticket: { ...prev.ticket, checkedIn: false } } : null);
            }
        } catch (e) {
            console.error(e);
            alert("Failed to undo check-in");
        }
    };

    const resetScan = () => {
        setScanResult(null);
        setIsScanning(true);
    };

    return (
        <div className="space-y-6">
            {/* Header Area */}
            <div className="flex flex-col md:flex-row justify-between items-start md:items-end gap-4 mb-8">
                <div>
                    <h1 className="text-4xl font-bold tracking-tight text-white flex items-center gap-3">
                        <CheckCircleIcon className="w-8 h-8 text-white" /> Check-in
                    </h1>
                </div>
                
                {/* Toggle Control */}
                <div className="bg-neutral-900 p-1 rounded-lg border border-neutral-800 flex items-center">
                    <button 
                        onClick={() => setMode('scanner')}
                        className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${mode === 'scanner' ? 'bg-neutral-800 text-white shadow-sm' : 'text-neutral-400 hover:text-white'}`}
                    >
                        <CameraIcon className="w-4 h-4" /> Live Scanner
                    </button>
                    <button 
                        onClick={() => setMode('list')}
                        className={`flex items-center gap-2 px-4 py-2 rounded-md text-sm font-medium transition-all ${mode === 'list' ? 'bg-neutral-800 text-white shadow-sm' : 'text-neutral-400 hover:text-white'}`}
                    >
                        <UsersIcon className="w-4 h-4" /> Attendee List
                    </button>
                </div>
            </div>

            {mode === 'list' ? (
                <div className="animate-fade-in">
                    <div className="bg-neutral-900/50 border border-neutral-800 rounded-2xl p-6">
                        <div className="flex flex-col md:flex-row justify-between items-center gap-4 mb-6">
                            <div>
                                <h3 className="text-xl font-bold text-white">Attendee List</h3>
                                <p className="text-neutral-400 text-sm mt-1">{stats.checkedIn} / {stats.total} Checked In</p>
                            </div>
                            <div className="relative w-full md:w-80">
                                <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
                                <input 
                                    type="text" 
                                    placeholder="Search name, email, or ticket ID" 
                                    value={searchTerm}
                                    onChange={e => setSearchTerm(e.target.value)}
                                    className="w-full pl-10 pr-4 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-white focus:outline-none focus:border-purple-500 transition-colors text-sm"
                                />
                            </div>
                        </div>

                        <div className="overflow-x-auto -mx-6 md:mx-0">
                            <table className="w-full text-sm text-left text-neutral-300 min-w-full">
                                <thead className="text-xs text-neutral-500 uppercase bg-neutral-900/50 border-b border-neutral-800">
                                    <tr>
                                        <th className="px-6 py-4 font-medium">Attendee</th>
                                        <th className="hidden md:table-cell px-6 py-4 font-medium">Type</th>
                                        <th className="px-6 py-4 font-medium text-center">Status</th>
                                        <th className="px-6 py-4 font-medium text-right">Action</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-neutral-800">
                                    {isLoadingList ? (
                                        <tr><td colSpan={4} className="px-6 py-8 text-center text-neutral-500">Loading list...</td></tr>
                                    ) : filteredTickets.length === 0 ? (
                                        <tr><td colSpan={4} className="px-6 py-8 text-center text-neutral-500">No attendees found matching your search.</td></tr>
                                    ) : filteredTickets.map((ticket) => (
                                        <tr 
                                            key={ticket.uniqueId} 
                                            onClick={() => setSelectedTicketForModal(ticket)}
                                            className="hover:bg-neutral-800/30 transition-colors group cursor-pointer"
                                        >
                                            <td className="px-6 py-4 align-middle">
                                                <div className="flex flex-col">
                                                    <span className="text-white font-medium">
                                                        {ticket.purchaserName}
                                                        <sub className="text-neutral-500 ml-1 font-normal">[{ticket.ticketNumber}]</sub>
                                                    </span>
                                                    <span className="text-xs text-neutral-500">{ticket.purchaserEmail}</span>
                                                </div>
                                            </td>
                                            <td className="hidden md:table-cell px-6 py-4 align-middle">
                                                <span className="inline-block px-2 py-1 rounded bg-neutral-800 border border-neutral-700 text-xs text-neutral-300 whitespace-nowrap">
                                                    {ticket.type}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-center align-middle">
                                                 <span className={`inline-flex items-center justify-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${
                                                    ticket.status === 'Checked In' 
                                                    ? 'bg-green-500/10 text-green-400 border-green-500/20' 
                                                    : 'bg-neutral-800 text-neutral-500 border-neutral-700'
                                                }`}>
                                                    {ticket.status}
                                                </span>
                                            </td>
                                            <td className="px-6 py-4 text-right align-middle whitespace-nowrap">
                                                {ticket.status === 'Out' ? (
                                                    <button 
                                                        onClick={(e) => handleCheckIn(ticket.uniqueId, e)}
                                                        className="inline-flex items-center justify-center px-4 py-2 bg-green-600 hover:bg-green-500 text-white text-xs font-bold rounded-lg transition-colors shadow-lg shadow-green-900/20"
                                                    >
                                                        Check In
                                                    </button>
                                                ) : (
                                                    <button 
                                                        onClick={(e) => handleUndoCheckIn(ticket.uniqueId, e)}
                                                        className="inline-flex items-center justify-center px-4 py-2 bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 text-neutral-300 hover:text-white text-xs font-bold rounded-lg transition-colors"
                                                    >
                                                        Undo
                                                    </button>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            ) : (
                <div className="max-w-xl mx-auto animate-fade-in">
                    {isScanning ? (
                        <div className="space-y-6">
                            <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-1 shadow-2xl">
                                <QRScanner onScan={handleScan} />
                            </div>
                            <div className="flex gap-3">
                                <input 
                                    type="text" 
                                    placeholder="Enter ticket ID manually" 
                                    value={manualCode}
                                    onChange={e => setManualCode(e.target.value)}
                                    className="flex-1 bg-neutral-900 border border-neutral-800 rounded-xl px-5 py-3 text-white focus:outline-none focus:ring-2 focus:ring-purple-500 placeholder-neutral-600"
                                />
                                <button onClick={() => handleScan(manualCode)} className="bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 text-white px-6 py-3 rounded-xl font-semibold transition-colors">Check</button>
                            </div>
                        </div>
                    ) : (
                        <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-10 text-center shadow-2xl">
                            <div className={`w-24 h-24 rounded-full flex items-center justify-center mx-auto mb-6 ${scanResult?.valid ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'}`}>
                                {scanResult?.valid ? <CheckCircleIcon className="w-12 h-12" /> : <XCircleIcon className="w-12 h-12" />}
                            </div>
                            <h3 className="text-3xl font-bold text-white mb-2">{scanResult?.message}</h3>
                            {scanResult?.ticket && (
                                <div className="bg-neutral-800/50 rounded-xl p-6 mb-8 border border-neutral-800 mt-6">
                                    <p className="text-xl text-white font-bold mb-1">{scanResult.ticket.holder}</p>
                                    <p className="text-purple-400 font-medium">{scanResult.ticket.type}</p>
                                    <p className="text-xs text-neutral-500 font-mono mt-4">ID: {scanResult.ticket.id}</p>
                                    {scanResult.ticket.checkedIn && <div className="mt-4 inline-block px-3 py-1 bg-green-500/10 text-green-500 text-xs font-bold rounded-full border border-green-500/20">Checked In</div>}
                                </div>
                            )}
                            <div className="flex gap-4 justify-center mt-8">
                                <button onClick={resetScan} className="px-8 py-3 rounded-full border border-neutral-700 text-neutral-300 hover:bg-neutral-800 hover:text-white font-semibold transition-colors">Scan Next</button>
                                {scanResult?.valid && !scanResult.ticket.checkedIn && (
                                    <button onClick={() => handleCheckIn(scanResult!.ticket.id)} className="px-8 py-3 rounded-full bg-green-600 text-white hover:bg-green-500 font-bold shadow-lg shadow-green-900/20 transition-colors">Check In Now</button>
                                )}
                                 {scanResult?.valid && scanResult.ticket.checkedIn && (
                                    <button onClick={() => handleUndoCheckIn(scanResult!.ticket.id)} className="px-8 py-3 rounded-full bg-neutral-800 text-neutral-300 hover:text-white hover:bg-neutral-700 border border-neutral-700 font-bold transition-colors">Undo Check In</button>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Ticket Detail Modal */}
            <Modal isOpen={!!selectedTicketForModal} onClose={() => setSelectedTicketForModal(null)}>
                {selectedTicketForModal && (
                    <TicketDetailModalContent 
                        ticket={selectedTicketForModal} 
                        onCheckIn={(id) => handleCheckIn(id)}
                        onUndo={(id) => handleUndoCheckIn(id)}
                    />
                )}
            </Modal>
        </div>
    );
};

const TicketDetailModalContent: React.FC<{ 
    ticket: CheckInTicketItem, 
    onCheckIn: (id: string) => void, 
    onUndo: (id: string) => void 
}> = ({ ticket, onCheckIn, onUndo }) => {
    const [order, setOrder] = useState<Order | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        api.getOrderDetails(ticket.orderId)
            .then(setOrder)
            .catch(err => console.error("Failed to load order", err))
            .finally(() => setLoading(false));
    }, [ticket.orderId]);

    const orderItem = order?.items.find(i => i.ticketType === ticket.type);
    const pricePaid = orderItem ? orderItem.pricePerTicket : 0;

    return (
        <div className="w-full max-w-md bg-neutral-900 border border-neutral-800 rounded-2xl shadow-2xl overflow-hidden flex flex-col">
             {/* Header */}
            <div className="bg-neutral-950/50 px-6 py-4 border-b border-neutral-800 flex justify-between items-center">
                <div className="flex items-center gap-3">
                    <div className="h-10 w-10 rounded-full bg-neutral-800 flex items-center justify-center border border-neutral-700">
                        <TicketIcon className="w-5 h-5 text-purple-400" />
                    </div>
                    <div>
                        <h3 className="text-xl font-bold text-white">Details</h3>
                        <p className="text-neutral-500 text-xs font-mono">{ticket.uniqueId}</p>
                    </div>
                </div>
            </div>

            <div className="p-6 space-y-6">
                {/* Attendee Info - Compact Header */}
                <div className="flex items-center gap-4">
                    <div className="h-14 w-14 rounded-full bg-gradient-to-br from-purple-600 to-blue-600 flex items-center justify-center text-white font-bold text-xl shadow-lg shadow-purple-500/20">
                        {ticket.purchaserName.charAt(0)}
                    </div>
                    <div>
                        <p className="text-xl font-bold text-white leading-tight">{ticket.purchaserName}</p>
                        <p className="text-sm text-neutral-400">{ticket.purchaserEmail}</p>
                    </div>
                </div>

                {/* Consolidated Details Grid */}
                <div className="grid grid-cols-2 gap-x-4 gap-y-6 bg-neutral-800/30 p-4 rounded-xl border border-neutral-800/50">
                    <div>
                        <p className="text-[10px] uppercase tracking-wider text-neutral-500 font-bold mb-1">Ticket Type</p>
                        <p className="text-white font-semibold text-sm">{ticket.type}</p>
                    </div>
                    
                    <div>
                        <p className="text-[10px] uppercase tracking-wider text-neutral-500 font-bold mb-1">Purchase Date</p>
                        {loading ? (
                            <div className="h-4 w-16 bg-neutral-800 rounded animate-pulse"/>
                        ) : (
                            <p className="text-white font-semibold text-sm">
                                {order ? new Date(order.purchaseDate).toLocaleDateString() : '-'}
                            </p>
                        )}
                    </div>

                    <div>
                        <p className="text-[10px] uppercase tracking-wider text-neutral-500 font-bold mb-1">Price Paid</p>
                        {loading ? (
                            <div className="h-4 w-12 bg-neutral-800 rounded animate-pulse"/>
                        ) : (
                            <p className="text-white font-semibold text-sm">${pricePaid.toFixed(2)}</p>
                        )}
                    </div>

                    <div>
                        <p className="text-[10px] uppercase tracking-wider text-neutral-500 font-bold mb-1">Promo</p>
                        {loading ? (
                            <div className="h-4 w-12 bg-neutral-800 rounded animate-pulse"/>
                        ) : order?.promoCode ? (
                            <span className="inline-block px-2 py-0.5 bg-purple-500/20 text-purple-300 text-[10px] font-bold rounded border border-purple-500/30">
                                {order.promoCode}
                            </span>
                        ) : (
                            <p className="text-neutral-600 text-sm">-</p>
                        )}
                    </div>

                    <div className="col-span-2 pt-2 border-t border-neutral-700/50">
                        <p className="text-[10px] uppercase tracking-wider text-neutral-500 font-bold mb-1">Check-in Status</p>
                        {ticket.checkInTime ? (
                             <p className="text-green-400 font-mono text-sm">Checked in at {new Date(ticket.checkInTime).toLocaleString()}</p>
                        ) : (
                             <p className="text-neutral-400 font-mono text-sm italic">Awaiting Checkin</p>
                        )}
                    </div>
                </div>
            </div>

            {/* Actions */}
            <div className="p-4 bg-neutral-950/50 border-t border-neutral-800">
                {ticket.status === 'Out' ? (
                    <button 
                        onClick={() => onCheckIn(ticket.uniqueId)}
                        className="w-full h-12 bg-green-600 hover:bg-green-500 text-white font-bold rounded-xl shadow-lg shadow-green-900/20 transition-all flex items-center justify-center gap-2"
                    >
                        <CheckCircleIcon className="w-5 h-5" />
                        Check In
                    </button>
                ) : (
                    <button 
                        onClick={() => onUndo(ticket.uniqueId)}
                        className="w-full h-12 bg-neutral-800 hover:bg-neutral-700 border border-neutral-700 text-neutral-300 hover:text-white font-bold rounded-xl transition-all"
                    >
                        Undo Check In
                    </button>
                )}
            </div>
        </div>
    );
};

export default CheckInTab;

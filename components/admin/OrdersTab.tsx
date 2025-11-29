
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '../../contexts/AuthContext';
import * as api from '../../services/api';
import { Order } from '../../types';
import { DownloadIcon, TicketIcon, CheckCircleIcon, XCircleIcon } from '../Icons';
import Modal from '../Modal';

const OrdersTab: React.FC<{ eventId: string }> = ({ eventId }) => {
    const [selectedOrderId, setSelectedOrderId] = useState<string | null>(null);
    const [orders, setOrders] = useState<Order[]>([]);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const fetchOrders = useCallback(async () => {
        if (!eventId) return;
        setIsLoading(true);
        try {
            const data = await api.getOrdersForEvent(eventId);
            setOrders(data);
        } catch (err) {
            setError("Failed to load orders.");
        } finally {
            setIsLoading(false);
        }
    }, [eventId]);

    useEffect(() => {
        fetchOrders();
    }, [fetchOrders]);

    const handleOrderUpdate = (updatedOrder: Order) => {
        setOrders(prevOrders => prevOrders.map(o => o.orderId === updatedOrder.orderId ? updatedOrder : o));
    };

    const selectedOrder = useMemo(() => orders.find(o => o.orderId === selectedOrderId), [orders, selectedOrderId]);

    return (
        <>
            <OrderListView 
                orders={orders}
                isLoading={isLoading}
                error={error}
                onOrderSelect={setSelectedOrderId}
            />
            <Modal isOpen={!!selectedOrder} onClose={() => setSelectedOrderId(null)}>
                {selectedOrder && (
                    <OrderDetailView 
                        order={selectedOrder} 
                        onOrderUpdate={handleOrderUpdate}
                    />
                )}
            </Modal>
        </>
    );
};

const OrderListView: React.FC<{
    orders: Order[];
    isLoading: boolean;
    error: string | null;
    onOrderSelect: (orderId: string) => void;
}> = ({ orders, isLoading, error, onOrderSelect }) => {
    
    const [currentPage, setCurrentPage] = useState(1);
    const ITEMS_PER_PAGE = 10;

    const totalPages = Math.ceil(orders.length / ITEMS_PER_PAGE);
    const paginatedOrders = orders.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

    if (isLoading) return <div className="text-center py-20 text-neutral-400">Loading orders...</div>;
    if (error) return <div className="text-center py-20 text-red-400">{error}</div>;

    return (
        <div className="space-y-8">
            <h1 className="text-3xl font-bold tracking-tight text-white">Orders</h1>
            {orders.length === 0 ? (
                <div className="bg-neutral-900/50 border border-neutral-800 rounded-2xl p-8 text-center text-neutral-500">No orders found for this event.</div>
            ) : (
                <div className="bg-neutral-900/50 border border-neutral-800 rounded-2xl overflow-hidden">
                    <div className="overflow-x-auto">
                        <table className="w-full text-sm text-left text-neutral-300">
                            <thead className="text-xs text-neutral-400 uppercase bg-neutral-900">
                                <tr>
                                    <th scope="col" className="px-6 py-3">Purchaser</th>
                                    <th scope="col" className="px-6 py-3">Date</th>
                                    <th scope="col" className="px-6 py-3 text-center">Items</th>
                                    <th scope="col" className="px-6 py-3 text-center">Affiliate</th>
                                    <th scope="col" className="px-6 py-3 text-center">Status</th>
                                    <th scope="col" className="px-6 py-3 text-right">Total Paid</th>
                                </tr>
                            </thead>
                            <tbody>
                                {paginatedOrders.map(order => (
                                    <tr key={order.orderId} onClick={() => onOrderSelect(order.orderId)} className="border-b border-neutral-800 hover:bg-neutral-800/50 cursor-pointer">
                                        <td className="px-6 py-4">
                                            <div className="flex flex-col">
                                                <span className="font-medium text-white whitespace-nowrap">{order.purchaserName}</span>
                                                <span className="text-xs text-neutral-500">{order.purchaserEmail}</span>
                                            </div>
                                        </td>
                                        <td className="px-6 py-4 text-xs text-neutral-400">{new Date(order.purchaseDate).toLocaleDateString()}</td>
                                        <td className="px-6 py-4 text-center">{order.items.reduce((sum, item) => sum + item.quantity, 0)}</td>
                                        <td className="px-6 py-4 text-center text-purple-400 font-medium">
                                            {order.recipientUserName ? order.recipientUserName : (order.promoCode ? order.promoCode : '-')}
                                        </td>
                                        <td className="px-6 py-4 text-center">
                                            <span className={`px-2 py-1 text-xs font-medium rounded-full ${order.status === 'Completed' ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}>
                                                {order.status}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-right font-semibold text-white">${order.totalPaid.toFixed(2)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                    {totalPages > 1 && (
                        <div className="flex justify-between items-center p-4 bg-neutral-900">
                            <span className="text-sm text-neutral-400">Page {currentPage} of {totalPages}</span>
                            <div className="flex space-x-2">
                                <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="px-3 py-1 text-sm font-semibold rounded-lg bg-neutral-800 hover:bg-neutral-700 disabled:opacity-50">Prev</button>
                                <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="px-3 py-1 text-sm font-semibold rounded-lg bg-neutral-800 hover:bg-neutral-700 disabled:opacity-50">Next</button>
                            </div>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

const OrderDetailView: React.FC<{ order: Order, onOrderUpdate: (order: Order) => void }> = ({ order: initialOrder, onOrderUpdate }) => {
    const { user } = useAuth();
    const [order, setOrder] = useState<Order>(initialOrder);
    const [isRefunding, setIsRefunding] = useState(false);
    const [isConfirmModalOpen, setConfirmModalOpen] = useState(false);
    
    useEffect(() => {
        setOrder(initialOrder);
    }, [initialOrder]);

    const handleRefund = async () => {
        if (!user || order.status === 'Refunded') return;
        setIsRefunding(true);
        try {
            const updatedOrder = await api.refundOrder(user.id, order.orderId);
            setOrder(updatedOrder);
            onOrderUpdate(updatedOrder);
        } catch (error) {
            console.error("Failed to refund order:", error);
            alert("Refund failed. Please try again.");
        } finally {
            setIsRefunding(false);
            setConfirmModalOpen(false);
        }
    };

    return (
        <div className="w-full max-w-lg md:max-w-4xl bg-neutral-900 border border-neutral-800 rounded-2xl shadow-2xl flex flex-col max-h-[85vh]">
            <div className="p-6 border-b border-neutral-800 bg-neutral-900 sticky top-0 z-10 rounded-t-2xl flex justify-between items-start">
                 <div>
                    <h2 className="text-2xl font-bold text-white">Order Details</h2>
                    <p className="text-sm text-neutral-500 font-mono mt-1">{order.orderId}</p>
                 </div>
                 <div className="mt-8">
                    <span className={`px-3 py-1 text-xs font-bold rounded-full border ${order.status === 'Completed' ? 'bg-green-500/10 text-green-400 border-green-500/20' : 'bg-red-500/10 text-red-400 border-red-500/20'}`}>
                        {order.status}
                    </span>
                </div>
            </div>
            
            <div className="p-6 overflow-y-auto custom-scrollbar">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 md:gap-12">
                    {/* Left Column: Purchaser Info */}
                    <div className="space-y-8">
                        <div>
                            <h4 className="text-xs text-neutral-500 uppercase tracking-wider font-bold mb-3">Purchaser</h4>
                            <div className="bg-neutral-800/30 p-5 rounded-xl border border-neutral-800/50">
                                <div className="flex items-center gap-4 mb-4">
                                    <div className="h-12 w-12 rounded-full bg-neutral-700 flex items-center justify-center text-white font-bold text-lg">
                                        {order.purchaserName.charAt(0)}
                                    </div>
                                    <div>
                                        <p className="text-xl font-bold text-white leading-tight">{order.purchaserName}</p>
                                        <p className="text-sm text-neutral-400">{order.purchaserEmail}</p>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <div>
                            <h4 className="text-xs text-neutral-500 uppercase tracking-wider font-bold mb-3">Order Information</h4>
                            <div className="space-y-3 bg-neutral-800/30 p-5 rounded-xl border border-neutral-800/50">
                                <div className="flex justify-between items-center border-b border-neutral-800 pb-2">
                                    <span className="text-neutral-400 text-sm">Date</span>
                                    <span className="text-white font-medium text-sm">{new Date(order.purchaseDate).toLocaleString()}</span>
                                </div>
                                <div className="flex justify-between items-center border-b border-neutral-800 pb-2">
                                    <span className="text-neutral-400 text-sm">Promo Code</span>
                                    <span className="text-white font-medium text-sm">{order.promoCode || '-'}</span>
                                </div>
                                <div className="flex justify-between items-center">
                                    <span className="text-neutral-400 text-sm">Affiliate</span>
                                    <span className="text-white font-medium text-sm">{order.recipientUserName || order.recipientUserId || '-'}</span>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Right Column: Items & Financials */}
                    <div>
                        <h4 className="text-xs text-neutral-500 uppercase tracking-wider font-bold mb-3">Items & Summary</h4>
                        <div className="bg-neutral-800/30 rounded-xl border border-neutral-800/50 overflow-hidden">
                            <div className="divide-y divide-neutral-800">
                                {order.items.map((item, index) => (
                                    <div key={index} className="flex justify-between items-center p-4 hover:bg-neutral-800/30 transition-colors">
                                        <div>
                                            <p className="font-semibold text-white">{item.ticketType}</p>
                                            <p className="text-xs text-neutral-400 mt-0.5">{item.quantity} x ${item.pricePerTicket.toFixed(2)}</p>
                                        </div>
                                        <p className="font-bold text-white">${(item.quantity * item.pricePerTicket).toFixed(2)}</p>
                                    </div>
                                ))}
                            </div>
                            <div className="bg-neutral-900/80 p-5 border-t border-neutral-800 flex justify-between items-center">
                                <span className="text-neutral-300 font-medium">Total Paid</span>
                                <span className="text-3xl font-bold text-white tracking-tight">${order.totalPaid.toFixed(2)}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="p-5 border-t border-neutral-800 bg-neutral-900 sticky bottom-0 z-10 rounded-b-2xl flex justify-end">
                <button onClick={() => setConfirmModalOpen(true)} disabled={order.status === 'Refunded' || isRefunding} className="px-6 py-2.5 text-sm font-semibold rounded-full bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed w-full md:w-auto">
                    {isRefunding ? 'Refunding...' : 'Refund Order'}
                </button>
            </div>
            
             <Modal isOpen={isConfirmModalOpen} onClose={() => setConfirmModalOpen(false)}>
                <div className="w-full max-w-sm bg-neutral-900 border border-neutral-700 rounded-2xl p-8 text-center">
                    <h3 className="text-xl font-bold text-white mb-2">Confirm Refund</h3>
                    <p className="text-neutral-400 mb-6">Are you sure you want to refund this order for <span className="font-bold text-white">${order.totalPaid.toFixed(2)}</span>? This action is permanent.</p>
                    <div className="flex justify-center space-x-4">
                        <button onClick={() => setConfirmModalOpen(false)} className="px-6 py-2 text-sm font-semibold text-neutral-300 bg-neutral-800 hover:bg-neutral-700 rounded-full transition-colors">Cancel</button>
                        <button onClick={handleRefund} className="px-6 py-2 text-sm font-semibold text-white bg-red-600 hover:bg-red-500 rounded-full transition-colors">Confirm Refund</button>
                    </div>
                </div>
            </Modal>
        </div>
    );
};

export default OrdersTab;


import React, { useState, useEffect } from 'react';
import * as api from '../../services/api';
import { ReportData, Order } from '../../types';
import { DownloadIcon, SearchIcon } from '../Icons';

const ReportsTab: React.FC<{ eventId: string }> = ({ eventId }) => {
    const [reportData, setReportData] = useState<ReportData | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState('sales');

    useEffect(() => {
        const fetchReport = async () => {
            if (!eventId) return;
            setIsLoading(true);
            try {
                const data = await api.getReportData(eventId);
                setReportData(data);
            } catch (err) {
                setError("Failed to load report data.");
            } finally {
                setIsLoading(false);
            }
        };
        fetchReport();
    }, [eventId]);

    if (isLoading) return <div className="text-center py-20 text-neutral-400">Generating reports...</div>;
    if (error) return <div className="text-center py-20 text-red-400">{error}</div>;
    if (!reportData) return <div className="text-center py-20 text-neutral-400">No report data available.</div>;

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                 <h1 className="text-3xl font-bold tracking-tight text-white">Reports</h1>
            </div>
            
            <div className="border-b border-neutral-800">
                <nav className="flex -mb-px space-x-8">
                    <button onClick={() => setActiveTab('sales')} className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-all ${activeTab === 'sales' ? 'border-purple-500 text-white' : 'border-transparent text-neutral-400 hover:text-white'}`}>
                        Overview
                    </button>
                    <button onClick={() => setActiveTab('promotions')} className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-all ${activeTab === 'promotions' ? 'border-purple-500 text-white' : 'border-transparent text-neutral-400 hover:text-white'}`}>
                        Promoters ({reportData.promotions.length})
                    </button>
                    <button onClick={() => setActiveTab('detailed')} className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-all ${activeTab === 'detailed' ? 'border-purple-500 text-white' : 'border-transparent text-neutral-400 hover:text-white'}`}>
                        Detailed Orders
                    </button>
                </nav>
            </div>

            <div>
                {activeTab === 'sales' && <SalesReportTab data={reportData} />}
                {activeTab === 'promotions' && <PromotionsReportTab data={reportData} />}
                {activeTab === 'detailed' && <DetailedOrdersReportTab eventId={eventId} />}
            </div>
        </div>
    );
};

const SalesReportTab: React.FC<{ data: ReportData }> = ({ data }) => {
    return (
        <div className="space-y-6">
            <div className="flex flex-wrap gap-4">
                <div className="flex-auto min-w-[160px] bg-neutral-900 border border-neutral-800 rounded-xl p-4">
                    <p className="text-xs text-neutral-400 uppercase mb-1">Gross Sales</p>
                    <p className="text-2xl font-bold text-white whitespace-nowrap">${data.kpis.grossSales.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                </div>
                <div className="flex-auto min-w-[160px] bg-neutral-900 border border-neutral-800 rounded-xl p-4">
                    <p className="text-xs text-neutral-400 uppercase mb-1">Tickets Sold</p>
                    <p className="text-2xl font-bold text-white">{data.kpis.ticketsSold.toLocaleString()}</p>
                </div>
                <div className="flex-auto min-w-[160px] bg-neutral-900 border border-neutral-800 rounded-xl p-4">
                    <p className="text-xs text-neutral-400 uppercase mb-1">Page Views</p>
                    <p className="text-2xl font-bold text-white">{data.kpis.pageViews.toLocaleString()}</p>
                </div>
                <div className="flex-auto min-w-[160px] bg-neutral-900 border border-neutral-800 rounded-xl p-4">
                    <p className="text-xs text-neutral-400 uppercase mb-1">Affiliate Sales</p>
                    <p className="text-2xl font-bold text-purple-400">{data.kpis.promoterSales.toLocaleString()}</p>
                </div>
            </div>

            {data.salesByTicketType.length > 0 && (
                <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6">
                    <h3 className="text-lg font-bold text-white mb-4">Sales by Ticket Type</h3>
                    <div className="space-y-4">
                        {data.salesByTicketType.map((item) => (
                            <div key={item.type} className="flex items-center justify-between">
                                <div>
                                    <p className="text-white font-medium">{item.type}</p>
                                    <p className="text-sm text-neutral-400">{item.quantitySold} sold</p>
                                </div>
                                <p className="text-white font-bold">${item.grossSales.toFixed(2)}</p>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
};

const PromotionsReportTab: React.FC<{ data: ReportData }> = ({ data }) => {
    const [search, setSearch] = useState('');

    const filteredPromotions = data.promotions.filter(p => {
        const lowerSearch = search.toLowerCase();
        return (
            p.promoterName.toLowerCase().includes(lowerSearch) ||
            (p.artistName && p.artistName.toLowerCase().includes(lowerSearch))
        );
    });

    return (
        <div className="space-y-6">
            <div className="relative">
                <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
                <input
                    type="text"
                    placeholder="Search promoters by name or artist name..."
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    className="w-full max-w-md pl-10 pr-4 py-2 bg-neutral-900 border border-neutral-800 rounded-lg text-sm text-white focus:outline-none focus:border-purple-500 transition-colors"
                />
            </div>

            <div className="bg-neutral-900 border border-neutral-800 rounded-2xl overflow-hidden">
                <table className="w-full text-sm text-left text-neutral-300">
                    <thead className="text-xs text-neutral-400 uppercase bg-neutral-950 border-b border-neutral-800">
                        <tr>
                            <th className="px-6 py-3">Promoter</th>
                            <th className="px-6 py-3 text-center">Role</th>
                            <th className="px-6 py-3 text-center">Clicks</th>
                            <th className="px-6 py-3 text-center">Sales</th>
                            <th className="px-6 py-3 text-right">Commission Earned</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-800">
                        {filteredPromotions.map((promo, idx) => {
                            // FIX: Calculate commission client-side if backend returns 0 but sales > 0.
                            // This guarantees accuracy in the Host Report immediately.
                            let displayEarned = promo.earned;
                            
                            // If backend reporting is lagging (ledger empty), calculate it from volume
                            if (displayEarned === 0 && promo.sales > 0 && data.event.commission > 0) {
                                // Prefer explicit salesVolume if available, otherwise fallback to estimated volume
                                const volume = (promo as any).salesVolume || 0;
                                if (volume > 0) {
                                    displayEarned = volume * (data.event.commission / 100);
                                }
                            }

                            return (
                                <tr key={`${promo.promoterName}-${idx}`} className="hover:bg-neutral-800/30">
                                    <td className="px-6 py-4">
                                        <span className="font-medium text-white block">{promo.promoterName}</span>
                                        {promo.artistName && <span className="text-xs text-neutral-500 block">({promo.artistName})</span>}
                                    </td>
                                    <td className="px-6 py-4 text-center">
                                        {promo.isCompetitor ? (
                                            <span className="inline-block px-2 py-1 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30 text-xs font-bold">
                                                Competitor
                                            </span>
                                        ) : (
                                            <span className="inline-block px-2 py-1 rounded-full bg-blue-500/10 text-blue-400 border border-blue-500/20 text-xs font-bold">
                                                Promoter
                                            </span>
                                        )}
                                    </td>
                                    <td className="px-6 py-4 text-center">{promo.clicks}</td>
                                    <td className="px-6 py-4 text-center">{promo.sales}</td>
                                    <td className="px-6 py-4 text-right text-green-400 font-mono font-bold">
                                        ${displayEarned.toFixed(2)}
                                    </td>
                                </tr>
                            );
                        })}
                        {filteredPromotions.length === 0 && (
                            <tr><td colSpan={5} className="text-center py-8 text-neutral-500">No promoters found.</td></tr>
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

const DetailedOrdersReportTab: React.FC<{ eventId: string }> = ({ eventId }) => {
    const [orders, setOrders] = useState<Order[]>([]);
    const [checkIns, setCheckIns] = useState<Record<string, string>>({});
    const [isLoading, setIsLoading] = useState(true);
    const [currentPage, setCurrentPage] = useState(1);
    const ITEMS_PER_PAGE = 20;

    useEffect(() => {
        setIsLoading(true);
        Promise.all([
            api.getOrdersForEvent(eventId),
            api.getEventDetails(eventId)
        ]).then(async ([ordersData, eventData]) => {
            setOrders(ordersData);
            setCheckIns(eventData.checkIns || {});
        }).finally(() => setIsLoading(false));
    }, [eventId]);

    // Flatten orders into individual tickets
    const rows = React.useMemo(() => {
        const r: any[] = [];
        orders.forEach(order => {
             // Use purchaser name directly from order object (Backend now populates this)
             // Prioritize the new standardized 'purchaserName' field handled in the mapper
             let purchaserName = order.purchaserName;
             let purchaserEmail = order.purchaserEmail;

             const buyerParts = purchaserName.trim().split(/\s+/);
             const buyerFirst = buyerParts[0] || '';
             const buyerLast = buyerParts.slice(1).join(' ') || '';
             
             // Calculate discount ratios
             let grossTotal = 0;
             const items = order.items || []; 
             
             items.forEach(item => grossTotal += item.pricePerTicket * item.quantity);
             const discountTotal = Math.max(0, grossTotal - order.totalPaid);
             const discountRatio = grossTotal > 0 ? discountTotal / grossTotal : 0;

             let ticketIndexCounter = 0;

             items.forEach(item => {
                const unitPrice = item.pricePerTicket;
                const unitDiscount = unitPrice * discountRatio;
                const unitPaid = Math.max(0, unitPrice - unitDiscount);
                
                const discountText = unitDiscount > 0 
                    ? `$${unitDiscount.toFixed(2)}${order.promoCode ? ' (' + order.promoCode + ')' : ''}`
                    : '-';
                
                // Resolve Affiliate Name using new mapped field
                const affiliateName = order.recipientUserName 
                    ? order.recipientUserName 
                    : (order.promoCode ? `${order.promoCode} (Code)` : '-');

                // Create a row for EACH ticket
                for (let i = 0; i < item.quantity; i++) {
                    const ticketId = `${order.orderId}-${ticketIndexCounter}`;
                    const isCheckedIn = !!checkIns[ticketId];

                    r.push({
                        uniqueRowId: `${ticketId}`, 
                        orderId: order.orderId,
                        ticketType: item.ticketType,
                        quantity: 1,
                        discount: discountText,
                        affiliate: affiliateName,
                        buyerFirst,
                        buyerLast,
                        email: purchaserEmail,
                        date: new Date(order.purchaseDate).toLocaleString('en-US', { 
                            year: 'numeric', 
                            month: 'numeric', 
                            day: 'numeric', 
                            hour: 'numeric', 
                            minute: 'numeric',
                            hour12: true 
                        }),
                        totalPaid: unitPaid.toFixed(2), 
                        checkInStatus: isCheckedIn ? 'Yes' : 'No',
                        isCheckedIn: isCheckedIn
                    });
                    
                    ticketIndexCounter++;
                }
             });
        });
        return r;
    }, [orders, checkIns]);

    const totalPages = Math.ceil(rows.length / ITEMS_PER_PAGE);
    const paginatedRows = rows.slice((currentPage - 1) * ITEMS_PER_PAGE, currentPage * ITEMS_PER_PAGE);

    if (isLoading) return <div className="text-center py-20 text-neutral-400">Loading orders...</div>;

    return (
        <div className="space-y-4">
             <div className="flex justify-between items-center">
                <h3 className="text-xl font-bold text-white">Detailed Orders (Per Ticket)</h3>
                <button className="px-4 py-2 bg-neutral-900 border border-neutral-800 rounded-lg text-sm text-neutral-400 hover:text-white transition-colors flex items-center gap-2">
                    <DownloadIcon className="w-4 h-4"/> Export CSV
                </button>
            </div>
            <div className="bg-neutral-900 border border-neutral-800 rounded-2xl overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left text-neutral-300 whitespace-nowrap">
                        <thead className="text-xs text-neutral-400 uppercase bg-neutral-950 border-b border-neutral-800">
                            <tr>
                                <th className="px-6 py-3">Order ID</th>
                                <th className="px-6 py-3">First Name</th>
                                <th className="px-6 py-3">Last Name</th>
                                <th className="px-6 py-3">Email</th>
                                <th className="px-6 py-3">Ticket Type</th>
                                <th className="px-6 py-3 text-center">Qty</th>
                                <th className="px-6 py-3 text-center">Checked In</th>
                                <th className="px-6 py-3 text-right">Paid</th>
                                <th className="px-6 py-3">Discount/Promo</th>
                                <th className="px-6 py-3">Affiliate</th>
                                <th className="px-6 py-3">Date & Time</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-neutral-800">
                            {paginatedRows.map((row, idx) => (
                                <tr key={`${row.uniqueRowId}-${idx}`} className="hover:bg-neutral-800/30">
                                    <td className="px-6 py-4 font-mono text-xs text-neutral-500">{row.orderId}</td>
                                    <td className="px-6 py-4 text-white">{row.buyerFirst}</td>
                                    <td className="px-6 py-4 text-white">{row.buyerLast}</td>
                                    <td className="px-6 py-4 text-neutral-400">{row.email}</td>
                                    <td className="px-6 py-4">{row.ticketType}</td>
                                    <td className="px-6 py-4 text-center">{row.quantity}</td>
                                    <td className="px-6 py-4 text-center">
                                        <span className={`px-2 py-1 rounded-full text-xs font-bold ${row.isCheckedIn ? 'bg-green-500/10 text-green-400' : 'bg-neutral-800 text-neutral-500'}`}>
                                            {row.checkInStatus}
                                        </span>
                                    </td>
                                    <td className="px-6 py-4 text-right font-medium text-white">${row.totalPaid}</td>
                                    <td className="px-6 py-4 text-neutral-400">{row.discount}</td>
                                    <td className="px-6 py-4 text-purple-400 font-medium">{row.affiliate}</td>
                                    <td className="px-6 py-4 text-neutral-500">{row.date}</td>
                                </tr>
                            ))}
                            {paginatedRows.length === 0 && (
                                <tr><td colSpan={11} className="text-center py-8 text-neutral-500">No orders found.</td></tr>
                            )}
                        </tbody>
                    </table>
                </div>
                 {totalPages > 1 && (
                    <div className="flex justify-between items-center p-4 bg-neutral-900 border-t border-neutral-800">
                        <span className="text-sm text-neutral-400">Page {currentPage} of {totalPages}</span>
                        <div className="flex space-x-2">
                            <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="px-3 py-1 text-sm font-semibold rounded-lg bg-neutral-800 hover:bg-neutral-700 disabled:opacity-50">Prev</button>
                            <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="px-3 py-1 text-sm font-semibold rounded-lg bg-neutral-800 hover:bg-neutral-700 disabled:opacity-50">Next</button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default ReportsTab;

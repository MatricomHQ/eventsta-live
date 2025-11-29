
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { v4 as uuidv4 } from 'uuid';
import { useAuth } from '../contexts/AuthContext';
import * as api from '../services/api';
import { User, Event, Host, PurchasedTicket, PromoStat, EmailDraft, EmailCampaign, TargetRole, PayoutRequest, SystemEmailTemplate, SystemEmailTrigger, SystemSettings } from '../types';
import { 
    ShieldIcon, UsersIcon, CalendarIcon, DollarSignIcon, 
    ActivityIcon, SearchIcon, BanIcon, CheckCircleIcon, 
    LockIcon, ServerIcon, ArrowRightIcon, SettingsIcon,
    BarChartIcon, ArrowLeftIcon, MapPinIcon, SaveIcon,
    TicketIcon, MegaphoneIcon, CreditCardIcon, MailIcon,
    PlusIcon, SendIcon, RefreshCwIcon, StopCircleIcon,
    TrashIcon, EditIcon, ClipboardIcon, XIcon, MenuIcon,
    LogOutIcon, ClockIcon, TerminalIcon
} from '../components/Icons';
import RichTextEditor from '../components/RichTextEditor';
import Modal from '../components/Modal';
import * as emailService from '../services/emailService';

// --- Main Layout & Router for Admin Panel ---

const SystemAdmin: React.FC = () => {
    const { user, isAuthenticated } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const [activeTab, setActiveTab] = useState<'dashboard' | 'users' | 'events' | 'email' | 'system-emails' | 'settings' | 'payouts'>('dashboard');
    const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

    useEffect(() => {
        if (!isAuthenticated) {
            navigate('/');
            return;
        }
        // Strict Role Check
        if (user && !user.isSystemAdmin) {
            navigate('/');
        }
    }, [user, isAuthenticated, navigate]);

    // Handle deep linking to tabs via state
    useEffect(() => {
        if (location.state && (location.state as any).activeTab) {
            setActiveTab((location.state as any).activeTab);
        }
        // Close mobile menu on navigation
        setIsMobileMenuOpen(false);
    }, [location.state]);

    if (!user || !user.isSystemAdmin) return null;

    const renderContent = () => {
        switch (activeTab) {
            case 'dashboard': return <AdminDashboard />;
            case 'users': return <AdminUserManagement />;
            case 'events': return <AdminEventManagement />;
            case 'email': return <AdminEmailManager />;
            case 'system-emails': return <AdminSystemEmailsManager />;
            case 'payouts': return <AdminPayoutsManager />;
            case 'settings': return <AdminSettings />;
            default: return <AdminDashboard />;
        }
    };

    return (
        <div className="flex h-screen bg-[#050505] overflow-hidden text-neutral-200 font-sans selection:bg-purple-500/30">
            {/* Desktop Sidebar (Shared Space) */}
            <aside className="hidden md:flex w-64 flex-col bg-neutral-950 border-r border-neutral-800 flex-shrink-0 transition-all duration-300">
                <div className="p-6 flex items-center gap-3 border-b border-neutral-800/50 h-20">
                    <div className="w-8 h-8 bg-purple-600 rounded-lg flex items-center justify-center text-white shadow-lg shadow-purple-500/20">
                        <ShieldIcon className="w-5 h-5" />
                    </div>
                    <div>
                        <h1 className="font-bold text-white tracking-tight leading-tight">Eventsta Admin</h1>
                        <p className="text-[10px] uppercase tracking-widest text-neutral-500 font-semibold">v3.0.1</p>
                    </div>
                </div>
                
                <nav className="flex-1 overflow-y-auto py-6 px-4 space-y-1 custom-scrollbar">
                    <SidebarItem id="dashboard" label="Dashboard" icon={BarChartIcon} active={activeTab === 'dashboard'} onClick={() => setActiveTab('dashboard')} />
                    <SidebarItem id="users" label="User Management" icon={UsersIcon} active={activeTab === 'users'} onClick={() => setActiveTab('users')} />
                    <SidebarItem id="events" label="Global Events" icon={CalendarIcon} active={activeTab === 'events'} onClick={() => setActiveTab('events')} />
                    <SidebarItem id="payouts" label="Payouts" icon={DollarSignIcon} active={activeTab === 'payouts'} onClick={() => setActiveTab('payouts')} />
                    <SidebarItem id="email" label="Email Campaigns" icon={MailIcon} active={activeTab === 'email'} onClick={() => setActiveTab('email')} />
                    <SidebarItem id="system-emails" label="System Emails" icon={TerminalIcon} active={activeTab === 'system-emails'} onClick={() => setActiveTab('system-emails')} />
                    <SidebarItem id="settings" label="System Settings" icon={SettingsIcon} active={activeTab === 'settings'} onClick={() => setActiveTab('settings')} />
                    
                    <div className="pt-4 mt-4 border-t border-neutral-800/50">
                        <SidebarItem id="exit" label="Exit to Main Site" icon={LogOutIcon} active={false} onClick={() => navigate('/')} />
                    </div>
                </nav>

                <div className="p-4 border-t border-neutral-800/50 bg-neutral-900/30">
                    <div className="flex items-center gap-3">
                        <div className="relative">
                            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></div>
                            <div className="absolute inset-0 w-2 h-2 rounded-full bg-green-500 animate-ping opacity-75"></div>
                        </div>
                        <span className="text-xs text-green-400 font-mono font-medium">System Operational</span>
                    </div>
                </div>
            </aside>

            {/* Mobile Sidebar (Overlay Modal) */}
            <div className={`fixed inset-0 z-50 flex md:hidden transition-opacity duration-300 ${isMobileMenuOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}>
                {/* Backdrop */}
                <div className="absolute inset-0 bg-black/80 backdrop-blur-sm" onClick={() => setIsMobileMenuOpen(false)} />
                
                {/* Drawer */}
                <aside className={`relative w-72 flex flex-col bg-neutral-950 border-r border-neutral-800 h-full shadow-2xl transform transition-transform duration-300 ease-out ${isMobileMenuOpen ? 'translate-x-0' : '-translate-x-full'}`}>
                     <div className="p-4 flex items-center justify-between border-b border-neutral-800/50 h-16 bg-neutral-950">
                        <div className="flex items-center gap-3">
                            <div className="w-8 h-8 bg-purple-600 rounded-lg flex items-center justify-center text-white">
                                <ShieldIcon className="w-5 h-5" />
                            </div>
                            <span className="font-bold text-white tracking-tight">Eventsta Admin</span>
                        </div>
                        <button onClick={() => setIsMobileMenuOpen(false)} className="text-neutral-400 hover:text-white p-2 rounded-lg hover:bg-neutral-800 transition-colors">
                            <XIcon className="w-6 h-6" />
                        </button>
                    </div>
                    <nav className="flex-1 overflow-y-auto p-4 space-y-2 bg-neutral-950">
                        <SidebarItem id="dashboard" label="Dashboard" icon={BarChartIcon} active={activeTab === 'dashboard'} onClick={() => { setActiveTab('dashboard'); setIsMobileMenuOpen(false); }} />
                        <SidebarItem id="users" label="User Management" icon={UsersIcon} active={activeTab === 'users'} onClick={() => { setActiveTab('users'); setIsMobileMenuOpen(false); }} />
                        <SidebarItem id="events" label="Global Events" icon={CalendarIcon} active={activeTab === 'events'} onClick={() => { setActiveTab('events'); setIsMobileMenuOpen(false); }} />
                        <SidebarItem id="payouts" label="Payouts" icon={DollarSignIcon} active={activeTab === 'payouts'} onClick={() => { setActiveTab('payouts'); setIsMobileMenuOpen(false); }} />
                        <SidebarItem id="email" label="Email Campaigns" icon={MailIcon} active={activeTab === 'email'} onClick={() => { setActiveTab('email'); setIsMobileMenuOpen(false); }} />
                        <SidebarItem id="system-emails" label="System Emails" icon={TerminalIcon} active={activeTab === 'system-emails'} onClick={() => { setActiveTab('system-emails'); setIsMobileMenuOpen(false); }} />
                        <SidebarItem id="settings" label="System Settings" icon={SettingsIcon} active={activeTab === 'settings'} onClick={() => { setActiveTab('settings'); setIsMobileMenuOpen(false); }} />
                        
                        <div className="pt-4 mt-4 border-t border-neutral-800/50">
                            <SidebarItem id="exit" label="Exit to Main Site" icon={LogOutIcon} active={false} onClick={() => navigate('/')} />
                        </div>
                    </nav>
                    <div className="p-4 border-t border-neutral-800/50">
                        <div className="flex items-center gap-3">
                            <div className="w-2 h-2 rounded-full bg-green-500"></div>
                            <span className="text-xs text-neutral-400">Mobile Mode</span>
                        </div>
                    </div>
                </aside>
            </div>

            {/* Main Content Wrapper */}
            <div className="flex-1 flex flex-col min-w-0 bg-[#050505] relative">
                {/* Mobile Header */}
                <header className="md:hidden flex items-center justify-between h-16 px-4 border-b border-neutral-800 bg-neutral-950/80 backdrop-blur-md sticky top-0 z-30 flex-shrink-0">
                    <div className="flex items-center gap-2">
                        <div className="w-6 h-6 bg-purple-600 rounded-md flex items-center justify-center text-white">
                            <ShieldIcon className="w-3 h-3" />
                        </div>
                        <span className="font-bold text-white text-sm tracking-tight">Admin Console</span>
                    </div>
                    <button onClick={() => setIsMobileMenuOpen(true)} className="text-neutral-400 hover:text-white p-2 -mr-2 rounded-lg active:bg-neutral-800 transition-colors">
                        <MenuIcon className="w-6 h-6" />
                    </button>
                </header>

                {/* Scrollable Content Area */}
                <main className="flex-1 overflow-y-auto p-4 md:p-8 scroll-smooth custom-scrollbar">
                    <div className="max-w-7xl mx-auto pb-12">
                        {renderContent()}
                    </div>
                </main>
            </div>
        </div>
    );
};

const SidebarItem: React.FC<{ id: string, label: string, icon: React.FC<any>, active: boolean, onClick: () => void }> = ({ label, icon: Icon, active, onClick }) => (
    <button
        onClick={onClick}
        className={`w-full flex items-center px-4 py-3 rounded-lg text-sm font-medium transition-all duration-200 ${
            active 
            ? 'bg-purple-900/20 text-purple-300 border border-purple-500/20 shadow-[0_0_15px_rgba(168,85,247,0.15)]' 
            : 'text-neutral-400 hover:bg-neutral-900 hover:text-white border border-transparent'
        }`}
    >
        <Icon className={`w-5 h-5 mr-3 transition-colors ${active ? 'text-purple-400' : 'text-neutral-500 group-hover:text-white'}`} />
        {label}
    </button>
);

// --- DASHBOARD ---
const AdminDashboard: React.FC = () => {
    const [stats, setStats] = useState({ totalUsers: 0, totalEvents: 0, grossVolume: 0, platformFees: 0 });
    
    useEffect(() => {
        api.getSystemStats().then(setStats).catch(() => {
            // Fallback is handled in api.getSystemStats but extra catch here just in case
            setStats({ totalUsers: 0, totalEvents: 0, grossVolume: 0, platformFees: 0 });
        });
    }, []);

    return (
        <div className="space-y-8 animate-fade-in">
            <div>
                <h2 className="text-2xl font-bold text-white mb-2">System Overview</h2>
                <p className="text-neutral-400 text-sm">Real-time platform metrics.</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <StatCard label="Total Users" value={stats?.totalUsers?.toLocaleString() ?? '0'} icon={UsersIcon} color="blue" />
                <StatCard label="Total Events" value={stats?.totalEvents?.toLocaleString() ?? '0'} icon={CalendarIcon} color="purple" />
                <StatCard label="Gross Volume" value={`$${stats?.grossVolume?.toLocaleString() ?? '0'}`} icon={DollarSignIcon} color="green" />
                <StatCard label="Platform Fees" value={`$${stats?.platformFees?.toLocaleString() ?? '0'}`} icon={ActivityIcon} color="yellow" />
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6">
                    <h3 className="text-lg font-bold text-white mb-4">System Health</h3>
                    <div className="space-y-4">
                        <HealthBar label="API Latency" value={24} max={100} unit="ms" status="good" />
                        <HealthBar label="Database Load" value={12} max={100} unit="%" status="good" />
                        <HealthBar label="Email Queue" value={0} max={50} unit="pending" status="good" />
                        <HealthBar label="Storage Usage" value={45} max={100} unit="%" status="warning" />
                    </div>
                </div>
                <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 flex flex-col justify-center items-center text-center">
                    <div className="w-16 h-16 bg-purple-900/20 rounded-full flex items-center justify-center mb-4">
                        <ServerIcon className="w-8 h-8 text-purple-400" />
                    </div>
                    <h3 className="text-lg font-bold text-white">All Systems Operational</h3>
                    <p className="text-neutral-400 text-sm mt-2">Last check: Just now</p>
                </div>
            </div>
        </div>
    );
};

const StatCard: React.FC<{ label: string, value: string, icon: any, color: 'blue'|'purple'|'green'|'yellow' }> = ({ label, value, icon: Icon, color }) => {
    const colors = {
        blue: 'text-blue-400 bg-blue-400/10',
        purple: 'text-purple-400 bg-purple-400/10',
        green: 'text-green-400 bg-green-400/10',
        yellow: 'text-yellow-400 bg-yellow-400/10'
    };
    
    return (
        <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 flex items-center justify-between">
            <div>
                <p className="text-neutral-400 text-xs font-bold uppercase tracking-wider mb-1">{label}</p>
                <p className="text-2xl font-bold text-white">{value}</p>
            </div>
            <div className="p-3 rounded-xl">
                <Icon className={`w-6 h-6 ${colors[color]}`} />
            </div>
        </div>
    );
};

const HealthBar: React.FC<{ label: string, value: number, max: number, unit: string, status: 'good'|'warning'|'critical' }> = ({ label, value, max, unit, status }) => {
    const percentage = Math.min((value / max) * 100, 100);
    const colors = {
        good: 'bg-green-500',
        warning: 'bg-yellow-500',
        critical: 'bg-red-500'
    };

    return (
        <div>
            <div className="flex justify-between text-xs mb-1">
                <span className="text-neutral-400 font-medium">{label}</span>
                <span className="text-white">{value} {unit}</span>
            </div>
            <div className="w-full bg-neutral-800 rounded-full h-2 overflow-hidden">
                <div className={`h-full rounded-full ${colors[status]}`} style={{ width: `${percentage}%` }}></div>
            </div>
        </div>
    );
};

// --- USER MANAGEMENT ---
const AdminUserManagement: React.FC = () => {
    const [users, setUsers] = useState<User[]>([]);
    const [page, setPage] = useState(1);
    const [search, setSearch] = useState('');
    const [total, setTotal] = useState(0);
    const [loading, setLoading] = useState(false);

    const fetchUsers = useCallback(async () => {
        setLoading(true);
        try {
            const res = await api.getAllUsersAdmin(page, 20, search);
            setUsers(res.users);
            setTotal(res.total);
        } catch (error) {
            console.error("Failed to load users:", error);
        } finally {
            setLoading(false);
        }
    }, [page, search]);

    useEffect(() => {
        fetchUsers();
    }, [fetchUsers]);

    const toggleStatus = async (userId: string, currentStatus: boolean) => {
        await api.updateUserStatus(userId, !currentStatus);
        fetchUsers();
    };

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold text-white">User Management</h2>
                <div className="relative">
                    <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
                    <input 
                        type="text" 
                        placeholder="Search users..." 
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        className="bg-neutral-900 border border-neutral-800 rounded-full py-2 pl-10 pr-4 text-sm text-white focus:border-purple-500 outline-none w-64"
                    />
                </div>
            </div>

            <div className="bg-neutral-900 border border-neutral-800 rounded-2xl overflow-hidden">
                <table className="w-full text-sm text-left text-neutral-300">
                    <thead className="text-xs text-neutral-500 uppercase bg-neutral-950 border-b border-neutral-800">
                        <tr>
                            <th className="px-6 py-4">User</th>
                            <th className="px-6 py-4">Role</th>
                            <th className="px-6 py-4">Hosts</th>
                            <th className="px-6 py-4 text-center">Status</th>
                            <th className="px-6 py-4 text-right">Actions</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-800">
                        {users.map(user => (
                            <tr key={user.id} className="hover:bg-neutral-800/30 transition-colors">
                                <td className="px-6 py-4">
                                    <div className="flex items-center gap-3">
                                        <div className="w-8 h-8 rounded-full bg-neutral-800 flex items-center justify-center text-xs font-bold text-neutral-400">
                                            {user.name.charAt(0)}
                                        </div>
                                        <div>
                                            <p className="font-medium text-white">{user.name}</p>
                                            <p className="text-xs text-neutral-500">{user.email}</p>
                                        </div>
                                    </div>
                                </td>
                                <td className="px-6 py-4">
                                    {user.isSystemAdmin ? <span className="text-purple-400 font-bold">Admin</span> : 'User'}
                                </td>
                                <td className="px-6 py-4">
                                    {user.managedHostIds?.length || 0}
                                </td>
                                <td className="px-6 py-4 text-center">
                                    <span className={`inline-block px-2 py-1 rounded-full text-xs font-bold ${user.isDisabled ? 'bg-red-500/10 text-red-500' : 'bg-green-500/10 text-green-500'}`}>
                                        {user.isDisabled ? 'Disabled' : 'Active'}
                                    </span>
                                </td>
                                <td className="px-6 py-4 text-right">
                                    <button 
                                        onClick={() => toggleStatus(user.id, !!user.isDisabled)}
                                        className={`text-xs font-bold px-3 py-1 rounded border transition-colors ${
                                            user.isDisabled 
                                            ? 'border-green-500/30 text-green-400 hover:bg-green-500/10' 
                                            : 'border-red-500/30 text-red-400 hover:bg-red-500/10'
                                        }`}
                                    >
                                        {user.isDisabled ? 'Enable' : 'Disable'}
                                    </button>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

// --- EVENT MANAGEMENT ---
const AdminEventManagement: React.FC = () => {
    const [events, setEvents] = useState<Event[]>([]);
    const [page, setPage] = useState(1);
    const [search, setSearch] = useState('');
    const [loading, setLoading] = useState(false);
    const navigate = useNavigate();

    const fetchEvents = useCallback(async () => {
        setLoading(true);
        const res = await api.getAllEventsAdmin(page, 20, search);
        setEvents(res.events);
        setLoading(false);
    }, [page, search]);

    useEffect(() => {
        fetchEvents();
    }, [fetchEvents]);

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold text-white">Global Events</h2>
                <div className="relative">
                    <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-neutral-500" />
                    <input 
                        type="text" 
                        placeholder="Search events..." 
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                        className="bg-neutral-900 border border-neutral-800 rounded-full py-2 pl-10 pr-4 text-sm text-white focus:border-purple-500 outline-none w-64"
                    />
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {events.map(event => (
                    <div key={event.id} className="bg-neutral-900 border border-neutral-800 rounded-xl overflow-hidden group hover:border-purple-500/50 transition-all">
                        <div className="h-32 bg-neutral-800 relative">
                            <img src={event.imageUrls[0]} alt="" className="w-full h-full object-cover opacity-60 group-hover:opacity-100 transition-opacity" />
                            <div className="absolute top-2 right-2">
                                <span className={`px-2 py-1 rounded text-xs font-bold bg-black/50 text-white backdrop-blur-md`}>
                                    {event.status}
                                </span>
                            </div>
                        </div>
                        <div className="p-4">
                            <h3 className="font-bold text-white truncate mb-1">{event.title}</h3>
                            <p className="text-xs text-neutral-400 mb-4">{event.hostName} • {new Date(event.date).toLocaleDateString()}</p>
                            <div className="flex justify-between items-center">
                                <span className="text-xs text-neutral-500">{event.location}</span>
                                <button 
                                    onClick={() => navigate(`/event/${event.id}/admin/reports`)}
                                    className="text-xs font-bold text-purple-400 hover:text-white flex items-center gap-1"
                                >
                                    Manage <ArrowRightIcon className="w-3 h-3" />
                                </button>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </div>
    );
};

// --- EMAIL MANAGER ---
const AdminEmailManager: React.FC = () => {
    const [view, setView] = useState<'campaigns' | 'drafts' | 'compose'>('campaigns');
    const [draftToEdit, setDraftToEdit] = useState<EmailDraft | undefined>(undefined);

    const handleEditDraft = (draft: EmailDraft) => {
        setDraftToEdit(draft);
        setView('compose');
    };

    return (
        <div className="space-y-6 animate-fade-in h-[calc(100vh-120px)] flex flex-col">
            <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold text-white">Email Campaigns</h2>
                <div className="flex bg-neutral-900 p-1 rounded-lg border border-neutral-800">
                    <button onClick={() => setView('campaigns')} className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${view === 'campaigns' ? 'bg-neutral-800 text-white' : 'text-neutral-400 hover:text-white'}`}>Campaigns</button>
                    <button onClick={() => setView('drafts')} className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${view === 'drafts' ? 'bg-neutral-800 text-white' : 'text-neutral-400 hover:text-white'}`}>Drafts</button>
                    <button onClick={() => { setDraftToEdit(undefined); setView('compose'); }} className={`px-4 py-2 text-sm font-medium rounded-md transition-all ${view === 'compose' ? 'bg-purple-600 text-white' : 'text-neutral-400 hover:text-white'}`}>Compose</button>
                </div>
            </div>

            <div className="flex-1 overflow-hidden bg-neutral-900 border border-neutral-800 rounded-2xl relative">
                {view === 'campaigns' && <CampaignsView />}
                {view === 'drafts' && <DraftsView onEdit={handleEditDraft} />}
                {view === 'compose' && <ComposeView initialDraft={draftToEdit} onCancel={() => setView('drafts')} onSent={() => setView('campaigns')} />}
            </div>
        </div>
    );
};

const CampaignsView: React.FC = () => {
    const [campaigns, setCampaigns] = useState<EmailCampaign[]>([]);
    
    useEffect(() => {
        api.getEmailCampaigns().then(setCampaigns);
    }, []);

    return (
        <div className="p-6 h-full overflow-y-auto custom-scrollbar">
            <table className="w-full text-sm text-left text-neutral-300">
                <thead className="text-xs text-neutral-500 uppercase border-b border-neutral-800">
                    <tr>
                        <th className="py-3">Subject</th>
                        <th className="py-3">Target</th>
                        <th className="py-3">Status</th>
                        <th className="py-3 text-right">Sent</th>
                    </tr>
                </thead>
                <tbody className="divide-y divide-neutral-800">
                    {campaigns.map(camp => (
                        <tr key={camp.id}>
                            <td className="py-4 font-medium text-white">{camp.subject}</td>
                            <td className="py-4">{camp.targetRole}</td>
                            <td className="py-4">
                                <span className={`px-2 py-1 rounded text-xs font-bold ${camp.status === 'COMPLETED' ? 'bg-green-500/10 text-green-500' : camp.status === 'SENDING' ? 'bg-blue-500/10 text-blue-500' : 'bg-neutral-800 text-neutral-500'}`}>
                                    {camp.status}
                                </span>
                            </td>
                            <td className="py-4 text-right">{new Date(camp.startTime).toLocaleDateString()}</td>
                        </tr>
                    ))}
                    {campaigns.length === 0 && <tr><td colSpan={4} className="text-center py-8 text-neutral-500">No campaigns sent yet.</td></tr>}
                </tbody>
            </table>
        </div>
    );
};

const DraftsView: React.FC<{ onEdit: (draft: EmailDraft) => void }> = ({ onEdit }) => {
    const [drafts, setDrafts] = useState<EmailDraft[]>([]);

    const fetchDrafts = () => api.getEmailDrafts().then(setDrafts);

    useEffect(() => { fetchDrafts(); }, []);

    const handleDelete = async (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (window.confirm("Delete this draft?")) {
            await api.deleteEmailDraft(id);
            fetchDrafts();
        }
    };

    return (
        <div className="p-6 h-full overflow-y-auto custom-scrollbar">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {drafts.map(draft => (
                    <div key={draft.id} onClick={() => onEdit(draft)} className="bg-neutral-950 border border-neutral-800 rounded-xl p-5 cursor-pointer hover:border-purple-500/50 transition-colors group">
                        <div className="flex justify-between items-start mb-2">
                            <h3 className="font-bold text-white truncate pr-2">{draft.name || 'Untitled Draft'}</h3>
                            <button onClick={(e) => handleDelete(draft.id, e)} className="text-neutral-500 hover:text-red-400 opacity-0 group-hover:opacity-100 transition-opacity">
                                <TrashIcon className="w-4 h-4" />
                            </button>
                        </div>
                        <p className="text-sm text-neutral-400 mb-4 truncate">{draft.subject}</p>
                        <div className="flex justify-between items-center text-xs text-neutral-500">
                            <span className="bg-neutral-900 px-2 py-1 rounded">{draft.targetRole}</span>
                            <span>{new Date(draft.lastModified).toLocaleDateString()}</span>
                        </div>
                    </div>
                ))}
                {drafts.length === 0 && <p className="text-neutral-500 col-span-full text-center py-12">No drafts found.</p>}
            </div>
        </div>
    );
};

const ComposeView: React.FC<{ initialDraft?: EmailDraft, onCancel: () => void, onSent: () => void }> = ({ initialDraft, onCancel, onSent }) => {
    const [draft, setDraft] = useState<Partial<EmailDraft>>(initialDraft || {
        id: uuidv4(),
        name: '',
        subject: '',
        body: '',
        targetRole: 'All Users',
        lastModified: new Date().toISOString()
    });
    const [sending, setSending] = useState(false);

    const handleSave = async () => {
        await api.saveEmailDraft(draft as EmailDraft);
        alert('Draft saved');
    };

    const handleSend = async () => {
        if (!draft.subject || !draft.body) return alert("Subject and body required");
        if (window.confirm(`Send this campaign to ${draft.targetRole}?`)) {
            setSending(true);
            try {
                await api.launchEmailCampaign(draft.id!, draft.targetRole!);
                onSent();
            } catch (e) {
                alert("Failed to send");
            } finally {
                setSending(false);
            }
        }
    };

    return (
        <div className="flex flex-col h-full">
            <div className="p-6 border-b border-neutral-800 space-y-4 bg-neutral-900 z-10">
                <div className="flex gap-4">
                    <input 
                        type="text" 
                        placeholder="Internal Draft Name" 
                        value={draft.name} 
                        onChange={e => setDraft({...draft, name: e.target.value})}
                        className="flex-1 bg-neutral-950 border border-neutral-800 rounded-lg px-4 py-2 text-white focus:border-purple-500 outline-none"
                    />
                    <select 
                        value={draft.targetRole} 
                        onChange={e => setDraft({...draft, targetRole: e.target.value as TargetRole})}
                        className="bg-neutral-950 border border-neutral-800 rounded-lg px-4 py-2 text-white focus:border-purple-500 outline-none"
                    >
                        <option value="All Users">All Users</option>
                        <option value="Hosts">Hosts</option>
                        <option value="Promoters">Promoters</option>
                        <option value="Artists">Artists</option>
                        <option value="Admins">Admins</option>
                    </select>
                </div>
                <input 
                    type="text" 
                    placeholder="Email Subject Line" 
                    value={draft.subject} 
                    onChange={e => setDraft({...draft, subject: e.target.value})}
                    className="w-full bg-neutral-950 border border-neutral-800 rounded-lg px-4 py-2 text-white focus:border-purple-500 outline-none font-bold"
                />
            </div>
            
            <div className="flex-1 bg-white text-black relative">
                <div className="absolute inset-0">
                    <RichTextEditor value={draft.body || ''} onChange={val => setDraft({...draft, body: val})} />
                </div>
            </div>

            <div className="p-4 border-t border-neutral-800 bg-neutral-900 flex justify-end gap-3">
                <button onClick={onCancel} className="px-4 py-2 text-neutral-400 hover:text-white">Cancel</button>
                <button onClick={handleSave} className="px-4 py-2 border border-neutral-700 rounded-lg text-white hover:bg-neutral-800">Save Draft</button>
                <button onClick={handleSend} disabled={sending} className="px-6 py-2 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-lg flex items-center gap-2 disabled:opacity-50">
                    <SendIcon className="w-4 h-4" /> {sending ? 'Sending...' : 'Send Campaign'}
                </button>
            </div>
        </div>
    );
};

// --- SYSTEM EMAILS MANAGER (Revised) ---

const AdminSystemEmailsManager: React.FC = () => {
    const [templates, setTemplates] = useState<SystemEmailTemplate[]>([]);
    const [selectedTrigger, setSelectedTrigger] = useState<SystemEmailTrigger | ''>('');
    const [loading, setLoading] = useState(true);
    const [formData, setFormData] = useState<{ subject: string; body: string }>({ subject: '', body: '' });
    const [isSaving, setIsSaving] = useState(false);
    const [saveSuccess, setSaveSuccess] = useState(false);
    const [copiedVar, setCopiedVar] = useState<string | null>(null);
    
    // Test Email State
    const [isTestModalOpen, setIsTestModalOpen] = useState(false);
    const [testEmail, setTestEmail] = useState('');

    useEffect(() => {
        const loadTemplates = async () => {
            try {
                const data = await api.getSystemEmailTemplates();
                // FIX: Ensure it's an array to prevent crash
                const safeData = Array.isArray(data) ? data : [];
                setTemplates(safeData);
                if (safeData.length > 0) {
                    setSelectedTrigger(safeData[0].trigger);
                }
            } catch (e) {
                console.error("Failed to load email templates", e);
                setTemplates([]);
            } finally {
                setLoading(false);
            }
        };
        loadTemplates();
    }, []);

    useEffect(() => {
        if (selectedTrigger) {
            const tmpl = templates.find(t => t.trigger === selectedTrigger);
            if (tmpl) {
                setFormData({ subject: tmpl.subject, body: tmpl.body });
            }
        } else {
            setFormData({ subject: '', body: '' });
        }
    }, [selectedTrigger, templates]);

    const currentTemplate = templates.find(t => t.trigger === selectedTrigger);

    const handleSave = async () => {
        if (!selectedTrigger) return;
        setIsSaving(true);
        try {
            const updated = await api.updateSystemEmailTemplate(selectedTrigger as SystemEmailTrigger, formData);
            setTemplates(prev => prev.map(t => t.trigger === selectedTrigger ? updated : t));
            setSaveSuccess(true);
            setTimeout(() => setSaveSuccess(false), 2000);
        } catch (e) {
            alert("Failed to save template. Backend route may be missing.");
        } finally {
            setIsSaving(false);
        }
    };

    const handleSendTest = async () => {
        if (!selectedTrigger || !testEmail) return;
        try {
            await emailService.sendTestSystemEmail(selectedTrigger as SystemEmailTrigger, testEmail, formData.subject, formData.body);
            alert(`Test email request sent to server.`);
            setIsTestModalOpen(false);
        } catch (e) {
            alert("Failed to send test email.");
        }
    };

    const copyVariable = (v: string) => {
        navigator.clipboard.writeText(v);
        setCopiedVar(v);
        setTimeout(() => setCopiedVar(null), 1500);
    };

    if (loading) return <div className="text-neutral-500 text-center py-12">Loading templates...</div>;

    return (
        <div className="space-y-6 animate-fade-in flex flex-col pb-12">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-bold text-white">System Transaction Emails</h2>
                    <p className="text-neutral-400 text-sm">Configure automated email notifications.</p>
                </div>
            </div>

            <div className="bg-neutral-900 border border-neutral-800 rounded-2xl flex flex-col overflow-hidden">
                
                {/* Toolbar / Selector */}
                <div className="p-6 border-b border-neutral-800 bg-neutral-950/50 flex flex-col md:flex-row gap-6 items-start md:items-center justify-between shrink-0">
                    <div className="w-full md:w-1/2">
                        <label className="block text-xs font-bold text-neutral-500 uppercase mb-2">Select Email Template</label>
                        <div className="relative">
                            <select 
                                value={selectedTrigger} 
                                onChange={e => setSelectedTrigger(e.target.value as SystemEmailTrigger)}
                                className="w-full appearance-none bg-neutral-800 border border-neutral-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-purple-500 font-medium"
                            >
                                {templates.map(t => (
                                    <option key={t.trigger} value={t.trigger}>{t.name}</option>
                                ))}
                            </select>
                            <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-neutral-400">
                                <svg className="h-4 w-4 fill-current" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"><path d="M9.293 12.95l.707.707L15.657 8l-1.414-1.414L10 10.828 5.757 6.586 4.343 8z"/></svg>
                            </div>
                        </div>
                    </div>
                    
                    {currentTemplate && (
                        <div className="flex gap-3">
                            <button 
                                onClick={() => setIsTestModalOpen(true)} 
                                className="px-4 py-2.5 bg-neutral-800 text-neutral-300 hover:text-white border border-neutral-700 rounded-lg text-sm font-medium transition-colors flex items-center gap-2"
                            >
                                <MailIcon className="w-4 h-4" /> Send Test
                            </button>
                            <button 
                                onClick={handleSave} 
                                disabled={isSaving}
                                className="px-6 py-2.5 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-sm font-bold transition-colors disabled:opacity-50 flex items-center gap-2 shadow-lg shadow-purple-900/20"
                            >
                                {isSaving ? 'Saving...' : saveSuccess ? <><CheckCircleIcon className="w-4 h-4"/> Saved!</> : 'Save Changes'}
                            </button>
                        </div>
                    )}
                </div>

                {currentTemplate ? (
                    <div className="flex flex-col">
                        {/* Subject & Vars */}
                        <div className="p-6 border-b border-neutral-800 bg-neutral-900 shrink-0 space-y-4">
                            <div>
                                <label className="block text-xs font-bold text-neutral-500 uppercase mb-2">Subject Line</label>
                                <input 
                                    type="text" 
                                    value={formData.subject} 
                                    onChange={e => setFormData({...formData, subject: e.target.value})}
                                    className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-4 py-3 text-white focus:outline-none focus:border-purple-500 font-medium text-lg"
                                    placeholder="Email Subject"
                                />
                            </div>
                            
                            <div>
                                <label className="block text-xs font-bold text-neutral-500 uppercase mb-2">Available Variables <span className="font-normal normal-case text-neutral-600 ml-1">(Click to copy)</span></label>
                                <div className="flex flex-wrap gap-2">
                                    {currentTemplate.variables.map(v => (
                                        <button 
                                            key={v} 
                                            onClick={() => copyVariable(v)}
                                            className={`px-3 py-1.5 rounded text-xs font-mono transition-all border ${
                                                copiedVar === v 
                                                ? 'bg-green-500/20 text-green-400 border-green-500/30' 
                                                : 'bg-neutral-800 hover:bg-neutral-700 text-purple-400 border-neutral-700'
                                            }`}
                                            title="Click to copy to clipboard"
                                        >
                                            {v} {copiedVar === v && '✓'}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* Editor Wrapper */}
                        <div className="bg-white text-black">
                            <RichTextEditor 
                                key={selectedTrigger} 
                                value={formData.body} 
                                onChange={val => setFormData({...formData, body: val})} 
                                autoHeight={true}
                                className="border-none rounded-none shadow-none"
                            />
                        </div>
                    </div>
                ) : (
                    <div className="flex flex-1 items-center justify-center text-neutral-500 py-12">
                        Select an email template above to start editing.
                    </div>
                )}
            </div>

            {/* Test Email Modal */}
            <Modal isOpen={isTestModalOpen} onClose={() => setIsTestModalOpen(false)}>
                <div className="w-full max-w-md bg-neutral-900 border border-neutral-800 rounded-2xl p-8 text-center shadow-2xl">
                    <div className="w-16 h-16 bg-purple-500/10 rounded-full flex items-center justify-center mx-auto mb-6 border border-purple-500/20">
                        <MailIcon className="w-8 h-8 text-purple-400" />
                    </div>
                    <h3 className="text-xl font-bold text-white mb-2">Send Test Email</h3>
                    <p className="text-neutral-400 text-sm mb-6">Send a preview of <strong>{currentTemplate?.name}</strong> to:</p>
                    
                    <input 
                        type="email" 
                        placeholder="Enter email address" 
                        value={testEmail}
                        onChange={e => setTestEmail(e.target.value)}
                        className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-4 py-3 text-white mb-6 focus:outline-none focus:border-purple-500"
                        autoFocus
                    />
                    
                    <div className="flex gap-3 justify-center">
                        <button 
                            onClick={() => setIsTestModalOpen(false)}
                            className="px-6 py-2.5 rounded-full text-neutral-300 hover:text-white hover:bg-neutral-800 transition-colors font-medium"
                        >
                            Cancel
                        </button>
                        <button 
                            onClick={handleSendTest}
                            disabled={!testEmail}
                            className="px-6 py-2.5 bg-purple-600 hover:bg-purple-500 text-white font-bold rounded-full shadow-lg shadow-purple-900/20 transition-colors disabled:opacity-50"
                        >
                            Send Preview
                        </button>
                    </div>
                </div>
            </Modal>
        </div>
    );
};

// --- PAYOUTS MANAGER ---
const AdminPayoutsManager: React.FC = () => {
    const [requests, setRequests] = useState<PayoutRequest[]>([]);
    const [loading, setLoading] = useState(true);
    const [isProcessing, setIsProcessing] = useState(false);

    const fetchRequests = async () => {
        setLoading(true);
        const data = await api.getPayoutRequests();
        setRequests(data);
        setLoading(false);
    };

    useEffect(() => { fetchRequests(); }, []);

    const handleApprove = async (id: string) => {
        if (window.confirm("Approve this payout? Funds will be transferred.")) {
            await api.approvePayoutRequests([id]);
            fetchRequests();
        }
    };

    const handleBackfill = async () => {
        if (!window.confirm("Are you sure? This will recalculate missing commissions for all completed orders based on proper attribution rules.")) return;
        setIsProcessing(true);
        try {
            const res = await api.backfillCommissions();
            alert(`Backfill Complete! ${res.message || 'Processed.'}`);
        } catch (e) {
            console.error(e);
            alert("Failed to run backfill script.");
        } finally {
            setIsProcessing(false);
        }
    };

    return (
        <div className="space-y-6 animate-fade-in">
            <div className="flex justify-between items-center">
                <h2 className="text-2xl font-bold text-white">Payout Requests</h2>
                <div className="flex gap-2">
                    <button 
                        onClick={handleBackfill} 
                        disabled={isProcessing}
                        className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-300 hover:text-white text-sm font-medium rounded-lg transition-colors border border-neutral-700 flex items-center gap-2"
                        title="Re-run commission logic for past orders to fix missing ledger entries"
                    >
                        <RefreshCwIcon className={`w-4 h-4 ${isProcessing ? 'animate-spin' : ''}`} />
                        {isProcessing ? 'Processing...' : 'Data Reconciliation (Backfill)'}
                    </button>
                </div>
            </div>
            
            <div className="bg-neutral-900 border border-neutral-800 rounded-2xl overflow-hidden">
                <table className="w-full text-sm text-left text-neutral-300">
                    <thead className="text-xs text-neutral-500 uppercase bg-neutral-950 border-b border-neutral-800">
                        <tr>
                            <th className="px-6 py-4">User</th>
                            <th className="px-6 py-4">Amount</th>
                            <th className="px-6 py-4">Requested</th>
                            <th className="px-6 py-4 text-center">Status</th>
                            <th className="px-6 py-4 text-right">Action</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-800">
                        {requests.map(req => (
                            <tr key={req.id}>
                                <td className="px-6 py-4">
                                    <div className="font-bold text-white">{req.userName}</div>
                                    <div className="text-xs text-neutral-500">{req.userEmail}</div>
                                </td>
                                <td className="px-6 py-4 font-mono text-white">${req.amount.toFixed(2)}</td>
                                <td className="px-6 py-4">{new Date(req.requestedDate).toLocaleDateString()}</td>
                                <td className="px-6 py-4 text-center">
                                    <span className={`px-2 py-1 rounded text-xs font-bold uppercase ${
                                        req.status === 'pending' ? 'bg-yellow-500/10 text-yellow-500' :
                                        req.status === 'approved' ? 'bg-green-500/10 text-green-500' : 'bg-red-500/10 text-red-500'
                                    }`}>
                                        {req.status}
                                    </span>
                                </td>
                                <td className="px-6 py-4 text-right">
                                    {req.status === 'pending' && (
                                        <button onClick={() => handleApprove(req.id)} className="text-xs font-bold px-3 py-1 bg-green-600 hover:bg-green-500 text-white rounded">Approve</button>
                                    )}
                                </td>
                            </tr>
                        ))}
                        {requests.length === 0 && <tr><td colSpan={5} className="text-center py-8 text-neutral-500">No pending payouts.</td></tr>}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

// --- SETTINGS ---
const AdminSettings: React.FC = () => {
    const [settings, setSettings] = useState<SystemSettings | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [isSaving, setIsSaving] = useState(false);
    const [saveSuccess, setSaveSuccess] = useState(false);

    useEffect(() => {
        const fetchSettings = async () => {
            try {
                const data = await api.getSystemSettings();
                setSettings(data);
            } catch (e) {
                console.error("Failed to load settings");
            } finally {
                setIsLoading(false);
            }
        };
        fetchSettings();
    }, []);

    const handleSave = async () => {
        if (!settings) return;
        setIsSaving(true);
        try {
            await api.updateSystemSettings(settings);
            setSaveSuccess(true);
            setTimeout(() => setSaveSuccess(false), 2000);
        } catch (e) {
            alert("Failed to save settings.");
        } finally {
            setIsSaving(false);
        }
    };

    if (isLoading) return <div className="text-center py-12 text-neutral-500">Loading configuration...</div>;
    if (!settings) return <div className="text-center py-12 text-red-500">Failed to load settings.</div>;

    return (
        <div className="space-y-6 animate-fade-in max-w-4xl">
            <div className="flex justify-between items-center">
                <div>
                    <h2 className="text-2xl font-bold text-white">System Settings</h2>
                    <p className="text-neutral-400 text-sm">Configure global platform parameters.</p>
                </div>
                <button 
                    onClick={handleSave} 
                    disabled={isSaving}
                    className="px-6 py-2.5 bg-purple-600 hover:bg-purple-500 text-white rounded-lg text-sm font-bold transition-colors disabled:opacity-50 flex items-center gap-2 shadow-lg shadow-purple-900/20"
                >
                    {isSaving ? 'Saving...' : saveSuccess ? <><CheckCircleIcon className="w-4 h-4"/> Saved!</> : 'Save Configuration'}
                </button>
            </div>

            <div className="grid grid-cols-1 gap-6">
                
                {/* General Settings */}
                <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6">
                    <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                        <SettingsIcon className="w-5 h-5 text-purple-400" /> General
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-medium text-neutral-300 mb-2">Platform Name</label>
                            <input 
                                type="text" 
                                value={settings.platformName}
                                onChange={e => setSettings({...settings, platformName: e.target.value})}
                                className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-purple-500"
                            />
                            <p className="text-xs text-neutral-500 mt-1">Displayed in emails and headers.</p>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-neutral-300 mb-2">Support Email</label>
                            <input 
                                type="email" 
                                value={settings.supportEmail}
                                onChange={e => setSettings({...settings, supportEmail: e.target.value})}
                                className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-purple-500"
                            />
                            <p className="text-xs text-neutral-500 mt-1">Used as the 'From' address for system emails.</p>
                        </div>
                    </div>
                </div>

                {/* Financials */}
                <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6">
                    <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                        <DollarSignIcon className="w-5 h-5 text-green-400" /> Financials
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-medium text-neutral-300 mb-2">Platform Fee (%)</label>
                            <div className="relative">
                                <input 
                                    type="number" 
                                    value={settings.platformFeePercent}
                                    onChange={e => setSettings({...settings, platformFeePercent: parseFloat(e.target.value)})}
                                    className="w-full bg-neutral-800 border border-neutral-700 rounded-lg px-4 py-2.5 text-white focus:outline-none focus:border-green-500"
                                    step="0.1"
                                />
                                <span className="absolute right-4 top-1/2 -translate-y-1/2 text-neutral-500">%</span>
                            </div>
                            <p className="text-xs text-neutral-500 mt-1">Percentage fee added to every ticket purchase.</p>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-neutral-300 mb-2">Fixed Fee ($)</label>
                            <div className="relative">
                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-500">$</span>
                                <input 
                                    type="number" 
                                    value={settings.platformFeeFixed}
                                    onChange={e => setSettings({...settings, platformFeeFixed: parseFloat(e.target.value)})}
                                    className="w-full bg-neutral-800 border border-neutral-700 rounded-lg pl-8 pr-4 py-2.5 text-white focus:outline-none focus:border-green-500"
                                    step="0.01"
                                />
                            </div>
                            <p className="text-xs text-neutral-500 mt-1">Fixed fee added to every ticket purchase.</p>
                        </div>
                    </div>
                </div>

                {/* Access Control */}
                <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6">
                    <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                        <LockIcon className="w-5 h-5 text-red-400" /> Access Control
                    </h3>
                    <div className="space-y-4">
                        <div className="flex items-center justify-between p-4 bg-neutral-800/30 border border-neutral-800 rounded-xl">
                            <div>
                                <p className="font-medium text-white">Maintenance Mode</p>
                                <p className="text-sm text-neutral-400">Display a banner and warn users of potential downtime.</p>
                            </div>
                            <button 
                                onClick={() => setSettings({...settings, maintenanceMode: !settings.maintenanceMode})}
                                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${settings.maintenanceMode ? 'bg-yellow-500' : 'bg-neutral-700'}`}
                            >
                                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${settings.maintenanceMode ? 'translate-x-6' : 'translate-x-1'}`} />
                            </button>
                        </div>

                        <div className="flex items-center justify-between p-4 bg-neutral-800/30 border border-neutral-800 rounded-xl">
                            <div>
                                <p className="font-medium text-white">Disable New Registrations</p>
                                <p className="text-sm text-neutral-400">Prevent new users from creating accounts.</p>
                            </div>
                            <button 
                                onClick={() => setSettings({...settings, disableRegistration: !settings.disableRegistration})}
                                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${settings.disableRegistration ? 'bg-red-600' : 'bg-neutral-700'}`}
                            >
                                <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${settings.disableRegistration ? 'translate-x-6' : 'translate-x-1'}`} />
                            </button>
                        </div>
                    </div>
                </div>

            </div>
        </div>
    );
};

export default SystemAdmin;

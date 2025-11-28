


import React from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
    ArrowLeftIcon, ArrowRightIcon, BarChartIcon, ScanIcon, SettingsIcon, 
    TicketIcon, PackageIcon, LayoutGridIcon, MegaphoneIcon, CalendarIcon, 
    DollarSignIcon, UsersIcon 
} from '../Icons';
import { Event as EventType, User } from '../../types';
import { createEventSlug } from '../../utils/url';

interface AdminSidebarProps {
    event: EventType;
    activeTab: string;
    user: User | null;
}

const AdminSidebar: React.FC<AdminSidebarProps> = ({ event, activeTab, user }) => {
    const navigate = useNavigate();
    const navItems = [
        { id: 'reports', label: 'Reports', icon: BarChartIcon },
        { id: 'checkin', label: 'Check-in', icon: ScanIcon },
        { id: 'details', label: 'Details', icon: SettingsIcon },
        { id: 'ticketing', label: 'Ticketing', icon: TicketIcon },
        { id: 'marketing', label: 'Marketing', icon: MegaphoneIcon },
        { id: 'sections', label: 'Sections', icon: LayoutGridIcon },
        { id: 'schedule', label: 'Schedule', icon: CalendarIcon },
        { id: 'orders', label: 'Orders', icon: UsersIcon },
    ];
    
    return (
        <aside className="w-full md:w-1/4 lg:w-1/5 flex-shrink-0">
            <Link 
                to={user?.isSystemAdmin ? "/system-admin" : "/events"} 
                state={user?.isSystemAdmin ? { activeTab: 'events' } : undefined}
                className="flex items-center space-x-2 text-sm font-semibold text-purple-400 hover:text-purple-300 transition-colors mb-6"
            >
                <ArrowLeftIcon className="w-4 h-4" />
                <span>Back to Events List</span>
            </Link>
            <div className="p-4 bg-neutral-900 border border-neutral-800 rounded-2xl mb-6">
                 <h2 className="text-lg font-bold text-white truncate">{event.title}</h2>
                 <Link to={`/event/${createEventSlug(event.title, event.id)}`} className="text-xs text-purple-400 hover:text-purple-300 transition-colors flex items-center">
                    View Event Page <ArrowRightIcon className="w-3 h-3 ml-1" />
                </Link>
            </div>
            <nav className="flex flex-row md:flex-col gap-1 overflow-x-auto md:overflow-visible">
                {navItems.map(item => (
                    <button
                        key={item.id}
                        onClick={() => navigate(`/event/${event.id}/admin/${item.id}`)}
                        className={`flex items-center justify-center md:justify-start w-full px-4 py-3 rounded-lg text-sm font-semibold transition-colors whitespace-nowrap md:whitespace-normal ${
                            activeTab === item.id
                                ? 'bg-neutral-800 text-white'
                                : 'text-neutral-400 hover:bg-neutral-800/50 hover:text-white'
                        }`}
                    >
                        <item.icon className="w-5 h-5 md:mr-3" />
                        <span className="hidden md:inline">{item.label}</span>
                    </button>
                ))}
            </nav>
        </aside>
    );
};

export default AdminSidebar;
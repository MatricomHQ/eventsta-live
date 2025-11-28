
import React from 'react';
import { UserIcon, CalendarPlusIcon, UsersIcon, DollarSignIcon } from './Icons';

interface SettingsSidebarProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
}

const SettingsSidebar: React.FC<SettingsSidebarProps> = ({ activeTab, setActiveTab }) => {
  const navItems = [
    { id: 'profile', label: 'Profile', icon: UserIcon },
    { id: 'hosts', label: 'Hosts', icon: CalendarPlusIcon },
    { id: 'team', label: 'Team', icon: UsersIcon },
    { id: 'payouts', label: 'Payouts', icon: DollarSignIcon },
  ];

  return (
    <aside className="w-full md:w-1/4 lg:w-1/5">
      <nav className="flex flex-row md:flex-col gap-1 p-2">
        {navItems.map(item => (
          <button
            key={item.id}
            onClick={() => setActiveTab(item.id)}
            className={`flex items-center w-full px-4 py-3 rounded-lg text-sm font-semibold transition-colors ${
              activeTab === item.id
                ? 'bg-neutral-800 text-white'
                : 'text-neutral-400 hover:bg-neutral-800/50 hover:text-white'
            }`}
          >
            <item.icon className="w-5 h-5 mr-3" />
            <span className="hidden md:inline">{item.label}</span>
          </button>
        ))}
      </nav>
    </aside>
  );
};

export default SettingsSidebar;

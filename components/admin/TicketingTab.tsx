import React, { useState } from 'react';
import { Event as EventType } from '../../types';
import TicketsTab from './TicketsTab';
import AddOnsTab from './AddOnsTab';

const TicketingTab: React.FC<{ event: EventType, onEventUpdate: () => void }> = ({ event, onEventUpdate }) => {
    const [activeSubTab, setActiveSubTab] = useState<'tickets' | 'addons'>('tickets');

    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-bold tracking-tight text-white">Ticketing</h1>
            
            <div className="border-b border-neutral-800">
                <nav className="flex -mb-px space-x-8">
                    <button 
                        onClick={() => setActiveSubTab('tickets')} 
                        className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-all ${
                            activeSubTab === 'tickets' ? 'border-purple-500 text-white' : 'border-transparent text-neutral-400 hover:text-white'
                        }`}
                    >
                        {event.type === 'fundraiser' ? 'Donation Tiers' : 'Tickets'}
                    </button>
                    <button 
                        onClick={() => setActiveSubTab('addons')} 
                        className={`whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm transition-all ${
                            activeSubTab === 'addons' ? 'border-purple-500 text-white' : 'border-transparent text-neutral-400 hover:text-white'
                        }`}
                    >
                        Add-ons
                    </button>
                </nav>
            </div>

            <div>
                {activeSubTab === 'tickets' && (
                    <div className="animate-fade-in">
                        {/* Render existing component but hide its internal header since we have a main one now? 
                            Actually, the existing components have their own Save button aligned with header. 
                            Let's modify the layout via CSS or wrapper to hide duplicate H1 if needed, 
                            or just accept nested structure. Since TicketsTab has a full header row with button, 
                            we might want to just render it. 
                            Currently TicketsTab has: <h1>Tickets</h1> <button>Save</button>
                            We can keep it, but maybe hide the 'Ticketing' h1 above if we want cleaner look.
                            Or we can refactor TicketsTab to take a 'hideHeader' prop. 
                            For now, let's just render the content.
                        */}
                       <TicketsTab event={event} onEventUpdate={onEventUpdate} />
                    </div>
                )}
                {activeSubTab === 'addons' && (
                    <div className="animate-fade-in">
                        <AddOnsTab event={event} onEventUpdate={onEventUpdate} />
                    </div>
                )}
            </div>
        </div>
    );
};

export default TicketingTab;
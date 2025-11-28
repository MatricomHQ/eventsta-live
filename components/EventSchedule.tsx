import React, { useState, useMemo } from 'react';
import { Event as EventType, ScheduleItem, VenueArea } from '../types';
import { CalendarIcon } from './Icons';

// A helper to format time nicely (e.g., 9:00 PM)
const formatTime = (isoString: string) => {
    if (!isoString) return '';
    return new Date(isoString).toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true,
    });
};

const EventSchedule: React.FC<{ event: EventType }> = ({ event }) => {
    // Return null if there's no schedule data to display
    if (!event.schedule || event.schedule.length === 0) {
        return null;
    }

    // Determine the sections based on event data.
    const sections = useMemo<VenueArea[]>(() => {
        if (event.venueAreas && event.venueAreas.length > 0) {
            // Filter out sections that have no scheduled items
            const scheduledAreaIds = new Set(event.schedule?.map(item => item.areaId));
            return event.venueAreas.filter(area => scheduledAreaIds.has(area.id));
        }
        // If there are schedule items but no defined areas, create a default "Schedule" section.
        if (event.schedule && event.schedule.length > 0) {
            return [{ id: 'default-area', name: 'Schedule' }];
        }
        return [];
    }, [event.venueAreas, event.schedule]);

    // Group schedule items by their area ID for easy access.
    const scheduleBySection = useMemo(() => {
        const grouped: { [key: string]: ScheduleItem[] } = {};
        const hasDefinedAreas = event.venueAreas && event.venueAreas.length > 0;

        for (const item of event.schedule!) {
            const areaId = hasDefinedAreas && item.areaId ? item.areaId : 'default-area';
            if (!grouped[areaId]) {
                grouped[areaId] = [];
            }
            grouped[areaId].push(item);
        }

        // Sort items within each group by start time
        for (const areaId in grouped) {
            grouped[areaId].sort((a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime());
        }

        return grouped;
    }, [event.schedule, event.venueAreas]);


    // If after all logic, there are no sections to display, render nothing.
    if (sections.length === 0) {
        return null;
    }
    
    // Set the initial active tab to the first section.
    const [activeSectionId, setActiveSectionId] = useState<string>(sections[0].id);

    const activeScheduleItems = scheduleBySection[activeSectionId] || [];

    return (
        <div className="bg-neutral-900/50 border border-neutral-800 rounded-2xl p-8 backdrop-blur-md mt-8">
            <h2 className="text-2xl font-bold text-white mb-6 flex items-center">
                <CalendarIcon className="w-6 h-6 mr-3 text-purple-400" />
                Schedule
            </h2>

            {/* Render tabs only if there's more than one section */}
            {sections.length > 1 && (
                <div className="border-b border-neutral-800 mb-8">
                    <nav className="flex -mb-px space-x-6 overflow-x-auto">
                        {sections.map(section => (
                            <button
                                key={section.id}
                                onClick={() => setActiveSectionId(section.id)}
                                className={`whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm transition-all ${
                                    activeSectionId === section.id
                                        ? 'border-purple-500 text-white'
                                        : 'border-transparent text-neutral-400 hover:text-white'
                                }`}
                            >
                                {section.name}
                            </button>
                        ))}
                    </nav>
                </div>
            )}
            
            <div className="relative pt-4">
                {/* The timeline bar - positioned to start and end at the center of the first and last dots respectively. */}
                <div className="absolute left-3 top-7 bottom-7 w-px bg-neutral-700"></div>

                <div className="space-y-8 pl-10">
                    {activeScheduleItems.map(item => (
                        <div key={item.id} className="relative">
                            {/* The timeline dot */}
                            <div className="absolute -left-9 top-1.5 w-4 h-4 bg-purple-500 rounded-full shadow-[0_0_0_4px_rgba(168,85,247,0.2)]">
                                <div className="absolute inset-0 flex items-center justify-center">
                                    <div className="w-2 h-2 bg-purple-300 rounded-full"></div>
                                </div>
                            </div>
                            
                            {/* Content */}
                            <p className="text-sm text-purple-300">
                                {formatTime(item.startTime)} &ndash; {formatTime(item.endTime)}
                            </p>
                            <h3 className="font-bold text-lg text-white mt-1">{item.title}</h3>
                        </div>
                    ))}
                </div>
            </div>
        </div>
    );
};

export default EventSchedule;

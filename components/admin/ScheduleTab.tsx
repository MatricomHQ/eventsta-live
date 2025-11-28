
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { useAuth } from '../../contexts/AuthContext';
import * as api from '../../services/api';
import { Event as EventType, ScheduleItem } from '../../types';
import { GripVerticalIcon, LayoutGridIcon, TrashIcon } from '../Icons';

const formatTimeForInput = (isoString: string): string => {
    if (!isoString) return '';
    const date = new Date(isoString);
    const hours = date.getHours().toString().padStart(2, '0');
    const minutes = date.getMinutes().toString().padStart(2, '0');
    return `${hours}:${minutes}`;
};

const updateIsoWithTime = (originalIso: string, newTime: string): string => {
    const date = new Date(originalIso);
    const [hours, minutes] = newTime.split(':').map(Number);
    if (!isNaN(hours) && !isNaN(minutes)) {
        date.setHours(hours, minutes, 0, 0);
    }
    return date.toISOString();
};

const ScheduleTab: React.FC<{ event: EventType, onEventUpdate: () => void }> = ({ event, onEventUpdate }) => {
    const { user } = useAuth();
    const [schedule, setSchedule] = useState<ScheduleItem[]>(event.schedule || []);
    const [isSaving, setIsSaving] = useState(false);
    const [saveSuccess, setSaveSuccess] = useState(false);

    const sections = useMemo(() => {
        if (event.venueAreas && event.venueAreas.length > 0) {
            return event.venueAreas;
        }
        return [{ id: 'default-area', name: 'Main Venue' }];
    }, [event.venueAreas]);

    const [activeSectionId, setActiveSectionId] = useState<string>(sections[0].id);

    useEffect(() => {
        setSchedule(event.schedule || []);
    }, [event.schedule]);
    
    useEffect(() => {
        if (!sections.find(s => s.id === activeSectionId)) {
            setActiveSectionId(sections[0]?.id);
        }
    }, [sections, activeSectionId]);

    const handleSave = async () => {
        if (!user) return;
        setIsSaving(true);
        setSaveSuccess(false);
        try {
            await api.updateEvent(user.id, event.id, { schedule });
            setSaveSuccess(true);
            onEventUpdate();
            setTimeout(() => setSaveSuccess(false), 2000);
        } catch (error) {
            console.error("Failed to save schedule:", error);
            alert("Failed to save changes.");
        } finally {
            setIsSaving(false);
        }
    };

    const handleSectionScheduleChange = (sectionId: string, newItems: ScheduleItem[]) => {
        const otherItems = schedule.filter(item => item.areaId !== sectionId);
        setSchedule([...otherItems, ...newItems].sort((a,b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime()));
    };

    return (
        <div className="space-y-8">
            <div className="flex justify-between items-center">
                <h1 className="text-3xl font-bold tracking-tight text-white">Schedule</h1>
                <button onClick={handleSave} disabled={isSaving || saveSuccess} className="px-6 py-3 text-sm font-semibold rounded-full min-w-[140px] text-center bg-purple-600 text-white hover:bg-purple-500 disabled:bg-neutral-700 disabled:text-neutral-500">
                    {isSaving ? 'Saving...' : saveSuccess ? 'Saved!' : 'Save Schedule'}
                </button>
            </div>
            
            <div className="border-b border-neutral-800">
                <nav className="flex -mb-px space-x-6 overflow-x-auto">
                    {sections.map(section => (
                        <button key={section.id} onClick={() => setActiveSectionId(section.id)} className={`whitespace-nowrap py-3 px-1 border-b-2 font-medium text-sm transition-all ${activeSectionId === section.id ? 'border-purple-500 text-white' : 'border-transparent text-neutral-400 hover:text-white'}`}>
                            {section.name}
                        </button>
                    ))}
                </nav>
            </div>

            <SectionScheduleView
                key={activeSectionId}
                event={event}
                sectionId={activeSectionId}
                items={schedule.filter(item => item.areaId === activeSectionId).sort((a,b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime())}
                onItemsChange={(newItems) => handleSectionScheduleChange(activeSectionId, newItems)}
            />
        </div>
    );
};

const SectionScheduleView: React.FC<{
    event: EventType;
    sectionId: string;
    items: ScheduleItem[];
    onItemsChange: (items: ScheduleItem[]) => void;
}> = ({ event, sectionId, items, onItemsChange }) => {
    const dragItem = useRef<number | null>(null);
    const dragOverItem = useRef<number | null>(null);

    useEffect(() => {
        if (items.length === 0 && event.date && event.endDate) {
            const defaultItem: ScheduleItem = {
                id: uuidv4(),
                areaId: sectionId,
                title: 'Event Duration',
                startTime: event.date,
                endTime: event.endDate,
            };
            onItemsChange([defaultItem]);
        }
    }, [items.length, event.date, event.endDate, sectionId, onItemsChange]);

    const handleUpdate = (updatedItem: ScheduleItem, index: number) => {
        const newItems = [...items];
        newItems[index] = updatedItem;

        const changedStartTime = newItems[index].startTime !== items[index].startTime;
        const changedEndTime = newItems[index].endTime !== items[index].endTime;

        if (changedStartTime && newItems[index - 1]) {
            newItems[index - 1].endTime = updatedItem.startTime;
        }
        if (changedEndTime && newItems[index + 1]) {
            newItems[index + 1].startTime = updatedItem.endTime;
        }

        onItemsChange(newItems);
    };

    const handleSplit = (index: number) => {
        const itemToSplit = items[index];
        const start = new Date(itemToSplit.startTime).getTime();
        const end = new Date(itemToSplit.endTime).getTime();
        const midTime = start + (end - start) / 2;
        
        if (midTime <= start) return;
        
        const mid = new Date(midTime).toISOString();

        const newItem1: ScheduleItem = { ...itemToSplit, endTime: mid };
        const newItem2: ScheduleItem = {
            id: uuidv4(),
            areaId: sectionId,
            title: itemToSplit.title,
            startTime: mid,
            endTime: itemToSplit.endTime,
        };

        const newItems = [...items];
        newItems.splice(index, 1, newItem1, newItem2);
        onItemsChange(newItems);
    };

    const handleDelete = (id: string) => {
        onItemsChange(items.filter(item => item.id !== id));
    };
    
    const handleDragSort = () => {
        if (dragItem.current === null || dragOverItem.current === null || dragItem.current === dragOverItem.current) return;

        let newItems = [...items];
        const draggedItemContent = newItems.splice(dragItem.current, 1)[0];
        newItems.splice(dragOverItem.current, 0, draggedItemContent);
        
        let lastEndTime = event.date; 
        newItems = newItems.map((item, index) => {
            const startTime = index === 0 ? new Date(event.date) : new Date(lastEndTime);
            const duration = new Date(item.endTime).getTime() - new Date(item.startTime).getTime();
            const endTime = new Date(startTime.getTime() + duration);
            
            lastEndTime = endTime.toISOString();
            
            return {
                ...item,
                startTime: startTime.toISOString(),
                endTime: endTime.toISOString(),
            };
        });
        
        dragItem.current = null;
        dragOverItem.current = null;
        onItemsChange(newItems);
    };


    if (!event.date || !event.endDate) {
        return <div className="text-center text-neutral-500 p-8 bg-neutral-900 rounded-lg">Please set a start and end date for the event in the 'Details' tab to manage the schedule.</div>;
    }

    return (
        <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6">
            <div className="space-y-2">
                {items.map((item, index) => (
                    <div 
                        key={item.id}
                        draggable
                        onDragStart={() => dragItem.current = index}
                        onDragEnter={() => dragOverItem.current = index}
                        onDragEnd={handleDragSort}
                        onDragOver={(e) => e.preventDefault()}
                        className="cursor-pointer"
                    >
                        <TimeBlockEditor 
                            item={item}
                            onUpdate={(updated) => handleUpdate(updated, index)}
                            onDelete={() => handleDelete(item.id)}
                            onSplit={() => handleSplit(index)}
                        />
                    </div>
                ))}
            </div>
             {items.length === 0 && (
                <div className="text-center py-10 border-2 border-dashed border-neutral-800 rounded-lg">
                    <p className="text-neutral-500">No schedule items for this section.</p>
                </div>
            )}
        </div>
    );
};

const TimeBlockEditor: React.FC<{
    item: ScheduleItem;
    onUpdate: (item: ScheduleItem) => void;
    onDelete: () => void;
    onSplit: () => void;
}> = ({ item, onUpdate, onDelete, onSplit }) => {
    
    const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        onUpdate({ ...item, title: e.target.value });
    };

    const handleTimeChange = (type: 'start' | 'end', timeValue: string) => {
        const field = type === 'start' ? 'startTime' : 'endTime';
        const dateToUpdate = item[field];
        onUpdate({ ...item, [field]: updateIsoWithTime(dateToUpdate, timeValue) });
    };

    return (
        <div className="bg-neutral-800 p-4 rounded-lg border border-neutral-700 flex flex-col sm:flex-row items-center gap-4">
            <div className="cursor-grab text-neutral-500 p-2"><GripVerticalIcon className="w-5 h-5"/></div>
            <input
                type="text"
                value={item.title}
                onChange={handleTitleChange}
                placeholder="Artist or Set Name"
                className="flex-grow w-full sm:w-auto h-10 px-3 bg-neutral-700 rounded-md text-white border-transparent focus:border-purple-500 focus:ring-purple-500"
            />
            <div className="flex items-center gap-2">
                <input type="time" value={formatTimeForInput(item.startTime)} onChange={e => handleTimeChange('start', e.target.value)} step="60" className="w-28 h-10 px-2 bg-neutral-700 rounded-md text-white border-transparent focus:border-purple-500 focus:ring-purple-500"/>
                <span className="text-neutral-500">-</span>
                <input type="time" value={formatTimeForInput(item.endTime)} onChange={e => handleTimeChange('end', e.target.value)} step="60" className="w-28 h-10 px-2 bg-neutral-700 rounded-md text-white border-transparent focus:border-purple-500 focus:ring-purple-500"/>
            </div>
            <div className="flex items-center gap-2">
                <button onClick={onSplit} className="p-2 text-neutral-400 hover:text-white transition-colors" title="Split block"><LayoutGridIcon className="w-5 h-5"/></button>
                <button onClick={onDelete} className="p-2 text-neutral-400 hover:text-red-400 transition-colors" title="Delete block"><TrashIcon className="w-5 h-5"/></button>
            </div>
        </div>
    );
};

export default ScheduleTab;

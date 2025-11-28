
import React from 'react';
import { Link } from 'react-router-dom';
import { Event } from '../types';
import { MapPinIcon, ArrowRightIcon } from './Icons';
import { createEventSlug } from '../utils/url';

export const EventCard: React.FC<{ event: Event }> = ({ event }) => {
  return (
    <Link to={`/event/${createEventSlug(event.title, event.id)}`} className="event-card group bg-neutral-900 rounded-2xl overflow-hidden flex flex-row shadow-lg cursor-pointer transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] border border-neutral-800 hover:border-purple-500 hover:shadow-purple-500/10 hover:-translate-y-1">
      <div className="relative w-32 md:w-40 flex-shrink-0">
        <img src={event.imageUrls[0]} alt={event.title} className="w-full h-36 object-cover" />
      </div>
      <div className="p-5 md:p-6 flex-grow flex flex-col justify-center overflow-hidden">
        <span className="text-sm font-semibold text-purple-400 mb-1 block">
          {new Date(event.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
        </span>
        <h3 className="text-lg md:text-xl font-bold text-white mb-2 truncate">{event.title}</h3>
        <p className="text-neutral-400 text-sm flex items-center gap-2 truncate">
          <MapPinIcon className="w-4 h-4 text-neutral-500 flex-shrink-0" />
          <span className="truncate">{event.location}</span>
        </p>
      </div>
      <div className="flex-shrink-0 flex items-center justify-center w-16 md:w-20 bg-neutral-900 group-hover:bg-purple-600 text-neutral-500 group-hover:text-white transition-all duration-300">
        <ArrowRightIcon className="w-6 h-6" />
      </div>
    </Link>
  );
};

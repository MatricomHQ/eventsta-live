
import React from 'react';
import { Link } from 'react-router-dom';
import { Event } from '../types';
import { MapPinIcon, ArrowRightIcon } from './Icons';
import { createEventSlug } from '../utils/url';

export const EventCard: React.FC<{ event: Event }> = ({ event }) => {
  return (
    <Link 
      to={`/event/${createEventSlug(event.title, event.id)}`} 
      className="event-card group bg-black/20 backdrop-blur-3xl rounded-2xl overflow-hidden flex flex-row shadow-2xl cursor-pointer transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] border border-white/10 hover:border-purple-500/50 hover:shadow-purple-500/20 hover:-translate-y-1 hover:bg-black/40"
    >
      <div className="relative w-32 md:w-40 flex-shrink-0 overflow-hidden">
        <img 
          src={event.imageUrls[0]} 
          alt={event.title} 
          className="w-full h-36 object-cover transition-transform duration-700 ease-in-out group-hover:scale-110" 
        />
        <div className="absolute inset-0 bg-gradient-to-r from-black/40 to-transparent"></div>
      </div>
      <div className="p-5 md:p-6 flex-grow flex flex-col justify-center overflow-hidden relative">
        {/* Subtle internal glow for depth */}
        <div className="absolute -top-10 -right-10 w-24 h-24 bg-purple-500/10 blur-3xl rounded-full pointer-events-none group-hover:bg-purple-500/20 transition-colors"></div>

        <span className="text-sm font-bold text-purple-400 mb-1 block tracking-wide relative z-10">
          {new Date(event.date).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}
        </span>
        <h3 className="text-lg md:text-xl font-bold text-white mb-2 truncate relative z-10 group-hover:text-purple-100 transition-colors">
          {event.title}
        </h3>
        <p className="text-neutral-300 text-sm flex items-center gap-2 truncate relative z-10 group-hover:text-white transition-colors">
          <MapPinIcon className="w-4 h-4 text-neutral-400 flex-shrink-0" />
          <span className="truncate">{event.location}</span>
        </p>
      </div>
      <div className="flex-shrink-0 flex items-center justify-center w-16 md:w-20 bg-white/5 border-l border-white/5 group-hover:bg-purple-600/80 text-neutral-400 group-hover:text-white transition-all duration-300 backdrop-blur-md">
        <ArrowRightIcon className="w-6 h-6 transform group-hover:translate-x-1 transition-transform" />
      </div>
    </Link>
  );
};

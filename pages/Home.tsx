
import React, { useState, useEffect } from 'react';
import { getFeaturedEvents } from '../services/api';
import { Event } from '../types';
import HeroSlider from '../components/HeroSlider';
import { EventCard } from '../components/EventCard';
import SEOHead from '../components/SEOHead';

const Home: React.FC = () => {
  const [events, setEvents] = useState<Event[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchEvents = async () => {
      try {
        setIsLoading(true);
        const fetchedEvents = await getFeaturedEvents();
        setEvents(fetchedEvents);
        setError(null);
      } catch (err) {
        setError("Failed to load events.");
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchEvents();
  }, []);

  return (
    <div className="flex flex-col min-h-[calc(100vh-80px)]">
      <SEOHead 
        title="Discover Events" 
        description="Find the best concerts, festivals, and parties near you with Eventsta." 
      />
      
      <div className="flex-grow">
        <HeroSlider events={events} />
        <section className="container mx-auto max-w-7xl px-6 py-24 relative z-10">
          <h2 className="text-4xl font-bold tracking-tight text-white mb-12 text-glow">Upcoming Events</h2>
          {isLoading ? (
            <p className="text-neutral-400">Loading events...</p>
          ) : error ? (
            <p className="text-red-400">{error}</p>
          ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              {events.map(event => (
                <EventCard key={event.id} event={event} />
              ))}
            </div>
          )}
        </section>
      </div>

      <footer className="relative z-10 w-full py-8 mt-auto border-t border-white/5 bg-black/30 backdrop-blur-xl text-center">
          <p className="text-neutral-400 text-sm font-medium tracking-wide">
              Non-profit Event Management Platform by <span className="text-neutral-200">Community Arts and Festivals</span>
          </p>
      </footer>
    </div>
  );
};

export default Home;

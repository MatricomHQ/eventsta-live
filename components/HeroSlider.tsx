
import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { Event } from '../types';
import HostLink from './HostLink';
import { createEventSlug } from '../utils/url';

interface HeroSliderProps {
  events: Event[];
}

const MAIN_SLIDER_DURATION = 8000;
const INNER_SLIDER_DURATION = 4000;

const InnerImageSlider: React.FC<{ images: string[], title: string, isActive: boolean }> = ({ images, title, isActive }) => {
    const [currentIndex, setCurrentIndex] = useState(0);

    useEffect(() => {
        if (isActive && images.length > 1) {
            const intervalId = setInterval(() => {
                setCurrentIndex(prevIndex => (prevIndex + 1) % images.length);
            }, INNER_SLIDER_DURATION);
            return () => clearInterval(intervalId);
        }
    }, [isActive, images.length]);

    return (
        <div className="absolute inset-0 w-full h-full">
            {images.map((url, imgIndex) => {
                const animClass = `anim-${(imgIndex % 3) + 1}`;
                return (
                    <img 
                        key={imgIndex} 
                        src={url} 
                        alt={`${title} image ${imgIndex + 1}`} 
                        className={`absolute inset-0 w-full h-full object-cover transition-opacity duration-[2500ms] ease-in-out ${animClass}`}
                        style={{ opacity: isActive && currentIndex === imgIndex ? 1 : 0 }}
                    />
                );
            })}
        </div>
    );
};

const HeroSlider: React.FC<HeroSliderProps> = ({ events }) => {
  const [mainIndex, setMainIndex] = useState(0);
  
  const switchMainSlide = useCallback((index: number) => {
    setMainIndex(index);
  }, []);

  useEffect(() => {
    if (events.length > 1) {
      const timer = setTimeout(() => {
        switchMainSlide((mainIndex + 1) % events.length);
      }, MAIN_SLIDER_DURATION);
      return () => clearTimeout(timer);
    }
  }, [mainIndex, events.length, switchMainSlide]);

  if (!events || events.length === 0) {
    return <div className="relative w-full h-[90vh] bg-neutral-900 flex items-center justify-center"><p>Loading events...</p></div>;
  }

  const activeEvent = events[mainIndex];

  return (
    <>
      {/* Global Background for Home Page - Fixed, No Scroll Movement */}
      <div 
        className="fixed inset-0 w-full h-screen overflow-hidden z-0 pointer-events-none"
      >
        {events.map((event, index) => (
          <div
            key={`bg-${event.id}`}
            className="absolute inset-0 bg-cover bg-center transition-opacity duration-[1500ms] ease-in-out"
            style={{ 
                backgroundImage: `url(${event.imageUrls[0]})`,
                opacity: mainIndex === index ? 1 : 0,
                filter: 'blur(60px) brightness(0.3) saturate(1.2)',
                transform: 'scale(1.2)' // Slight scale to ensure coverage
            }}
          />
        ))}
        <div className="absolute inset-0 bg-black/20"></div>
      </div>

      <section className="relative w-full h-[90vh] overflow-hidden z-10">
        {/* Slides */}
        <div className="relative w-full h-full">
          {events.map((event, index) => (
            <div
              key={event.id}
              className="hero-slide absolute inset-0 transition-opacity duration-[1500ms] ease-[cubic-bezier(0.16,1,0.3,1)]"
              style={{ 
                  opacity: mainIndex === index ? 1 : 0,
                  transform: mainIndex === index ? 'scale(1)' : 'scale(1.05)',
                  transitionProperty: 'opacity, transform',
                  willChange: 'opacity, transform',
                  zIndex: mainIndex === index ? 10 : 1,
              }}
            >
              <InnerImageSlider images={event.imageUrls} title={event.title} isActive={mainIndex === index} />
              <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/40 to-transparent"></div>
            </div>
          ))}
          <div className="relative z-10 container mx-auto max-w-7xl px-6 h-full flex flex-col justify-center">
              <div className="w-full md:w-1/2 lg:w-2/5">
              <h1 className="text-5xl lg:text-7xl font-black text-white tracking-tighter mb-4 text-glow">{activeEvent.title}</h1>
              <HostLink 
                  hostId={activeEvent.hostId} 
                  hostName={activeEvent.hostName} 
                  className="text-2xl lg:text-3xl font-semibold text-purple-400 mb-6 block hover:text-purple-300"
              />
              <p className="text-lg text-neutral-300 mb-10">{new Date(activeEvent.date).toLocaleDateString('en-US', { month: 'long', day: 'numeric' })} • {activeEvent.location}</p>
              <Link to={`/event/${createEventSlug(activeEvent.title, activeEvent.id)}`} className="inline-block px-8 py-5 bg-white/10 backdrop-blur-sm border border-white/20 rounded-full text-lg font-bold text-white text-center hover:bg-white/20 transition-all duration-300">
                  Get Tickets
              </Link>
              </div>
          </div>
        </div>

        {/* Pagination Dots */}
        <div className="absolute bottom-8 left-1/2 -translate-x-1/2 z-20 flex space-x-2">
          {events.map((_, index) => (
            <button
              key={index}
              onClick={() => switchMainSlide(index)}
              className={`h-[10px] rounded-full transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] ${mainIndex === index ? 'w-12 bg-white' : 'w-[10px] bg-white/30 hover:bg-white/70'}`}
            />
          ))}
        </div>
      </section>
    </>
  );
};

// Add styles for Ken Burns animations
const animStyle = document.createElement('style');
animStyle.innerHTML = `
  .anim-1 { animation: kenburns-tl 12s ease-in-out forwards; }
  .anim-2 { animation: kenburns-br 12s ease-in-out forwards; }
  .anim-3 { animation: kenburns-center 12s ease-in-out forwards; }
`;
document.head.appendChild(animStyle);


export default HeroSlider;

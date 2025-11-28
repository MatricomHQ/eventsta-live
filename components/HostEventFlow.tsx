




import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import Modal from './Modal';
import { useAuth } from '../contexts/AuthContext';
import * as api from '../services/api';
import { generateEventDescription, generateEventImage } from '../services/geminiService';
import { WandSparklesIcon, TrashIcon, CheckCircleIcon, ArrowRightIcon, TicketIcon, DollarSignIcon, XIcon, SaveIcon, ShieldCheckIcon } from './Icons';
import { Event, TicketOption, Host } from '../types';

interface HostEventFlowProps {
  isOpen: boolean;
  onClose: () => void;
  onEventCreated: (newEvent: Event) => void;
  host: Host | null;
}

const STEPS = [
  { id: 1, name: 'Type' },
  { id: 2, name: 'Details' },
  { id: 3, name: 'Location' },
  { id: 4, name: 'Pricing' },
  { id: 5, name: 'Imagery' },
];

const initialEventData = {
  type: 'ticketed' as 'ticketed' | 'fundraiser',
  title: '',
  description: '',
  location: '',
  date: '',
  endDate: '',
  tickets: [{ id: uuidv4(), type: 'General Admission', price: 10.00, description: '', minimumDonation: 5 }],
  imageUrls: [''],
  commission: 10,
  defaultPromoDiscount: 5,
};

const HostEventFlow: React.FC<HostEventFlowProps> = ({ isOpen, onClose, onEventCreated, host }) => {
  const { user } = useAuth();
  const [currentStep, setCurrentStep] = useState(1);
  const [eventData, setEventData] = useState(initialEventData);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const [isGeneratingImage, setIsGeneratingImage] = useState(false);

  const handleClose = () => {
    onClose();
    setTimeout(() => {
        setCurrentStep(1);
        setEventData(initialEventData);
    }, 300); // Reset after modal close animation
  };

  const handleDataChange = (field: string, value: any) => {
    setEventData(prev => ({ ...prev, [field]: value }));
  };

  const handleNext = () => {
    if (currentStep < STEPS.length) {
      setCurrentStep(prev => prev + 1);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep(prev => prev - 1);
    }
  };
  
  const isStepValid = useMemo(() => {
    switch (currentStep) {
      case 1: return eventData.type === 'ticketed' || eventData.type === 'fundraiser';
      case 2: return eventData.title.trim() !== '' && eventData.date !== '' && eventData.endDate !== '' && new Date(eventData.endDate) > new Date(eventData.date);
      case 3: return eventData.location.trim() !== '';
      case 4:
        if (eventData.tickets.length === 0) return false;
        if (eventData.type === 'ticketed') {
            return eventData.tickets.every(t => t.type.trim() !== '' && t.price >= 0);
        }
        return eventData.tickets.every(d => d.type.trim() !== '' && d.price >= (d.minimumDonation ?? 0) && (d.minimumDonation ?? 0) >= 0);
      case 5:
        return eventData.imageUrls[0] !== '';
      default:
        return false;
    }
  }, [currentStep, eventData]);

  const handleSubmit = async (status: 'DRAFT' | 'PUBLISHED') => {
    if (!user || !host || !isStepValid) return;
    setIsSubmitting(true);
    
    // Construct the final event object for the API
    const finalEventData: Partial<Event> = {
      title: eventData.title,
      description: eventData.description,
      location: eventData.location,
      date: eventData.date,
      endDate: eventData.endDate,
      imageUrls: eventData.imageUrls,
      commission: eventData.commission,
      defaultPromoDiscount: eventData.defaultPromoDiscount,
      hostId: host.id,
      hostName: host.name,
      type: eventData.type,
      tickets: eventData.tickets.map(({ id, ...rest }) => rest),
      addOns: [], // Add-ons are not part of the creation flow yet
      status: status, // Pass the status (DRAFT or PUBLISHED)
    };
    
    try {
      const newEvent = await api.createEvent(user.id, host.id, finalEventData);
      onEventCreated(newEvent);
      handleClose();
    } catch (error) {
      console.error("Failed to create event", error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const renderContent = () => {
      switch (currentStep) {
          case 1: return <Step1Type data={eventData} onChange={handleDataChange} />;
          case 2: return <Step2Details data={eventData} onChange={handleDataChange} />;
          case 3: return <Step3Location data={eventData} onChange={handleDataChange} />;
          case 4: return <Step4Pricing data={eventData} onChange={handleDataChange} />;
          case 5: return <Step5Image data={eventData} onChange={handleDataChange} isGenerating={isGeneratingImage} setGenerating={setIsGeneratingImage} />;
          default: return null;
      }
  };
  
  return (
    <Modal isOpen={isOpen} onClose={handleClose} showCloseButton={false}>
        <div className="w-full md:w-[42rem] bg-neutral-900 border border-neutral-800 rounded-xl md:rounded-2xl shadow-2xl shadow-purple-500/10 flex flex-col max-h-[90vh] h-full md:h-auto">
            <div className="p-6 md:p-8 border-b border-neutral-800 flex flex-col gap-4 flex-shrink-0">
                <div className="flex justify-between items-start">
                    <div>
                        <h2 className="text-xl md:text-2xl font-bold text-white">Host a New Event</h2>
                        {host && <p className="text-sm text-neutral-400">for <span className="font-semibold text-purple-400">{host.name}</span></p>}
                    </div>
                    <button onClick={handleClose} className="text-neutral-400 hover:text-white p-2 bg-neutral-800 rounded-full"><XIcon className="w-5 h-5" /></button>
                </div>
                
                <div className="flex items-center space-x-2 overflow-x-auto no-scrollbar pb-1">
                {STEPS.map((step, index) => (
                    <React.Fragment key={step.id}>
                    <div className="flex items-center flex-shrink-0">
                        <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-colors duration-300 ${currentStep >= step.id ? 'bg-purple-600 text-white' : 'bg-neutral-700 text-neutral-400'}`}>
                        {currentStep > step.id ? <CheckCircleIcon className="w-4 h-4" /> : step.id}
                        </div>
                        <p className={`ml-2 text-xs md:text-sm font-medium whitespace-nowrap ${currentStep >= step.id ? 'text-white' : 'text-neutral-500'}`}>{step.name}</p>
                    </div>
                    {index < STEPS.length - 1 && <div className="w-4 md:w-8 h-0.5 bg-neutral-800 mx-2 flex-shrink-0"></div>}
                    </React.Fragment>
                ))}
                </div>
            </div>
            
            <div className="p-6 md:p-8 overflow-y-auto custom-scrollbar flex-grow">
                {renderContent()}
            </div>

            <div className="p-4 md:p-6 bg-neutral-900/50 border-t border-neutral-800 flex justify-between items-center flex-shrink-0">
                <div>
                    {currentStep > 1 && (
                        <button onClick={handleBack} className="px-4 py-2 text-sm font-semibold text-neutral-300 hover:text-white transition-colors">Back</button>
                    )}
                </div>
                <div>
                    {currentStep < STEPS.length ? (
                        <button onClick={handleNext} disabled={!isStepValid} className="px-6 py-3 bg-purple-600 text-white text-sm font-semibold rounded-full hover:bg-purple-500 transition-all duration-300 shadow-lg shadow-purple-500/20 disabled:bg-neutral-700 disabled:text-neutral-500 disabled:shadow-none flex items-center">
                            Next <ArrowRightIcon className="w-4 h-4 ml-2" />
                        </button>
                    ) : (
                        <div className="flex gap-3">
                            <button 
                                onClick={() => handleSubmit('DRAFT')} 
                                disabled={!isStepValid || isSubmitting} 
                                className="px-6 py-3 bg-neutral-800 border border-neutral-700 text-white text-sm font-semibold rounded-full hover:bg-neutral-700 transition-all duration-300 flex items-center gap-2 disabled:opacity-50"
                            >
                                <SaveIcon className="w-4 h-4" />
                                Save as Draft
                            </button>
                            <button 
                                onClick={() => handleSubmit('PUBLISHED')} 
                                disabled={!isStepValid || isSubmitting} 
                                className="px-6 py-3 bg-green-600 text-white text-sm font-semibold rounded-full hover:bg-green-500 transition-all duration-300 shadow-lg shadow-green-500/20 flex items-center gap-2 disabled:bg-neutral-700 disabled:text-neutral-500 disabled:shadow-none"
                            >
                                {isSubmitting ? 'Publishing...' : 'Publish Event'}
                                {!isSubmitting && <ShieldCheckIcon className="w-4 h-4" />}
                            </button>
                        </div>
                    )}
                </div>
            </div>
        </div>
    </Modal>
  );
};

const Step1Type = ({ data, onChange }: any) => (
    <div className="space-y-4">
        <button onClick={() => onChange('type', 'ticketed')} className={`w-full p-4 md:p-6 text-left border rounded-xl transition-all ${data.type === 'ticketed' ? 'border-purple-500 bg-purple-500/10' : 'border-neutral-700 hover:border-neutral-600 bg-neutral-800/30'}`}>
            <div className="flex items-center">
                <div className="p-3 bg-neutral-800 rounded-lg mr-4">
                    <TicketIcon className="w-6 h-6 text-purple-400" />
                </div>
                <div>
                    <h4 className="font-bold text-white text-lg">Ticketed Event</h4>
                    <p className="text-sm text-neutral-400 mt-1">Sell tickets at fixed prices. Perfect for concerts, parties, and shows.</p>
                </div>
            </div>
        </button>
        <button onClick={() => onChange('type', 'fundraiser')} className={`w-full p-4 md:p-6 text-left border rounded-xl transition-all ${data.type === 'fundraiser' ? 'border-green-500 bg-green-500/10' : 'border-neutral-700 hover:border-neutral-600 bg-neutral-800/30'}`}>
            <div className="flex items-center">
                <div className="p-3 bg-neutral-800 rounded-lg mr-4">
                    <DollarSignIcon className="w-6 h-6 text-green-400" />
                </div>
                 <div>
                    <h4 className="font-bold text-white text-lg">Fundraiser Event</h4>
                    <p className="text-sm text-neutral-400 mt-1">Collect donations. Guests choose their contribution amount.</p>
                </div>
            </div>
        </button>
    </div>
);


// Step 2 Component
const Step2Details = ({ data, onChange }: any) => (
    <div className="space-y-6">
        <div>
            <label htmlFor="event-title" className="block text-sm font-medium text-neutral-300 mb-2">Event Title</label>
            <input type="text" id="event-title" value={data.title} onChange={e => onChange('title', e.target.value)} className="w-full h-12 px-4 bg-neutral-800 border border-neutral-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500 placeholder-neutral-600" placeholder="e.g. Summer Rooftop Party" required />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
             <div>
                <label htmlFor="event-date" className="block text-sm font-medium text-neutral-300 mb-2">Start</label>
                <input type="datetime-local" id="event-date" value={data.date} onChange={e => onChange('date', e.target.value)} className="w-full h-12 px-4 bg-neutral-800 border border-neutral-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500 appearance-none" required />
            </div>
            <div>
                <label htmlFor="event-end-date" className="block text-sm font-medium text-neutral-300 mb-2">End</label>
                <input type="datetime-local" id="event-end-date" value={data.endDate} onChange={e => onChange('endDate', e.target.value)} className="w-full h-12 px-4 bg-neutral-800 border border-neutral-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500 appearance-none" required />
            </div>
        </div>
        <div>
            <label htmlFor="event-desc" className="block text-sm font-medium text-neutral-300 mb-2">Description</label>
            <textarea id="event-desc" value={data.description} onChange={e => onChange('description', e.target.value)} rows={4} className="w-full p-4 bg-neutral-800 border border-neutral-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none placeholder-neutral-600" placeholder="Tell people what makes your event special..." />
        </div>
    </div>
);

// Step 3 Component
const Step3Location = ({ data, onChange }: any) => {
    const [locations, setLocations] = useState<string[]>([]);
    const [query, setQuery] = useState('');

    useEffect(() => {
        api.getMockLocations().then(setLocations);
    }, []);

    const filteredLocations = query ? locations.filter(loc => loc.toLowerCase().includes(query.toLowerCase())) : [];
    
    return (
        <div className="space-y-6">
            <div className="relative">
                <label htmlFor="event-location" className="block text-sm font-medium text-neutral-300 mb-2">Event Location</label>
                <input type="text" id="event-location" value={data.location} onChange={e => { onChange('location', e.target.value); setQuery(e.target.value); }} autoComplete="off" className="w-full h-12 px-4 bg-neutral-800 border border-neutral-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500" placeholder="e.g. 123 Main St, Los Angeles, CA" required />
                 {filteredLocations.length > 0 && query && (
                    <ul className="absolute z-10 w-full mt-1 bg-neutral-800 border border-neutral-700 rounded-lg shadow-lg max-h-40 overflow-y-auto custom-scrollbar">
                        {filteredLocations.map(loc => (
                            <li key={loc} onClick={() => { onChange('location', loc); setQuery(''); }} className="px-4 py-3 text-white hover:bg-purple-600 cursor-pointer border-b border-neutral-700 last:border-0">{loc}</li>
                        ))}
                    </ul>
                )}
            </div>
            <div className="bg-neutral-800/30 p-4 rounded-lg border border-neutral-800">
                <p className="text-sm text-neutral-400 flex gap-2">
                    <span className="text-purple-400">💡</span> 
                    Tip: Be specific. Use the full address so attendees can find it on maps easily.
                </p>
            </div>
        </div>
    );
}

// Step 4 Component (Pricing for Tickets/Donations)
const Step4Pricing = ({ data, onChange }: any) => {
    const isFundraiser = data.type === 'fundraiser';
    
    const handleTicketChange = (id: string, field: keyof TicketOption, value: any) => {
        const newTickets = data.tickets.map((ticket: any) => {
            if (ticket.id === id) {
                const isNumericField = field === 'price' || field === 'minimumDonation';
                const updatedValue = isNumericField ? (parseFloat(value) || 0) : value;
                return { ...ticket, [field]: updatedValue };
            }
            return ticket;
        });
        onChange('tickets', newTickets);
    };

    const addTicket = () => {
        const newTicket = { id: uuidv4(), type: '', price: 0, description: '', minimumDonation: 0 };
        onChange('tickets', [...data.tickets, newTicket]);
    };

    const removeTicket = (id: string) => {
        onChange('tickets', data.tickets.filter((ticket: any) => ticket.id !== id));
    };

    return (
        <div className="space-y-6">
            <div>
                <h4 className="text-lg font-bold text-white mb-4">{isFundraiser ? 'Donation Tiers' : 'Ticket Options'}</h4>
                <div className="hidden md:flex gap-4 px-2 text-xs font-bold text-neutral-500 uppercase tracking-wider">
                    <div className="flex-grow pl-1">Ticket Name</div>
                    <div className="w-28">{isFundraiser ? 'Suggested' : 'Price'}</div>
                    {isFundraiser && <div className="w-28">Min. Amount</div>}
                    <div className="w-8"></div>
                </div>

                <div className="space-y-3">
                    {data.tickets.map((ticket: any, index: number) => (
                        <div key={ticket.id} className="bg-neutral-800 p-4 md:p-3 rounded-lg border border-neutral-700">
                            <div className="flex flex-col md:flex-row gap-4 md:items-start mb-3">
                                <div className="flex-grow">
                                    <label className="md:hidden text-xs font-bold text-neutral-500 uppercase mb-1.5 block">Ticket Name</label>
                                    <input 
                                        type="text" 
                                        placeholder={isFundraiser ? 'e.g. Art Patron' : 'e.g. General Admission'}
                                        value={ticket.type} 
                                        onChange={e => handleTicketChange(ticket.id, 'type', e.target.value)} 
                                        className="w-full h-10 px-3 bg-neutral-700 border border-neutral-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-purple-500" 
                                    />
                                </div>
                                <div className="flex gap-3">
                                    <div className={`relative ${isFundraiser ? 'w-1/2 md:w-28' : 'w-full md:w-28'}`}>
                                        <label className="md:hidden text-xs font-bold text-neutral-500 uppercase mb-1.5 block">{isFundraiser ? 'Suggested' : 'Price'}</label>
                                        <div className="relative">
                                            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400">$</span>
                                            <input 
                                                type="number" 
                                                value={ticket.price} 
                                                onChange={e => handleTicketChange(ticket.id, 'price', e.target.value)} 
                                                className="w-full h-10 pl-6 pr-2 bg-neutral-700 border border-neutral-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-purple-500 text-right"
                                                step="0.01" min="0"
                                            />
                                        </div>
                                    </div>
                                    {isFundraiser && (
                                        <div className="w-1/2 md:w-28">
                                            <label className="md:hidden text-xs font-bold text-neutral-500 uppercase mb-1.5 block">Min Amt</label>
                                            <div className="relative">
                                                <span className="absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400">$</span>
                                                <input 
                                                    type="number" 
                                                    value={ticket.minimumDonation || ''}
                                                    onChange={e => handleTicketChange(ticket.id, 'minimumDonation', e.target.value)} 
                                                    className="w-full h-10 pl-6 pr-2 bg-neutral-700 border border-neutral-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-purple-500 text-right"
                                                    step="0.01" min="0"
                                                />
                                            </div>
                                        </div>
                                    )}
                                </div>
                                <div className="flex justify-end md:block">
                                    <button onClick={() => removeTicket(ticket.id)} className="w-10 h-10 flex items-center justify-center text-neutral-500 hover:text-red-400 bg-neutral-700/50 md:bg-transparent rounded-md md:rounded-none md:mt-0" disabled={data.tickets.length <= 1}>
                                        <TrashIcon className="w-5 h-5"/>
                                    </button>
                                </div>
                            </div>
                            <div>
                                <label className="md:hidden text-xs font-bold text-neutral-500 uppercase mb-1.5 block">Description (Optional)</label>
                                <input
                                    type="text"
                                    placeholder="Includes skip-the-line access..."
                                    value={ticket.description} 
                                    onChange={e => handleTicketChange(ticket.id, 'description', e.target.value)} 
                                    className="w-full h-10 px-3 bg-neutral-700 border border-neutral-600 rounded-md text-white focus:outline-none focus:ring-2 focus:ring-purple-500 text-sm placeholder-neutral-500" 
                                />
                            </div>
                        </div>
                    ))}
                </div>
                
                <button onClick={addTicket} className="w-full mt-3 px-5 py-3 text-sm font-semibold text-purple-400 hover:text-white transition-colors bg-purple-500/10 hover:bg-purple-500/20 rounded-lg flex items-center justify-center gap-2">
                    <ArrowRightIcon className="w-4 h-4" />
                    Add {isFundraiser ? 'Donation Tier' : 'Ticket Type'}
                </button>
            </div>

            <div className="border-t border-neutral-800 pt-6">
                <h4 className="text-lg font-bold text-white mb-4">Promotion Settings</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-neutral-800/30 p-4 rounded-lg border border-neutral-800">
                    <div>
                        <label className="block text-sm font-medium text-neutral-300 mb-2">Promoter Commission (%)</label>
                        <div className="relative">
                            <input 
                                type="number" 
                                value={data.commission} 
                                onChange={e => onChange('commission', parseFloat(e.target.value))}
                                className="w-full h-12 px-4 bg-neutral-800 border border-neutral-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                                min="0" max="100"
                            />
                            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-neutral-500">%</span>
                        </div>
                        <p className="text-xs text-neutral-500 mt-1">Percentage of ticket sales earned by promoters.</p>
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-neutral-300 mb-2">Customer Discount (%)</label>
                        <div className="relative">
                            <input 
                                type="number" 
                                value={data.defaultPromoDiscount} 
                                onChange={e => onChange('defaultPromoDiscount', parseFloat(e.target.value))}
                                className="w-full h-12 px-4 bg-neutral-800 border border-neutral-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500"
                                min="0" max="100"
                            />
                            <span className="absolute right-4 top-1/2 -translate-y-1/2 text-neutral-500">%</span>
                        </div>
                        <p className="text-xs text-neutral-500 mt-1">Discount for buyers using a promoter link.</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

// Step 5 Component
const Step5Image = ({ data, onChange, isGenerating, setGenerating }: any) => {

    const generate = useCallback(async () => {
        if (data.title) {
            setGenerating(true);
            const imageUrl = await generateEventImage(data.title, data.description || '');
            onChange('imageUrls', [imageUrl]);
            setGenerating(false);
        }
    }, [data.title, data.description, onChange, setGenerating]);
    
    // Generate image when step becomes active
    useEffect(() => {
        // Only generate if image isn't already set from a previous attempt
        if (data.imageUrls[0] === '') {
            generate();
        }
    }, [generate, data.imageUrls]);

    const handleUpload = () => {
        const url = window.prompt("Enter a URL for your event image:", "https://picsum.photos/seed/myevent/1024/768");
        if (url) {
            onChange('imageUrls', [url]);
        }
    };

    return (
        <div>
             <p className="text-neutral-400 text-center mb-4 text-sm">We've generated a poster for you. Tap it to change.</p>
            <div onClick={handleUpload} className="relative aspect-video w-full bg-neutral-800 rounded-lg overflow-hidden cursor-pointer group border-2 border-dashed border-neutral-700 hover:border-purple-500 transition-colors">
                {isGenerating ? (
                    <div className="flex items-center justify-center h-full"><div className="w-8 h-8 border-2 border-white border-t-transparent rounded-full animate-spin"></div><p className="ml-4 text-white">Generating AI Image...</p></div>
                ) : (
                    data.imageUrls[0] && <img src={data.imageUrls[0]} alt="Event Preview" className="w-full h-full object-cover"/>
                )}
                 <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <p className="text-white font-bold">Click to upload custom image</p>
                </div>
            </div>
            <button onClick={generate} disabled={isGenerating} className="w-full mt-4 px-5 py-3 text-sm font-semibold text-purple-400 hover:text-white transition-colors bg-purple-500/10 hover:bg-purple-500/20 rounded-lg disabled:opacity-50 flex items-center justify-center space-x-2">
                <WandSparklesIcon className="w-4 h-4"/>
                <span>Re-generate with AI</span>
            </button>
        </div>
    );
};

export default HostEventFlow;
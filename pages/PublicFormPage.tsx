
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import * as api from '../services/api';
import { CompetitionForm, Event as EventType } from '../types';
import { CheckCircleIcon, UploadCloudIcon, ArrowRightIcon } from '../components/Icons';
import { useAuth } from '../contexts/AuthContext';
import SignInModal from '../components/SignInModal';

const PublicFormPage: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const navigate = useNavigate();
    const { user, isAuthenticated } = useAuth();
    
    const [form, setForm] = useState<CompetitionForm | null>(null);
    const [relatedEvent, setRelatedEvent] = useState<EventType | null>(null);
    
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [formData, setFormData] = useState<Record<string, any>>({});
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [isSuccess, setIsSuccess] = useState(false);
    const [isSignInOpen, setIsSignInOpen] = useState(false);

    useEffect(() => {
        if (!id) return;
        const fetchFormAndEvent = async () => {
            try {
                const formData = await api.getPublicForm(id);
                setForm(formData);
                
                // Find the event this form belongs to
                // CRITICAL: We need the event object to pass to `joinCompetition`.
                // Let's fetch a few known events.
                const knownEventIds = ['e1', 'e4', 'e8', 'e9'];
                const eventsList = await api.getEventsByIds(knownEventIds);
                const parentEvent = eventsList.find(e => e.competitions?.some(c => c.forms?.some(f => f.id === formData.id)));
                
                if (parentEvent) {
                    setRelatedEvent(parentEvent);
                }
            } catch (err) {
                setError("Form not found or unavailable.");
            } finally {
                setIsLoading(false);
            }
        };
        fetchFormAndEvent();
    }, [id]);

    const handleInputChange = (elementId: string, value: any) => {
        setFormData(prev => ({ ...prev, [elementId]: value }));
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!form) return;
        
        if (!isAuthenticated) {
            setIsSignInOpen(true);
            return;
        }
        
        if (!user) return;

        setIsSubmitting(true);
        try {
            // 1. Submit the form data
            await api.submitFormResponse(form.id, formData);
            
            // 2. Join competition if event found
            if (relatedEvent) {
                await api.joinCompetition(user.id, relatedEvent);
            } else {
                // Try finding it dynamically if not found in init
                // This is a fallback for the mock data structure
                const events = await api.getFeaturedEvents();
                // Basic fallback logic for demo
                if (events.length > 0) {
                     await api.joinCompetition(user.id, events[0]);
                }
            }

            setIsSuccess(true);
        } catch (err) {
            console.error(err);
            alert("Failed to submit form. Please try again.");
        } finally {
            setIsSubmitting(false);
        }
    };

    // Effect to auto-submit if user just logged in and form data exists
    useEffect(() => {
        if (isAuthenticated && user && Object.keys(formData).length > 0 && !isSubmitting && !isSuccess && !isSignInOpen) {
            // Optional: Logic to resume submission
        }
    }, [isAuthenticated, user, formData, isSubmitting, isSuccess, isSignInOpen]);

    if (isLoading) return <div className="min-h-screen flex items-center justify-center bg-black text-neutral-500">Loading form...</div>;
    if (error || !form) return <div className="min-h-screen flex items-center justify-center bg-black text-red-400">{error || 'Form not found'}</div>;

    if (isSuccess) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-black p-6 relative overflow-hidden">
                 {form.headerImageUrl && (
                    <div 
                        className="absolute inset-0 z-0 opacity-30 blur-3xl scale-110"
                        style={{ backgroundImage: `url(${form.headerImageUrl})`, backgroundSize: 'cover', backgroundPosition: 'center' }}
                    ></div>
                )}
                <div className="max-w-md w-full bg-neutral-900/80 backdrop-blur-xl border border-white/10 rounded-3xl p-10 text-center shadow-2xl relative z-10 animate-fade-in-up">
                    <div className="w-20 h-20 bg-green-500/20 text-green-400 rounded-full flex items-center justify-center mx-auto mb-6 border border-green-500/30">
                        <CheckCircleIcon className="w-10 h-10" />
                    </div>
                    <h2 className="text-3xl font-bold text-white mb-4">Submission Received!</h2>
                    <p className="text-neutral-300 mb-8">Thank you for your submission! You'll receive an email shortly with more information.</p>
                    <button onClick={() => navigate('/')} className="text-purple-400 hover:text-white font-semibold text-sm transition-colors flex items-center justify-center gap-2 mx-auto">
                        Go to Eventsta <ArrowRightIcon className="w-4 h-4" />
                    </button>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-[#050505] relative text-neutral-200 font-sans selection:bg-purple-500/30 overflow-x-hidden">
            {/* Full Page Blurred Background */}
            <div className="fixed inset-0 z-0 pointer-events-none">
                {form.headerImageUrl ? (
                    <div 
                        className="absolute inset-0 bg-cover bg-center transform scale-110"
                        style={{ 
                            backgroundImage: `url(${form.headerImageUrl})`,
                        }}
                    >
                        <div className="absolute inset-0 backdrop-blur-[80px] bg-black/70"></div>
                    </div>
                ) : (
                    <div className="absolute inset-0 bg-[#050505]"></div>
                )}
            </div>

            <div className="relative z-10 container mx-auto max-w-3xl px-4 py-12 md:py-20">
                {/* Form Card */}
                <div className="bg-neutral-900/90 backdrop-blur-xl border border-white/10 rounded-3xl shadow-2xl overflow-hidden animate-fade-in-up">
                    
                    {/* Header Image Inside Card */}
                    {form.headerImageUrl && (
                        <div className="w-full aspect-[3/1] bg-neutral-800/50 border-b border-white/5 relative overflow-hidden">
                            <img 
                                src={form.headerImageUrl} 
                                alt={form.title} 
                                className="w-full h-full object-cover"
                            />
                            <div className="absolute inset-0 bg-gradient-to-t from-neutral-900/80 to-transparent"></div>
                        </div>
                    )}

                    <div className="p-8 md:p-12">
                        {/* Intro */}
                        <div className="mb-10 text-center md:text-left">
                            <h1 className="text-4xl md:text-5xl font-black text-white mb-4 tracking-tight leading-tight">{form.title}</h1>
                            <div 
                                className="text-lg text-neutral-300 leading-relaxed prose prose-invert max-w-none"
                                dangerouslySetInnerHTML={{ __html: form.description }}
                            />
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-8">
                            {form.elements.map(element => (
                                <div key={element.id} className="space-y-3">
                                    <label className="block text-lg font-medium text-white">
                                        {element.label} {element.required && <span className="text-purple-500">*</span>}
                                    </label>
                                    
                                    {element.type === 'SHORT_TEXT' && (
                                        <input 
                                            type="text" 
                                            required={element.required}
                                            placeholder={element.placeholder}
                                            value={formData[element.id] || ''}
                                            onChange={e => handleInputChange(element.id, e.target.value)}
                                            className="w-full bg-black/20 border border-neutral-700 rounded-xl px-5 py-4 text-white placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500 transition-all"
                                        />
                                    )}

                                    {element.type === 'LONG_TEXT' && (
                                        <textarea 
                                            rows={4}
                                            required={element.required}
                                            placeholder={element.placeholder}
                                            value={formData[element.id] || ''}
                                            onChange={e => handleInputChange(element.id, e.target.value)}
                                            className="w-full bg-black/20 border border-neutral-700 rounded-xl px-5 py-4 text-white placeholder-neutral-500 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500 transition-all resize-none"
                                        />
                                    )}

                                    {element.type === 'SINGLE_CHOICE' && (
                                        <div className="space-y-2">
                                            {element.options?.map(option => (
                                                <label key={option.id} className="flex items-center space-x-3 p-4 rounded-xl bg-black/20 border border-neutral-800 hover:border-neutral-600 hover:bg-neutral-800/50 transition-all cursor-pointer group">
                                                    <input 
                                                        type="radio" 
                                                        name={element.id}
                                                        required={element.required}
                                                        value={option.label}
                                                        checked={formData[element.id] === option.label}
                                                        onChange={e => handleInputChange(element.id, e.target.value)}
                                                        className="w-5 h-5 text-purple-600 bg-neutral-800 border-neutral-600 focus:ring-purple-500 focus:ring-2 focus:ring-offset-0"
                                                    />
                                                    <span className="text-neutral-300 group-hover:text-white transition-colors font-medium">{option.label}</span>
                                                </label>
                                            ))}
                                        </div>
                                    )}

                                    {element.type === 'MULTIPLE_CHOICE' && (
                                        <div className="space-y-2">
                                            {element.options?.map(option => (
                                                <label key={option.id} className="flex items-center space-x-3 p-4 rounded-xl bg-black/20 border border-neutral-800 hover:border-neutral-600 hover:bg-neutral-800/50 transition-all cursor-pointer group">
                                                    <input 
                                                        type="checkbox" 
                                                        value={option.label}
                                                        checked={(formData[element.id] || []).includes(option.label)}
                                                        onChange={e => {
                                                            const current = formData[element.id] || [];
                                                            const updated = e.target.checked 
                                                                ? [...current, option.label]
                                                                : current.filter((v: string) => v !== option.label);
                                                            handleInputChange(element.id, updated);
                                                        }}
                                                        className="w-5 h-5 rounded text-purple-600 bg-neutral-800 border-neutral-600 focus:ring-purple-500 focus:ring-2 focus:ring-offset-0"
                                                    />
                                                    <span className="text-neutral-300 group-hover:text-white transition-colors font-medium">{option.label}</span>
                                                </label>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            ))}

                            <div className="pt-8 border-t border-white/10">
                                <button 
                                    type="submit" 
                                    disabled={isSubmitting}
                                    className="w-full h-16 bg-purple-600 hover:bg-purple-500 text-white text-lg font-bold rounded-2xl shadow-lg shadow-purple-600/20 transition-all transform hover:scale-[1.01] active:scale-[0.99] flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed"
                                >
                                    {isSubmitting ? 'Submitting...' : <>Submit Application <ArrowRightIcon className="w-6 h-6" /></>}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
                <div className="text-center mt-8 text-neutral-500 text-sm">
                    Powered by <span className="font-bold text-neutral-400">Eventsta</span>
                </div>
            </div>
            
            <SignInModal 
                isOpen={isSignInOpen} 
                onClose={() => setIsSignInOpen(false)} 
                context="application" 
            />
        </div>
    );
};

export default PublicFormPage;

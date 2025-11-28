
import React, { useState, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import * as api from '../../services/api';
import { Event as EventType, CompetitionForm } from '../../types';
import { PlusIcon, EyeIcon, EditIcon, LinkIcon, CheckCircleIcon, BarChartIcon, FileText, SettingsIcon } from '../Icons';
import FormBuilder from '../FormBuilder';
import FormResponsesView from './FormResponsesView';
import Modal from '../Modal';

const FormsTab: React.FC<{ event: EventType, onEventUpdate: () => void }> = ({ event, onEventUpdate }) => {
    const { user } = useAuth();
    const [view, setView] = useState<'list' | 'builder' | 'responses'>('list');
    const [selectedFormId, setSelectedFormId] = useState<string | null>(null);
    const [copiedFormId, setCopiedFormId] = useState<string | null>(null);
    const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
    const [settingsForm, setSettingsForm] = useState<CompetitionForm | null>(null);
    
    // State to hold verified counts fetched directly from the responses endpoint
    const [realtimeCounts, setRealtimeCounts] = useState<Record<string, number>>({});

    const forms = event.forms || [];

    // Fetch verified counts on mount or when forms change
    useEffect(() => {
        let isMounted = true;
        const fetchCounts = async () => {
            if (forms.length === 0) return;
            
            await Promise.all(forms.map(async (form) => {
                try {
                    // Fetch actual responses to get accurate count
                    const responses = await api.getFormResponses(form.id);
                    if (isMounted) {
                        setRealtimeCounts(prev => ({
                            ...prev,
                            [form.id]: responses.length
                        }));
                    }
                } catch (e) {
                    console.warn(`Failed to fetch count for form ${form.id}`, e);
                }
            }));
        };

        fetchCounts();
        return () => { isMounted = false; };
    }, [forms]);

    const handleSaveForm = async (form: CompetitionForm) => {
        if (!user) return;
        const formIndex = forms.findIndex(f => f.id === form.id);
        let newForms;
        if (formIndex > -1) {
            newForms = forms.map(f => f.id === form.id ? form : f);
        } else {
            newForms = [...forms, form];
        }
        try {
            await api.updateEvent(user.id, event.id, { forms: newForms });
            onEventUpdate();
            setView('list');
        } catch (error) {
            console.error("Failed to save form", error);
        }
    };

    const handleCreateForm = () => {
        setSelectedFormId(null);
        setView('builder');
    };

    const handleEditForm = (id: string) => {
        setSelectedFormId(id);
        setView('builder');
    };

    const handleViewResponses = (id: string) => {
        setSelectedFormId(id);
        setView('responses');
    };

    const handleCopyLink = (formId: string) => {
        const url = `${window.location.origin}/#/form/${formId}`;
        navigator.clipboard.writeText(url);
        setCopiedFormId(formId);
        setTimeout(() => setCopiedFormId(null), 2000);
    };

    const handleOpenSettings = (form: CompetitionForm) => {
        setSettingsForm(form);
        setIsSettingsModalOpen(true);
    };

    const handleSaveSettings = async (updatedForm: CompetitionForm) => {
        await handleSaveForm(updatedForm);
        setIsSettingsModalOpen(false);
    };

    if (view === 'builder') {
        const formToEdit = forms.find(f => f.id === selectedFormId) || {
            id: uuidv4(),
            title: 'New Form',
            description: 'Description here...',
            elements: [],
            isActive: true,
            responsesCount: 0,
            lastUpdated: new Date().toISOString(),
            linkedCompetitionId: undefined
        } as CompetitionForm;

        return (
            <FormBuilder 
                form={formToEdit} 
                onSave={handleSaveForm} 
                onCancel={() => setView('list')} 
            />
        );
    }

    if (view === 'responses' && selectedFormId) {
        const form = forms.find(f => f.id === selectedFormId);
        if (!form) return <div>Form not found</div>;
        return <FormResponsesView form={form} onBack={() => setView('list')} />;
    }

    return (
        <div className="space-y-8">
            <div className="flex justify-between items-center">
                <div className="flex flex-col">
                    <h2 className="text-2xl font-bold text-white">Marketing Forms</h2>
                    <p className="text-sm text-neutral-400">Create forms for competition signups, surveys, or newsletters.</p>
                </div>
                <button onClick={handleCreateForm} className="px-5 py-2 bg-purple-600 text-white text-sm font-semibold rounded-full hover:bg-purple-500 flex items-center gap-2">
                    <PlusIcon className="w-4 h-4" /> Create Form
                </button>
            </div>

            {forms.length === 0 ? (
                <div className="text-center py-16 bg-neutral-900/50 border-2 border-dashed border-neutral-800 rounded-2xl">
                    <FileText className="w-12 h-12 mx-auto text-neutral-600 mb-4" />
                    <h3 className="text-xl font-bold text-white">No Forms Created</h3>
                    <p className="text-neutral-500 mt-2 mb-6">Start collecting data from your audience.</p>
                </div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {forms.map(form => (
                        <div key={form.id} className="bg-neutral-900 border border-neutral-800 rounded-xl overflow-hidden group hover:border-purple-500/50 transition-all flex flex-col">
                            <div 
                                className="h-32 bg-neutral-800 relative flex-shrink-0 cursor-pointer" 
                                onClick={() => handleEditForm(form.id)}
                            >
                                {form.headerImageUrl && (
                                    <img src={form.headerImageUrl} alt="" className="w-full h-full object-cover opacity-60 group-hover:opacity-100 transition-opacity" />
                                )}
                                <div className="absolute top-3 right-3 pointer-events-none">
                                    <span className={`px-2 py-1 rounded text-xs font-bold bg-black/50 backdrop-blur-md text-white`}>
                                        {form.isActive ? 'Active' : 'Draft'}
                                    </span>
                                </div>
                            </div>
                            <div className="p-5 flex-grow flex flex-col">
                                <div className="flex justify-between items-start mb-2">
                                    <h4 className="font-bold text-white text-lg truncate cursor-pointer hover:text-purple-400 transition-colors" onClick={() => handleEditForm(form.id)} title={form.title}>{form.title}</h4>
                                    <button onClick={() => handleOpenSettings(form)} className="text-neutral-500 hover:text-white p-1 rounded hover:bg-neutral-800 transition-colors">
                                        <SettingsIcon className="w-4 h-4" />
                                    </button>
                                </div>
                                <p className="text-xs text-neutral-400 mb-4">Updated {new Date(form.lastUpdated).toLocaleDateString()}</p>
                                
                                {form.linkedCompetitionId && (
                                    <div className="mb-4">
                                        <span className="text-[10px] uppercase font-bold text-purple-400 tracking-wider block mb-1">Linked Competition</span>
                                        <span className="text-xs text-neutral-300 bg-purple-900/30 px-2 py-1 rounded border border-purple-500/20 block truncate">
                                            {event.competitions?.find(c => c.id === form.linkedCompetitionId)?.name || 'Unknown Competition'}
                                        </span>
                                    </div>
                                )}

                                <div className="mt-auto pt-3 border-t border-neutral-800 flex justify-between items-center">
                                    <button onClick={() => handleViewResponses(form.id)} className="flex items-center gap-1.5 text-sm text-neutral-300 hover:text-white transition-colors">
                                        <BarChartIcon className="w-4 h-4 text-neutral-500" />
                                        {/* Use realtime count if available, otherwise fallback to stored count */}
                                        <span>{realtimeCounts[form.id] !== undefined ? realtimeCounts[form.id] : form.responsesCount} Responses</span>
                                    </button>
                                </div>
                            </div>
                            <div className="bg-neutral-950 p-2 grid grid-cols-3 gap-1 border-t border-neutral-800">
                                <button 
                                    onClick={() => handleEditForm(form.id)} 
                                    className="flex items-center justify-center gap-2 py-2 text-xs font-medium text-neutral-400 hover:text-white hover:bg-neutral-800 rounded transition-colors"
                                >
                                    <EditIcon className="w-3.5 h-3.5" />
                                    <span>Edit</span>
                                </button>
                                <Link 
                                    to={`/form/${form.id}`} 
                                    className="flex items-center justify-center gap-2 py-2 text-xs font-medium text-neutral-400 hover:text-white hover:bg-neutral-800 rounded transition-colors"
                                >
                                    <EyeIcon className="w-3.5 h-3.5" />
                                    <span>View</span>
                                </Link>
                                <button 
                                    onClick={() => handleCopyLink(form.id)} 
                                    className={`flex items-center justify-center gap-2 py-2 text-xs font-medium rounded transition-colors ${copiedFormId === form.id ? 'text-green-400 bg-green-500/10' : 'text-neutral-400 hover:text-white hover:bg-neutral-800'}`}
                                >
                                    {copiedFormId === form.id ? <CheckCircleIcon className="w-3.5 h-3.5" /> : <LinkIcon className="w-3.5 h-3.5" />}
                                    <span>{copiedFormId === form.id ? 'Copied' : 'Copy Link'}</span>
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {settingsForm && (
                <FormSettingsModal 
                    isOpen={isSettingsModalOpen} 
                    onClose={() => setIsSettingsModalOpen(false)} 
                    form={settingsForm} 
                    event={event}
                    onSave={handleSaveSettings}
                />
            )}
        </div>
    );
};

const FormSettingsModal: React.FC<{ 
    isOpen: boolean, 
    onClose: () => void, 
    form: CompetitionForm, 
    event: EventType,
    onSave: (form: CompetitionForm) => void
}> = ({ isOpen, onClose, form, event, onSave }) => {
    const [settings, setSettings] = useState({
        title: form.title,
        isActive: form.isActive,
        linkedCompetitionId: form.linkedCompetitionId || ''
    });

    const handleSave = () => {
        onSave({
            ...form,
            title: settings.title,
            isActive: settings.isActive,
            linkedCompetitionId: settings.linkedCompetitionId || undefined
        });
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose}>
            <div className="w-full max-w-md bg-neutral-900 border border-neutral-800 rounded-2xl shadow-2xl p-6">
                <h3 className="text-xl font-bold text-white mb-6">Form Settings</h3>
                
                <div className="space-y-4">
                    <div>
                        <label className="block text-sm font-medium text-neutral-300 mb-2">Form Title</label>
                        <input 
                            type="text" 
                            value={settings.title} 
                            onChange={e => setSettings({...settings, title: e.target.value})}
                            className="w-full h-10 px-3 bg-neutral-800 border border-neutral-700 rounded-lg text-white focus:border-purple-500 outline-none"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-neutral-300 mb-2">Link to Competition</label>
                        <p className="text-xs text-neutral-500 mb-2">If selected, form submissions will automatically join the user to this competition.</p>
                        <select 
                            value={settings.linkedCompetitionId} 
                            onChange={e => setSettings({...settings, linkedCompetitionId: e.target.value})}
                            className="w-full h-10 px-3 bg-neutral-800 border border-neutral-700 rounded-lg text-white focus:border-purple-500 outline-none"
                        >
                            <option value="">-- No Competition (Info Only) --</option>
                            {event.competitions?.map(comp => (
                                <option key={comp.id} value={comp.id}>{comp.name}</option>
                            ))}
                        </select>
                    </div>

                    <div className="flex items-center justify-between pt-2">
                        <span className="text-sm font-medium text-neutral-300">Form Status</span>
                        <button 
                            onClick={() => setSettings({...settings, isActive: !settings.isActive})}
                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${settings.isActive ? 'bg-green-500' : 'bg-neutral-700'}`}
                        >
                            <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${settings.isActive ? 'translate-x-6' : 'translate-x-1'}`} />
                        </button>
                    </div>
                </div>

                <div className="mt-8 flex justify-end gap-3">
                    <button onClick={onClose} className="px-4 py-2 text-sm text-neutral-300 hover:text-white">Cancel</button>
                    <button onClick={handleSave} className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white text-sm font-bold rounded-lg">Save Settings</button>
                </div>
            </div>
        </Modal>
    );
};

export default FormsTab;

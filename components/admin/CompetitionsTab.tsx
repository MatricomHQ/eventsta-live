
import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { v4 as uuidv4 } from 'uuid';
import { Link } from 'react-router-dom';
import { useAuth } from '../../contexts/AuthContext';
import * as api from '../../services/api';
import { Event as EventType, Competition, User, LeaderboardEntry } from '../../types';
import { PlusIcon, MegaphoneIcon, TrashIcon, ArrowLeftIcon, UsersIcon, StopCircleIcon, ShieldIcon, EditIcon, RefreshCwIcon } from '../Icons';
import Modal from '../Modal';

const CompetitionsTab: React.FC<{ event: EventType, onEventUpdate: () => void }> = ({ event, onEventUpdate }) => {
    const { user } = useAuth();
    const [view, setView] = useState<'list' | 'dashboard'>('list');
    const [selectedCompetitionId, setSelectedCompetitionId] = useState<string | null>(null);
    const [isEditorOpen, setIsEditorOpen] = useState(false);
    const [editingCompetition, setEditingCompetition] = useState<Competition | null>(null);

    const competitions = event.competitions || [];
    const sections = event.venueAreas || [];

    const handleSaveCompetition = async (competitionData: Competition) => {
        if (!user) return;
        const index = competitions.findIndex(c => c.id === competitionData.id);
        let newCompetitions;
        if (index > -1) {
            newCompetitions = competitions.map(c => c.id === competitionData.id ? competitionData : c);
        } else {
            newCompetitions = [...competitions, competitionData];
        }
        try {
            await api.updateEvent(user.id, event.id, { competitions: newCompetitions });
            onEventUpdate();
            setIsEditorOpen(false);
            setEditingCompetition(null);
        } catch (error) {
            console.error("Failed to save competition", error);
        }
    };

    const handleFinalizeCompetition = async (compId: string) => {
        if (!user) return;
        try {
            await api.finalizeCompetition(user.id, event.id, compId);
            onEventUpdate();
        } catch (error) {
            console.error("Failed to finalize", error);
            alert("Failed to finalize competition.");
        }
    };

    const openCreateModal = () => {
        setEditingCompetition(null);
        setIsEditorOpen(true);
    };

    const openEditModal = (comp: Competition) => {
        setEditingCompetition(comp);
        setIsEditorOpen(true);
    };

    const renderContent = () => {
        if (view === 'dashboard' && selectedCompetitionId) {
            const comp = competitions.find(c => c.id === selectedCompetitionId);
            if (!comp) return <div className="text-white">Competition not found.</div>;
    
            return (
                <CompetitionDashboard 
                    competition={comp} 
                    event={event}
                    onBack={() => setView('list')}
                    onFinalize={handleFinalizeCompetition}
                    onEdit={() => openEditModal(comp)}
                />
            );
        }

        return (
            <div className="space-y-8">
                <div className="flex justify-between items-center">
                    <div className="flex flex-col">
                        <h2 className="text-2xl font-bold text-white">Competitions</h2>
                        <p className="text-sm text-neutral-400">Create ticket sales competitions for DJs and Promoters.</p>
                    </div>
                    <button onClick={openCreateModal} className="px-5 py-2 bg-purple-600 text-white text-sm font-semibold rounded-full hover:bg-purple-500 flex items-center gap-2">
                        <PlusIcon className="w-4 h-4" /> Create Competition
                    </button>
                </div>
    
                {competitions.length === 0 ? (
                    <div className="text-center py-16 bg-neutral-900/50 border-2 border-dashed border-neutral-800 rounded-2xl">
                        <MegaphoneIcon className="w-12 h-12 mx-auto text-neutral-600 mb-4" />
                        <h3 className="text-xl font-bold text-white">No Competitions Yet</h3>
                        <p className="text-neutral-500 mt-2 mb-6">Create a competition to drive engagement and ticket sales.</p>
                    </div>
                ) : (
                    <div className="grid grid-cols-1 gap-4">
                        {competitions.map(comp => (
                            <div key={comp.id} className="bg-neutral-900 border border-neutral-800 rounded-xl p-6 flex items-center justify-between group hover:border-purple-500/50 transition-colors">
                                <div>
                                    <h3 className="text-xl font-bold text-white mb-1">{comp.name}</h3>
                                    <div className="flex items-center gap-3 text-sm text-neutral-400">
                                        <span className={`px-2 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider ${
                                            comp.status === 'ACTIVE' ? 'bg-green-900/30 text-green-400' : 'bg-neutral-800 text-neutral-500'
                                        }`}>{comp.status}</span>
                                        <span>{comp.competitorIds.length} Competitors</span>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <button onClick={() => openEditModal(comp)} className="p-2 text-neutral-400 hover:text-white bg-neutral-800 hover:bg-neutral-700 rounded-lg transition-colors" title="Edit Details">
                                        <EditIcon className="w-4 h-4" />
                                    </button>
                                    <button onClick={() => { setSelectedCompetitionId(comp.id); setView('dashboard'); }} className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-white rounded-lg text-sm font-medium transition-colors">
                                        Manage
                                    </button>
                                </div>
                            </div>
                        ))}
                    </div>
                )}
            </div>
        );
    };

    return (
        <>
            {renderContent()}
            <CompetitionEditorModal 
                isOpen={isEditorOpen}
                onClose={() => setIsEditorOpen(false)}
                onSave={handleSaveCompetition}
                event={event}
                competition={editingCompetition}
                defaultSectionId={sections[0]?.id || null}
            />
        </>
    );
};

const CompetitionDashboard: React.FC<{ 
    competition: Competition, 
    event: EventType, 
    onBack: () => void,
    onFinalize: (id: string) => void,
    onEdit: () => void
}> = ({ competition, event, onBack, onFinalize, onEdit }) => {
    const [isFinalizeModalOpen, setIsFinalizeModalOpen] = useState(false);

    const confirmFinalize = () => {
        onFinalize(competition.id);
        setIsFinalizeModalOpen(false);
    };

    return (
        <div className="space-y-6 animate-fade-in">
            <button onClick={onBack} className="flex items-center text-sm text-neutral-400 hover:text-white mb-4">
                <ArrowLeftIcon className="w-4 h-4 mr-2" /> Back to List
            </button>

            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <h2 className="text-3xl font-bold text-white">{competition.name} <span className="text-neutral-500 text-lg font-normal">/ Dashboard</span></h2>
                
                <div className="flex items-center gap-4">
                    <button 
                        onClick={onEdit}
                        className="px-4 py-2 bg-neutral-800 hover:bg-neutral-700 text-white rounded-lg text-sm font-semibold flex items-center gap-2 transition-colors"
                    >
                        <EditIcon className="w-4 h-4" /> Edit Details
                    </button>

                    {competition.status === 'ACTIVE' && (
                        <button 
                            onClick={() => setIsFinalizeModalOpen(true)} 
                            className="px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 rounded-lg text-sm font-semibold flex items-center gap-2 transition-colors"
                        >
                            <StopCircleIcon className="w-4 h-4" />
                            End Competition
                        </button>
                    )}
                </div>
            </div>

            <div className="space-y-8">
                <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-8">
                    <h3 className="text-xl font-bold text-white mb-4">Competition Settings</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-neutral-300">
                        <div>
                            <p className="text-xs text-neutral-500 uppercase mb-1">Description</p>
                            <p>{competition.description}</p>
                        </div>
                        <div>
                            <p className="text-xs text-neutral-500 uppercase mb-1">Status</p>
                            <span className={`px-2 py-1 rounded text-white text-sm font-bold uppercase tracking-wide ${
                                competition.status === 'ACTIVE' ? 'bg-green-600/20 text-green-400' : 
                                competition.status === 'COMPLETED' ? 'bg-blue-600/20 text-blue-400' : 
                                'bg-neutral-800 text-neutral-400'
                            }`}>{competition.status}</span>
                        </div>
                    </div>
                </div>
                
                <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-8">
                    <ApplicantsListView competition={competition} eventId={event.id} />
                </div>
            </div>

            <Modal isOpen={isFinalizeModalOpen} onClose={() => setIsFinalizeModalOpen(false)}>
                <div className="w-full max-w-md bg-neutral-900 border border-neutral-800 rounded-2xl shadow-2xl p-8 text-center">
                    <div className="w-16 h-16 bg-red-500/10 rounded-full flex items-center justify-center mx-auto mb-6 border border-red-500/20">
                        <ShieldIcon className="w-8 h-8 text-red-500" />
                    </div>
                    <h3 className="text-2xl font-bold text-white mb-3">End Competition?</h3>
                    <p className="text-neutral-400 text-sm mb-6 leading-relaxed">
                        Are you sure you want to end this competition? <br/><br/>
                        <span className="text-red-400 font-bold">This action is irreversible.</span>
                        <br/>
                        The current leaderboard standings will be finalized, winners will be permanently recorded, and the event schedule will be automatically updated with the winning acts.
                    </p>
                    <div className="flex gap-4 justify-center">
                        <button 
                            onClick={() => setIsFinalizeModalOpen(false)}
                            className="px-6 py-3 text-sm font-semibold text-neutral-300 bg-neutral-800 hover:bg-neutral-700 rounded-full transition-colors"
                        >
                            Cancel
                        </button>
                        <button 
                            onClick={confirmFinalize}
                            className="px-6 py-3 bg-red-600 hover:bg-red-500 text-white text-sm font-bold rounded-full shadow-lg shadow-red-900/20 transition-colors"
                        >
                            Confirm & End
                        </button>
                    </div>
                </div>
            </Modal>
        </div>
    );
};

// --- Component for Applicants / Competitors ---
const ApplicantsListView: React.FC<{ competition: Competition, eventId: string }> = ({ competition, eventId }) => {
    const [applicants, setApplicants] = useState<User[]>([]);
    const [loading, setLoading] = useState(true);
    const [leaderboardData, setLeaderboardData] = useState<Record<string, LeaderboardEntry>>({});

    const fetchData = useCallback(async () => {
        setLoading(true);
        try {
            // 1. Fetch Leaderboard Stats first (they contain all necessary competitor info)
            const stats = await api.getCompetitionLeaderboard(eventId);
            const statsMap: Record<string, LeaderboardEntry> = {};
            const leaderboardUserIds: string[] = [];
            stats.forEach(entry => {
                statsMap[entry.userId] = entry;
                leaderboardUserIds.push(entry.userId);
            });
            setLeaderboardData(statsMap);

            // 2. Fetch Users based on a union of the official competitor list AND anyone who shows up in the leaderboard
            // This handles cases where data might be out of sync (e.g. user in leaderboard but not in competitor list)
            // Use Set to remove duplicates
            const idsToFetch = Array.from(new Set([
                ...(competition.competitorIds || []), 
                ...leaderboardUserIds
            ]));

            if (idsToFetch.length > 0) {
                const users = await api.getUsersByIds(idsToFetch);
                setApplicants(users);
            } else {
                setApplicants([]);
            }

        } catch (e) {
            console.error("Failed to load applicants", e);
        } finally {
            setLoading(false);
        }
    }, [competition.competitorIds, eventId]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    const sortedApplicants = useMemo(() => {
        return [...applicants].sort((a, b) => {
            const salesA = leaderboardData[a.id]?.salesValue || 0;
            const salesB = leaderboardData[b.id]?.salesValue || 0;
            return salesB - salesA; // Descending order
        });
    }, [applicants, leaderboardData]);

    return (
        <div className="overflow-hidden">
            <div className="flex justify-between items-center mb-6">
                <h3 className="text-xl font-bold text-white">Competitor Leaderboard</h3>
                <button 
                    onClick={fetchData} 
                    className="p-2 bg-neutral-800 hover:bg-neutral-700 text-neutral-400 hover:text-white rounded-lg transition-colors"
                    title="Refresh List"
                >
                    <RefreshCwIcon className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                </button>
            </div>

            {loading ? (
                <div className="text-center py-12 text-neutral-500">Loading competitors...</div>
            ) : applicants.length === 0 ? (
                <div className="text-center py-16">
                    <UsersIcon className="w-12 h-12 mx-auto text-neutral-600 mb-4" />
                    <h3 className="text-xl font-bold text-white">No Competitors Yet</h3>
                    <p className="text-neutral-500 mt-2">Share your form link to start getting submissions.</p>
                </div>
            ) : (
                <table className="w-full text-sm text-left text-neutral-300">
                    <thead className="text-xs text-neutral-400 uppercase bg-neutral-950/30 border-b border-neutral-800">
                        <tr>
                            <th className="px-6 py-4 text-center">Referrals</th>
                            <th className="px-6 py-4">Competitor</th>
                            <th className="hidden md:table-cell px-6 py-4 text-right">Sales</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-neutral-800">
                        {sortedApplicants.map((applicant, index) => {
                            const stats = leaderboardData[applicant.id];
                            const rank = index + 1;
                            return (
                                <tr key={applicant.id} className="hover:bg-neutral-800/30">
                                    <td className="px-6 py-4 text-center">
                                        {stats ? stats.salesCount : 0}
                                    </td>
                                    <td className="px-6 py-4 font-medium text-white flex items-center gap-3">
                                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                                            rank === 1 ? 'bg-yellow-500/20 text-yellow-400 border border-yellow-500/30' : 
                                            rank === 2 ? 'bg-gray-400/20 text-gray-300 border border-gray-400/30' :
                                            rank === 3 ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30' :
                                            'bg-neutral-800 text-neutral-500'
                                        }`}>
                                            {applicant.name.charAt(0)}
                                        </div>
                                        {applicant.name}
                                    </td>
                                    <td className="hidden md:table-cell px-6 py-4 text-right font-mono text-purple-400 font-bold">
                                        ${stats ? stats.salesValue.toFixed(2) : '0.00'}
                                    </td>
                                </tr>
                            );
                        })}
                    </tbody>
                </table>
            )}
        </div>
    );
};

const CompetitionEditorModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    onSave: (competition: Competition) => void;
    event: EventType;
    competition: Competition | null;
    defaultSectionId: string | null;
}> = ({ isOpen, onClose, onSave, event, competition, defaultSectionId }) => {

    const getInitialState = useCallback(() => ({
        id: competition?.id || `comp-${uuidv4()}`,
        type: 'DJ_TICKET_SALES' as const,
        status: competition?.status || 'SETUP',
        name: competition?.name || '',
        description: competition?.description || '',
        startDate: competition?.startDate || new Date().toISOString(),
        cutoffDate: competition?.cutoffDate || event.date,
        promoDiscountPercent: competition?.promoDiscountPercent ?? 10,
        commissionPercent: competition?.commissionPercent ?? 10, // NEW
        sectionIds: competition?.sectionIds || (defaultSectionId ? [defaultSectionId] : []),
        competitorIds: competition?.competitorIds || [],
    }), [competition, event.date, defaultSectionId]);
    
    const [compData, setCompData] = useState<Omit<Competition, 'winnerIds' | 'forms'>>(getInitialState);

    useEffect(() => {
        if (isOpen) {
            setCompData(getInitialState());
        }
    }, [isOpen, getInitialState]);

    const handleSave = () => {
        onSave(compData as Competition);
    };
    
    const handleSectionToggle = (sectionId: string) => {
        setCompData(prev => {
            const newSectionIds = prev.sectionIds.includes(sectionId)
                ? prev.sectionIds.filter(id => id !== sectionId)
                : [...prev.sectionIds, sectionId];
            return { ...prev, sectionIds: newSectionIds };
        });
    };

    const dateTimeLocalValue = (dateString: string) => {
        if (!dateString) return '';
        const date = new Date(dateString);
        date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
        return date.toISOString().slice(0, 16);
    }
    
    return (
        <Modal isOpen={isOpen} onClose={onClose}>
            <div className="w-full max-w-2xl bg-neutral-900 border border-neutral-800 rounded-2xl shadow-2xl max-h-[90vh] flex flex-col">
                <div className="p-8 border-b border-neutral-800">
                    <h2 className="text-2xl font-bold text-white">{competition ? 'Edit Competition' : 'Create Competition'}</h2>
                    <p className="text-neutral-400">Configure the competition details for your event.</p>
                </div>

                <div className="p-8 space-y-6 overflow-y-auto">
                    <div>
                        <label className="block text-sm font-medium text-neutral-300 mb-2">Competition Name</label>
                        <input type="text" value={compData.name} onChange={e => setCompData({...compData, name: e.target.value})} placeholder="e.g., Main Stage DJ Battle" className="w-full h-12 px-4 bg-neutral-800 border border-neutral-700 rounded-lg text-white" />
                    </div>
                    <div>
                        <label className="block text-sm font-medium text-neutral-300 mb-2">Description</label>
                        <textarea value={compData.description} onChange={e => setCompData({...compData, description: e.target.value})} rows={3} className="w-full p-4 bg-neutral-800 border border-neutral-700 rounded-lg text-white resize-none" />
                    </div>
                     <div>
                        <label className="block text-sm font-medium text-neutral-300 mb-2">Sales Tracking Cutoff</label>
                        <input type="datetime-local" value={dateTimeLocalValue(compData.cutoffDate)} onChange={e => setCompData({...compData, cutoffDate: e.target.value})} className="w-full h-12 px-4 bg-neutral-800 border border-neutral-700 rounded-lg text-white" />
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            <label className="block text-sm font-medium text-neutral-300 mb-2">Buyer Discount (%)</label>
                            <input type="number" value={compData.promoDiscountPercent} onChange={e => setCompData({...compData, promoDiscountPercent: parseInt(e.target.value) || 0})} min="0" max="100" className="w-full h-12 px-4 bg-neutral-800 border border-neutral-700 rounded-lg text-white" />
                            <p className="text-[10px] text-neutral-500 mt-1">Discount applied to fans using the link.</p>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-neutral-300 mb-2">Competitor Commission (%)</label>
                            <input type="number" value={compData.commissionPercent} onChange={e => setCompData({...compData, commissionPercent: parseInt(e.target.value) || 0})} min="0" max="100" className="w-full h-12 px-4 bg-neutral-800 border border-neutral-700 rounded-lg text-white" />
                            <p className="text-[10px] text-neutral-500 mt-1">Overrides the default event commission.</p>
                        </div>
                    </div>

                     <div>
                        <label className="block text-sm font-medium text-neutral-300 mb-2">Competition Sections</label>
                        <p className="text-xs text-neutral-500 mb-3">Select which venue sections this competition applies to.</p>
                        <div className="space-y-3 p-4 bg-neutral-800 rounded-lg">
                            {(event.venueAreas && event.venueAreas.length > 0) ? event.venueAreas.map(area => (
                                <label key={area.id} className="flex items-center space-x-3 cursor-pointer">
                                    <input type="checkbox" checked={compData.sectionIds.includes(area.id)} onChange={() => handleSectionToggle(area.id)} className="h-4 w-4 rounded bg-neutral-700 border-neutral-600 text-purple-600 focus:ring-purple-500" />
                                    <span className="text-white font-medium">{area.name}</span>
                                </label>
                            )) : <p className="text-neutral-500 text-sm text-center">No venue sections defined. Please add sections first.</p>}
                        </div>
                    </div>
                </div>

                <div className="p-4 bg-neutral-900/50 border-t border-neutral-800 flex justify-end gap-4">
                     <button onClick={onClose} className="px-5 py-2 text-sm font-semibold text-neutral-300 bg-neutral-800 hover:bg-neutral-700 rounded-full transition-colors">Cancel</button>
                    <button onClick={handleSave} className="px-5 py-2 text-sm font-semibold rounded-full bg-purple-600 text-white hover:bg-purple-500">Save Competition</button>
                </div>
            </div>
        </Modal>
    )
}

export default CompetitionsTab;
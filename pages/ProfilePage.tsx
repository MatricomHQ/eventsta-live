
import React, { useState, useEffect, useMemo, useRef } from 'react';
import { useParams } from 'react-router-dom';
import { v4 as uuidv4 } from 'uuid';

import * as api from '../services/api';
import { useAuth } from '../contexts/AuthContext';
import { User, ArtistProfile, ProfileSection } from '../types';
import { SaveIcon, CheckCircleIcon, UploadCloudIcon, UserIcon } from '../components/Icons';
import AddSectionBar from '../components/AddSectionBar';
import SectionEditor from '../components/SectionEditor';

const ProfilePage: React.FC = () => {
    const { id } = useParams<{ id: string }>();
    const { user: currentUser } = useAuth();
    const [profileUser, setProfileUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [isEditing, setIsEditing] = useState(false);
    
    // Create a separate state for the profile being edited
    const [editedProfile, setEditedProfile] = useState<ArtistProfile | null>(null);
    
    const [isSaving, setIsSaving] = useState(false);
    const [saveSuccess, setSaveSuccess] = useState(false);
    
    // Upload state tracking
    const [uploadingField, setUploadingField] = useState<'header' | 'profile' | null>(null);

    // Refs for file inputs and drag-and-drop
    const headerInputRef = useRef<HTMLInputElement>(null);
    const profileInputRef = useRef<HTMLInputElement>(null);
    const [draggingIndex, setDraggingIndex] = useState<number | null>(null);
    const dragItem = useRef<number | null>(null);
    const dragOverItem = useRef<number | null>(null);
    
    const isOwner = useMemo(() => currentUser?.id === id, [currentUser, id]);

    useEffect(() => {
        const fetchProfile = async () => {
            if (!id) return;
            setIsLoading(true);
            try {
                const fetchedUser = await api.getProfileForView(id);
                setProfileUser(fetchedUser);
                // Initialize the editedProfile state when data is fetched
                setEditedProfile(fetchedUser.artistProfile || {});
            } catch (err) {
                setError("Artist profile not found.");
            } finally {
                setIsLoading(false);
            }
        };
        fetchProfile();
    }, [id]);

    const handleEditToggle = () => {
        if (isEditing) {
            // If cancelling edit, revert changes
            setEditedProfile(profileUser?.artistProfile || {});
        }
        setIsEditing(!isEditing);
    };
    
    const handleProfileChange = (newProfileData: Partial<ArtistProfile>) => {
        setEditedProfile(prev => ({ ...prev, ...newProfileData } as ArtistProfile));
    };

    const handleImageChange = async (event: React.ChangeEvent<HTMLInputElement>, type: 'header' | 'profile') => {
        const file = event.target.files?.[0];
        if (!file) return;

        // 1. Instant Preview with Object URL
        const objectUrl = URL.createObjectURL(file);
        const field = type === 'header' ? 'headerImageUrl' : 'profileImageUrl';
        
        // Update local state with preview
        handleProfileChange({ [field]: objectUrl });
        
        // Set uploading state
        setUploadingField(type);

        try {
            // 2. Upload file
            const uploadedUrl = await api.uploadFile(file);
            // 3. Update state with remote URL
            handleProfileChange({ [field]: uploadedUrl });
        } catch (error) {
            console.error("Image upload failed", error);
            alert("Failed to upload image. Please try again.");
        } finally {
            setUploadingField(null);
            // Reset input
            if (type === 'header' && headerInputRef.current) headerInputRef.current.value = '';
            if (type === 'profile' && profileInputRef.current) profileInputRef.current.value = '';
        }
    };
    
    const handleSectionChange = (updatedSection: ProfileSection) => {
        setEditedProfile(prev => {
            if (!prev || !prev.sections) return prev;
            const newSections = prev.sections.map(s => s.id === updatedSection.id ? updatedSection : s);
            return { ...prev, sections: newSections };
        });
    };

    const handleAddSection = (type: ProfileSection['type']) => {
        const newSection: ProfileSection = {
            id: uuidv4(),
            type,
            content: {}
        };
        switch (type) {
            case 'TEXT':
                newSection.content = { title: 'New Section', body: 'Start writing here...' };
                break;
            case 'GALLERY':
                newSection.content = { images: [] };
                break;
            case 'SOUNDCLOUD':
                newSection.content = { url: '' };
                break;
            case 'YOUTUBE':
                newSection.content = { url: '' };
                break;
        }
        setEditedProfile(prev => ({
            ...prev,
            sections: [...(prev?.sections || []), newSection]
        } as ArtistProfile));
    };
    
     const handleDeleteSection = (idToDelete: string) => {
        setEditedProfile(prev => {
            if (!prev || !prev.sections) return prev;
            return { ...prev, sections: prev.sections.filter(s => s.id !== idToDelete) };
        });
    };

    const handleDragSort = () => {
        if (!editedProfile?.sections || dragItem.current === null || dragOverItem.current === null) {
            setDraggingIndex(null);
            return;
        }

        const items = [...editedProfile.sections];
        const [reorderedItem] = items.splice(dragItem.current, 1);
        items.splice(dragOverItem.current, 0, reorderedItem);

        dragItem.current = null;
        dragOverItem.current = null;
        setDraggingIndex(null);

        handleProfileChange({ sections: items });
    };
    
    const handleSave = async () => {
        if (!id || !editedProfile) return;
        
        if (uploadingField) {
            alert("Please wait for images to finish uploading.");
            return;
        }

        setIsSaving(true);
        setSaveSuccess(false);
        try {
            await api.updateUserProfile(id, editedProfile);
            const refreshedUser = await api.getProfileForView(id);
            setProfileUser(refreshedUser);
            setEditedProfile(refreshedUser.artistProfile || {});
            setIsEditing(false);
            setSaveSuccess(true);
            setTimeout(() => setSaveSuccess(false), 2500);
        } catch (error) {
            console.error("Failed to save profile:", error);
            alert("Could not save profile. Please try again.");
        } finally {
            setIsSaving(false);
        }
    };
    
    if (isLoading) return <div className="text-center py-20">Loading profile...</div>;
    if (error) return <div className="text-center py-20 text-red-500">{error}</div>;
    if (!profileUser) return <div className="text-center py-20 text-neutral-400">User not found.</div>;

    // Check if profile is empty and user is NOT the owner
    if (!isOwner && !profileUser.artistProfile) {
        return (
            <div className="min-h-screen flex flex-col items-center justify-center text-center px-6 -mt-20 bg-[#0a0a0a]">
                <div className="w-24 h-24 bg-neutral-900 rounded-full flex items-center justify-center mb-6 border border-neutral-800">
                    <UserIcon className="w-10 h-10 text-neutral-600" />
                </div>
                <h2 className="text-2xl font-bold text-white mb-2">Profile Not Set Up</h2>
                <p className="text-neutral-400 max-w-md">This user hasn't customized their public profile yet.</p>
            </div>
        );
    }
    
    const profileToDisplay = isEditing ? editedProfile : (profileUser.artistProfile || {});

    return (
        <>
            {/* Parallax Background - Fixed, No Scroll Movement */}
            {profileToDisplay?.headerImageUrl && (
                <div
                className="fixed inset-0 z-[-1]"
                style={{
                    willChange: 'transform',
                }}
                >
                <div
                    className="absolute inset-0 bg-cover bg-center filter blur-3xl transform scale-125"
                    style={{ backgroundImage: `url(${profileToDisplay.headerImageUrl})` }}
                />
                </div>
            )}
            <div className="fixed inset-0 bg-black/80 z-[-1]" />
            <div className="min-h-screen">
                {/* Header and Profile Picture */}
                <div className="relative -mt-20 pt-20">
                    <div className="relative h-[40vh] min-h-[300px] bg-neutral-900 border-b border-neutral-800 group overflow-hidden">
                        {profileToDisplay?.headerImageUrl ? (
                            <img src={profileToDisplay.headerImageUrl} alt="Header" className="w-full h-full object-cover"/>
                        ) : (
                            <div className="w-full h-full bg-gradient-to-b from-neutral-800 to-neutral-900 flex items-center justify-center">
                                {isOwner && !isEditing && <p className="text-neutral-500 text-sm font-medium">No cover image set</p>}
                            </div>
                        )}
                        {isEditing && (
                            <>
                                <div 
                                    onClick={() => headerInputRef.current?.click()}
                                    className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer z-10"
                                >
                                    <div className="text-center text-white p-4 bg-black/30 rounded-lg backdrop-blur-sm border border-white/10">
                                        <UploadCloudIcon className="w-10 h-10 mx-auto" />
                                        <p className="font-semibold mt-2">Change Header Image</p>
                                    </div>
                                </div>
                                {uploadingField === 'header' && (
                                    <div className="absolute inset-0 bg-black/60 flex items-center justify-center z-20 pointer-events-none">
                                        <div className="w-12 h-12 border-4 border-white border-t-transparent rounded-full animate-spin"></div>
                                    </div>
                                )}
                                <input
                                    ref={headerInputRef}
                                    type="file"
                                    accept="image/*"
                                    className="hidden"
                                    onChange={(e) => handleImageChange(e, 'header')}
                                />
                            </>
                        )}
                    </div>
                    <div className="container mx-auto max-w-5xl px-6">
                        <div className="relative -mt-20 md:-mt-24 flex flex-col md:flex-row items-center md:items-end">
                            <div className="relative w-40 h-40 md:w-48 md:h-48 rounded-full border-4 border-black bg-neutral-800 overflow-hidden flex-shrink-0 group shadow-2xl">
                                {profileToDisplay?.profileImageUrl ? (
                                    <img src={profileToDisplay.profileImageUrl} alt="Profile" className="w-full h-full object-cover"/>
                                ) : (
                                    <div className="w-full h-full flex items-center justify-center bg-neutral-800">
                                        <span className="text-4xl font-bold text-neutral-600">{profileUser.name.charAt(0).toUpperCase()}</span>
                                    </div>
                                )}
                                {isEditing && (
                                    <>
                                        <div 
                                            onClick={() => profileInputRef.current?.click()}
                                            className="absolute inset-0 bg-black/70 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer text-center text-white z-10"
                                        >
                                            <div>
                                                <UploadCloudIcon className="w-8 h-8 mx-auto"/>
                                                <p className="text-xs font-semibold mt-1">Change</p>
                                            </div>
                                        </div>
                                        {uploadingField === 'profile' && (
                                            <div className="absolute inset-0 bg-black/60 flex items-center justify-center z-20 pointer-events-none">
                                                <div className="w-8 h-8 border-4 border-white border-t-transparent rounded-full animate-spin"></div>
                                            </div>
                                        )}
                                        <input
                                            ref={profileInputRef}
                                            type="file"
                                            accept="image/*"
                                            className="hidden"
                                            onChange={(e) => handleImageChange(e, 'profile')}
                                        />
                                    </>
                                )}
                            </div>
                            <div className="mt-4 md:ml-6 text-center md:text-left flex-grow">
                                {isEditing ? (
                                    <input
                                        type="text"
                                        value={editedProfile?.displayName || ''}
                                        onChange={(e) => handleProfileChange({ displayName: e.target.value })}
                                        className="w-full text-3xl md:text-5xl font-bold bg-transparent text-white focus:outline-none focus:ring-2 focus:ring-purple-500 rounded-lg -ml-2 px-2 py-1"
                                        placeholder="Your Display Name"
                                    />
                                ) : (
                                    <h1 className="text-3xl md:text-5xl font-bold text-white text-glow">
                                        {profileToDisplay?.displayName || profileUser.name}
                                    </h1>
                                )}
                            </div>
                            {isOwner && (
                                <div className="mt-4 md:ml-auto flex items-center gap-4 flex-shrink-0">
                                    {isEditing && (
                                        <button onClick={handleSave} disabled={isSaving || saveSuccess || !!uploadingField} className="px-5 py-2 text-sm font-semibold rounded-full transition-all duration-300 flex items-center justify-center min-w-[100px] bg-green-600 text-white hover:bg-green-500 shadow-lg shadow-green-500/20 disabled:bg-neutral-700 disabled:text-neutral-500 disabled:shadow-none">
                                            {isSaving ? 'Saving...' : saveSuccess ? <><CheckCircleIcon className="w-5 h-5 mr-2"/>Saved!</> : <><SaveIcon className="w-4 h-4 mr-2"/>Save</>}
                                        </button>
                                    )}
                                    <button onClick={handleEditToggle} className="px-5 py-2 bg-purple-600 text-white text-sm font-semibold rounded-full hover:bg-purple-500 transition-all duration-300 shadow-lg shadow-purple-500/20">
                                        {isEditing ? 'Cancel' : 'Edit Profile'}
                                    </button>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
                
                {/* Page Content */}
                <main className="container mx-auto max-w-5xl px-6 py-12">
                    {isEditing ? (
                        <div className="space-y-8 pb-32">
                            <div className="text-center p-4 bg-neutral-900/50 border border-neutral-800 rounded-xl mb-8">
                                <p className="text-neutral-400 text-sm">Click the + buttons below to add content sections. Drag to reorder.</p>
                            </div>
                            
                            {editedProfile?.sections?.map((section, index) => (
                                <div
                                    key={section.id}
                                    draggable
                                    onDragStart={() => {
                                        dragItem.current = index;
                                        setDraggingIndex(index);
                                    }}
                                    onDragEnter={() => {
                                        dragOverItem.current = index;
                                    }}
                                    onDragEnd={handleDragSort}
                                    onDragOver={(e) => e.preventDefault()}
                                    className={`transition-all ${draggingIndex === index ? 'opacity-50 scale-[1.02] shadow-2xl shadow-purple-500/20' : ''}`}
                                >
                                    <SectionEditor
                                        section={section}
                                        onUpdate={handleSectionChange}
                                        onDelete={handleDeleteSection}
                                    />
                                </div>
                            ))}
                            
                            {(!editedProfile?.sections || editedProfile.sections.length === 0) && (
                                <div className="text-center py-12 border-2 border-dashed border-neutral-800 rounded-2xl">
                                    <p className="text-neutral-500">Your profile is empty. Add a section to get started.</p>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="space-y-12">
                            {profileToDisplay?.sections?.map(section => (
                                <section key={section.id} className="animate-fade-in">
                                    {section.type === 'TEXT' && (
                                        <div className="prose prose-invert max-w-none">
                                            <h2 className="text-2xl font-bold text-white mb-4">{section.content.title}</h2>
                                            <p className="text-neutral-300 leading-relaxed whitespace-pre-wrap text-lg">{section.content.body}</p>
                                        </div>
                                    )}
                                    {section.type === 'GALLERY' && section.content.images?.length > 0 && (
                                        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
                                            {section.content.images.map((img: string, index: number) => (
                                                <div key={index} className="aspect-video bg-neutral-900 rounded-xl overflow-hidden border border-neutral-800 hover:border-purple-500/50 transition-colors">
                                                    <img src={img} alt={`Gallery item ${index}`} className="w-full h-full object-cover"/>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                    {section.type === 'SOUNDCLOUD' && section.content.url && (
                                        <div className="rounded-xl overflow-hidden border border-neutral-800 shadow-lg">
                                            <iframe title="SoundCloud" width="100%" height="166" scrolling="no" frameBorder="no" allow="autoplay" src={section.content.url}></iframe>
                                        </div>
                                    )}
                                    {section.type === 'YOUTUBE' && section.content.url && (
                                        <div className="aspect-video rounded-xl overflow-hidden border border-neutral-800 shadow-lg">
                                            <iframe width="100%" height="100%" src={section.content.url} title="YouTube video player" frameBorder="0" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen></iframe>
                                        </div>
                                    )}
                                </section>
                            ))}
                            
                            {(!profileToDisplay?.sections || profileToDisplay.sections.length === 0) && isOwner && (
                                <div className="text-center py-12">
                                    <p className="text-neutral-500 mb-4">Your profile is currently empty.</p>
                                    <button onClick={handleEditToggle} className="text-purple-400 hover:text-white font-semibold underline">Start Building</button>
                                </div>
                            )}
                        </div>
                    )}
                </main>
                {isEditing && <AddSectionBar onAddSection={handleAddSection} />}
            </div>
        </>
    );
};

export default ProfilePage;

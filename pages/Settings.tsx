




import React, { useState, useEffect, useRef } from 'react';
import { useLocation, useNavigate, Link } from 'react-router-dom'; // Added useLocation
import { useAuth } from '../contexts/AuthContext';
import * as api from '../services/api';
import { Host, TeamMember, NotificationPreferences } from '../types';
import SettingsSidebar from '../components/SettingsSidebar';
import { PlusIcon, UploadCloudIcon, CheckCircleIcon, DollarSignIcon, LockIcon, BellIcon, ArrowRightIcon } from '../components/Icons';
import AddHostModal from '../components/AddHostModal';
import Modal from '../components/Modal';

const Settings: React.FC = () => {
    const { user, refreshUser } = useAuth();
    const location = useLocation(); // Hook to access state
    const [activeTab, setActiveTab] = useState('profile');

    // Handle deep linking to specific tabs
    useEffect(() => {
        if (location.state && (location.state as any).defaultTab) {
            setActiveTab((location.state as any).defaultTab);
        }
    }, [location.state]);

    const renderContent = () => {
        switch (activeTab) {
            case 'profile':
                return <ProfileSection />;
            case 'hosts':
                return <HostsSection />;
            case 'team':
                return <TeamSection />;
            case 'payouts':
                return <PayoutsSection />;
            default:
                return <PlaceholderSection title={activeTab.charAt(0).toUpperCase() + activeTab.slice(1)} />;
        }
    };

    if (!user) {
        return <div className="text-center py-20 text-neutral-400">Loading settings...</div>;
    }

    return (
        <div className="container mx-auto max-w-7xl px-6 py-16">
            <h1 className="text-4xl font-bold tracking-tight text-white mb-12">Settings</h1>
            <div className="flex flex-col md:flex-row gap-8 lg:gap-12">
                <SettingsSidebar activeTab={activeTab} setActiveTab={setActiveTab} />
                <main className="flex-1">
                    {renderContent()}
                </main>
            </div>
        </div>
    );
};


const ProfileSection: React.FC = () => {
    const { user, refreshUser, logout } = useAuth();
    const navigate = useNavigate();
    const [name, setName] = useState(user?.name || '');
    const [notifications, setNotifications] = useState<NotificationPreferences>({
        marketingEmails: true,
        transactionalEmails: true,
        promoterAlerts: true,
        ...(user?.notificationPreferences || {})
    });
    
    const [isSaving, setIsSaving] = useState(false);
    const [saveSuccess, setSaveSuccess] = useState(false);
    
    // Modal States
    const [isPasswordModalOpen, setIsPasswordModalOpen] = useState(false);
    const [isDeleteAccountModalOpen, setIsDeleteAccountModalOpen] = useState(false);

    useEffect(() => {
        setName(user?.name || '');
        if (user?.notificationPreferences) {
            setNotifications(prev => ({ ...prev, ...user.notificationPreferences }));
        }
    }, [user]);

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!user || !name.trim()) return;
        
        setIsSaving(true);
        try {
            await api.updateUser(user.id, { name });
            await api.updateNotificationPreferences(user.id, notifications);
            await refreshUser();
            setSaveSuccess(true);
            setTimeout(() => setSaveSuccess(false), 2000);
        } catch(e) {
            alert("Failed to save settings.");
        } finally {
            setIsSaving(false);
        }
    };

    const toggleNotification = (key: keyof NotificationPreferences) => {
        setNotifications(prev => ({ ...prev, [key]: !prev[key] }));
    };

    const handleDeleteAccount = async () => {
        if (!user) return;
        try {
            await api.deleteAccount(user.id);
            logout();
            navigate('/');
        } catch (e) {
            alert("Failed to delete account.");
        }
    };

    return (
        <div className="space-y-12">
            <div className="bg-neutral-900 border border-neutral-800 rounded-2xl">
                <div className="p-8">
                    <h2 className="text-xl font-bold text-white mb-2">Profile Information</h2>
                    <p className="text-neutral-400 text-sm mb-6">Update your personal details here.</p>
                    <form onSubmit={handleSave} className="space-y-6">
                        <div>
                            <label htmlFor="user-name" className="block text-sm font-medium text-neutral-300 mb-2">Full Name</label>
                            <input type="text" id="user-name" value={name} onChange={e => setName(e.target.value)} className="w-full max-w-sm h-12 px-4 bg-neutral-800 border border-neutral-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500" />
                        </div>
                         <div>
                            <label htmlFor="user-email" className="block text-sm font-medium text-neutral-300 mb-2">Email</label>
                            <input type="email" id="user-email" value={user?.email} disabled className="w-full max-w-sm h-12 px-4 bg-neutral-800/50 border border-neutral-700/50 rounded-lg text-neutral-400 cursor-not-allowed" />
                        </div>
                    </form>
                </div>
            </div>

            <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-8">
                <h2 className="text-xl font-bold text-white mb-2 flex items-center"><BellIcon className="w-5 h-5 mr-2 text-purple-400" />Notifications</h2>
                <p className="text-neutral-400 text-sm mb-6">Choose what emails you receive.</p>
                <div className="space-y-4 max-w-xl">
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-white font-medium">Marketing Emails</p>
                            <p className="text-xs text-neutral-500">Tips, newsletters, and feature updates.</p>
                        </div>
                        <button 
                            onClick={() => toggleNotification('marketingEmails')}
                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${notifications.marketingEmails ? 'bg-purple-600' : 'bg-neutral-700'}`}
                        >
                            <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${notifications.marketingEmails ? 'translate-x-6' : 'translate-x-1'}`} />
                        </button>
                    </div>
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-white font-medium">Transactional Emails</p>
                            <p className="text-xs text-neutral-500">Order confirmations, ticket receipts, and account alerts.</p>
                        </div>
                        <button 
                            onClick={() => toggleNotification('transactionalEmails')}
                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${notifications.transactionalEmails ? 'bg-purple-600' : 'bg-neutral-700'}`}
                        >
                            <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${notifications.transactionalEmails ? 'translate-x-6' : 'translate-x-1'}`} />
                        </button>
                    </div>
                    <div className="flex items-center justify-between">
                        <div>
                            <p className="text-white font-medium">Promoter Alerts</p>
                            <p className="text-xs text-neutral-500">Notifications about your sales and commissions.</p>
                        </div>
                        <button 
                            onClick={() => toggleNotification('promoterAlerts')}
                            className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${notifications.promoterAlerts ? 'bg-purple-600' : 'bg-neutral-700'}`}
                        >
                            <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${notifications.promoterAlerts ? 'translate-x-6' : 'translate-x-1'}`} />
                        </button>
                    </div>
                </div>
            </div>

             <div className="bg-neutral-900 border border-neutral-800 rounded-2xl">
                <div className="p-8">
                    <h2 className="text-xl font-bold text-white mb-2 flex items-center"><LockIcon className="w-5 h-5 mr-2 text-purple-400"/>Security Settings</h2>
                    <p className="text-neutral-400 text-sm mb-6">Manage your password and account security.</p>
                    <div className="divide-y divide-neutral-800">
                        <div className="py-4 flex justify-between items-center">
                            <div>
                                <h3 className="font-semibold text-white">Password</h3>
                                <p className="text-sm text-neutral-400">Set a permanent password for your account.</p>
                            </div>
                            <button onClick={() => setIsPasswordModalOpen(true)} className="px-4 py-2 text-sm font-semibold rounded-lg bg-neutral-800 hover:bg-neutral-700 text-white transition-colors">Change Password</button>
                        </div>
                    </div>
                </div>
                <div className="bg-neutral-900/50 border-t border-neutral-800 px-8 py-4 flex justify-end">
                     <button onClick={handleSave} disabled={isSaving || saveSuccess} className="px-5 py-2 text-sm font-semibold rounded-full transition-all duration-300 flex items-center justify-center min-w-[100px] bg-purple-600 text-white hover:bg-purple-500 shadow-lg shadow-purple-500/20 disabled:bg-neutral-700 disabled:text-neutral-500 disabled:shadow-none">
                        {isSaving ? 'Saving...' : saveSuccess ? 'Saved!' : 'Save All Changes'}
                    </button>
                </div>
            </div>

            <div className="bg-transparent border-2 border-red-500/30 rounded-2xl p-8">
                <h3 className="text-xl font-bold text-red-400 mb-2">Danger Zone</h3>
                <p className="text-neutral-400 mb-6">These actions are permanent and cannot be undone.</p>
                <button onClick={() => setIsDeleteAccountModalOpen(true)} className="px-5 py-2 text-sm font-semibold rounded-full bg-red-600/20 text-red-300 hover:bg-red-600/40 hover:text-white transition-colors">Delete My Account</button>
            </div>

            {/* Change Password Modal */}
            <ChangePasswordModal 
                isOpen={isPasswordModalOpen} 
                onClose={() => setIsPasswordModalOpen(false)} 
                userId={user?.id || ''}
            />

            {/* Delete Account Modal */}
            <Modal isOpen={isDeleteAccountModalOpen} onClose={() => setIsDeleteAccountModalOpen(false)}>
                <div className="w-full max-w-sm bg-neutral-900 border border-neutral-700 rounded-2xl p-8 text-center">
                    <h3 className="text-xl font-bold text-white mb-2">Delete Account?</h3>
                    <p className="text-neutral-400 mb-6">Are you sure you want to delete your account? All your data, tickets, and earnings history will be permanently removed.</p>
                    <div className="flex justify-center space-x-4">
                        <button onClick={() => setIsDeleteAccountModalOpen(false)} className="px-6 py-2 text-sm font-semibold text-neutral-300 bg-neutral-800 hover:bg-neutral-700 rounded-full transition-colors">Cancel</button>
                        <button onClick={handleDeleteAccount} className="px-6 py-2 text-sm font-semibold text-white bg-red-600 hover:bg-red-500 rounded-full transition-colors">Confirm Delete</button>
                    </div>
                </div>
            </Modal>
        </div>
    );
};

const ChangePasswordModal: React.FC<{ isOpen: boolean, onClose: () => void, userId: string }> = ({ isOpen, onClose, userId }) => {
    const [currentPassword, setCurrentPassword] = useState('');
    const [newPassword, setNewPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [error, setError] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError('');
        if (newPassword !== confirmPassword) {
            setError("New passwords do not match.");
            return;
        }
        if (newPassword.length < 6) {
            setError("Password must be at least 6 characters.");
            return;
        }
        
        setIsSubmitting(true);
        try {
            await api.changePassword(userId, currentPassword, newPassword);
            onClose();
            setCurrentPassword('');
            setNewPassword('');
            setConfirmPassword('');
            alert("Password changed successfully.");
        } catch (e) {
            setError((e as Error).message);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose}>
            <div className="w-full max-w-md bg-neutral-900 border border-neutral-800 rounded-2xl p-8 shadow-2xl">
                <h3 className="text-xl font-bold text-white mb-6">Change Password</h3>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div>
                        <label className="block text-xs font-medium text-neutral-400 mb-1">Current Password</label>
                        <input 
                            type="password" 
                            value={currentPassword}
                            onChange={e => setCurrentPassword(e.target.value)}
                            className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-white focus:outline-none focus:border-purple-500"
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-neutral-400 mb-1">New Password</label>
                        <input 
                            type="password" 
                            value={newPassword}
                            onChange={e => setNewPassword(e.target.value)}
                            className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-white focus:outline-none focus:border-purple-500"
                            required
                        />
                    </div>
                    <div>
                        <label className="block text-xs font-medium text-neutral-400 mb-1">Confirm New Password</label>
                        <input 
                            type="password" 
                            value={confirmPassword}
                            onChange={e => setConfirmPassword(e.target.value)}
                            className="w-full px-3 py-2 bg-neutral-800 border border-neutral-700 rounded-lg text-white focus:outline-none focus:border-purple-500"
                            required
                        />
                    </div>
                    {error && <p className="text-red-400 text-sm">{error}</p>}
                    <div className="flex justify-end gap-3 mt-6">
                        <button type="button" onClick={onClose} className="px-4 py-2 text-neutral-300 hover:text-white text-sm font-medium">Cancel</button>
                        <button type="submit" disabled={isSubmitting} className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white text-sm font-bold rounded-lg transition-colors disabled:opacity-50">
                            {isSubmitting ? 'Updating...' : 'Update Password'}
                        </button>
                    </div>
                </form>
            </div>
        </Modal>
    );
}

const HostsSection: React.FC = () => {
    const { user, refreshUser } = useAuth();
    const [hosts, setHosts] = useState<Host[]>([]);
    const [selectedHost, setSelectedHost] = useState<Host | null>(null);
    const [isAddHostModalOpen, setAddHostModalOpen] = useState(false);

    useEffect(() => {
        const fetchHosts = async () => {
            if (user?.managedHostIds) {
                const fetchedHosts = await api.getHostsByIds(user.managedHostIds);
                setHosts(fetchedHosts);
            }
        };
        fetchHosts();
    }, [user]);
    
    const handleHostCreated = (newHost: Host) => {
        refreshUser();
        setHosts(prev => [...prev, newHost]);
        setSelectedHost(newHost);
        setAddHostModalOpen(false);
    };

    const handleHostUpdated = (updatedHost: Host) => {
        setHosts(hosts.map(h => h.id === updatedHost.id ? updatedHost : h));
        setSelectedHost(updatedHost);
        refreshUser();
    };
    
    const handleHostDeleted = () => {
        setSelectedHost(null);
        refreshUser(); // This will trigger the useEffect to refetch hosts.
    };
    
    if (selectedHost) {
        return <HostEditor 
            host={selectedHost} 
            onBack={() => setSelectedHost(null)} 
            onUpdate={handleHostUpdated} 
            onDelete={handleHostDeleted}
        />;
    }

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h2 className="text-xl font-bold text-white">Your Hosts</h2>
                    <p className="text-neutral-400 text-sm">Manage your host profiles and settings.</p>
                </div>
                <button onClick={() => setAddHostModalOpen(true)} className="px-5 py-2 bg-purple-600 text-white text-sm font-semibold rounded-full hover:bg-purple-500 transition-all duration-300 shadow-lg shadow-purple-500/20 flex items-center justify-center space-x-2">
                    <PlusIcon className="w-4 h-4" /><span>Create Host</span>
                </button>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {hosts.map(host => (
                    <div key={host.id} className="bg-neutral-900 border border-neutral-800 rounded-2xl p-6 flex flex-col justify-between">
                        <div className="flex items-center mb-4">
                            <img src={host.imageUrl || `https://picsum.photos/seed/${host.id}/100/100`} alt={host.name} className="w-12 h-12 rounded-full mr-4 object-cover bg-neutral-800"/>
                            <div>
                                <h3 className="text-lg font-bold text-white">{host.name}</h3>
                                <p className="text-sm text-neutral-500">{host.eventIds.length} events</p>
                            </div>
                        </div>
                         <button onClick={() => setSelectedHost(host)} className="w-full mt-4 py-2 text-sm font-semibold text-center bg-neutral-800 hover:bg-neutral-700 rounded-lg text-neutral-300 hover:text-white transition-colors">Manage</button>
                    </div>
                ))}
            </div>
            <AddHostModal 
                isOpen={isAddHostModalOpen} 
                onClose={() => setAddHostModalOpen(false)} 
                onHostCreated={handleHostCreated}
            />
        </div>
    );
};

const HostEditor: React.FC<{host: Host, onBack: () => void, onUpdate: (host: Host) => void, onDelete: () => void}> = ({ host, onBack, onUpdate, onDelete }) => {
    const { user, refreshUser } = useAuth();
    const [details, setDetails] = useState(host);
    const [isSaving, setIsSaving] = useState(false);
    const [saveSuccess, setSaveSuccess] = useState(false);
    const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
    
    const handleFileSelect = async (file: File | null, type: 'profile' | 'cover') => {
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (e) => {
            const field = type === 'profile' ? 'imageUrl' : 'coverImageUrl';
            setDetails(prev => ({ ...prev, [field]: e.target?.result as string }));
        };
        reader.readAsDataURL(file);
    };

    const handleSave = async () => {
        setIsSaving(true);
        const updatedHost = await api.updateHostDetails(host.id, details);
        onUpdate(updatedHost);
        setIsSaving(false);
        setSaveSuccess(true);
        setTimeout(() => setSaveSuccess(false), 2000);
    };

    const handleDelete = async () => {
        if (details.isDefault || !user) return;
        try {
            await api.deleteHost(user.id, details.id);
            setIsDeleteModalOpen(false);
            onDelete();
        } catch (error) {
            console.error("Failed to delete host:", error);
            alert((error as Error).message);
            setIsDeleteModalOpen(false);
        }
    };

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <button onClick={onBack} className="text-sm text-neutral-400 hover:text-white transition-colors">&larr; Back to all hosts</button>
                <Link 
                    to={`/host/${host.id}`} 
                    className="flex items-center text-sm font-medium text-purple-400 hover:text-purple-300 transition-colors"
                >
                    View Public Page <ArrowRightIcon className="w-4 h-4 ml-1" />
                </Link>
            </div>
            <div className="bg-neutral-900 border border-neutral-800 rounded-2xl">
                <div className="p-8">
                     <div className="relative mb-6">
                        <div className="h-48 bg-neutral-800 rounded-lg overflow-hidden group">
                            {details.coverImageUrl && <img src={details.coverImageUrl} className="w-full h-full object-cover" />}
                            <label htmlFor="cover-upload" className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer">
                                <UploadCloudIcon className="w-8 h-8 text-white" />
                            </label>
                            <input id="cover-upload" type="file" className="hidden" accept="image/*" onChange={e => handleFileSelect(e.target.files?.[0] || null, 'cover')} />
                        </div>
                        <div className="absolute -bottom-10 left-6 w-24 h-24 rounded-full border-4 border-neutral-900 bg-neutral-800 overflow-hidden group">
                            {details.imageUrl && <img src={details.imageUrl} className="w-full h-full object-cover" />}
                            <label htmlFor="profile-upload" className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center cursor-pointer">
                                <UploadCloudIcon className="w-6 h-6 text-white" />
                            </label>
                            <input id="profile-upload" type="file" className="hidden" accept="image/*" onChange={e => handleFileSelect(e.target.files?.[0] || null, 'profile')} />
                        </div>
                    </div>
                    <div className="pt-10 space-y-6">
                       <div>
                           <label htmlFor="host-name" className="block text-sm font-medium text-neutral-300 mb-2">Host Name</label>
                           <input type="text" id="host-name" value={details.name} onChange={e => setDetails({...details, name: e.target.value})} className="w-full h-12 px-4 bg-neutral-800 border border-neutral-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500" />
                       </div>
                       <div>
                           <label htmlFor="host-description" className="block text-sm font-medium text-neutral-300 mb-2">Description</label>
                           <textarea id="host-description" value={details.description} onChange={e => setDetails({...details, description: e.target.value})} rows={4} className="w-full p-4 bg-neutral-800 border border-neutral-700 rounded-lg text-white focus:outline-none focus:ring-2 focus:ring-purple-500 resize-none" />
                       </div>
                       <div>
                           <h3 className="text-lg font-bold text-white mb-4">Settings</h3>
                           <div className="bg-neutral-800 p-4 rounded-lg flex justify-between items-center">
                               <div>
                                   <p className="font-semibold text-white">Enable Reviews</p>
                                   <p className="text-sm text-neutral-400">Allow other users to leave public reviews on this host profile.</p>
                               </div>
                               <button onClick={() => setDetails({...details, reviewsEnabled: !details.reviewsEnabled})} className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${details.reviewsEnabled ? 'bg-purple-600' : 'bg-neutral-700'}`}>
                                   <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${details.reviewsEnabled ? 'translate-x-6' : 'translate-x-1'}`} />
                               </button>
                           </div>
                       </div>
                    </div>
                </div>
                <div className="bg-neutral-900/50 border-t border-neutral-800 px-8 py-4 flex justify-end">
                     <button onClick={handleSave} disabled={isSaving || saveSuccess} className="px-5 py-2 text-sm font-semibold rounded-full transition-all duration-300 flex items-center justify-center min-w-[100px] bg-purple-600 text-white hover:bg-purple-500 shadow-lg shadow-purple-500/20 disabled:bg-neutral-700 disabled:text-neutral-500 disabled:shadow-none">
                         {isSaving ? 'Saving...' : saveSuccess ? 'Saved!' : 'Save Changes'}
                    </button>
                </div>
            </div>

            <div className="mt-8 bg-transparent border-2 border-red-500/30 rounded-2xl p-8">
                <h3 className="text-xl font-bold text-red-400 mb-2">Danger Zone</h3>
                <p className="text-neutral-400 mb-6">This action is permanent and cannot be undone.</p>
                <button 
                    onClick={() => setIsDeleteModalOpen(true)} 
                    disabled={details.isDefault}
                    className="px-5 py-2 text-sm font-semibold rounded-full bg-red-600/20 text-red-300 hover:bg-red-600/40 hover:text-white transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                    {details.isDefault ? "Cannot Delete Default Host" : "Delete This Host"}
                </button>
            </div>
            
             <Modal isOpen={isDeleteModalOpen} onClose={() => setIsDeleteModalOpen(false)}>
                <div className="w-full max-w-sm bg-neutral-900 border border-neutral-700 rounded-2xl p-8 text-center">
                    <h3 className="text-xl font-bold text-white mb-2">Confirm Deletion</h3>
                    <p className="text-neutral-400 mb-6">Are you sure you want to delete the host "{details.name}"? This action is irreversible.</p>
                    <div className="flex justify-center space-x-4">
                        <button onClick={() => setIsDeleteModalOpen(false)} className="px-6 py-2 text-sm font-semibold text-neutral-300 bg-neutral-800 hover:bg-neutral-700 rounded-full transition-colors">Cancel</button>
                        <button onClick={handleDelete} className="px-6 py-2 text-sm font-semibold text-white bg-red-600 hover:bg-red-500 rounded-full transition-colors">Confirm Delete</button>
                    </div>
                </div>
            </Modal>
        </div>
    );
}

const TeamSection: React.FC = () => {
    const { user } = useAuth();
    return (
        <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-8">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h2 className="text-xl font-bold text-white">Team Members</h2>
                    <p className="text-neutral-400 text-sm">Invite and manage your team.</p>
                </div>
                <button className="px-5 py-2 bg-purple-600 text-white text-sm font-semibold rounded-full hover:bg-purple-500 transition-all duration-300 shadow-lg shadow-purple-500/20 flex items-center justify-center space-x-2">
                    <PlusIcon className="w-4 h-4" /><span>Invite Member</span>
                </button>
            </div>
            <div className="divide-y divide-neutral-800">
                {user?.team?.map(member => (
                    <div key={member.id} className="flex items-center justify-between py-4">
                        <div className="flex items-center">
                            <img src={`https://i.pravatar.cc/150?u=${member.email}`} alt={member.name} className="w-10 h-10 rounded-full mr-4" />
                            <div>
                                <p className="font-semibold text-white">{member.name}</p>
                                <p className="text-sm text-neutral-400">{member.email}</p>
                            </div>
                        </div>
                        <p className="text-sm font-medium text-purple-400 bg-purple-500/10 px-3 py-1 rounded-full">{member.role}</p>
                    </div>
                ))}
            </div>
        </div>
    );
};

const PayoutsSection: React.FC = () => {
    const { user, refreshUser } = useAuth();
    const [isConnecting, setIsConnecting] = useState(false);
    const [successMsg, setSuccessMsg] = useState('');

    const handleConnectStripe = async () => {
        if (!user) return;
        setIsConnecting(true);
        try {
            const result = await api.connectUserStripe(user.id);
            if (result.success) {
                await refreshUser();
                setSuccessMsg('Stripe account connected successfully!');
                setTimeout(() => setSuccessMsg(''), 3000);
            }
        } catch (error) {
            console.error("Stripe connection failed", error);
            alert("Failed to connect Stripe. Please try again.");
        } finally {
            setIsConnecting(false);
        }
    };

    const handleDisconnectStripe = async () => {
        if (!user) return;
        if (!window.confirm("Are you sure? You will no longer be able to receive payouts.")) return;
        
        setIsConnecting(true);
        try {
            await api.disconnectUserStripe(user.id);
            await refreshUser();
        } catch (error) {
            console.error("Stripe disconnection failed", error);
        } finally {
            setIsConnecting(false);
        }
    };

    return (
        <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-8">
            <h3 className="text-xl font-bold text-white mb-6">Payout Settings</h3>
            
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
                <div className="flex items-center gap-4">
                    <div className="w-14 h-14 bg-[#635BFF] rounded-xl flex items-center justify-center text-white shadow-lg shadow-[#635BFF]/20 flex-shrink-0">
                        <DollarSignIcon className="w-8 h-8" /> 
                    </div>
                    <div>
                        <h4 className="font-bold text-white text-lg flex flex-wrap items-center gap-2">
                            Stripe Connect
                            {user?.stripeConnected && (
                                <span className="px-2 py-0.5 rounded-full bg-green-500/20 text-green-400 text-xs border border-green-500/20">Active</span>
                            )}
                        </h4>
                        <p className="text-sm text-neutral-400 mt-1">
                            {user?.stripeConnected
                                ? `Linked Account: ${user.stripeAccountId}` 
                                : "Link your Stripe account to enable automated payouts. You will act as the Merchant of Record."}
                        </p>
                        {user?.stripeConnected && <p className="text-xs text-green-400 mt-1 flex items-center"><CheckCircleIcon className="w-3 h-3 mr-1"/> Ready for payouts</p>}
                        {successMsg && <p className="text-xs text-green-400 mt-1 font-semibold animate-pulse">{successMsg}</p>}
                    </div>
                </div>
                
                <div className="w-full lg:w-auto">
                    {user?.stripeConnected ? (
                        <button 
                            onClick={handleDisconnectStripe}
                            disabled={isConnecting}
                            className="w-full lg:w-auto px-4 py-2 bg-transparent border border-red-500/50 text-red-400 rounded-lg text-sm font-semibold hover:bg-red-500/10 transition-colors disabled:opacity-50 min-w-[120px]"
                        >
                            {isConnecting ? 'Processing...' : 'Disconnect'}
                        </button>
                    ) : (
                        <button 
                            onClick={handleConnectStripe}
                            disabled={isConnecting}
                            className="w-full lg:w-auto px-5 py-2.5 bg-[#635BFF] text-white rounded-lg text-sm font-bold hover:bg-[#544DC7] transition-colors shadow-lg shadow-[#635BFF]/20 disabled:opacity-70 flex items-center min-w-[120px] justify-center"
                        >
                            {isConnecting ? (
                                <>Connecting...</> 
                            ) : (
                                <>Connect Stripe</>
                            )}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
};

const PlaceholderSection: React.FC<{ title: string }> = ({ title }) => (
    <div className="bg-neutral-900 border border-neutral-800 rounded-2xl p-8 text-center h-64 flex flex-col justify-center">
        <h2 className="text-2xl font-bold text-white mb-2">{title}</h2>
        <p className="text-neutral-500">This feature is coming soon. Stay tuned!</p>
    </div>
);

export default Settings;
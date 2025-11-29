
import { User, PromoStat, Payout, PayoutRequest, NotificationPreferences, HostFinancials, LedgerEntry } from '../../types';
import { request, setToken, mapApiUserToFrontend, createHost, MOCK_USER, getEventsByIds } from './core';
import { createEventSlug } from '../../utils/url';

// --- AUTHENTICATION ---

export const checkUserExists = async (email: string): Promise<boolean> => {
    console.info(`[ACTION] checkUserExists: Checking ${email}`);
    const res = await request<{ exists: boolean }>(`/auth/check?email=${encodeURIComponent(email)}`);
    return res.exists;
};

export const registerUser = async (email: string, name: string, role: 'attendee' | 'host', password?: string): Promise<User> => {
    console.info(`[ACTION] registerUser: Registering ${email} as ${role}`);
    const res = await request<any>('/auth/register', {
        method: 'POST',
        body: JSON.stringify({ 
            email, 
            password: password || 'placeholder123', 
            name, 
            role: 'USER' 
        })
    });
    
    if (res.token) setToken(res.token);
    
    try {
        const user = mapApiUserToFrontend(res.user);
        console.info(`[ACTION] registerUser: Auto-creating default host profile for ${user.name}`);
        const newHost = await createHost(user.id, user.name);
        
        if (newHost && newHost.id) {
            user.managedHostIds = [...(user.managedHostIds || []), newHost.id];
        }
        return user;
    } catch (error) {
        console.error("Failed to auto-create default host profile during registration.", error);
        return await getUserProfile();
    }
};

export const signIn = async (provider: string, credentials?: string, userInfo?: { name?: string, email?: string }): Promise<User> => {
    console.info(`[ACTION] signIn: Provider ${provider}`);
    if (provider === 'demo' || provider === 'admin') {
        const mockUser = { 
            ...MOCK_USER, 
            isSystemAdmin: provider === 'admin', 
            id: provider === 'admin' ? 'admin_id' : 'demo_id', 
            name: provider === 'admin' ? 'System Admin' : 'Demo User',
            role: provider === 'admin' ? 'SUPER_ADMIN' : 'USER'
        };
        return mapApiUserToFrontend(mockUser);
    }

    let bodyPayload: any = {};
    let requestedEmail = '';
    
    if (provider === 'email' && credentials) {
        const parts = credentials.split('|');
        requestedEmail = parts[0];
        const password = parts.slice(1).join('|'); 
        bodyPayload = { email: requestedEmail, password };
    } else {
        bodyPayload = { 
            password: 'placeholder-provider-login', 
            provider_token: credentials 
        };
        if (userInfo) {
            if (userInfo.name) bodyPayload.name = userInfo.name;
            if (userInfo.email) {
                bodyPayload.email = userInfo.email;
                requestedEmail = userInfo.email;
            }
        }
    }

    const res = await request<any>('/auth/login', {
        method: 'POST',
        body: JSON.stringify(bodyPayload) 
    });

    if (requestedEmail && res.user && res.user.email) {
        if (requestedEmail.toLowerCase().trim() !== res.user.email.toLowerCase().trim()) {
            console.error(`[CRITICAL SECURITY] Identity Mismatch! Requested: ${requestedEmail}, Returned: ${res.user.email}`);
            console.error("Blocking session creation due to backend logic error.");
            throw new Error("Security Error: The server returned an incorrect user account. Please contact support.");
        }
    }
    
    if (res.token) setToken(res.token);
    
    try {
        const userProfile = await getUserProfile();
        
        if (userProfile.managedHostIds.length === 0) {
             console.info(`[ACTION] signIn: Auto-creating default host profile for ${userProfile.name}`);
             try {
                 const newHost = await createHost(userProfile.id, userProfile.name);
                 userProfile.managedHostIds = [newHost.id];
             } catch (hostErr) {
                 console.warn("Failed to auto-create host on login", hostErr);
             }
        }
        
        return userProfile;
    } catch (e) {
        console.warn("Failed to fetch full profile after login, using basic response", e);
        return mapApiUserToFrontend(res.user);
    }
};

export const loginWithPassword = async (email: string, password: string): Promise<User> => {
    console.info(`[ACTION] loginWithPassword: ${email}`);
    return signIn('email', `${email}|${password}`);
};

export const getUserProfile = async (): Promise<User> => {
    console.info(`[ACTION] getUserProfile: Fetching 'me'`);
    const me = await request<any>('/users/me');
    
    let promoStats: PromoStat[] = [];
    try {
        const rawPromos = await request<any[]>('/promotions/mine');
        
        const eventIds = [...new Set(rawPromos.map((p: any) => p.event_id || p.eventId))];
        let eventsMap: Record<string, any> = {};
        
        if (eventIds.length > 0) {
            try {
                const events = await getEventsByIds(eventIds);
                events.forEach(e => eventsMap[e.id] = e);
            } catch (e) {
                console.warn("Could not fetch events for promotions enrichment");
            }
        }

        promoStats = rawPromos.map((raw: any) => {
            const evtId = raw.event_id || raw.eventId;
            const event = eventsMap[evtId];
            
            let promoCode = raw.code || raw.promo_code;
            
            if (!promoCode && (raw.link || raw.promoLink)) {
                try {
                    const urlStr = raw.link || raw.promoLink;
                    const match = urlStr.match(/[?&]promo=([^&]+)/);
                    if (match) promoCode = match[1];
                } catch (e) { /* ignore */ }
            }

            let finalLink = raw.link || raw.promoLink || '';
            const titleForSlug = event?.title || raw.event_title || raw.eventName || 'event';
            
            if (promoCode && evtId && typeof window !== 'undefined') {
                 const slug = createEventSlug(titleForSlug, evtId);
                 finalLink = `${window.location.origin}/#/event/${slug}?promo=${promoCode}`;
            }

            const commissionRate = raw.commission_rate || event?.commission || 0;
            const salesVolume = raw.sales_volume || raw.sales || 0;
            let earnedAmount = typeof raw.earned_amount === 'number' ? raw.earned_amount : (raw.earned || 0);

            if (earnedAmount === 0 && salesVolume > 0 && commissionRate > 0) {
                earnedAmount = salesVolume * (commissionRate / 100);
            }

            return {
                eventId: evtId,
                eventName: raw.event_title || raw.eventName || event?.title || 'Unknown Event',
                promoLink: finalLink,
                clicks: raw.clicks || 0, 
                sales: raw.sales_count || raw.sales || 0,
                commissionPct: commissionRate, 
                earned: earnedAmount,
                status: raw.status || 'active'
            };
        });

    } catch (e) {
        console.warn("[WARN] Failed to load promotions for profile (non-critical)", e);
    }
    
    let payouts: Payout[] = [];
    
    return mapApiUserToFrontend(me, promoStats, payouts);
};

export const getUserPayoutRequests = async (): Promise<PayoutRequest[]> => {
    console.info(`[ACTION] getUserPayoutRequests`);
    try {
        return await request<PayoutRequest[]>('/payouts/mine');
    } catch (e) {
        console.warn("Failed to fetch user payout requests, returning empty.", e);
        return [];
    }
};

export const requestPasswordReset = (email: string) => {
    console.info(`[ACTION] requestPasswordReset: ${email}`);
    return request('/auth/forgot-password', { method: 'POST', body: JSON.stringify({ email }) });
};

export const changePassword = (userId: string, current: string, newPass: string) => {
    console.info(`[ACTION] changePassword: ${userId}`);
    return request('/auth/change-password', { method: 'POST', body: JSON.stringify({ current_password: current, new_password: newPass }) });
};

export const deleteAccount = (userId: string) => {
    console.info(`[ACTION] deleteAccount: ${userId}`);
    return request(`/users/${userId}`, { method: 'DELETE' });
};

export const updateNotificationPreferences = (userId: string, prefs: NotificationPreferences) => {
    console.info(`[ACTION] updateNotificationPreferences: ${userId}`);
    return request<User>(`/users/${userId}/notifications`, { method: 'PUT', body: JSON.stringify(prefs) });
};

export const updateUser = (userId: string, data: Partial<User>) => {
    console.info(`[ACTION] updateUser: ${userId}`);
    return request<User>(`/users/${userId}`, { method: 'PATCH', body: JSON.stringify(data) });
};

export const updateUserStatus = (userId: string, status: boolean) => {
    console.info(`[ACTION] updateUserStatus: ${userId} -> disabled: ${status}`);
    return request<User>(`/admin/users/${userId}/status`, { method: 'PUT', body: JSON.stringify({ is_disabled: status }) });
};

export const getAllUsersAdmin = async (page: number, limit: number, search: string) => {
    console.info(`[ACTION] getAllUsersAdmin: Page ${page}`);
    const res = await request<{ users: any[], total: number }>(`/admin/users?page=${page}&limit=${limit}&search=${encodeURIComponent(search)}`);
    return {
        users: (res.users || []).map(u => mapApiUserToFrontend(u)),
        total: res.total || 0
    };
};

export const getStripeConnectionStatus = () => {
    console.info(`[ACTION] getStripeConnectionStatus`);
    return request<{ connected: boolean, accountId: string | null }>('/users/me/stripe/status');
};

export const connectStripeAccount = () => {
    console.info(`[ACTION] connectStripeAccount`);
    return request<{ success: boolean, accountId: string }>('/users/me/stripe/connect', { method: 'POST' });
};

export const disconnectStripeAccount = () => {
    console.info(`[ACTION] disconnectStripeAccount`);
    return request('/users/me/stripe/disconnect', { method: 'POST' });
};

export const getHostFinancials = async (userId: string): Promise<HostFinancials> => {
    console.info(`[ACTION] getHostFinancials: ${userId}`);
    const raw = await request<any>(`/users/${userId}/financials`);
    return {
        grossVolume: typeof raw.grossVolume === 'number' ? raw.grossVolume : 0,
        platformFees: typeof raw.platformFees === 'number' ? raw.platformFees : 0,
        netRevenue: typeof raw.netRevenue === 'number' ? raw.netRevenue : 0,
        pendingBalance: typeof raw.pendingBalance === 'number' ? raw.pendingBalance : (raw.balance || 0),
        totalPayouts: typeof raw.totalPayouts === 'number' ? raw.totalPayouts : 0,
        payouts: Array.isArray(raw.payouts) ? raw.payouts : []
    };
};

export const getLedgerHistory = async (userId: string): Promise<LedgerEntry[]> => {
    console.info(`[ACTION] getLedgerHistory: ${userId}`);
    try {
        const raw = await request<any[]>(`/users/${userId}/ledger`);
        return raw.map(entry => ({
            id: entry.id,
            userId: entry.user_id,
            type: entry.type,
            amount: entry.amount,
            referenceId: entry.reference_id,
            description: entry.description,
            status: entry.status,
            createdAt: entry.created_at
        }));
    } catch (e) {
        console.warn("Failed to fetch ledger history", e);
        return [];
    }
};

export const getProfileForView = (id: string) => {
    console.info(`[ACTION] getProfileForView: ${id}`);
    return request<User>(`/users/${id}/public`); 
};

export const updateUserProfile = (id: string, data: any) => {
    console.info(`[ACTION] updateUserProfile: ${id}`);
    return request<User>(`/users/${id}/profile`, { method: 'PUT', body: JSON.stringify(data) });
};

export const getAllArtists = () => {
    console.info(`[ACTION] getAllArtists`);
    return request<User[]>('/artists');
};

export const connectUserStripe = async (userId: string) => {
    console.info(`[ACTION] connectUserStripe: ${userId}`);
    return await request<any>('/users/me/stripe/connect', { method: 'POST' });
};

export const disconnectUserStripe = async (userId: string) => {
    console.info(`[ACTION] disconnectUserStripe: ${userId}`);
    return await request<any>('/users/me/stripe/disconnect', { method: 'POST' });
};

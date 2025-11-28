
import { Event, User, Host, PromoStat, ReportData, Order, SalesByTicketType, PromoterReport, PromoCode, OrderLineItem, LeaderboardEntry, CheckoutCart, Competition, VenueArea, ScheduleItem, ArtistProfile, EmailDraft, EmailCampaign, TargetRole, CompetitionForm, PurchasedTicket, PayoutRequest, NotificationPreferences, HostFinancials, SystemEmailTemplate, SystemEmailTrigger, SystemSettings, TicketOption, Review, Payout } from '../types';
import { v4 as uuidv4 } from 'uuid';
import { createEventSlug } from '../utils/url';
import * as emailService from './emailService';

// Update Base URL to use HTTPS as requested
const getBaseUrl = () => {
    return 'https://api.eventsta.com:8181/eventsta';
};

const API_URL = getBaseUrl();

// --- LOCAL STORAGE HELPERS ---
const getToken = (): string | null => localStorage.getItem('auth_token');
const setToken = (token: string) => localStorage.setItem('auth_token', token);
const removeToken = () => localStorage.removeItem('auth_token');

// --- MOCK DATA FOR DEMO LOGIN ONLY ---
// This is RETAINED specifically for the "Demo Login" feature, which is not a fallback but a specific feature.
const MOCK_USER = {
    id: 'demo_user',
    name: 'Demo User',
    email: 'demo@eventsta.com',
    role: 'USER',
    stripe_connected: false,
    stripe_account_id: null
};

// --- API CLIENT ---
async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const token = getToken();
    const headers: any = {
        'Content-Type': 'application/json',
        ...(options.headers || {}),
    };

    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    const url = `${API_URL}${endpoint}`;
    const method = options.method || 'GET';
    const timestamp = new Date().toISOString().split('T')[1].slice(0, -1); // HH:mm:ss.sss

    // LOGGING: REQUEST
    console.log(`[${timestamp}] 📡 [API REQ] ${method} ${url}`);
    if (options.body) {
        console.log("TX Data:", options.body);
    }
    
    // Check for mixed content issues early
    const isMixedContent = typeof window !== 'undefined' && window.location.protocol === 'https:' && url.startsWith('http:');

    try {
        if (isMixedContent) {
            throw new Error("Mixed Content Blocked: The page is loaded over HTTPS but is requesting an insecure HTTP API.");
        }

        const response = await fetch(url, { ...options, headers });
        const text = await response.text();

        // LOGGING: RESPONSE
        console.log(`[${timestamp}] 📥 [API RES] ${response.status} ${url}`);
        if (text) {
             console.log("RX Data:", text);
        }

        if (!response.ok) {
            let errorMessage = `HTTP Error: ${response.status} ${response.statusText}`;
            let data;
            try {
                // Try to parse JSON error message from backend (e.g. {"error": "Unauthorized"})
                if (text) {
                    data = JSON.parse(text);
                    if (data.error) errorMessage = data.error;
                    else if (data.message) errorMessage = data.message;
                }
            } catch (e) {
                // If not JSON, use the raw text if available
                if (text && text.length < 200) errorMessage = text;
            }
            throw new Error(errorMessage);
        }

        let data;
        try {
            data = text ? JSON.parse(text) : {};
        } catch(e) {
            data = {};
        }
        return data as T;
    } catch (error: any) {
        const timestampErr = new Date().toISOString().split('T')[1].slice(0, -1);
        let failureReason = error.message || 'Unknown Error';
        
        // Diagnose common fetch failures
        if (error.name === 'TypeError' && error.message === 'Failed to fetch') {
             if (typeof navigator !== 'undefined' && !navigator.onLine) {
                 failureReason = "Offline: Device is not connected to the internet.";
             } else if (isMixedContent) {
                 failureReason = "Mixed Content: Browser blocked insecure HTTP request from HTTPS origin.";
             } else {
                 failureReason = "Network/CORS Error: The server is unreachable, refused connection, or CORS headers are missing.";
             }
        } else if (isMixedContent) {
             failureReason = "Mixed Content Blocked: Browser security prevented HTTP request.";
        }

        console.group(`❌ [API FAILURE] ${method} ${url}`);
        console.error(`Time: ${timestampErr}`);
        console.error(`Reason: ${failureReason}`);
        console.error(`Origin: ${typeof window !== 'undefined' ? window.location.origin : 'Server'}`);
        console.error(`Target: ${url}`);
        // console.error(`Stack:`, error.stack); // Optional: reduced noise
        console.groupEnd();
        
        // Re-throw to ensure caller knows it failed
        throw error;
    }
}

// --- AUTHENTICATION ---

export const checkUserExists = async (email: string): Promise<boolean> => {
    console.info(`[ACTION] checkUserExists: Checking ${email}`);
    // REMOVED: try/catch fallback. If API fails, UI should know.
    const res = await request<{ exists: boolean }>(`/auth/check?email=${encodeURIComponent(email)}`);
    return res.exists;
};

export const registerUser = async (email: string, name: string, role: 'attendee' | 'host', password?: string): Promise<User> => {
    console.info(`[ACTION] registerUser: Registering ${email} as ${role}`);
    // SECURITY FIX: Always send role as 'USER'. Do not allow frontend to request 'ADMIN'.
    // Hosts are just users who have created a host profile.
    const res = await request<any>('/auth/register', {
        method: 'POST',
        body: JSON.stringify({ 
            email, 
            password: password || 'placeholder123', 
            name, 
            role: 'USER' // Enforce USER role
        })
    });
    if (res.token) setToken(res.token);
    return mapApiUserToFrontend(res.user);
};

export const signIn = async (provider: string, credentials?: string): Promise<User> => {
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
    
    if (provider === 'email' && credentials) {
        const parts = credentials.split('|');
        const email = parts[0];
        // Join back the rest in case password contains pipes
        const password = parts.slice(1).join('|'); 
        bodyPayload = { email, password };
    } else {
        // Provider flow (e.g. google-one-tap)
        bodyPayload = { 
            password: 'placeholder-provider-login', 
            provider_token: credentials 
        };
    }

    const res = await request<any>('/auth/login', {
        method: 'POST',
        body: JSON.stringify(bodyPayload) 
    });
    if (res.token) setToken(res.token);
    return mapApiUserToFrontend(res.user);
};

export const loginWithPassword = async (email: string, password: string): Promise<User> => {
    console.info(`[ACTION] loginWithPassword: ${email}`);
    const res = await request<any>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password })
    });
    if (res.token) setToken(res.token);
    return mapApiUserToFrontend(res.user);
};

export const getUserProfile = async (): Promise<User> => {
    console.info(`[ACTION] getUserProfile: Fetching 'me'`);
    const me = await request<any>('/users/me');
    
    let promoStats: PromoStat[] = [];
    try {
        promoStats = await request<PromoStat[]>('/promotions/mine');
    } catch (e) {
        console.warn("[WARN] Failed to load promotions for profile (non-critical)", e);
    }
    
    let payouts: Payout[] = [];
    // If we have other non-critical endpoints, we can try/catch them individually, but 'me' must succeed.
    
    return mapApiUserToFrontend(me, promoStats, payouts);
};

export const getUsersByIds = async (ids: string[]): Promise<User[]> => {
    console.info(`[ACTION] getUsersByIds: Fetching ${ids.length} users`);
    if (ids.length === 0) return [];
    const users = await request<any[]>(`/users?ids=${ids.join(',')}`);
    return users.map(u => mapApiUserToFrontend(u));
};

// --- EVENTS ---

export const getFeaturedEvents = async (): Promise<Event[]> => {
    console.info(`[ACTION] getFeaturedEvents: Loading homepage events`);
    const events = await request<any[]>('/events');
    return events.map(mapApiEventToFrontend);
};

export const getEventDetails = async (id: string): Promise<Event> => {
    console.info(`[ACTION] getEventDetails: Fetching ${id}`);
    const event = await request<any>(`/events/${id}`);
    return mapApiEventToFrontend(event);
};

export const createEvent = async (userId: string, hostId: string, eventData: Partial<Event>): Promise<Event> => {
    console.info(`[ACTION] createEvent: User ${userId} creating event for Host ${hostId}`);
    const res = await request<any>('/events', {
        method: 'POST',
        body: JSON.stringify({ ...eventData, host_id: hostId })
    });
    return mapApiEventToFrontend(res);
};

export const updateEvent = async (userId: string, eventId: string, updates: Partial<Event>): Promise<Event> => {
    console.info(`[ACTION] updateEvent: Updating ${eventId}`);
    const res = await request<any>(`/events/${eventId}`, {
        method: 'PATCH',
        body: JSON.stringify(updates)
    });
    return mapApiEventToFrontend(res);
};

export const getEventsByIds = async (ids: string[]): Promise<Event[]> => {
    console.info(`[ACTION] getEventsByIds: Fetching ${ids.length} events`);
    if (ids.length === 0) return [];
    const events = await request<any[]>(`/events?ids=${ids.join(',')}`);
    return events.map(mapApiEventToFrontend);
};

export const getOtherEventsByHost = async (hostId: string, excludeEventId: string): Promise<Event[]> => {
    console.info(`[ACTION] getOtherEventsByHost: Host ${hostId} excluding ${excludeEventId}`);
    const events = await request<any[]>(`/events?host_id=${hostId}&exclude=${excludeEventId}`);
    return events.map(mapApiEventToFrontend);
};

// --- TICKETING & ORDERS ---

export const purchaseTicket = async (userId: string, eventId: string, cart: CheckoutCart, recipientUserId?: string, promoCode?: string, fees?: any): Promise<void> => {
    console.info(`[ACTION] purchaseTicket: User ${userId} purchasing for Event ${eventId}`);
    await request<any>('/orders/checkout', {
        method: 'POST',
        body: JSON.stringify({ event_id: eventId, items: cart, recipient_user_id: recipientUserId, promo_code: promoCode, fees })
    });
};

export const getOrdersForEvent = async (eventId: string): Promise<Order[]> => {
    console.info(`[ACTION] getOrdersForEvent: Fetching orders for ${eventId}`);
    return await request<Order[]>(`/events/${eventId}/orders`);
};

export const validateTicket = async (eventId: string, ticketData: string): Promise<{valid: boolean, message: string, ticket?: any}> => {
    console.info(`[ACTION] validateTicket: Validating for Event ${eventId}`);
    return await request<{valid: boolean, message: string, ticket?: any}>('/check-in/validate', {
        method: 'POST',
        body: JSON.stringify({ event_id: eventId, qr_data: ticketData })
    });
};

export const checkInTicket = async (eventId: string, ticketId: string): Promise<void> => {
    console.info(`[ACTION] checkInTicket: Checking in ticket ${ticketId}`);
    await request('/check-in/commit', { method: 'POST', body: JSON.stringify({ event_id: eventId, ticket_id: ticketId }) });
};

// --- HOSTS ---

export const getHostDetails = async (id: string): Promise<Host> => {
    console.info(`[ACTION] getHostDetails: Fetching ${id}`);
    return await request<Host>(`/hosts/${id}`);
};

export const getHostsByIds = async (ids: string[]): Promise<Host[]> => {
    console.info(`[ACTION] getHostsByIds: Fetching ${ids.length} hosts`);
    return await request<Host[]>(`/hosts?ids=${ids.join(',')}`);
};

export const createHost = async (userId: string, name: string): Promise<Host> => {
    console.info(`[ACTION] createHost: User ${userId} creating host "${name}"`);
    const res = await request<any>('/hosts', { method: 'POST', body: JSON.stringify({ name }) });
    return res;
};

export const getHostReviews = async (hostId: string): Promise<Review[]> => { 
    console.info(`[ACTION] getHostReviews: Fetching for ${hostId}`);
    return await request<Review[]>(`/hosts/${hostId}/reviews`);
};

export const createHostReview = async (hostId: string, review: any): Promise<void> => {
    console.info(`[ACTION] createHostReview: Reviewing ${hostId}`);
    await request(`/hosts/${hostId}/reviews`, { method: 'POST', body: JSON.stringify(review) });
};

// --- SYSTEM ADMIN ---

export const getSystemStats = async () => { 
    console.info(`[ACTION] getSystemStats`);
    const raw = await request<any>('/admin/stats'); 
    // Safely map snake_case or missing fields to ensure UI doesn't crash
    return {
        totalUsers: raw.totalUsers || raw.total_users || 0,
        totalEvents: raw.totalEvents || raw.total_events || 0,
        grossVolume: raw.grossVolume || raw.gross_volume || 0,
        platformFees: raw.platformFees || raw.platform_fees || 0
    };
};
export const getAllUsersAdmin = async (page: number, limit: number, search: string) => {
    console.info(`[ACTION] getAllUsersAdmin: Page ${page}`);
    return await request<{ users: User[], total: number }>(`/admin/users?page=${page}&limit=${limit}&search=${encodeURIComponent(search)}`);
};
export const getSystemSettings = async (): Promise<SystemSettings> => {
    console.info(`[ACTION] getSystemSettings`);
    const raw = await request<any>('/system/settings');
    
    // Helper to safely parse numbers and handle NaN/null/undefined
    const parseNum = (val: any, fallback: number) => {
        const n = parseFloat(val);
        return isNaN(n) ? fallback : n;
    };

    // Map snake_case to camelCase
    return {
        platformName: raw.platformName || raw.platform_name || 'Eventsta',
        supportEmail: raw.supportEmail || raw.support_email || '',
        platformFeePercent: parseNum(raw.platformFeePercent ?? raw.platform_fee_percent, 5.9),
        platformFeeFixed: parseNum(raw.platformFeeFixed ?? raw.platform_fee_fixed, 0.35),
        maintenanceMode: !!(raw.maintenanceMode ?? raw.maintenance_mode),
        disableRegistration: !!(raw.disableRegistration ?? raw.disable_registration),
    };
};
export const updateSystemSettings = async (settings: SystemSettings): Promise<SystemSettings> => {
    console.info(`[ACTION] updateSystemSettings`);
    return await request<SystemSettings>('/system/settings', { method: 'PUT', body: JSON.stringify(settings) });
};
export const getEmailDrafts = async (): Promise<EmailDraft[]> => {
    console.info(`[ACTION] getEmailDrafts`);
    return await request<EmailDraft[]>('/admin/email/drafts');
};
export const getSystemEmailTemplates = async (): Promise<SystemEmailTemplate[]> => {
    console.info(`[ACTION] getSystemEmailTemplates`);
    return await request<SystemEmailTemplate[]>('/admin/email/system-templates');
};
export const launchEmailCampaign = async (id: string, role: TargetRole): Promise<EmailCampaign> => {
    console.info(`[ACTION] launchEmailCampaign: Draft ${id} to ${role}`);
    return await request<EmailCampaign>('/admin/email/campaigns', { method: 'POST', body: JSON.stringify({ draft_id: id, target_role: role }) });
};

// --- UTILITIES & MAPPERS ---

function parseImages(input: any): string[] {
    if (Array.isArray(input)) return input;
    if (typeof input === 'string') return input.split(',').filter(s => s.trim() !== '');
    return [];
}

function mapApiUserToFrontend(apiUser: any, promoStats: PromoStat[] = [], payouts: Payout[] = []): User {
    // STRICT SECURITY CHECK:
    // Only map to System Admin if the backend explicitly sets the boolean flag `isSystemAdmin`
    // or if the role is specifically 'SUPER_ADMIN'.
    // Do NOT strictly trust `role: 'ADMIN'` as legacy/bad logic might set that for Hosts.
    const isActuallyAdmin = apiUser.isSystemAdmin === true || apiUser.role === 'SUPER_ADMIN';

    return {
        id: apiUser.id,
        name: apiUser.name,
        email: apiUser.email,
        managedHostIds: apiUser.managedHostIds || [],
        purchasedTickets: apiUser.purchasedTickets || [],
        promoStats: promoStats,
        payouts: payouts,
        isSystemAdmin: isActuallyAdmin,
        stripeConnected: apiUser.stripe_connected,
        stripeAccountId: apiUser.stripe_account_id,
        artistProfile: apiUser.artist_profile,
        notificationPreferences: apiUser.notification_preferences,
        isDisabled: apiUser.is_disabled
    };
}

function mapApiEventToFrontend(apiEvent: any): Event {
    let schedule = [];
    let venueAreas = [];
    
    if (Array.isArray(apiEvent.schedule)) {
        schedule = apiEvent.schedule;
    }
    
    if (Array.isArray(apiEvent.venueAreas)) {
        venueAreas = apiEvent.venueAreas;
    }

    return {
        id: apiEvent.id,
        title: apiEvent.title,
        hostId: apiEvent.hostId || apiEvent.host_id,
        hostName: apiEvent.hostName || "Host",
        date: apiEvent.date || apiEvent.start_date,
        endDate: apiEvent.endDate || apiEvent.end_date || apiEvent.date,
        location: apiEvent.location || 'TBD',
        imageUrls: parseImages(apiEvent.imageUrls || apiEvent.images),
        description: apiEvent.description || '',
        commission: apiEvent.commission || apiEvent.commission_rate || 0,
        defaultPromoDiscount: apiEvent.defaultPromoDiscount || apiEvent.promo_discount_rate || 0,
        type: (apiEvent.type?.toLowerCase() as 'ticketed' | 'fundraiser') || 'ticketed',
        status: apiEvent.status || 'DRAFT',
        tickets: (apiEvent.inventory || []).map((inv: any) => ({
            id: inv.id,
            type: inv.type,
            price: inv.price,
            quantity: inv.quantity_total,
            sold: inv.quantity_sold,
            minimumDonation: inv.min_donation
        })),
        addOns: apiEvent.addOns || [],
        venueAreas: venueAreas,
        schedule: schedule,
        competitions: apiEvent.competitions || [],
        forms: apiEvent.forms || [],
        checkIns: apiEvent.checkIns || {}
    };
}

// --- REMAINING EXPORTS ---
export const getReportData = async (eventId: string): Promise<ReportData> => {
    console.info(`[ACTION] getReportData: ${eventId}`);
    return await request<ReportData>(`/events/${eventId}/report`);
};
export const generateEventDescription = async (title: string, current: string) => {
    console.info(`[ACTION] generateEventDescription: ${title}`);
    const res = await request<any>('/ai/generate-description', { method: 'POST', body: JSON.stringify({ title, current }) });
    return res.description;
};
export const connectUserStripe = async (userId: string) => {
    console.info(`[ACTION] connectUserStripe: ${userId}`);
    return await request<any>('/users/me/stripe/connect', { method: 'POST' });
};
export const disconnectUserStripe = async (userId: string) => {
    console.info(`[ACTION] disconnectUserStripe: ${userId}`);
    return await request<any>('/users/me/stripe/disconnect', { method: 'POST' });
};
export const requestEarlyPayout = async (userId: string, amount: number) => {
    console.info(`[ACTION] requestEarlyPayout: ${userId} for $${amount}`);
    return await request<any>('/payouts/request', { method: 'POST', body: JSON.stringify({ amount }) });
};
export const getPayoutRequests = async (): Promise<PayoutRequest[]> => {
    console.info(`[ACTION] getPayoutRequests`);
    return await request<PayoutRequest[]>('/admin/payouts');
};
export const getEmailCampaigns = () => {
    console.info(`[ACTION] getEmailCampaigns`);
    return request<EmailCampaign[]>('/admin/email/campaigns');
};
export const saveEmailDraft = (d: EmailDraft) => {
    console.info(`[ACTION] saveEmailDraft`);
    return request('/admin/email/drafts', { method: 'POST', body: JSON.stringify(d) });
};
export const deleteEmailDraft = (id: string) => {
    console.info(`[ACTION] deleteEmailDraft: ${id}`);
    return request(`/admin/email/drafts/${id}`, { method: 'DELETE' });
};
export const approvePayoutRequests = (ids: string[]) => {
    console.info(`[ACTION] approvePayoutRequests: ${ids.length} items`);
    return request('/admin/payouts/approve', { method: 'POST', body: JSON.stringify({ ids }) });
};
export const getSystemEmailTemplate = (t: SystemEmailTrigger) => {
    console.info(`[ACTION] getSystemEmailTemplate: ${t}`);
    return request<SystemEmailTemplate>(`/admin/email/system-templates/${t}`);
};
export const updateSystemEmailTemplate = (t: SystemEmailTrigger, data: any) => {
    console.info(`[ACTION] updateSystemEmailTemplate: ${t}`);
    return request(`/admin/email/system-templates/${t}`, { method: 'PUT', body: JSON.stringify(data) });
};
export const deleteHost = (userId: string, hostId: string) => {
    console.info(`[ACTION] deleteHost: ${hostId}`);
    return request(`/hosts/${hostId}`, { method: 'DELETE' });
};
export const updateHostDetails = (id: string, data: Partial<Host>) => {
    console.info(`[ACTION] updateHostDetails: ${id}`);
    return request<Host>(`/hosts/${id}`, { method: 'PATCH', body: JSON.stringify(data) });
};
export const getProfileForView = (id: string) => {
    console.info(`[ACTION] getProfileForView: ${id}`);
    return request<User>(`/users/${id}/public`); 
};
export const updateUserProfile = (id: string, data: any) => {
    console.info(`[ACTION] updateUserProfile: ${id}`);
    return request<User>(`/users/${id}/profile`, { method: 'PUT', body: JSON.stringify(data) });
};
export const undoCheckIn = (eventId: string, ticketId: string) => {
    console.info(`[ACTION] undoCheckIn: ${ticketId}`);
    return request('/check-in/undo', { method: 'POST', body: JSON.stringify({ event_id: eventId, ticket_id: ticketId }) });
};
export const getOrderDetails = (id: string) => {
    console.info(`[ACTION] getOrderDetails: ${id}`);
    return request<Order>(`/orders/${id}`);
};
export const refundOrder = (userId: string, orderId: string) => {
    console.info(`[ACTION] refundOrder: ${orderId}`);
    return request<Order>(`/orders/${orderId}/refund`, { method: 'POST' });
};
export const getPromoCodesForEvent = (eventId: string) => {
    console.info(`[ACTION] getPromoCodesForEvent: ${eventId}`);
    return request<PromoCode[]>(`/events/${eventId}/promocodes`);
};
export const createPromoCode = (userId: string, eventId: string, data: any) => {
    console.info(`[ACTION] createPromoCode: Event ${eventId}`);
    return request<PromoCode>(`/events/${eventId}/promocodes`, { method: 'POST', body: JSON.stringify(data) });
};
export const deletePromoCode = (userId: string, eventId: string, codeId: string) => {
    console.info(`[ACTION] deletePromoCode: ${codeId}`);
    return request<{ success: boolean }>(`/events/${eventId}/promocodes/${codeId}`, { method: 'DELETE' });
};
export const getCompetitionLeaderboard = (eventId: string) => {
    console.info(`[ACTION] getCompetitionLeaderboard: ${eventId}`);
    return request<LeaderboardEntry[]>(`/competitions/${eventId}/leaderboard`); 
};
export const joinCompetition = (userId: string, event: Event) => {
    console.info(`[ACTION] joinCompetition: User ${userId} -> Event ${event.id}`);
    return request('/promotions/join', { method: 'POST', body: JSON.stringify({ event_id: event.id }) });
};
export const startPromotion = (userId: string, event: Event) => {
    console.info(`[ACTION] startPromotion: User ${userId} -> Event ${event.id}`);
    return request('/promotions/join', { method: 'POST', body: JSON.stringify({ event_id: event.id }) });
};
export const stopPromotion = (userId: string, eventId: string) => {
    console.info(`[ACTION] stopPromotion: ${eventId}`);
    return request(`/promotions/${eventId}`, { method: 'DELETE' });
};
export const getPublicForm = (formId: string) => {
    console.info(`[ACTION] getPublicForm: ${formId}`);
    return request<CompetitionForm>(`/forms/${formId}`);
};
export const submitFormResponse = (formId: string, data: any) => {
    console.info(`[ACTION] submitFormResponse: ${formId}`);
    return request(`/forms/${formId}/submit`, { method: 'POST', body: JSON.stringify(data) });
};
export const getFormResponses = (formId: string) => {
    console.info(`[ACTION] getFormResponses: ${formId}`);
    return request<any[]>(`/forms/${formId}/responses`);
};
export const getHostFinancials = (userId: string) => {
    console.info(`[ACTION] getHostFinancials: ${userId}`);
    return request<HostFinancials>(`/users/${userId}/financials`);
};
export const getAllEventsAdmin = async (page: number, limit: number, search: string) => {
    console.info(`[ACTION] getAllEventsAdmin`);
    const res = await request<{ events: any[], total: number }>(`/admin/events?page=${page}&limit=${limit}&search=${encodeURIComponent(search)}`);
    return { events: res.events.map(mapApiEventToFrontend), total: res.total };
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
export const cancelCampaign = (id: string) => {
    console.info(`[ACTION] cancelCampaign: ${id}`);
    return request<EmailCampaign>(`/admin/email/campaigns/${id}/cancel`, { method: 'POST' });
};
export const updateUser = (userId: string, data: Partial<User>) => {
    console.info(`[ACTION] updateUser: ${userId}`);
    return request<User>(`/users/${userId}`, { method: 'PATCH', body: JSON.stringify(data) });
};
export const updateUserStatus = (userId: string, status: boolean) => {
    console.info(`[ACTION] updateUserStatus: ${userId} -> disabled: ${status}`);
    return request<User>(`/admin/users/${userId}/status`, { method: 'PUT', body: JSON.stringify({ is_disabled: status }) });
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
export const getAllArtists = () => {
    console.info(`[ACTION] getAllArtists`);
    return request<User[]>('/artists');
};
export const getMockLocations = () => {
    console.info(`[ACTION] getMockLocations`);
    // Previously mocked, now requesting real backend location hints if available
    return request<string[]>('/locations');
};
export const getRawEvent = (id: string) => {
    console.warn(`[DEPRECATED] getRawEvent called for ${id}. This function is removed.`);
    return undefined; 
};
export const finalizeCompetition = (userId: string, eventId: string, compId: string) => {
    console.info(`[ACTION] finalizeCompetition: ${compId}`);
    return request(`/competitions/${eventId}/${compId}/finalize`, { method: 'POST' });
};

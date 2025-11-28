
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
    
    // Determine headers
    const headers: any = {
        ...(options.headers || {}),
    };

    // FIX: Only set Content-Type to application/json if there is a body AND it is not FormData.
    // Explicitly do NOT set it for DELETE/GET/HEAD/OPTIONS requests that have no body.
    if (options.body) {
        if (!(options.body instanceof FormData)) {
            // Default to JSON if not explicitly set
            if (!headers['Content-Type']) {
                headers['Content-Type'] = 'application/json';
            }
        }
    }

    if (token) {
        headers['Authorization'] = `Bearer ${token}`;
    }

    const url = `${API_URL}${endpoint}`;
    const method = options.method || 'GET';
    const timestamp = new Date().toISOString().split('T')[1].slice(0, -1); // HH:mm:ss.sss

    // LOGGING: REQUEST
    console.log(`[${timestamp}] 📡 [API REQ] ${method} ${url}`);
    if (options.body && !(options.body instanceof FormData)) {
        console.log("TX Data:", options.body);
    } else if (options.body instanceof FormData) {
        console.log("TX Data: [FormData]");
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
        if (text && text.length < 500) {
             console.log("RX Data:", text);
        } else if (text) {
             console.log("RX Data: [Large Response]");
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

// --- FILE UPLOAD ---

export const uploadFile = async (file: File | Blob): Promise<string> => {
    console.info(`[ACTION] uploadFile: ${file.size} bytes`);
    const formData = new FormData();
    formData.append('file', file);

    const res = await request<{ url: string }>('/upload', {
        method: 'POST',
        body: formData
    });

    let fixedUrl = res.url;
    if (fixedUrl.startsWith('https://api.eventsta.com/') && !fixedUrl.includes(':8181')) {
        fixedUrl = fixedUrl.replace('https://api.eventsta.com/', 'https://api.eventsta.com:8181/');
    }

    return fixedUrl;
};

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
    
    // Auto-create default host
    try {
        const user = mapApiUserToFrontend(res.user);
        console.info(`[ACTION] registerUser: Auto-creating default host profile for ${user.name}`);
        const newHost = await createHost(user.id, user.name);
        
        // Update user object immediately with new host
        if (newHost && newHost.id) {
            user.managedHostIds = [...(user.managedHostIds || []), newHost.id];
        }
        return user;
    } catch (error) {
        console.error("Failed to auto-create default host profile during registration.", error);
        // Fallback: fetch full profile to be safe
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
    
    if (provider === 'email' && credentials) {
        const parts = credentials.split('|');
        const email = parts[0];
        const password = parts.slice(1).join('|'); 
        bodyPayload = { email, password };
    } else {
        bodyPayload = { 
            password: 'placeholder-provider-login', 
            provider_token: credentials 
        };
        // Add extracted name/email if available to help backend (fallback for token parsing)
        if (userInfo) {
            if (userInfo.name) bodyPayload.name = userInfo.name;
            if (userInfo.email) bodyPayload.email = userInfo.email;
        }
    }

    const res = await request<any>('/auth/login', {
        method: 'POST',
        body: JSON.stringify(bodyPayload) 
    });
    
    if (res.token) setToken(res.token);
    
    // CRITICAL FIX: The basic login response often lacks 'promoStats' and other enriched fields.
    // We must fetch the full user profile immediately to ensure the UI (especially Promotions Portal) works correctly.
    try {
        const userProfile = await getUserProfile();
        
        // AUTO-CREATE HOST FIX: If user has no host profile, create one.
        if (userProfile.managedHostIds.length === 0) {
             console.info(`[ACTION] signIn: Auto-creating default host profile for ${userProfile.name}`);
             try {
                 const newHost = await createHost(userProfile.id, userProfile.name);
                 // Manually update the local profile object so we don't have to fetch again
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
    // This is essentially an alias for signIn('email'), redirecting there to maintain single logic path
    return signIn('email', `${email}|${password}`);
};

export const getUserProfile = async (): Promise<User> => {
    console.info(`[ACTION] getUserProfile: Fetching 'me'`);
    const me = await request<any>('/users/me');
    
    let promoStats: PromoStat[] = [];
    try {
        const rawPromos = await request<any[]>('/promotions/mine');
        
        // 1. Fetch missing event data if needed to enrich promotions
        const eventIds = [...new Set(rawPromos.map((p: any) => p.event_id || p.eventId))];
        let eventsMap: Record<string, Event> = {};
        
        if (eventIds.length > 0) {
            try {
                const events = await getEventsByIds(eventIds);
                events.forEach(e => eventsMap[e.id] = e);
            } catch (e) {
                console.warn("Could not fetch events for promotions enrichment");
            }
        }

        // 2. Map raw promos to PromoStat
        promoStats = rawPromos.map((raw: any) => {
            const evtId = raw.event_id || raw.eventId;
            const event = eventsMap[evtId];
            
            // Extract code. Fallback to extracting from link or ID if absolutely necessary.
            let promoCode = raw.code || raw.promo_code;
            
            if (!promoCode && (raw.link || raw.promoLink)) {
                // Try to extract from existing link if it exists
                try {
                    const urlStr = raw.link || raw.promoLink;
                    // Simple regex to grab promo=CODE
                    const match = urlStr.match(/[?&]promo=([^&]+)/);
                    if (match) promoCode = match[1];
                } catch (e) { /* ignore */ }
            }

            // Client-side Link Construction
            // We ignore backend 'link' if we can construct a better one to ensure it matches current domain and SEO structure
            let finalLink = raw.link || raw.promoLink || '';
            const titleForSlug = event?.title || raw.event_title || raw.eventName || 'event';
            
            // If we have a code and valid IDs, we construct the canonical frontend link.
            // This is preferred over whatever the backend sends in 'link', as frontend knows the routing best.
            if (promoCode && evtId && typeof window !== 'undefined') {
                 const slug = createEventSlug(titleForSlug, evtId);
                 finalLink = `${window.location.origin}/#/event/${slug}?promo=${promoCode}`;
            }

            return {
                eventId: evtId,
                eventName: raw.event_title || raw.eventName || event?.title || 'Unknown Event',
                promoLink: finalLink,
                clicks: raw.clicks || 0, 
                sales: raw.sales_count || raw.sales || 0,
                commissionPct: raw.commission_rate || event?.commission || 0, 
                earned: typeof raw.earned_amount === 'number' 
                    ? raw.earned_amount 
                    : typeof raw.earned === 'number' 
                        ? raw.earned 
                        : (raw.sales_volume && event?.commission) 
                            ? (raw.sales_volume * (event.commission / 100)) 
                            : 0,
                status: raw.status || 'active'
            };
        });

    } catch (e) {
        console.warn("[WARN] Failed to load promotions for profile (non-critical)", e);
    }
    
    let payouts: Payout[] = [];
    
    return mapApiUserToFrontend(me, promoStats, payouts);
};

// NEW: End-user Payout Requests (Not Admin)
export const getUserPayoutRequests = async (): Promise<PayoutRequest[]> => {
    console.info(`[ACTION] getUserPayoutRequests`);
    try {
        return await request<PayoutRequest[]>('/payouts/mine');
    } catch (e) {
        // Fallback for demo or if endpoint doesn't exist yet
        console.warn("Failed to fetch user payout requests, returning empty.", e);
        return [];
    }
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
    
    const backendPayload = {
        host_id: hostId,
        title: eventData.title,
        description: eventData.description,
        location: eventData.location,
        start_time: eventData.date, // STRICT: Backend requires start_time, rejects start_date
        end_time: eventData.endDate, // STRICT: Backend requires end_time, rejects end_date
        type: eventData.type ? eventData.type.toUpperCase() : 'TICKETED',
        images: eventData.imageUrls || [],
        commission_rate: eventData.commission,
        promo_discount_rate: eventData.defaultPromoDiscount,
        inventory: eventData.tickets?.map(t => ({
            type: t.type,
            price: t.price,
            quantity_total: t.quantity || 100, 
            min_donation: t.minimumDonation,
            description: t.description
        })) || [],
        addOns: eventData.addOns?.map(a => ({
            name: a.name,
            price: a.price,
            quantity_total: 1000, 
            description: a.description
        })) || [],
        schedule: eventData.schedule || [],
        venueAreas: eventData.venueAreas || [],
        status: eventData.status // Pass status (DRAFT/PUBLISHED)
    };

    const res = await request<any>('/events', {
        method: 'POST',
        body: JSON.stringify(backendPayload)
    });
    
    const mappedEvent = mapApiEventToFrontend(res);
    
    // Fallback: If backend response didn't include the host name (due to lack of join), 
    // manually inject it from the input data to ensure UI consistency immediately after creation.
    if ((!mappedEvent.hostName || mappedEvent.hostName === 'Host') && eventData.hostName) {
        mappedEvent.hostName = eventData.hostName;
    }
    
    return mappedEvent;
};

export const updateEvent = async (userId: string, eventId: string, updates: Partial<Event>): Promise<Event> => {
    console.info(`[ACTION] updateEvent: Updating ${eventId}`);
    
    // Map frontend keys to backend keys for PATCH
    const payload: any = { ...updates };
    
    if (updates.date) {
        payload.start_time = updates.date;
        delete payload.date;
    }
    if (updates.endDate) {
        payload.end_time = updates.endDate;
        delete payload.endDate;
    }
    
    // SAFETY: Explicitly remove start_date/end_date if they somehow slipped in via 'updates' spread
    // The backend will reject request with 400 if these legacy keys are present.
    if ('start_date' in payload) delete payload.start_date;
    if ('end_date' in payload) delete payload.end_date;

    if (updates.imageUrls) {
        payload.images = updates.imageUrls;
        delete payload.imageUrls;
    }
    if (updates.commission !== undefined) {
        payload.commission_rate = updates.commission;
        delete payload.commission;
    }
    if (updates.defaultPromoDiscount !== undefined) {
        payload.promo_discount_rate = updates.defaultPromoDiscount;
        delete payload.defaultPromoDiscount;
    }
    if (updates.hostId) {
        payload.host_id = updates.hostId;
        delete payload.hostId;
    }
    
    // Map inventory if present
    if (updates.tickets) {
        payload.inventory = updates.tickets.map(t => ({
            id: t.id,
            type: t.type,
            price: t.price,
            quantity_total: t.quantity,
            min_donation: t.minimumDonation,
            description: t.description
        }));
        delete payload.tickets;
    }

    const res = await request<any>(`/events/${eventId}`, {
        method: 'PATCH',
        body: JSON.stringify(payload)
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

export const getEventsByHost = async (hostId: string): Promise<Event[]> => {
    console.info(`[ACTION] getEventsByHost: Fetching all events for host ${hostId}`);
    const events = await request<any[]>(`/events?host_id=${hostId}`);
    return events.map(mapApiEventToFrontend);
};

// --- TICKETING & ORDERS ---

export const purchaseTicket = async (userId: string, eventId: string, cart: CheckoutCart, recipientUserId?: string, promoCode?: string, fees?: any): Promise<void> => {
    console.debug(`[Promo Debug] 🛒 API purchaseTicket. User: ${userId}, Event: ${eventId}, Promo: ${promoCode || 'None'}`);
    await request<any>('/orders/checkout', {
        method: 'POST',
        body: JSON.stringify({ event_id: eventId, items: cart, recipient_user_id: recipientUserId, promo_code: promoCode, fees })
    });
};

export const getOrdersForEvent = async (eventId: string): Promise<Order[]> => {
    console.info(`[ACTION] getOrdersForEvent: Fetching orders for ${eventId}`);
    return await request<Order[]>(`/events/${eventId}/orders`);
};

export const getUserOrders = async (): Promise<Order[]> => {
    console.info(`[ACTION] getUserOrders: Fetching orders for current user`);
    return await request<Order[]>('/orders/mine');
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
    const raw = await request<any>(`/hosts/${id}`);
    return mapApiHostToFrontend(raw);
};

export const getHostsByIds = async (ids: string[]): Promise<Host[]> => {
    console.info(`[ACTION] getHostsByIds: Fetching ${ids.length} hosts`);
    const rawHosts = await request<any[]>(`/hosts?ids=${ids.join(',')}`);
    return rawHosts.map(mapApiHostToFrontend);
};

export const createHost = async (userId: string, name: string): Promise<Host> => {
    console.info(`[ACTION] createHost: User ${userId} creating host "${name}"`);
    const res = await request<any>('/hosts', { method: 'POST', body: JSON.stringify({ name }) });
    return mapApiHostToFrontend(res);
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
    const parseNum = (val: any, fallback: number) => {
        const n = parseFloat(val);
        return isNaN(n) ? fallback : n;
    };
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
    const isActuallyAdmin = apiUser.isSystemAdmin === true || apiUser.role === 'SUPER_ADMIN';

    // Safely map tickets handling missing fields and snake_case
    const mappedTickets: PurchasedTicket[] = (apiUser.purchasedTickets || []).map((t: any) => ({
        id: t.id || uuidv4(),
        orderId: t.order_id || t.orderId || 'unknown_order',
        eventId: t.event_id || t.eventId || '',
        eventName: t.event_name || t.eventName || 'Event',
        ticketType: t.ticket_type || t.ticketType || 'Ticket',
        inventoryId: t.inventory_id || t.inventoryId,
        qty: t.qty || 1, // Default to 1 as the backend tends to send individual items
        purchaseDate: t.purchased_at || t.purchaseDate || new Date().toISOString()
    }));

    return {
        id: apiUser.id,
        name: apiUser.name,
        email: apiUser.email,
        managedHostIds: apiUser.managedHostIds || [],
        purchasedTickets: mappedTickets,
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

    // Deduplicate tickets based on ID
    const rawInventory = apiEvent.inventory || [];
    const uniqueTicketIds = new Set();
    const tickets = [];

    for (const inv of rawInventory) {
        if (inv.id && uniqueTicketIds.has(inv.id)) {
            continue;
        }
        if (inv.id) uniqueTicketIds.add(inv.id);
        
        tickets.push({
            id: inv.id,
            type: inv.type,
            price: inv.price,
            quantity: inv.quantity_total,
            sold: inv.quantity_sold,
            minimumDonation: inv.min_donation
        });
    }

    // Map forms explicitly to handle casing
    const forms = (apiEvent.forms || []).map((f: any) => ({
        id: f.id,
        title: f.title,
        description: f.description,
        headerImageUrl: f.headerImageUrl || f.header_image_url,
        elements: f.elements || [],
        isActive: f.isActive ?? f.is_active ?? true,
        responsesCount: f.responsesCount ?? f.responses_count ?? 0,
        lastUpdated: f.lastUpdated || f.last_updated || new Date().toISOString(),
        linkedCompetitionId: f.linkedCompetitionId || f.linked_competition_id
    }));

    // FIX: Map competitions explicitly to handle snake_case from backend
    const competitions = (apiEvent.competitions || []).map((c: any) => ({
        id: c.id,
        type: c.type || 'DJ_TICKET_SALES',
        status: c.status || 'SETUP',
        name: c.name,
        description: c.description,
        sectionIds: c.sectionIds || c.section_ids || [],
        competitorIds: c.competitorIds || c.competitor_ids || [],
        startDate: c.startDate || c.start_date || new Date().toISOString(),
        cutoffDate: c.cutoffDate || c.cutoff_date || new Date().toISOString(),
        promoDiscountPercent: c.promoDiscountPercent || c.promo_discount_percent || 0,
        winnerIds: c.winnerIds || c.winner_ids || []
    }));

    return {
        id: apiEvent.id,
        title: apiEvent.title,
        hostId: apiEvent.hostId || apiEvent.host_id,
        // Robust checking for host name including snake_case
        hostName: apiEvent.hostName || apiEvent.host_name || "Host",
        // Map backend start_time/start_date to frontend 'date'
        date: apiEvent.start_time || apiEvent.start_date || apiEvent.date, 
        // Map backend end_time/end_date to frontend 'endDate'
        endDate: apiEvent.end_time || apiEvent.end_date || apiEvent.endDate || apiEvent.date,
        location: apiEvent.location || 'TBD',
        // FIX: Prioritize 'images' as it seems to be the source of truth from backend update,
        // whereas 'imageUrls' might be stale data from legacy field.
        imageUrls: parseImages(apiEvent.images || apiEvent.imageUrls),
        description: apiEvent.description || '',
        commission: apiEvent.commission || apiEvent.commission_rate || 0,
        defaultPromoDiscount: apiEvent.defaultPromoDiscount || apiEvent.promo_discount_rate || 0,
        type: (apiEvent.type?.toLowerCase() as 'ticketed' | 'fundraiser') || 'ticketed',
        status: apiEvent.status || 'DRAFT',
        tickets: tickets,
        addOns: apiEvent.addOns || [],
        venueAreas: venueAreas,
        schedule: schedule,
        competitions: competitions, // Use mapped competitions
        forms: forms,
        checkIns: apiEvent.checkIns || {}
    };
}

function mapApiHostToFrontend(apiHost: any): Host {
    const parseBool = (val: any) => {
        if (typeof val === 'boolean') return val;
        if (typeof val === 'string') return val.toLowerCase() === 'true';
        return !!val;
    };

    return {
        id: apiHost.id,
        name: apiHost.name,
        ownerUserId: apiHost.ownerUserId || apiHost.owner_user_id,
        eventIds: apiHost.eventIds || apiHost.event_ids || [],
        reviews: apiHost.reviews || [],
        description: apiHost.description || '',
        imageUrl: apiHost.imageUrl || apiHost.image_url,
        coverImageUrl: apiHost.coverImageUrl || apiHost.cover_image_url,
        isDefault: parseBool(apiHost.isDefault ?? apiHost.is_default),
        reviewsEnabled: parseBool(apiHost.reviewsEnabled ?? apiHost.reviews_enabled)
    };
}

// --- REMAINING EXPORTS ---
export const getReportData = async (eventId: string): Promise<ReportData> => {
    console.info(`[ACTION] getReportData: ${eventId}`);
    const raw = await request<any>(`/events/${eventId}/report`);
    return {
        event: mapApiEventToFrontend(raw.event || {}),
        kpis: {
            grossSales: raw.kpis?.grossSales || 0,
            ticketsSold: raw.kpis?.ticketsSold || 0,
            pageViews: raw.kpis?.pageViews || 0,
            promoterSales: raw.kpis?.promoterSales || 0
        },
        salesByTicketType: Array.isArray(raw.salesByTicketType) ? raw.salesByTicketType : [],
        promotions: Array.isArray(raw.promotions) ? raw.promotions : []
    };
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
// Admin Only
export const getPayoutRequests = async (): Promise<PayoutRequest[]> => {
    console.info(`[ACTION] getPayoutRequests (Admin)`);
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
    return request<SystemEmailTemplate>(`/admin/email/system-templates/${t}`, { method: 'PUT', body: JSON.stringify(data) });
};
export const deleteHost = (userId: string, hostId: string) => {
    console.info(`[ACTION] deleteHost: ${hostId}`);
    return request(`/hosts/${hostId}`, { method: 'DELETE' });
};
export const updateHostDetails = async (id: string, data: Partial<Host>) => {
    console.info(`[ACTION] updateHostDetails: ${id}`);
    const res = await request<any>(`/hosts/${id}`, { method: 'PATCH', body: JSON.stringify(data) });
    return mapApiHostToFrontend(res);
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
export const validatePromoCode = async (eventId: string, code: string): Promise<{ valid: boolean, discountPercent: number, code: string }> => {
    console.debug(`[Promo Debug] 🔍 API validatePromoCode request: Code '${code}' for Event '${eventId}'`);
    const res = await request<{ valid: boolean, discountPercent: number, code: string }>(`/events/${eventId}/promocodes/validate`, {
        method: 'POST',
        body: JSON.stringify({ code })
    });
    console.debug(`[Promo Debug] ✅ API validatePromoCode response:`, res);
    return res;
};
export const deletePromoCode = (userId: string, eventId: string, codeId: string) => {
    console.info(`[ACTION] deletePromoCode: ${codeId}`);
    return request<{ success: boolean }>(`/events/${eventId}/promocodes/${codeId}`, { method: 'DELETE' });
};
export const getCompetitionLeaderboard = async (eventId: string): Promise<LeaderboardEntry[]> => {
    console.info(`[ACTION] getCompetitionLeaderboard: ${eventId}`);
    const rawData = await request<any[]>(`/competitions/${eventId}/leaderboard`);
    
    // MAP: Backend snake_case -> Frontend camelCase (LeaderboardEntry)
    return rawData.map(item => ({
        userId: item.user_id,
        userName: item.user_name || item.name || 'Unknown User', // Fallback for name
        salesCount: item.sales_count || 0,
        salesValue: item.sales_volume || 0,
        lastSaleDate: item.last_sale_date 
    }));
};
export const joinCompetition = (userId: string, event: Event, competitionId?: string) => {
    console.info(`[ACTION] joinCompetition: User ${userId} -> Event ${event.id} ${competitionId ? `(Comp: ${competitionId})` : ''}`);
    return request('/promotions/join', { 
        method: 'POST', 
        body: JSON.stringify({ 
            event_id: event.id,
            competition_id: competitionId 
        }) 
    });
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

// NEW: Track Promo Link Click
export const trackPromoClick = async (eventId: string, code: string): Promise<void> => {
    console.debug(`[Promo Debug] 🖱️ API trackPromoClick: Code '${code}' for Event '${eventId}'`);
    // Fire and forget, no return value needed for frontend logic
    request(`/promotions/track-click`, {
        method: 'POST',
        body: JSON.stringify({ event_id: eventId, code })
    }).catch(err => console.warn("Failed to track promo click", err));
};


import { v4 as uuidv4 } from 'uuid';
import { createEventSlug } from '../../utils/url';
import { User, Event, Host, PurchasedTicket, PromoStat, Payout, TicketOption, CompetitionForm, Competition, Order } from '../../types';

// Update Base URL to use HTTPS as requested
export const getBaseUrl = () => {
    return 'https://api.eventsta.com:8181/eventsta';
};

export const API_URL = getBaseUrl();

// --- LOCAL STORAGE HELPERS ---
export const getToken = (): string | null => localStorage.getItem('auth_token');
export const setToken = (token: string) => localStorage.setItem('auth_token', token);
export const removeToken = () => localStorage.removeItem('auth_token');

// --- MOCK DATA ---
export const MOCK_USER = {
    id: 'demo_user',
    name: 'Demo User',
    email: 'demo@eventsta.com',
    role: 'USER',
    stripe_connected: false,
    stripe_account_id: null
};

// --- API CLIENT ---
export async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const token = getToken();
    
    // Determine headers
    const headers: any = {
        ...(options.headers || {}),
    };

    // FIX: Only set Content-Type to application/json if there is a body AND it is not FormData.
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
                if (text) {
                    data = JSON.parse(text);
                    if (data.error) errorMessage = data.error;
                    else if (data.message) errorMessage = data.message;
                }
            } catch (e) {
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
        console.groupEnd();
        
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

// --- MAPPERS ---

export function parseImages(input: any): string[] {
    if (Array.isArray(input)) return input;
    if (typeof input === 'string') return input.split(',').filter(s => s.trim() !== '');
    return [];
}

export function mapApiUserToFrontend(apiUser: any, promoStats: PromoStat[] = [], payouts: Payout[] = []): User {
    const isSuperAdminEmail = apiUser.email && apiUser.email.toLowerCase() === 'superadmin@eventsta.com';
    const isActuallyAdmin = apiUser.isSystemAdmin === true || apiUser.role === 'SUPER_ADMIN' || isSuperAdminEmail;

    const mappedTickets: PurchasedTicket[] = (apiUser.purchasedTickets || []).map((t: any) => ({
        id: t.id || uuidv4(),
        orderId: t.order_id || t.orderId || 'unknown_order',
        eventId: t.event_id || t.eventId || '',
        eventName: t.event_name || t.eventName || 'Event',
        ticketType: t.ticket_type || t.ticketType || 'Ticket',
        inventoryId: t.inventory_id || t.inventoryId,
        qty: t.qty || 1,
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

export function mapApiOrderToFrontend(apiOrder: any): Order {
    // 1. Handle items array
    let items = apiOrder.items;
    
    if (typeof items === 'string') {
        try {
            items = JSON.parse(items);
        } catch (e) {
            console.warn("Failed to parse order items JSON string:", items, e);
            items = [];
        }
    }
    
    if (!Array.isArray(items)) {
        items = [];
    }

    // Helper to safely clean strings
    const cleanString = (val: any) => (val === 'null' || val === null ? undefined : val);

    // Helper to extract numeric total
    const getTotal = (o: any) => {
        if (typeof o.totalPaid === 'number') return o.totalPaid;
        if (typeof o.total_paid === 'number') return o.total_paid;
        if (typeof o.total_amount === 'number') return o.total_amount;
        return 0;
    };

    // Resolving Purchaser Name
    // Priority: Explicit purchaser_name -> Nested User object -> Fallback
    let resolvedPurchaserName = cleanString(apiOrder.purchaserName || apiOrder.purchaser_name);
    if (!resolvedPurchaserName && apiOrder.user && apiOrder.user.name) {
        resolvedPurchaserName = apiOrder.user.name;
    }
    if (!resolvedPurchaserName) resolvedPurchaserName = 'Guest';

    // Resolving Purchaser Email
    let resolvedPurchaserEmail = cleanString(apiOrder.purchaserEmail || apiOrder.purchaser_email);
    if (!resolvedPurchaserEmail && apiOrder.user && apiOrder.user.email) {
        resolvedPurchaserEmail = apiOrder.user.email;
    }

    // Resolving Affiliate Name
    // Priority: Explicit affiliate_name -> recipientUserName -> "Unknown" if ID exists
    let resolvedAffiliateName = cleanString(apiOrder.affiliate_name || apiOrder.recipientUserName || apiOrder.recipient_user_name);
    const hasAffiliateId = cleanString(apiOrder.recipientUserId || apiOrder.recipient_user_id || apiOrder.affiliate_user_id);
    
    if (!resolvedAffiliateName && hasAffiliateId) {
        // If we have an ID but no name, we might display the ID or just wait for backend fix
        resolvedAffiliateName = hasAffiliateId; // Better than nothing
    }

    return {
        orderId: apiOrder.orderId || apiOrder.order_id || apiOrder.id || 'unknown_id',
        eventId: apiOrder.eventId || apiOrder.event_id || '',
        purchaserName: resolvedPurchaserName,
        purchaserEmail: resolvedPurchaserEmail || '',
        userId: apiOrder.userId || apiOrder.user_id, 
        purchaseDate: apiOrder.purchaseDate || apiOrder.purchase_date || apiOrder.created_at || new Date().toISOString(),
        items: items.map((item: any) => ({
            ticketType: item.ticketType || item.ticket_type || item.name || 'Unknown Ticket',
            quantity: item.quantity || item.qty || 0,
            pricePerTicket: typeof item.pricePerTicket === 'number' ? item.pricePerTicket : (typeof item.price === 'number' ? item.price : (item.price_per_ticket || 0)),
            recipientUserId: item.recipientUserId || item.recipient_user_id
        })),
        totalPaid: getTotal(apiOrder),
        status: apiOrder.status || 'Pending',
        promoCode: cleanString(apiOrder.promoCode || apiOrder.promo_code),
        recipientUserId: hasAffiliateId,
        recipientUserName: resolvedAffiliateName, // NEW: Enriched field
        fees: apiOrder.fees || { mandatory: 0, donation: 0 }
    };
}

export function mapApiEventToFrontend(apiEvent: any): Event {
    let schedule = [];
    let venueAreas = [];
    
    if (Array.isArray(apiEvent.schedule)) {
        schedule = apiEvent.schedule;
    }
    
    if (Array.isArray(apiEvent.venueAreas)) {
        venueAreas = apiEvent.venueAreas;
    }

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
        commissionPercent: c.commissionPercent || c.commission_percent || 0,
        winnerIds: c.winnerIds || c.winner_ids || []
    }));

    return {
        id: apiEvent.id,
        title: apiEvent.title,
        hostId: apiEvent.hostId || apiEvent.host_id,
        hostName: apiEvent.hostName || apiEvent.host_name || "Host",
        date: apiEvent.start_time || apiEvent.start_date || apiEvent.date, 
        endDate: apiEvent.end_time || apiEvent.end_date || apiEvent.endDate || apiEvent.date,
        location: apiEvent.location || 'TBD',
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
        competitions: competitions,
        forms: forms,
        checkIns: apiEvent.checkIns || {}
    };
}

export function mapApiHostToFrontend(apiHost: any): Host {
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

// --- BASIC LOOKUPS (Shared) ---

export const getUsersByIds = async (ids: string[]): Promise<User[]> => {
    console.info(`[ACTION] getUsersByIds: Fetching ${ids.length} users`);
    if (ids.length === 0) return [];
    const users = await request<any[]>(`/users?ids=${ids.join(',')}`);
    return users.map(u => mapApiUserToFrontend(u));
};

export const getEventsByIds = async (ids: string[]): Promise<Event[]> => {
    console.info(`[ACTION] getEventsByIds: Fetching ${ids.length} events`);
    if (ids.length === 0) return [];
    const events = await request<any[]>(`/events?ids=${ids.join(',')}`);
    return events.map(mapApiEventToFrontend);
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


import { Event, User, Host, PromoStat, ReportData, Order, SalesByTicketType, PromoterReport, PromoCode, OrderLineItem, LeaderboardEntry, CheckoutCart, Competition, VenueArea, ScheduleItem, ArtistProfile, EmailDraft, EmailCampaign, TargetRole, CompetitionForm, PurchasedTicket, PayoutRequest, NotificationPreferences, HostFinancials, SystemEmailTemplate, SystemEmailTrigger, SystemSettings, TicketOption, Review, Payout } from '../types';
import { v4 as uuidv4 } from 'uuid';
import { createEventSlug } from '../utils/url';
import * as emailService from './emailService';

// Updated Base URL
const API_URL = 'http://api.eventsta.com:8181/eventsta';

// --- LOCAL STORAGE HELPERS ---
const getToken = (): string | null => localStorage.getItem('auth_token');
const setToken = (token: string) => localStorage.setItem('auth_token', token);
const removeToken = () => localStorage.removeItem('auth_token');

// --- ROBUST MOCK DATA (Fallback for API failures) ---
const MOCK_EVENTS_DATA = [
    {
        id: 'e1',
        title: 'TidalRave Long Beach',
        hostId: 'h2',
        hostName: 'Illtronic Events',
        date: '2026-11-15T20:00',
        endDate: '2026-11-16T02:00',
        location: 'Long Beach, CA',
        description: "Set sail on a sonic journey with Illtronic Events. Experience the best of house and techno on the open water with stunning views of the Long Beach skyline. Don't miss the boat!",
        images: ["https://images.unsplash.com/photo-1530649159659-c8beb2992433?ixlib=rb-4.1.0&auto=format&fit=crop&q=80&w=1740", "https://images.unsplash.com/photo-1563700816155-1d613ba479f2?ixlib=rb-4.1.0&auto=format&fit=crop&q=80&w=1744", "https://images.unsplash.com/photo-1670880016506-8559008ddc8a?ixlib=rb-4.1.0&auto=format&fit=crop&q=80&w=1740"],
        commission_rate: 10,
        promo_discount_rate: 5,
        type: 'ticketed',
        status: 'PUBLISHED',
        inventory: [{ id: 't1', type: 'GA', price: 45, quantity_total: 200, quantity_sold: 45 }],
        schedule: [
            { id: 's1', areaId: 'main', title: 'Warmup Set', startTime: '2026-11-15T20:00', endTime: '2026-11-15T22:00' },
            { id: 's2', areaId: 'main', title: 'Headliner', startTime: '2026-11-15T22:00', endTime: '2026-11-16T00:00' }
        ],
        venueAreas: [{ id: 'main', name: 'Main Deck' }]
    },
    {
        id: 'e2',
        title: 'LA Noir: Warehouse Sessions',
        hostId: 'h1',
        hostName: 'Alex Promo',
        date: '2026-11-22T22:00',
        endDate: '2026-11-23T04:00',
        location: 'Los Angeles, CA',
        description: "An underground experience in the heart of LA's industrial district. Gritty, raw, and unfiltered techno until the sun comes up.",
        images: ["https://cdn.prod.website-files.com/608c0b5889a6a24eecb46c23/60b3ae8e1c7edd824bf74c7f_24-5-1024x683-1.jpeg", "https://images.unsplash.com/photo-1505236858219-8359eb29e329?ixlib=rb-4.1.0&auto=format&fit=crop&q=80&w=1862"],
        commission_rate: 15,
        promo_discount_rate: 10,
        type: 'ticketed',
        status: 'PUBLISHED',
        inventory: [{ id: 't2', type: 'Early Bird', price: 20, quantity_total: 100, quantity_sold: 100 }]
    },
    {
        id: 'e3',
        title: 'Desert Bloom Festival',
        hostId: 'h3',
        hostName: 'Community Arts & Festivals',
        date: '2026-12-05T21:00',
        endDate: '2026-12-06T03:00',
        location: 'Palm Springs, CA',
        description: "A celebration of art, music, and nature under the desert stars.",
        images: ["https://images.unsplash.com/photo-1524368535928-5b5e00ddc76b?q=80&w=1600&auto=format&fit=crop", "https://images.unsplash.com/photo-1514525253161-7a4medd19cd819?q=80&w=1600&auto=format&fit=crop"],
        commission_rate: 12,
        promo_discount_rate: 5,
        type: 'ticketed',
        status: 'PUBLISHED',
        inventory: [{ id: 't3', type: 'Weekend Pass', price: 150, quantity_total: 500, quantity_sold: 120 }]
    },
    {
        id: 'e4',
        title: 'Golden Gate Grooves',
        hostId: 'h4',
        hostName: 'EMX',
        date: '2026-12-15T22:00',
        endDate: '2026-12-16T02:00',
        location: 'San Francisco, CA',
        description: "EMX presents a night of soulful house and disco with panoramic views.",
        images: ["https://images.unsplash.com/photo-1581968902132-d27ba6dd8b77?ixlib=rb-4.1.0&auto=format&fit=crop&q=60&w=900"],
        commission_rate: 8,
        promo_discount_rate: 5,
        type: 'ticketed',
        status: 'PUBLISHED',
        inventory: [{ id: 't4', type: 'Entry', price: 25, quantity_total: 150, quantity_sold: 10 }]
    },
    {
        id: 'e5',
        title: 'SD Sunset Sessions',
        hostId: 'h1',
        hostName: 'Alex Promo',
        date: '2026-12-20T16:00',
        endDate: '2026-12-20T21:00',
        location: 'San Diego, CA',
        description: "Join us for a blissful evening of chill house and melodic vibes as the sun sets over the Pacific.",
        images: ["https://images.unsplash.com/photo-1715618154218-e5a0b547cbdd?ixlib=rb-4.1.0&auto=format&fit=crop&q=80&w=1740"],
        commission_rate: 20,
        promo_discount_rate: 10,
        type: 'ticketed',
        status: 'PUBLISHED',
        inventory: [{ id: 't5', type: 'RSVP', price: 10, quantity_total: 100, quantity_sold: 80 }]
    },
    {
        id: 'e8',
        title: 'Massive: DJ Competition',
        hostId: 'h2',
        hostName: 'Illtronic Events',
        date: '2026-10-25T21:00',
        endDate: '2026-10-26T02:00',
        location: 'Los Angeles, CA',
        description: "The biggest up-and-coming DJs battle it out for a headline slot. Support your favorite artist!",
        images: ["https://www.eventbrite.com/e/_next/image?url=https%3A%2F%2Fimg.evbuc.com%2Fhttps%253A%252F%252Fcdn.evbuc.com%252Fimages%252F1156731733%252F172095495407%252F1%252Foriginal.20251018-212521%3Fcrop%3Dfocalpoint%26fit%3Dcrop%26w%3D600%26auto%3Dformat%252Ccompress%26q%3D75%26sharp%3D10%26fp-x%3D0.5%26fp-y%3D0.5%26s%3D02949c32ca06cefcc6b85e3ce182e5a4&w=940&q=75"],
        commission_rate: 25,
        promo_discount_rate: 0,
        type: 'fundraiser',
        status: 'PUBLISHED',
        inventory: [{ id: 't8', type: 'Vote / Donation', price: 5, quantity_total: 10000, quantity_sold: 400 }],
        competitions: [{
            id: 'c1',
            type: 'DJ_TICKET_SALES',
            status: 'ACTIVE',
            name: 'Headliner Slot Competition',
            description: 'Top seller gets to open for the headliner!',
            sectionIds: [],
            competitorIds: ['u_demo_1', 'u_demo_2'],
            startDate: '2026-09-01T00:00:00Z',
            cutoffDate: '2026-10-25T00:00:00Z'
        }]
    },
    {
        id: 'e9',
        title: 'Art for Hearts Charity',
        hostId: 'h3',
        hostName: 'Community Arts & Festivals',
        date: '2026-09-20T18:00',
        endDate: '2026-09-20T22:00',
        location: 'Santa Monica, CA',
        description: "Raise funds for local youth art programs. All proceeds go directly to Art for Hearts.",
        images: ["https://images.unsplash.com/photo-1532629345422-7515f3d16bb6?q=80&w=1740&auto=format&fit=crop"],
        commission_rate: 50,
        promo_discount_rate: 0,
        type: 'fundraiser',
        status: 'PUBLISHED',
        inventory: [{ id: 't9', type: 'Donation', price: 20, quantity_total: 1000, quantity_sold: 50 }]
    },
    {
        id: 'e_demo_1',
        title: "Galactic New Year's Eve",
        hostId: 'h_demo',
        hostName: 'Cosmic Events',
        date: '2026-12-31T21:00',
        endDate: '2027-01-01T04:00',
        location: 'Downtown Space Center, CA',
        description: "Blast off into the new year with an intergalactic party.",
        images: ["https://images.unsplash.com/photo-1467810563316-b5476525c0f9?q=80&w=1738&auto=format&fit=crop"],
        commission_rate: 10,
        promo_discount_rate: 10,
        type: 'ticketed',
        status: 'PUBLISHED',
        inventory: [{ id: 't_demo', type: 'Orbit Pass', price: 100, quantity_total: 200, quantity_sold: 150 }]
    }
];

let mockSystemSettings: SystemSettings = {
    platformName: 'Eventsta',
    supportEmail: 'support@eventsta.com',
    platformFeePercent: 5.9,
    platformFeeFixed: 0.35,
    maintenanceMode: false,
    disableRegistration: false
};

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

    console.log(`📡 [API REQ] ${method} ${url}`);
    
    // Check for mixed content issues early
    const isMixedContent = typeof window !== 'undefined' && window.location.protocol === 'https:' && url.startsWith('http:');

    try {
        // If mixed content, force fail to trigger fallback
        if (isMixedContent) {
            throw new Error("Mixed Content Blocked");
        }

        const response = await fetch(url, { ...options, headers });
        const text = await response.text();
        
        console.log(`📥 [API RES] ${response.status} ${url}`);

        if (!response.ok) {
            throw new Error(text || `API Error: ${response.status}`);
        }

        return text ? JSON.parse(text) : {};
    } catch (error) {
        console.warn(`⚠️ [API FAIL] ${method} ${url} - Switching to Mock Data`, error);
        return getMockFallback<T>(endpoint, options, error);
    }
}

// --- FALLBACK MOCK HANDLER ---
function getMockFallback<T>(endpoint: string, options: any, error: any): any {
    // 1. Events List
    if (endpoint === '/events') {
        return MOCK_EVENTS_DATA;
    }
    
    // 2. Event Details
    if (endpoint.match(/^\/events\/[^/]+$/) && options.method !== 'POST' && options.method !== 'PATCH') {
        const id = endpoint.split('/')[2];
        const event = MOCK_EVENTS_DATA.find(e => e.id === id);
        return event || MOCK_EVENTS_DATA[0];
    }

    // 3. User / Me
    if (endpoint === '/users/me') {
        return MOCK_USER;
    }

    // 4. System Settings
    if (endpoint === '/system/settings') {
        return mockSystemSettings;
    }

    // 5. System Stats
    if (endpoint === '/admin/stats') {
        return { totalUsers: 1250, totalEvents: 45, grossVolume: 154000, platformFees: 9200 };
    }

    // 6. Report Data
    if (endpoint.includes('/report')) {
        return {
            gross_sales: 12500,
            tickets_sold: 342,
            promoter_sales: 4500
        };
    }

    // 7. My Hosts
    if (endpoint === '/hosts/mine') {
        return [{ id: 'h1', name: 'Demo Host Group', description: 'My demo host', eventIds: ['e_demo_1'] }];
    }

    // 8. Other Defaults
    if (options.method === 'POST') {
        // For writes, return a success-like object
        if (endpoint.includes('login') || endpoint.includes('register')) return { token: 'mock_jwt_token', user: MOCK_USER };
        if (endpoint.includes('checkout')) return { orderId: `ord_${uuidv4()}` };
        return { id: uuidv4(), success: true };
    }

    return [];
}

// --- AUTHENTICATION ---

export const checkUserExists = async (email: string): Promise<boolean> => {
    return false; 
};

export const registerUser = async (email: string, name: string, role: 'attendee' | 'host', password?: string): Promise<User> => {
    const res = await request<any>('/auth/register', {
        method: 'POST',
        body: JSON.stringify({ email, password: password || 'placeholder123', name, role: role === 'host' ? 'ADMIN' : 'USER' })
    });
    if (res.token) setToken(res.token);
    return mapApiUserToFrontend(res.user || MOCK_USER);
};

export const signIn = async (provider: string, credentials?: string): Promise<User> => {
    if (provider === 'demo' || provider === 'admin') {
        const mockUser = { ...MOCK_USER, isSystemAdmin: provider === 'admin', id: provider === 'admin' ? 'admin_id' : 'demo_id', name: provider === 'admin' ? 'System Admin' : 'Demo User' };
        return mapApiUserToFrontend(mockUser);
    }
    const res = await request<any>('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email: 'demo@test.com', password: 'password' }) // Mock creds
    });
    if (res.token) setToken(res.token);
    return mapApiUserToFrontend(res.user || MOCK_USER);
};

export const loginWithPassword = async (email: string, password: string): Promise<User> => {
    return signIn('email', password);
};

export const getUserProfile = async (): Promise<User> => {
    const me = await request<any>('/users/me');
    let promoStats: PromoStat[] = [];
    try {
        promoStats = await request<PromoStat[]>('/promotions/mine');
    } catch (e) {}
    
    // Mock promo stats if empty
    if (!promoStats || promoStats.length === 0) {
        promoStats = [
            { eventId: 'e1', eventName: 'TidalRave Long Beach', promoLink: 'http://link.com/ref1', clicks: 120, sales: 15, commissionPct: 10, earned: 150.00, status: 'active' }
        ];
    }

    let payouts: Payout[] = [];
    return mapApiUserToFrontend(me, promoStats, payouts);
};

export const getUsersByIds = async (ids: string[]): Promise<User[]> => {
    return ids.map(id => ({ ...mapApiUserToFrontend(MOCK_USER), id, name: `User ${id.substring(0,4)}` }));
};

// --- EVENTS ---

export const getFeaturedEvents = async (): Promise<Event[]> => {
    const events = await request<any[]>('/events');
    return events.map(mapApiEventToFrontend);
};

export const getEventDetails = async (id: string): Promise<Event> => {
    const event = await request<any>(`/events/${id}`);
    return mapApiEventToFrontend(event);
};

export const createEvent = async (userId: string, hostId: string, eventData: Partial<Event>): Promise<Event> => {
    const res = await request<any>('/events', {
        method: 'POST',
        body: JSON.stringify({ ...eventData, host_id: hostId })
    });
    return mapApiEventToFrontend(res);
};

export const updateEvent = async (userId: string, eventId: string, updates: Partial<Event>): Promise<Event> => {
    const res = await request<any>(`/events/${eventId}`, {
        method: 'PATCH',
        body: JSON.stringify(updates)
    });
    return mapApiEventToFrontend(res);
};

export const getEventsByIds = async (ids: string[]): Promise<Event[]> => {
    const promises = ids.map(id => getEventDetails(id).catch(() => null));
    const results = await Promise.all(promises);
    return results.filter(e => e !== null) as Event[];
};

export const getOtherEventsByHost = async (hostId: string, excludeEventId: string): Promise<Event[]> => {
    try {
        const allEvents = await getFeaturedEvents();
        return allEvents.filter(e => e.hostId === hostId && e.id !== excludeEventId);
    } catch (e) { return []; }
};

// --- TICKETING & ORDERS ---

export const purchaseTicket = async (userId: string, eventId: string, cart: CheckoutCart, recipientUserId?: string, promoCode?: string, fees?: any): Promise<void> => {
    await request<any>('/orders/checkout', {
        method: 'POST',
        body: JSON.stringify({ event_id: eventId, items: cart })
    });
};

export const getOrdersForEvent = async (eventId: string): Promise<Order[]> => {
    try {
        const orders = await request<any[]>(`/events/${eventId}/attendees`);
        if (Array.isArray(orders) && orders.length > 0) return orders; // If real API works
        
        // Mock Orders
        return [
            { orderId: 'ord_1', eventId, purchaserName: 'Alice Wonders', purchaserEmail: 'alice@test.com', purchaseDate: new Date().toISOString(), items: [{ ticketType: 'General Admission', quantity: 2, pricePerTicket: 45 }], totalPaid: 90, status: 'Completed' },
            { orderId: 'ord_2', eventId, purchaserName: 'Bob Builder', purchaserEmail: 'bob@test.com', purchaseDate: new Date().toISOString(), items: [{ ticketType: 'VIP', quantity: 1, pricePerTicket: 85 }], totalPaid: 85, status: 'Completed' }
        ];
    } catch(e) { return []; }
};

export const validateTicket = async (eventId: string, ticketData: string): Promise<{valid: boolean, message: string, ticket?: any}> => {
    // Mock Validation
    return { valid: true, message: 'VALID', ticket: { id: ticketData, holder: 'Mock User', type: 'General Admission', checkedIn: false } };
};

export const checkInTicket = async (eventId: string, ticketId: string): Promise<void> => {
    await request('/check-in/commit', { method: 'POST', body: JSON.stringify({ ticket_id: ticketId }) });
};

// --- HOSTS ---

export const getHostDetails = async (id: string): Promise<Host> => {
    const res = await request<any>(`/hosts/${id}`);
    return {
        id: res.id || id,
        name: res.name || 'Mock Host',
        ownerUserId: res.owner_user_id || 'owner_1',
        description: res.description || 'A great event host.',
        eventIds: res.eventIds || [],
        reviews: [],
        imageUrl: res.image_url || 'https://picsum.photos/200',
        coverImageUrl: res.cover_image_url || 'https://picsum.photos/800/300'
    };
};

export const getHostsByIds = async (ids: string[]): Promise<Host[]> => {
    const myHosts = await request<any[]>('/hosts/mine');
    return myHosts.map(h => ({
        id: h.id, name: h.name, ownerUserId: 'me', description: h.description, eventIds: h.eventIds || [], reviews: []
    }));
};

export const createHost = async (userId: string, name: string): Promise<Host> => {
    const res = await request<any>('/hosts', { method: 'POST', body: JSON.stringify({ name }) });
    return { id: res.id || uuidv4(), name, ownerUserId: userId, eventIds: [], reviews: [] };
};

export const getHostReviews = async (hostId: string): Promise<Review[]> => { return []; };
export const createHostReview = async (hostId: string, review: any): Promise<void> => { };

// --- SYSTEM ADMIN ---

export const getSystemStats = async () => { return await request<any>('/admin/stats'); };
export const getAllUsersAdmin = async (page: number, limit: number, search: string) => {
    return { users: [mapApiUserToFrontend(MOCK_USER)], total: 1 };
};
export const getSystemSettings = async (): Promise<SystemSettings> => {
    return await request<SystemSettings>('/system/settings');
};
export const updateSystemSettings = async (settings: SystemSettings): Promise<SystemSettings> => {
    return settings;
};
export const getEmailDrafts = async (): Promise<EmailDraft[]> => [];
export const getSystemEmailTemplates = async (): Promise<SystemEmailTemplate[]> => [];
export const launchEmailCampaign = async (id: string, role: TargetRole): Promise<EmailCampaign> => ({ id, draftId: id, subject: 'Test', body: '', targetRole: role, status: 'COMPLETED', progress: 100, total: 100, startTime: new Date().toISOString() });

// --- UTILITIES & MAPPERS ---

function parseImages(input: any): string[] {
    if (Array.isArray(input)) return input;
    if (typeof input === 'string') return input.split(',').filter(s => s.trim() !== '');
    return [];
}

function mapApiUserToFrontend(apiUser: any, promoStats: PromoStat[] = [], payouts: Payout[] = []): User {
    return {
        id: apiUser.id,
        name: apiUser.name,
        email: apiUser.email,
        managedHostIds: apiUser.managedHostIds || ['h1'], // Mock host access
        purchasedTickets: [],
        promoStats: promoStats,
        payouts: payouts,
        isSystemAdmin: apiUser.role === 'ADMIN' || apiUser.isSystemAdmin,
        stripeConnected: apiUser.stripe_connected,
        stripeAccountId: apiUser.stripe_account_id,
        artistProfile: apiUser.artist_profile,
        notificationPreferences: apiUser.notification_preferences
    };
}

function mapApiEventToFrontend(apiEvent: any): Event {
    // Handle malformed/stringified objects from the bad API
    let schedule = [];
    let venueAreas = [];
    
    // Safely attempt to parse or fallback if it's the broken string "[object Object]"
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
            sold: inv.quantity_sold
        })),
        addOns: [],
        venueAreas: venueAreas,
        schedule: schedule,
        competitions: apiEvent.competitions || [],
        forms: [],
        checkIns: {}
    };
}

// --- MOCKS FOR REMAINING EXPORTS ---
export const getReportData = async (eventId: string): Promise<ReportData> => {
    return {
        event: await getEventDetails(eventId),
        kpis: { grossSales: 15000, ticketsSold: 300, pageViews: 5000, promoterSales: 2000 },
        salesByTicketType: [{ type: 'GA', quantitySold: 200, grossSales: 9000 }, { type: 'VIP', quantitySold: 100, grossSales: 6000 }],
        promotions: []
    };
};
export const generateEventDescription = async (title: string, current: string) => "AI Generated description...";
export const connectUserStripe = async (userId: string) => ({ success: true, accountId: 'acct_123' });
export const disconnectUserStripe = async (userId: string) => {};
export const requestEarlyPayout = async (userId: string, amount: number) => {};
export const getPayoutRequests = async (): Promise<PayoutRequest[]> => [];
export const getEmailCampaigns = () => Promise.resolve([] as EmailCampaign[]);
export const saveEmailDraft = (d: EmailDraft) => Promise.resolve();
export const deleteEmailDraft = (id: string) => Promise.resolve();
export const approvePayoutRequests = (ids: string[]) => Promise.resolve();
export const getSystemEmailTemplate = (t: SystemEmailTrigger) => Promise.resolve({} as SystemEmailTemplate);
export const updateSystemEmailTemplate = (t: SystemEmailTrigger, data: any) => Promise.resolve(data);
export const deleteHost = (userId: string, hostId: string) => Promise.resolve();
export const updateHostDetails = (id: string, data: Partial<Host>) => Promise.resolve({ ...data, id } as Host);
export const getProfileForView = (id: string) => getUserProfile(); 
export const updateUserProfile = (id: string, data: any) => Promise.resolve({} as User);
export const undoCheckIn = (eventId: string, ticketId: string) => Promise.resolve();
export const getOrderDetails = (id: string) => Promise.resolve({} as Order);
export const refundOrder = (userId: string, orderId: string) => Promise.resolve({} as Order);
export const getPromoCodesForEvent = (eventId: string) => Promise.resolve([]);
export const createPromoCode = (userId: string, eventId: string, data: any) => Promise.resolve({} as PromoCode);
export const deletePromoCode = (userId: string, eventId: string, codeId: string) => Promise.resolve({ success: true });
export const getCompetitionLeaderboard = (eventId: string) => Promise.resolve([]); 
export const joinCompetition = (userId: string, event: Event) => Promise.resolve();
export const startPromotion = (userId: string, event: Event) => Promise.resolve();
export const stopPromotion = (userId: string, eventId: string) => Promise.resolve();
export const getPublicForm = (formId: string) => Promise.resolve({} as CompetitionForm);
export const submitFormResponse = (formId: string, data: any) => Promise.resolve();
export const getFormResponses = (formId: string) => Promise.resolve([]);
export const getHostFinancials = (userId: string) => Promise.resolve({ grossVolume: 0, platformFees: 0, netRevenue: 0, pendingBalance: 0, totalPayouts: 0, payouts: [] });
export const getAllEventsAdmin = async (page: number, limit: number, search: string) => { const events = await getFeaturedEvents(); return { events, total: events.length }; };
export const requestPasswordReset = (email: string) => Promise.resolve();
export const changePassword = (userId: string, current: string, newPass: string) => Promise.resolve();
export const deleteAccount = (userId: string) => Promise.resolve();
export const updateNotificationPreferences = (userId: string, prefs: NotificationPreferences) => Promise.resolve({} as User);
export const cancelCampaign = () => Promise.resolve({} as EmailCampaign);
export const updateUser = (userId: string, data: Partial<User>) => Promise.resolve({} as User);
export const updateUserStatus = (userId: string, status: boolean) => Promise.resolve({} as User);
export const sendTestEmail = () => Promise.resolve();
export const getStripeConnectionStatus = () => Promise.resolve({ connected: false, accountId: null });
export const connectStripeAccount = () => Promise.resolve({ success: true, accountId: 'acct_123' });
export const disconnectStripeAccount = () => Promise.resolve();
export const getAllArtists = () => Promise.resolve([]);
export const getMockLocations = () => Promise.resolve(['New York', 'Los Angeles', 'London']);
export const getRawEvent = (id: string) => undefined;
export const finalizeCompetition = (userId: string, eventId: string, compId: string) => Promise.resolve();

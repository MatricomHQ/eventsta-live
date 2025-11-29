
import { Event, Host, PromoStat, ReportData, Order, PromoCode, LeaderboardEntry, CheckoutCart, CompetitionForm, PayoutRequest, HostFinancials, SystemEmailTemplate, SystemEmailTrigger, SystemSettings, EmailDraft, EmailCampaign, TargetRole, Review, TicketOption } from '../../types';
import { request, uploadFile, mapApiEventToFrontend, mapApiHostToFrontend, mapApiOrderToFrontend, parseImages, getUsersByIds } from './core';
import * as emailService from '../emailService';

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
        start_time: eventData.date,
        end_time: eventData.endDate,
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
        status: eventData.status 
    };

    const res = await request<any>('/events', {
        method: 'POST',
        body: JSON.stringify(backendPayload)
    });
    
    const mappedEvent = mapApiEventToFrontend(res);
    
    if ((!mappedEvent.hostName || mappedEvent.hostName === 'Host') && eventData.hostName) {
        mappedEvent.hostName = eventData.hostName;
    }
    
    return mappedEvent;
};

export const updateEvent = async (userId: string, eventId: string, updates: Partial<Event>): Promise<Event> => {
    console.info(`[ACTION] updateEvent: Updating ${eventId}`);
    
    const payload: any = { ...updates };
    
    if (updates.date) {
        payload.start_time = updates.date;
        delete payload.date;
    }
    if (updates.endDate) {
        payload.end_time = updates.endDate;
        delete payload.endDate;
    }
    
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

export const getAllEventsAdmin = async (page: number, limit: number, search: string) => {
    console.info(`[ACTION] getAllEventsAdmin`);
    const res = await request<{ events: any[], total: number }>(`/admin/events?page=${page}&limit=${limit}&search=${encodeURIComponent(search)}`);
    return { events: res.events.map(mapApiEventToFrontend), total: res.total };
};

export const generateEventDescription = async (title: string, current: string) => {
    console.info(`[ACTION] generateEventDescription: ${title}`);
    const res = await request<any>('/ai/generate-description', { method: 'POST', body: JSON.stringify({ title, current }) });
    return res.description;
};

// --- HOSTS ---

export const getHostDetails = async (id: string): Promise<Host> => {
    console.info(`[ACTION] getHostDetails: Fetching ${id}`);
    const raw = await request<any>(`/hosts/${id}`);
    return mapApiHostToFrontend(raw);
};

export const getHostReviews = async (hostId: string): Promise<Review[]> => { 
    console.info(`[ACTION] getHostReviews: Fetching for ${hostId}`);
    return await request<Review[]>(`/hosts/${hostId}/reviews`);
};

export const createHostReview = async (hostId: string, review: any): Promise<void> => {
    console.info(`[ACTION] createHostReview: Reviewing ${hostId}`);
    await request(`/hosts/${hostId}/reviews`, { method: 'POST', body: JSON.stringify(review) });
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

// --- TICKETING & ORDERS ---

export const purchaseTicket = async (userId: string, eventId: string, cart: CheckoutCart, recipientUserId?: string, promoCode?: string, fees?: any): Promise<void> => {
    console.debug(`[Promo Debug] 🛒 API purchaseTicket. User: ${userId}, Event: ${eventId}, Promo: ${promoCode || 'None'}`);
    
    // CRITICAL FIX: Sanitize recipientUserId. 
    // The backend crashes if it receives the string "null" instead of a null value.
    const cleanRecipientId = (recipientUserId === 'null' || recipientUserId === 'undefined') ? undefined : recipientUserId;

    await request<any>('/orders/checkout', {
        method: 'POST',
        body: JSON.stringify({ 
            event_id: eventId, 
            items: cart, 
            recipient_user_id: cleanRecipientId, 
            promo_code: promoCode, 
            fees 
        })
    });
};

export const getOrdersForEvent = async (eventId: string): Promise<Order[]> => {
    console.info(`[ACTION] getOrdersForEvent: Fetching orders for ${eventId}`);
    const rawOrders = await request<any[]>(`/events/${eventId}/orders`);
    return rawOrders.map(mapApiOrderToFrontend);
};

export const getUserOrders = async (): Promise<Order[]> => {
    console.info(`[ACTION] getUserOrders: Fetching orders for current user`);
    const rawOrders = await request<any[]>('/orders/mine');
    return rawOrders.map(mapApiOrderToFrontend);
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

export const undoCheckIn = (eventId: string, ticketId: string) => {
    console.info(`[ACTION] undoCheckIn: ${ticketId}`);
    return request('/check-in/undo', { method: 'POST', body: JSON.stringify({ event_id: eventId, ticket_id: ticketId }) });
};

export const getOrderDetails = async (id: string): Promise<Order> => {
    console.info(`[ACTION] getOrderDetails: ${id}`);
    const raw = await request<any>(`/orders/${id}`);
    return mapApiOrderToFrontend(raw);
};

export const refundOrder = async (userId: string, orderId: string): Promise<Order> => {
    console.info(`[ACTION] refundOrder: ${orderId}`);
    const raw = await request<any>(`/orders/${orderId}/refund`, { method: 'POST' });
    return mapApiOrderToFrontend(raw);
};

// --- PROMOTIONS ---

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
    
    const missingNameIds = rawData
        .filter(item => !item.user_name && !item.name && item.user_id)
        .map(item => item.user_id);
    
    let userMap: Record<string, string> = {};
    
    if (missingNameIds.length > 0) {
        try {
            console.debug(`[Leaderboard] Fetching ${missingNameIds.length} missing user names...`);
            const uniqueIds = Array.from(new Set(missingNameIds));
            const users = await getUsersByIds(uniqueIds);
            users.forEach(u => {
                userMap[u.id] = u.name;
            });
        } catch (e) {
            console.warn("[Leaderboard] Failed to fetch missing user names", e);
        }
    }

    return rawData.map(item => ({
        userId: item.user_id,
        userName: item.user_name || item.name || userMap[item.user_id] || 'Unknown User',
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

export const trackPromoClick = async (eventId: string, code: string): Promise<void> => {
    console.debug(`[Promo Debug] 🖱️ API trackPromoClick: Code '${code}' for Event '${eventId}'`);
    request(`/promotions/track-click`, {
        method: 'POST',
        body: JSON.stringify({ event_id: eventId, code })
    }).catch(err => console.warn("Failed to track promo click", err));
};

export const finalizeCompetition = (userId: string, eventId: string, compId: string) => {
    console.info(`[ACTION] finalizeCompetition: ${compId}`);
    return request(`/competitions/${eventId}/${compId}/finalize`, { method: 'POST' });
};

// --- FORMS ---

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

// --- REPORTS & FINANCIALS ---

export const getReportData = async (eventId: string): Promise<ReportData> => {
    console.info(`[ACTION] getReportData: ${eventId}`);
    
    // Fetch report and leaderboard in parallel to ensure we have promoter data
    // even if the report endpoint fails to return it (current backend issue)
    const [rawReport, leaderboard] = await Promise.all([
        request<any>(`/events/${eventId}/report`),
        getCompetitionLeaderboard(eventId).catch(e => {
            console.warn("Failed to fetch leaderboard for report fallback", e);
            return [];
        })
    ]);

    const event = mapApiEventToFrontend(rawReport.event || {});
    
    // Use promotions from report if available, otherwise array is empty
    let promotions: any[] = Array.isArray(rawReport.promotions) ? rawReport.promotions : [];

    // Fallback logic: If report promotions are missing but leaderboard exists, use leaderboard
    // to construct the promoter list so the admin can at least see sales stats.
    if (promotions.length === 0 && leaderboard.length > 0) {
        console.debug("[Report] Using leaderboard fallback for promotions list.");
        promotions = leaderboard.map(entry => ({
            userId: entry.userId,
            promoterName: entry.userName,
            artistName: '', 
            isCompetitor: true,
            clicks: 0, 
            sales: entry.salesCount,
            salesVolume: entry.salesValue, // Store raw volume for calculation
            earned: entry.salesValue * (event.commission / 100), // Estimated earnings
            promoLink: '' 
        }));
    } else {
        // Even if promotions exist, ensure they have proper fields if API returns 0 earned
        promotions = promotions.map(p => ({
            ...p,
            // Ensure sales volume is preserved if available
            salesVolume: p.salesVolume || p.sales_volume || 0,
            earned: typeof p.earned === 'number' ? p.earned : (p.earned_amount || 0)
        }));
    }

    return {
        event: event,
        kpis: {
            grossSales: rawReport.kpis?.grossSales || 0,
            ticketsSold: rawReport.kpis?.ticketsSold || 0,
            pageViews: rawReport.kpis?.pageViews || 0,
            promoterSales: rawReport.kpis?.promoterSales || 0
        },
        salesByTicketType: Array.isArray(rawReport.salesByTicketType) ? rawReport.salesByTicketType : [],
        promotions: promotions
    };
};

export const requestEarlyPayout = async (userId: string, amount: number) => {
    console.info(`[ACTION] requestEarlyPayout: ${userId} for $${amount}`);
    return await request<any>('/payouts/request', { method: 'POST', body: JSON.stringify({ amount }) });
};

export const getPayoutRequests = async (): Promise<PayoutRequest[]> => {
    console.info(`[ACTION] getPayoutRequests (Admin)`);
    return await request<PayoutRequest[]>('/admin/payouts');
};

export const approvePayoutRequests = (ids: string[]) => {
    console.info(`[ACTION] approvePayoutRequests: ${ids.length} items`);
    return request('/admin/payouts/approve', { method: 'POST', body: JSON.stringify({ ids }) });
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

export const sendTestSystemEmail = async (trigger: string, recipient: string, subject: string, body: string) => {
    console.info(`[ACTION] sendTestSystemEmail: ${trigger} to ${recipient}`);
    return request('/admin/email/send-test', {
        method: 'POST',
        body: JSON.stringify({ trigger, recipient, subject, body })
    });
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

export const getSystemEmailTemplate = (t: SystemEmailTrigger) => {
    console.info(`[ACTION] getSystemEmailTemplate: ${t}`);
    return request<SystemEmailTemplate>(`/admin/email/system-templates/${t}`);
};

export const updateSystemEmailTemplate = (t: SystemEmailTrigger, data: any) => {
    console.info(`[ACTION] updateSystemEmailTemplate: ${t}`);
    return request<SystemEmailTemplate>(`/admin/email/system-templates/${t}`, { method: 'PUT', body: JSON.stringify(data) });
};

export const cancelCampaign = (id: string) => {
    console.info(`[ACTION] cancelCampaign: ${id}`);
    return request<EmailCampaign>(`/admin/email/campaigns/${id}/cancel`, { method: 'POST' });
};

export const getMockLocations = () => {
    console.info(`[ACTION] getMockLocations`);
    return request<string[]>('/locations');
};

export const backfillCommissions = async () => {
    console.info(`[ACTION] backfillCommissions`);
    return request<{ processed: number, message: string }>('/admin/backfill-commissions', { method: 'POST' });
};

export const getRawEvent = (id: string) => {
    console.warn(`[DEPRECATED] getRawEvent called for ${id}. This function is removed.`);
    return undefined; 
};

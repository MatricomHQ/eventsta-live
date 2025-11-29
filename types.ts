
// FIX: Removed self-import which caused declaration conflicts with local type definitions.

export interface Review {
  rating: number;
  comment: string;
  author: string;
  date: string;
}

export interface Host {
  id: string;
  name: string;
  ownerUserId: string;
  eventIds: string[];
  reviews: Review[];
  description?: string;
  imageUrl?: string;
  coverImageUrl?: string;
  isDefault?: boolean;
  reviewsEnabled?: boolean;
}

export interface TicketOption {
  id?: string; // Backend inventory ID
  type: string;
  price: number; // For ticketed events: fixed price. For fundraisers: recommended donation.
  minimumDonation?: number; // For fundraiser events: minimum donation required.
  description?: string;
  quantity?: number; // Total tickets available
  sold?: number; // Total tickets sold
  saleEndDate?: string; // Specific cutoff date for this ticket
}

export interface AddOn {
  name: string;
  price: number; // For ticketed events: fixed price. For fundraisers: recommended donation.
  minimumDonation?: number; // For fundraiser events: minimum donation required.
  description?: string;
}

// NEW: Section type for artist profile pages
export interface ProfileSection {
  id: string;
  type: 'TEXT' | 'GALLERY' | 'SOUNDCLOUD' | 'YOUTUBE';
  // Using 'any' for simplicity, but could be a discriminated union
  // e.g. { title: string; body: string } for TEXT, { images: string[] } for GALLERY
  content: any; 
}

// UPDATED: Expanded artist profile to support a full public page
export interface ArtistProfile {
    bio?: string;
    genres?: string[];
    displayName?: string;
    profileImageUrl?: string;
    headerImageUrl?: string;
    sections?: ProfileSection[];
}


// NEW: Venue areas for scheduling (e.g., stages), now called "Sections"
export interface VenueArea {
    id: string;
    name: string;
}

// NEW: Schedule items for the event lineup
export interface ScheduleItem {
    id: string;
    areaId: string;
    title: string;
    startTime: string; // ISO format
    endTime: string; // ISO format
}

// --- NEW FORM BUILDER TYPES ---
export type FormElementType = 'SHORT_TEXT' | 'LONG_TEXT' | 'SINGLE_CHOICE' | 'MULTIPLE_CHOICE' | 'HEADER';

export interface FormElementOption {
    id: string;
    label: string;
}

export interface FormElement {
    id: string;
    type: FormElementType;
    label: string;
    placeholder?: string;
    required: boolean;
    options?: FormElementOption[]; // For choice types
    helpText?: string;
}

export interface CompetitionForm {
    id: string;
    title: string;
    description: string; // Rich text or plain text intro
    headerImageUrl?: string; // Used for parallax background
    elements: FormElement[];
    isActive: boolean;
    responsesCount: number;
    lastUpdated: string;
    linkedCompetitionId?: string; // NEW: Link to a competition
}
// ------------------------------

// UPDATED: Competition definition to support different types, statuses, and outcomes.
export interface Competition {
    id: string;
    type: 'DJ_TICKET_SALES';
    status: 'SETUP' | 'ACTIVE' | 'COMPLETED' | 'CANCELLED';
    name: string;
    description?: string;
    sectionIds: string[]; // Link to one or more VenueArea IDs
    competitorIds: string[]; // List of User IDs
    startDate: string; // ISO format
    cutoffDate: string; // ISO format
    promoDiscountPercent?: number;
    winnerIds?: string[]; // Array of user IDs, ordered by rank
    forms?: CompetitionForm[]; // DEPRECATED: Forms are now on Event level, kept for type safety during migration
}


export interface Event {
  id: string;
  status: 'DRAFT' | 'PUBLISHED'; // NEW: Visibility control
  title: string;
  hostId: string;
  hostName: string;
  date: string;
  endDate?: string;
  location: string;
  imageUrls: string[];
  description: string;
  commission: number; // The % the promoter earns
  defaultPromoDiscount: number; // The % discount the end user gets
  rating?: number;
  reviewCount?: number;
  // UPDATED/NEW Fields
  type: 'ticketed' | 'fundraiser';
  tickets: TicketOption[]; // For both 'ticketed' and 'fundraiser' events
  addOns?: AddOn[]; // For both 'ticketed' and 'fundraiser' events
  venueAreas?: VenueArea[]; // For sections/stages
  schedule?: ScheduleItem[];
  competitions?: Competition[]; // Replaces the old isCompetition flag
  forms?: CompetitionForm[]; // NEW: Forms are now managed at the event level
  checkIns?: Record<string, string>; // Map of ticketID -> timestamp
}

export interface PurchasedTicket {
  id: string;
  orderId: string; // Required for QR code validation
  eventId: string;
  eventName: string;
  ticketType: string;
  inventoryId?: string; // Helper to link back to the TicketOption
  qty: number;
  purchaseDate: string;
}

export interface PromoStat {
  eventId: string;
  eventName: string;
  promoLink: string;
  clicks: number;
  sales: number;
  commissionPct: number;
  earned: number;
  status: 'active' | 'past';
}

export interface Payout {
    id:string;
    date: string;
    amount: number;
    status: 'Completed' | 'Pending';
}

// NEW: Payout Request for Admin
export interface PayoutRequest {
    id: string;
    userId: string;
    userName: string;
    userEmail: string;
    amount: number;
    requestedDate: string;
    status: 'pending' | 'approved' | 'rejected';
}

export interface TeamMember {
    id:string;
    name: string;
    email: string;
    role: 'Admin' | 'Manager';
}

export interface NotificationPreferences {
    marketingEmails: boolean;
    transactionalEmails: boolean;
    promoterAlerts: boolean;
}

export interface User {
  id: string;
  name: string;
  email: string;
  managedHostIds: string[];
  purchasedTickets: PurchasedTicket[];
  promoStats: PromoStat[];
  payouts: Payout[];
  team?: TeamMember[];
  isArtist?: boolean;
  artistProfile?: ArtistProfile;
  // System Admin Fields
  isSystemAdmin?: boolean;
  isDisabled?: boolean;
  // Stripe Connect Fields
  stripeConnected?: boolean;
  stripeAccountId?: string | null;
  // Settings
  notificationPreferences?: NotificationPreferences;
}

export interface CheckoutCart {
  [itemName: string]: {
      quantity: number;
      donationAmount?: number; // For fundraisers
  };
}

export interface OrderLineItem {
    ticketType: string;
    quantity: number;
    pricePerTicket: number; // For tickets, this is fixed. For donations, this is the user's chosen amount.
    recipientUserId?: string; // The artist/competitor this donation/sale is for.
}

export interface Order {
    orderId: string;
    eventId: string;
    purchaserName: string;
    purchaserEmail: string;
    purchaseDate: string;
    items: OrderLineItem[];
    totalPaid: number;
    status: 'Completed' | 'Refunded';
    promoCode?: string;
    recipientUserId?: string;
    fees?: {
        mandatory: number;
        donation: number;
    };
}


export interface SalesByTicketType {
    type: string;
    quantitySold: number;
    grossSales: number;
}

export interface PromoterReport {
    userId: string;
    promoterName: string;
    artistName?: string; // Optional artist name
    isCompetitor: boolean;
    clicks: number;
    sales: number;
    earned: number;
    promoLink: string;
}

export interface PromoCode {
    id: string;
    eventId: string;
    code: string;
    discountPercent: number;
    uses: number;
    maxUses: number | null; // null for unlimited
    isActive: boolean;
    ownerUserId?: string;
}

export interface ReportData {
    event: Event;
    kpis: {
        grossSales: number;
        ticketsSold: number;
        pageViews: number; // mocked
        promoterSales: number;
    };
    salesByTicketType: SalesByTicketType[];
    promotions: PromoterReport[];
}

// NEW: For the competition leaderboard
export interface LeaderboardEntry {
    userId: string;
    userName: string;
    salesCount: number;
    salesValue: number;
    lastSaleDate?: string;
}

// NEW: Email Manager Types
export type TargetRole = 'All Users' | 'Hosts' | 'Promoters' | 'Artists' | 'Admins';

export interface EmailDraft {
    id: string;
    name: string; // Internal name
    subject: string;
    body: string; // HTML content
    targetRole: TargetRole;
    lastModified: string;
}

export interface EmailCampaign {
    id: string;
    draftId: string;
    subject: string;
    body: string; // Snapshot of the email body at send time
    targetRole: TargetRole;
    status: 'PENDING' | 'SENDING' | 'COMPLETED' | 'CANCELLED' | 'FAILED';
    progress: number; // Number of emails sent
    total: number; // Total recipients
    startTime: string;
    endTime?: string;
    errors?: string[];
}

// NEW: System Email Types (Transactional)
export type SystemEmailTrigger = 
    | 'WELCOME_NEW_USER'
    | 'PASSWORD_RESET'
    | 'ORDER_CONFIRMATION'
    | 'PAYOUT_PROCESSED'
    | 'EVENT_REMINDER'
    | 'EVENT_CANCELLED'
    | 'NEW_LOGIN_ALERT'
    | 'TICKET_TRANSFER_RECEIVED';

export interface SystemEmailTemplate {
    trigger: SystemEmailTrigger;
    name: string;
    subject: string;
    body: string; // HTML content
    variables: string[]; // List of available variables for this template
}

// NEW: Host Financials
export interface HostFinancials {
    grossVolume: number;
    platformFees: number;
    netRevenue: number;
    pendingBalance: number;
    totalPayouts: number;
    payouts: Payout[];
}

// NEW: Global System Settings
export interface SystemSettings {
    platformName: string;
    supportEmail: string;
    platformFeePercent: number;
    platformFeeFixed: number;
    maintenanceMode: boolean;
    disableRegistration: boolean;
}

// NEW: Ledger Entry
export interface LedgerEntry {
    id: string;
    userId: string;
    type: 'COMMISSION' | 'PAYOUT' | 'CLAWBACK';
    amount: number;
    referenceId: string;
    description: string;
    status: 'CLEARED' | 'PENDING';
    createdAt: string;
}

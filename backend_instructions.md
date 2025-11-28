# Eventsta Backend API Instructions

## 1. Overview
Eventsta is a multi-tenant event ticketing, hosting, and promotion platform. 
The current frontend uses a mock service layer (`services/api.ts`) and TypeScript interfaces (`types.ts`). 
The goal is to replace the mock layer with a RESTful API connected to a real database.

## 2. Tech Stack Recommendations
*   **Language/Framework:** Node.js (Express/NestJS) or Python (FastAPI).
*   **Database:** PostgreSQL (Relational data is critical for orders/tickets).
*   **ORM:** Prisma or TypeORM.
*   **Caching:** Redis (for session management and leaderboard calculation).
*   **Storage:** AWS S3 or Google Cloud Storage (for images).
*   **Payments:** Stripe Connect.
*   **AI:** Google GenAI SDK (Server-side).

---

## 3. Database Schema Requirements
Based on `types.ts`, the following tables/entities are required:

### Users
*   `id`: UUID
*   `email`: String (Unique)
*   `password_hash`: String (Argon2/Bcrypt)
*   `name`: String
*   `role`: Enum ['USER', 'ADMIN'] (System admin flag)
*   `stripe_account_id`: String (Nullable, for Hosts/Promoters)
*   `stripe_connected`: Boolean
*   `artist_profile`: JSONB (Bio, Genres, Images, Sections)
*   `notification_preferences`: JSONB

### Hosts (Organizations)
*   `id`: UUID
*   `owner_user_id`: UUID (Foreign Key -> Users)
*   `name`: String
*   `description`: Text
*   `is_default`: Boolean
*   `settings`: JSONB (Reviews enabled, etc.)

### Events
*   `id`: UUID
*   `host_id`: UUID (Foreign Key -> Hosts)
*   `status`: Enum ['DRAFT', 'PUBLISHED', 'ARCHIVED']
*   `type`: Enum ['TICKETED', 'FUNDRAISER']
*   `title`: String
*   `start_date`: Timestamp
*   `end_date`: Timestamp
*   `location`: String
*   `images`: String[] (Array of URLs)
*   `commission_rate`: Float (Promoter %)
*   `promo_discount_rate`: Float (End-user discount %)
*   `description`: Text

### Inventory (Ticket Definitions)
*   `id`: UUID
*   `event_id`: UUID
*   `type`: String (e.g., "VIP", "GA")
*   `price`: Decimal
*   `quantity_total`: Integer
*   `quantity_sold`: Integer
*   `sale_end_date`: Timestamp
*   `min_donation`: Decimal (For fundraisers)

### Orders
*   `id`: UUID
*   `user_id`: UUID (Buyer)
*   `event_id`: UUID
*   `total_amount`: Decimal
*   `platform_fee`: Decimal
*   `stripe_payment_intent_id`: String
*   `status`: Enum ['PENDING', 'COMPLETED', 'REFUNDED', 'FAILED']
*   `promo_code_id`: UUID (Nullable)
*   `affiliate_user_id`: UUID (Nullable)

### Issued Tickets (The actual scannable items)
*   `id`: UUID
*   `order_id`: UUID
*   `inventory_id`: UUID
*   `unique_qr_code`: String (Unique hash)
*   `status`: Enum ['VALID', 'CHECKED_IN', 'CANCELLED']
*   `check_in_time`: Timestamp (Nullable)

### Competitions & Forms
*   Tables needed for `Competitions`, `CompetitionEntries` (User <-> Competition), `Forms`, and `FormResponses`.

---

## 4. Authentication & Permissions

### Roles
1.  **Public:** Can view published events, host profiles, and public forms.
2.  **Authenticated User:** Can buy tickets, view own tickets, manage own profile.
3.  **Host Owner:** Can create/edit events for their Host entity, view financials, scan tickets.
4.  **System Admin:** Can manage all users, events, payout requests, and system settings.

### Middleware
*   `requireAuth`: Validates JWT from header.
*   `requireSystemAdmin`: Checks `user.isSystemAdmin`.
*   `requireHostOwnership`: Checks if `req.user.id` matches `host.ownerUserId`.

---

## 5. API Endpoints

### A. Authentication
*   `POST /auth/register`: Create account.
*   `POST /auth/login`: Email/Password login.
*   `POST /auth/google`: Exchange Google Token for JWT.
*   `POST /auth/forgot-password`: Send reset email.
*   `POST /auth/reset-password`: Set new password.

### B. Users & Profiles
*   `GET /users/me`: Get current user details.
*   `PATCH /users/me`: Update profile/settings.
*   `GET /users/:id/public`: Public artist profile data.
*   `GET /users/my-tickets`: Get purchased tickets with event metadata.

### C. Hosts & Events
*   `GET /events`: List published events (Search/Filter).
*   `GET /events/:id`: Public event details.
*   `POST /hosts`: Create a new host profile.
*   `GET /hosts/mine`: Get hosts managed by current user.
*   `POST /events`: Create event (Draft).
*   `PATCH /events/:id`: Update event (requires Host Owner).
*   `DELETE /events/:id`: Archive event.

### D. Ticketing & Orders (Crucial Business Logic)
*   `POST /orders/checkout`:
    *   **Logic:**
        1. Validate Inventory (Atomic check).
        2. Calculate totals (Price - Discount + Fees).
        3. Create Stripe Payment Intent (with application_fee_amount for platform cut).
        4. Reserve tickets temporarily (optional: use Redis with TTL).
    *   **Response:** `clientSecret` for Stripe.
*   `POST /webhooks/stripe`:
    *   **Logic:** Listen for `payment_intent.succeeded`.
    *   1. Mark Order as `COMPLETED`.
    *   2. Generate `IssuedTickets` rows.
    *   3. Increment `inventory.quantity_sold`.
    *   4. Send Email Confirmation via Email Service.
    *   5. If affiliate exists, log `PromoStat` earning.

### E. Marketing (Promoters & Competitions)
*   `POST /promotions/join`: Generate affiliate link/code for a user + event.
*   `GET /competitions/:eventId`: Get competition details.
*   `GET /competitions/:eventId/leaderboard`: Aggregate sales by `affiliate_user_id`.
*   `POST /forms/:formId/submit`: Save form response.

### F. Event Administration (Host Side)
*   `GET /events/:id/report`: Aggregated sales stats (Gross, Net, Ticket Counts).
*   `GET /events/:id/attendees`: List of all issued tickets.
*   `POST /check-in/validate`:
    *   **Input:** `qr_data`.
    *   **Logic:** Check if ticket exists, belongs to event, and `status === VALID`.
    *   **Response:** Valid/Invalid/AlreadyCheckedIn.
*   `POST /check-in/commit`: Mark ticket as `CHECKED_IN`.

### G. System Admin
*   `GET /admin/stats`: Global platform stats.
*   `GET /admin/users`: User management list.
*   `GET /admin/payouts`: List pending payout requests.
*   `POST /admin/payouts/:id/approve`: Trigger Stripe Connect transfer.
*   `GET /admin/email-templates`: Manage system transactional emails.

### H. AI Services (Proxy)
*   `POST /ai/generate-description`:
    *   **Logic:** Call Google GenAI SDK (Gemini 2.5 Flash) with server-side API Key.
*   `POST /ai/generate-image`:
    *   **Logic:** Call Google GenAI Image model. Upload result to Object Storage (S3). Return URL.

---

## 6. Integrations & Configuration

### Stripe Connect
*   The platform acts as the Merchant of Record.
*   Hosts must onboard via Stripe Connect (Express/Standard).
*   **Checkout Flow:**
    *   Charge User: Total Amount.
    *   Transfer: (Total - Platform Fees) -> Connected Account.
    *   Or use `destination` charges if Host is Merchant of Record. *Recommended: Platform is MoR to simplify refund handling.*

### Image Storage
*   Frontend `ImageGalleryEditor` currently handles Base64.
*   **Backend Requirement:** Create `POST /upload` endpoint.
    *   Accept Multipart/Form-data.
    *   Upload to S3/GCS.
    *   Return Public URL.

### System Settings
*   Store global configs (Fee %, Fixed Fee $, Maintenance Mode) in a `SystemSettings` table or Redis to allow dynamic updates without redeployment.

## 7. Migration Steps
1.  Setup Database & ORM.
2.  Implement Auth (Register/Login).
3.  Implement Event CRUD.
4.  Implement Public Event View.
5.  Implement Stripe Checkout & Webhooks.
6.  Implement Ticket Generation & Scanning.
7.  Migrate Frontend `api.ts` calls to `fetch('/api/...')`.

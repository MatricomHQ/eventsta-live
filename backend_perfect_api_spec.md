# 🚀 Definitive Backend Specification: Consolidated Order & Report Data

**Objective:** Eliminate frontend N+1 lookups, fix "Guest" purchaser issues, and ensure accurate Affiliate attribution in a single request.

---

## 1. Endpoint: `GET /events/:id/orders`

**Current Status:** Returns incomplete data. `items` is a string. Purchaser is often null. Affiliate is missing.
**Requirement:** Perform necessary JOINs (User table, PromoCodes table) before returning.

### Required JSON Response Structure (Per Order)

```json
[
  {
    "id": "uuid",
    "order_id": "c0fb8269...",
    "created_at": "2025-11-29T16:19:42.372Z",
    "status": "COMPLETED",
    "total_paid": 11.94,
    "promo_code": "C25B176A-B4A5",
    
    // --- 1. PURCHASER DETAILS (CRITICAL) ---
    // Logic: If user_id exists, JOIN User table. Else use checkout form data.
    // NEVER return null. Return "Guest" if absolutely unknown.
    "purchaser_name": "Jane Doe", 
    "purchaser_email": "jane@example.com",
    "user_id": "9afdf93f...", // The authenticated user ID (if any)

    // --- 2. AFFILIATE / PROMOTER DETAILS (CRITICAL) ---
    // Logic: 
    // IF recipient_user_id IS NOT NULL -> JOIN User table on recipient_user_id
    // ELSE IF promo_code IS NOT NULL -> JOIN PromoCodes on code -> JOIN User on owner_user_id
    // ELSE -> null
    "affiliate_user_id": "f9b285a6...",
    "affiliate_name": "Ill Tronic", // The resolved name of the promoter/competitor

    // --- 3. ITEMS (CRITICAL) ---
    // Must be a parsed JSON Array, NOT a string.
    "items": [
      {
        "ticket_type": "General Admission",
        "quantity": 1,
        "price_per_ticket": 10.00,
        "recipient_user_id": "null" // Specific item recipient if applicable
      }
    ],

    // --- 4. FEES ---
    "fees": {
      "mandatory": 0.94,
      "donation": 1.00
    }
  }
]
```

---

## 2. Endpoint: `GET /events/:id/report`

**Current Status:** `promotions` array is missing or empty.
**Requirement:** Aggregated stats for Host Dashboard.

### Required JSON Response Structure

```json
{
  "event": { ... }, // Existing event object
  
  // --- KPI SUMMARY ---
  "kpis": {
    "grossSales": 1000.00,
    "ticketsSold": 50,
    "pageViews": 120,
    "promoterSales": 500.00, // Total sales volume attributed to affiliates
    "affiliateCount": 5 // Number of active promoters
  },

  // --- PROMOTIONS ARRAY (CRITICAL) ---
  // Must include EVERYONE who has sold a ticket (via code OR link) 
  // AND everyone who has joined a competition.
  "promotions": [
    {
      "userId": "uuid...",
      "promoterName": "Ill Tronic",
      "isCompetitor": true, // true if in competition list
      "clicks": 45,
      "sales": 10,
      "earned": 25.00, // Commission earned
      "promoLink": "..."
    }
  ]
}
```

---

## 3. Endpoint: `GET /promotions/mine` (Promoter View)

**Current Status:** Logic mismatch with Ledger.
**Requirement:** Ensure `earned_amount` excludes fees/donations.

### Logic Update
```sql
-- "Earned" must strictly be:
(Total Ticket Sales - Discounts) * (Commission Rate %)
-- Do NOT include Platform Fees or Platform Donations in the base calculation.
```

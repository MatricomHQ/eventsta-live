
# 🚨 Critical Backend Incident: Commissions Not Crediting

**Severity:** HIGH
**Status:** Users are generating sales but receiving $0 payouts. Ledger is empty.

## Incident Analysis
Based on client-side and server-side logs provided at 17:24:08.

### 1. The Order Data (Correct)
The order is being created successfully with the necessary attribution data.
*   **Order ID:** `c0fb8269-608c-4882-8cd6-558e8881833c`
*   **Status:** `COMPLETED`
*   **Promo Code:** `C25B176A-B4A5` (Present in payload)
*   **Recipient User ID:** `"null"` (String) — *Note: This should be actual `null` or undefined, checking for string "null" might be a bug.*

### 2. The Event Data (Correct)
*   **Event ID:** `c25b176a-c8a7-48c2-9a59-4ad007b0bb9b`
*   **Commission Rate:** `10` (Confirmed in `GET /events/:id` response)

### 3. The Failures (Symptoms)

**A. Ledger is Empty**
Request: `GET /users/.../ledger`
Response: `[]`
*   **Root Cause:** The `creditCommission` (or equivalent) hook did not run or failed silently.
*   **Likely Logic Failure:** The backend is likely checking `if (order.recipient_user_id)`. Since it is the string `"null"`, it might be trying to find a user with ID `"null"`, failing, and aborting. It is **NOT** falling back to finding the owner of `promo_code` "C25B176A-B4A5".

**B. Promoter Stats are Zeroed**
Request: `GET /promotions/mine`
Response:
```json
{
  "code": "C25B176A-B4A5",
  "sales_count": 0,
  "commission_rate": 0,  <-- CRITICAL: Returning 0 instead of 10
  "earned_amount": 0
}
```
*   **Root Cause:** The aggregation query for this endpoint is likely joining on `recipient_user_id` (which is failing) and NOT on `promo_code`.
*   **Commission Rate Bug:** The endpoint is returning `0` for commission rate. It should join the `Events` table to get the current rate if the Promotion record doesn't have a specific override.

## Required Fixes

### 1. Fix Attribution Logic (`onOrderCompleted`)
Update the order completion handler to prioritize `recipient_user_id` but **FALLBACK** to `promo_code` lookup.

```javascript
// PSEUDOCODE - FIX REQUIRED
async function onOrderCompleted(order) {
    let promoterId = null;

    // 1. Sanitize Data (Handle string "null")
    const recipientId = (order.recipient_user_id === 'null') ? null : order.recipient_user_id;

    // 2. Determine Promoter
    if (recipientId) {
        promoterId = recipientId;
    } else if (order.promo_code) {
        // LOOKUP REQUIRED: Find who owns this code
        const promo = await db.promoCodes.findOne({ 
            code: order.promo_code, 
            event_id: order.event_id 
        });
        if (promo) promoterId = promo.owner_user_id;
    }

    if (!promoterId) return; // No promoter involved

    // 3. Calculate & Credit (Use Event Commission Rate)
    const event = await db.events.findById(order.event_id);
    const commissionableAmount = order.total_amount - (order.fees.mandatory + order.fees.donation);
    const commission = commissionableAmount * (event.commission_rate / 100);

    if (commission > 0) {
        await db.ledger.create({
            user_id: promoterId,
            type: 'COMMISSION',
            amount: commission,
            reference_id: order.id,
            status: 'CLEARED'
        });
    }
}
```

### 2. Fix `GET /promotions/mine` Query
Ensure this endpoint:
1.  Counts orders where `promo_code` matches the user's code.
2.  Returns `Events.commission_rate` if `Promotions.commission_rate` is 0 or null.

### 3. Run Retroactive Script
You must backfill the missing ledger entries for existing orders.
1.  Find all orders with `status: COMPLETED` and `promo_code IS NOT NULL`.
2.  Check if a `Ledger` entry exists for that `order_id`.
3.  If not, run the attribution logic above to credit the promoter.

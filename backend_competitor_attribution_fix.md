# Critical Backend Fix: Competitor Sales Attribution

**Problem:**
When a customer purchases a ticket and selects a competitor to support from the dropdown on the event page, the sale is **not being credited** to that competitor. Their sales count and earnings in the Promoter Portal remain at zero.

The root cause is that the commission attribution logic appears to **only** check for a `promo_code` on the order and is **completely ignoring the `recipient_user_id`** that is sent during checkout.

As correctly stated, a competitor is just a promoter who is part of a competition. The `recipient_user_id` is simply another method for attributing a sale to a promoter, used when a customer makes an explicit choice on the page rather than arriving via a promo link.

**Required Fix:**

The backend's order completion logic (in `POST /orders/checkout` and any asynchronous completion handlers like Stripe webhooks) must be updated to correctly identify the promoter who should be credited.

The logic must follow this order of precedence:

1.  **Primary Method: `recipient_user_id`**
    *   If the `order` object contains a `recipient_user_id`, this user **MUST** be the one who receives the commission. This was the customer's explicit choice.

2.  **Fallback Method: `promo_code`**
    *   If, and only if, the `order` object does **NOT** contain a `recipient_user_id`, the system should then look for a `promo_code`.
    *   If a `promo_code` exists, find the associated `owner_user_id` and credit them.

3.  **No Attribution**
    *   If neither `recipient_user_id` nor a valid `promo_code` are present, no commission is credited. This is a direct sale.

**Implementation (Pseudocode):**

This demonstrates the required change in your `onOrderCompleted` hook/function.

```javascript
// --- INCORRECT LOGIC (Current System) ---
async function onOrderCompleted(order) {
    let promoterId = null;
    if (order.promo_code) {
        const promo = await db.promoCodes.findOne({ code: order.promo_code });
        if (promo) {
            promoterId = promo.owner_user_id;
        }
    }
    // Fails to check for recipient_user_id

    if (promoterId) {
        creditCommission(order, promoterId);
    }
}

// --- CORRECT LOGIC (Required Update) ---
async function onOrderCompleted(order) {
    let promoterId = null;

    // 1. Check for explicit recipient first. This is the highest priority.
    if (order.recipient_user_id) {
        promoterId = order.recipient_user_id;
        console.log(`[Attribution] Crediting via recipient_user_id: ${promoterId}`);
    
    // 2. If no explicit recipient, fall back to the promo code.
    } else if (order.promo_code) {
        const promo = await db.promoCodes.findOne({ code: order.promo_code, event_id: order.event_id });
        if (promo && promo.owner_user_id) {
            promoterId = promo.owner_user_id;
            console.log(`[Attribution] Crediting via promo_code: ${order.promo_code} to user: ${promoterId}`);
        }
    }

    // 3. If a promoter was identified, credit their commission.
    if (promoterId) {
        // This function should already handle the ledger/balance updates correctly.
        await creditCommission(order, promoterId);
    } else {
        console.log(`[Attribution] No promoter found for order ${order.id}. Direct sale.`);
    }
}
```

**Action Item:**
Please update your order processing logic to incorporate this attribution hierarchy. This will ensure that competitors are always credited for sales made in their name, fixing the core issue reported.


# 🚨 FINAL COMMISSION FIX SPECIFICATION

**Severity:** CRITICAL
**Status:** REQUIRED IMMEDIATELY. "Real-Time Self-Correcting" Architecture.

**Problem:** 
The Frontend sends `recipient_user_id` as the string `"null"`. The backend blindly trusts this, tries to look up a user with ID `"null"`, fails, and aborts the commission logic silently. This leaves Promoters with $0 balances despite making sales.

**Required Solution:**
Do NOT rely on manual backfill scripts. Implement a robust, fail-safe attribution system that handles bad input gracefully.

## 1. Input Sanitization Middleware (The Shield)

In your `orders` controller (or globally), you **MUST** sanitize the input before processing.

```javascript
// Middleware / Pre-processing
if (req.body.recipient_user_id === 'null' || req.body.recipient_user_id === 'undefined') {
    req.body.recipient_user_id = null;
}
```

## 2. Robust Attribution Logic (`onOrderCompleted`)

The `creditPromoterCommission` function must be rewritten to be defensive. It must try every possible way to find the promoter and *never* crash due to bad data.

**Required Logic:**

```javascript
async function creditPromoterCommission(order) {
    console.log(`[Commission] Processing Order ${order.id}`);

    // --- STEP 1: RESOLVE PROMOTER (FAIL-SAFE) ---
    let promoterId = null;

    // A. Explicit Recipient (Sanitized)
    // Ensure we handle legacy bad data in DB if 'null' string got saved
    const rawRecipient = order.recipient_user_id;
    if (rawRecipient && rawRecipient !== 'null' && rawRecipient !== 'undefined') {
        promoterId = rawRecipient;
        console.log(`[Commission] Attribution via Recipient ID: ${promoterId}`);
    }

    // B. Fallback to Promo Code Owner
    if (!promoterId && order.promo_code) {
        // CRITICAL: Query DB for code ownership
        const promo = await db.promoCodes.findOne({ 
            where: { code: order.promo_code, event_id: order.event_id } 
        });
        
        if (promo && promo.owner_user_id) {
            promoterId = promo.owner_user_id;
            console.log(`[Commission] Attribution via Promo Code ${order.promo_code}: ${promoterId}`);
        } else {
             console.warn(`[Commission] Promo code ${order.promo_code} found but has no owner or does not exist.`);
        }
    }

    if (!promoterId) {
        console.log(`[Commission] No promoter found. Skipping.`);
        return;
    }

    // --- STEP 2: CALCULATE COMMISSION (NET SALES ONLY) ---
    const fees = parseFloat(order.fees_mandatory || 0);
    const donation = parseFloat(order.fees_donation || 0);
    const commissionableBase = parseFloat(order.total_paid) - fees - donation;

    if (commissionableBase <= 0) {
         console.log(`[Commission] Base amount <= 0. Skipping.`);
         return;
    }

    // Get Event Rate
    const event = await db.events.findById(order.event_id);
    const commissionAmount = commissionableBase * (event.commission_rate / 100);

    // --- STEP 3: IDEMPOTENCY & LEDGER WRITE ---
    
    // Check if commission already paid for this order
    const existing = await db.ledger.findOne({
        where: { reference_id: order.id, type: 'COMMISSION' }
    });

    if (existing) {
        console.log(`[Commission] Ledger entry already exists for order ${order.id}`);
        return;
    }

    // Write to Ledger
    await db.ledger.create({
        id: uuid(),
        user_id: promoterId,
        type: 'COMMISSION',
        amount: commissionAmount,
        reference_id: order.id,
        description: `Commission for Order #${order.order_id.slice(-4)} (${event.title})`,
        status: 'CLEARED', // Available immediately
        created_at: new Date()
    });

    // Update User Balance Cache
    await db.users.incrementBalance(promoterId, commissionAmount);
    console.log(`[Commission] Success. Credited ${commissionAmount} to ${promoterId}`);
}
```

## 3. Self-Healing Read Endpoints

The `GET /events/:id/report` and `GET /promotions/mine` endpoints MUST effectively "patch" the view if the Ledger data is missing but the Order data proves a sale occurred.

**SQL Logic for `promotions.earned`:**
Do not just sum the Ledger.
`earned_display = CASE WHEN ledger_sum = 0 AND sales_volume > 0 THEN (sales_volume * commission_rate / 100) ELSE ledger_sum END`

This ensures the user sees the correct earnings immediately, even if the background ledger transaction had a momentary hiccup.

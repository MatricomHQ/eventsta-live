
# Critical Backend Fix: Commission Ledger Logic

**Issue:**
Promoters see sales and calculated earnings in the "Promotions" tab (which aggregates raw Order data), but their **Financial Balance is 0** and **Ledger is empty**.

**Root Cause:**
The Order Completion logic (when `status` transitions to `'Completed'`) is saving the Order but **skipping the step to credit the promoter**. The accounting system (Ledger) is disconnected from the Order system.

**Required Actions:**

## 1. Implement `creditCommission` Hook
Modify the `POST /orders/checkout` (and Stripe Webhook handler) logic. Immediately after an Order is saved with `status: 'Completed'`, execute the following logic:

```javascript
// Pseudo-code
async function onOrderCompleted(order) {
    if (!order.promo_code) return;

    // 1. Find the Promo Code and Event
    const promo = await db.promoCodes.findOne({ code: order.promo_code });
    const event = await db.events.findById(order.event_id);
    
    if (!promo || !promo.owner_user_id) return;

    // 2. Calculate Commission
    // Ensure you calculate based on the Ticket Price (excluding taxes/platform fees if applicable)
    const commissionRate = event.commission_rate || 0;
    const commissionAmount = order.totalPaid * (commissionRate / 100);

    if (commissionAmount <= 0) return;

    // 3. Create Ledger Entry (CRITICAL MISSING STEP)
    await db.ledger.create({
        id: uuid(),
        user_id: promo.owner_user_id, // The Promoter
        type: 'COMMISSION',
        amount: commissionAmount,
        reference_id: order.orderId,
        description: `Commission for sale on ${event.title}`,
        status: 'PENDING', // or 'CLEARED' depending on your payout policy
        created_at: new Date()
    });

    // 4. Update Promoter's Cached Balance (If applicable)
    // If you store a 'balance' or 'pending_balance' column on the User table:
    await db.users.increment(promo.owner_user_id, 'pending_balance', commissionAmount);
}
```

## 2. Retroactive Fix (One-Time Script)
Since live orders have already been placed but not credited:
1.  Query all `Orders` with `status: 'Completed'` and a `promo_code`.
2.  Check if a corresponding `LedgerEntry` exists (by `reference_id` = `order.id`).
3.  If missing, run the `creditCommission` logic for that order to backfill the missing earnings.

## 3. Verify `financials` Endpoint
Ensure `GET /users/:id/financials` sums up the `Ledger` table (or the user balance field) correctly. It should match the sum of `amount` where `user_id = :id`.

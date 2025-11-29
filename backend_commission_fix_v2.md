
# Critical Backend Fixes: Commission Logic V2

**Status:** URGENT
**Impact:** Promoters are being overpaid (commission on fees/donations) and double-paid (lack of idempotency).

## 1. Fix Commission Calculation Formula

**Current Behavior (Incorrect):**
The system appears to be calculating commission as:
`Commission = Order.totalPaid * (Event.commission_rate / 100)`

*Issue:* `totalPaid` includes `Mandatory Fees` and `Platform Donations`. Promoters should NOT earn commission on fees or donations.

**Required Behavior (Correct):**
Commission must be calculated on the **Net Ticket Sales** only.

**Algorithm:**
1.  **Retrieve Order Details:** Get the Order, including its `items` (line items) and `fees` metadata.
2.  **Calculate Commissionable Base:**
    *   Iterate through `Order.items`.
    *   Sum `(Item.unit_price * Item.quantity)`.
    *   Subtract `Order.discount_amount` (if applied).
    *   **Alternatively:** Use `Order.totalPaid - Order.fees.mandatory - Order.fees.donation`.
    *   *Result:* `CommissionableBase` (This should strictly represent the revenue from tickets/goods).
3.  **Apply Rate:**
    *   `CommissionAmount = CommissionableBase * (Event.commission_rate / 100)`.

**Example:**
*   Ticket: $100
*   Qty: 2 ($200)
*   Fee: $10
*   Donation: $5
*   Total Paid: $215
*   Commission Rate: 10%
*   **Incorrect (Current):** $215 * 0.10 = $21.50
*   **Correct:** ($215 - $10 - $5) * 0.10 = **$20.00**

## 2. Implement Idempotency (Fix Double Crediting)

**Current Behavior:**
The system is creating multiple `LedgerEntry` records for the same Order, resulting in double crediting. This likely happens if the webhook fires multiple times or if a retroactive fix script runs on already-processed orders.

**Required Behavior:**
Before creating a `LedgerEntry`, you **MUST** check if one already exists for this Order.

**Logic Update (Pseudocode):**

```javascript
async function creditPromoterCommission(order) {
    if (!order.promo_code) return;

    // 1. IDEMPOTENCY CHECK (CRITICAL)
    const existingEntry = await db.ledger.findOne({
        reference_id: order.id,
        type: 'COMMISSION'
    });

    if (existingEntry) {
        console.log(`[Commission] Skipping order ${order.id}, commission already credited.`);
        return; 
    }

    // 2. Fetch Context
    const event = await db.events.findById(order.event_id);
    const promo = await db.promoCodes.findOne({ 
        code: order.promo_code, 
        event_id: order.event_id 
    });

    if (!promo || !promo.owner_user_id) return;

    // 3. Calculate Base (Excluding Fees/Donations)
    // Ensure you pull fee/donation values from the persisted order record
    const fees = order.fees?.mandatory || 0;
    const donation = order.fees?.donation || 0;
    
    // Safety check: verify totalPaid matches components
    // const calculatedTotal = ticketSales - discount + fees + donation;
    
    const commissionableBase = order.totalPaid - fees - donation;

    if (commissionableBase <= 0) return;

    const commissionAmount = commissionableBase * (event.commission_rate / 100);

    // 4. Create Ledger Entry
    await db.transaction(async (trx) => {
        await trx.ledger.create({
            id: uuid(),
            user_id: promo.owner_user_id,
            type: 'COMMISSION',
            amount: commissionAmount,
            reference_id: order.id, // Links back to order for idempotency
            description: `Commission for order #${order.order_number || order.id.slice(-4)}`,
            status: 'CLEARED', // or PENDING
            created_at: new Date()
        });

        // 5. Update User Balance Cache
        await trx.users.incrementBalance(promo.owner_user_id, commissionAmount);
    });
}
```

## 3. Data Cleanup (One-Time)

Please run a migration script to fix the affected accounts:
1.  Identify users with duplicate `LedgerEntry` records where `reference_id` is the same.
2.  Delete the duplicate entries (keep the one with the earliest `created_at`).
3.  Recalculate the user's `balance` based on the sum of the remaining valid Ledger entries.
4.  Update the `User` table with the corrected balance.

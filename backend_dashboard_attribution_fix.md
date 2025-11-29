# Critical Backend Fix: Promoter Dashboard Stats Mismatch

**Status:** URGENT
**Issue:** The Promoter Portal dashboard (`GET /promotions/mine`) shows an "Earned" amount of $0 for an event, even when the user's main wallet balance/ledger correctly shows their commission from that same event.

**Root Cause:**
The aggregation logic for the `/promotions/mine` endpoint was not updated to match the new commission attribution logic that was recently fixed. The dashboard's reporting query is still only searching for orders using `promo_code` and is **ignoring orders attributed via `recipient_user_id`**.

This creates a major discrepancy where the Ledger is correct, but the user-facing dashboard is wrong, causing confusion.

## Required Fix

Update the database query for the `GET /promotions/mine` endpoint. The logic must be identical to the main commission attribution logic.

The query must aggregate sales and calculate earnings for a promoter by finding all completed orders that match **EITHER** of these conditions for a given `event_id`:

1.  The order's `recipient_user_id` matches the promoter's `user_id`.
2.  The order's `promo_code` belongs to a promo code owned by the promoter's `user_id` (this should be used as a fallback if `recipient_user_id` is null).

### Pseudocode / SQL Example

This demonstrates the required change to the `WHERE` clause when fetching orders to aggregate for a specific promoter (`:promoter_user_id`) and event (`:event_id`).

**Incorrect Logic (Current):**
```sql
-- This only finds sales from promo codes and misses competitor selections.
SELECT ... 
FROM orders
WHERE 
  event_id = :event_id AND
  promo_code IN (SELECT code FROM promo_codes WHERE owner_user_id = :promoter_user_id) AND
  status = 'Completed';
```

**Correct Logic (Required):**
```sql
-- This correctly finds sales from BOTH competitor selections AND promo codes.
SELECT ... 
FROM orders
WHERE 
  event_id = :event_id AND
  (
    recipient_user_id = :promoter_user_id 
    OR 
    (
      recipient_user_id IS NULL AND 
      promo_code IN (SELECT code FROM promo_codes WHERE owner_user_id = :promoter_user_id)
    )
  ) AND
  status = 'Completed';
```

### Final Verification
Please ensure that the "Earned Amount" calculation in this endpoint also correctly subtracts any non-commissionable fees and donations from the total before applying the commission rate. The final numbers displayed on the Promotions dashboard **MUST** align with the sum of corresponding `COMMISSION` entries in the `Ledger` table for that user and event.
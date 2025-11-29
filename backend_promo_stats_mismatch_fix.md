
# 🚨 URGENT FIX: Promo Stats Aggregation Logic Mismatch

**Status:** CRITICAL
**Issue:** The user's **Wallet Balance** (Ledger) is correct (e.g., $7.00), but the **Promotions Dashboard** (`GET /promotions/mine`) displays an inflated "Earned Amount" (e.g., $16.21).

**Root Cause:**
You fixed the `creditCommission` logic to exclude fees/donations when writing to the `Ledger` table (Good).
**HOWEVER**, the aggregation query for `GET /promotions/mine` is still summing up the raw `order.totalPaid`.

The Dashboard is telling the user they earned commission on Fees & Donations, but the Ledger is only paying them for the Ticket Price. This mismatch causes massive confusion.

## Required Fixes

### 1. Update `GET /promotions/mine` Aggregation Query
Do **NOT** sum `order.totalPaid`. You must subtract the non-commissionable components.

**Incorrect Logic (Current):**
```sql
SUM(orders.total_paid * (events.commission_rate / 100)) as earned_amount
```

**Correct Logic (Required):**
```sql
-- Postgres/SQL Example
SUM(
  (orders.total_paid - COALESCE(orders.fees_mandatory, 0) - COALESCE(orders.fees_donation, 0)) 
  * (events.commission_rate / 100)
) as earned_amount
```

### 2. Update `GET /competitions/:id/leaderboard`
Apply the **exact same fix** to the leaderboard endpoint. The `sales_volume` displayed on the leaderboard must reflect the **Net Sales Volume** (Ticket Price only), not the Gross Volume (Ticket + Fees).

### 3. Verification Test
1. Find an Order with: Ticket $10, Fee $2, Total Paid $12. Commission 10%.
2. **Ledger Entry** should exist for **$1.00** ($10 * 10%). (This is currently working).
3. **Promotions Endpoint** (`earned_amount`) MUST return **$1.00**.
   - *Current Bug:* It is returning $1.20 ($12 * 10%).

**Fix this immediately so the Dashboard numbers match the Payout numbers.**

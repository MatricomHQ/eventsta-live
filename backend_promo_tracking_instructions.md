
# Backend Implementation: Promo Tracking & Analytics

**Objective:**
Implement tracking for promotional link clicks and ensure accurate aggregation of sales/earnings for promoters, accounting for refunds.

## 1. New Table/Collection: `PromoClicks`

Create a new table/collection to store individual clicks. This is necessary for verifying traffic sources and calculating conversion rates.

**Schema:**
*   `id`: UUID/ObjectId (Primary Key)
*   `event_id`: String (Foreign Key to Events)
*   `promo_code`: String (The code used in the link)
*   `timestamp`: DateTime (When the click occurred)
*   `ip_address`: String (Optional, hashed for privacy, used for unique visitor estimation)
*   `user_agent`: String (Optional, for device analytics)

## 2. New Endpoint: `POST /promotions/track-click`

**Request Body:**
```json
{
  "event_id": "string",
  "code": "string"
}
```

**Logic:**
1.  Verify the `code` exists for the given `event_id` (either in `PromoCodes` table or implicitly if it matches a user-specific generated code format like `PROMO_USERID`).
2.  Insert a record into `PromoClicks` with the current timestamp.
3.  Return `200 OK`.

## 3. Aggregation Logic Update: `GET /promotions/mine`

The aggregation logic for promoter stats needs to be robust.

**Calculation Logic per Promotion:**

1.  **Clicks:**
    *   `COUNT(*)` from `PromoClicks` where `event_id = X` AND `promo_code = Y`.

2.  **Sales Count:**
    *   Query `Orders` table.
    *   Filter by `event_id = X`.
    *   Filter by `promo_code = Y` (or `recipient_user_id` if tracking via user ID).
    *   **CRITICAL:** Filter by `status = 'Completed'`.
    *   **CRITICAL:** Exclude any order where `status = 'Refunded'`.

3.  **Earned Amount:**
    *   Query `Orders` matching criteria above.
    *   Sum `(Order.totalPaid * Event.commission_rate / 100)`.
    *   Ensure `totalPaid` reflects the final amount (net of discounts) but *before* platform fees if commission is on gross ticket price, or after if on net. (Standard rule: Commission is usually on the ticket face value paid).
    *   **CRITICAL:** Do NOT include amounts from `Refunded` orders. If a partial refund is supported, subtract the refunded portion.

## 4. Aggregation Logic Update: `GET /competitions/:id/leaderboard`

Similar to above, but aggregated by `recipient_user_id` (competitor) instead of just code.

1.  **Sales Value:**
    *   Sum of `Order.totalPaid` for all valid (non-refunded) orders linked to the competitor.

2.  **Sales Count:**
    *   Count of valid orders.

**Action Item:**
Ensure database indexes are added on `promo_code` and `event_id` in the `PromoClicks` and `Orders` tables for performance.

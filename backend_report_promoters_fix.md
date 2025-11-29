
# Critical Backend Fix: Missing Promoter Data in Reports

**Status:** URGENT
**Issue:** The `GET /events/:id/report` endpoint is returning the `promotions` key as either undefined, null, or empty, even when there are active promoters and competitors for the event.

**Frontend Logs:**
`payload: "{\"event\":{...},\"kpis\":{...},\"salesByTicketType\":[]}"` 
(Notice `promotions` is completely missing from the JSON).

**Requirement:**
Please update the `GET /events/:id/report` endpoint to calculate and return the `promotions` array.

## Expected JSON Structure

```json
{
  "event": { ... },
  "kpis": { ... },
  "salesByTicketType": [ ... ],
  "promotions": [  // <-- THIS IS MISSING
    {
      "userId": "string",
      "promoterName": "string",
      "artistName": "string", // Optional
      "isCompetitor": boolean,
      "clicks": number,
      "sales": number,
      "earned": number, // Calculated commission
      "promoLink": "string"
    }
  ]
}
```

## Implementation Logic

To populate this array, you need to aggregate data from multiple sources:

1.  **Identify Promoters:**
    *   Find all users who have joined a competition for this event (`competitions` table).
    *   Find all users who have generated a `promo_code` for this event.
    *   Find all users who have a record in `promotions` table linked to this event.

2.  **Calculate Stats (Per Promoter):**
    *   **Clicks:** Count from `PromoClicks` table (`event_id` + `promo_code`).
    *   **Sales:** Count `Orders` where `event_id` matches AND (`recipient_user_id` = promoter_id OR `promo_code` belongs to promoter). Status must be `'Completed'`.
    *   **Earned:** Sum of commission from `Ledger` entries (`type='COMMISSION'`, `user_id`=promoter, linked to this event via order reference). OR calculate dynamically: `Sales Volume (Net) * Commission Rate`.

3.  **Return List:**
    *   Map the results to the structure above.
    *   Ensure `isCompetitor` is true if they are in the `competitorIds` list of an active competition.

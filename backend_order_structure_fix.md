
# Backend Fix: Order Data Structure Consistency

**Status:** URGENT
**Issue:** The endpoint `GET /events/:id/orders` is returning Order objects with inconsistent field casing (snake_case vs camelCase) and critical missing fields compared to the schema expected by the frontend. This is causing crashes in the Admin Reporting dashboard.

## Specific Issues Detected
1.  **Missing `purchaser_name`:** Orders are returning with `purchaser_name` as `null` or missing, causing UI crashes on `.trim()`.
2.  **Null `items`:** Some order objects have `items: null` instead of an empty array `[]` or valid items array, causing iteration errors.
3.  **Inconsistent Casing:** The frontend expects camelCase (e.g., `purchaserName`, `ticketType`), but the backend is often returning raw database snake_case (`purchaser_name`, `ticket_type`). While the frontend has added a mapper to handle both, the backend should ideally standardize on one format.

## Required Fixes

### 1. Enforce Schema on GET /events/:id/orders
Ensure the response JSON for each order strictly follows this structure. **Do not return null for arrays or strings.**

```json
{
  "orderId": "uuid...", // or "id"
  "eventId": "uuid...", // or "event_id"
  "purchaserName": "String", // MUST NOT BE NULL. Default to "Guest" if missing.
  "purchaserEmail": "String",
  "purchaseDate": "ISO_Date_String", // or "created_at"
  "totalPaid": 100.00, // or "total_paid"
  "status": "Completed",
  "items": [ // MUST BE AN ARRAY, even if empty []
    {
      "ticketType": "VIP", // or "ticket_type"
      "quantity": 1,
      "pricePerTicket": 50.00,
      "recipientUserId": "uuid..." // Optional
    }
  ]
}
```

### 2. Data Sanitation
*   **Purchaser Name:** If the database field is null, return "Guest" or "Unknown User".
*   **Items:** If the joined relation returns null, return `[]`.

### 3. Verification
Verify that `GET /events/:id/orders` returns the exact same structure (keys and types) as `GET /orders/mine`. Discrepancies between these two endpoints regarding the `Order` object shape are the root cause of these issues.

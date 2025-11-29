
# Critical Backend Fix: Order Response Data

**Issue:** 
The `GET /events/:id/orders` endpoint is returning data that requires the frontend to perform expensive N+1 lookups to display basic information. Additionally, the `items` field is being returned as a stringified JSON instead of a proper object.

**Required Fixes:**

## 1. Populate Purchaser Details
Instead of returning just `user_id`, please JOIN the User table and return the purchaser's name and email directly in the order object.

**Current (Bad):**
```json
{
  "user_id": "uuid...",
  "purchaser_name": null, // or missing
  "purchaser_email": null
}
```

**Required (Good):**
```json
{
  "user_id": "uuid...",
  "purchaser_name": "John Doe",
  "purchaser_email": "john@example.com"
}
```

## 2. Fix `items` Serialization
The `items` field is currently returning as a string: `"items": "[{...}]"`.
It **MUST** return as a standard JSON array: `"items": [{...}]`.

## 3. Populate Recipient (Promoter) Details
If `recipient_user_id` is present, please join and return `recipient_user_name` so the admin panel can show who the affiliate was without extra lookups.

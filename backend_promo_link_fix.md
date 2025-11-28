
# Backend Fix: Promotion Links

**Issue:**
The current `GET /promotions/mine` endpoint returns a `link` property that seems to be hardcoded or formatted incorrectly (e.g., using `/e/` instead of `/event/` or using a wrong domain).

**Requirement:**
1.  **Do not construct full URLs on the backend.** The backend does not always know the correct client-side routing structure (hash vs history mode) or the SEO-friendly slug format.
2.  **Return the `promo_code`** (or just `code`) explicitly in the response object for `GET /promotions/mine`.
3.  The frontend will take this code and construct the correct, SEO-friendly URL:
    `https://domain.com/#/event/slug-id?promo=CODE`

**Desired Response Format for `GET /promotions/mine`:**
```json
[
  {
    "event_id": "uuid...",
    "event_title": "Summer Festival",
    "code": "SUMMER20", // CRITICAL: This field is required
    "sales_count": 10,
    "sales_volume": 500.00,
    "earned_amount": 50.00,
    "status": "active"
  }
]
```

**Action:**
Please ensure the `code` field is populated in the API response. The frontend has been updated to prioritize using this code to generate clean links.

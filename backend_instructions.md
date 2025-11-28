
# Backend Critical Fixes Required

## 1. Persistence of Competition Signups
**Issue:** When `POST /promotions/join` is called, the user is created as a promoter, but they are **not** being added to the `competitions` array in the `Event` document.
**Requirement:**
- Upon a successful join/signup:
  1. Identify the target `Event` document.
  2. Locate the specific `competition` object within the `competitions` array (matching `competition_id`).
  3. **Push** the `user_id` into the `competitorIds` (or `competitor_ids`) array of that competition object.
  4. **Save/Update** the `Event` document.
- This ensures that `GET /events/:id` returns the updated list of competitors immediately.

## 2. Leaderboard Completeness
**Issue:** The leaderboard API may be filtering out users with 0 sales.
**Requirement:**
- Endpoint: `GET /competitions/:eventId/leaderboard`
- **Must return ALL users** who have signed up for the competition (present in `competitorIds` or `promotions` table).
- Include users with `sales_count: 0` and `sales_volume: 0`.
- Do not apply a `limit` (or use a very high limit) to ensure the host sees everyone.

## 3. Promo Code Uniqueness
**Requirement:**
- Enforce unique constraint on `code` within the scope of an `event_id`.
- Return `409 Conflict` if a duplicate code is attempted.

## 4. Auth & Promotions
**Observation:** `POST /auth/login` returns the user object but often lacks computed fields like `promoStats` or deep relations.
**Note:** The frontend has been updated to call `GET /users/me` (which fetches `promotions/mine`) immediately after login to mitigate this, but ensure `GET /users/me` is performant.

## 5. Promotion Deletion Persistence
**Issue:** `DELETE /promotions/:eventId` (or specific ID) returns `200 OK` `{"success":true}`, but subsequent calls to `GET /promotions/mine` and `GET /users/me` still return the deleted promotion record with `status: "active"`.
**Requirement:**
- Ensure the DELETE operation actually removes the record or updates its status to `deleted`/`inactive`.
- Ensure `GET /promotions/mine` filters out deleted records.
- Ensure `GET /users/me` (which aggregates promotions) filters out deleted records.
- Verify if caching is causing stale data to be returned immediately after deletion.

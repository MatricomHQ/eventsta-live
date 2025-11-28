
# API Fixes & Requirements (Updated)

The following issues are still pending or require clarification for the Eventsta frontend integration.

## 1. Event Data Structures
*   **Add-ons:** The API `create event` and `inventory` structure focuses on tickets.
    *   *Requirement:* Clarify if "Add-ons" (Merch, VIP upgrades) should live in the `inventory` array with a specific flag, or if the backend requires a separate table/endpoint. Currently, frontend mocks this.
*   **Schedule/Lineup:** The API `Event` object needs to support the `schedule` (array of time blocks) and `venueAreas` (stages/areas) fields to fully support the "Schedule" tab functionality.

## 2. Admin Specifics
*   **Payouts (Admin):** The user-side payout request flow is implemented.
    *   *Requirement:* Ensure `GET /admin/payouts` (or similar) exists for the System Admin to view and approve pending requests (`POST /admin/payouts/:id/approve`).
*   **User Management:**
    *   *Requirement:* `GET /admin/users` should return `is_disabled` status to match frontend toggle functionality.

## 3. General
*   **Search/Filter:** The `GET /events` endpoint should support query parameters for efficient filtering (e.g., `?host_id=...`, `?exclude=...`) to replace inefficient client-side filtering in `getOtherEventsByHost`.


# Critical Fix: Google Login Creating Placeholder Users

**Problem:**
When a user logs in via Google, the backend `POST /auth/login` endpoint is returning a user with the name "Google User" and a fake email like `google_user@example.com`. This indicates that the backend is **not correctly parsing the Google ID Token** (passed as `provider_token`) to extract the user's real information.

**Current Behavior:**
1. Frontend sends:
   ```json
   {
     "password": "placeholder-provider-login",
     "provider_token": "eyJhbGci..." // Valid Google ID Token
   }
   ```
2. Backend validates the token signature but fails to read the claims (`name`, `email`, `picture`).
3. Backend creates/returns a placeholder user.
4. Frontend is forced to send a `PATCH /users/:id` request immediately after login to fix the data.

**Required Fix:**

Please update the `POST /auth/login` handler (or your specific provider login logic) to perform the following:

1.  **Decode and Verify Token:**
    Use a library like `google-auth-library` (Node.js) or equivalent to verify the `provider_token`.
    ```javascript
    // Node.js Example
    const ticket = await client.verifyIdToken({
        idToken: provider_token,
        audience: CLIENT_ID,
    });
    const payload = ticket.getPayload();
    ```

2.  **Extract User Data:**
    Extract the following fields from the payload:
    - `email`: The user's real email.
    - `name`: The user's full name.
    - `picture`: The user's avatar URL.
    - `sub`: The unique Google User ID.

3.  **Find or Create User:**
    - Look up the user by `email` (or `sub` if you store provider IDs).
    - **If creating a new user:** Use the extracted `email` and `name`. **DO NOT** use placeholders.
    - **If logging in an existing user:** Optionally update their `picture` or `name` if it has changed.

4.  **Fallback (Frontend Update):**
    The frontend has been updated to also send `name` and `email` in the request body as a convenience. You can use these if token parsing fails or as a simpler alternative, though verifying the token claims is more secure.

    **New Request Body Format:**
    ```json
    {
      "password": "placeholder-provider-login",
      "provider_token": "eyJhbGci...",
      "email": "realuser@gmail.com", // Now available
      "name": "Real Name"            // Now available
    }
    ```

**Goal:**
The initial response from `POST /auth/login` MUST contain the correct user details so the frontend does not need to perform a subsequent PATCH request.

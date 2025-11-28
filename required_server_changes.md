
# Required Server Changes for Eventsta API

The frontend application is currently falling back to mock data because the API at `http://api.eventsta.com:8181` is failing to respond correctly to browser requests.

The following 3 critical issues must be fixed on the server to restore live connectivity.

## 1. Enable HTTPS (Critical)
**The Issue:**
The frontend is likely running on a secure origin (`https://`), but the API is hosted on an insecure origin (`http://api.eventsta.com:8181`). Modern browsers strictly block "Mixed Content" (insecure API calls from a secure page) for security reasons.

**The Fix:**
*   **Install an SSL Certificate:** Configure the server running on port 8181 to use SSL/TLS.
*   **Update URL:** The API must be accessible via `https://api.eventsta.com:8181` (or map port 443 to the application).
*   *Temporary Workaround:* If you cannot enable HTTPS immediately, you must load the frontend via `http://` (localhost or insecure staging), though this is not recommended for production.

## 2. Configure CORS Headers
**The Issue:**
The "Failed to fetch" error often indicates that the browser blocked the response because the server did not provide the correct Cross-Origin Resource Sharing (CORS) headers.

**The Fix:**
Ensure the backend sends the following headers with every response (including `OPTIONS` preflight requests):

```http
Access-Control-Allow-Origin: *
Access-Control-Allow-Methods: GET, POST, PATCH, PUT, DELETE, OPTIONS
Access-Control-Allow-Headers: Content-Type, Authorization
```
*Note: In production, replace `*` with the specific domain of your frontend.*

## 3. Fix JSON Serialization (Data Integrity)
**The Issue:**
The API is currently returning malformed JSON for nested objects and arrays. Instead of proper JSON structures, it is returning the JavaScript string representation `"[object Object]"`.

**Observed Bad Response:**
```json
{
  "schedule": "[object Object],[object Object],[object Object]",
  "venueAreas": "[object Object]",
  "imageUrls": "https://img1.jpg,https://img2.jpg"
}
```

**Required Fix:**
Update the backend serialization logic to correctly parse and stringify nested objects before sending the response.

**Expected Correct Response:**
```json
{
  "schedule": [
    { "id": "s1", "title": "Main Set", "startTime": "2026-11-15T20:00" },
    { "id": "s2", "title": "Closing", "startTime": "2026-11-15T22:00" }
  ],
  "venueAreas": [
    { "id": "main", "name": "Main Stage" }
  ],
  "imageUrls": [
    "https://img1.jpg",
    "https://img2.jpg"
  ]
}
```

### Summary Checklist
- [ ] Enable HTTPS on port 8181.
- [ ] Add CORS Middleware/Headers.
- [ ] Fix JSON serialization for `schedule`, `venueAreas`, and `imageUrls` (convert comma-separated strings to arrays).

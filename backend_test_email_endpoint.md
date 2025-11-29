
# Backend Request: Implement Test Email Endpoint

**Issue:**
The admin panel needs a way to send test emails using the currently edited template content to verify layout and delivery. Currently, the frontend only logs to the console.

**Requirement:**
Implement a new `POST` endpoint that accepts an email template configuration and sends a real email to a specified recipient.

## Endpoint Definition

*   **Method:** `POST`
*   **Path:** `/admin/email/send-test`
*   **Auth:** Admin Only (Requires valid admin session/token).

## Request Body

```json
{
  "trigger": "WELCOME_NEW_USER", // String (Enum matching SystemEmailTrigger)
  "recipient": "test@example.com", // String
  "subject": "Email Subject...", // String (The value currently in the editor input)
  "body": "<html>...</html>" // String (The HTML content currently in the editor)
}
```

## Backend Logic

1.  **Authorization:** Verify the requester is an Admin. Return `403 Forbidden` if not.
2.  **Sample Data Loading:**
    *   Based on the `trigger` field, load a set of **Mock/Sample Data** appropriate for that email type.
    *   *Example:* If `trigger` is `ORDER_CONFIRMATION`, create a mock order object with dummy items, price, etc.
    *   *Example:* If `trigger` is `WELCOME_NEW_USER`, use `user_name: "Test User"`.
3.  **Variable Substitution:**
    *   Take the provided `subject` and `body` from the request.
    *   Perform variable substitution (e.g., replace `{{user_name}}`, `{{total_paid}}`) using the Mock Data loaded in step 2.
    *   Inject global variables (`{{platform_name}}`, `{{support_email}}`) from system settings.
4.  **Send Email:**
    *   Use your email provider service (SES, SendGrid, etc.) to send the *substituted* content to the `recipient` email address.
5.  **Response:**
    *   Success: `200 OK` `{"success": true}`
    *   Failure: `500 Internal Server Error` `{"error": "Failed to send email"}`

## Note
Do **not** use the template stored in the database for this action. Use the `subject` and `body` passed in the request payload, as the user may be testing changes that haven't been saved yet.

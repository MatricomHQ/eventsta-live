
# Backend Request: Seed System Email Templates

**Issue:**
The `GET /admin/email/system-templates` endpoint is returning `undefined`, `null`, or an empty response body, causing the Frontend Admin Panel to crash with `Cannot read properties of undefined (reading 'map')`.

**Requirement:**
1. Ensure the endpoint **always** returns a JSON Array `[]`, even if empty.
2. Please seed the database with the following **Default System Templates** to ensure the platform functions correctly.

## Required Template Schema
```json
{
  "trigger": "ENUM_VALUE", 
  "name": "Display Name",
  "subject": "Email Subject Line",
  "body": "HTML Content...",
  "variables": ["var1", "var2"]
}
```

## List of Required Templates (Triggers)

### 1. WELCOME_NEW_USER
*   **Name:** Welcome Email
*   **Subject:** Welcome to {{platform_name}}, {{user_name}}!
*   **Variables:** `user_name`, `platform_name`, `support_email`

### 2. PASSWORD_RESET
*   **Name:** Password Reset
*   **Subject:** Reset your password for {{platform_name}}
*   **Variables:** `user_name`, `reset_link`, `platform_name`

### 3. ORDER_CONFIRMATION
*   **Name:** Order Receipt
*   **Subject:** Your tickets for {{event_name}}
*   **Variables:** `user_name`, `event_name`, `event_date`, `event_location`, `order_id`, `total_paid`, `ticket_summary`, `qr_code_link`

### 4. PAYOUT_PROCESSED
*   **Name:** Payout Sent
*   **Subject:** You've been paid! {{amount}} is on its way.
*   **Variables:** `user_name`, `amount`, `payout_id`, `platform_name`

### 5. EVENT_REMINDER
*   **Name:** Event Reminder
*   **Subject:** Reminder: {{event_name}} is coming up soon!
*   **Variables:** `user_name`, `event_name`, `event_date`, `event_location`

### 6. EVENT_CANCELLED
*   **Name:** Event Cancellation
*   **Subject:** Urgent: Update regarding {{event_name}}
*   **Variables:** `user_name`, `event_name`, `refund_status`

### 7. NEW_LOGIN_ALERT
*   **Name:** New Device Login
*   **Subject:** New login detected on your account
*   **Variables:** `user_name`, `time`, `ip_address`

### 8. TICKET_TRANSFER_RECEIVED
*   **Name:** Ticket Received
*   **Subject:** {{sender_name}} sent you tickets!
*   **Variables:** `user_name`, `sender_name`, `event_name`, `claim_link`

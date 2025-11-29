
# Backend Fix: Missing PUT Route for Email Templates

**Issue:**
The Frontend Admin Panel sends a request to update system email templates via:
`PUT /admin/email/system-templates/:trigger`

However, the backend returns **404 Not Found**, as seen in server logs:
`[11:14:23] INFO: Route PUT:/eventsta/admin/email/system-templates/WELCOME_NEW_USER not found`

**Requirement:**
Please implement the following endpoint handler in the Admin controller.

**Endpoint:**
`PUT /admin/email/system-templates/:trigger`

**Path Parameters:**
*   `trigger`: String (Enum: `WELCOME_NEW_USER`, `PASSWORD_RESET`, etc.)

**Request Body:**
```json
{
  "subject": "New Subject Line",
  "body": "<html>Updated HTML content...</html>"
}
```

**Logic:**
1.  Find the template by the `trigger` enum.
2.  Update its `subject` and `body` fields.
3.  Save to database.
4.  Return the updated template object.

**Note:**
The `GET` endpoint works fine, so the database logic likely exists. This is strictly a missing route definition in the router.


# 🚨 URGENT: Fix "Pending Payment" Status Blocking Stats

**Diagnosis:**
The Frontend successfully sends the `promo_code`, and the Backend successfully creates the order. 
**HOWEVER**, the logs show the order response is:
`"message": "Order created (Pending Payment)"`

Since the aggregation logic for `GET /promotions/mine` (correctly) filters for `status = 'Completed'`, these pending orders are **excluded** from the Sales and Earned counts.

Because the system is returning a mock client secret (`secret_pi_mock_...`), the frontend cannot perform a real Stripe confirmation to transition the order to 'Completed'.

## Required Fix (Backend Only)

### 1. Auto-Complete Mock Orders
In the `POST /orders/checkout` endpoint:
When the system uses the Mock Payment Provider (generating `secret_pi_mock_...`), it **MUST** immediately set the Order `status` to `'Completed'`.

**Logic Change:**
```javascript
// Pseudo-code for POST /orders/checkout
const paymentIntent = await paymentProvider.createIntent(...);

let status = 'Pending Payment';

// FIX: Auto-complete if using mock provider so stats update immediately
if (paymentIntent.client_secret.startsWith('secret_pi_mock')) {
    status = 'Completed';
}

await db.orders.create({
    ...,
    promo_code: req.body.promo_code, // Ensure this is persisted
    status: status // <--- THIS MUST BE 'Completed'
});
```

### 2. Verify Persistence
Ensure that when the order is saved as `'Completed'`, the `promo_code` column is definitely populated.

## Testing the Fix
1. Make a `POST /orders/checkout` request with a `promo_code`.
2. Observe the response. It MUST say **"Order created (Completed)"** (or similar), NOT "Pending Payment".
3. Immediately call `GET /promotions/mine`. The `sales_count` should increment.

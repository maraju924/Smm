# Security Specification for AmarTrend SMM

## Data Invariants
1. Users cannot self-assign the `admin` role or modify `role` or increment their own `balance` arbitrarily without admin approval or verified payment.
2. Only authenticated users can access, create, or read their own orders, refills, tickets, and payments.
3. Services and Announcements can be read by any signed-in user or guest, but can only be modified by Admins.
4. An order cannot be placed with negative quantity, empty link, or mismatching user identity.
5. Bootstrapped admin: `maraju924@gmail.com` and `maraju921@gmail.com` are granted administrative governance over all collections.
6. Support tickets can only be replied to by the ticket owner or admins.
7. Payment deposits require transaction verification and can only be set to `approved` by Admins.

## The Dirty Dozen Payloads (Target Rejection)
1. User attempts to register with `role: "admin"` directly in `/users/{userId}`.
2. User attempts to update their own `balance` to 9999999 BDT in `/users/{userId}`.
3. Unauthenticated client attempts to query all `/orders`.
4. User A attempts to read User B's `/orders/{orderId}`.
5. User attempts to inject a 10MB string into `/orders/{orderId}.link`.
6. User attempts to write an order where `userId != request.auth.uid`.
7. Non-admin attempts to update a service price in `/services/{serviceId}`.
8. Non-admin attempts to set a payment status to `approved` in `/payments/{paymentId}`.
9. User attempts to delete another user's ticket in `/tickets/{ticketId}`.
10. Attacker attempts to forge an admin marker in `/admins/{attackerUid}`.
11. Attacker attempts path injection with invalid ID characters `../../bad_doc`.
12. User attempts to mark an order as `completed` without admin privilege.

# Security Specification — የአለታ ወንዶ ወጣቶች በሁሉ ቦታ መረዳጃ ዕድር (Iddir Management System)

## 1. Data Invariants
1. **Default-Deny Catch-All & Strict ID Validation**: All undefined paths are rejected by `match /{document=**} { allow read, write: if false; }`. Every document ID across all 12 collections must match `^[a-zA-Z0-9_\-]+$` with length 1..128.
2. **Verified Bootstrapped Admin Boundary**: Only a verified Firebase Auth session (`request.auth != null && request.auth.token.firebase.sign_in_provider != 'anonymous' && request.auth.token.email_verified == true`) matching the association admin email (`Misganalead28@gmail.com`) is authorized to read/write and synchronize the association collections (`users`, `members`, `payments`, `announcements`, `audit_logs`, and governance collections) in Firestore.
3. **Credential & PII Isolation**: `users` (containing `passwordSalt`, `passwordHash`, and RBAC roles) and `members` (containing `phone`, `address`, `kebeleOrSubcity`, `familyInfo`, `guarantorName`) are strictly restricted to the verified Admin; unauthenticated or non-admin reads and list scraping are denied.
4. **Strict Schema & Volumetric Enforcements**: Every collection validates required keys with `data.keys().hasAll(...)` and blocks ghost/shadow keys with `data.keys().hasOnly(...)` synchronized verbatim with `firebase-blueprint.json` (including `maxLength` bounds on strings and size caps on `dependents` and `lines` arrays).
5. **Temporal & Immutability Integrity**: On document creation, `createdAt == request.time` and `updatedAt == request.time` are enforced; on updates, `id` and `createdAt` are immutable and `updatedAt == request.time` is required.
6. **Append-Only Audit Trail**: Documents in `audit_logs` allow `create` only with valid schema and `createdAt == request.time`, and strictly forbid `update` and `delete`.

## 2. The "Dirty Dozen" Adversarial Payloads
1. **Unauthenticated Collection Read**: Request without `request.auth` reads `members` or `users`. -> Must return `PERMISSION_DENIED`.
2. **Unverified Email Spoofing**: Request with `email: "Misganalead28@gmail.com"` and `email_verified: false` writes to `iddir_config/main`. -> Must return `PERMISSION_DENIED`.
3. **Non-Admin User Account Scraping**: Signed-in non-admin user attempts `list` on `users`. -> Must return `PERMISSION_DENIED`.
4. **Shadow Ghost Field Injection**: Write to `payments/{id}` includes undeclared key `bypassApproval: true`. -> Must return `PERMISSION_DENIED`.
5. **Oversized Photo Payload Exhaustion**: Write to `members/{id}` with 600KB `photoUrl`. -> Must return `PERMISSION_DENIED`.
6. **Invalid Role Escalation**: Write to `users/{id}` with `role: "super_root"`. -> Must return `PERMISSION_DENIED`.
7. **Timestamp Forgery on Create**: Write to `payments/{id}` passes arbitrary client timestamp instead of `request.time`. -> Must return `PERMISSION_DENIED`.
8. **Immutable Field Mutation**: Update to `payments/{id}` attempts to mutate `id` or `createdAt`. -> Must return `PERMISSION_DENIED`.
9. **Audit Trail Tampering**: Request attempts `update` or `delete` on `audit_logs/{logId}`. -> Must return `PERMISSION_DENIED`.
10. **Negative Monetary Value Injection**: Write to `payments/{id}` sets `amount: -500`. -> Must return `PERMISSION_DENIED`.
11. **Unbounded Dependents Array Injection**: Write to `members/{id}` supplies invalid element type in `dependents`. -> Must return `PERMISSION_DENIED`.
12. **Poisoned Document ID**: Write to `iddir_bylaws/bad..id$!` with disallowed characters. -> Must return `PERMISSION_DENIED`.

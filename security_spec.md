# Security Specification — Aleta Wendo Youth Mutual Aid Association (የአለታ ወንዶ ወጣቶች በሁሉ ቦታ መረዳጃ ዕድር)

## 1. Data Invariants
1. **Identity & Privilege Invariant**: A regular member cannot create or update their own `members/{uid}` document with an elevated role (`chairperson`, `secretary`, `treasurer`, `auditor`) or modify `status`/`monthlyDuesRate`. Only the bootstrapped Chairperson/Admin (`Misganalead28@gmail.com` with `email_verified == true`) can assign roles or change member status.
2. **PII Isolation Invariant**: Documents in `/members/{memberId}` containing `email`, `phone`, and `address` can only be read by the document owner (`uid == request.auth.uid`), verified officers (on single-doc `get`), or the bootstrapped Admin. Public directory entries in `/members_public/{memberId}` exclude all PII (`email`, `phone`, `address`, `guarantorPhone`).
3. **Receipt & Financial Authorization Invariant**: A member creating a contribution in `/contributions/{contributionId}` MUST set `memberUid == request.auth.uid`, `status == 'pending'`, and `reconciled == false`. Members cannot self-approve their own payments or mark them reconciled; only verified Treasurers/Chairpersons/Admins can transition `status` from `pending` to `approved`/`rejected` or update `reconciled`. Once `status == 'approved'`, a contribution is terminally locked against non-admin edits.
4. **Master Gate & Dependent Integrity**: A dependent in `/members/{memberId}/dependents/{dependentId}` can only exist when the parent `/members/{memberId}` document exists, and `dependent.uid == memberId`.
5. **One-Member-One-Vote Invariant**: A ballot in `/polls/{pollId}/votes/{uid}` requires the parent `/polls/{pollId}` to exist with `status == 'open'`, `voteId == request.auth.uid`, `uid == request.auth.uid`, and forbids updates or deletes after submission.
6. **Temporal & Volumetric Integrity**: All `createdAt` and `updatedAt` fields must equal `request.time`; `createdAt` and ownership fields (`uid`, `memberUid`, `actorUid`) are immutable after creation; all strings enforce `.size()` limits and all path IDs match `^[a-zA-Z0-9_\-]+$`.
7. **Audit Trail Immutability**: Documents in `/audit_logs/{logId}` are append-only (`update` and `delete` always denied) and `actorUid` must equal `request.auth.uid`.

## 2. The "Dirty Dozen" Adversarial Payloads
1. **Role Self-Escalation on Create**: Member signs up at `/members/{uid}` with `role: "treasurer"` instead of `"member"`. -> Must return `PERMISSION_DENIED`.
2. **Role Self-Escalation on Update**: Member updates own `/members/{uid}` with `role: "chairperson"`. -> Must return `PERMISSION_DENIED`.
3. **Shadow Ghost Field Injection**: User creates a contribution with an undeclared field `isSuperApproved: true`. -> Must return `PERMISSION_DENIED`.
4. **Self-Approval Payment Bypass**: Member creates `/contributions/{id}` with `status: "approved"` directly. -> Must return `PERMISSION_DENIED`.
5. **Cross-Member Impersonation**: User A creates `/contributions/{id}` with `memberUid: "userB"`. -> Must return `PERMISSION_DENIED`.
6. **Unverified Email Spoofing**: Request with `email: "Misganalead28@gmail.com"` and `email_verified: false`. -> Must return `PERMISSION_DENIED`.
7. **PII Cross-Read Attack**: Non-officer User A reads `/members/userB` to harvest phone/address. -> Must return `PERMISSION_DENIED`.
8. **Blanket List Query Scraping**: User A runs `getDocs(collection(db, "contributions"))` without filtering by `memberUid`. -> Must return `PERMISSION_DENIED`.
9. **Terminal State Tampering**: Non-admin edits an already `approved` contribution's `amount`. -> Must return `PERMISSION_DENIED`.
10. **Closed Poll / Double Vote Injection**: User votes in `/polls/{pollId}/votes/otherUserUid` or on a `closed` poll. -> Must return `PERMISSION_DENIED`.
11. **ID Poisoning / Resource Exhaustion**: User writes to `/contributions/` with a 1500-char document ID or a 600KB `notes` field. -> Must return `PERMISSION_DENIED`.
12. **Audit Log Tampering**: User attempts to `update` or `delete` an entry in `/audit_logs/{logId}`. -> Must return `PERMISSION_DENIED`.

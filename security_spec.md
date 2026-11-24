# Montana Cloud — Security Specification (Phase 0 TDD)

## 1. Data Invariants
1. **Strict Ownership Isolation**: Every document in `nodes`, `mcpServers`, `warrdcoreModels`, `devEnvs`, `infraResources`, and `aiLogs` MUST contain `ownerId == request.auth.uid`. Non-owners cannot `get`, `list`, `create`, `update`, or `delete`.
2. **PII Isolation**: `/users/{userId}` holds operator email and display name and is strictly isolated to `userId == request.auth.uid` (or verified admin). No `allow list` is permitted on `/users`.
3. **Immutable Ownership & Timestamps**: `ownerId` and `createdAt` can never be mutated on update. All `createdAt` (on create) and `updatedAt` (on create/update) MUST equal `request.time`.
4. **Terminal State Lock**: Once a `CloudNode` reaches `status == 'terminated'`, or a `WarrdcoreModel` reaches `status == 'archived'`, no further client mutations are allowed (except verified admin override).
5. **Append-Only Audit Logs**: `aiLogs` supports `create`, `get`, `list`, and `delete` by owner, with `update: if false` so execution history cannot be falsified.
6. **Verified Identity**: All writes require `request.auth.token.email_verified == true`.
7. **Volumetric Bounds & Regex Guards**: All document IDs match `^[a-zA-Z0-9_\-]+$` (`<= 128` chars), all strings enforce explicit `.size()` ceilings, and all arrays enforce `<= 24` items with element type validation.

## 2. The "Dirty Dozen" Adversarial Payloads (Must All Return PERMISSION_DENIED)
1. **Identity Spoofing on Create**: Creating `/nodes/node-1` with `ownerId: "victim-uid"` while signed in as `"attacker-uid"`.
2. **Shadow Field Injection**: Creating `/nodes/node-2` with all valid fields plus an undeclared ghost field `isAdmin: true`.
3. **Role Self-Escalation**: Creating `/users/attacker-uid` with `role: "admin"` instead of `"operator"`.
4. **Unverified Email Write**: Creating `/mcpServers/mcp-1` when `request.auth.token.email_verified == false`.
5. **PII Cross-User Read**: Executing `get` on `/users/victim-uid` while signed in as `"attacker-uid"`.
6. **Unscoped List Scraping**: Executing `list` on `/nodes` without filtering `ownerId == request.auth.uid`.
7. **ID Poisoning**: Creating `/nodes/../../../etc/passwd` or a 200-character document ID.
8. **Timestamp Forgery**: Creating `/devEnvs/env-1` with a backdated client timestamp instead of `request.time`.
9. **Immutable Field Mutation**: Updating `/nodes/node-1` to change `ownerId` or `createdAt`.
10. **Terminal State Bypass**: Updating a `CloudNode` whose `existing().status == 'terminated'` back to `'running'`.
11. **Value Poisoning on Update**: Updating `/warrdcoreModels/m-1` setting `quantization: "INVALID_TYPE"` or a 20KB `systemPrompt`.
12. **Audit Log Tampering**: Updating an existing document in `/aiLogs/{logId}` to alter `mcpToolsExecuted`.

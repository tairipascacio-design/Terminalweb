/**
 * Phase 0 Payload-First Security Test Suite for Montana Cloud Firestore Rules.
 * Verifies all 12 Dirty Dozen adversarial payloads against firestore.rules.
 */

export interface AdversarialCase {
  id: number;
  name: string;
  collection: string;
  docId: string;
  operation: 'get' | 'list' | 'create' | 'update' | 'delete';
  auth: { uid: string; email: string; email_verified: boolean } | null;
  payload?: Record<string, unknown>;
  expectedResult: 'PERMISSION_DENIED';
}

export const DIRTY_DOZEN_CASES: AdversarialCase[] = [
  {
    id: 1,
    name: 'Identity Spoofing on CloudNode Create',
    collection: 'nodes',
    docId: 'node-spoof-1',
    operation: 'create',
    auth: { uid: 'attacker-uid', email: 'attacker@example.com', email_verified: true },
    payload: { ownerId: 'victim-uid', name: 'spoofed-box', provider: 'hetzner', status: 'running' },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 2,
    name: 'Shadow Field Injection on CloudNode',
    collection: 'nodes',
    docId: 'node-shadow-2',
    operation: 'create',
    auth: { uid: 'attacker-uid', email: 'attacker@example.com', email_verified: true },
    payload: { ownerId: 'attacker-uid', name: 'shadow-box', isAdmin: true },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 3,
    name: 'Self-Assigned Admin Role on User Profile',
    collection: 'users',
    docId: 'attacker-uid',
    operation: 'create',
    auth: { uid: 'attacker-uid', email: 'attacker@example.com', email_verified: true },
    payload: { uid: 'attacker-uid', email: 'attacker@example.com', displayName: 'Boss', role: 'admin', preferredRegion: 'fsn1' },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 4,
    name: 'Unverified Email Write on MCP Server',
    collection: 'mcpServers',
    docId: 'mcp-unverified',
    operation: 'create',
    auth: { uid: 'attacker-uid', email: 'weroelmasaka@gmail.com', email_verified: false },
    payload: { ownerId: 'attacker-uid', name: 'unverified-mcp' },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 5,
    name: 'Cross-User PII Read on Users Collection',
    collection: 'users',
    docId: 'victim-uid',
    operation: 'get',
    auth: { uid: 'attacker-uid', email: 'attacker@example.com', email_verified: true },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 6,
    name: 'Unscoped Collection List Without Owner Filter',
    collection: 'nodes',
    docId: '*',
    operation: 'list',
    auth: { uid: 'attacker-uid', email: 'attacker@example.com', email_verified: true },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 7,
    name: 'Document ID Poisoning (>128 chars or illegal chars)',
    collection: 'nodes',
    docId: 'a'.repeat(160),
    operation: 'create',
    auth: { uid: 'attacker-uid', email: 'attacker@example.com', email_verified: true },
    payload: { ownerId: 'attacker-uid', name: 'long-id-box' },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 8,
    name: 'Client Timestamp Forgery on DevEnvironment',
    collection: 'devEnvs',
    docId: 'env-forge',
    operation: 'create',
    auth: { uid: 'attacker-uid', email: 'attacker@example.com', email_verified: true },
    payload: { ownerId: 'attacker-uid', name: 'termux', createdAt: '1999-01-01T00:00:00Z' },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 9,
    name: 'Immutable ownerId Mutation on Update',
    collection: 'nodes',
    docId: 'node-1',
    operation: 'update',
    auth: { uid: 'owner-uid', email: 'owner@example.com', email_verified: true },
    payload: { ownerId: 'other-uid' },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 10,
    name: 'Terminal State Bypass on Terminated CloudNode',
    collection: 'nodes',
    docId: 'node-terminated',
    operation: 'update',
    auth: { uid: 'owner-uid', email: 'owner@example.com', email_verified: true },
    payload: { status: 'running' },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 11,
    name: 'Value Poisoning with Oversized Prompt on WarrdCore Model',
    collection: 'warrdcoreModels',
    docId: 'model-1',
    operation: 'update',
    auth: { uid: 'owner-uid', email: 'owner@example.com', email_verified: true },
    payload: { systemPrompt: 'X'.repeat(5000) },
    expectedResult: 'PERMISSION_DENIED',
  },
  {
    id: 12,
    name: 'Audit Log Tampering via Update on aiLogs',
    collection: 'aiLogs',
    docId: 'log-1',
    operation: 'update',
    auth: { uid: 'owner-uid', email: 'owner@example.com', email_verified: true },
    payload: { summary: 'tampered' },
    expectedResult: 'PERMISSION_DENIED',
  },
];

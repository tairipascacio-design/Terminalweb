export type CloudProvider = 'hetzner' | 'digitalocean' | 'warrdcore-cloud';
export type NodeStatus = 'running' | 'stopped' | 'provisioning' | 'rebooting' | 'terminated';

export interface CloudNode {
  id: string;
  ownerId: string;
  name: string;
  provider: CloudProvider;
  plan: string;
  region: string;
  osImage: string;
  ipv4: string;
  privateIp: string;
  vcpu: number;
  ramGb: number;
  diskGb: number;
  status: NodeStatus;
  uptime247: boolean;
  monthlyCostUsd: number;
  workload: string;
  tags: string[];
  createdAt?: unknown;
  updatedAt?: unknown;
}

export type McpTransport = 'sse' | 'http-streamable' | 'stdio-cloud';
export type McpCategory =
  | 'infrastructure'
  | 'terminal'
  | 'database'
  | 'ai-runtime'
  | 'git-devops'
  | 'network';

export interface McpServer {
  id: string;
  ownerId: string;
  name: string;
  transport: McpTransport;
  endpoint: string;
  category: McpCategory;
  enabled: boolean;
  autoApprove: boolean;
  tools: string[];
  description: string;
  invocations: number;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export type QuantizationType = 'Q4_K_M' | 'Q6_K' | 'Q8_0' | 'FP16' | 'BF16' | 'GGUF-Custom';
export type ModelRuntimeStatus = 'active' | 'warming' | 'standby' | 'archived';

export interface WarrdcoreModel {
  id: string;
  ownerId: string;
  name: string;
  warrdcoreUri: string;
  endpointUrl: string;
  architecture: string;
  quantization: QuantizationType;
  contextWindow: number;
  targetNode: string;
  keepAlive247: boolean;
  status: ModelRuntimeStatus;
  systemPrompt: string;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export type DeviceKind = 'termux-android' | 'ubuntu-linux' | 'cloud-container' | 'workstation';
export type ShellKind = 'zsh' | 'bash' | 'fish';
export type SyncState = 'synced' | 'syncing' | 'drift' | 'paused';

export interface DevEnvironment {
  id: string;
  ownerId: string;
  name: string;
  deviceType: DeviceKind;
  osRelease: string;
  shell: ShellKind;
  repoUrl: string;
  syncState: SyncState;
  dotfilesRevision: string;
  packages: string[];
  envProfile: string;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export type InfraResourceKind =
  | 'firewall'
  | 'floating-ip'
  | 'vpc'
  | 'snapshot'
  | 'volume'
  | 'oauth-connector'
  | 'ssh-key'
  | 'daemon-247';

export type InfraProvider =
  | 'hetzner'
  | 'digitalocean'
  | 'cloudflare'
  | 'github'
  | 'tailscale'
  | 'warrdcore'
  | 'montana-mesh';

export interface InfraResource {
  id: string;
  ownerId: string;
  kind: InfraResourceKind;
  name: string;
  provider: InfraProvider;
  target: string;
  spec: string;
  enabled: boolean;
  createdAt?: unknown;
  updatedAt?: unknown;
}

export interface AiAuditLog {
  id: string;
  ownerId: string;
  modelUsed: string;
  prompt: string;
  summary: string;
  mcpToolsExecuted: string[];
  status: 'completed' | 'failed';
  createdAt?: unknown;
}

export type ActiveSection =
  | 'overview'
  | 'nodes'
  | 'terminal'
  | 'mcp'
  | 'warrdcore'
  | 'devenvs'
  | 'infrastructure'
  | 'ai-commander';

// Safe deterministic ID generator matching ^[a-zA-Z0-9_\-]+$ (<= 128 chars)
export function makeSafeDocId(prefix: string): string {
  const cleanPrefix = prefix.replace(/[^a-zA-Z0-9_-]/g, '').slice(0, 24) || 'doc';
  const rand = Math.random().toString(36).slice(2, 10);
  return `${cleanPrefix}-${Date.now().toString(36)}-${rand}`;
}

// Defensive payload truncation synchronized with firebase-blueprint.json
export function clampString(value: string, maxLen: number, fallback = ''): string {
  const trimmed = (value || '').trim();
  if (!trimmed) return fallback.slice(0, maxLen);
  return trimmed.slice(0, maxLen);
}

export function clampStringList(values: string[], maxItems: number, maxItemLen = 64): string[] {
  return values
    .map((v) => v.trim().slice(0, maxItemLen))
    .filter(Boolean)
    .slice(0, maxItems);
}

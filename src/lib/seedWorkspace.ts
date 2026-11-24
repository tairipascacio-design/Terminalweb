import { User } from 'firebase/auth';
import {
  collection,
  doc,
  getDoc,
  getDocs,
  query,
  serverTimestamp,
  setDoc,
  where,
  writeBatch,
} from 'firebase/firestore';
import { db, handleFirestoreError, OperationType } from './firebase';
import { clampString, makeSafeDocId } from '../types/cloud';

export async function ensureOperatorWorkspace(user: User): Promise<void> {
  const userRef = doc(db, 'users', user.uid);
  try {
    const snap = await getDoc(userRef);
    if (!snap.exists()) {
      await setDoc(userRef, {
        uid: user.uid,
        email: clampString(user.email || 'operator@montana.cloud', 254, 'operator@montana.cloud'),
        displayName: clampString(user.displayName || 'Ejecutivo Montana', 120, 'Ejecutivo Montana'),
        role: 'operator',
        preferredRegion: 'fsn1',
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, `users/${user.uid}`);
  }

  // Check if the operator already has provisioned cloud nodes
  let hasNodes = false;
  try {
    const existingNodes = await getDocs(
      query(collection(db, 'nodes'), where('ownerId', '==', user.uid))
    );
    hasNodes = !existingNodes.empty;
  } catch (err) {
    handleFirestoreError(err, OperationType.LIST, 'nodes');
  }

  if (hasNodes) return;

  // Bootstrap an executive Hetzner + DigitalOcean + WarrdCore starter empire in one atomic batch
  const batch = writeBatch(db);
  const now = serverTimestamp();

  const starterNodes = [
    {
      name: 'montana-fra-core-01',
      provider: 'hetzner',
      plan: 'CPX41 · Dedicated',
      region: 'fsn1',
      osImage: 'Ubuntu 24.04 LTS',
      ipv4: '95.217.144.28',
      privateIp: '10.10.0.10',
      vcpu: 8,
      ramGb: 16,
      diskGb: 240,
      status: 'running',
      uptime247: true,
      monthlyCostUsd: 29.9,
      workload: 'Docker Swarm · MCP Gateway · Reverse Proxy TLS',
      tags: ['production', '24-7', 'hetzner-eu'],
    },
    {
      name: 'do-nyc3-edge-apps',
      provider: 'digitalocean',
      plan: 's-4vcpu-8gb-amd',
      region: 'nyc3',
      osImage: 'Ubuntu 24.04 LTS',
      ipv4: '164.92.88.104',
      privateIp: '10.10.0.12',
      vcpu: 4,
      ramGb: 8,
      diskGb: 160,
      status: 'running',
      uptime247: true,
      monthlyCostUsd: 48.0,
      workload: 'Apps Web · APIs Node.js · Termux SSH Bastion',
      tags: ['edge-us', 'digitalocean', 'apps'],
    },
    {
      name: 'warrdcore-infer-247',
      provider: 'warrdcore-cloud',
      plan: 'WC-H100-NVMe',
      region: 'hel1',
      osImage: 'Ubuntu 24.04 CUDA 12.6',
      ipv4: '135.181.204.77',
      privateIp: '10.10.0.14',
      vcpu: 16,
      ramGb: 64,
      diskGb: 640,
      status: 'running',
      uptime247: true,
      monthlyCostUsd: 118.0,
      workload: 'WarrdCore 24/7 Model Server · vLLM / GGUF Runtime',
      tags: ['warrdcore', 'gpu-247', 'ai-inference'],
    },
  ];

  for (const node of starterNodes) {
    batch.set(doc(db, 'nodes', makeSafeDocId('node')), {
      ownerId: user.uid,
      ...node,
      createdAt: now,
      updatedAt: now,
    });
  }

  const starterMcp = [
    {
      name: 'hetzner-infra-mcp',
      transport: 'http-streamable',
      endpoint: 'https://mcp.montana.internal/hetzner',
      category: 'infrastructure',
      enabled: true,
      autoApprove: true,
      tools: ['provision_server', 'resize_node', 'firewall_apply', 'snapshot_create'],
      description: 'Control total de servidores dedicados, firewalls y volúmenes NVMe estilo Hetzner Cloud.',
      invocations: 42,
    },
    {
      name: 'digitalocean-droplets-mcp',
      transport: 'sse',
      endpoint: 'https://mcp.montana.internal/digitalocean',
      category: 'infrastructure',
      enabled: true,
      autoApprove: true,
      tools: ['droplet_create', 'floating_ip_assign', 'vpc_route', 'load_balancer_sync'],
      description: 'Orquestación de Droplets, Reserved IPs, VPC y App Platform estilo DigitalOcean.',
      invocations: 29,
    },
    {
      name: 'ubuntu-termux-shell-mcp',
      transport: 'stdio-cloud',
      endpoint: 'ssh://10.10.0.10:22/mcp-shell',
      category: 'terminal',
      enabled: true,
      autoApprove: false,
      tools: ['exec_ubuntu', 'exec_termux', 'proot_login', 'systemd_restart'],
      description: 'Puente directo hacia terminales Ubuntu 24.04 LTS y sesiones móviles Termux.',
      invocations: 64,
    },
    {
      name: 'warrdcore-runtime-mcp',
      transport: 'http-streamable',
      endpoint: 'https://10.10.0.14:11434/mcp',
      category: 'ai-runtime',
      enabled: true,
      autoApprove: true,
      tools: ['pull_model', 'load_weights_247', 'benchmark_tps', 'hot_swap_quant'],
      description: 'Gestión de modelos importados desde WarrdCore, cuantización y servicio 24/7.',
      invocations: 37,
    },
    {
      name: 'cloud-dev-sync-mcp',
      transport: 'sse',
      endpoint: 'https://mcp.montana.internal/devsync',
      category: 'git-devops',
      enabled: true,
      autoApprove: true,
      tools: ['sync_dotfiles', 'push_env_vault', 'pull_git_fleet', 'verify_packages'],
      description: 'Sincronización instantánea de entornos de desarrollo entre móvil, Linux y nube.',
      invocations: 18,
    },
  ];

  for (const srv of starterMcp) {
    batch.set(doc(db, 'mcpServers', makeSafeDocId('mcp')), {
      ownerId: user.uid,
      ...srv,
      createdAt: now,
      updatedAt: now,
    });
  }

  const starterModels = [
    {
      name: 'WarrdCore Sovereign 70B',
      warrdcoreUri: 'warrdcore://vault/sovereign-70b-instruct:q4_k_m',
      endpointUrl: '',
      architecture: 'Llama-3.3-70B-WarrdCore',
      quantization: 'Q4_K_M',
      contextWindow: 131072,
      targetNode: 'warrdcore-infer-247',
      keepAlive247: true,
      status: 'active',
      systemPrompt:
        'Modelo propietario de infraestructura 24/7 especializado en arquitectura Linux, seguridad DevOps y automatización MCP.',
    },
    {
      name: 'WarrdCore CodeForge 32B',
      warrdcoreUri: 'warrdcore://registry/codeforge-32b-pro:q8_0',
      endpointUrl: '',
      architecture: 'Qwen-2.5-Coder-32B',
      quantization: 'Q8_0',
      contextWindow: 65536,
      targetNode: 'warrdcore-infer-247',
      keepAlive247: true,
      status: 'active',
      systemPrompt:
        'Especialista en refactorización TypeScript, Rust, Dockerfiles, scripts bash para Ubuntu/Termux y optimización de servidores.',
    },
  ];

  for (const model of starterModels) {
    batch.set(doc(db, 'warrdcoreModels', makeSafeDocId('wc')), {
      ownerId: user.uid,
      ...model,
      createdAt: now,
      updatedAt: now,
    });
  }

  const starterEnvs = [
    {
      name: 'Termux Mobile Rig (Android)',
      deviceType: 'termux-android',
      osRelease: 'Termux 0.119 + proot Ubuntu 24.04',
      shell: 'zsh',
      repoUrl: 'https://github.com/montana-ops/dotfiles-mobile',
      syncState: 'synced',
      dotfilesRevision: 'rev-84f2a',
      packages: ['openssh', 'proot-distro', 'tmux', 'neovim', 'git', 'nodejs', 'warrdcore-cli'],
      envProfile: 'TERMUX_PROOT=ubuntu · SSH_TUNNEL=10.10.0.10 · AUTO_SYNC=ON',
    },
    {
      name: 'Ubuntu 24.04 LTS Cloud Primary',
      deviceType: 'ubuntu-linux',
      osRelease: 'Ubuntu 24.04.2 LTS (Noble)',
      shell: 'bash',
      repoUrl: 'https://github.com/montana-ops/infra-stack',
      syncState: 'synced',
      dotfilesRevision: 'rev-84f2a',
      packages: ['docker-ce', 'caddy', 'wireguard', 'python3', 'postgresql-client', 'mcp-bridge'],
      envProfile: 'NODE_ENV=production · DOCKER_BUILDKIT=1 · WATCHDOG_247=ACTIVE',
    },
    {
      name: 'DevContainer AI Sandbox',
      deviceType: 'cloud-container',
      osRelease: 'Debian 12 / CUDA 12.6',
      shell: 'zsh',
      repoUrl: 'https://github.com/montana-ops/warrdcore-agents',
      syncState: 'drift',
      dotfilesRevision: 'rev-81c09',
      packages: ['cuda-toolkit', 'uv', 'pytorch', 'vllm', 'gh'],
      envProfile: 'WARRDCORE_CACHE=/mnt/warrdcore-weights · MCP_AUTO=TRUE',
    },
  ];

  for (const env of starterEnvs) {
    batch.set(doc(db, 'devEnvs', makeSafeDocId('env')), {
      ownerId: user.uid,
      ...env,
      createdAt: now,
      updatedAt: now,
    });
  }

  const starterResources = [
    {
      kind: 'firewall',
      name: 'Edge Perimeter Shield',
      provider: 'hetzner',
      target: 'montana-fra-core-01',
      spec: 'ALLOW TCP 22 (SSH Key), 443 (TLS) · DENY ALL ELSE · VPC 10.10.0.0/16 OPEN',
      enabled: true,
    },
    {
      kind: 'floating-ip',
      name: 'Executive Failover IPv4',
      provider: 'digitalocean',
      target: 'do-nyc3-edge-apps',
      spec: 'Reserved Floating IP 164.92.88.104 · Instant Zero-Downtime Reassign',
      enabled: true,
    },
    {
      kind: 'vpc',
      name: 'Montana Private WireGuard Mesh',
      provider: 'tailscale',
      target: '10.10.0.0/16',
      spec: 'Encrypted Mesh linking Termux Android, Hetzner FRA1, DO NYC3 & WarrdCore HEL1',
      enabled: true,
    },
    {
      kind: 'snapshot',
      name: 'Daily Golden Image 04:00 UTC',
      provider: 'hetzner',
      target: 'warrdcore-infer-247',
      spec: 'Automated incremental NVMe snapshot · 14-day retention · Instant rollback',
      enabled: true,
    },
    {
      kind: 'volume',
      name: 'warrdcore-weights-nvme',
      provider: 'hetzner',
      target: '/mnt/warrdcore-weights',
      spec: '500 GB Dedicated NVMe Block Storage · XFS · 3.2 GB/s read throughput',
      enabled: true,
    },
    {
      kind: 'oauth-connector',
      name: 'GitHub & Cloud OAuth Bridge',
      provider: 'github',
      target: 'OAuth 2.0 · repo, read:org, workflow',
      spec: 'Auto-deploy webhooks, dotfiles sync & container registry pull tokens',
      enabled: true,
    },
    {
      kind: 'ssh-key',
      name: 'Ed25519 Hardware Executive Key',
      provider: 'montana-mesh',
      target: 'All Cloud Nodes + Termux',
      spec: 'SHA256:M0nt4n4ExecKey9xP2vK7qL4zR8bW1cN5dF · Password auth disabled',
      enabled: true,
    },
    {
      kind: 'daemon-247',
      name: 'WarrdCore + MCP Watchdog 24/7',
      provider: 'warrdcore',
      target: 'warrdcore-infer-247',
      spec: 'systemd Restart=always · Healthcheck HTTP /health every 15s · Auto-heal',
      enabled: true,
    },
  ];

  for (const res of starterResources) {
    batch.set(doc(db, 'infraResources', makeSafeDocId('inf')), {
      ownerId: user.uid,
      ...res,
      createdAt: now,
      updatedAt: now,
    });
  }

  try {
    await batch.commit();
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, 'workspace-bootstrap');
  }
}

import { useCallback, useEffect, useState } from 'react';
import { onAuthStateChanged, signInWithPopup, signOut, User } from 'firebase/auth';
import {
  collection,
  deleteDoc,
  doc,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
} from 'firebase/firestore';
import {
  auth,
  db,
  googleProvider,
  handleFirestoreError,
  OperationType,
} from '../lib/firebase';
import { ensureOperatorWorkspace } from '../lib/seedWorkspace';
import {
  AiAuditLog,
  clampString,
  clampStringList,
  CloudNode,
  CloudProvider,
  DevEnvironment,
  DeviceKind,
  InfraProvider,
  InfraResource,
  InfraResourceKind,
  makeSafeDocId,
  McpCategory,
  McpServer,
  McpTransport,
  ModelRuntimeStatus,
  NodeStatus,
  QuantizationType,
  ShellKind,
  WarrdcoreModel,
} from '../types/cloud';

export interface McpToolExecutionOutcome {
  toolName: string;
  summary: string;
  ok: boolean;
}

export function useCloudState() {
  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [bootstrapping, setBootstrapping] = useState(false);
  const [authError, setAuthError] = useState<string | null>(null);

  const [nodes, setNodes] = useState<CloudNode[]>([]);
  const [mcpServers, setMcpServers] = useState<McpServer[]>([]);
  const [warrdcoreModels, setWarrdcoreModels] = useState<WarrdcoreModel[]>([]);
  const [devEnvs, setDevEnvs] = useState<DevEnvironment[]>([]);
  const [infraResources, setInfraResources] = useState<InfraResource[]>([]);
  const [aiLogs, setAiLogs] = useState<AiAuditLog[]>([]);
  const [dataLoading, setDataLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (nextUser) => {
      setUser(nextUser);
      setAuthReady(true);
      if (nextUser) {
        setBootstrapping(true);
        try {
          await ensureOperatorWorkspace(nextUser);
        } catch (err) {
          console.error('Workspace bootstrap failed:', err);
        } finally {
          setBootstrapping(false);
        }
      } else {
        setNodes([]);
        setMcpServers([]);
        setWarrdcoreModels([]);
        setDevEnvs([]);
        setInfraResources([]);
        setAiLogs([]);
        setDataLoading(false);
      }
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    if (!authReady || !user) return;
    setDataLoading(true);
    let resolvedCount = 0;
    const markResolved = () => {
      resolvedCount += 1;
      if (resolvedCount >= 6) setDataLoading(false);
    };

    const unsubs = [
      onSnapshot(
        query(collection(db, 'nodes'), where('ownerId', '==', user.uid)),
        (snap) => {
          setNodes(snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<CloudNode, 'id'>) })));
          markResolved();
        },
        (err) => handleFirestoreError(err, OperationType.LIST, 'nodes')
      ),
      onSnapshot(
        query(collection(db, 'mcpServers'), where('ownerId', '==', user.uid)),
        (snap) => {
          setMcpServers(
            snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<McpServer, 'id'>) }))
          );
          markResolved();
        },
        (err) => handleFirestoreError(err, OperationType.LIST, 'mcpServers')
      ),
      onSnapshot(
        query(collection(db, 'warrdcoreModels'), where('ownerId', '==', user.uid)),
        (snap) => {
          setWarrdcoreModels(
            snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<WarrdcoreModel, 'id'>) }))
          );
          markResolved();
        },
        (err) => handleFirestoreError(err, OperationType.LIST, 'warrdcoreModels')
      ),
      onSnapshot(
        query(collection(db, 'devEnvs'), where('ownerId', '==', user.uid)),
        (snap) => {
          setDevEnvs(
            snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<DevEnvironment, 'id'>) }))
          );
          markResolved();
        },
        (err) => handleFirestoreError(err, OperationType.LIST, 'devEnvs')
      ),
      onSnapshot(
        query(collection(db, 'infraResources'), where('ownerId', '==', user.uid)),
        (snap) => {
          setInfraResources(
            snap.docs.map((d) => ({ id: d.id, ...(d.data() as Omit<InfraResource, 'id'>) }))
          );
          markResolved();
        },
        (err) => handleFirestoreError(err, OperationType.LIST, 'infraResources')
      ),
      onSnapshot(
        query(collection(db, 'aiLogs'), where('ownerId', '==', user.uid)),
        (snap) => {
          const items = snap.docs.map((d) => ({
            id: d.id,
            ...(d.data() as Omit<AiAuditLog, 'id'>),
          }));
          items.sort((a, b) => {
            const ta = (a.createdAt as { seconds?: number } | undefined)?.seconds || 0;
            const tb = (b.createdAt as { seconds?: number } | undefined)?.seconds || 0;
            return tb - ta;
          });
          setAiLogs(items);
          markResolved();
        },
        (err) => handleFirestoreError(err, OperationType.LIST, 'aiLogs')
      ),
    ];

    return () => {
      unsubs.forEach((u) => u());
    };
  }, [authReady, user]);

  const loginWithGoogle = useCallback(async () => {
    setAuthError(null);
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'No se pudo completar el acceso con Google.';
      setAuthError(message);
    }
  }, []);

  const logout = useCallback(async () => {
    await signOut(auth);
  }, []);

  const getIdToken = useCallback(async (): Promise<string> => {
    if (!auth.currentUser) throw new Error('Sesión no iniciada.');
    return auth.currentUser.getIdToken();
  }, []);

  // --- Cloud Nodes CRUD ---
  const createNode = useCallback(
    async (input: {
      name: string;
      provider: CloudProvider;
      plan: string;
      region: string;
      osImage: string;
      vcpu: number;
      ramGb: number;
      diskGb: number;
      monthlyCostUsd: number;
      workload: string;
      uptime247: boolean;
      tags?: string[];
    }) => {
      if (!user) return;
      const id = makeSafeDocId('node');
      const oct2 = Math.floor(Math.random() * 200) + 20;
      const oct3 = Math.floor(Math.random() * 200) + 10;
      const oct4 = Math.floor(Math.random() * 220) + 15;
      const payload = {
        ownerId: user.uid,
        name: clampString(input.name, 80, 'montana-node'),
        provider: (['hetzner', 'digitalocean', 'warrdcore-cloud'].includes(input.provider)
          ? input.provider
          : 'hetzner') as CloudProvider,
        plan: clampString(input.plan, 48, 'CPX31'),
        region: clampString(input.region, 48, 'fsn1'),
        osImage: clampString(input.osImage, 64, 'Ubuntu 24.04 LTS'),
        ipv4: `${input.provider === 'digitalocean' ? '164.92' : '95.217'}.${oct3}.${oct4}`,
        privateIp: `10.10.${Math.floor(oct2 / 4)}.${oct4}`,
        vcpu: Math.max(1, Math.min(256, Math.round(Number(input.vcpu) || 4))),
        ramGb: Math.max(1, Math.min(2048, Math.round(Number(input.ramGb) || 8))),
        diskGb: Math.max(10, Math.min(32768, Math.round(Number(input.diskGb) || 160))),
        status: 'running' as NodeStatus,
        uptime247: Boolean(input.uptime247),
        monthlyCostUsd: Math.max(0, Math.min(50000, Number(input.monthlyCostUsd) || 24)),
        workload: clampString(input.workload, 160, 'Servicios Cloud 24/7'),
        tags: clampStringList(input.tags && input.tags.length ? input.tags : ['24-7', input.provider], 12),
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      };
      try {
        await setDoc(doc(db, 'nodes', id), payload);
      } catch (err) {
        handleFirestoreError(err, OperationType.CREATE, `nodes/${id}`);
      }
    },
    [user]
  );

  const updateNodePower = useCallback(
    async (nodeId: string, status: NodeStatus, uptime247: boolean) => {
      try {
        await updateDoc(doc(db, 'nodes', nodeId), {
          status,
          uptime247,
          updatedAt: serverTimestamp(),
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, `nodes/${nodeId}`);
      }
    },
    []
  );

  const deleteNode = useCallback(async (nodeId: string) => {
    try {
      await deleteDoc(doc(db, 'nodes', nodeId));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `nodes/${nodeId}`);
    }
  }, []);

  // --- MCP Servers CRUD ---
  const createMcpServer = useCallback(
    async (input: {
      name: string;
      transport: McpTransport;
      endpoint: string;
      category: McpCategory;
      tools: string[];
      description: string;
      autoApprove: boolean;
    }) => {
      if (!user) return;
      const id = makeSafeDocId('mcp');
      try {
        await setDoc(doc(db, 'mcpServers', id), {
          ownerId: user.uid,
          name: clampString(input.name, 80, 'custom-mcp'),
          transport: (['sse', 'http-streamable', 'stdio-cloud'].includes(input.transport)
            ? input.transport
            : 'http-streamable') as McpTransport,
          endpoint: clampString(input.endpoint, 256, 'https://mcp.montana.internal/custom'),
          category: (['infrastructure', 'terminal', 'database', 'ai-runtime', 'git-devops', 'network'].includes(
            input.category
          )
            ? input.category
            : 'infrastructure') as McpCategory,
          enabled: true,
          autoApprove: Boolean(input.autoApprove),
          tools: clampStringList(input.tools.length ? input.tools : ['execute_task'], 24),
          description: clampString(input.description, 280, 'Servidor MCP conectado a Montana Cloud.'),
          invocations: 0,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.CREATE, `mcpServers/${id}`);
      }
    },
    [user]
  );

  const toggleMcpServer = useCallback(async (serverId: string, enabled: boolean, autoApprove: boolean) => {
    try {
      await updateDoc(doc(db, 'mcpServers', serverId), {
        enabled,
        autoApprove,
        updatedAt: serverTimestamp(),
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `mcpServers/${serverId}`);
    }
  }, []);

  const incrementMcpInvocation = useCallback(async (serverId: string, currentCount: number) => {
    try {
      await updateDoc(doc(db, 'mcpServers', serverId), {
        invocations: Math.min(10000000, (currentCount || 0) + 1),
        updatedAt: serverTimestamp(),
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `mcpServers/${serverId}`);
    }
  }, []);

  const deleteMcpServer = useCallback(async (serverId: string) => {
    try {
      await deleteDoc(doc(db, 'mcpServers', serverId));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `mcpServers/${serverId}`);
    }
  }, []);

  // --- WarrdCore Models CRUD ---
  const createWarrdcoreModel = useCallback(
    async (input: {
      name: string;
      warrdcoreUri: string;
      endpointUrl: string;
      architecture: string;
      quantization: QuantizationType;
      contextWindow: number;
      targetNode: string;
      keepAlive247: boolean;
      systemPrompt: string;
    }) => {
      if (!user) return;
      const id = makeSafeDocId('wc');
      try {
        await setDoc(doc(db, 'warrdcoreModels', id), {
          ownerId: user.uid,
          name: clampString(input.name, 96, 'WarrdCore Custom'),
          warrdcoreUri: clampString(input.warrdcoreUri, 256, 'warrdcore://vault/custom:latest'),
          endpointUrl: clampString(input.endpointUrl, 256, ''),
          architecture: clampString(input.architecture, 64, 'Llama-3.3-Custom'),
          quantization: (['Q4_K_M', 'Q6_K', 'Q8_0', 'FP16', 'BF16', 'GGUF-Custom'].includes(
            input.quantization
          )
            ? input.quantization
            : 'Q4_K_M') as QuantizationType,
          contextWindow: Math.max(2048, Math.min(2000000, Math.round(Number(input.contextWindow) || 65536))),
          targetNode: clampString(input.targetNode, 80, 'warrdcore-infer-247'),
          keepAlive247: Boolean(input.keepAlive247),
          status: 'active' as ModelRuntimeStatus,
          systemPrompt: clampString(input.systemPrompt, 600, ''),
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.CREATE, `warrdcoreModels/${id}`);
      }
    },
    [user]
  );

  const updateWarrdcoreStatus = useCallback(
    async (modelId: string, status: ModelRuntimeStatus, keepAlive247: boolean) => {
      try {
        await updateDoc(doc(db, 'warrdcoreModels', modelId), {
          status,
          keepAlive247,
          updatedAt: serverTimestamp(),
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, `warrdcoreModels/${modelId}`);
      }
    },
    []
  );

  const deleteWarrdcoreModel = useCallback(async (modelId: string) => {
    try {
      await deleteDoc(doc(db, 'warrdcoreModels', modelId));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `warrdcoreModels/${modelId}`);
    }
  }, []);

  // --- Cloud Dev Environments CRUD ---
  const createDevEnv = useCallback(
    async (input: {
      name: string;
      deviceType: DeviceKind;
      osRelease: string;
      shell: ShellKind;
      repoUrl: string;
      packages: string[];
      envProfile: string;
    }) => {
      if (!user) return;
      const id = makeSafeDocId('env');
      try {
        await setDoc(doc(db, 'devEnvs', id), {
          ownerId: user.uid,
          name: clampString(input.name, 80, 'Cloud Dev Env'),
          deviceType: (['termux-android', 'ubuntu-linux', 'cloud-container', 'workstation'].includes(
            input.deviceType
          )
            ? input.deviceType
            : 'ubuntu-linux') as DeviceKind,
          osRelease: clampString(input.osRelease, 64, 'Ubuntu 24.04 LTS'),
          shell: (['zsh', 'bash', 'fish'].includes(input.shell) ? input.shell : 'zsh') as ShellKind,
          repoUrl: clampString(input.repoUrl, 256, ''),
          syncState: 'synced',
          dotfilesRevision: `rev-${Math.random().toString(16).slice(2, 7)}`,
          packages: clampStringList(input.packages.length ? input.packages : ['git', 'tmux', 'nodejs'], 24),
          envProfile: clampString(input.envProfile, 400, 'CLOUD_SYNC=ACTIVE'),
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.CREATE, `devEnvs/${id}`);
      }
    },
    [user]
  );

  const syncDevEnv = useCallback(async (envId: string) => {
    const nextRev = `rev-${Math.random().toString(16).slice(2, 7)}`;
    try {
      await updateDoc(doc(db, 'devEnvs', envId), {
        syncState: 'synced',
        dotfilesRevision: nextRev,
        updatedAt: serverTimestamp(),
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `devEnvs/${envId}`);
    }
  }, []);

  const syncAllDevEnvs = useCallback(async () => {
    const nextRev = `rev-${Math.random().toString(16).slice(2, 7)}`;
    for (const env of devEnvs) {
      try {
        await updateDoc(doc(db, 'devEnvs', env.id), {
          syncState: 'synced',
          dotfilesRevision: nextRev,
          updatedAt: serverTimestamp(),
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.UPDATE, `devEnvs/${env.id}`);
      }
    }
  }, [devEnvs]);

  const deleteDevEnv = useCallback(async (envId: string) => {
    try {
      await deleteDoc(doc(db, 'devEnvs', envId));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `devEnvs/${envId}`);
    }
  }, []);

  // --- Hetzner & DO Enterprise Infra Resources CRUD ---
  const createInfraResource = useCallback(
    async (input: {
      kind: InfraResourceKind;
      name: string;
      provider: InfraProvider;
      target: string;
      spec: string;
    }) => {
      if (!user) return;
      const id = makeSafeDocId('inf');
      try {
        await setDoc(doc(db, 'infraResources', id), {
          ownerId: user.uid,
          kind: ([
            'firewall',
            'floating-ip',
            'vpc',
            'snapshot',
            'volume',
            'oauth-connector',
            'ssh-key',
            'daemon-247',
          ].includes(input.kind)
            ? input.kind
            : 'firewall') as InfraResourceKind,
          name: clampString(input.name, 96, 'Regla Cloud'),
          provider: ([
            'hetzner',
            'digitalocean',
            'cloudflare',
            'github',
            'tailscale',
            'warrdcore',
            'montana-mesh',
          ].includes(input.provider)
            ? input.provider
            : 'hetzner') as InfraProvider,
          target: clampString(input.target, 128, 'all-nodes'),
          spec: clampString(input.spec, 320, 'Configuración activa'),
          enabled: true,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.CREATE, `infraResources/${id}`);
      }
    },
    [user]
  );

  const toggleInfraResource = useCallback(async (resourceId: string, enabled: boolean) => {
    try {
      await updateDoc(doc(db, 'infraResources', resourceId), {
        enabled,
        updatedAt: serverTimestamp(),
      });
    } catch (err) {
      handleFirestoreError(err, OperationType.UPDATE, `infraResources/${resourceId}`);
    }
  }, []);

  const deleteInfraResource = useCallback(async (resourceId: string) => {
    try {
      await deleteDoc(doc(db, 'infraResources', resourceId));
    } catch (err) {
      handleFirestoreError(err, OperationType.DELETE, `infraResources/${resourceId}`);
    }
  }, []);

  // --- Append-Only AI Audit Log ---
  const recordAiAuditLog = useCallback(
    async (entry: {
      modelUsed: string;
      prompt: string;
      summary: string;
      mcpToolsExecuted: string[];
      status: 'completed' | 'failed';
    }) => {
      if (!user) return;
      const id = makeSafeDocId('log');
      try {
        await setDoc(doc(db, 'aiLogs', id), {
          ownerId: user.uid,
          modelUsed: clampString(entry.modelUsed, 96, 'gemini-4-hydrogen'),
          prompt: clampString(entry.prompt, 1200, 'Comando IA'),
          summary: clampString(entry.summary, 2400, 'Ejecutado'),
          mcpToolsExecuted: clampStringList(entry.mcpToolsExecuted, 24),
          status: entry.status,
          createdAt: serverTimestamp(),
        });
      } catch (err) {
        handleFirestoreError(err, OperationType.CREATE, `aiLogs/${id}`);
      }
    },
    [user]
  );

  // --- Autonomous MCP Intent Executor (Triggered by Gemini Function Calls) ---
  const executeMcpToolCall = useCallback(
    async (
      name: string,
      args: Record<string, unknown>
    ): Promise<McpToolExecutionOutcome> => {
      try {
        switch (name) {
          case 'mcp_provision_node': {
            const nodeName = String(args.name || `montana-node-${Date.now().toString(36).slice(-4)}`);
            const provider = (args.provider as CloudProvider) || 'hetzner';
            await createNode({
              name: nodeName,
              provider,
              plan: String(args.plan || (provider === 'digitalocean' ? 's-4vcpu-8gb' : 'CPX41')),
              region: String(args.region || 'fsn1'),
              osImage: String(args.osImage || 'Ubuntu 24.04 LTS'),
              vcpu: Number(args.vcpu || 4),
              ramGb: Number(args.ramGb || 8),
              diskGb: Number(args.diskGb || 160),
              monthlyCostUsd: provider === 'warrdcore-cloud' ? 98 : 29,
              workload: String(args.workload || 'Servicios 24/7'),
              uptime247: true,
              tags: ['mcp-deployed', '24-7'],
            });
            return {
              toolName: name,
              summary: `Servidor 24/7 "${nodeName}" aprovisionado en ${provider} (${String(args.region || 'fsn1')}).`,
              ok: true,
            };
          }

          case 'mcp_power_node': {
            const needle = String(args.nodeName || '').toLowerCase();
            const match = nodes.find((n) => n.name.toLowerCase().includes(needle));
            if (!match) {
              return { toolName: name, summary: `No se encontró nodo que coincida con "${needle}".`, ok: false };
            }
            const nextStatus = (['running', 'stopped', 'rebooting'].includes(String(args.status))
              ? String(args.status)
              : 'running') as NodeStatus;
            const next247 = args.uptime247 !== undefined ? Boolean(args.uptime247) : match.uptime247;
            await updateNodePower(match.id, nextStatus, next247);
            return {
              toolName: name,
              summary: `Nodo "${match.name}" actualizado a estado ${nextStatus} (24/7: ${next247 ? 'ON' : 'OFF'}).`,
              ok: true,
            };
          }

          case 'mcp_manage_infra_resource': {
            const resName = String(args.name || 'Regla MCP');
            await createInfraResource({
              kind: (args.kind as InfraResourceKind) || 'firewall',
              name: resName,
              provider: (args.provider as InfraProvider) || 'hetzner',
              target: String(args.target || 'all-nodes'),
              spec: String(args.spec || 'Configurado por IA MCP'),
            });
            return {
              toolName: name,
              summary: `Recurso ${String(args.kind || 'firewall')} "${resName}" aplicado sobre ${String(args.target || 'all-nodes')}.`,
              ok: true,
            };
          }

          case 'mcp_run_ubuntu_termux': {
            const token = await getIdToken();
            const env = String(args.environment || 'ubuntu') === 'termux' ? 'termux' : 'ubuntu';
            const cmd = String(args.command || 'uptime');
            const res = await fetch('/api/terminal/exec', {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                Authorization: `Bearer ${token}`,
              },
              body: JSON.stringify({
                profile: env,
                command: cmd,
                infra: { nodes, mcpServers, warrdcoreModels, devEnvs },
              }),
            });
            const data = (await res.json()) as { output?: string };
            return {
              toolName: name,
              summary: `[${env}] $ ${cmd} -> ${(data.output || 'OK').slice(0, 180)}`,
              ok: res.ok,
            };
          }

          case 'mcp_sync_dev_env': {
            const target = String(args.envName || 'all').toLowerCase();
            if (target === 'all') {
              await syncAllDevEnvs();
              return {
                toolName: name,
                summary: `Sincronización nube completada para los ${devEnvs.length} entornos registrados.`,
                ok: true,
              };
            }
            const match = devEnvs.find((e) => e.name.toLowerCase().includes(target));
            if (match) {
              await syncDevEnv(match.id);
              return { toolName: name, summary: `Entorno "${match.name}" sincronizado con éxito.`, ok: true };
            }
            await syncAllDevEnvs();
            return { toolName: name, summary: 'Entornos sincronizados a través de la nube.', ok: true };
          }

          case 'mcp_import_warrdcore_model': {
            const modelName = String(args.name || 'WarrdCore Model');
            await createWarrdcoreModel({
              name: modelName,
              warrdcoreUri: String(args.warrdcoreUri || 'warrdcore://vault/custom:q4_k_m'),
              endpointUrl: '',
              architecture: String(args.architecture || 'Llama-3.3-WarrdCore'),
              quantization: (args.quantization as QuantizationType) || 'Q4_K_M',
              contextWindow: 65536,
              targetNode: String(args.targetNode || nodes[0]?.name || 'warrdcore-infer-247'),
              keepAlive247: true,
              systemPrompt: String(
                args.systemPrompt || 'Modelo personalizado de WarrdCore ejecutándose 24/7.'
              ),
            });
            return {
              toolName: name,
              summary: `Modelo WarrdCore "${modelName}" importado y activo 24/7 en ${String(args.targetNode || 'warrdcore-infer-247')}.`,
              ok: true,
            };
          }

          case 'mcp_toggle_server': {
            const needle = String(args.serverName || '').toLowerCase();
            const match = mcpServers.find((s) => s.name.toLowerCase().includes(needle));
            if (match) {
              await toggleMcpServer(match.id, Boolean(args.enabled), match.autoApprove);
              return {
                toolName: name,
                summary: `Servidor MCP "${match.name}" ${args.enabled ? 'activado' : 'pausado'}.`,
                ok: true,
              };
            }
            return { toolName: name, summary: `Servidor MCP "${needle}" no encontrado.`, ok: false };
          }

          default:
            return { toolName: name, summary: `Herramienta MCP "${name}" registrada.`, ok: true };
        }
      } catch (err: unknown) {
        return {
          toolName: name,
          summary: err instanceof Error ? err.message : 'Fallo ejecutando herramienta MCP.',
          ok: false,
        };
      }
    },
    [
      createInfraResource,
      createNode,
      createWarrdcoreModel,
      devEnvs,
      getIdToken,
      mcpServers,
      nodes,
      syncAllDevEnvs,
      syncDevEnv,
      toggleMcpServer,
      updateNodePower,
      warrdcoreModels,
    ]
  );

  return {
    user,
    authReady,
    bootstrapping,
    authError,
    dataLoading,
    nodes,
    mcpServers,
    warrdcoreModels,
    devEnvs,
    infraResources,
    aiLogs,
    loginWithGoogle,
    logout,
    getIdToken,
    createNode,
    updateNodePower,
    deleteNode,
    createMcpServer,
    toggleMcpServer,
    incrementMcpInvocation,
    deleteMcpServer,
    createWarrdcoreModel,
    updateWarrdcoreStatus,
    deleteWarrdcoreModel,
    createDevEnv,
    syncDevEnv,
    syncAllDevEnvs,
    deleteDevEnv,
    createInfraResource,
    toggleInfraResource,
    deleteInfraResource,
    recordAiAuditLog,
    executeMcpToolCall,
  };
}

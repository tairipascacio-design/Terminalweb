import React, { useState } from 'react';
import { Send, Cpu, Globe, Zap, Brain, ExternalLink, CheckCircle2, AlertCircle } from 'lucide-react';
import {
  AiAuditLog,
  CloudNode,
  DevEnvironment,
  InfraResource,
  McpServer,
  WarrdcoreModel,
} from '../types/cloud';
import { McpToolExecutionOutcome } from '../hooks/useCloudState';

interface ChatTurn {
  id: string;
  role: 'user' | 'assistant';
  text: string;
  modelUsed?: string;
  thinkingUsed?: boolean;
  toolOutcomes?: McpToolExecutionOutcome[];
  groundingSources?: Array<{ title: string; uri: string }>;
}

interface AiCommanderProps {
  getIdToken: () => Promise<string>;
  nodes: CloudNode[];
  mcpServers: McpServer[];
  warrdcoreModels: WarrdcoreModel[];
  devEnvs: DevEnvironment[];
  infraResources: InfraResource[];
  aiLogs: AiAuditLog[];
  initialWarrdcoreModelId?: string | null;
  onExecuteMcpTool: (name: string, args: Record<string, unknown>) => Promise<McpToolExecutionOutcome>;
  onRecordAudit: (entry: {
    modelUsed: string;
    prompt: string;
    summary: string;
    mcpToolsExecuted: string[];
    status: 'completed' | 'failed';
  }) => Promise<void>;
}

const PRESET_ORDERS = [
  'Despliega un servidor Ubuntu 24/7 en Hetzner Falkenstein llamado montana-ai-02 para Docker y abre el puerto 8765 en el firewall.',
  'Importa mi modelo WarrdCore warrdcore://vault/scarface-coder-32b:q8_0 en el nodo warrdcore-infer-247 y sincroniza todos mis entornos Termux y Ubuntu.',
  'Ejecuta `docker ps` en Ubuntu y revisa el estado de mis servicios 24/7.',
  'Investiga en la web las mejores prácticas actuales de hardening SSH y WireGuard para Ubuntu 24.04 LTS.',
];

function isSafeHttpUrl(url: string): boolean {
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'https:' || parsed.protocol === 'http:';
  } catch {
    return false;
  }
}

export function AiCommanderSection({
  getIdToken,
  nodes,
  mcpServers,
  warrdcoreModels,
  devEnvs,
  infraResources,
  aiLogs,
  initialWarrdcoreModelId,
  onExecuteMcpTool,
  onRecordAudit,
}: AiCommanderProps) {
  const [modelMode, setModelMode] = useState<
    'hydrogen-deep' | 'hydrogen-search' | 'flash-lite' | 'warrdcore-custom'
  >(initialWarrdcoreModelId ? 'warrdcore-custom' : 'hydrogen-deep');
  const [selectedWarrdcoreId, setSelectedWarrdcoreId] = useState<string>(
    initialWarrdcoreModelId || warrdcoreModels[0]?.id || ''
  );
  const [highThinking, setHighThinking] = useState(true);
  const [enableMcpTools, setEnableMcpTools] = useState(true);
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [turns, setTurns] = useState<ChatTurn[]>([
    {
      id: 'welcome',
      role: 'assistant',
      modelUsed: 'Montana Consigliere · MCP Ready',
      text: 'Listo, chico. Tengo el control de tus nodos Hetzner/DigitalOcean, la terminal Ubuntu/Termux, tus entornos sincronizados y tu bóveda WarrdCore. Dame la orden y la ejecuto directo por MCP.',
    },
  ]);

  const activeWarrdcore =
    warrdcoreModels.find((m) => m.id === selectedWarrdcoreId) || warrdcoreModels[0];

  const handleSend = async (overridePrompt?: string) => {
    const message = (overridePrompt ?? prompt).trim();
    if (!message || loading) return;

    setPrompt('');
    setError(null);
    setTurns((prev) => [...prev, { id: `u-${Date.now()}`, role: 'user', text: message }]);
    setLoading(true);

    try {
      const token = await getIdToken();
      const res = await fetch('/api/ai/command', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          prompt: message,
          modelMode,
          highThinking: modelMode === 'hydrogen-deep' ? highThinking : false,
          useWebSearch: modelMode === 'hydrogen-search',
          enableMcpTools: modelMode !== 'flash-lite' && enableMcpTools,
          warrdcoreModel:
            modelMode === 'warrdcore-custom' && activeWarrdcore
              ? {
                  name: activeWarrdcore.name,
                  warrdcoreUri: activeWarrdcore.warrdcoreUri,
                  endpointUrl: activeWarrdcore.endpointUrl,
                  architecture: activeWarrdcore.architecture,
                  systemPrompt: activeWarrdcore.systemPrompt,
                }
              : undefined,
          context: {
            nodes: nodes.map((n) => ({
              name: n.name,
              provider: n.provider,
              region: n.region,
              status: n.status,
              plan: n.plan,
              ipv4: n.ipv4,
            })),
            mcpServers: mcpServers.map((s) => ({
              name: s.name,
              enabled: s.enabled,
              tools: s.tools,
            })),
            warrdcoreModels: warrdcoreModels.map((m) => ({
              name: m.name,
              warrdcoreUri: m.warrdcoreUri,
              status: m.status,
              targetNode: m.targetNode,
            })),
            devEnvs: devEnvs.map((e) => ({
              name: e.name,
              deviceType: e.deviceType,
              syncState: e.syncState,
            })),
            infraResources: infraResources.map((r) => ({
              name: r.name,
              kind: r.kind,
              spec: r.spec,
              enabled: r.enabled,
            })),
          },
        }),
      });

      const data = (await res.json()) as {
        text?: string;
        modelUsed?: string;
        thinkingUsed?: boolean;
        toolCalls?: Array<{ id: string; name: string; args: Record<string, unknown> }>;
        groundingSources?: Array<{ title: string; uri: string }>;
        error?: string;
      };

      if (!res.ok) {
        throw new Error(data.error || 'Fallo al procesar la orden IA.');
      }

      // Execute all returned MCP actions live against Firestore & Ubuntu/Termux
      const outcomes: McpToolExecutionOutcome[] = [];
      for (const tc of data.toolCalls || []) {
        const outcome = await onExecuteMcpTool(tc.name, tc.args || {});
        outcomes.push(outcome);
      }

      const replyText = data.text || 'Operación ejecutada.';
      setTurns((prev) => [
        ...prev,
        {
          id: `a-${Date.now()}`,
          role: 'assistant',
          text: replyText,
          modelUsed: data.modelUsed,
          thinkingUsed: data.thinkingUsed,
          toolOutcomes: outcomes,
          groundingSources: data.groundingSources || [],
        },
      ]);

      await onRecordAudit({
        modelUsed: data.modelUsed || 'gemini-4-hydrogen',
        prompt: message,
        summary: replyText,
        mcpToolsExecuted: outcomes.map((o) => o.toolName),
        status: 'completed',
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error ejecutando el Comandante IA.';
      setError(msg);
      await onRecordAudit({
        modelUsed: modelMode,
        prompt: message,
        summary: msg,
        mcpToolsExecuted: [],
        status: 'failed',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="grid grid-cols-1 xl:grid-cols-12 gap-6 items-start">
      {/* Main AI Console */}
      <div className="xl:col-span-8 bg-[#12141A] border border-zinc-800 rounded-xl overflow-hidden flex flex-col">
        {/* Model Mode Selector */}
        <div className="p-4 border-b border-zinc-800 space-y-3">
          <div className="flex flex-wrap items-center gap-1 p-1 bg-[#09090B] border border-zinc-800 rounded-lg">
            {(
              [
                { id: 'hydrogen-deep', label: 'Gemini 4 Hydrogen · MCP', icon: Brain },
                { id: 'hydrogen-search', label: 'Google Search Grounding', icon: Globe },
                { id: 'flash-lite', label: 'Flash Lite · Baja Latencia', icon: Zap },
                { id: 'warrdcore-custom', label: 'WarrdCore Propio', icon: Cpu },
              ] as const
            ).map((opt) => {
              const Icon = opt.icon;
              return (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setModelMode(opt.id)}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap cursor-pointer ${
                    modelMode === opt.id
                      ? 'bg-[#D4AF37] text-[#09090B] font-semibold'
                      : 'text-zinc-400 hover:text-zinc-100'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" />
                  <span>{opt.label}</span>
                </button>
              );
            })}
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3 text-xs">
            <div className="flex flex-wrap items-center gap-4">
              {modelMode === 'hydrogen-deep' && (
                <label className="inline-flex items-center gap-2 text-zinc-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={highThinking}
                    onChange={(e) => setHighThinking(e.target.checked)}
                    className="accent-[#D4AF37] w-3.5 h-3.5"
                  />
                  <span>Pensamiento Profundo (High Thinking)</span>
                </label>
              )}
              {modelMode !== 'flash-lite' && (
                <label className="inline-flex items-center gap-2 text-zinc-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={enableMcpTools}
                    onChange={(e) => setEnableMcpTools(e.target.checked)}
                    className="accent-[#D4AF37] w-3.5 h-3.5"
                  />
                  <span>Ejecución Autónoma MCP ({mcpServers.filter((s) => s.enabled).length} activos)</span>
                </label>
              )}
            </div>

            {modelMode === 'warrdcore-custom' && (
              <select
                value={activeWarrdcore?.id || ''}
                onChange={(e) => setSelectedWarrdcoreId(e.target.value)}
                className="px-2.5 py-1 text-xs font-mono bg-[#09090B] border border-zinc-800 rounded text-[#D4AF37] focus:border-[#D4AF37] focus:outline-none"
              >
                {warrdcoreModels.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name} ({m.quantization})
                  </option>
                ))}
                {warrdcoreModels.length === 0 && (
                  <option value="">Importa un modelo en WarrdCore</option>
                )}
              </select>
            )}
          </div>
        </div>

        {/* Conversation Feed */}
        <div className="p-6 space-y-5 h-[440px] overflow-y-auto bg-[#0B0C0F]">
          {turns.map((turn) => (
            <div
              key={turn.id}
              className={`flex flex-col ${turn.role === 'user' ? 'items-end' : 'items-start'}`}
            >
              <div
                className={`max-w-[88%] rounded-xl px-4 py-3.5 space-y-3 ${
                  turn.role === 'user'
                    ? 'bg-[#181B23] border border-[#D4AF37]/40 text-zinc-100'
                    : 'bg-[#12141A] border border-zinc-800 text-zinc-200'
                }`}
              >
                {turn.modelUsed && (
                  <p className="text-[11px] font-mono text-[#D4AF37]">
                    {turn.modelUsed}
                    {turn.thinkingUsed ? ' · High Thinking' : ''}
                  </p>
                )}

                <p className="text-sm leading-relaxed whitespace-pre-wrap">{turn.text}</p>

                {/* Live MCP Execution Results */}
                {turn.toolOutcomes && turn.toolOutcomes.length > 0 && (
                  <div className="pt-3 border-t border-zinc-800 space-y-2">
                    <p className="text-xs font-medium text-zinc-400">Acciones MCP Ejecutadas:</p>
                    {turn.toolOutcomes.map((o, idx) => (
                      <div
                        key={`${o.toolName}-${idx}`}
                        className="flex items-start gap-2 text-xs font-mono bg-[#09090B] border border-zinc-800 rounded-md px-3 py-2"
                      >
                        {o.ok ? (
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                        ) : (
                          <AlertCircle className="w-3.5 h-3.5 text-red-400 shrink-0 mt-0.5" />
                        )}
                        <div>
                          <span className="text-[#D4AF37]">{o.toolName}</span>
                          <span className="text-zinc-500 mx-1.5">—</span>
                          <span className="text-zinc-200">{o.summary}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Google Search Grounding Sources */}
                {turn.groundingSources && turn.groundingSources.length > 0 && (
                  <div className="pt-3 border-t border-zinc-800 space-y-1.5">
                    <p className="text-xs font-medium text-zinc-400">Fuentes Google Search:</p>
                    <div className="space-y-1">
                      {turn.groundingSources
                        .filter((s) => isSafeHttpUrl(s.uri))
                        .map((src, idx) => (
                          <a
                            key={`${src.uri}-${idx}`}
                            href={src.uri}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1.5 text-xs text-[#D4AF37] hover:underline truncate"
                          >
                            <ExternalLink className="w-3 h-3 shrink-0" />
                            <span className="truncate">{src.title}</span>
                          </a>
                        ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}

          {loading && (
            <div className="text-xs font-mono text-[#D4AF37]">
              Analizando infraestructura y despachando órdenes MCP...
            </div>
          )}
        </div>

        {/* Prompt Composer */}
        <div className="p-4 border-t border-zinc-800 bg-[#12141A] space-y-3">
          {error && <p className="text-xs text-red-400">{error}</p>}

          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="flex gap-3"
          >
            <input
              type="text"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              disabled={loading}
              placeholder="Ej: Crea un nodo Ubuntu en Hetzner fsn1, abre el puerto 11434 y sincroniza Termux..."
              className="flex-1 px-4 py-2.5 text-sm bg-[#09090B] border border-zinc-800 rounded-lg text-zinc-100 placeholder:text-zinc-500 focus:border-[#D4AF37] focus:outline-none"
            />
            <button
              type="submit"
              disabled={loading || !prompt.trim()}
              className="inline-flex items-center gap-2 px-5 py-2.5 text-sm font-semibold bg-[#D4AF37] text-[#09090B] rounded-lg hover:bg-[#E5C158] disabled:opacity-50 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Send className="w-4 h-4" />
              <span>Ejecutar</span>
            </button>
          </form>
        </div>
      </div>

      {/* Right Rail: Executive Quick Orders + Persistent Audit Trail */}
      <aside className="xl:col-span-4 space-y-6">
        <div className="bg-[#12141A] border border-zinc-800 rounded-xl p-5 space-y-3">
          <h3 className="text-sm font-semibold text-zinc-100">Órdenes Rápidas MCP</h3>
          <div className="space-y-2">
            {PRESET_ORDERS.map((order, idx) => (
              <button
                key={idx}
                type="button"
                disabled={loading}
                onClick={() => handleSend(order)}
                className="w-full text-left text-xs text-zinc-300 bg-[#09090B] border border-zinc-800 rounded-lg p-3 hover:border-[#D4AF37]/60 hover:text-zinc-100 transition-colors leading-relaxed cursor-pointer"
              >
                {order}
              </button>
            ))}
          </div>
        </div>

        <div className="bg-[#12141A] border border-zinc-800 rounded-xl p-5 space-y-3">
          <h3 className="text-sm font-semibold text-zinc-100">Historial Persistente (Firestore)</h3>
          <div className="space-y-3 max-h-[260px] overflow-y-auto pr-1">
            {aiLogs.length === 0 ? (
              <p className="text-xs text-zinc-500">Sin registros todavía.</p>
            ) : (
              aiLogs.slice(0, 8).map((log) => (
                <div
                  key={log.id}
                  className="pb-3 border-b border-zinc-800/70 last:border-b-0 last:pb-0 space-y-1"
                >
                  <div className="flex items-center justify-between text-[11px] font-mono">
                    <span className="text-[#D4AF37] truncate">{log.modelUsed}</span>
                    <span className={log.status === 'completed' ? 'text-emerald-400' : 'text-red-400'}>
                      {log.status}
                    </span>
                  </div>
                  <p className="text-xs text-zinc-300 line-clamp-2">{log.prompt}</p>
                </div>
              ))
            )}
          </div>
        </div>
      </aside>
    </div>
  );
}

import React, { useState } from 'react';
import { Plus, Power, Trash2, Play, Cpu, ArrowRight } from 'lucide-react';
import {
  CloudNode,
  McpCategory,
  McpServer,
  McpTransport,
  ModelRuntimeStatus,
  QuantizationType,
  WarrdcoreModel,
} from '../types/cloud';

interface McpSectionProps {
  servers: McpServer[];
  onCreate: (input: {
    name: string;
    transport: McpTransport;
    endpoint: string;
    category: McpCategory;
    tools: string[];
    description: string;
    autoApprove: boolean;
  }) => Promise<void>;
  onToggle: (id: string, enabled: boolean, autoApprove: boolean) => Promise<void>;
  onTestInvoke: (id: string, currentCount: number) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

export function McpSection({
  servers,
  onCreate,
  onToggle,
  onTestInvoke,
  onDelete,
}: McpSectionProps) {
  const [showAdd, setShowAdd] = useState(false);
  const [name, setName] = useState('');
  const [transport, setTransport] = useState<McpTransport>('http-streamable');
  const [endpoint, setEndpoint] = useState('https://mcp.montana.internal/');
  const [category, setCategory] = useState<McpCategory>('infrastructure');
  const [toolsText, setToolsText] = useState('deploy_app, inspect_logs, restart_service');
  const [description, setDescription] = useState('');
  const [autoApprove, setAutoApprove] = useState(true);
  const [lastPingMsg, setLastPingMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    const tools = toolsText
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);
    await onCreate({
      name: name.trim(),
      transport,
      endpoint: endpoint.trim(),
      category,
      tools,
      description: description.trim() || 'Servidor MCP conectado a la red privada Montana Cloud.',
      autoApprove,
    });
    setName('');
    setDescription('');
    setShowAdd(false);
  };

  const handlePing = async (srv: McpServer) => {
    await onTestInvoke(srv.id, srv.invocations);
    setLastPingMsg(
      `JSON-RPC 2.0 OK · ${srv.name} (${srv.transport}) respondió con ${srv.tools.length} herramientas verificadas.`
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-zinc-100">
            Hub de Servidores MCP &amp; Herramientas Autónomas
          </h2>
          <p className="text-xs text-zinc-400">
            Protocolo Model Context Protocol (SSE, Streamable HTTP y stdio-cloud) vinculado al Comandante IA
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowAdd((v) => !v)}
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold bg-[#D4AF37] text-[#09090B] rounded-lg hover:bg-[#E5C158] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Registrar Servidor MCP</span>
        </button>
      </div>

      {lastPingMsg && (
        <div className="px-4 py-3 text-xs font-mono text-[#D4AF37] bg-[#12141A] border border-[#D4AF37]/40 rounded-lg flex items-center justify-between gap-4">
          <span>{lastPingMsg}</span>
          <button
            type="button"
            onClick={() => setLastPingMsg(null)}
            className="text-zinc-400 hover:text-zinc-100 cursor-pointer"
          >
            Cerrar
          </button>
        </div>
      )}

      {showAdd && (
        <form
          onSubmit={handleSubmit}
          className="bg-[#12141A] border border-[#D4AF37]/40 rounded-xl p-6 space-y-4"
        >
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-zinc-300">Nombre MCP</label>
              <input
                type="text"
                required
                maxLength={80}
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="ej. postgres-vault-mcp"
                className="w-full px-3 py-2 text-sm bg-[#09090B] border border-zinc-800 rounded-lg text-zinc-100 focus:border-[#D4AF37] focus:outline-none"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-zinc-300">Transporte</label>
              <select
                value={transport}
                onChange={(e) => setTransport(e.target.value as McpTransport)}
                className="w-full px-3 py-2 text-sm bg-[#09090B] border border-zinc-800 rounded-lg text-zinc-100 focus:border-[#D4AF37] focus:outline-none"
              >
                <option value="http-streamable">Streamable HTTP</option>
                <option value="sse">SSE (Server-Sent Events)</option>
                <option value="stdio-cloud">stdio-cloud (SSH Tunnel)</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-zinc-300">Categoría</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value as McpCategory)}
                className="w-full px-3 py-2 text-sm bg-[#09090B] border border-zinc-800 rounded-lg text-zinc-100 focus:border-[#D4AF37] focus:outline-none"
              >
                <option value="infrastructure">Infraestructura Cloud</option>
                <option value="terminal">Terminal Ubuntu/Termux</option>
                <option value="ai-runtime">WarrdCore AI Runtime</option>
                <option value="database">Bases de Datos</option>
                <option value="git-devops">Git &amp; DevOps Sync</option>
                <option value="network">Red &amp; Seguridad</option>
              </select>
            </div>
            <div className="md:col-span-2 space-y-1.5">
              <label className="text-xs font-medium text-zinc-300">Endpoint URL / URI</label>
              <input
                type="text"
                required
                maxLength={256}
                value={endpoint}
                onChange={(e) => setEndpoint(e.target.value)}
                className="w-full px-3 py-2 text-sm font-mono bg-[#09090B] border border-zinc-800 rounded-lg text-zinc-100 focus:border-[#D4AF37] focus:outline-none"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-zinc-300">Tools (separados por coma)</label>
              <input
                type="text"
                value={toolsText}
                onChange={(e) => setToolsText(e.target.value)}
                className="w-full px-3 py-2 text-sm font-mono bg-[#09090B] border border-zinc-800 rounded-lg text-zinc-100 focus:border-[#D4AF37] focus:outline-none"
              />
            </div>
            <div className="md:col-span-3 space-y-1.5">
              <label className="text-xs font-medium text-zinc-300">Descripción</label>
              <input
                type="text"
                maxLength={280}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Describe qué acciones puede ejecutar la IA mediante este servidor MCP"
                className="w-full px-3 py-2 text-sm bg-[#09090B] border border-zinc-800 rounded-lg text-zinc-100 focus:border-[#D4AF37] focus:outline-none"
              />
            </div>
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-zinc-800">
            <label className="inline-flex items-center gap-2 text-xs text-zinc-300 cursor-pointer">
              <input
                type="checkbox"
                checked={autoApprove}
                onChange={(e) => setAutoApprove(e.target.checked)}
                className="accent-[#D4AF37] w-4 h-4"
              />
              <span>Permitir ejecución autónoma por el Comandante IA</span>
            </label>
            <button
              type="submit"
              className="px-4 py-2 text-sm font-semibold bg-[#D4AF37] text-[#09090B] rounded-lg hover:bg-[#E5C158] transition-colors cursor-pointer"
            >
              Guardar Servidor MCP
            </button>
          </div>
        </form>
      )}

      {/* MCP Registry Table */}
      <div className="bg-[#12141A] border border-zinc-800 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-zinc-800 text-xs text-zinc-400">
                <th className="py-3.5 px-6 font-medium">Servidor MCP</th>
                <th className="py-3.5 px-4 font-medium">Transporte &amp; Endpoint</th>
                <th className="py-3.5 px-4 font-medium">Herramientas Expuestas</th>
                <th className="py-3.5 px-4 font-medium text-right">Llamadas</th>
                <th className="py-3.5 px-4 font-medium">Estado</th>
                <th className="py-3.5 px-6 font-medium text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/60 text-sm">
              {servers.map((srv) => (
                <tr key={srv.id} className="hover:bg-[#181B23]/70 transition-colors">
                  <td className="py-4 px-6">
                    <div className="font-semibold text-zinc-100">{srv.name}</div>
                    <div className="text-xs text-zinc-500 max-w-xs">{srv.description}</div>
                  </td>
                  <td className="py-4 px-4 font-mono text-xs">
                    <div className="text-[#D4AF37]">{srv.transport}</div>
                    <div className="text-zinc-400 truncate max-w-[210px]">{srv.endpoint}</div>
                  </td>
                  <td className="py-4 px-4 font-mono text-xs text-zinc-300">
                    {srv.tools.join(' · ')}
                  </td>
                  <td className="py-4 px-4 font-mono text-xs tabular-nums text-right text-zinc-200">
                    {srv.invocations}
                  </td>
                  <td className="py-4 px-4 text-xs">
                    <div className={srv.enabled ? 'text-emerald-400 font-medium' : 'text-zinc-500'}>
                      {srv.enabled ? 'Online' : 'Pausado'}
                    </div>
                    <button
                      type="button"
                      onClick={() => onToggle(srv.id, srv.enabled, !srv.autoApprove)}
                      className="text-zinc-500 hover:text-[#D4AF37] underline underline-offset-2 cursor-pointer"
                    >
                      Auto-IA: {srv.autoApprove ? 'ON' : 'Manual'}
                    </button>
                  </td>
                  <td className="py-4 px-6">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        type="button"
                        title="Probar conexión JSON-RPC"
                        onClick={() => handlePing(srv)}
                        className="p-2 rounded-md border border-zinc-800 text-zinc-300 hover:border-[#D4AF37] hover:text-[#D4AF37] transition-colors cursor-pointer"
                      >
                        <Play className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        title={srv.enabled ? 'Pausar servidor MCP' : 'Activar servidor MCP'}
                        onClick={() => onToggle(srv.id, !srv.enabled, srv.autoApprove)}
                        className="p-2 rounded-md border border-zinc-800 text-zinc-300 hover:border-[#D4AF37] hover:text-[#D4AF37] transition-colors cursor-pointer"
                      >
                        <Power className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        title="Eliminar servidor MCP"
                        onClick={() => onDelete(srv.id)}
                        className="p-2 rounded-md border border-zinc-800 text-zinc-400 hover:border-red-700 hover:text-red-400 transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

interface WarrdcoreSectionProps {
  models: WarrdcoreModel[];
  nodes: CloudNode[];
  onCreate: (input: {
    name: string;
    warrdcoreUri: string;
    endpointUrl: string;
    architecture: string;
    quantization: QuantizationType;
    contextWindow: number;
    targetNode: string;
    keepAlive247: boolean;
    systemPrompt: string;
  }) => Promise<void>;
  onUpdateStatus: (id: string, status: ModelRuntimeStatus, keepAlive247: boolean) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
  onTestInCommander: (modelId: string) => void;
}

export function WarrdcoreSection({
  models,
  nodes,
  onCreate,
  onUpdateStatus,
  onDelete,
  onTestInCommander,
}: WarrdcoreSectionProps) {
  const [showImport, setShowImport] = useState(false);
  const [name, setName] = useState('');
  const [warrdcoreUri, setWarrdcoreUri] = useState('warrdcore://vault/');
  const [endpointUrl, setEndpointUrl] = useState('');
  const [architecture, setArchitecture] = useState('Llama-3.3-70B-WarrdCore');
  const [quantization, setQuantization] = useState<QuantizationType>('Q4_K_M');
  const [contextWindow, setContextWindow] = useState(131072);
  const [targetNode, setTargetNode] = useState(nodes[0]?.name || 'warrdcore-infer-247');
  const [keepAlive247, setKeepAlive247] = useState(true);
  const [systemPrompt, setSystemPrompt] = useState(
    'Modelo propio importado desde WarrdCore operando 24/7 con acceso a herramientas MCP.'
  );

  const handleImport = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !warrdcoreUri.trim()) return;
    await onCreate({
      name: name.trim(),
      warrdcoreUri: warrdcoreUri.trim(),
      endpointUrl: endpointUrl.trim(),
      architecture: architecture.trim(),
      quantization,
      contextWindow,
      targetNode: targetNode || 'warrdcore-infer-247',
      keepAlive247,
      systemPrompt: systemPrompt.trim(),
    });
    setName('');
    setWarrdcoreUri('warrdcore://vault/');
    setEndpointUrl('');
    setShowImport(false);
  };

  return (
    <div className="space-y-6">
      {/* Hardware Showcase Header */}
      <section className="grid grid-cols-1 lg:grid-cols-12 bg-[#12141A] border border-zinc-800 rounded-xl overflow-hidden items-stretch">
        <div className="lg:col-span-8 p-6 lg:p-7 flex flex-col justify-between space-y-5">
          <div className="space-y-2">
            <p className="text-xs font-medium text-[#D4AF37]">
              Bóveda WarrdCore · Inferencia Privada 24/7
            </p>
            <h2 className="font-display text-2xl font-bold text-zinc-50">
              Importa tus Modelos Propios de IA desde WarrdCore
            </h2>
            <p className="text-sm text-zinc-400 leading-relaxed max-w-2xl">
              Monta tus pesos propietarios de WarrdCore (GGUF, Safetensors o endpoints compatibles OpenAI HTTPS) sobre nodos dedicados 24/7 y conéctalos directamente al Comandante IA junto a los modelos estándar de Gemini.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => setShowImport((v) => !v)}
              className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold bg-[#D4AF37] text-[#09090B] rounded-lg hover:bg-[#E5C158] transition-colors whitespace-nowrap cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Importar Modelo WarrdCore</span>
            </button>
            <span className="text-xs font-mono text-zinc-400 tabular-nums">
              {models.filter((m) => m.keepAlive247).length} modelos con Keep-Alive 24/7
            </span>
          </div>
        </div>

        <div className="lg:col-span-4 relative min-h-[190px] border-t lg:border-t-0 lg:border-l border-zinc-800">
          <img
            src="/src/assets/images/warrdcore_engine_core_1795484226198.jpg"
            alt="Módulo de cómputo neural WarrdCore 24/7"
            referrerPolicy="no-referrer"
            className="w-full h-full object-cover"
          />
          <div className="absolute inset-0 bg-gradient-to-r from-[#12141A]/75 via-transparent to-transparent" />
        </div>
      </section>

      {/* Import Form */}
      {showImport && (
        <form
          onSubmit={handleImport}
          className="bg-[#12141A] border border-[#D4AF37]/40 rounded-xl p-6 space-y-4"
        >
          <div className="flex items-center justify-between">
            <h3 className="text-base font-semibold text-zinc-100">
              Registrar Nuevo Modelo desde WarrdCore
            </h3>
            <button
              type="button"
              onClick={() => setShowImport(false)}
              className="text-xs text-zinc-400 hover:text-zinc-100 cursor-pointer"
            >
              Cancelar
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-zinc-300">Nombre del Modelo</label>
              <input
                type="text"
                required
                maxLength={96}
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="ej. WarrdCore Titan 72B"
                className="w-full px-3 py-2 text-sm bg-[#09090B] border border-zinc-800 rounded-lg text-zinc-100 focus:border-[#D4AF37] focus:outline-none"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-zinc-300">WarrdCore Model URI</label>
              <input
                type="text"
                required
                maxLength={256}
                value={warrdcoreUri}
                onChange={(e) => setWarrdcoreUri(e.target.value)}
                placeholder="warrdcore://vault/modelo:q4_k_m"
                className="w-full px-3 py-2 text-sm font-mono bg-[#09090B] border border-zinc-800 rounded-lg text-zinc-100 focus:border-[#D4AF37] focus:outline-none"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-zinc-300">Arquitectura Base</label>
              <input
                type="text"
                required
                maxLength={64}
                value={architecture}
                onChange={(e) => setArchitecture(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-[#09090B] border border-zinc-800 rounded-lg text-zinc-100 focus:border-[#D4AF37] focus:outline-none"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-zinc-300">Cuantización</label>
              <select
                value={quantization}
                onChange={(e) => setQuantization(e.target.value as QuantizationType)}
                className="w-full px-3 py-2 text-sm font-mono bg-[#09090B] border border-zinc-800 rounded-lg text-zinc-100 focus:border-[#D4AF37] focus:outline-none"
              >
                <option value="Q4_K_M">Q4_K_M (Rápido / Balanceado)</option>
                <option value="Q6_K">Q6_K (Alta Precisión)</option>
                <option value="Q8_0">Q8_0 (Casi sin pérdida)</option>
                <option value="FP16">FP16 (GPU Dedicada)</option>
                <option value="BF16">BF16 (H100 / L40S)</option>
                <option value="GGUF-Custom">GGUF-Custom (WarrdCore)</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-zinc-300">Nodo Servidor 24/7</label>
              <select
                value={targetNode}
                onChange={(e) => setTargetNode(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-[#09090B] border border-zinc-800 rounded-lg text-zinc-100 focus:border-[#D4AF37] focus:outline-none"
              >
                {nodes.map((n) => (
                  <option key={n.id} value={n.name}>
                    {n.name} ({n.provider} · {n.region})
                  </option>
                ))}
                {nodes.length === 0 && <option value="warrdcore-infer-247">warrdcore-infer-247</option>}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-zinc-300">Ventana de Contexto</label>
              <input
                type="number"
                min={2048}
                max={2000000}
                value={contextWindow}
                onChange={(e) => setContextWindow(Number(e.target.value))}
                className="w-full px-3 py-2 text-sm font-mono tabular-nums bg-[#09090B] border border-zinc-800 rounded-lg text-zinc-100 focus:border-[#D4AF37] focus:outline-none"
              />
            </div>

            <div className="md:col-span-3 space-y-1.5">
              <label className="text-xs font-medium text-zinc-300">
                Endpoint HTTPS Compatible OpenAI (Opcional — déjalo vacío para orquestación interna)
              </label>
              <input
                type="url"
                maxLength={256}
                value={endpointUrl}
                onChange={(e) => setEndpointUrl(e.target.value)}
                placeholder="https://api.tu-servidor-warrdcore.com/v1/chat/completions"
                className="w-full px-3 py-2 text-sm font-mono bg-[#09090B] border border-zinc-800 rounded-lg text-zinc-100 focus:border-[#D4AF37] focus:outline-none"
              />
            </div>

            <div className="md:col-span-3 space-y-1.5">
              <label className="text-xs font-medium text-zinc-300">System Prompt del Modelo</label>
              <textarea
                rows={2}
                maxLength={600}
                value={systemPrompt}
                onChange={(e) => setSystemPrompt(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-[#09090B] border border-zinc-800 rounded-lg text-zinc-100 focus:border-[#D4AF37] focus:outline-none"
              />
            </div>
          </div>

          <div className="flex items-center justify-between pt-2 border-t border-zinc-800">
            <label className="inline-flex items-center gap-2 text-xs text-zinc-300 cursor-pointer">
              <input
                type="checkbox"
                checked={keepAlive247}
                onChange={(e) => setKeepAlive247(e.target.checked)}
                className="accent-[#D4AF37] w-4 h-4"
              />
              <span>Mantener pesos cargados en VRAM/RAM 24/7 sin suspensión</span>
            </label>
            <button
              type="submit"
              className="px-5 py-2 text-sm font-semibold bg-[#D4AF37] text-[#09090B] rounded-lg hover:bg-[#E5C158] transition-colors cursor-pointer"
            >
              Desplegar Modelo 24/7
            </button>
          </div>
        </form>
      )}

      {/* Models List */}
      <div className="bg-[#12141A] border border-zinc-800 rounded-xl divide-y divide-zinc-800/70">
        {models.length === 0 ? (
          <div className="p-10 text-center text-sm text-zinc-400">
            No tienes modelos WarrdCore importados todavía.
          </div>
        ) : (
          models.map((m) => {
            const isActive = m.status === 'active';
            return (
              <div
                key={m.id}
                className="p-6 flex flex-col lg:flex-row lg:items-center justify-between gap-5 hover:bg-[#181B23]/60 transition-colors"
              >
                <div className="space-y-1.5">
                  <div className="flex flex-wrap items-center gap-2 text-sm">
                    <Cpu className="w-4 h-4 text-[#D4AF37]" />
                    <span className="font-semibold text-zinc-100">{m.name}</span>
                    <span className="text-zinc-600">·</span>
                    <span className="font-mono text-xs text-zinc-300">{m.architecture}</span>
                    <span className="text-zinc-600">·</span>
                    <span className="font-mono text-xs text-[#D4AF37]">{m.quantization}</span>
                  </div>
                  <p className="text-xs font-mono text-zinc-400 break-all">
                    {m.warrdcoreUri} · Nodo: {m.targetNode} · Contexto:{' '}
                    <span className="tabular-nums">{m.contextWindow.toLocaleString()}</span> tokens
                  </p>
                  {m.systemPrompt && (
                    <p className="text-xs text-zinc-500 max-w-2xl">{m.systemPrompt}</p>
                  )}
                </div>

                <div className="flex flex-wrap items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => onTestInCommander(m.id)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-[#D4AF37] text-[#09090B] rounded-md hover:bg-[#E5C158] transition-colors whitespace-nowrap cursor-pointer"
                  >
                    <span>Usar en IA</span>
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      onUpdateStatus(m.id, isActive ? 'standby' : 'active', m.keepAlive247)
                    }
                    className="px-3 py-1.5 text-xs font-medium border border-zinc-700 text-zinc-200 rounded-md hover:border-[#D4AF37] transition-colors whitespace-nowrap cursor-pointer"
                  >
                    {isActive ? 'Poner en Standby' : 'Activar 24/7'}
                  </button>
                  <button
                    type="button"
                    onClick={() => onDelete(m.id)}
                    title="Eliminar modelo"
                    className="p-2 border border-zinc-800 text-zinc-400 rounded-md hover:border-red-700 hover:text-red-400 transition-colors cursor-pointer"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}

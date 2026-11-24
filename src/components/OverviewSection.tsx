import { ArrowRight, Play, Square, Terminal, Cpu, RefreshCw } from 'lucide-react';
import {
  ActiveSection,
  AiAuditLog,
  CloudNode,
  DevEnvironment,
  InfraResource,
  McpServer,
  WarrdcoreModel,
} from '../types/cloud';

interface OverviewProps {
  nodes: CloudNode[];
  mcpServers: McpServer[];
  warrdcoreModels: WarrdcoreModel[];
  devEnvs: DevEnvironment[];
  infraResources: InfraResource[];
  aiLogs: AiAuditLog[];
  onNavigate: (section: ActiveSection) => void;
  onSyncAll: () => Promise<void>;
  onToggleNodePower: (id: string, nextStatus: 'running' | 'stopped', uptime247: boolean) => Promise<void>;
}

export function OverviewSection({
  nodes,
  mcpServers,
  warrdcoreModels,
  devEnvs,
  infraResources,
  aiLogs,
  onNavigate,
  onSyncAll,
  onToggleNodePower,
}: OverviewProps) {
  const runningNodes = nodes.filter((n) => n.status === 'running');
  const totalVcpu = nodes.reduce((sum, n) => sum + (n.vcpu || 0), 0);
  const totalRam = nodes.reduce((sum, n) => sum + (n.ramGb || 0), 0);
  const monthlySpend = nodes.reduce((sum, n) => sum + (n.monthlyCostUsd || 0), 0);
  const activeMcp = mcpServers.filter((s) => s.enabled);
  const activeToolsCount = activeMcp.reduce((sum, s) => sum + (s.tools?.length || 0), 0);
  const activeModels = warrdcoreModels.filter((m) => m.status === 'active');
  const syncedEnvs = devEnvs.filter((e) => e.syncState === 'synced').length;

  return (
    <div className="space-y-8">
      {/* Executive Hero Vault Banner */}
      <section className="relative rounded-xl overflow-hidden border border-zinc-800 bg-[#12141A]">
        <div className="grid grid-cols-1 lg:grid-cols-12 items-stretch">
          <div className="lg:col-span-7 p-6 lg:p-8 flex flex-col justify-between space-y-6">
            <div className="space-y-2.5">
              <p className="text-xs font-medium text-[#D4AF37]">
                Centro de Mando Ejecutivo · Infraestructura 24/7
              </p>
              <h1 className="font-display text-2xl lg:text-3xl font-bold text-zinc-50 [text-wrap:balance]">
                El imperio en la nube corre sin frenos, chico.
              </h1>
              <p className="text-sm text-zinc-400 leading-relaxed max-w-xl">
                Supervisa tus servidores estilo Hetzner y DigitalOcean, lanza sesiones Ubuntu 24.04 y Termux, sincroniza tus entornos de desarrollo y manda órdenes directas al comandante IA vía MCP.
              </p>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => onNavigate('ai-commander')}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold bg-[#D4AF37] text-[#09090B] rounded-lg hover:bg-[#E5C158] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                <Cpu className="w-4 h-4" />
                <span>Abrir Comandante IA</span>
              </button>
              <button
                type="button"
                onClick={() => onNavigate('terminal')}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium bg-[#181B23] text-zinc-100 border border-zinc-700 rounded-lg hover:border-[#D4AF37]/60 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                <Terminal className="w-4 h-4 text-[#D4AF37]" />
                <span>Terminal Termux / Ubuntu</span>
              </button>
              <button
                type="button"
                onClick={onSyncAll}
                className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium text-zinc-300 hover:text-zinc-100 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                <RefreshCw className="w-4 h-4" />
                <span>Sincronizar Entornos</span>
              </button>
            </div>
          </div>

          <div className="lg:col-span-5 relative min-h-[210px] border-t lg:border-t-0 lg:border-l border-zinc-800">
            <img
              src="/src/assets/images/hero_obsidian_datacenter_1795484227124.jpg"
              alt="Servidores privados Montana Cloud"
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-[#12141A]/85 via-[#12141A]/20 to-transparent" />
          </div>
        </div>
      </section>

      {/* Single-Row KPI Strip (Clean hairline grid, tabular figures, zero pill clutter) */}
      <section className="grid grid-cols-2 lg:grid-cols-4 border border-zinc-800 rounded-xl bg-[#12141A] divide-y lg:divide-y-0 lg:divide-x divide-zinc-800">
        <div className="p-5 space-y-1">
          <p className="text-xs text-zinc-400">Servidores Activos 24/7</p>
          <p className="text-2xl font-bold font-mono tabular-nums text-zinc-50">
            {runningNodes.length} / {nodes.length}
          </p>
          <p className="text-xs font-mono tabular-nums text-zinc-500">
            {totalVcpu} vCPU · {totalRam} GB RAM
          </p>
        </div>

        <div className="p-5 space-y-1">
          <p className="text-xs text-zinc-400">Servidores MCP &amp; Tools</p>
          <p className="text-2xl font-bold font-mono tabular-nums text-zinc-50">
            {activeMcp.length} · {activeToolsCount} tools
          </p>
          <p className="text-xs text-zinc-500">
            {infraResources.filter((r) => r.enabled).length} recursos de red activos
          </p>
        </div>

        <div className="p-5 space-y-1">
          <p className="text-xs text-zinc-400">Modelos WarrdCore 24/7</p>
          <p className="text-2xl font-bold font-mono tabular-nums text-[#D4AF37]">
            {activeModels.length} activos
          </p>
          <p className="text-xs text-zinc-500">
            {warrdcoreModels.length} en bóveda privada
          </p>
        </div>

        <div className="p-5 space-y-1">
          <p className="text-xs text-zinc-400">Entornos Sync &amp; Coste</p>
          <p className="text-2xl font-bold font-mono tabular-nums text-zinc-50">
            ${monthlySpend.toFixed(2)}/mes
          </p>
          <p className="text-xs text-zinc-500">
            {syncedEnvs}/{devEnvs.length} dispositivos al día
          </p>
        </div>
      </section>

      {/* Main Split: Active Cloud Fleet + Recent MCP AI Audit */}
      <div className="grid grid-cols-1 xl:grid-cols-12 gap-8">
        {/* Cloud Nodes Table */}
        <section className="xl:col-span-8 bg-[#12141A] border border-zinc-800 rounded-xl overflow-hidden">
          <div className="px-6 py-4 border-b border-zinc-800 flex items-center justify-between gap-4">
            <div>
              <h2 className="text-base font-semibold text-zinc-100">Flota de Servidores en la Nube</h2>
              <p className="text-xs text-zinc-400">Hetzner Dedicated · DigitalOcean Droplets · WarrdCore GPU</p>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('nodes')}
              className="inline-flex items-center gap-1.5 text-xs font-medium text-[#D4AF37] hover:text-[#E5C158] transition-colors whitespace-nowrap cursor-pointer"
            >
              <span>Gestionar Flota</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-zinc-800/80 text-xs text-zinc-400">
                  <th className="py-3 px-6 font-medium">Nodo</th>
                  <th className="py-3 px-4 font-medium">Proveedor / Región</th>
                  <th className="py-3 px-4 font-medium">IPv4 Pública</th>
                  <th className="py-3 px-4 font-medium text-right">Recursos</th>
                  <th className="py-3 px-4 font-medium">Estado</th>
                  <th className="py-3 px-6 font-medium text-right">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-800/60 text-sm">
                {nodes.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-10 px-6 text-center text-zinc-400 text-sm">
                      Aún no tienes nodos desplegados. Crea tu primer servidor 24/7.
                    </td>
                  </tr>
                ) : (
                  nodes.map((node) => {
                    const isRunning = node.status === 'running';
                    return (
                      <tr key={node.id} className="hover:bg-[#181B23]/70 transition-colors">
                        <td className="py-3.5 px-6">
                          <div className="font-medium text-zinc-100">{node.name}</div>
                          <div className="text-xs text-zinc-500 truncate max-w-[220px]">
                            {node.workload}
                          </div>
                        </td>
                        <td className="py-3.5 px-4 text-xs text-zinc-300">
                          <span className="capitalize">{node.provider}</span>
                          <span className="text-zinc-600 mx-1.5">·</span>
                          <span className="font-mono text-zinc-400">{node.region}</span>
                        </td>
                        <td className="py-3.5 px-4 font-mono text-xs tabular-nums text-zinc-300">
                          {node.ipv4}
                        </td>
                        <td className="py-3.5 px-4 font-mono text-xs tabular-nums text-right text-zinc-300">
                          {node.vcpu}c / {node.ramGb}G / {node.diskGb}G
                        </td>
                        <td className="py-3.5 px-4 text-xs">
                          <span
                            className={
                              isRunning
                                ? 'text-emerald-400 font-medium'
                                : node.status === 'stopped'
                                  ? 'text-zinc-400'
                                  : 'text-amber-400'
                            }
                          >
                            {isRunning ? 'Activo 24/7' : node.status === 'stopped' ? 'Detenido' : node.status}
                          </span>
                        </td>
                        <td className="py-3.5 px-6 text-right">
                          <button
                            type="button"
                            onClick={() =>
                              onToggleNodePower(
                                node.id,
                                isRunning ? 'stopped' : 'running',
                                node.uptime247
                              )
                            }
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-md border border-zinc-700 text-zinc-200 hover:border-[#D4AF37] hover:text-[#D4AF37] transition-colors whitespace-nowrap cursor-pointer"
                          >
                            {isRunning ? (
                              <>
                                <Square className="w-3 h-3" />
                                <span>Detener</span>
                              </>
                            ) : (
                              <>
                                <Play className="w-3 h-3" />
                                <span>Encender</span>
                              </>
                            )}
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </section>

        {/* Recent AI & MCP Operations */}
        <section className="xl:col-span-4 bg-[#12141A] border border-zinc-800 rounded-xl flex flex-col">
          <div className="px-6 py-4 border-b border-zinc-800 flex items-center justify-between gap-4">
            <div>
              <h2 className="text-base font-semibold text-zinc-100">Auditoría IA &amp; MCP</h2>
              <p className="text-xs text-zinc-400">Últimas ejecuciones autónomas</p>
            </div>
            <button
              type="button"
              onClick={() => onNavigate('ai-commander')}
              className="text-xs font-medium text-[#D4AF37] hover:text-[#E5C158] whitespace-nowrap cursor-pointer"
            >
              Ver todo
            </button>
          </div>

          <div className="p-6 flex-1 space-y-5">
            {aiLogs.length === 0 ? (
              <div className="py-8 text-center space-y-3">
                <p className="text-sm text-zinc-400">
                  Todavía no hay órdenes ejecutadas por el Comandante IA.
                </p>
                <button
                  type="button"
                  onClick={() => onNavigate('ai-commander')}
                  className="px-4 py-2 text-xs font-semibold bg-[#D4AF37] text-[#09090B] rounded-lg hover:bg-[#E5C158] transition-colors cursor-pointer"
                >
                  Dar Primera Orden IA
                </button>
              </div>
            ) : (
              aiLogs.slice(0, 5).map((log) => (
                <div
                  key={log.id}
                  className="pb-4 border-b border-zinc-800/70 last:border-b-0 last:pb-0 space-y-1.5"
                >
                  <div className="flex items-center justify-between gap-2 text-xs text-zinc-500">
                    <span className="font-mono text-[#D4AF37] truncate">{log.modelUsed}</span>
                    <span>{log.status === 'completed' ? 'OK' : 'Error'}</span>
                  </div>
                  <p className="text-sm text-zinc-200 line-clamp-2">{log.prompt}</p>
                  {log.mcpToolsExecuted.length > 0 && (
                    <p className="text-xs font-mono text-zinc-400 truncate">
                      MCP: {log.mcpToolsExecuted.join(' · ')}
                    </p>
                  )}
                </div>
              ))
            )}
          </div>
        </section>
      </div>
    </div>
  );
}

import React, { useMemo, useState } from 'react';
import { Plus, Play, Square, RotateCw, Trash2, Terminal, Search } from 'lucide-react';
import { CloudNode, CloudProvider, NodeStatus } from '../types/cloud';

interface NodesSectionProps {
  nodes: CloudNode[];
  onCreateNode: (input: {
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
  }) => Promise<void>;
  onUpdatePower: (id: string, status: NodeStatus, uptime247: boolean) => Promise<void>;
  onDeleteNode: (id: string) => Promise<void>;
  onOpenTerminal: () => void;
}

const PLAN_PRESETS: Record<
  CloudProvider,
  Array<{ plan: string; vcpu: number; ramGb: number; diskGb: number; cost: number; regions: string[] }>
> = {
  hetzner: [
    { plan: 'CX32 · Shared Intel', vcpu: 4, ramGb: 8, diskGb: 80, cost: 7.5, regions: ['fsn1', 'nbg1', 'hel1', 'ash'] },
    { plan: 'CPX41 · AMD Dedicated', vcpu: 8, ramGb: 16, diskGb: 240, cost: 29.9, regions: ['fsn1', 'hel1', 'ash', 'hil'] },
    { plan: 'CCX33 · Bare-Grade', vcpu: 8, ramGb: 32, diskGb: 360, cost: 58.0, regions: ['fsn1', 'nbg1', 'hel1'] },
  ],
  digitalocean: [
    { plan: 's-2vcpu-4gb-amd', vcpu: 2, ramGb: 4, diskGb: 80, cost: 24.0, regions: ['nyc3', 'sfo3', 'fra1', 'ams3'] },
    { plan: 's-4vcpu-8gb-amd', vcpu: 4, ramGb: 8, diskGb: 160, cost: 48.0, regions: ['nyc3', 'sfo3', 'fra1', 'sgp1'] },
    { plan: 'c-8-16gb · CPU Opt', vcpu: 8, ramGb: 16, diskGb: 200, cost: 168.0, regions: ['nyc3', 'fra1'] },
  ],
  'warrdcore-cloud': [
    { plan: 'WC-L40S-48G · 24/7', vcpu: 12, ramGb: 48, diskGb: 500, cost: 89.0, regions: ['hel1', 'fsn1', 'nyc3'] },
    { plan: 'WC-H100-NVMe · 24/7', vcpu: 16, ramGb: 64, diskGb: 640, cost: 118.0, regions: ['hel1', 'fra1'] },
  ],
};

export function NodesSection({
  nodes,
  onCreateNode,
  onUpdatePower,
  onDeleteNode,
  onOpenTerminal,
}: NodesSectionProps) {
  const [providerFilter, setProviderFilter] = useState<'all' | CloudProvider>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [showCreate, setShowCreate] = useState(false);

  const [name, setName] = useState('');
  const [provider, setProvider] = useState<CloudProvider>('hetzner');
  const [presetIndex, setPresetIndex] = useState(1);
  const [region, setRegion] = useState('fsn1');
  const [osImage, setOsImage] = useState('Ubuntu 24.04 LTS');
  const [workload, setWorkload] = useState('Apps Docker 24/7 · MCP Bridge');
  const [uptime247, setUptime247] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const currentPresets = PLAN_PRESETS[provider];
  const activePreset = currentPresets[presetIndex] || currentPresets[0];

  const filteredNodes = useMemo(() => {
    return nodes.filter((n) => {
      if (providerFilter !== 'all' && n.provider !== providerFilter) return false;
      if (searchTerm.trim()) {
        const q = searchTerm.toLowerCase();
        return (
          n.name.toLowerCase().includes(q) ||
          n.region.toLowerCase().includes(q) ||
          n.workload.toLowerCase().includes(q) ||
          n.ipv4.includes(q)
        );
      }
      return true;
    });
  }, [nodes, providerFilter, searchTerm]);

  const handleProviderChange = (next: CloudProvider) => {
    setProvider(next);
    setPresetIndex(0);
    setRegion(PLAN_PRESETS[next][0].regions[0]);
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    setSubmitting(true);
    try {
      await onCreateNode({
        name: name.trim(),
        provider,
        plan: activePreset.plan,
        region,
        osImage,
        vcpu: activePreset.vcpu,
        ramGb: activePreset.ramGb,
        diskGb: activePreset.diskGb,
        monthlyCostUsd: activePreset.cost,
        workload,
        uptime247,
        tags: [provider, region, uptime247 ? '24-7' : 'on-demand'],
      });
      setName('');
      setShowCreate(false);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Toolbar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-1 p-1 bg-[#12141A] border border-zinc-800 rounded-lg w-fit">
          {(
            [
              { id: 'all', label: 'Todos' },
              { id: 'hetzner', label: 'Hetzner' },
              { id: 'digitalocean', label: 'DigitalOcean' },
              { id: 'warrdcore-cloud', label: 'WarrdCore 24/7' },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setProviderFilter(tab.id)}
              className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap cursor-pointer ${
                providerFilter === tab.id
                  ? 'bg-[#D4AF37] text-[#09090B] font-semibold'
                  : 'text-zinc-400 hover:text-zinc-100'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar nodo, región o IP..."
              className="pl-9 pr-3 py-2 text-sm bg-[#12141A] border border-zinc-800 rounded-lg text-zinc-100 placeholder:text-zinc-500 w-56 focus:border-[#D4AF37] focus:outline-none"
            />
          </div>
          <button
            type="button"
            onClick={() => setShowCreate((s) => !s)}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold bg-[#D4AF37] text-[#09090B] rounded-lg hover:bg-[#E5C158] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Desplegar Servidor</span>
          </button>
        </div>
      </div>

      {/* Provisioning Drawer */}
      {showCreate && (
        <form
          onSubmit={handleCreate}
          className="bg-[#12141A] border border-[#D4AF37]/40 rounded-xl p-6 space-y-5"
        >
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-semibold text-zinc-100">
                Aprovisionar Nuevo Servidor 24/7
              </h3>
              <p className="text-xs text-zinc-400">
                Arquitectura estilo Hetzner Cloud, DigitalOcean Droplets o WarrdCore Compute
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowCreate(false)}
              className="text-xs text-zinc-400 hover:text-zinc-100 cursor-pointer"
            >
              Cancelar
            </button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-zinc-300">Nombre del Nodo</label>
              <input
                type="text"
                required
                maxLength={80}
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="ej. montana-fra-api-02"
                className="w-full px-3 py-2 text-sm bg-[#09090B] border border-zinc-800 rounded-lg text-zinc-100 focus:border-[#D4AF37] focus:outline-none"
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-zinc-300">Proveedor</label>
              <select
                value={provider}
                onChange={(e) => handleProviderChange(e.target.value as CloudProvider)}
                className="w-full px-3 py-2 text-sm bg-[#09090B] border border-zinc-800 rounded-lg text-zinc-100 focus:border-[#D4AF37] focus:outline-none"
              >
                <option value="hetzner">Hetzner Cloud (Dedicated NVMe)</option>
                <option value="digitalocean">DigitalOcean (Droplet Cloud)</option>
                <option value="warrdcore-cloud">WarrdCore Bare-Metal (AI 24/7)</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-zinc-300">Plan de Cómputo</label>
              <select
                value={presetIndex}
                onChange={(e) => setPresetIndex(Number(e.target.value))}
                className="w-full px-3 py-2 text-sm bg-[#09090B] border border-zinc-800 rounded-lg text-zinc-100 focus:border-[#D4AF37] focus:outline-none"
              >
                {currentPresets.map((p, idx) => (
                  <option key={p.plan} value={idx}>
                    {p.plan} ({p.vcpu} vCPU / {p.ramGb} GB / ${p.cost}/mes)
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-zinc-300">Región Datacenter</label>
              <select
                value={region}
                onChange={(e) => setRegion(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-[#09090B] border border-zinc-800 rounded-lg text-zinc-100 focus:border-[#D4AF37] focus:outline-none"
              >
                {activePreset.regions.map((r) => (
                  <option key={r} value={r}>
                    {r.toUpperCase()}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-zinc-300">Imagen del Sistema</label>
              <select
                value={osImage}
                onChange={(e) => setOsImage(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-[#09090B] border border-zinc-800 rounded-lg text-zinc-100 focus:border-[#D4AF37] focus:outline-none"
              >
                <option value="Ubuntu 24.04 LTS">Ubuntu 24.04 LTS (Noble)</option>
                <option value="Ubuntu 24.04 CUDA 12.6">Ubuntu 24.04 + CUDA 12.6 (IA)</option>
                <option value="Debian 12 Bookworm">Debian 12 Bookworm Minimal</option>
                <option value="Alpine 3.20 Docker Host">Alpine 3.20 Docker Host</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-zinc-300">Carga de Trabajo</label>
              <input
                type="text"
                maxLength={160}
                value={workload}
                onChange={(e) => setWorkload(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-[#09090B] border border-zinc-800 rounded-lg text-zinc-100 focus:border-[#D4AF37] focus:outline-none"
              />
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-4 pt-2 border-t border-zinc-800">
            <label className="inline-flex items-center gap-2 text-xs text-zinc-300 cursor-pointer">
              <input
                type="checkbox"
                checked={uptime247}
                onChange={(e) => setUptime247(e.target.checked)}
                className="accent-[#D4AF37] w-4 h-4"
              />
              <span>Activar Watchdog 24/7 + Auto-Restart Systemd + Cloud-Init</span>
            </label>

            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 text-sm font-semibold bg-[#D4AF37] text-[#09090B] rounded-lg hover:bg-[#E5C158] disabled:opacity-50 transition-colors whitespace-nowrap cursor-pointer"
            >
              {submitting ? 'Desplegando...' : `Crear Nodo ($${activePreset.cost}/mes)`}
            </button>
          </div>
        </form>
      )}

      {/* High-Density Nodes Table */}
      <div className="bg-[#12141A] border border-zinc-800 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-zinc-800 text-xs text-zinc-400">
                <th className="py-3.5 px-6 font-medium">Servidor &amp; Imagen</th>
                <th className="py-3.5 px-4 font-medium">Proveedor / Plan</th>
                <th className="py-3.5 px-4 font-medium">Red Pública / VPC</th>
                <th className="py-3.5 px-4 font-medium text-right">Hardware</th>
                <th className="py-3.5 px-4 font-medium text-right">Coste</th>
                <th className="py-3.5 px-4 font-medium">Estado 24/7</th>
                <th className="py-3.5 px-6 font-medium text-right">Controles</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/60 text-sm">
              {filteredNodes.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-12 px-6 text-center text-zinc-400">
                    No hay servidores que coincidan con este filtro.
                  </td>
                </tr>
              ) : (
                filteredNodes.map((node) => {
                  const isRunning = node.status === 'running';
                  return (
                    <tr key={node.id} className="hover:bg-[#181B23]/70 transition-colors">
                      <td className="py-4 px-6">
                        <div className="font-semibold text-zinc-100">{node.name}</div>
                        <div className="text-xs text-zinc-500">
                          {node.osImage} · {node.workload}
                        </div>
                      </td>
                      <td className="py-4 px-4 text-xs">
                        <div className="text-zinc-200 capitalize">
                          {node.provider} · <span className="font-mono text-zinc-400">{node.region}</span>
                        </div>
                        <div className="text-zinc-500 font-mono">{node.plan}</div>
                      </td>
                      <td className="py-4 px-4 font-mono text-xs tabular-nums">
                        <div className="text-zinc-200">{node.ipv4}</div>
                        <div className="text-zinc-500">VPC {node.privateIp}</div>
                      </td>
                      <td className="py-4 px-4 font-mono text-xs tabular-nums text-right text-zinc-300">
                        <div>{node.vcpu} vCPU · {node.ramGb} GB</div>
                        <div className="text-zinc-500">{node.diskGb} GB NVMe</div>
                      </td>
                      <td className="py-4 px-4 font-mono text-xs tabular-nums text-right text-[#D4AF37]">
                        ${node.monthlyCostUsd.toFixed(2)}/m
                      </td>
                      <td className="py-4 px-4 text-xs">
                        <div className={isRunning ? 'text-emerald-400 font-medium' : 'text-zinc-400'}>
                          {isRunning ? 'En ejecución' : node.status}
                        </div>
                        <button
                          type="button"
                          onClick={() => onUpdatePower(node.id, node.status, !node.uptime247)}
                          className="text-zinc-500 hover:text-[#D4AF37] underline underline-offset-2 cursor-pointer"
                        >
                          Watchdog 24/7: {node.uptime247 ? 'ON' : 'OFF'}
                        </button>
                      </td>
                      <td className="py-4 px-6">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            title={isRunning ? 'Detener servidor' : 'Encender servidor'}
                            onClick={() =>
                              onUpdatePower(node.id, isRunning ? 'stopped' : 'running', node.uptime247)
                            }
                            className="p-2 rounded-md border border-zinc-800 text-zinc-300 hover:border-[#D4AF37] hover:text-[#D4AF37] transition-colors cursor-pointer"
                          >
                            {isRunning ? <Square className="w-3.5 h-3.5" /> : <Play className="w-3.5 h-3.5" />}
                          </button>
                          <button
                            type="button"
                            title="Reiniciar nodo"
                            onClick={() => onUpdatePower(node.id, 'running', node.uptime247)}
                            className="p-2 rounded-md border border-zinc-800 text-zinc-300 hover:border-[#D4AF37] hover:text-[#D4AF37] transition-colors cursor-pointer"
                          >
                            <RotateCw className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            title="Abrir en Terminal Ubuntu"
                            onClick={onOpenTerminal}
                            className="p-2 rounded-md border border-zinc-800 text-zinc-300 hover:border-[#D4AF37] hover:text-[#D4AF37] transition-colors cursor-pointer"
                          >
                            <Terminal className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            title="Eliminar servidor"
                            onClick={() => onDeleteNode(node.id)}
                            className="p-2 rounded-md border border-zinc-800 text-zinc-400 hover:border-red-700 hover:text-red-400 transition-colors cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}

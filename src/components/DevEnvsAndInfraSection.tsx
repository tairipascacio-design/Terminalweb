import React, { useMemo, useState } from 'react';
import { RefreshCw, Plus, Trash2, Power, Shield, KeyRound, HardDrive, Network } from 'lucide-react';
import {
  DevEnvironment,
  DeviceKind,
  InfraProvider,
  InfraResource,
  InfraResourceKind,
  ShellKind,
} from '../types/cloud';

interface DevEnvsSectionProps {
  envs: DevEnvironment[];
  onCreate: (input: {
    name: string;
    deviceType: DeviceKind;
    osRelease: string;
    shell: ShellKind;
    repoUrl: string;
    packages: string[];
    envProfile: string;
  }) => Promise<void>;
  onSyncOne: (id: string) => Promise<void>;
  onSyncAll: () => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

export function DevEnvsSection({
  envs,
  onCreate,
  onSyncOne,
  onSyncAll,
  onDelete,
}: DevEnvsSectionProps) {
  const [showAdd, setShowAdd] = useState(false);
  const [syncingAll, setSyncingAll] = useState(false);

  const [name, setName] = useState('');
  const [deviceType, setDeviceType] = useState<DeviceKind>('termux-android');
  const [osRelease, setOsRelease] = useState('Ubuntu 24.04 LTS');
  const [shell, setShell] = useState<ShellKind>('zsh');
  const [repoUrl, setRepoUrl] = useState('https://github.com/montana-ops/dotfiles');
  const [packagesText, setPackagesText] = useState('git, tmux, neovim, nodejs, docker, warrdcore-cli');
  const [envProfile, setEnvProfile] = useState('CLOUD_SYNC=ACTIVE · MCP_GATEWAY=ON');

  const handleSyncAll = async () => {
    setSyncingAll(true);
    try {
      await onSyncAll();
    } finally {
      setSyncingAll(false);
    }
  };

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    await onCreate({
      name: name.trim(),
      deviceType,
      osRelease: osRelease.trim(),
      shell,
      repoUrl: repoUrl.trim(),
      packages: packagesText
        .split(',')
        .map((p) => p.trim())
        .filter(Boolean),
      envProfile: envProfile.trim(),
    });
    setName('');
    setShowAdd(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-zinc-100">
            Sincronización de Entornos de Desarrollo en la Nube
          </h2>
          <p className="text-xs text-zinc-400">
            Mantén tus dotfiles, paquetes, shells y variables idénticos entre Termux Android, Ubuntu Linux y la nube
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            type="button"
            disabled={syncingAll}
            onClick={handleSyncAll}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-medium bg-[#181B23] text-zinc-100 border border-zinc-700 rounded-lg hover:border-[#D4AF37] transition-colors whitespace-nowrap cursor-pointer"
          >
            <RefreshCw className={`w-4 h-4 text-[#D4AF37] ${syncingAll ? 'animate-spin' : ''}`} />
            <span>{syncingAll ? 'Sincronizando...' : 'Sincronizar Todo'}</span>
          </button>
          <button
            type="button"
            onClick={() => setShowAdd((v) => !v)}
            className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold bg-[#D4AF37] text-[#09090B] rounded-lg hover:bg-[#E5C158] transition-colors whitespace-nowrap cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Vincular Entorno</span>
          </button>
        </div>
      </div>

      {showAdd && (
        <form
          onSubmit={handleCreate}
          className="bg-[#12141A] border border-[#D4AF37]/40 rounded-xl p-6 space-y-4"
        >
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-zinc-300">Nombre del Entorno</label>
              <input
                type="text"
                required
                maxLength={80}
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="ej. Laptop Ubuntu Workstation"
                className="w-full px-3 py-2 text-sm bg-[#09090B] border border-zinc-800 rounded-lg text-zinc-100 focus:border-[#D4AF37] focus:outline-none"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-zinc-300">Dispositivo</label>
              <select
                value={deviceType}
                onChange={(e) => setDeviceType(e.target.value as DeviceKind)}
                className="w-full px-3 py-2 text-sm bg-[#09090B] border border-zinc-800 rounded-lg text-zinc-100 focus:border-[#D4AF37] focus:outline-none"
              >
                <option value="termux-android">Termux Android (proot-distro)</option>
                <option value="ubuntu-linux">Ubuntu Linux (Servidor / PC)</option>
                <option value="cloud-container">Cloud DevContainer</option>
                <option value="workstation">Workstation Local</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-zinc-300">Shell</label>
              <select
                value={shell}
                onChange={(e) => setShell(e.target.value as ShellKind)}
                className="w-full px-3 py-2 text-sm font-mono bg-[#09090B] border border-zinc-800 rounded-lg text-zinc-100 focus:border-[#D4AF37] focus:outline-none"
              >
                <option value="zsh">zsh (Oh-My-Zsh)</option>
                <option value="bash">bash</option>
                <option value="fish">fish</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-zinc-300">Sistema Operativo</label>
              <input
                type="text"
                maxLength={64}
                value={osRelease}
                onChange={(e) => setOsRelease(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-[#09090B] border border-zinc-800 rounded-lg text-zinc-100 focus:border-[#D4AF37] focus:outline-none"
              />
            </div>
            <div className="md:col-span-2 space-y-1.5">
              <label className="text-xs font-medium text-zinc-300">Repositorio Git de Dotfiles</label>
              <input
                type="text"
                maxLength={256}
                value={repoUrl}
                onChange={(e) => setRepoUrl(e.target.value)}
                className="w-full px-3 py-2 text-sm font-mono bg-[#09090B] border border-zinc-800 rounded-lg text-zinc-100 focus:border-[#D4AF37] focus:outline-none"
              />
            </div>
            <div className="md:col-span-2 space-y-1.5">
              <label className="text-xs font-medium text-zinc-300">Paquetes Sincronizados</label>
              <input
                type="text"
                value={packagesText}
                onChange={(e) => setPackagesText(e.target.value)}
                className="w-full px-3 py-2 text-sm font-mono bg-[#09090B] border border-zinc-800 rounded-lg text-zinc-100 focus:border-[#D4AF37] focus:outline-none"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-zinc-300">Perfil de Variables</label>
              <input
                type="text"
                maxLength={400}
                value={envProfile}
                onChange={(e) => setEnvProfile(e.target.value)}
                className="w-full px-3 py-2 text-sm font-mono bg-[#09090B] border border-zinc-800 rounded-lg text-zinc-100 focus:border-[#D4AF37] focus:outline-none"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2 border-t border-zinc-800">
            <button
              type="button"
              onClick={() => setShowAdd(false)}
              className="px-4 py-2 text-xs text-zinc-400 hover:text-zinc-100 cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-sm font-semibold bg-[#D4AF37] text-[#09090B] rounded-lg hover:bg-[#E5C158] transition-colors cursor-pointer"
            >
              Registrar &amp; Sincronizar
            </button>
          </div>
        </form>
      )}

      {/* Synced Environments List */}
      <div className="bg-[#12141A] border border-zinc-800 rounded-xl divide-y divide-zinc-800/70">
        {envs.map((env) => (
          <div
            key={env.id}
            className="p-6 flex flex-col lg:flex-row lg:items-center justify-between gap-4 hover:bg-[#181B23]/60 transition-colors"
          >
            <div className="space-y-1.5">
              <div className="flex flex-wrap items-center gap-2 text-sm">
                <span className="font-semibold text-zinc-100">{env.name}</span>
                <span className="text-zinc-600">·</span>
                <span className="text-xs text-zinc-400">{env.osRelease}</span>
                <span className="text-zinc-600">·</span>
                <span className="font-mono text-xs text-[#D4AF37]">{env.shell}</span>
                <span className="text-zinc-600">·</span>
                <span
                  className={
                    env.syncState === 'synced'
                      ? 'text-xs text-emerald-400 font-medium'
                      : 'text-xs text-amber-400 font-medium'
                  }
                >
                  {env.syncState === 'synced' ? 'Sincronizado' : 'Pendiente de sync'} ({env.dotfilesRevision})
                </span>
              </div>
              <p className="text-xs font-mono text-zinc-400">{env.envProfile}</p>
              <p className="text-xs text-zinc-500 font-mono">
                Paquetes: {env.packages.join(', ')}
              </p>
            </div>

            <div className="flex items-center gap-2 shrink-0">
              <button
                type="button"
                onClick={() => onSyncOne(env.id)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium border border-zinc-700 text-zinc-200 rounded-md hover:border-[#D4AF37] hover:text-[#D4AF37] transition-colors whitespace-nowrap cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Sincronizar</span>
              </button>
              <button
                type="button"
                onClick={() => onDelete(env.id)}
                title="Eliminar entorno"
                className="p-2 border border-zinc-800 text-zinc-400 rounded-md hover:border-red-700 hover:text-red-400 transition-colors cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

interface InfraSectionProps {
  resources: InfraResource[];
  onCreate: (input: {
    kind: InfraResourceKind;
    name: string;
    provider: InfraProvider;
    target: string;
    spec: string;
  }) => Promise<void>;
  onToggle: (id: string, enabled: boolean) => Promise<void>;
  onDelete: (id: string) => Promise<void>;
}

const KIND_LABELS: Record<InfraResourceKind, string> = {
  firewall: 'Cloud Firewall',
  'floating-ip': 'Floating / Reserved IP',
  vpc: 'VPC & WireGuard Mesh',
  snapshot: 'Snapshots & Backups',
  volume: 'Volúmenes NVMe',
  'oauth-connector': 'Conectores OAuth 2.0',
  'ssh-key': 'Llaves SSH',
  'daemon-247': 'Daemons 24/7 Watchdog',
};

export function InfraSection({ resources, onCreate, onToggle, onDelete }: InfraSectionProps) {
  const [kindFilter, setKindFilter] = useState<'all' | InfraResourceKind>('all');
  const [showAdd, setShowAdd] = useState(false);

  const [kind, setKind] = useState<InfraResourceKind>('firewall');
  const [name, setName] = useState('');
  const [provider, setProvider] = useState<InfraProvider>('hetzner');
  const [target, setTarget] = useState('montana-fra-core-01');
  const [spec, setSpec] = useState('');

  const filtered = useMemo(() => {
    if (kindFilter === 'all') return resources;
    return resources.filter((r) => r.kind === kindFilter);
  }, [resources, kindFilter]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !spec.trim()) return;
    await onCreate({
      kind,
      name: name.trim(),
      provider,
      target: target.trim() || 'all-nodes',
      spec: spec.trim(),
    });
    setName('');
    setSpec('');
    setShowAdd(false);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-zinc-100">
            Infraestructura Hetzner &amp; DigitalOcean + OAuth
          </h2>
          <p className="text-xs text-zinc-400">
            Firewalls, Floating IPs, VPC privada, Snapshots automáticos, Volúmenes NVMe, Llaves SSH, Conectores OAuth y Watchdogs 24/7
          </p>
        </div>

        <button
          type="button"
          onClick={() => setShowAdd((v) => !v)}
          className="inline-flex items-center gap-2 px-4 py-2 text-sm font-semibold bg-[#D4AF37] text-[#09090B] rounded-lg hover:bg-[#E5C158] transition-colors whitespace-nowrap cursor-pointer"
        >
          <Plus className="w-4 h-4" />
          <span>Nuevo Recurso Cloud</span>
        </button>
      </div>

      {/* Category Filter Bar */}
      <div className="flex items-center gap-1 p-1 bg-[#12141A] border border-zinc-800 rounded-lg overflow-x-auto">
        <button
          type="button"
          onClick={() => setKindFilter('all')}
          className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
            kindFilter === 'all'
              ? 'bg-[#D4AF37] text-[#09090B] font-semibold'
              : 'text-zinc-400 hover:text-zinc-100'
          }`}
        >
          Todos ({resources.length})
        </button>
        {(Object.keys(KIND_LABELS) as InfraResourceKind[]).map((k) => (
          <button
            key={k}
            type="button"
            onClick={() => setKindFilter(k)}
            className={`px-3 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              kindFilter === k
                ? 'bg-[#D4AF37] text-[#09090B] font-semibold'
                : 'text-zinc-400 hover:text-zinc-100'
            }`}
          >
            {KIND_LABELS[k]}
          </button>
        ))}
      </div>

      {showAdd && (
        <form
          onSubmit={handleSubmit}
          className="bg-[#12141A] border border-[#D4AF37]/40 rounded-xl p-6 space-y-4"
        >
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-zinc-300">Tipo de Herramienta</label>
              <select
                value={kind}
                onChange={(e) => setKind(e.target.value as InfraResourceKind)}
                className="w-full px-3 py-2 text-sm bg-[#09090B] border border-zinc-800 rounded-lg text-zinc-100 focus:border-[#D4AF37] focus:outline-none"
              >
                {(Object.keys(KIND_LABELS) as InfraResourceKind[]).map((k) => (
                  <option key={k} value={k}>
                    {KIND_LABELS[k]}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-zinc-300">Proveedor / Integración</label>
              <select
                value={provider}
                onChange={(e) => setProvider(e.target.value as InfraProvider)}
                className="w-full px-3 py-2 text-sm bg-[#09090B] border border-zinc-800 rounded-lg text-zinc-100 focus:border-[#D4AF37] focus:outline-none"
              >
                <option value="hetzner">Hetzner Cloud</option>
                <option value="digitalocean">DigitalOcean</option>
                <option value="cloudflare">Cloudflare Edge / Tunnel</option>
                <option value="github">GitHub OAuth 2.0</option>
                <option value="tailscale">Tailscale / WireGuard</option>
                <option value="warrdcore">WarrdCore Runtime</option>
                <option value="montana-mesh">Montana Mesh</option>
              </select>
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-zinc-300">Nombre</label>
              <input
                type="text"
                required
                maxLength={96}
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="ej. Firewall MCP + WarrdCore"
                className="w-full px-3 py-2 text-sm bg-[#09090B] border border-zinc-800 rounded-lg text-zinc-100 focus:border-[#D4AF37] focus:outline-none"
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-zinc-300">Destino / Scope</label>
              <input
                type="text"
                required
                maxLength={128}
                value={target}
                onChange={(e) => setTarget(e.target.value)}
                placeholder="ej. warrdcore-infer-247"
                className="w-full px-3 py-2 text-sm font-mono bg-[#09090B] border border-zinc-800 rounded-lg text-zinc-100 focus:border-[#D4AF37] focus:outline-none"
              />
            </div>
            <div className="md:col-span-2 lg:col-span-4 space-y-1.5">
              <label className="text-xs font-medium text-zinc-300">Regla / Especificación Técnica</label>
              <input
                type="text"
                required
                maxLength={320}
                value={spec}
                onChange={(e) => setSpec(e.target.value)}
                placeholder="ej. ALLOW TCP 11434 desde VPC 10.10.0.0/16 · Rate-limit 120 req/s"
                className="w-full px-3 py-2 text-sm font-mono bg-[#09090B] border border-zinc-800 rounded-lg text-zinc-100 focus:border-[#D4AF37] focus:outline-none"
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2 border-t border-zinc-800">
            <button
              type="button"
              onClick={() => setShowAdd(false)}
              className="px-4 py-2 text-xs text-zinc-400 hover:text-zinc-100 cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-sm font-semibold bg-[#D4AF37] text-[#09090B] rounded-lg hover:bg-[#E5C158] transition-colors cursor-pointer"
            >
              Aplicar Recurso
            </button>
          </div>
        </form>
      )}

      {/* High-Density Infra Table */}
      <div className="bg-[#12141A] border border-zinc-800 rounded-xl overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-zinc-800 text-xs text-zinc-400">
                <th className="py-3.5 px-6 font-medium">Recurso</th>
                <th className="py-3.5 px-4 font-medium">Tipo &amp; Proveedor</th>
                <th className="py-3.5 px-4 font-medium">Destino</th>
                <th className="py-3.5 px-4 font-medium">Especificación</th>
                <th className="py-3.5 px-4 font-medium">Estado</th>
                <th className="py-3.5 px-6 font-medium text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800/60 text-sm">
              {filtered.map((res) => (
                <tr key={res.id} className="hover:bg-[#181B23]/70 transition-colors">
                  <td className="py-4 px-6 font-medium text-zinc-100">
                    <div className="flex items-center gap-2">
                      {res.kind === 'firewall' || res.kind === 'ssh-key' ? (
                        <Shield className="w-3.5 h-3.5 text-[#D4AF37] shrink-0" />
                      ) : res.kind === 'oauth-connector' ? (
                        <KeyRound className="w-3.5 h-3.5 text-[#D4AF37] shrink-0" />
                      ) : res.kind === 'volume' || res.kind === 'snapshot' ? (
                        <HardDrive className="w-3.5 h-3.5 text-[#D4AF37] shrink-0" />
                      ) : (
                        <Network className="w-3.5 h-3.5 text-[#D4AF37] shrink-0" />
                      )}
                      <span>{res.name}</span>
                    </div>
                  </td>
                  <td className="py-4 px-4 text-xs text-zinc-300">
                    <div>{KIND_LABELS[res.kind]}</div>
                    <div className="text-zinc-500 capitalize">{res.provider}</div>
                  </td>
                  <td className="py-4 px-4 font-mono text-xs text-zinc-300">{res.target}</td>
                  <td className="py-4 px-4 font-mono text-xs text-zinc-400 max-w-md">{res.spec}</td>
                  <td className="py-4 px-4 text-xs">
                    <span className={res.enabled ? 'text-emerald-400 font-medium' : 'text-zinc-500'}>
                      {res.enabled ? 'Activo' : 'Inactivo'}
                    </span>
                  </td>
                  <td className="py-4 px-6">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        type="button"
                        onClick={() => onToggle(res.id, !res.enabled)}
                        title={res.enabled ? 'Desactivar' : 'Activar'}
                        className="p-2 border border-zinc-800 text-zinc-300 rounded-md hover:border-[#D4AF37] hover:text-[#D4AF37] transition-colors cursor-pointer"
                      >
                        <Power className="w-3.5 h-3.5" />
                      </button>
                      <button
                        type="button"
                        onClick={() => onDelete(res.id)}
                        title="Eliminar recurso"
                        className="p-2 border border-zinc-800 text-zinc-400 rounded-md hover:border-red-700 hover:text-red-400 transition-colors cursor-pointer"
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

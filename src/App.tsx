/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState } from 'react';
import {
  LayoutDashboard,
  Server,
  Terminal,
  Blocks,
  Cpu,
  RefreshCw,
  Shield,
  Sparkles,
  LogOut,
  Menu,
  X,
} from 'lucide-react';
import { ErrorBoundary } from './components/ErrorBoundary';
import { AuthGate } from './components/AuthGate';
import { OverviewSection } from './components/OverviewSection';
import { NodesSection } from './components/NodesSection';
import { TerminalSection } from './components/TerminalSection';
import { McpSection, WarrdcoreSection } from './components/McpAndWarrdcoreSection';
import { DevEnvsSection, InfraSection } from './components/DevEnvsAndInfraSection';
import { AiCommanderSection } from './components/AiCommanderSection';
import { OfflineIndicator, PWAInstallButton } from './components/NativeInstallModal';
import { useCloudState } from './hooks/useCloudState';
import { ActiveSection } from './types/cloud';

const NAV_ITEMS: Array<{
  id: ActiveSection;
  label: string;
  breadcrumb: string;
  icon: typeof LayoutDashboard;
}> = [
  { id: 'overview', label: 'Centro de Mando', breadcrumb: 'Consola / Resumen Ejecutivo', icon: LayoutDashboard },
  { id: 'nodes', label: 'Servidores 24/7', breadcrumb: 'Infraestructura / Servidores Hetzner & DO', icon: Server },
  { id: 'terminal', label: 'Terminal Termux & Ubuntu', breadcrumb: 'Runtime / Shell Web Ubuntu 24.04 & Termux', icon: Terminal },
  { id: 'ai-commander', label: 'Comandante IA & MCP', breadcrumb: 'Inteligencia / Orquestador Autónomo MCP', icon: Sparkles },
  { id: 'warrdcore', label: 'Modelos WarrdCore', breadcrumb: 'Inteligencia / Bóveda WarrdCore 24/7', icon: Cpu },
  { id: 'mcp', label: 'Servidores MCP', breadcrumb: 'Conectores / Hub Model Context Protocol', icon: Blocks },
  { id: 'devenvs', label: 'Sync Entornos Dev', breadcrumb: 'Desarrollo / Sincronización Multi-Dispositivo', icon: RefreshCw },
  { id: 'infrastructure', label: 'Red, Firewall & OAuth', breadcrumb: 'Infraestructura / Herramientas Hetzner & DO', icon: Shield },
];

function WorkspaceApp() {
  const cloud = useCloudState();
  const [section, setSection] = useState<ActiveSection>('overview');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [focusedWarrdcoreModelId, setFocusedWarrdcoreModelId] = useState<string | null>(null);

  if (!cloud.authReady || cloud.bootstrapping) {
    return (
      <div className="min-h-screen bg-[#09090B] text-zinc-100 flex items-center justify-center p-6">
        <div className="text-center space-y-3">
          <p className="font-display text-2xl font-bold text-[#D4AF37]">Montana Cloud</p>
          <p className="text-sm text-zinc-400">
            {cloud.bootstrapping
              ? 'Preparando tu bóveda de servidores 24/7 y entornos...'
              : 'Verificando credenciales de operador...'}
          </p>
        </div>
      </div>
    );
  }

  if (!cloud.user) {
    return <AuthGate onLogin={cloud.loginWithGoogle} error={cloud.authError} />;
  }

  const currentNav = NAV_ITEMS.find((i) => i.id === section) || NAV_ITEMS[0];

  const handleNavigate = (next: ActiveSection) => {
    setSection(next);
    setMobileMenuOpen(false);
  };

  return (
    <div className="min-h-screen bg-[#09090B] text-zinc-100 flex">
      {/* Desktop Executive Sidebar */}
      <aside className="hidden lg:flex lg:flex-col lg:w-[264px] shrink-0 bg-[#0D0E12] border-r border-zinc-800/90 sticky top-0 h-screen">
        <div className="px-6 py-5 border-b border-zinc-800/90">
          <button
            type="button"
            onClick={() => handleNavigate('overview')}
            className="font-display text-xl font-bold tracking-wider text-[#D4AF37] whitespace-nowrap cursor-pointer"
          >
            Montana Cloud
          </button>
        </div>

        <nav className="flex-1 px-3 py-5 space-y-1 overflow-y-auto">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const active = section === item.id;
            return (
              <button
                key={item.id}
                type="button"
                onClick={() => handleNavigate(item.id)}
                className={`w-full flex items-center gap-3 px-3.5 py-2.5 text-sm font-medium rounded-lg transition-colors whitespace-nowrap cursor-pointer ${
                  active
                    ? 'bg-[#181B23] text-[#D4AF37] border border-zinc-800'
                    : 'text-zinc-400 hover:text-zinc-100 hover:bg-[#12141A] border border-transparent'
                }`}
              >
                <Icon className="w-4 h-4 shrink-0" />
                <span className="truncate">{item.label}</span>
              </button>
            );
          })}
        </nav>

        {/* Install Native App Action */}
        <div className="px-4 pb-3">
          <PWAInstallButton variant="sidebar" />
        </div>

        {/* Operator Profile Footer */}
        <div className="p-4 border-t border-zinc-800/90 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <img
              src={cloud.user.photoURL || '/src/assets/images/executive_boss_avatar_1795484227885.jpg'}
              alt={cloud.user.displayName || 'Operador'}
              referrerPolicy="no-referrer"
              className="w-9 h-9 rounded-lg object-cover border border-zinc-700 shrink-0"
            />
            <div className="min-w-0">
              <p className="text-xs font-semibold text-zinc-100 truncate">
                {cloud.user.displayName || 'Operador Ejecutivo'}
              </p>
              <p className="text-[11px] text-zinc-500 truncate">{cloud.user.email}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={cloud.logout}
            title="Cerrar sesión"
            className="p-2 text-zinc-400 hover:text-red-400 rounded-md transition-colors shrink-0 cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </aside>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div className="w-72 bg-[#0D0E12] border-r border-zinc-800 flex flex-col h-full">
            <div className="px-5 py-4 border-b border-zinc-800 flex items-center justify-between">
              <span className="font-display text-lg font-bold text-[#D4AF37]">Montana Cloud</span>
              <button
                type="button"
                onClick={() => setMobileMenuOpen(false)}
                className="p-1.5 text-zinc-400 hover:text-zinc-100 cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
              {NAV_ITEMS.map((item) => {
                const Icon = item.icon;
                const active = section === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => handleNavigate(item.id)}
                    className={`w-full flex items-center gap-3 px-3.5 py-2.5 text-sm font-medium rounded-lg transition-colors whitespace-nowrap cursor-pointer ${
                      active
                        ? 'bg-[#181B23] text-[#D4AF37]'
                        : 'text-zinc-400 hover:text-zinc-100'
                    }`}
                  >
                    <Icon className="w-4 h-4 shrink-0" />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </nav>
            <div className="p-4 border-t border-zinc-800 space-y-2.5">
              <PWAInstallButton variant="sidebar" />
              <button
                type="button"
                onClick={cloud.logout}
                className="w-full flex items-center justify-center gap-2 px-4 py-2 text-xs font-medium text-zinc-300 border border-zinc-800 rounded-lg hover:border-red-700 hover:text-red-400 cursor-pointer"
              >
                <LogOut className="w-3.5 h-3.5" />
                <span>Cerrar Sesión</span>
              </button>
            </div>
          </div>
          <div
            className="flex-1 bg-black/70"
            onClick={() => setMobileMenuOpen(false)}
          />
        </div>
      )}

      {/* Main Content Shell */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* Clean Contextual Top Bar */}
        <header className="sticky top-0 z-30 bg-[#09090B]/95 backdrop-blur border-b border-zinc-800/90 px-6 lg:px-8 py-4 flex items-center justify-between gap-6">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              className="lg:hidden p-2 text-zinc-300 hover:text-zinc-100 border border-zinc-800 rounded-lg cursor-pointer"
              aria-label="Abrir navegación"
            >
              <Menu className="w-4 h-4" />
            </button>
            <span className="text-sm font-medium text-zinc-300 truncate">
              {currentNav.breadcrumb}
            </span>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            <button
              type="button"
              onClick={() => handleNavigate(section === 'ai-commander' ? 'terminal' : 'ai-commander')}
              className="px-4 py-2 text-xs font-semibold bg-[#D4AF37] text-[#09090B] rounded-lg hover:bg-[#E5C158] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              {section === 'ai-commander' ? 'Abrir Terminal' : 'Comandante IA'}
            </button>
          </div>
        </header>

        {/* Active Viewport */}
        <main className="flex-1 w-full max-w-[1440px] mx-auto px-6 lg:px-8 py-7">
          {cloud.dataLoading ? (
            <div className="space-y-4">
              <div className="h-44 rounded-xl bg-[#12141A] border border-zinc-800 animate-pulse" />
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                {[1, 2, 3, 4].map((n) => (
                  <div key={n} className="h-24 rounded-xl bg-[#12141A] border border-zinc-800 animate-pulse" />
                ))}
              </div>
            </div>
          ) : (
            <>
              {section === 'overview' && (
                <OverviewSection
                  nodes={cloud.nodes}
                  mcpServers={cloud.mcpServers}
                  warrdcoreModels={cloud.warrdcoreModels}
                  devEnvs={cloud.devEnvs}
                  infraResources={cloud.infraResources}
                  aiLogs={cloud.aiLogs}
                  onNavigate={handleNavigate}
                  onSyncAll={cloud.syncAllDevEnvs}
                  onToggleNodePower={cloud.updateNodePower}
                />
              )}

              {section === 'nodes' && (
                <NodesSection
                  nodes={cloud.nodes}
                  onCreateNode={cloud.createNode}
                  onUpdatePower={cloud.updateNodePower}
                  onDeleteNode={cloud.deleteNode}
                  onOpenTerminal={() => handleNavigate('terminal')}
                />
              )}

              {section === 'terminal' && (
                <TerminalSection
                  getIdToken={cloud.getIdToken}
                  nodes={cloud.nodes}
                  mcpServers={cloud.mcpServers}
                  warrdcoreModels={cloud.warrdcoreModels}
                  devEnvs={cloud.devEnvs}
                />
              )}

              {section === 'mcp' && (
                <McpSection
                  servers={cloud.mcpServers}
                  onCreate={cloud.createMcpServer}
                  onToggle={cloud.toggleMcpServer}
                  onTestInvoke={cloud.incrementMcpInvocation}
                  onDelete={cloud.deleteMcpServer}
                />
              )}

              {section === 'warrdcore' && (
                <WarrdcoreSection
                  models={cloud.warrdcoreModels}
                  nodes={cloud.nodes}
                  onCreate={cloud.createWarrdcoreModel}
                  onUpdateStatus={cloud.updateWarrdcoreStatus}
                  onDelete={cloud.deleteWarrdcoreModel}
                  onTestInCommander={(modelId) => {
                    setFocusedWarrdcoreModelId(modelId);
                    handleNavigate('ai-commander');
                  }}
                />
              )}

              {section === 'devenvs' && (
                <DevEnvsSection
                  envs={cloud.devEnvs}
                  onCreate={cloud.createDevEnv}
                  onSyncOne={cloud.syncDevEnv}
                  onSyncAll={cloud.syncAllDevEnvs}
                  onDelete={cloud.deleteDevEnv}
                />
              )}

              {section === 'infrastructure' && (
                <InfraSection
                  resources={cloud.infraResources}
                  onCreate={cloud.createInfraResource}
                  onToggle={cloud.toggleInfraResource}
                  onDelete={cloud.deleteInfraResource}
                />
              )}

              {section === 'ai-commander' && (
                <AiCommanderSection
                  getIdToken={cloud.getIdToken}
                  nodes={cloud.nodes}
                  mcpServers={cloud.mcpServers}
                  warrdcoreModels={cloud.warrdcoreModels}
                  devEnvs={cloud.devEnvs}
                  infraResources={cloud.infraResources}
                  aiLogs={cloud.aiLogs}
                  initialWarrdcoreModelId={focusedWarrdcoreModelId}
                  onExecuteMcpTool={cloud.executeMcpToolCall}
                  onRecordAudit={cloud.recordAiAuditLog}
                />
              )}
            </>
          )}
        </main>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <ErrorBoundary>
      <WorkspaceApp />
      <OfflineIndicator />
    </ErrorBoundary>
  );
}

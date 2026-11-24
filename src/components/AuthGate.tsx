import { ShieldCheck, Terminal, Cpu, Globe } from 'lucide-react';
import { PWAInstallButton } from './NativeInstallModal';

interface AuthGateProps {
  onLogin: () => Promise<void>;
  error: string | null;
}

export function AuthGate({ onLogin, error }: AuthGateProps) {
  return (
    <div className="min-h-screen bg-[#09090B] text-zinc-100 flex flex-col">
      {/* 3-Zone Top Bar */}
      <header className="w-full max-w-[1440px] mx-auto px-6 lg:px-10 py-5 flex items-center justify-between gap-8 border-b border-zinc-800/80">
        <span className="font-display text-xl font-bold tracking-wider text-[#D4AF37] whitespace-nowrap shrink-0">
          Montana Cloud
        </span>

        <nav className="hidden md:flex items-center gap-7 text-sm font-medium text-zinc-400">
          <span className="whitespace-nowrap shrink-0">Servidores 24/7</span>
          <span className="whitespace-nowrap shrink-0">Termux &amp; Ubuntu</span>
          <span className="whitespace-nowrap shrink-0">Hub MCP</span>
          <span className="whitespace-nowrap shrink-0">WarrdCore IA</span>
        </nav>

        <button
          type="button"
          onClick={onLogin}
          className="px-4 py-2 text-sm font-semibold bg-[#D4AF37] text-[#09090B] rounded-lg hover:bg-[#E5C158] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
        >
          Entrar al Panel
        </button>
      </header>

      {/* Main Split Hero */}
      <main className="flex-1 w-full max-w-[1440px] mx-auto px-6 lg:px-10 py-12 lg:py-16 grid grid-cols-1 lg:grid-cols-12 gap-10 items-stretch">
        <div className="lg:col-span-6 flex flex-col justify-center space-y-7">
          <div className="space-y-4">
            <p className="text-xs font-medium text-[#D4AF37] tracking-wide">
              Infraestructura Privada · Hetzner &amp; DigitalOcean Grade · Operación 24/7
            </p>
            <h1 className="font-display text-4xl lg:text-5xl font-bold leading-tight text-zinc-50 [text-wrap:balance]">
              El mundo en la nube es tuyo. Control absoluto desde tu consola.
            </h1>
            <p className="text-base text-zinc-400 leading-relaxed max-w-xl">
              Orquesta tus servidores dedicados 24/7, abre tu terminal Ubuntu 24.04 y Termux desde cualquier dispositivo, sincroniza todos tus entornos de desarrollo y despliega modelos propios de WarrdCore conectados por MCP.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 pt-1">
            <button
              type="button"
              onClick={onLogin}
              className="px-6 py-3 text-sm font-semibold bg-[#D4AF37] text-[#09090B] rounded-lg hover:bg-[#E5C158] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              Iniciar sesión con Google
            </button>
            <PWAInstallButton variant="inline" />
          </div>
          <p className="text-xs text-zinc-500">
            Acceso protegido con aislamiento estricto de datos por operador
          </p>

          {error && (
            <p className="text-xs text-red-400 bg-red-950/40 border border-red-900/60 rounded-lg px-4 py-3">
              {error}
            </p>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-5 pt-6 border-t border-zinc-800/80">
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-sm font-semibold text-zinc-100">
                <Terminal className="w-4 h-4 text-[#D4AF37]" />
                <span>Termux + Ubuntu 24.04 Web</span>
              </div>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Sesiones persistentes en la nube con proot-distro, Docker, systemd y copiloto rápido.
              </p>
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-sm font-semibold text-zinc-100">
                <Cpu className="w-4 h-4 text-[#D4AF37]" />
                <span>IA + MCP + WarrdCore 24/7</span>
              </div>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Gemini ejecuta acciones reales vía MCP e importa tus modelos propios de WarrdCore.
              </p>
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-sm font-semibold text-zinc-100">
                <ShieldCheck className="w-4 h-4 text-[#D4AF37]" />
                <span>Firewalls, VPC, Snapshots y OAuth</span>
              </div>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Herramientas completas estilo Hetzner y DigitalOcean listas desde el minuto uno.
              </p>
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2 text-sm font-semibold text-zinc-100">
                <Globe className="w-4 h-4 text-[#D4AF37]" />
                <span>Sincronización Multi-Dispositivo</span>
              </div>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Dotfiles, repositorios, paquetes y variables sincronizados entre móvil, Linux y nube.
              </p>
            </div>
          </div>
        </div>

        {/* Architectural Vault Visual */}
        <div className="lg:col-span-6 relative rounded-xl overflow-hidden border border-zinc-800 bg-[#12141A] min-h-[340px]">
          <img
            src="/src/assets/images/hero_obsidian_datacenter_1795484227124.jpg"
            alt="Bóveda privada de servidores en la nube Montana Cloud"
            referrerPolicy="no-referrer"
            className="w-full h-full object-cover lg:h-full"
          />
          <div className="absolute inset-0 bg-gradient-to-t from-[#09090B]/95 via-[#09090B]/35 to-transparent flex flex-col justify-end p-8">
            <p className="text-xs font-mono text-[#D4AF37] tabular-nums">
              Falkenstein · Helsinki · New York · Mesh WireGuard 10.10.0.0/16
            </p>
            <h2 className="font-display text-2xl font-bold text-zinc-50 mt-1">
              Tu Bóveda de Infraestructura 24/7
            </h2>
            <p className="text-xs text-zinc-300 mt-1 max-w-md">
              Optimizada por ti, controlada por voz de mando IA y lista para correr tus aplicaciones sin descanso.
            </p>
          </div>
        </div>
      </main>
    </div>
  );
}

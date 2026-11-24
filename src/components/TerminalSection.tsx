import React, { useEffect, useRef, useState } from 'react';
import { Terminal as TerminalIcon, Zap, Play, Trash2, Send } from 'lucide-react';
import {
  CloudNode,
  DevEnvironment,
  McpServer,
  WarrdcoreModel,
} from '../types/cloud';

interface TerminalLine {
  id: string;
  kind: 'prompt' | 'output' | 'system' | 'error';
  text: string;
  cwd?: string;
  profile?: 'termux' | 'ubuntu';
}

interface TerminalSectionProps {
  getIdToken: () => Promise<string>;
  nodes: CloudNode[];
  mcpServers: McpServer[];
  warrdcoreModels: WarrdcoreModel[];
  devEnvs: DevEnvironment[];
}

const QUICK_COMMANDS: Array<{ label: string; cmd: string }> = [
  { label: 'proot-distro ubuntu', cmd: 'proot-distro login ubuntu' },
  { label: 'neofetch', cmd: 'neofetch' },
  { label: 'montana nodes', cmd: 'montana nodes' },
  { label: 'mcp list', cmd: 'mcp list' },
  { label: 'warrdcore list', cmd: 'warrdcore list' },
  { label: 'docker ps', cmd: 'docker ps' },
  { label: 'ufw status', cmd: 'ufw status' },
  { label: 'systemctl status', cmd: 'systemctl status' },
  { label: 'ls -la', cmd: 'ls -la' },
  { label: 'help', cmd: 'help' },
];

export function TerminalSection({
  getIdToken,
  nodes,
  mcpServers,
  warrdcoreModels,
  devEnvs,
}: TerminalSectionProps) {
  const [profile, setProfile] = useState<'termux' | 'ubuntu'>('termux');
  const [cwd, setCwd] = useState('/data/data/com.termux/files/home');
  const [input, setInput] = useState('');
  const [history, setHistory] = useState<string[]>([]);
  const [historyIdx, setHistoryIdx] = useState(-1);
  const [running, setRunning] = useState(false);

  const [lines, setLines] = useState<TerminalLine[]>([
    {
      id: 'boot-1',
      kind: 'system',
      text: 'Montana Cloud Shell · Puente seguro Termux Android <-> Ubuntu 24.04 LTS activo.',
    },
    {
      id: 'boot-2',
      kind: 'system',
      text: 'Escribe `proot-distro login ubuntu` para entrar a Ubuntu Linux o `help` para ver comandos.',
    },
  ]);

  // Low-latency Gemini 3.1 Flash Lite terminal copilot
  const [assistPrompt, setAssistPrompt] = useState('');
  const [assistLoading, setAssistLoading] = useState(false);
  const [assistResult, setAssistResult] = useState<{
    suggestion: string;
    command: string;
    modelUsed: string;
  } | null>(null);
  const [assistError, setAssistError] = useState<string | null>(null);

  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [lines]);

  const switchProfileTab = (next: 'termux' | 'ubuntu') => {
    setProfile(next);
    setCwd(next === 'termux' ? '/data/data/com.termux/files/home' : '/root');
    setLines((prev) => [
      ...prev,
      {
        id: `sw-${Date.now()}`,
        kind: 'system',
        text:
          next === 'ubuntu'
            ? 'Sesión enlazada a Ubuntu 24.04 LTS (Hetzner FRA1 · Cloud Root).'
            : 'Sesión enlazada a Termux Mobile Shell (aarch64 · proot-distro listo).',
      },
    ]);
    inputRef.current?.focus();
  };

  const runCommand = async (rawCmd: string) => {
    const command = rawCmd.trim();
    if (!command || running) return;

    setHistory((prev) => [command, ...prev.slice(0, 49)]);
    setHistoryIdx(-1);
    setInput('');

    setLines((prev) => [
      ...prev,
      {
        id: `in-${Date.now()}`,
        kind: 'prompt',
        text: command,
        cwd,
        profile,
      },
    ]);

    setRunning(true);
    try {
      const token = await getIdToken();
      const res = await fetch('/api/terminal/exec', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          command,
          profile,
          infra: {
            nodes: nodes.map((n) => ({
              name: n.name,
              provider: n.provider,
              region: n.region,
              status: n.status,
              ipv4: n.ipv4,
              plan: n.plan,
            })),
            mcpServers: mcpServers.map((s) => ({
              name: s.name,
              enabled: s.enabled,
              transport: s.transport,
              tools: s.tools,
            })),
            warrdcoreModels: warrdcoreModels.map((m) => ({
              name: m.name,
              warrdcoreUri: m.warrdcoreUri,
              status: m.status,
              targetNode: m.targetNode,
              quantization: m.quantization,
            })),
            devEnvs: devEnvs.map((e) => ({
              name: e.name,
              deviceType: e.deviceType,
              syncState: e.syncState,
              dotfilesRevision: e.dotfilesRevision,
            })),
          },
        }),
      });

      const data = (await res.json()) as {
        output?: string;
        cwd?: string;
        exitCode?: number;
        switchProfile?: 'termux' | 'ubuntu';
        clear?: boolean;
        error?: string;
      };

      if (!res.ok) {
        setLines((prev) => [
          ...prev,
          { id: `err-${Date.now()}`, kind: 'error', text: data.error || 'Error ejecutando comando.' },
        ]);
        return;
      }

      if (data.clear) {
        setLines([]);
        return;
      }

      if (data.switchProfile) {
        setProfile(data.switchProfile);
      }
      if (data.cwd) {
        setCwd(data.cwd);
      }

      if (data.output) {
        setLines((prev) => [
          ...prev,
          {
            id: `out-${Date.now()}`,
            kind: data.exitCode === 0 ? 'output' : 'error',
            text: data.output!,
          },
        ]);
      }
    } catch (err: unknown) {
      setLines((prev) => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          kind: 'error',
          text: err instanceof Error ? err.message : 'Fallo de red al contactar la terminal.',
        },
      ]);
    } finally {
      setRunning(false);
      inputRef.current?.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      runCommand(input);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (history.length > 0) {
        const nextIdx = Math.min(historyIdx + 1, history.length - 1);
        setHistoryIdx(nextIdx);
        setInput(history[nextIdx]);
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (historyIdx > 0) {
        const nextIdx = historyIdx - 1;
        setHistoryIdx(nextIdx);
        setInput(history[nextIdx]);
      } else {
        setHistoryIdx(-1);
        setInput('');
      }
    }
  };

  const handleQuickAssist = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!assistPrompt.trim() || assistLoading) return;
    setAssistLoading(true);
    setAssistError(null);
    try {
      const token = await getIdToken();
      const res = await fetch('/api/ai/quick', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ prompt: assistPrompt.trim(), shellEnv: profile }),
      });
      const data = (await res.json()) as {
        suggestion?: string;
        command?: string;
        modelUsed?: string;
        error?: string;
      };
      if (!res.ok) {
        setAssistError(data.error || 'No se pudo consultar el copiloto.');
        return;
      }
      setAssistResult({
        suggestion: data.suggestion || '',
        command: data.command || '',
        modelUsed: data.modelUsed || 'gemini-3.1-flash-lite',
      });
    } catch (err: unknown) {
      setAssistError(err instanceof Error ? err.message : 'Error de red.');
    } finally {
      setAssistLoading(false);
    }
  };

  const promptPrefix =
    profile === 'termux'
      ? `u0_a312@termux:${cwd.replace('/data/data/com.termux/files/home', '~')}$`
      : `root@montana-ubuntu:${cwd.replace('/root', '~')}#`;

  return (
    <div className="space-y-6">
      {/* Environment Switcher + Clear */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-1 p-1 bg-[#12141A] border border-zinc-800 rounded-lg">
          <button
            type="button"
            onClick={() => switchProfileTab('termux')}
            className={`px-3.5 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap cursor-pointer ${
              profile === 'termux'
                ? 'bg-[#D4AF37] text-[#09090B] font-semibold'
                : 'text-zinc-400 hover:text-zinc-100'
            }`}
          >
            Termux Mobile Shell (Android)
          </button>
          <button
            type="button"
            onClick={() => switchProfileTab('ubuntu')}
            className={`px-3.5 py-1.5 text-xs font-medium rounded-md transition-colors whitespace-nowrap cursor-pointer ${
              profile === 'ubuntu'
                ? 'bg-[#D4AF37] text-[#09090B] font-semibold'
                : 'text-zinc-400 hover:text-zinc-100'
            }`}
          >
            Ubuntu 24.04 LTS (Cloud Root)
          </button>
        </div>

        <button
          type="button"
          onClick={() => setLines([])}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-zinc-400 hover:text-zinc-100 border border-zinc-800 rounded-lg transition-colors whitespace-nowrap cursor-pointer"
        >
          <Trash2 className="w-3.5 h-3.5" />
          <span>Limpiar Pantalla</span>
        </button>
      </div>

      {/* Main Terminal Viewport */}
      <div className="bg-[#0B0C0F] border border-zinc-800 rounded-xl overflow-hidden flex flex-col">
        {/* Terminal Header */}
        <div className="px-4 py-2.5 bg-[#12141A] border-b border-zinc-800 flex items-center justify-between text-xs text-zinc-400">
          <div className="flex items-center gap-2 font-mono">
            <TerminalIcon className="w-3.5 h-3.5 text-[#D4AF37]" />
            <span className="text-zinc-200">
              {profile === 'termux' ? 'Termux · proot-distro Bridge' : 'Ubuntu 24.04.2 LTS · montana-fra-core-01'}
            </span>
          </div>
          <span className="font-mono text-zinc-500 truncate max-w-[260px]">{cwd}</span>
        </div>

        {/* Scrollable Output */}
        <div
          ref={scrollRef}
          onClick={() => inputRef.current?.focus()}
          className="p-5 font-mono text-xs sm:text-sm leading-relaxed h-[400px] overflow-y-auto space-y-2 cursor-text"
        >
          {lines.map((line) => {
            if (line.kind === 'prompt') {
              const pfx =
                line.profile === 'termux'
                  ? `u0_a312@termux:${(line.cwd || '~').replace('/data/data/com.termux/files/home', '~')}$`
                  : `root@montana-ubuntu:${(line.cwd || '~').replace('/root', '~')}#`;
              return (
                <div key={line.id} className="flex items-start gap-2">
                  <span className="text-[#D4AF37] shrink-0">{pfx}</span>
                  <span className="text-zinc-100 break-all">{line.text}</span>
                </div>
              );
            }
            if (line.kind === 'system') {
              return (
                <div key={line.id} className="text-zinc-400">
                  {line.text}
                </div>
              );
            }
            if (line.kind === 'error') {
              return (
                <pre key={line.id} className="text-red-400 whitespace-pre-wrap break-words font-mono">
                  {line.text}
                </pre>
              );
            }
            return (
              <pre key={line.id} className="text-zinc-200 whitespace-pre-wrap break-words font-mono">
                {line.text}
              </pre>
            );
          })}

          {/* Active Prompt Input Line */}
          <div className="flex items-center gap-2 pt-1">
            <span className="text-[#D4AF37] shrink-0">{promptPrefix}</span>
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={running}
              autoFocus
              spellCheck={false}
              placeholder={running ? 'Ejecutando...' : 'Escribe un comando Linux o Termux...'}
              className="flex-1 bg-transparent text-zinc-100 placeholder:text-zinc-600 focus:outline-none font-mono"
            />
          </div>
        </div>

        {/* Termux / Mobile Touch Extra-Keys Bar */}
        <div className="px-4 py-2.5 bg-[#12141A] border-t border-zinc-800 flex items-center gap-2 overflow-x-auto">
          {QUICK_COMMANDS.map((item) => (
            <button
              key={item.label}
              type="button"
              onClick={() => runCommand(item.cmd)}
              className="px-2.5 py-1 text-xs font-mono bg-[#181B23] text-zinc-300 border border-zinc-800 rounded hover:border-[#D4AF37] hover:text-[#D4AF37] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              {item.label}
            </button>
          ))}
        </div>
      </div>

      {/* Ultra Low-Latency Terminal Copilot (Gemini 3.1 Flash Lite) */}
      <section className="bg-[#12141A] border border-zinc-800 rounded-xl p-5 space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-[#D4AF37]" />
            <h3 className="text-sm font-semibold text-zinc-100">
              Copiloto Terminal de Baja Latencia
            </h3>
            <span className="text-xs text-zinc-500">· Gemini 3.1 Flash Lite</span>
          </div>
          <span className="text-xs text-zinc-500">
            Genera comandos instantáneos para {profile === 'termux' ? 'Termux Android' : 'Ubuntu 24.04'}
          </span>
        </div>

        <form onSubmit={handleQuickAssist} className="flex flex-col sm:flex-row gap-3">
          <input
            type="text"
            value={assistPrompt}
            onChange={(e) => setAssistPrompt(e.target.value)}
            placeholder="Ej: Instala docker y revisa qué puertos están escuchando en Ubuntu..."
            className="flex-1 px-3.5 py-2 text-sm bg-[#09090B] border border-zinc-800 rounded-lg text-zinc-100 placeholder:text-zinc-500 focus:border-[#D4AF37] focus:outline-none"
          />
          <button
            type="submit"
            disabled={assistLoading}
            className="inline-flex items-center justify-center gap-2 px-4 py-2 text-sm font-semibold bg-[#D4AF37] text-[#09090B] rounded-lg hover:bg-[#E5C158] disabled:opacity-50 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Send className="w-3.5 h-3.5" />
            <span>{assistLoading ? 'Generando...' : 'Sugerir Comando'}</span>
          </button>
        </form>

        {assistError && (
          <p className="text-xs text-red-400">{assistError}</p>
        )}

        {assistResult && (
          <div className="p-4 bg-[#09090B] border border-zinc-800 rounded-lg space-y-3">
            <p className="text-xs text-zinc-300 whitespace-pre-wrap leading-relaxed">
              {assistResult.suggestion}
            </p>
            {assistResult.command && (
              <div className="flex flex-wrap items-center justify-between gap-3 pt-2 border-t border-zinc-800">
                <code className="text-xs font-mono text-[#D4AF37] break-all">
                  {assistResult.command}
                </code>
                <button
                  type="button"
                  onClick={() => runCommand(assistResult.command)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-[#181B23] text-zinc-100 border border-[#D4AF37]/50 rounded-md hover:bg-[#D4AF37] hover:text-[#09090B] transition-colors whitespace-nowrap cursor-pointer"
                >
                  <Play className="w-3 h-3" />
                  <span>Ejecutar en Terminal</span>
                </button>
              </div>
            )}
          </div>
        )}
      </section>
    </div>
  );
}

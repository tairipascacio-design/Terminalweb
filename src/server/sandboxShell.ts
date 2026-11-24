/**
 * Sandboxed stateful Termux & Ubuntu 24.04 LTS terminal interpreter.
 * Zero OS shell execution (no exec/spawn) — 100% immune to command injection
 * while delivering a rich, persistent multi-environment Linux & Termux workflow
 * tightly wired to the user's live Montana Cloud infrastructure.
 */

export type TerminalProfile = 'termux' | 'ubuntu';

interface VirtualFs {
  [path: string]: string;
}

interface UserShellState {
  cwd: string;
  profile: TerminalProfile;
  installedPackages: Set<string>;
  files: VirtualFs;
  envVars: Record<string, string>;
}

const userSessions = new Map<string, UserShellState>();

function createInitialState(profile: TerminalProfile): UserShellState {
  const home = profile === 'termux' ? '/data/data/com.termux/files/home' : '/root';
  return {
    cwd: home,
    profile,
    installedPackages: new Set([
      'openssh',
      'git',
      'tmux',
      'neovim',
      'nodejs',
      'python3',
      'docker-ce',
      'proot-distro',
      'warrdcore-cli',
      'mcp-bridge',
      'wireguard-tools',
      'htop',
      'curl',
    ]),
    files: {
      [`${home}/README.md`]:
        '# Montana Cloud Workspace\nEntorno sincronizado 24/7 entre Termux Android y Ubuntu 24.04 LTS.\nUsa `montana nodes`, `mcp list`, `warrdcore list` o `proot-distro login ubuntu`.',
      [`${home}/.bashrc`]:
        'export MONTANA_ENV="production-247"\nexport WARRDCORE_HOST="10.10.0.14:11434"\nexport MCP_GATEWAY="https://mcp.montana.internal/sse"\nalias ll="ls -la"',
      [`${home}/docker-compose.yml`]:
        'services:\n  warrdcore-engine:\n    image: warrdcore/runtime:247-cuda\n    restart: always\n    ports:\n      - "11434:11434"\n  mcp-gateway:\n    image: montana/mcp-bridge:latest\n    restart: always\n    ports:\n      - "8765:8765"',
      [`${home}/deploy.sh`]:
        '#!/usr/bin/env bash\nset -e\necho "Sincronizando repositorios y reiniciando daemons 24/7..."\ndocker compose up -d',
    },
    envVars: {
      USER: profile === 'termux' ? 'u0_a312' : 'root',
      HOME: home,
      SHELL: profile === 'termux' ? '/data/data/com.termux/files/usr/bin/zsh' : '/bin/bash',
      MONTANA_CLOUD_SYNC: 'ACTIVE',
      WARRDCORE_DAEMON: '24/7-ENABLED',
    },
  };
}

function getSession(uid: string, profile: TerminalProfile): UserShellState {
  const key = `${uid}:${profile}`;
  let state = userSessions.get(key);
  if (!state) {
    state = createInitialState(profile);
    userSessions.set(key, state);
  }
  return state;
}

function normalizePath(cwd: string, target: string, home: string): string {
  if (!target || target === '~') return home;
  let resolved = target.startsWith('~/')
    ? `${home}/${target.slice(2)}`
    : target.startsWith('/')
      ? target
      : `${cwd}/${target}`;

  const parts = resolved.split('/').filter(Boolean);
  const stack: string[] = [];
  for (const part of parts) {
    if (part === '.') continue;
    if (part === '..') {
      stack.pop();
    } else {
      stack.push(part);
    }
  }
  return '/' + stack.join('/');
}

export interface LiveInfraSnapshot {
  nodes?: Array<{ name: string; provider: string; region: string; status: string; ipv4: string; plan: string }>;
  mcpServers?: Array<{ name: string; enabled: boolean; transport: string; tools: string[] }>;
  warrdcoreModels?: Array<{ name: string; warrdcoreUri: string; status: string; targetNode: string; quantization: string }>;
  devEnvs?: Array<{ name: string; deviceType: string; syncState: string; dotfilesRevision: string }>;
}

export interface TerminalExecResult {
  output: string;
  cwd: string;
  profile: TerminalProfile;
  exitCode: number;
  switchProfile?: TerminalProfile;
  clear?: boolean;
}

export function executeSandboxedCommand(
  uid: string,
  profile: TerminalProfile,
  rawCommand: string,
  infra: LiveInfraSnapshot = {}
): TerminalExecResult {
  const session = getSession(uid, profile);
  const home = session.envVars.HOME;
  const trimmed = rawCommand.trim();

  if (!trimmed) {
    return { output: '', cwd: session.cwd, profile, exitCode: 0 };
  }

  const tokens = trimmed.match(/(?:[^\s"']+|"[^"]*"|'[^']*')+/g) || [];
  const cmd = tokens[0]?.toLowerCase() || '';
  const args = tokens.slice(1).map((a) => a.replace(/^['"]|['"]$/g, ''));

  switch (cmd) {
    case 'clear':
      return { output: '', cwd: session.cwd, profile, exitCode: 0, clear: true };

    case 'help':
      return {
        output: [
          'Montana Cloud Shell — Comandos disponibles:',
          '  Sistema:    uname -a | neofetch | free -h | df -h | ps aux | ss -tulpn | uptime',
          '  Archivos:   ls | pwd | cd <dir> | cat <archivo> | touch <archivo> | write <archivo> <texto> | rm <archivo>',
          '  Termux:     termux-info | termux-setup-storage | pkg list | pkg install <paquete> | proot-distro login ubuntu',
          '  Ubuntu:     apt update | apt install <paquete> | ufw status | systemctl status | docker ps | docker compose up -d',
          '  Nube & IA:  montana nodes | montana sync | mcp list | warrdcore list | warrdcore status | git status',
          '  Utilidad:   env | echo <texto> | clear | exit',
        ].join('\n'),
        cwd: session.cwd,
        profile,
        exitCode: 0,
      };

    case 'pwd':
      return { output: session.cwd, cwd: session.cwd, profile, exitCode: 0 };

    case 'whoami':
      return {
        output: profile === 'termux' ? 'u0_a312 (Termux Android Mobile Node)' : 'root (Montana Ubuntu 24.04 LTS)',
        cwd: session.cwd,
        profile,
        exitCode: 0,
      };

    case 'uname':
      return {
        output:
          profile === 'termux'
            ? 'Linux localhost 6.6.30-android15-montana aarch64 Android Termux'
            : 'Linux montana-fra1 6.8.0-49-generic #49-Ubuntu SMP PREEMPT_DYNAMIC x86_64 GNU/Linux',
        cwd: session.cwd,
        profile,
        exitCode: 0,
      };

    case 'uptime':
      return {
        output: ' 17:42:08 up 48 days, 14:22,  2 users,  load average: 0.24, 0.31, 0.28 (24/7 Watchdog OK)',
        cwd: session.cwd,
        profile,
        exitCode: 0,
      };

    case 'neofetch':
      return {
        output: [
          `         ___          ${session.envVars.USER}@${profile === 'termux' ? 'termux-mobile' : 'montana-ubuntu-fra1'}`,
          `       /     \\        ------------------------------------------`,
          `      |  M C  |       OS: ${profile === 'termux' ? 'Android 15 + Termux + proot-distro Ubuntu 24.04' : 'Ubuntu 24.04.2 LTS x86_64 (Hetzner Bare-Metal)'}`,
          `       \\ ___ /        Kernel: ${profile === 'termux' ? '6.6.30-aarch64' : '6.8.0-49-generic'}`,
          `      =========       Uptime: 48d 14h (24/7 SLA Active)`,
          `                      Shell: ${session.envVars.SHELL}`,
          `                      Nodes: ${(infra.nodes || []).length} activos · MCP: ${(infra.mcpServers || []).filter((m) => m.enabled).length} online`,
          `                      WarrdCore: ${(infra.warrdcoreModels || []).length} modelos en registro`,
          `                      Memory: 4.8 GiB / 32.0 GiB (NVMe RAID-10)`,
        ].join('\n'),
        cwd: session.cwd,
        profile,
        exitCode: 0,
      };

    case 'free':
      return {
        output: [
          '               total        used        free      shared  buff/cache   available',
          'Mem:            31Gi       4.8Gi        22Gi       142Mi       4.4Gi        26Gi',
          'Swap:          8.0Gi          0B       8.0Gi',
        ].join('\n'),
        cwd: session.cwd,
        profile,
        exitCode: 0,
      };

    case 'df':
      return {
        output: [
          'Filesystem      Size  Used Avail Use% Mounted on',
          '/dev/nvme0n1p1  320G   48G  259G  16% /',
          '/dev/sdb        500G  112G  388G  23% /mnt/warrdcore-weights',
          'montana-sync    1.0T   19G  981G   2% /mnt/cloud-dotfiles',
        ].join('\n'),
        cwd: session.cwd,
        profile,
        exitCode: 0,
      };

    case 'ls': {
      const prefix = session.cwd.endsWith('/') ? session.cwd : `${session.cwd}/`;
      const entries = Object.keys(session.files)
        .filter((f) => f.startsWith(prefix))
        .map((f) => f.slice(prefix.length).split('/')[0]);
      const unique = Array.from(new Set(entries)).sort();
      if (args.includes('-la') || args.includes('-l')) {
        const lines = unique.map((name) => {
          const full = `${prefix}${name}`;
          const size = session.files[full]?.length ?? 4096;
          return `-rw-r--r-- 1 ${session.envVars.USER} staff ${String(size).padStart(6, ' ')} Nov 23 17:40 ${name}`;
        });
        return { output: lines.join('\n') || '(directorio vacío)', cwd: session.cwd, profile, exitCode: 0 };
      }
      return { output: unique.join('   ') || '(directorio vacío)', cwd: session.cwd, profile, exitCode: 0 };
    }

    case 'cd': {
      const next = normalizePath(session.cwd, args[0] || '~', home);
      session.cwd = next;
      return { output: '', cwd: session.cwd, profile, exitCode: 0 };
    }

    case 'cat': {
      if (!args[0]) {
        return { output: 'cat: falta el nombre del archivo', cwd: session.cwd, profile, exitCode: 1 };
      }
      const target = normalizePath(session.cwd, args[0], home);
      const content = session.files[target];
      if (content === undefined) {
        return { output: `cat: ${args[0]}: No existe el archivo o directorio`, cwd: session.cwd, profile, exitCode: 1 };
      }
      return { output: content, cwd: session.cwd, profile, exitCode: 0 };
    }

    case 'touch': {
      if (!args[0]) return { output: 'touch: especifica un archivo', cwd: session.cwd, profile, exitCode: 1 };
      const target = normalizePath(session.cwd, args[0], home);
      if (session.files[target] === undefined) session.files[target] = '';
      return { output: `Archivo creado: ${target}`, cwd: session.cwd, profile, exitCode: 0 };
    }

    case 'write': {
      if (args.length < 2) {
        return { output: 'Uso: write <archivo> <contenido>', cwd: session.cwd, profile, exitCode: 1 };
      }
      const target = normalizePath(session.cwd, args[0], home);
      session.files[target] = args.slice(1).join(' ');
      return { output: `Escrito correctamente en ${target} (${session.files[target].length} bytes)`, cwd: session.cwd, profile, exitCode: 0 };
    }

    case 'rm': {
      if (!args[0]) return { output: 'rm: especifica un archivo', cwd: session.cwd, profile, exitCode: 1 };
      const target = normalizePath(session.cwd, args[0], home);
      if (session.files[target] === undefined) {
        return { output: `rm: no se puede borrar '${args[0]}': No existe`, cwd: session.cwd, profile, exitCode: 1 };
      }
      delete session.files[target];
      return { output: `Eliminado: ${args[0]}`, cwd: session.cwd, profile, exitCode: 0 };
    }

    case 'echo':
      return { output: args.join(' '), cwd: session.cwd, profile, exitCode: 0 };

    case 'env':
      return {
        output: Object.entries(session.envVars)
          .map(([k, v]) => `${k}=${v}`)
          .join('\n'),
        cwd: session.cwd,
        profile,
        exitCode: 0,
      };

    case 'proot-distro': {
      if (args[0] === 'login' && args[1]?.includes('ubuntu')) {
        return {
          output:
            'Iniciando contenedor Ubuntu 24.04 LTS desde Termux via proot-distro...\nMontando /mnt/cloud-dotfiles y puente SSH seguro.\nSesión cambiada a Ubuntu 24.04 LTS.',
          cwd: '/root',
          profile: 'ubuntu',
          switchProfile: 'ubuntu',
          exitCode: 0,
        };
      }
      if (args[0] === 'list') {
        return {
          output: [
            'Distribuciones soportadas en Termux proot-distro:',
            '  * ubuntu (24.04 LTS Noble)   [INSTALADA · Cloud Sync OK]',
            '  * debian (12 Bookworm)       [disponible]',
            '  * alpine (3.20)              [disponible]',
            'Ejecuta `proot-distro login ubuntu` para entrar a Ubuntu.',
          ].join('\n'),
          cwd: session.cwd,
          profile,
          exitCode: 0,
        };
      }
      return {
        output: 'Uso: proot-distro list | proot-distro login ubuntu',
        cwd: session.cwd,
        profile,
        exitCode: 0,
      };
    }

    case 'exit':
      if (profile === 'ubuntu') {
        return {
          output: 'Cerrando sesión Ubuntu 24.04 LTS... regresando a Termux shell.',
          cwd: '/data/data/com.termux/files/home',
          profile: 'termux',
          switchProfile: 'termux',
          exitCode: 0,
        };
      }
      return { output: 'Sesión Termux principal activa (24/7 persistente).', cwd: session.cwd, profile, exitCode: 0 };

    case 'termux-info':
      return {
        output: [
          'Termux Cloud Bridge: v0.119.0-montana',
          'Device Arch: aarch64 · proot-distro: Ubuntu 24.04 LTS ready',
          'SSH Tunnel: WireGuard Mesh 10.10.0.42 <-> Hetzner FRA1',
          'Storage: ~/storage/shared montado · Cloud Dotfiles Sync: ACTIVO',
        ].join('\n'),
        cwd: session.cwd,
        profile,
        exitCode: 0,
      };

    case 'termux-setup-storage':
      return {
        output: 'Enlace simbólico ~/storage configurado y sincronizado con el volumen cifrado en la nube.',
        cwd: session.cwd,
        profile,
        exitCode: 0,
      };

    case 'pkg':
    case 'apt':
    case 'apt-get': {
      const sub = args[0];
      if (sub === 'update' || sub === 'upgrade') {
        return {
          output: `${cmd}: repositorios sincronizados (Ubuntu Noble / Termux Main). Todos los paquetes al día.`,
          cwd: session.cwd,
          profile,
          exitCode: 0,
        };
      }
      if (sub === 'install' && args[1]) {
        const pkgName = args[1].replace(/[^a-zA-Z0-9._-]/g, '');
        session.installedPackages.add(pkgName);
        return {
          output: `Descargando e instalando ${pkgName}...\nConfigurando ${pkgName} en el entorno persistente.\nListo. Paquetes activos: ${session.installedPackages.size}.`,
          cwd: session.cwd,
          profile,
          exitCode: 0,
        };
      }
      if (sub === 'list') {
        return {
          output: `Paquetes instalados (${session.installedPackages.size}):\n  ${Array.from(session.installedPackages).join(', ')}`,
          cwd: session.cwd,
          profile,
          exitCode: 0,
        };
      }
      return { output: `Uso: ${cmd} update | ${cmd} install <paquete> | ${cmd} list`, cwd: session.cwd, profile, exitCode: 0 };
    }

    case 'docker': {
      if (args[0] === 'ps') {
        return {
          output: [
            'CONTAINER ID   IMAGE                        STATUS          PORTS                      NAMES',
            'a9f31c02b8e1   warrdcore/runtime:247-cuda   Up 19 days      0.0.0.0:11434->11434/tcp   warrdcore-247',
            'd4e881a03b92   montana/mcp-bridge:latest    Up 19 days      0.0.0.0:8765->8765/tcp     mcp-gateway',
            '7b2019ef44c0   caddy:2.8-alpine             Up 48 days      80/tcp, 443/tcp            edge-tls-proxy',
          ].join('\n'),
          cwd: session.cwd,
          profile,
          exitCode: 0,
        };
      }
      if (args[0] === 'compose') {
        return {
          output: 'Container warrdcore-247  Running\nContainer mcp-gateway    Running\nStack 24/7 operativo sin errores.',
          cwd: session.cwd,
          profile,
          exitCode: 0,
        };
      }
      return { output: 'Docker Engine 27.3.1 activo. Usa `docker ps` o `docker compose up -d`.', cwd: session.cwd, profile, exitCode: 0 };
    }

    case 'systemctl':
      return {
        output: [
          '● warrdcore-serve.service - WarrdCore 24/7 AI Inference Daemon',
          '     Loaded: loaded (/etc/systemd/system/warrdcore-serve.service; enabled)',
          '     Active: active (running) since 48 days ago · Watchdog: 24/7',
          '● mcp-orchestrator.service - Montana MCP Gateway',
          '     Active: active (running) · Listening on :8765 (TLS 1.3)',
        ].join('\n'),
        cwd: session.cwd,
        profile,
        exitCode: 0,
      };

    case 'ufw':
      return {
        output: [
          'Status: active (Cloud Firewall + UFW Synced)',
          'To                         Action      From',
          '22/tcp (SSH Key-Only)      ALLOW IN    Anywhere',
          '443/tcp (HTTPS Edge)       ALLOW IN    Anywhere',
          '8765/tcp (MCP Gateway)     ALLOW IN    10.10.0.0/16 (VPC Mesh)',
          '11434/tcp (WarrdCore 24/7) ALLOW IN    10.10.0.0/16 (VPC Mesh)',
        ].join('\n'),
        cwd: session.cwd,
        profile,
        exitCode: 0,
      };

    case 'ps':
    case 'htop':
    case 'top':
      return {
        output: [
          'PID   USER   %CPU  %MEM  COMMAND',
          '1042  root    6.4  18.2  /usr/local/bin/warrdcore-server --247 --port 11434',
          '1198  root    1.8   3.4  node /opt/montana/mcp-gateway.js --transport sse',
          '1420  root    0.6   1.2  /usr/bin/dockerd -H fd://',
          '1804  root    0.2   0.4  sshd: executive-tunnel [priv]',
        ].join('\n'),
        cwd: session.cwd,
        profile,
        exitCode: 0,
      };

    case 'ss':
      return {
        output: [
          'Netid  State   Local Address:Port   Process',
          'tcp    LISTEN  0.0.0.0:22           sshd',
          'tcp    LISTEN  0.0.0.0:443          caddy',
          'tcp    LISTEN  10.10.0.10:8765      mcp-gateway',
          'tcp    LISTEN  10.10.0.14:11434     warrdcore-server',
        ].join('\n'),
        cwd: session.cwd,
        profile,
        exitCode: 0,
      };

    case 'git':
      return {
        output: [
          'On branch main',
          'Your branch is up to date with "origin/main" (Cloud Sync Hook activo).',
          'nothing to commit, working tree clean',
        ].join('\n'),
        cwd: session.cwd,
        profile,
        exitCode: 0,
      };

    case 'montana': {
      const sub = args[0];
      if (sub === 'nodes') {
        const nodes = infra.nodes || [];
        if (nodes.length === 0) {
          return { output: 'No hay nodos aprovisionados todavía.', cwd: session.cwd, profile, exitCode: 0 };
        }
        const header = 'NAME                      PROVIDER         REGION   STATUS     IPV4';
        const rows = nodes.map(
          (n) =>
            `${n.name.padEnd(25)} ${n.provider.padEnd(16)} ${n.region.padEnd(8)} ${n.status.padEnd(10)} ${n.ipv4}`
        );
        return { output: [header, '-'.repeat(78), ...rows].join('\n'), cwd: session.cwd, profile, exitCode: 0 };
      }
      if (sub === 'sync') {
        const envs = infra.devEnvs || [];
        return {
          output: `Sincronización en la nube completada across ${envs.length || 1} entornos (dotfiles + env vault + paquetes).`,
          cwd: session.cwd,
          profile,
          exitCode: 0,
        };
      }
      return {
        output: 'Montana CLI v2.4 — Usa `montana nodes` o `montana sync`.',
        cwd: session.cwd,
        profile,
        exitCode: 0,
      };
    }

    case 'mcp': {
      const servers = infra.mcpServers || [];
      if (args[0] === 'list' || !args[0]) {
        if (servers.length === 0) {
          return { output: 'Sin servidores MCP registrados.', cwd: session.cwd, profile, exitCode: 0 };
        }
        const lines = servers.map(
          (s) =>
            `[${s.enabled ? 'ONLINE' : 'PAUSED'}] ${s.name.padEnd(22)} (${s.transport}) · ${s.tools.length} tools`
        );
        return { output: lines.join('\n'), cwd: session.cwd, profile, exitCode: 0 };
      }
      if (args[0] === 'ping') {
        return { output: 'JSON-RPC 2.0 pong recibido desde MCP Gateway en 14ms.', cwd: session.cwd, profile, exitCode: 0 };
      }
      return { output: 'Uso: mcp list | mcp ping', cwd: session.cwd, profile, exitCode: 0 };
    }

    case 'warrdcore': {
      const models = infra.warrdcoreModels || [];
      if (args[0] === 'list' || args[0] === 'status' || !args[0]) {
        if (models.length === 0) {
          return { output: 'No hay modelos WarrdCore importados todavía.', cwd: session.cwd, profile, exitCode: 0 };
        }
        const lines = models.map(
          (m) =>
            `[${m.status.toUpperCase()}] ${m.name.padEnd(24)} ${m.quantization.padEnd(8)} -> ${m.targetNode} (${m.warrdcoreUri})`
        );
        return { output: lines.join('\n'), cwd: session.cwd, profile, exitCode: 0 };
      }
      if (args[0] === 'pull' && args[1]) {
        return {
          output: `Verificando manifiesto ${args[1]} en WarrdCore Registry...\nPesos verificados (SHA-256 OK). Regístralo en la pestaña Modelos WarrdCore para dejarlo 24/7.`,
          cwd: session.cwd,
          profile,
          exitCode: 0,
        };
      }
      return { output: 'Uso: warrdcore list | warrdcore status | warrdcore pull <uri>', cwd: session.cwd, profile, exitCode: 0 };
    }

    default:
      return {
        output: `${profile}: comando no reconocido '${cmd}'. Escribe 'help' para ver comandos de Ubuntu, Termux, MCP y WarrdCore.`,
        cwd: session.cwd,
        profile,
        exitCode: 127,
      };
  }
}

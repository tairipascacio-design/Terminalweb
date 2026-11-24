import {
  FunctionDeclaration,
  GoogleGenAI,
  ThinkingLevel,
  Type,
} from '@google/genai';

function getGeminiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY no está configurada en el servidor.');
  }
  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

export const MCP_FUNCTION_DECLARATIONS: FunctionDeclaration[] = [
  {
    name: 'mcp_provision_node',
    description:
      'Crea y despliega un nuevo servidor en la nube 24/7 estilo Hetzner, DigitalOcean o WarrdCore Bare-Metal.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        name: { type: Type.STRING, description: 'Nombre del servidor, ej. fra-warrdcore-02' },
        provider: {
          type: Type.STRING,
          description: 'Proveedor: hetzner, digitalocean o warrdcore-cloud',
        },
        plan: { type: Type.STRING, description: 'Plan de instancia, ej. CPX41, s-4vcpu-8gb, WC-A100' },
        region: { type: Type.STRING, description: 'Región datacenter, ej. fsn1, hel1, nyc3, sfo3' },
        osImage: { type: Type.STRING, description: 'Imagen Linux, ej. Ubuntu 24.04 LTS' },
        vcpu: { type: Type.NUMBER, description: 'Cantidad de vCPUs (1 a 128)' },
        ramGb: { type: Type.NUMBER, description: 'Memoria RAM en GB (1 a 512)' },
        diskGb: { type: Type.NUMBER, description: 'Disco NVMe en GB (20 a 4096)' },
        workload: { type: Type.STRING, description: 'Carga de trabajo 24/7 asignada' },
      },
      required: ['name', 'provider', 'region', 'workload'],
    },
  },
  {
    name: 'mcp_power_node',
    description:
      'Controla el estado de energía (running, stopped, rebooting) o modo 24/7 de un servidor existente.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        nodeName: { type: Type.STRING, description: 'Nombre exacto o parcial del servidor' },
        status: { type: Type.STRING, description: 'Nuevo estado: running, stopped o rebooting' },
        uptime247: { type: Type.BOOLEAN, description: 'Activar o desactivar watchdog 24/7' },
      },
      required: ['nodeName', 'status'],
    },
  },
  {
    name: 'mcp_manage_infra_resource',
    description:
      'Crea una regla de Firewall, Floating IP, VPC privada, Snapshot, Volumen NVMe, Conector OAuth, llave SSH o Daemon 24/7.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        kind: {
          type: Type.STRING,
          description:
            'Tipo: firewall, floating-ip, vpc, snapshot, volume, oauth-connector, ssh-key o daemon-247',
        },
        name: { type: Type.STRING, description: 'Nombre del recurso de infraestructura' },
        provider: {
          type: Type.STRING,
          description: 'Proveedor: hetzner, digitalocean, cloudflare, github, tailscale, warrdcore o montana-mesh',
        },
        target: { type: Type.STRING, description: 'Nodo o red destino' },
        spec: { type: Type.STRING, description: 'Regla o especificación técnica (ej. ALLOW TCP 11434)' },
      },
      required: ['kind', 'name', 'provider', 'target', 'spec'],
    },
  },
  {
    name: 'mcp_run_ubuntu_termux',
    description:
      'Ejecuta un comando en la terminal web Ubuntu 24.04 LTS o Termux Android vinculada en la nube.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        environment: { type: Type.STRING, description: 'Entorno: ubuntu o termux' },
        command: { type: Type.STRING, description: 'Comando Linux/Termux a ejecutar' },
      },
      required: ['environment', 'command'],
    },
  },
  {
    name: 'mcp_sync_dev_env',
    description:
      'Sincroniza los entornos de desarrollo (Termux Android, Ubuntu Linux, dotfiles, paquetes) a través de la nube.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        envName: {
          type: Type.STRING,
          description: 'Nombre del entorno a sincronizar o "all" para sincronizar todos',
        },
      },
      required: ['envName'],
    },
  },
  {
    name: 'mcp_import_warrdcore_model',
    description:
      'Importa y registra un modelo propio de IA desde WarrdCore para correr 24/7 en un nodo dedicado.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        name: { type: Type.STRING, description: 'Nombre del modelo personalizado' },
        warrdcoreUri: { type: Type.STRING, description: 'URI WarrdCore, ej. warrdcore://vault/montana-70b:q4' },
        architecture: { type: Type.STRING, description: 'Arquitectura, ej. Llama-3.3-70B, Qwen-2.5-Coder, Mistral-Large' },
        quantization: { type: Type.STRING, description: 'Q4_K_M, Q6_K, Q8_0, FP16, BF16 o GGUF-Custom' },
        targetNode: { type: Type.STRING, description: 'Nodo servidor donde correrá 24/7' },
        systemPrompt: { type: Type.STRING, description: 'Instrucción de sistema del modelo importado' },
      },
      required: ['name', 'warrdcoreUri', 'targetNode'],
    },
  },
  {
    name: 'mcp_toggle_server',
    description: 'Activa o desactiva un servidor MCP registrado o crea uno nuevo.',
    parameters: {
      type: Type.OBJECT,
      properties: {
        serverName: { type: Type.STRING, description: 'Nombre del servidor MCP' },
        enabled: { type: Type.BOOLEAN, description: 'true para activar, false para pausar' },
      },
      required: ['serverName', 'enabled'],
    },
  },
];

export interface CloudContextSummary {
  nodes: Array<{ name: string; provider: string; region: string; status: string; plan: string; ipv4: string }>;
  mcpServers: Array<{ name: string; enabled: boolean; tools: string[] }>;
  warrdcoreModels: Array<{ name: string; warrdcoreUri: string; status: string; targetNode: string }>;
  devEnvs: Array<{ name: string; deviceType: string; syncState: string }>;
  infraResources: Array<{ name: string; kind: string; spec: string; enabled: boolean }>;
}

export interface CommandRequest {
  prompt: string;
  modelMode: 'hydrogen-deep' | 'hydrogen-search' | 'flash-lite' | 'warrdcore-custom';
  highThinking?: boolean;
  useWebSearch?: boolean;
  enableMcpTools?: boolean;
  warrdcoreModel?: {
    name: string;
    warrdcoreUri: string;
    endpointUrl: string;
    architecture: string;
    systemPrompt: string;
  };
  context: CloudContextSummary;
}

export interface ExecutedToolIntent {
  id: string;
  name: string;
  args: Record<string, unknown>;
}

export interface CommandResult {
  text: string;
  modelUsed: string;
  thinkingUsed: boolean;
  toolCalls: ExecutedToolIntent[];
  groundingSources: Array<{ title: string; uri: string }>;
}

function isSafeExternalHttpsUrl(rawUrl: string): boolean {
  try {
    const parsed = new URL(rawUrl);
    if (parsed.protocol !== 'https:') return false;
    const host = parsed.hostname.toLowerCase();
    if (
      host === 'localhost' ||
      host === '::1' ||
      host.endsWith('.local') ||
      host.endsWith('.internal') ||
      host.startsWith('127.') ||
      host.startsWith('10.') ||
      host.startsWith('192.168.') ||
      host.startsWith('169.254.') ||
      /^172\.(1[6-9]|2\d|3[0-1])\./.test(host)
    ) {
      return false;
    }
    return true;
  } catch {
    return false;
  }
}

export async function runAiCommand(req: CommandRequest): Promise<CommandResult> {
  // If user selected an imported WarrdCore model with a verified public HTTPS OpenAI-compatible endpoint
  if (
    req.modelMode === 'warrdcore-custom' &&
    req.warrdcoreModel?.endpointUrl &&
    isSafeExternalHttpsUrl(req.warrdcoreModel.endpointUrl)
  ) {
    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 12000);
      const res = await fetch(req.warrdcoreModel.endpointUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        signal: controller.signal,
        body: JSON.stringify({
          model: req.warrdcoreModel.warrdcoreUri,
          messages: [
            {
              role: 'system',
              content:
                req.warrdcoreModel.systemPrompt ||
                'Eres un modelo propio de WarrdCore corriendo 24/7 en Montana Cloud.',
            },
            { role: 'user', content: req.prompt },
          ],
        }),
      });
      clearTimeout(timeout);
      if (res.ok) {
        const json = (await res.json()) as {
          choices?: Array<{ message?: { content?: string } }>;
          response?: string;
        };
        const content =
          json.choices?.[0]?.message?.content ||
          json.response ||
          'Respuesta recibida del endpoint WarrdCore.';
        return {
          text: content,
          modelUsed: `WarrdCore · ${req.warrdcoreModel.name}`,
          thinkingUsed: false,
          toolCalls: [],
          groundingSources: [],
        };
      }
    } catch {
      // Fallback transparently to Gemini orchestrator bound with the WarrdCore model profile & MCP tools
    }
  }

  const ai = getGeminiClient();

  const isFlashLite = req.modelMode === 'flash-lite';
  const model = isFlashLite ? 'gemini-3.1-flash-lite' : 'gemini-4-hydrogen';
  const useSearch = !isFlashLite && (req.modelMode === 'hydrogen-search' || Boolean(req.useWebSearch));
  const useMcp = !isFlashLite && req.enableMcpTools !== false;
  const useHighThinking = !isFlashLite && Boolean(req.highThinking);

  const warrdcoreFlavor =
    req.modelMode === 'warrdcore-custom' && req.warrdcoreModel
      ? `Operas como el perfil de modelo WarrdCore "${req.warrdcoreModel.name}" (${req.warrdcoreModel.warrdcoreUri}, arquitectura ${req.warrdcoreModel.architecture}). Instrucción del modelo: ${req.warrdcoreModel.systemPrompt || 'Máxima precisión en infraestructura y desarrollo.'}`
      : '';

  const systemInstruction = [
    'Eres el Consigliere de Infraestructura de Montana Cloud — una plataforma ejecutiva de servidores 24/7 estilo Hetzner y DigitalOcean con terminal Ubuntu/Termux, MCP y modelos WarrdCore.',
    'Responde siempre en español con seguridad ejecutiva, precisión técnica de ingeniero senior y un toque sutil de jerga/actitud al estilo Tony Montana (elegante, directo, "el mundo es tuyo", sin perder jamás rigor técnico).',
    warrdcoreFlavor,
    'Cuando el usuario pida crear servidores, encender/apagar nodos, configurar firewalls/VPC/OAuth/daemons, ejecutar comandos en Ubuntu/Termux, sincronizar entornos de desarrollo, activar servidores MCP o importar modelos de WarrdCore, INVOCA las herramientas MCP correspondientes en lugar de solo describirlas.',
    'Estado actual de la infraestructura del operador:',
    JSON.stringify(req.context),
  ]
    .filter(Boolean)
    .join('\n\n');

  const tools: Array<Record<string, unknown>> = [];
  if (useSearch) {
    tools.push({ googleSearch: {} });
  }
  if (useMcp) {
    tools.push({ functionDeclarations: MCP_FUNCTION_DECLARATIONS });
  }

  const config: Record<string, unknown> = {
    systemInstruction,
  };

  if (tools.length > 0) {
    config.tools = tools;
  }

  if (useSearch && useMcp) {
    config.toolConfig = { includeServerSideToolInvocations: true };
  }

  if (useHighThinking) {
    config.thinkingConfig = { thinkingLevel: ThinkingLevel.HIGH };
  } else if (isFlashLite) {
    config.thinkingConfig = { thinkingLevel: ThinkingLevel.MINIMAL };
  }

  const response = await ai.models.generateContent({
    model,
    contents: req.prompt,
    config,
  });

  const functionCalls = response.functionCalls || [];
  const toolCalls: ExecutedToolIntent[] = functionCalls.map((fc, idx) => ({
    id: fc.id || `mcp-${Date.now()}-${idx}`,
    name: fc.name || 'unknown_tool',
    args: (fc.args as Record<string, unknown>) || {},
  }));

  const rawChunks =
    (
      response.candidates?.[0]?.groundingMetadata as
        | { groundingChunks?: Array<{ web?: { uri?: string; title?: string } }> }
        | undefined
    )?.groundingChunks || [];

  const groundingSources = rawChunks
    .filter((c) => c.web?.uri)
    .map((c) => ({
      uri: c.web!.uri!,
      title: c.web!.title || c.web!.uri!,
    }))
    .slice(0, 6);

  let text = response.text?.trim() || '';
  if (!text && toolCalls.length > 0) {
    const names = toolCalls.map((t) => t.name).join(', ');
    text = `Órdenes despachadas vía MCP (${names}). Tu infraestructura en Montana Cloud acaba de ejecutar el movimiento, chico.`;
  }

  const modelLabel =
    req.modelMode === 'warrdcore-custom' && req.warrdcoreModel
      ? `WarrdCore · ${req.warrdcoreModel.name} (MCP Orchestrated)`
      : isFlashLite
        ? 'gemini-3.1-flash-lite (Baja Latencia)'
        : useHighThinking
          ? 'gemini-4-hydrogen (Pensamiento Profundo)'
          : useSearch
            ? 'gemini-4-hydrogen (Google Search Grounding)'
            : 'gemini-4-hydrogen (MCP Commander)';

  return {
    text,
    modelUsed: modelLabel,
    thinkingUsed: useHighThinking,
    toolCalls,
    groundingSources,
  };
}

export async function runQuickTerminalAssist(
  prompt: string,
  shellEnv: 'termux' | 'ubuntu'
): Promise<{ suggestion: string; command: string; modelUsed: string }> {
  const ai = getGeminiClient();
  const response = await ai.models.generateContent({
    model: 'gemini-3.1-flash-lite',
    contents: `Entorno: ${shellEnv === 'termux' ? 'Termux Android (proot-distro Ubuntu)' : 'Ubuntu 24.04 LTS Cloud Server'}.\nSolicitud del operador: ${prompt}\nDevuelve primero una explicación de 1 línea en español directo y luego el comando exacto entre backticks.`,
    config: {
      systemInstruction:
        'Eres un copiloto Linux/Termux de ultra baja latencia para Montana Cloud. Conciso, práctico, preciso.',
      thinkingConfig: { thinkingLevel: ThinkingLevel.MINIMAL },
    },
  });

  const text = response.text?.trim() || 'Comando listo.';
  const match = text.match(/`([^`]+)`/);
  return {
    suggestion: text,
    command: match ? match[1] : '',
    modelUsed: 'gemini-3.1-flash-lite',
  };
}

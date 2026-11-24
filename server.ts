import 'dotenv/config';
import express, { NextFunction, Request, Response } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { getApps, initializeApp } from 'firebase-admin/app';
import { DecodedIdToken, getAuth } from 'firebase-admin/auth';
import firebaseConfig from './firebase-applet-config.json' with { type: 'json' };
import {
  CommandRequest,
  runAiCommand,
  runQuickTerminalAssist,
} from './src/server/gemini.ts';
import {
  executeSandboxedCommand,
  LiveInfraSnapshot,
  TerminalProfile,
} from './src/server/sandboxShell.ts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

if (!getApps().length) {
  initializeApp({
    projectId: firebaseConfig.projectId,
  });
}
const adminAuth = getAuth();

interface AuthRequest extends Request {
  user?: DecodedIdToken;
}

async function requireAuth(req: AuthRequest, res: Response, next: NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    res.status(401).json({ error: 'Autenticación requerida. Inicia sesión con Google.' });
    return;
  }
  const token = authHeader.slice('Bearer '.length).trim();
  if (!token) {
    res.status(401).json({ error: 'Token vacío o inválido.' });
    return;
  }
  try {
    const decoded = await adminAuth.verifyIdToken(token);
    req.user = decoded;
    next();
  } catch (err) {
    console.error('Token verification failed:', err);
    res.status(401).json({ error: 'Sesión expirada o token inválido.' });
  }
}

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT || 3000);

  app.use(express.json({ limit: '1mb' }));

  app.get('/api/health', (_req, res) => {
    res.json({ status: 'ok', service: 'montana-cloud-control-plane' });
  });

  // Autonomous Gemini + MCP + WarrdCore AI Command Center
  app.post('/api/ai/command', requireAuth, async (req: AuthRequest, res: Response) => {
    try {
      const body = req.body as Partial<CommandRequest>;
      if (!body.prompt || typeof body.prompt !== 'string' || body.prompt.trim().length === 0) {
        res.status(400).json({ error: 'Debes escribir una instrucción para el comandante IA.' });
        return;
      }
      if (body.prompt.length > 4000) {
        res.status(400).json({ error: 'La instrucción supera el límite de 4000 caracteres.' });
        return;
      }

      const result = await runAiCommand({
        prompt: body.prompt.trim(),
        modelMode: body.modelMode || 'hydrogen-deep',
        highThinking: Boolean(body.highThinking),
        useWebSearch: Boolean(body.useWebSearch),
        enableMcpTools: body.enableMcpTools !== false,
        warrdcoreModel: body.warrdcoreModel,
        context: body.context || {
          nodes: [],
          mcpServers: [],
          warrdcoreModels: [],
          devEnvs: [],
          infraResources: [],
        },
      });

      res.json(result);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error ejecutando el comando IA.';
      console.error('/api/ai/command error:', err);
      res.status(500).json({ error: msg });
    }
  });

  // Ultra Low-Latency Gemini 3.1 Flash Lite Terminal Copilot
  app.post('/api/ai/quick', requireAuth, async (req: AuthRequest, res: Response) => {
    try {
      const { prompt, shellEnv } = req.body as { prompt?: string; shellEnv?: string };
      if (!prompt || typeof prompt !== 'string' || !prompt.trim()) {
        res.status(400).json({ error: 'Prompt requerido.' });
        return;
      }
      const env: TerminalProfile = shellEnv === 'termux' ? 'termux' : 'ubuntu';
      const result = await runQuickTerminalAssist(prompt.trim().slice(0, 800), env);
      res.json(result);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error en el copiloto de terminal.';
      console.error('/api/ai/quick error:', err);
      res.status(500).json({ error: msg });
    }
  });

  // Sandboxed Termux & Ubuntu 24.04 LTS Cloud Terminal Execution
  app.post('/api/terminal/exec', requireAuth, (req: AuthRequest, res: Response) => {
    try {
      const { command, profile, infra } = req.body as {
        command?: string;
        profile?: string;
        infra?: LiveInfraSnapshot;
      };
      if (typeof command !== 'string' || command.length > 512) {
        res.status(400).json({ error: 'Comando inválido o demasiado largo.' });
        return;
      }
      const safeProfile: TerminalProfile = profile === 'termux' ? 'termux' : 'ubuntu';
      const uid = req.user?.uid || 'anonymous';
      const result = executeSandboxedCommand(uid, safeProfile, command, infra || {});
      res.json(result);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Error ejecutando comando en terminal.';
      res.status(500).json({ error: msg });
    }
  });

  // Mount Vite middleware in development or serve built static files in production
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(__dirname, 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Montana Cloud Control Plane listening on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch((err) => {
  console.error('Fatal server startup error:', err);
  process.exit(1);
});

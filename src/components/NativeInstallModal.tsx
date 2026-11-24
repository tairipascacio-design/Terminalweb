import React, { useState } from 'react';
import { Download, Smartphone, Monitor, Terminal, Check, Copy, X, WifiOff } from 'lucide-react';
import { useOnlineStatus, usePWAInstall } from '../hooks/usePWAInstall';

interface PWAInstallButtonProps {
  variant?: 'sidebar' | 'inline';
}

function triggerFileDownload(filename: string, content: string, mimeType = 'text/plain;charset=utf-8') {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({ variant = 'sidebar' }) => {
  const { isInstallable, isInstalled, isIOS, isInIframe, install } = usePWAInstall();
  const [openModal, setOpenModal] = useState(false);
  const [copiedUrl, setCopiedUrl] = useState(false);
  const [installFeedback, setInstallFeedback] = useState<string | null>(null);

  if (isInstalled) {
    return null;
  }

  const currentOrigin = typeof window !== 'undefined' ? window.location.origin : '';

  const handlePrimaryClick = async () => {
    if (isInstallable) {
      const ok = await install();
      if (ok) {
        setInstallFeedback('Montana Cloud instalada en tu dispositivo.');
        return;
      }
    }
    setOpenModal(true);
  };

  const handleCopyUrl = async () => {
    try {
      await navigator.clipboard.writeText(currentOrigin);
      setCopiedUrl(true);
      setTimeout(() => setCopiedUrl(false), 2000);
    } catch {
      setCopiedUrl(false);
    }
  };

  const handleDownloadTermuxLauncher = () => {
    const script = `#!/usr/bin/env bash
# Montana Cloud — Lanzador Nativo para Termux Android & Ubuntu Linux
set -e

APP_URL="${currentOrigin}"

echo "=================================================="
echo "  MONTANA CLOUD — Instalador / Lanzador 24/7"
echo "=================================================="

if [ -d "/data/data/com.termux" ]; then
  echo "[Termux] Detectado Android Termux."
  pkg update -y && pkg install -y openssh termux-api proot-distro
  echo "Abriendo Montana Cloud en tu navegador para instalar como App nativa..."
  termux-open-url "$APP_URL" || echo "Abre manualmente: $APP_URL"
else
  echo "[Linux/Ubuntu] Creando acceso directo de aplicación de escritorio..."
  mkdir -p "$HOME/.local/share/applications"
  cat > "$HOME/.local/share/applications/montana-cloud.desktop" <<EOF
[Desktop Entry]
Name=Montana Cloud
Comment=Executive 24/7 Cloud Control Plane
Exec=google-chrome --app=$APP_URL
Terminal=false
Type=Application
Categories=Development;System;
EOF
  chmod +x "$HOME/.local/share/applications/montana-cloud.desktop"
  echo "Acceso directo nativo creado en ~/.local/share/applications/montana-cloud.desktop"
fi
`;
    triggerFileDownload('montana-cloud-launcher.sh', script, 'application/x-sh');
  };

  const handleDownloadDockerCompose = () => {
    const compose = `# Montana Cloud — Stack 24/7 para Hetzner / DigitalOcean / Ubuntu Server
services:
  montana-cloud:
    image: node:22-alpine
    container_name: montana-cloud-247
    working_dir: /app
    restart: always
    ports:
      - "3000:3000"
    environment:
      - NODE_ENV=production
      - PORT=3000
      - GEMINI_API_KEY=\${GEMINI_API_KEY}
    volumes:
      - ./:/app
    command: sh -c "npm ci && npm run build && npm run start"

  warrdcore-daemon:
    image: ghcr.io/ggerganov/llama.cpp:server
    container_name: warrdcore-runtime-247
    restart: always
    ports:
      - "11434:8080"
    volumes:
      - ./warrdcore-models:/models
`;
    triggerFileDownload('docker-compose.montana.yml', compose, 'text/yaml');
  };

  return (
    <>
      {variant === 'sidebar' ? (
        <button
          type="button"
          onClick={handlePrimaryClick}
          className="w-full flex items-center justify-center gap-2 px-3.5 py-2 text-xs font-semibold bg-[#181B23] text-[#D4AF37] border border-[#D4AF37]/40 rounded-lg hover:bg-[#D4AF37] hover:text-[#09090B] transition-colors whitespace-nowrap cursor-pointer"
        >
          <Download className="w-3.5 h-3.5 shrink-0" />
          <span>Instalar App Nativa</span>
        </button>
      ) : (
        <button
          type="button"
          onClick={handlePrimaryClick}
          className="inline-flex items-center gap-2 px-4 py-3 text-sm font-medium bg-[#181B23] text-zinc-100 border border-zinc-700 rounded-lg hover:border-[#D4AF37] hover:text-[#D4AF37] transition-colors whitespace-nowrap shrink-0 cursor-pointer"
        >
          <Download className="w-4 h-4 text-[#D4AF37]" />
          <span>Instalar App Nativa</span>
        </button>
      )}

      {openModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4">
          <div className="w-full max-w-xl bg-[#12141A] border border-zinc-800 rounded-xl overflow-hidden">
            <div className="px-6 py-4 border-b border-zinc-800 flex items-center justify-between">
              <div>
                <h3 className="font-display text-lg font-bold text-[#D4AF37]">
                  Instalar Montana Cloud (Versión Nativa)
                </h3>
                <p className="text-xs text-zinc-400">
                  Android · iOS · Windows · macOS · Ubuntu Linux · Termux
                </p>
              </div>
              <button
                type="button"
                onClick={() => setOpenModal(false)}
                className="p-1.5 text-zinc-400 hover:text-zinc-100 cursor-pointer"
                aria-label="Cerrar"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-5 max-h-[75vh] overflow-y-auto">
              {installFeedback && (
                <div className="text-xs text-emerald-400 bg-emerald-950/40 border border-emerald-800/60 rounded-lg px-4 py-2.5">
                  {installFeedback}
                </div>
              )}

              {/* Direct External URL for testing outside iframe */}
              <div className="space-y-2">
                <p className="text-xs font-semibold text-zinc-200">
                  1. Abre fuera de la vista previa (URL directa de tu App)
                </p>
                {isInIframe && (
                  <p className="text-xs text-zinc-400 leading-relaxed">
                    Estás dentro de una vista previa embebida. Para que Chrome, Edge o Safari activen la instalación nativa como app independiente en tu pantalla de inicio o escritorio, abre esta URL directa en una pestaña nueva:
                  </p>
                )}
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={currentOrigin}
                    className="flex-1 px-3 py-2 text-xs font-mono bg-[#09090B] border border-zinc-800 rounded-lg text-zinc-300"
                  />
                  <button
                    type="button"
                    onClick={handleCopyUrl}
                    className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold bg-[#D4AF37] text-[#09090B] rounded-lg hover:bg-[#E5C158] whitespace-nowrap cursor-pointer"
                  >
                    {copiedUrl ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedUrl ? 'Copiada' : 'Copiar URL'}</span>
                  </button>
                </div>
              </div>

              {/* Native PWA Install Trigger */}
              {isInstallable && (
                <div className="p-4 bg-[#09090B] border border-[#D4AF37]/40 rounded-lg flex items-center justify-between gap-4">
                  <div className="text-xs text-zinc-300">
                    Tu navegador detectó el paquete PWA listo para instalar en un clic.
                  </div>
                  <button
                    type="button"
                    onClick={async () => {
                      const ok = await install();
                      if (ok) setOpenModal(false);
                    }}
                    className="px-4 py-2 text-xs font-semibold bg-[#D4AF37] text-[#09090B] rounded-lg hover:bg-[#E5C158] whitespace-nowrap cursor-pointer"
                  >
                    Instalar Ahora
                  </button>
                </div>
              )}

              {/* Platform Guides */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2 border-t border-zinc-800">
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2 text-xs font-semibold text-zinc-100">
                    <Smartphone className="w-4 h-4 text-[#D4AF37]" />
                    <span>Android &amp; iOS (Móvil)</span>
                  </div>
                  <p className="text-xs text-zinc-400 leading-relaxed">
                    {isIOS
                      ? 'En Safari toca Compartir y luego "Añadir a pantalla de inicio" para abrirla en pantalla completa sin barras.'
                      : 'En Chrome Android abre la URL directa, toca el menú (⋮) y selecciona "Instalar aplicación". En iOS Safari usa Compartir -> Añadir a pantalla de inicio.'}
                  </p>
                </div>

                <div className="space-y-1.5">
                  <div className="flex items-center gap-2 text-xs font-semibold text-zinc-100">
                    <Monitor className="w-4 h-4 text-[#D4AF37]" />
                    <span>Windows, macOS &amp; Linux</span>
                  </div>
                  <p className="text-xs text-zinc-400 leading-relaxed">
                    Al abrir la URL en Chrome, Brave o Edge verás el icono de instalar en la barra de direcciones para crear una ventana nativa en tu sistema operativo.
                  </p>
                </div>
              </div>

              {/* Downloadable Native Scripts for Ubuntu / Termux / 24-7 Server */}
              <div className="pt-4 border-t border-zinc-800 space-y-3">
                <div className="flex items-center gap-2 text-xs font-semibold text-zinc-100">
                  <Terminal className="w-4 h-4 text-[#D4AF37]" />
                  <span>Descargas para Ubuntu Linux, Termux y Servidor 24/7</span>
                </div>
                <div className="flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={handleDownloadTermuxLauncher}
                    className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-medium bg-[#181B23] text-zinc-100 border border-zinc-700 rounded-lg hover:border-[#D4AF37] hover:text-[#D4AF37] transition-colors whitespace-nowrap cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Descargar Launcher Termux / Ubuntu (.sh)</span>
                  </button>
                  <button
                    type="button"
                    onClick={handleDownloadDockerCompose}
                    className="inline-flex items-center gap-2 px-3.5 py-2 text-xs font-medium bg-[#181B23] text-zinc-100 border border-zinc-700 rounded-lg hover:border-[#D4AF37] hover:text-[#D4AF37] transition-colors whitespace-nowrap cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Descargar Docker Compose 24/7 (.yml)</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export const OfflineIndicator: React.FC = () => {
  const isOnline = useOnlineStatus();

  if (isOnline) return null;

  return (
    <div className="fixed bottom-4 left-4 z-50 flex items-center gap-2 rounded-lg bg-[#181B23] border border-amber-500/60 px-3.5 py-2 text-xs font-medium text-amber-300 shadow-lg">
      <WifiOff className="w-3.5 h-3.5 text-amber-400" />
      <span>Modo sin conexión — Usando datos en caché local.</span>
    </div>
  );
};

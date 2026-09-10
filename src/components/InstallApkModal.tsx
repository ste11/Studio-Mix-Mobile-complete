import React, { useState, useEffect } from 'react';
import QRCode from 'qrcode';
import {
  Smartphone,
  Download,
  X,
  Copy,
  Check,
  ExternalLink,
  Sparkles,
  QrCode,
  PackageCheck,
  Layers,
} from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { triggerHaptic } from '../audio/DjAudioEngine';

interface InstallApkModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const InstallApkModal: React.FC<InstallApkModalProps> = ({
  isOpen,
  onClose,
}) => {
  const { isInstallable, isInstalled, isIOS, isAndroid, install } = usePWAInstall();
  const [copied, setCopied] = useState(false);
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('');
  const [activeTab, setActiveTab] = useState<'instant' | 'apk'>('instant');

  // Use the canonical production shared URL or current origin
  const appUrl =
    typeof window !== 'undefined' && window.location.origin.includes('run.app')
      ? window.location.href.split('#')[0]
      : 'https://ais-pre-wnyrn5fc3fyoptfogaclqt-99959688179.europe-west2.run.app';

  useEffect(() => {
    QRCode.toDataURL(appUrl, {
      width: 260,
      margin: 2,
      color: {
        dark: '#06b6d4',
        light: '#09090b',
      },
    })
      .then((url) => setQrCodeUrl(url))
      .catch((err) => console.error('Failed to generate QR code', err));
  }, [appUrl]);

  if (!isOpen) return null;

  const handleCopyLink = () => {
    triggerHaptic(30);
    navigator.clipboard.writeText(appUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleTriggerInstall = async () => {
    triggerHaptic(50);
    const success = await install();
    if (success) {
      onClose();
    }
  };

  const pwaBuilderUrl = `https://www.pwabuilder.com/reportcard?site=${encodeURIComponent(appUrl)}`;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="w-full max-w-md bg-zinc-900 border border-zinc-700/80 rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Modal Header */}
        <div className="bg-zinc-950 px-4 py-3 border-b border-zinc-800 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-cyan-400">
              <Smartphone className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-sm font-bold text-zinc-100 flex items-center gap-1.5 uppercase tracking-wide">
                Installa sul Telefono / APK
              </h2>
              <p className="text-[10px] text-zinc-400">
                Prova l'app a schermo intero con audio zero-latenza
              </p>
            </div>
          </div>

          <button
            onClick={() => {
              triggerHaptic(20);
              onClose();
            }}
            className="w-8 h-8 rounded-full bg-zinc-800 text-zinc-400 hover:text-zinc-100 hover:bg-zinc-700 flex items-center justify-center transition"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Selector */}
        <div className="grid grid-cols-2 p-1.5 bg-zinc-950 border-b border-zinc-800/80 text-xs font-semibold">
          <button
            onClick={() => {
              triggerHaptic(20);
              setActiveTab('instant');
            }}
            className={`py-2 rounded-xl flex items-center justify-center gap-1.5 transition ${
              activeTab === 'instant'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-bold'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Installazione Istantanea</span>
          </button>
          <button
            onClick={() => {
              triggerHaptic(20);
              setActiveTab('apk');
            }}
            className={`py-2 rounded-xl flex items-center justify-center gap-1.5 transition ${
              activeTab === 'apk'
                ? 'bg-cyan-500/20 text-cyan-300 border border-cyan-500/40 font-bold'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <PackageCheck className="w-3.5 h-3.5" />
            <span>File .APK (Android)</span>
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-4 overflow-y-auto space-y-4 text-xs">
          {/* Notice on AI Studio Share button */}
          <div className="bg-amber-950/40 border border-amber-500/40 rounded-xl p-2.5 text-[11px] text-amber-200/90 leading-snug">
            <strong className="text-amber-300 font-bold block mb-1">
              ⚠️ Come attivare l'accesso sul telefono:
            </strong>
            Nel menu in alto a destra della pagina di Google AI Studio, fai clic su{' '}
            <span className="font-bold text-white bg-amber-600/50 px-1 py-0.5 rounded">
              Share
            </span>{' '}
            (o <em>Deploy</em>). Questo attiva l'accesso pubblico senza richiedere il login Google sul cellulare!
          </div>

          {activeTab === 'instant' && (
            <div className="space-y-4">
              {/* Native Prompt if supported on active browser */}
              {isInstallable && (
                <div className="bg-gradient-to-r from-cyan-950/60 to-zinc-900 border border-cyan-500/50 rounded-xl p-3 text-center">
                  <p className="text-cyan-200 font-semibold mb-2">
                    Dispositivo pronto per l'installazione nativa!
                  </p>
                  <button
                    onClick={handleTriggerInstall}
                    className="w-full py-2.5 px-4 bg-cyan-500 hover:bg-cyan-400 text-zinc-950 font-bold rounded-lg flex items-center justify-center gap-2 shadow-lg shadow-cyan-500/25 transition active:scale-[0.98]"
                  >
                    <Download className="w-4 h-4" />
                    Installa Ora sulla Schermata Home
                  </button>
                </div>
              )}

              {isInstalled && (
                <div className="bg-emerald-950/40 border border-emerald-500/50 rounded-xl p-3 text-emerald-300 flex items-center gap-2">
                  <Check className="w-4 h-4 shrink-0 text-emerald-400" />
                  <span>
                    L'app è già installata e attiva in modalità Standalone a schermo intero!
                  </span>
                </div>
              )}

              {/* QR Code section for scanning on mobile */}
              <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-3.5 flex flex-col items-center text-center">
                <div className="flex items-center gap-1.5 text-zinc-300 font-bold mb-2">
                  <QrCode className="w-4 h-4 text-cyan-400" />
                  <span>Inquadra con il telefono per aprirla subito</span>
                </div>

                {qrCodeUrl ? (
                  <div className="p-2 bg-zinc-950 rounded-lg border border-cyan-500/40 shadow-inner">
                    <img
                      src={qrCodeUrl}
                      alt="QR Code per installare l'app"
                      className="w-44 h-44 rounded"
                    />
                  </div>
                ) : (
                  <div className="w-44 h-44 bg-zinc-900 rounded-lg flex items-center justify-center text-zinc-500">
                    Caricamento QR...
                  </div>
                )}

                <div className="mt-3 w-full flex items-center gap-1.5">
                  <input
                    readOnly
                    value={appUrl}
                    className="flex-1 bg-zinc-900 border border-zinc-700/70 rounded-lg px-2.5 py-1.5 text-[11px] font-mono text-zinc-300 truncate"
                  />
                  <button
                    onClick={handleCopyLink}
                    className="px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-100 rounded-lg font-medium flex items-center gap-1 border border-zinc-700 shrink-0 transition active:scale-95"
                  >
                    {copied ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                        <span className="text-emerald-400">Copiato</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5 text-zinc-300" />
                        <span>Copia</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Quick instructions */}
              <div className="bg-zinc-950/60 border border-zinc-800/80 rounded-xl p-3 space-y-2 text-[11px] text-zinc-300">
                <p className="font-semibold text-zinc-100 flex items-center gap-1.5">
                  <Smartphone className="w-3.5 h-3.5 text-cyan-400" />
                  Come installarla sul tuo smartphone Android:
                </p>
                <ol className="list-decimal list-inside space-y-1 text-zinc-400 leading-relaxed pl-1">
                  <li>
                    Apri il link in <strong className="text-zinc-200">Google Chrome</strong> sul tuo telefono.
                  </li>
                  <li>
                    Tocca l'icona del menu <strong className="text-zinc-200">⋮ (tre puntini)</strong> in alto a destra.
                  </li>
                  <li>
                    Seleziona <strong className="text-cyan-300">"Installa applicazione"</strong> o <strong className="text-cyan-300">"Aggiungi a schermata Home"</strong>.
                  </li>
                  <li>
                    Troverai l'icona <strong className="text-zinc-200">DJ Mixer</strong> tra le tue app native: si avvia a schermo intero senza barre, con supporto multi-touch fluido e zero ritardo audio.
                  </li>
                </ol>
              </div>
            </div>
          )}

          {activeTab === 'apk' && (
            <div className="space-y-4">
              <div className="bg-gradient-to-br from-zinc-950 to-zinc-900 border border-zinc-800 rounded-xl p-3.5 space-y-2.5">
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-lg bg-emerald-500/20 border border-emerald-500/40 flex items-center justify-center text-emerald-400">
                    <PackageCheck className="w-4 h-4" />
                  </div>
                  <div>
                    <h3 className="font-bold text-zinc-100 text-xs">
                      Genera il file .APK con PWABuilder (Ufficiale)
                    </h3>
                    <p className="text-[10px] text-zinc-400">
                      Crea un pacchetto APK nativo Android firmato e pronto all'installazione
                    </p>
                  </div>
                </div>

                <p className="text-[11px] text-zinc-300 leading-relaxed">
                  L'app è già configurata con Web App Manifest e Service Worker validi. Puoi generare direttamente il file binario <span className="font-mono text-cyan-300">.apk</span> pronto da scaricare in un solo click:
                </p>

                <a
                  href={pwaBuilderUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="w-full py-2.5 px-4 bg-emerald-600 hover:bg-emerald-500 text-white font-bold rounded-lg flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/30 transition active:scale-[0.98]"
                >
                  <span>Apri PWABuilder & Scarica APK</span>
                  <ExternalLink className="w-4 h-4" />
                </a>

                <div className="pt-2 border-t border-zinc-800 text-[10px] text-zinc-400 space-y-1">
                  <p className="font-semibold text-zinc-300">Passaggi rapidi:</p>
                  <p>1. Clicca sul pulsante verde sopra (il link dell'app è già inserito).</p>
                  <p>2. Clicca su <strong>"Package for Android"</strong>.</p>
                  <p>3. Scarica il file <strong>.apk</strong> e aprilo con un tocco sul telefono per installarlo!</p>
                </div>
              </div>

              {/* Advanced Developer / Capacitor option */}
              <div className="bg-zinc-950/80 border border-zinc-800/80 rounded-xl p-3 space-y-2 text-[11px]">
                <div className="flex items-center gap-1.5 text-zinc-300 font-semibold">
                  <Layers className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Compilazione locale con Capacitor / Android Studio</span>
                </div>
                <p className="text-zinc-400 leading-relaxed">
                  Puoi anche esportare il codice sorgente completo da Google AI Studio (menu <strong>Settings &gt; Export to ZIP</strong>) ed eseguire:
                </p>
                <pre className="bg-zinc-900 border border-zinc-800 p-2 rounded-lg font-mono text-[10px] text-cyan-300 overflow-x-auto select-all">
                  npm i @capacitor/core @capacitor/cli @capacitor/android{'\n'}
                  npx cap add android{'\n'}
                  npx cap build
                </pre>
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="bg-zinc-950 px-4 py-2.5 border-t border-zinc-800 flex items-center justify-between text-[11px]">
          <span className="text-zinc-400">
            Versione mobile PWA & Android v1.0
          </span>
          <button
            onClick={() => {
              triggerHaptic(20);
              onClose();
            }}
            className="px-3.5 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 rounded-lg font-semibold transition"
          >
            Chiudi
          </button>
        </div>
      </div>
    </div>
  );
};

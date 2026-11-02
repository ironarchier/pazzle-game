import type { PlatformAdapter, YandexSdk } from './types';

let sdk: YandexSdk | undefined;
let initializing: Promise<YandexSdk | undefined> | undefined;
let loadingReported = false;

async function initialize(): Promise<YandexSdk | undefined> {
  if (typeof window === 'undefined') return;
  const hostname = location.hostname;
  const local = /^(localhost|127\.|192\.168\.|10\.|172\.(1[6-9]|2\d|3[01])\.)/.test(hostname);
  if (!window.YaGames && local) return;
  if (!window.YaGames) {
    await new Promise<void>(resolve => {
      const script = document.createElement('script');
      script.src = '/sdk.js'; script.async = true;
      const timeout = setTimeout(resolve, 8000);
      const finish = () => { clearTimeout(timeout); resolve(); };
      script.onload = finish; script.onerror = finish;
      document.head.appendChild(script);
    });
  }
  if (!window.YaGames) return;
  let timeout: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      window.YaGames.init(),
      new Promise<undefined>(resolve => { timeout = setTimeout(resolve, 8000); }),
    ]);
  } catch { return; }
  finally { clearTimeout(timeout); }
}

function getYandexSdk(): Promise<YandexSdk | undefined> {
  if (sdk) return Promise.resolve(sdk);
  initializing ??= initialize().then(value => { sdk = value; if (!value) initializing = undefined; return value; });
  return initializing;
}

export const yandexPlatform: PlatformAdapter = {
  getSdk: getYandexSdk,
  async getStorage() { return (await getYandexSdk())?.getStorage?.(); },
  ready() {
    if (loadingReported || !sdk?.features?.LoadingAPI) return;
    try { sdk.features.LoadingAPI.ready(); loadingReported = true; } catch { /* The game can still start offline. */ }
  },
  setGameplay(active) {
    try {
      if (active) sdk?.features?.GameplayAPI?.start();
      else sdk?.features?.GameplayAPI?.stop();
    } catch { /* Optional platform telemetry must not interrupt gameplay. */ }
  },
};

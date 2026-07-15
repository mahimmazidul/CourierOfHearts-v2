import type { ClientContext } from '@/types/letter';

const BROWSER_ID_KEY = 'courier_of_hearts_browser_id';
const SESSION_REF_KEY = 'courier_of_hearts_session_ref';

function randomId(prefix: string) {
  return `${prefix}_${Math.random().toString(36).slice(2, 10)}${Date.now().toString(36)}`;
}

function getPersistentValue(key: string, prefix: string) {
  try {
    const existing = localStorage.getItem(key);
    if (existing) return existing;
    const next = randomId(prefix);
    localStorage.setItem(key, next);
    return next;
  } catch {
    return randomId(prefix);
  }
}

function getSessionValue(key: string, prefix: string) {
  try {
    const existing = sessionStorage.getItem(key);
    if (existing) return existing;
    const next = randomId(prefix);
    sessionStorage.setItem(key, next);
    return next;
  } catch {
    return randomId(prefix);
  }
}

export function collectClientContext(): ClientContext {
  if (typeof window === 'undefined' || typeof navigator === 'undefined') return {};

  const media = (query: string) => window.matchMedia?.(query)?.matches ?? false;
  const screenWidth = window.screen?.width;
  const screenHeight = window.screen?.height;

  return {
    browserId: getPersistentValue(BROWSER_ID_KEY, 'br'),
    sessionRef: getSessionValue(SESSION_REF_KEY, 'sr'),
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    language: navigator.language,
    languages: navigator.languages?.slice(0, 5),
    platform: navigator.platform,
    userAgent: navigator.userAgent,
    screenWidth: typeof screenWidth === 'number' ? screenWidth : undefined,
    screenHeight: typeof screenHeight === 'number' ? screenHeight : undefined,
    viewportWidth: window.innerWidth,
    viewportHeight: window.innerHeight,
    pixelRatio: window.devicePixelRatio,
    colorScheme: media('(prefers-color-scheme: dark)') ? 'dark' : media('(prefers-color-scheme: light)') ? 'light' : 'no-preference',
    reducedMotion: media('(prefers-reduced-motion: reduce)'),
    touchPoints: navigator.maxTouchPoints,
    hardwareConcurrency: navigator.hardwareConcurrency,
    deviceMemory: (navigator as Navigator & { deviceMemory?: number }).deviceMemory,
    cookieEnabled: navigator.cookieEnabled,
    localStorageAvailable: (() => {
      try {
        const key = '__coh_ls_test__';
        localStorage.setItem(key, '1');
        localStorage.removeItem(key);
        return true;
      } catch {
        return false;
      }
    })(),
  };
}

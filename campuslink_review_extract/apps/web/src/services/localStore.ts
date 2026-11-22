const STORAGE_VERSION = 1;
const PREFIX = 'campuslink:v1:';

export function loadLocal<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(`${PREFIX}${key}`) ?? localStorage.getItem(`campuslink-${key}`);
    if (!raw) return fallback;
    const parsed: unknown = JSON.parse(raw);
    if (parsed && typeof parsed === 'object' && 'version' in parsed && 'data' in parsed) {
      const stored = parsed as { version: number; data: T };
      return stored.version === STORAGE_VERSION ? stored.data : fallback;
    }
    return parsed as T;
  } catch {
    return fallback;
  }
}

export function saveLocal<T>(key: string, value: T): void {
  try {
    localStorage.setItem(`${PREFIX}${key}`, JSON.stringify({ version: STORAGE_VERSION, data: value }));
  } catch {
    // A full browser storage quota should not crash the app.
  }
}

export function clearCampusLinkData(): void {
  try {
    const keys: string[] = [];
    for (let index = 0; index < localStorage.length; index += 1) {
      const key = localStorage.key(index);
      if (key && (key.startsWith('campuslink:v1:') || key.startsWith('campuslink-'))) keys.push(key);
    }
    keys.forEach(key => localStorage.removeItem(key));
  } catch {
    // Storage may be disabled by browser policy; avoid crashing the app.
  }
}

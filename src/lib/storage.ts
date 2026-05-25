export function readJson<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    const parsed = JSON.parse(raw);
    
    // Safety check: if the saved plan is from an older version and missing critical nested objects, clear it
    if (key === 'dd.planner.autosave.v1' && parsed) {
      if (!parsed.money || typeof parsed.money.total === 'undefined' || !parsed.devotee || !parsed.route) {
        console.warn('[divyadarshan] Cleared corrupted or outdated autosave from localStorage');
        localStorage.removeItem(key);
        return fallback;
      }
    }
    
    return parsed as T;
  } catch {
    return fallback;
  }
}

export function writeJson(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // ignore quota / privacy mode issues
  }
}


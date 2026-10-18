/** Per-device conveniences (theme, last tab, sort order, offline copies of books, a cover designed before signing up). */
const PREFIX = "ninre.";

export const prefs = {
  get<T>(key: string, fallback: T): T {
    try {
      const v = localStorage.getItem(PREFIX + key);
      return v == null ? fallback : (JSON.parse(v) as T);
    } catch {
      return fallback;
    }
  },
  set(key: string, value: unknown) {
    try {
      localStorage.setItem(PREFIX + key, JSON.stringify(value));
    } catch {
      // storage full or blocked: these are conveniences, so carry on
    }
  },
};

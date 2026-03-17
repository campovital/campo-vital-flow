type CacheEnvelope<T> = {
  value: T;
  updatedAt: number;
};

const CACHE_PREFIX = "gulupa_cache";

function isStorageAvailable() {
  return typeof window !== "undefined" && typeof localStorage !== "undefined";
}

function getKey(key: string) {
  return `${CACHE_PREFIX}:${key}`;
}

export function writeCache<T>(key: string, value: T) {
  if (!isStorageAvailable()) return;

  try {
    const envelope: CacheEnvelope<T> = {
      value,
      updatedAt: Date.now(),
    };
    localStorage.setItem(getKey(key), JSON.stringify(envelope));
  } catch {
    // Ignore storage quota / serialization errors
  }
}

export function readCache<T>(key: string, maxAgeMs?: number): T | null {
  if (!isStorageAvailable()) return null;

  try {
    const raw = localStorage.getItem(getKey(key));
    if (!raw) return null;

    const parsed = JSON.parse(raw) as CacheEnvelope<T>;
    if (!parsed || typeof parsed !== "object" || !("updatedAt" in parsed)) {
      return null;
    }

    if (typeof maxAgeMs === "number" && Date.now() - parsed.updatedAt > maxAgeMs) {
      return null;
    }

    return parsed.value;
  } catch {
    return null;
  }
}

export function removeCache(key: string) {
  if (!isStorageAvailable()) return;

  try {
    localStorage.removeItem(getKey(key));
  } catch {
    // Ignore storage errors
  }
}

export async function fetchWithCache<T>(
  key: string,
  fetcher: () => Promise<T>,
  options?: {
    fallbackValue?: T;
    maxAgeMs?: number;
  }
): Promise<T> {
  try {
    const value = await fetcher();
    writeCache(key, value);
    return value;
  } catch (error) {
    const cached = readCache<T>(key, options?.maxAgeMs);
    if (cached !== null) {
      return cached;
    }

    if (options && "fallbackValue" in options) {
      return options.fallbackValue as T;
    }

    throw error;
  }
}

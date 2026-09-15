"use client";

const CACHE_EVENT = "buildpilot:api-cache";

type CacheEntry = {
  data: unknown;
  generation: number;
};

const store = new Map<string, CacheEntry>();
let generation = 0;

function emit() {
  if (typeof window === "undefined") {
    return;
  }

  window.dispatchEvent(new CustomEvent(CACHE_EVENT));
}

export function getApiCacheGeneration() {
  return generation;
}

export function readApiCache<T>(key: string): T | null {
  const entry = store.get(key);

  if (!entry || entry.generation !== generation) {
    return null;
  }

  return entry.data as T;
}

export function writeApiCache<T>(key: string, data: T) {
  store.set(key, { data, generation });
}

export function invalidateApiCache(prefix?: string) {
  generation += 1;

  if (prefix) {
    for (const key of store.keys()) {
      if (key.startsWith(prefix)) {
        store.delete(key);
      }
    }
  } else {
    store.clear();
  }

  emit();
}

export function subscribeApiCache(listener: () => void) {
  if (typeof window === "undefined") {
    return () => undefined;
  }

  window.addEventListener(CACHE_EVENT, listener);
  return () => window.removeEventListener(CACHE_EVENT, listener);
}

export function apiCacheKey(url: string) {
  return url;
}

/** A tiny key-value store on IndexedDB that falls back to memory when IndexedDB is unavailable (private browsing). */
export interface Store<T> {
  put(key: string, value: T): Promise<void>;
  get(key: string): Promise<T | undefined>;
  delete(key: string): Promise<void>;
  all(): Promise<[string, T][]>;
}

export function kvStore<T>(dbName: string, storeName: string): Store<T> {
  const memory = new Map<string, T>();
  let opened: Promise<IDBDatabase | null> | null = null;

  const open = () =>
    (opened ??= new Promise<IDBDatabase | null>((resolve) => {
      try {
        const req = indexedDB.open(dbName, 1);
        req.onupgradeneeded = () => req.result.createObjectStore(storeName);
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => resolve(null);
        req.onblocked = () => resolve(null);
      } catch {
        resolve(null);
      }
    }));

  const run = async <R>(mode: IDBTransactionMode, fn: (s: IDBObjectStore) => IDBRequest<R>): Promise<R | undefined> => {
    const db = await open();
    if (!db) return undefined;
    return new Promise<R | undefined>((resolve) => {
      try {
        const req = fn(db.transaction(storeName, mode).objectStore(storeName));
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => resolve(undefined);
      } catch {
        resolve(undefined);
      }
    });
  };

  return {
    async put(key, value) {
      memory.set(key, value);
      await run('readwrite', (s) => s.put(value, key));
    },
    async get(key) {
      return (await run<T>('readonly', (s) => s.get(key))) ?? memory.get(key);
    },
    async delete(key) {
      memory.delete(key);
      await run('readwrite', (s) => s.delete(key));
    },
    async all() {
      const db = await open();
      if (!db) return [...memory];
      const keys = (await run<IDBValidKey[]>('readonly', (s) => s.getAllKeys())) ?? [];
      const values = (await run<T[]>('readonly', (s) => s.getAll())) ?? [];
      const fromDb = keys.map((k, i) => [String(k), values[i]] as [string, T]);
      const seen = new Set(fromDb.map(([k]) => k));
      return [...fromDb, ...[...memory].filter(([k]) => !seen.has(k))];
    },
  };
}

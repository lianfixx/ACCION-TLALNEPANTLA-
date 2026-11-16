import { AsyncLocalStorage } from "node:async_hooks";

/**
 * Reads shared by several parts of one page (settings, editable texts) run once per request.
 * Only page reads (GET and HEAD) get a scope; a request that writes always reads fresh data.
 */
const scope = new AsyncLocalStorage<Map<string, Promise<unknown>>>();

export function withRequestScope<T>(enabled: boolean, run: () => T): T {
  return enabled ? scope.run(new Map(), run) : run();
}

export function perRequest<T>(key: string, load: () => Promise<T>): Promise<T> {
  const store = scope.getStore();
  if (!store) return load();
  let pending = store.get(key) as Promise<T> | undefined;
  if (!pending) {
    pending = load();
    store.set(key, pending);
    // A failed read is not remembered: the next caller tries again.
    pending.catch(() => { if (store.get(key) === pending) store.delete(key); });
  }
  return pending;
}

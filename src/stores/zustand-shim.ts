// Minimal shim for Zustand create() to allow builds in offline/testing environments.
// This is intentionally tiny and only supports our usages (get, set, and subscribe) in this repo.

export type StateCreator<T> = (set: (partial: Partial<T>) => void, get: () => T) => T;

export type StoreSelector<T, U> = (s: T) => U;

export function create<T>(stateCreator: StateCreator<T>) {
  let currentState: T;
  const listeners: Array<() => void> = [];

  const set = (partial: Partial<T>) => {
    // Use a structural merge for partial updates
    currentState = Object.assign({}, currentState as unknown as Record<string, unknown>, partial as unknown as Record<string, unknown>) as T;
    for (const l of listeners) {
      try { l(); } catch { /* ignore listener errors */ }
    }
  };

  const get = () => currentState;

  // initialize
  currentState = stateCreator(set, get);

  const useStore = <U>(selector: StoreSelector<T, U>) => selector(currentState);
  (useStore as unknown as { setState: (p: Partial<T>) => void }).setState = set;
  (useStore as unknown as { getState: () => T }).getState = get;
  (useStore as unknown as { subscribe: (l: () => void) => () => void }).subscribe = (listener: () => void) => {
    listeners.push(listener);
    return () => {
      const idx = listeners.indexOf(listener);
      if (idx !== -1) listeners.splice(idx, 1);
    };
  };

  return useStore as unknown as (<U>(selector: StoreSelector<T, U>) => U) & {
    setState: (partial: Partial<T>) => void;
    getState: () => T;
    subscribe: (listener: () => void) => () => void;
  };
}

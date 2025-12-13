export const isLocalStorageAvailable = (): boolean => {
  try {
    const storage = globalThis.localStorage;
    if (!storage) return false;
    const testKey = "__dreamcats_ls_test__";
    storage.setItem(testKey, testKey);
    storage.removeItem(testKey);
    return true;
  } catch {
    return false;
  }
};

export const isSessionStorageAvailable = (): boolean => {
  try {
    const storage = globalThis.sessionStorage;
    if (!storage) return false;
    const testKey = "__dreamcats_ss_test__";
    storage.setItem(testKey, testKey);
    storage.removeItem(testKey);
    return true;
  } catch {
    return false;
  }
};

export const safeLocalStorage = {
  getItem(key: string): string | null {
    try {
      return globalThis.localStorage?.getItem(key) ?? null;
    } catch {
      return null;
    }
  },
  setItem(key: string, value: string): void {
    try {
      globalThis.localStorage?.setItem(key, value);
    } catch {
      // ignore (storage may be unavailable, blocked, or full)
    }
  },
  removeItem(key: string): void {
    try {
      globalThis.localStorage?.removeItem(key);
    } catch {
      // ignore
    }
  },
};

export const safeSessionStorage = {
  getItem(key: string): string | null {
    try {
      return globalThis.sessionStorage?.getItem(key) ?? null;
    } catch {
      return null;
    }
  },
  setItem(key: string, value: string): void {
    try {
      globalThis.sessionStorage?.setItem(key, value);
    } catch {
      // ignore
    }
  },
  removeItem(key: string): void {
    try {
      globalThis.sessionStorage?.removeItem(key);
    } catch {
      // ignore
    }
  },
};


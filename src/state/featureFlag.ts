import { safeLocalStorage } from "@/lib/storage";

const LOCAL_FLAG_KEY = "dreamcats_use_new_state";

export const isNewStateEnabled = (): boolean => {
  if (typeof window === "undefined") return false;
  const local = safeLocalStorage.getItem(LOCAL_FLAG_KEY);
  if (local === "true") return true;
  if (local === "false") return false;
  return import.meta.env.VITE_USE_NEW_STATE === "true";
};

export const setNewStateFlag = (value: boolean) => {
  if (typeof window === "undefined") return;
  safeLocalStorage.setItem(LOCAL_FLAG_KEY, value ? "true" : "false");
};

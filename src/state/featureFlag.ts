const LOCAL_FLAG_KEY = "sen_use_new_state";

export const isNewStateEnabled = (): boolean => {
  if (typeof window === "undefined") return true; // Default to enabled on server/build
  const local = localStorage.getItem(LOCAL_FLAG_KEY);
  if (local === "true") return true;
  if (local === "false") return false;
  // Default to enabled - new state is ready for use
  return true;
};

export const setNewStateFlag = (value: boolean) => {
  if (typeof window === "undefined") return;
  localStorage.setItem(LOCAL_FLAG_KEY, value ? "true" : "false");
};

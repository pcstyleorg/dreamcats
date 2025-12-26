import { nanoid } from "nanoid";
import { SliceCreator, SessionSlice } from "./types";
import { safeLocalStorage } from "@/lib/storage";

export const createSessionSlice: SliceCreator<SessionSlice> = (set) => ({
  playerId: null,
  playerName: "",
  roomId: null,
  locale: "en",
  theme: "light",
  soundEnabled: false,
  authToken: null,

  setPlayer: (id, name) => set({ playerId: id || nanoid(), playerName: name }),
  setRoom: (roomId) => set({ roomId }),
  setLocale: (locale) => set({ locale }),
  setTheme: (theme) => set({ theme }),
  toggleSound: () =>
    set((state) => {
      const next = !state.soundEnabled;
      safeLocalStorage.setItem("soundEnabled", String(next));
      return { soundEnabled: next };
    }),
  setAuthToken: (token) => set({ authToken: token }),
});

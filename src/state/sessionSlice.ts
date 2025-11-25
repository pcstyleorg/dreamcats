import { nanoid } from "nanoid";
import { SliceCreator, SessionSlice } from "./types";

export const createSessionSlice: SliceCreator<SessionSlice> = (set) => ({
  playerId: null,
  playerName: "",
  roomId: null,
  locale: "en",
  theme: "light",
  authToken: null,

  setPlayer: (id, name) => set({ playerId: id || nanoid(), playerName: name }),
  setRoom: (roomId) => set({ roomId }),
  setLocale: (locale) => set({ locale }),
  setTheme: (theme) => set({ theme }),
  setAuthToken: (token) => set({ authToken: token }),
});

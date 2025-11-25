import { SliceCreator, NetSlice } from "./types";

export const createNetSlice: SliceCreator<NetSlice> = (set) => ({
  netStatus: "disconnected",
  latencyMs: null,
  reconnectAttempts: 0,

  setNetStatus: (status) => set({ netStatus: status }),
  setLatency: (value) => set({ latencyMs: value }),
  bumpReconnect: () => set((state) => ({ reconnectAttempts: state.reconnectAttempts + 1 })),
  resetReconnect: () => set({ reconnectAttempts: 0 }),
});

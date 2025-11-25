import { SliceCreator, UISlice, SafeAreaInsets } from "./types";

const defaultInsets: SafeAreaInsets = { top: 0, right: 0, bottom: 0, left: 0 };

export const createUiSlice: SliceCreator<UISlice> = (set) => ({
  isMenuOpen: false,
  isSheetOpen: false,
  safeArea: defaultInsets,
  reducedMotion: false,
  viewportHeight: 0,

  setMenuOpen: (value: boolean) => set({ isMenuOpen: value }),
  setSheetOpen: (value: boolean) => set({ isSheetOpen: value }),
  setSafeArea: (insets: SafeAreaInsets) => set({ safeArea: insets }),
  setReducedMotion: (value: boolean) => set({ reducedMotion: value }),
  setViewportHeight: (value: number) => set({ viewportHeight: value }),
});

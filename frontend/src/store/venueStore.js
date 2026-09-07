import { create } from "zustand";

export const useVenueStore = create((set) => ({
  setupChecklistOpen: true,
  closeSetupChecklist: () => set({ setupChecklistOpen: false }),
  openSetupChecklist: () => set({ setupChecklistOpen: true })
}));
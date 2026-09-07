import { create } from "zustand";

export const useAuthSlice = create((set) => ({
  loginError: null,
  setLoginError: (err) => set({ loginError: err }),
  clearLoginError: () => set({ loginError: null })
}));
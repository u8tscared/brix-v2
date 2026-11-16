import { create } from 'zustand';

/** État d'interface non persisté : panneaux ouverts. */
export const useUI = create<{
  palette: boolean;
  bob: boolean;
  bobVoice: boolean;
  bobPrompt: string;
  create: boolean;
  mobileMenu: boolean;
  set: (p: Partial<{ palette: boolean; bob: boolean; bobVoice: boolean; bobPrompt: string; create: boolean; mobileMenu: boolean }>) => void;
  askBob: (prompt?: string, voice?: boolean) => void;
}>((set) => ({
  palette: false,
  bob: false,
  bobVoice: false,
  bobPrompt: '',
  create: false,
  mobileMenu: false,
  set: (p) => set(p),
  askBob: (prompt = '', voice = false) => set({ bob: true, bobPrompt: prompt, bobVoice: voice, palette: false }),
}));

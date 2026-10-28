// Tiny module flag so shared helpers (like the WhatsApp link builder) know they are inside a demo account.
let demo = false;
export const setDemoMode = (v) => { demo = !!v; };
export const isDemoMode = () => demo;
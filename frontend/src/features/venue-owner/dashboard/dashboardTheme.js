// Shared motion presets + colour tones for the vendor dashboard.

export const stagger = {
    hidden: {},
    show: { transition: { staggerChildren: 0.06, delayChildren: 0.02 } }
  };
  
  export const fadeUp = {
    hidden: { opacity: 0, y: 14 },
    show: { opacity: 1, y: 0, transition: { duration: 0.42, ease: [0.22, 1, 0.36, 1] } }
  };
  
  export const TONES = {
    red: { chip: "bg-primary-50 text-primary-600", dot: "bg-primary-500" },
    navy: { chip: "bg-navy-50 text-navy-600", dot: "bg-navy-500" },
    emerald: { chip: "bg-emerald-50 text-emerald-600", dot: "bg-emerald-500" },
    amber: { chip: "bg-amber-50 text-amber-600", dot: "bg-amber-500" },
    sky: { chip: "bg-sky-50 text-sky-600", dot: "bg-sky-500" },
    violet: { chip: "bg-violet-50 text-violet-600", dot: "bg-violet-500" }
  };
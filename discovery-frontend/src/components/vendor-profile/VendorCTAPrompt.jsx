import React, { useEffect, useState, useCallback } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X, TrendingUp, Sparkles } from "lucide-react";

const APP_URL = import.meta.env.VITE_APP_URL || "http://localhost:5173";
const SESSION_KEY = "in2fest_vendor_prompt_shown";
const SCROLL_TRIGGER_RATIO = 0.45; // fires once the visitor is ~45% down the page

export default function VendorCTAPrompt() {
  const [visible, setVisible] = useState(false);

  const dismiss = useCallback(() => {
    setVisible(false);
    try { sessionStorage.setItem(SESSION_KEY, "1"); } catch {}
  }, []);

  useEffect(() => {
    let alreadyShown = false;
    try { alreadyShown = sessionStorage.getItem(SESSION_KEY) === "1"; } catch {}
    if (alreadyShown) return;

    const onScroll = () => {
      const scrollTop = window.scrollY;
      const docHeight = document.documentElement.scrollHeight - window.innerHeight;
      if (docHeight <= 0) return;
      if (scrollTop / docHeight >= SCROLL_TRIGGER_RATIO) {
        setVisible(true);
        try { sessionStorage.setItem(SESSION_KEY, "1"); } catch {}
        window.removeEventListener("scroll", onScroll);
      }
    };

    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ y: 60, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: 60, opacity: 0 }}
          transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
          className="fixed z-40 bottom-16 md:bottom-6 inset-x-3 md:inset-x-auto md:right-6 md:w-96"
        >
          <div className="relative bg-navy-900 text-white rounded-2xl shadow-2xl border border-gold-500/30 px-5 pt-5 pb-5 overflow-hidden">
            <div className="absolute -top-10 -right-10 w-32 h-32 rounded-full bg-gold-500/20 blur-2xl pointer-events-none" />

            <button
              onClick={dismiss}
              aria-label="Dismiss"
              className="absolute top-3 right-3 text-white/50 hover:text-white transition-colors"
            >
              <X size={18} />
            </button>

            <div className="flex items-start gap-3 relative">
              <div className="w-10 h-10 rounded-xl bg-gold-500/15 flex items-center justify-center flex-shrink-0">
                <TrendingUp size={19} className="text-gold-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-display font-bold leading-snug">
                  Own a wedding or event business?
                </p>
                <p className="text-xs text-white/60 mt-1 leading-relaxed">
                  Get a free listing on In2Fest and start getting inquiries from couples planning their event.
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3 mt-4">
              
             <a   href={`${APP_URL}/login`}
                className="flex items-center justify-center gap-1.5 flex-1 bg-gradient-to-r from-accent-500 to-accent-600 text-white text-sm font-semibold px-4 py-2.5 rounded-xl hover:opacity-90 transition-opacity"
              >
                <Sparkles size={14} /> List for Free
              </a>
              <button
                onClick={dismiss}
                className="text-xs text-white/50 hover:text-white/80 transition-colors flex-shrink-0"
              >
                Not now
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
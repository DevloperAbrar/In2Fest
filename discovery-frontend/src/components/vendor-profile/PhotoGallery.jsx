import React, { useState, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, ChevronLeft, ChevronRight, Images } from "lucide-react";
import { getImageUrl } from "../../lib/constants";

export default function PhotoGallery({ gallery = [] }) {
  const [activeIndex, setActiveIndex] = useState(null);
  if (!gallery.length) return null;

  const urls = gallery.map((img) => getImageUrl(img.url || img));
  const visible = urls.slice(0, 6);
  const remaining = urls.length - visible.length;

  const close = useCallback(() => setActiveIndex(null), []);
  const prev = useCallback(() => setActiveIndex((i) => (i - 1 + urls.length) % urls.length), [urls.length]);
  const next = useCallback(() => setActiveIndex((i) => (i + 1) % urls.length), [urls.length]);

  useEffect(() => {
    if (activeIndex === null) return;
    const onKey = (e) => {
      if (e.key === "Escape") close();
      if (e.key === "ArrowLeft") prev();
      if (e.key === "ArrowRight") next();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [activeIndex, close, prev, next]);

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-display font-bold text-navy-900 text-lg">Photo Gallery</h2>
        <span className="flex items-center gap-1.5 text-xs text-gray-400">
          <Images size={13} /> {urls.length} photos
        </span>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
        {visible.map((url, i) => {
          const isLastTile = i === visible.length - 1 && remaining > 0;
          return (
            <button key={i} onClick={() => setActiveIndex(i)} className="relative rounded-xl overflow-hidden group">
              <img
                src={url}
                alt={`Gallery ${i + 1}`}
                className="w-full h-32 sm:h-36 object-cover transition-transform duration-300 group-hover:scale-105"
              />
              {isLastTile && (
                <div className="absolute inset-0 bg-navy-900/65 flex items-center justify-center text-white text-sm font-semibold">
                  +{remaining} more
                </div>
              )}
            </button>
          );
        })}
      </div>

      <AnimatePresence>
        {activeIndex !== null && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-navy-900/90 z-50 flex items-center justify-center p-4"
            onClick={close}
          >
            <button onClick={close} className="absolute top-5 right-5 text-white/80 hover:text-white" aria-label="Close">
              <X size={28} />
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); prev(); }}
              className="absolute left-3 md:left-6 text-white/70 hover:text-white p-2"
              aria-label="Previous photo"
            >
              <ChevronLeft size={32} />
            </button>
            <motion.img
              key={activeIndex}
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.2 }}
              src={urls[activeIndex]}
              alt="Preview"
              onClick={(e) => e.stopPropagation()}
              className="max-h-[85vh] max-w-full rounded-xl"
            />
            <button
              onClick={(e) => { e.stopPropagation(); next(); }}
              className="absolute right-3 md:right-6 text-white/70 hover:text-white p-2"
              aria-label="Next photo"
            >
              <ChevronRight size={32} />
            </button>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
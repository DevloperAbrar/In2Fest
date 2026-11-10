import React, { useState, useCallback, useEffect } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { X, ChevronLeft, ChevronRight, Images } from "lucide-react";
import { getImageUrl } from "../../lib/constants";
import { SectionCard } from "./ProfileKit";

/* ------------------------------------------------------------------ */
/* Full-screen viewer: keyboard, swipe, thumbnails                     */
/* ------------------------------------------------------------------ */
export function Lightbox({ urls, index, onClose, onIndex }) {
  const open = index !== null && index !== undefined;
  const total = urls.length;

  const prev = useCallback(() => onIndex((index - 1 + total) % total), [index, total, onIndex]);
  const next = useCallback(() => onIndex((index + 1) % total), [index, total, onIndex]);

  useEffect(() => {
    if (!open) return undefined;
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft") prev();
      if (e.key === "ArrowRight") next();
    };
    const oldOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = oldOverflow;
    };
  }, [open, onClose, prev, next]);

  if (typeof document === "undefined") return null;

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[80] bg-navy-900/95 backdrop-blur-sm flex flex-col"
        >
          <div className="flex items-center justify-between px-4 md:px-6 h-14 flex-shrink-0">
            <span className="text-sm font-semibold text-white/80">
              {index + 1} / {total}
            </span>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              className="w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors"
            >
              <X size={20} />
            </button>
          </div>

          <div className="relative flex-1 min-h-0 flex items-center justify-center px-2 md:px-16" onClick={onClose}>
            {total > 1 && (
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); prev(); }}
                aria-label="Previous photo"
                className="hidden md:flex absolute left-5 w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 text-white items-center justify-center transition-colors"
              >
                <ChevronLeft size={26} />
              </button>
            )}

            <motion.img
              key={index}
              src={urls[index]}
              alt={`Photo ${index + 1}`}
              onClick={(e) => e.stopPropagation()}
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.25 }}
              drag={total > 1 ? "x" : false}
              dragConstraints={{ left: 0, right: 0 }}
              dragElastic={0.4}
              onDragEnd={(_, info) => {
                if (info.offset.x < -80) next();
                else if (info.offset.x > 80) prev();
              }}
              className="max-h-full max-w-full object-contain rounded-2xl select-none"
              draggable={false}
            />

            {total > 1 && (
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); next(); }}
                aria-label="Next photo"
                className="hidden md:flex absolute right-5 w-12 h-12 rounded-full bg-white/10 hover:bg-white/20 text-white items-center justify-center transition-colors"
              >
                <ChevronRight size={26} />
              </button>
            )}
          </div>

          {total > 1 && (
            <div className="flex-shrink-0 px-4 py-3 flex gap-2 overflow-x-auto no-scrollbar justify-start md:justify-center">
              {urls.map((u, i) => (
                <button
                  key={u + i}
                  type="button"
                  onClick={() => onIndex(i)}
                  aria-label={`Go to photo ${i + 1}`}
                  className={`flex-none w-14 h-14 md:w-16 md:h-16 rounded-xl overflow-hidden border-2 transition-all ${
                    i === index ? "border-gold-500 opacity-100" : "border-transparent opacity-50 hover:opacity-100"
                  }`}
                >
                  <img src={u} alt="" className="w-full h-full object-cover" loading="lazy" />
                </button>
              ))}
            </div>
          )}
        </motion.div>
      )}
    </AnimatePresence>,
    document.body
  );
}

/* ------------------------------------------------------------------ */
/* Gallery section                                                     */
/* ------------------------------------------------------------------ */
export default function PhotoGallery({ gallery = [] }) {
  const [active, setActive] = useState(null);
  const close = useCallback(() => setActive(null), []);

  if (!gallery.length) return null;

  const urls = gallery.map((img) => getImageUrl(img.url || img)).filter(Boolean);
  if (!urls.length) return null;

  const feature = urls.length >= 5;
  const shown = feature ? (urls.length >= 9 ? 9 : 5) : urls.length;
  const visible = urls.slice(0, shown);
  const remaining = urls.length - shown;

  const Tile = ({ url, i, className }) => {
    const last = i === visible.length - 1 && remaining > 0;
    return (
      <button
        type="button"
        onClick={() => setActive(i)}
        className={`relative overflow-hidden rounded-2xl group bg-gray-100 ${className}`}
        aria-label={`Open photo ${i + 1}`}
      >
        <img
          src={url}
          alt={`Gallery ${i + 1}`}
          loading="lazy"
          className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110"
        />
        <div className="absolute inset-0 bg-navy-900/0 group-hover:bg-navy-900/15 transition-colors" />
        {last && (
          <div className="absolute inset-0 bg-navy-900/70 flex items-center justify-center text-white font-display font-bold text-lg">
            +{remaining} more
          </div>
        )}
      </button>
    );
  };

  return (
    <SectionCard
      id="sec-photos"
      icon={Images}
      title="Photos"
      subtitle={`${urls.length} photo${urls.length > 1 ? "s" : ""} from the business`}
    >
      {feature ? (
        <div className="grid grid-cols-2 sm:grid-cols-4 auto-rows-[7rem] sm:auto-rows-[9.5rem] gap-2.5">
          {visible.map((u, i) => (
            <Tile key={u + i} url={u} i={i} className={i === 0 ? "col-span-2 row-span-2" : ""} />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
          {visible.map((u, i) => (
            <Tile key={u + i} url={u} i={i} className="aspect-[4/3]" />
          ))}
        </div>
      )}

      <Lightbox urls={urls} index={active} onClose={close} onIndex={setActive} />
    </SectionCard>
  );
}
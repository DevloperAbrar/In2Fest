import React, { useState } from "react";
import { X, ChevronLeft, ChevronRight } from "lucide-react";
import { useScrollReveal } from "../../../hooks/useScrollReveal";

function Reveal({ children, delay = 0, className = "" }) {
  const [ref, visible] = useScrollReveal();
  return (
    <div
      ref={ref}
      style={{ transitionDelay: `${delay}ms` }}
      className={`transition-all duration-700 ease-out ${visible ? "opacity-100 scale-100" : "opacity-0 scale-95"} ${className}`}
    >
      {children}
    </div>
  );
}

export default function GallerySection({ venue }) {
  const gallery = venue.gallery || [];
  const [lightbox, setLightbox] = useState(null);
  if (gallery.length === 0) return null;
  const theme = venue.theme_color || "#7c3aed";

  const prev = () => setLightbox((l) => (l - 1 + gallery.length) % gallery.length);
  const next = () => setLightbox((l) => (l + 1) % gallery.length);

  return (
    <section id="gallery" className="relative py-28 bg-white dark:bg-stone-950 overflow-hidden">
      <div
        className="absolute top-0 right-0 w-1/3 h-full opacity-[0.03] pointer-events-none"
        style={{ background: `radial-gradient(ellipse at top right, ${theme}, transparent 60%)` }}
      />

      <div className="max-w-7xl mx-auto px-6">
        <Reveal className="text-center mb-20">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="h-px w-8" style={{ backgroundColor: theme }} />
            <span className="text-sm font-semibold uppercase tracking-widest" style={{ color: theme }}>Our Space</span>
            <div className="h-px w-8" style={{ backgroundColor: theme }} />
          </div>
          <h2 className="text-4xl md:text-5xl font-extrabold text-stone-900 dark:text-white" style={{ letterSpacing: "-0.02em" }}>Gallery</h2>
        </Reveal>

        {/* Masonry grid */}
        <div className="columns-2 md:columns-3 lg:columns-4 gap-3 space-y-3">
          {gallery.map((img, idx) => (
            <Reveal key={img.id} delay={idx * 50}>
              <div
                onClick={() => setLightbox(idx)}
                className="break-inside-avoid cursor-pointer overflow-hidden rounded-2xl group relative"
              >
                <img
                  src={img.url}
                  alt=""
                  className="w-full object-cover transition-all duration-500 group-hover:scale-110 group-hover:brightness-90"
                />
                <div
                  className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center rounded-2xl"
                  style={{ background: `${theme}33` }}
                >
                  <div className="w-10 h-10 rounded-full bg-white/90 flex items-center justify-center shadow-lg">
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke={theme} strokeWidth="2.5">
                      <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" />
                    </svg>
                  </div>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </div>

      {/* Lightbox */}
      {lightbox !== null && (
        <div
          className="fixed inset-0 z-50 bg-black/95 flex items-center justify-center p-4"
          onClick={() => setLightbox(null)}
        >
          <button
            className="absolute top-5 right-5 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors"
            onClick={() => setLightbox(null)}
          >
            <X size={20} />
          </button>

          {gallery.length > 1 && (
            <>
              <button
                className="absolute left-5 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors"
                onClick={(e) => { e.stopPropagation(); prev(); }}
              >
                <ChevronLeft size={20} />
              </button>
              <button
                className="absolute right-5 w-10 h-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center text-white transition-colors"
                onClick={(e) => { e.stopPropagation(); next(); }}
              >
                <ChevronRight size={20} />
              </button>
            </>
          )}

          <img
            src={gallery[lightbox]?.url}
            alt=""
            className="max-h-[85vh] max-w-[85vw] rounded-2xl object-contain shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          />
          <div className="absolute bottom-5 text-white/50 text-sm tabular-nums">
            {lightbox + 1} / {gallery.length}
          </div>
        </div>
      )}

      {/* Bottom wave */}
      <div className="absolute bottom-0 left-0 right-0 pointer-events-none">
        <svg viewBox="0 0 1440 80" preserveAspectRatio="none" className="w-full h-16 block">
          <path d="M0,0 L1440,60 L1440,80 L0,80 Z" className="fill-stone-50 dark:fill-stone-900" />
        </svg>
      </div>
    </section>
  );
}
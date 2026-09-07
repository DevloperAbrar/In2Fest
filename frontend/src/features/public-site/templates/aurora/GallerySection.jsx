import React, { useState } from "react";
import { X, ChevronLeft, ChevronRight } from "lucide-react";
import { useScrollReveal } from "../../../../hooks/useScrollReveal";

function Reveal({ children, delay = 0, className = "" }) {
  const [ref, visible] = useScrollReveal();
  return (
    <div
      ref={ref}
      className={`transition-all duration-800 ease-out ${className}`}
      style={{ transitionDelay: `${delay}ms`, opacity: visible ? 1 : 0, transform: visible ? "none" : "scale(0.96)" }}
    >
      {children}
    </div>
  );
}

export default function GallerySection({ venue }) {
  const gallery = venue.gallery || [];
  const [lightbox, setLightbox] = useState(null);
  if (!gallery.length) return null;
  const theme = venue.theme_color || "#a855f7";

  const prev = () => setLightbox((l) => (l - 1 + gallery.length) % gallery.length);
  const next = () => setLightbox((l) => (l + 1) % gallery.length);

  return (
    <section
      id="gallery"
      className="relative py-32 overflow-hidden"
      style={{ background: "linear-gradient(180deg, rgb(12,4,28) 0%, rgb(5,0,15) 100%)", fontFamily: "'Inter', sans-serif" }}
    >
      <div className="max-w-7xl mx-auto px-6">
        <Reveal className="mb-20">
          <p className="text-xs tracking-[0.4em] uppercase font-medium mb-4" style={{ color: theme }}>Our Space</p>
          <h2 className="text-5xl md:text-6xl font-bold text-white" style={{ fontFamily: "'Playfair Display', serif", letterSpacing: "-0.02em" }}>Gallery</h2>
        </Reveal>

        <div className="columns-2 md:columns-3 gap-3 space-y-3">
          {gallery.map((img, idx) => (
            <Reveal key={img.id || idx} delay={idx * 40}>
              <div onClick={() => setLightbox(idx)} className="break-inside-avoid overflow-hidden cursor-pointer relative group rounded-xl">
                <img src={img.url} alt="" className="w-full object-cover transition-all duration-700 group-hover:scale-105 group-hover:brightness-75" />
                <div
                  className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-all duration-300 flex items-center justify-center rounded-xl"
                  style={{ background: `${theme}22` }}
                >
                  <div className="w-10 h-10 rounded-full border border-white/60 flex items-center justify-center">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5">
                      <path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7" />
                    </svg>
                  </div>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </div>

      {lightbox !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.97)" }} onClick={() => setLightbox(null)}>
          <button onClick={() => setLightbox(null)} className="absolute top-6 right-6 w-10 h-10 rounded-full border border-white/20 flex items-center justify-center text-white/70 hover:text-white transition-all">
            <X size={18} />
          </button>
          {gallery.length > 1 && (
            <>
              <button onClick={(e) => { e.stopPropagation(); prev(); }} className="absolute left-6 w-10 h-10 rounded-full border border-white/20 flex items-center justify-center text-white/70 hover:text-white transition-all">
                <ChevronLeft size={18} />
              </button>
              <button onClick={(e) => { e.stopPropagation(); next(); }} className="absolute right-6 w-10 h-10 rounded-full border border-white/20 flex items-center justify-center text-white/70 hover:text-white transition-all">
                <ChevronRight size={18} />
              </button>
            </>
          )}
          <img src={gallery[lightbox]?.url} alt="" className="max-h-[85vh] max-w-[85vw] rounded-xl object-contain" onClick={(e) => e.stopPropagation()} />
          <div className="absolute bottom-6 text-white/30 text-xs tracking-widest tabular-nums">{lightbox + 1} / {gallery.length}</div>
        </div>
      )}

      <style>{`@import url('https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700;800;900&family=Inter:wght@300;400;500&display=swap');`}</style>
    </section>
  );
}
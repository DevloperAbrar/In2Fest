import React, { useState } from "react";
import { X, ChevronLeft, ChevronRight } from "lucide-react";
import { useScrollReveal } from "../../../../hooks/useScrollReveal";

function Reveal({ children, delay = 0, className = "" }) {
  const [ref, visible] = useScrollReveal();
  return (
    <div
      ref={ref}
      className={`transition-all duration-800 ease-out ${className}`}
      style={{ transitionDelay: `${delay}ms`, opacity: visible ? 1 : 0, transform: visible ? "none" : "scale(0.97)" }}
    >
      {children}
    </div>
  );
}

export default function GallerySection({ venue }) {
  const gallery = venue.gallery || [];
  const [lightbox, setLightbox] = useState(null);
  if (!gallery.length) return null;
  const theme = venue.theme_color || "#c2410c";

  const prev = () => setLightbox((l) => (l - 1 + gallery.length) % gallery.length);
  const next = () => setLightbox((l) => (l + 1) % gallery.length);

  return (
    <section
      id="gallery"
      className="relative py-32 overflow-hidden"
      style={{ backgroundColor: "#faf7f2", fontFamily: "'DM Sans', sans-serif" }}
    >
      <div className="max-w-7xl mx-auto px-6">
        <Reveal className="text-center mb-20">
          <span className="inline-block text-xs tracking-[0.35em] uppercase font-semibold py-1.5 px-4 rounded-full mb-4" style={{ color: theme, backgroundColor: `${theme}12` }}>
            Our Space
          </span>
          <h2 className="font-bold text-stone-900" style={{ fontFamily: "'DM Serif Display', serif", fontSize: "clamp(2.2rem, 4vw, 3.5rem)", letterSpacing: "-0.025em" }}>
            Gallery
          </h2>
        </Reveal>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {gallery.map((img, idx) => (
            <Reveal key={img.id || idx} delay={idx * 50} className={idx === 0 ? "col-span-2 row-span-2" : ""}>
              <div
                onClick={() => setLightbox(idx)}
                className="overflow-hidden cursor-pointer group relative"
                style={{ borderRadius: idx === 0 ? "32px" : "20px", height: idx === 0 ? "400px" : "190px" }}
              >
                <img src={img.url} alt="" className="w-full h-full object-cover transition-all duration-700 group-hover:scale-110" />
                <div
                  className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-center justify-center"
                  style={{ background: `${theme}33` }}
                >
                  <div className="w-10 h-10 rounded-full bg-white flex items-center justify-center shadow-lg">
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={theme} strokeWidth="2.5">
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/95" onClick={() => setLightbox(null)}>
          <button onClick={() => setLightbox(null)} className="absolute top-6 right-6 w-10 h-10 rounded-full bg-white/10 text-white flex items-center justify-center hover:bg-white/20 transition-colors">
            <X size={18} />
          </button>
          {gallery.length > 1 && (
            <>
              <button onClick={(e) => { e.stopPropagation(); prev(); }} className="absolute left-6 w-10 h-10 rounded-full bg-white/10 text-white flex items-center justify-center hover:bg-white/20 transition-colors">
                <ChevronLeft size={18} />
              </button>
              <button onClick={(e) => { e.stopPropagation(); next(); }} className="absolute right-6 w-10 h-10 rounded-full bg-white/10 text-white flex items-center justify-center hover:bg-white/20 transition-colors">
                <ChevronRight size={18} />
              </button>
            </>
          )}
          <img src={gallery[lightbox]?.url} alt="" className="max-h-[85vh] max-w-[85vw] rounded-2xl object-contain" onClick={(e) => e.stopPropagation()} />
          <div className="absolute bottom-6 text-white/40 text-xs tabular-nums">{lightbox + 1} / {gallery.length}</div>
        </div>
      )}

      <style>{`@import url('https://fonts.googleapis.com/css2?family=DM+Serif+Display&family=DM+Sans:wght@400;500&display=swap');`}</style>
    </section>
  );
}
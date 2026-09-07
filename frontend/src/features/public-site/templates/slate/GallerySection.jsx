import React, { useState } from "react";
import { X, ChevronLeft, ChevronRight } from "lucide-react";
import { useScrollReveal } from "../../../../hooks/useScrollReveal";

function Reveal({ children, delay = 0, className = "" }) {
  const [ref, visible] = useScrollReveal();
  return (
    <div
      ref={ref}
      className={`transition-all duration-900 ease-out ${className}`}
      style={{ transitionDelay: `${delay}ms`, opacity: visible ? 1 : 0, transform: visible ? "none" : "translateY(24px)" }}
    >
      {children}
    </div>
  );
}

export default function GallerySection({ venue }) {
  const gallery = venue.gallery || [];
  const [lightbox, setLightbox] = useState(null);
  if (!gallery.length) return null;
  const theme = venue.theme_color || "#2563eb";

  const prev = () => setLightbox((l) => (l - 1 + gallery.length) % gallery.length);
  const next = () => setLightbox((l) => (l + 1) % gallery.length);

  return (
    <section
      id="gallery"
      className="relative py-32 bg-white overflow-hidden"
      style={{ fontFamily: "'Space Grotesk', sans-serif" }}
    >
      <div className="max-w-6xl mx-auto px-8 md:px-16">
        <Reveal className="mb-20">
          <div className="text-[100px] font-black leading-none select-none mb-2" style={{ color: "#f5f5f5", letterSpacing: "-0.04em" }}>04</div>
          <div className="flex items-center gap-3 mb-4">
            <div className="h-0.5 w-8" style={{ backgroundColor: theme }} />
            <span className="text-xs tracking-[0.4em] uppercase font-medium" style={{ color: theme }}>Gallery</span>
          </div>
          <h2 className="text-4xl md:text-5xl font-black text-gray-900" style={{ letterSpacing: "-0.03em" }}>Our Space</h2>
        </Reveal>

        <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
          {gallery.map((img, idx) => (
            <Reveal key={img.id || idx} delay={idx * 40}>
              <div onClick={() => setLightbox(idx)} className="overflow-hidden cursor-pointer group aspect-square relative" style={{ borderRadius: "2px" }}>
                <img src={img.url} alt="" className="w-full h-full object-cover transition-all duration-700 group-hover:scale-105" />
                <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 flex items-end p-4" style={{ background: "linear-gradient(to top, rgba(0,0,0,0.6) 0%, transparent 60%)" }}>
                  <span className="text-white text-xs font-medium uppercase tracking-widest">{idx + 1}</span>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </div>

      {lightbox !== null && (
        <div className="fixed inset-0 z-50 bg-black flex items-center justify-center" onClick={() => setLightbox(null)}>
          <button onClick={() => setLightbox(null)} className="absolute top-6 right-6 text-white/40 hover:text-white transition-colors p-2"><X size={20} /></button>
          {gallery.length > 1 && (
            <>
              <button onClick={(e) => { e.stopPropagation(); prev(); }} className="absolute left-6 text-white/40 hover:text-white transition-colors p-2"><ChevronLeft size={24} /></button>
              <button onClick={(e) => { e.stopPropagation(); next(); }} className="absolute right-6 text-white/40 hover:text-white transition-colors p-2"><ChevronRight size={24} /></button>
            </>
          )}
          <img src={gallery[lightbox]?.url} alt="" className="max-h-[85vh] max-w-[85vw] object-contain" onClick={(e) => e.stopPropagation()} />
          <div className="absolute bottom-6 text-white/25 text-xs tabular-nums tracking-widest">{lightbox + 1} / {gallery.length}</div>
        </div>
      )}

      <style>{`@import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@300;400;500;600;700&display=swap');`}</style>
    </section>
  );
}
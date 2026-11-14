import React, { useState } from "react";
import { X, ChevronLeft, ChevronRight } from "lucide-react";
import { ForgeStyles, Reveal, FONT_HEAD, FONT_BODY } from "./shared.jsx";

export default function GallerySection({ venue }) {
  const gallery = venue.gallery || [];
  const [lightbox, setLightbox] = useState(null);
  if (!gallery.length) return null;
  const theme = venue.theme_color || "#facc15";

  const prev = () => setLightbox((l) => (l - 1 + gallery.length) % gallery.length);
  const next = () => setLightbox((l) => (l + 1) % gallery.length);

  return (
    <section id="gallery" className="relative py-28 md:py-36 overflow-hidden" style={{ background: "#0f0f0f", fontFamily: FONT_BODY }}>
      <ForgeStyles />
      <div className="max-w-7xl mx-auto px-6">
        <Reveal className="mb-16">
          <p className="text-xs tracking-[0.4em] uppercase font-bold mb-4" style={{ color: theme }}>In Action</p>
          <h2 className="uppercase text-white font-black leading-[0.9]" style={{ fontFamily: FONT_HEAD, fontSize: "clamp(2.6rem, 6vw, 4.8rem)" }}>
            Our <span style={{ color: theme }}>Gallery</span>
          </h2>
        </Reveal>

        <div className="columns-2 md:columns-3 gap-3">
          {gallery.map((img, idx) => (
            <Reveal key={img.id || idx} delay={(idx % 3) * 70} className="mb-3 break-inside-avoid">
              <div onClick={() => setLightbox(idx)} className="group relative overflow-hidden cursor-pointer">
                <img src={img.url} alt="" loading="lazy" className="w-full object-cover grayscale-[40%] transition-all duration-700 group-hover:grayscale-0 group-hover:scale-105" />
                <div className="absolute inset-x-0 bottom-0 h-1 origin-left scale-x-0 transition-transform duration-500 group-hover:scale-x-100" style={{ background: theme }} />
              </div>
            </Reveal>
          ))}
        </div>
      </div>

      {lightbox !== null && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: "rgba(0,0,0,0.96)" }} onClick={() => setLightbox(null)}>
          <button onClick={() => setLightbox(null)} className="absolute top-6 right-6 w-11 h-11 border border-white/25 flex items-center justify-center text-white/80 hover:bg-white hover:text-black transition-all">
            <X size={18} />
          </button>
          {gallery.length > 1 && (
            <>
              <button onClick={(e) => { e.stopPropagation(); prev(); }} className="absolute left-6 w-11 h-11 border border-white/25 flex items-center justify-center text-white/80 hover:bg-white hover:text-black transition-all">
                <ChevronLeft size={18} />
              </button>
              <button onClick={(e) => { e.stopPropagation(); next(); }} className="absolute right-6 w-11 h-11 border border-white/25 flex items-center justify-center text-white/80 hover:bg-white hover:text-black transition-all">
                <ChevronRight size={18} />
              </button>
            </>
          )}
          <img src={gallery[lightbox]?.url} alt="" className="max-h-[85vh] max-w-[85vw] object-contain" onClick={(e) => e.stopPropagation()} />
          <div className="absolute bottom-6 text-white/40 text-xs tracking-widest tabular-nums">{lightbox + 1} / {gallery.length}</div>
        </div>
      )}
    </section>
  );
}
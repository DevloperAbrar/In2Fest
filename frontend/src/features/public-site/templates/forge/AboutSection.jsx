import React from "react";
import { ForgeStyles, Reveal, AnimatedValue, INK, FONT_HEAD, FONT_BODY } from "./shared.jsx";

export default function AboutSection({ venue }) {
  if (!venue.about_text) return null;
  const theme = venue.theme_color || "#facc15";
  const highlights = venue.about_highlights || [];

  return (
    <section id="about" className="relative py-28 md:py-36 overflow-hidden" style={{ background: "#0f0f0f", fontFamily: FONT_BODY }}>
      <ForgeStyles />
      <div
        className="absolute -left-10 top-10 select-none pointer-events-none uppercase font-black leading-none opacity-[0.04] text-white whitespace-nowrap"
        style={{ fontFamily: FONT_HEAD, fontSize: "clamp(8rem, 22vw, 20rem)" }}
      >
        About
      </div>

      <div className="relative max-w-7xl mx-auto px-6 grid grid-cols-1 lg:grid-cols-2 gap-16 lg:gap-24 items-center">
        <Reveal from="left">
          <div className="relative">
            <div className="absolute -bottom-5 -right-5 w-full h-full" style={{ border: `2px solid ${theme}` }} />
            {venue.hero_image_url ? (
              <img src={venue.hero_image_url} alt={venue.hall_name} className="relative w-full h-[520px] object-cover" style={{ filter: "grayscale(0.2) contrast(1.05)" }} />
            ) : (
              <div className="relative w-full h-[520px] flex items-center justify-center text-9xl font-black" style={{ background: `${theme}22`, color: theme, fontFamily: FONT_HEAD }}>
                {venue.hall_name?.[0]}
              </div>
            )}
            {highlights[0] && (
              <div className="absolute -top-6 -left-4 md:-left-8 px-6 py-5 forge-anim" style={{ background: theme, color: INK, animation: "forgeFloat 6s ease-in-out infinite" }}>
                <p className="text-4xl font-black leading-none" style={{ fontFamily: FONT_HEAD }}>
                  <AnimatedValue value={highlights[0].value || "5.0"} />
                </p>
                <p className="text-xs font-bold uppercase tracking-wider mt-1">{highlights[0].title}</p>
              </div>
            )}
          </div>
        </Reveal>

        <div className="space-y-8">
          <Reveal>
            <p className="text-xs tracking-[0.4em] uppercase font-bold" style={{ color: theme }}>Our Story</p>
          </Reveal>
          <Reveal delay={100}>
            <h2 className="uppercase text-white font-black leading-[0.9]" style={{ fontFamily: FONT_HEAD, fontSize: "clamp(2.6rem, 6vw, 4.8rem)" }}>
              About <span style={{ color: theme }}>{venue.hall_name}</span>
            </h2>
          </Reveal>
          <Reveal delay={200}>
            <p className="text-white/60 leading-[1.9] text-base whitespace-pre-line">{venue.about_text}</p>
          </Reveal>
          {highlights.length > 1 && (
            <Reveal delay={300}>
              <div className="grid grid-cols-2 gap-px bg-white/10 border border-white/10">
                {highlights.slice(1).map((h, i) => (
                  <div key={i} className="p-6" style={{ background: "#0f0f0f" }}>
                    <p className="text-3xl font-black leading-none" style={{ color: theme, fontFamily: FONT_HEAD }}>
                      <AnimatedValue value={h.value || h.title} />
                    </p>
                    {h.value && <p className="text-xs uppercase tracking-wider text-white/50 mt-2">{h.title}</p>}
                  </div>
                ))}
              </div>
            </Reveal>
          )}
        </div>
      </div>
    </section>
  );
}
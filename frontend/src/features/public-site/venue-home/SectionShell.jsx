import React from "react";
import { useScrollReveal } from "../../../hooks/useScrollReveal";

/* ─── Reveal helper (fade + slide in when scrolled into view) ─── */
export function Reveal({ children, delay = 0, className = "", from = "bottom" }) {
  const [ref, visible] = useScrollReveal();
  const hiddenClass =
    from === "left" ? "opacity-0 -translate-x-8" : from === "right" ? "opacity-0 translate-x-8" : "opacity-0 translate-y-10";
  return (
    <div
      ref={ref}
      style={{ transitionDelay: `${delay}ms` }}
      className={`transition-all duration-700 ease-out ${visible ? "opacity-100 translate-x-0 translate-y-0" : hiddenClass} ${className}`}
    >
      {children}
    </div>
  );
}

/* ─── Section shell with alternating bg + waves (same look as the other sections) ─── */
const TONE_BG = ["bg-white dark:bg-stone-950", "bg-stone-50 dark:bg-stone-900"];
const TONE_WAVE = ["fill-white dark:fill-stone-950", "fill-stone-50 dark:fill-stone-900"];

export function SectionShell({ title, toneIdx = 0, nextTone, children, theme, subtitle }) {
  const bgClass = TONE_BG[toneIdx % 2];
  const nextIdx = nextTone !== undefined ? nextTone % 2 : (toneIdx + 1) % 2;
  const nextWaveClass = TONE_WAVE[nextIdx];

  return (
    <section className={`relative overflow-hidden ${bgClass}`}>
      <div className="absolute top-0 left-0 right-0 pointer-events-none rotate-180">
        <svg viewBox="0 0 1440 60" preserveAspectRatio="none" className="w-full h-12 block">
          <path d="M0,30 C360,60 1080,0 1440,30 L1440,60 L0,60 Z" className={nextWaveClass} />
        </svg>
      </div>

      <div className="max-w-6xl mx-auto px-6 pt-28 pb-24">
        <Reveal className="text-center mb-16">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="h-px w-8" style={{ backgroundColor: theme }} />
            <span className="text-sm font-semibold uppercase tracking-widest" style={{ color: theme }}>
              {subtitle || ""}
            </span>
            <div className="h-px w-8" style={{ backgroundColor: theme }} />
          </div>
          <h2
            className="text-4xl md:text-5xl font-extrabold text-stone-900 dark:text-white"
            style={{ letterSpacing: "-0.02em" }}
          >
            {title}
          </h2>
        </Reveal>
        {children}
      </div>

      <div className="absolute bottom-0 left-0 right-0 pointer-events-none">
        <svg viewBox="0 0 1440 60" preserveAspectRatio="none" className="w-full h-12 block">
          <path d="M0,30 C480,0 960,60 1440,30 L1440,60 L0,60 Z" className={nextWaveClass} />
        </svg>
      </div>
    </section>
  );
}
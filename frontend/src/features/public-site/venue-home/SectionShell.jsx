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

/* ─── Section shell with alternating background + waves ───
   Colours come from the --tone-0 / --tone-1 variables of the active site theme
   (see styles/tailwind.css), so every section matches Aurora, Bloom, Slate, Gym, Shop
   and Classic in both light and dark mode. */
export function SectionShell({ title, toneIdx = 0, nextTone, children, theme, subtitle }) {
  const tone = `var(--tone-${toneIdx % 2})`;
  const nextIdx = nextTone !== undefined ? nextTone % 2 : (toneIdx + 1) % 2;
  const nextFill = { fill: `var(--tone-${nextIdx})` };

  return (
    <section className="relative overflow-hidden text-stone-900 dark:text-stone-100" style={{ backgroundColor: tone }}>
      <div className="absolute top-0 left-0 right-0 pointer-events-none rotate-180">
        <svg viewBox="0 0 1440 60" preserveAspectRatio="none" className="w-full h-12 block">
          <path d="M0,30 C360,60 1080,0 1440,30 L1440,60 L0,60 Z" style={nextFill} />
        </svg>
      </div>

      <div className="max-w-6xl mx-auto px-5 sm:px-6 pt-24 sm:pt-28 pb-20 sm:pb-24">
        <Reveal className="text-center mb-12 sm:mb-16">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="h-px w-8" style={{ backgroundColor: theme }} />
            <span className="text-sm font-semibold uppercase tracking-widest" style={{ color: theme }}>
              {subtitle || ""}
            </span>
            <div className="h-px w-8" style={{ backgroundColor: theme }} />
          </div>
          <h2
            className="text-3xl sm:text-4xl md:text-5xl font-extrabold text-stone-900 dark:text-white"
            style={{ letterSpacing: "-0.02em" }}
          >
            {title}
          </h2>
        </Reveal>
        {children}
      </div>

      <div className="absolute bottom-0 left-0 right-0 pointer-events-none">
        <svg viewBox="0 0 1440 60" preserveAspectRatio="none" className="w-full h-12 block">
          <path d="M0,30 C480,0 960,60 1440,30 L1440,60 L0,60 Z" style={nextFill} />
        </svg>
      </div>
    </section>
  );
}
import React, { useEffect, useState } from "react";
import { ArrowRight, Star } from "lucide-react";
import { getBusinessLabel } from "../../../../lib/businessLabel";
import { useVenueReviews } from "../../../../hooks/useVenueReviews";
import { ForgeStyles, INK, FONT_HEAD, FONT_BODY } from "./shared.jsx";

const rise = (delay) => ({ animation: `forgeRise 0.95s cubic-bezier(.16,1,.3,1) ${delay}s both` });

export default function HeroSection({ venue }) {
  const theme = venue.theme_color || "#facc15";
  const [scrollY, setScrollY] = useState(0);
  const { averageRating, reviewCount } = useVenueReviews(venue.id);

  useEffect(() => {
    const onScroll = () => setScrollY(Math.min(window.scrollY, 900));
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const heading = (venue.hero_heading || venue.hall_name || "").trim();
  const words = heading.split(/\s+/);
  const lastWord = words.length > 1 ? words.pop() : null;
  const label = getBusinessLabel(venue) || venue.city || "";

  // Scrolling ticker under the hero: the services, or a simple fallback line.
  const names = (venue.services || []).filter((s) => s.visible !== false).map((s) => s.name).filter(Boolean);
  const base = names.length ? names : [venue.hall_name || "Welcome"];
  const row = Array.from({ length: Math.max(2, Math.ceil(10 / base.length)) }).flatMap(() => base);
  const parallax = venue.__preview ? 0 : scrollY * 0.3;

  return (
    <section id="home" className="relative min-h-screen flex flex-col overflow-hidden" style={{ background: INK, fontFamily: FONT_BODY }}>
      <ForgeStyles />

      <div
        className="absolute inset-0 will-change-transform"
        style={{
          backgroundImage: `url(${venue.hero_image_url || "/placeholder-venue.jpg"})`,
          backgroundSize: "cover",
          backgroundPosition: "center",
          transform: `translateY(${parallax}px) scale(1.08)`,
          filter: "grayscale(0.35) brightness(0.42) contrast(1.1)"
        }}
      />
      <div className="absolute inset-0" style={{ background: `linear-gradient(180deg, ${INK}cc 0%, ${INK}55 40%, ${INK} 100%)` }} />
      <div
        className="absolute -top-40 -right-40 w-[620px] h-[620px] rounded-full blur-[140px] opacity-25 forge-anim"
        style={{ background: theme, animation: "forgeFloat 9s ease-in-out infinite" }}
      />
      <div
        className="absolute inset-0 pointer-events-none opacity-[0.06]"
        style={{ backgroundImage: "linear-gradient(#fff 1px, transparent 1px), linear-gradient(90deg, #fff 1px, transparent 1px)", backgroundSize: "64px 64px" }}
      />

      <div className="relative z-10 flex-1 flex flex-col justify-end max-w-7xl w-full mx-auto px-6 pt-40 pb-16">
        {label && (
          <div className="forge-anim inline-flex items-center gap-3 mb-6 self-start" style={rise(0.1)}>
            <span className="w-2.5 h-2.5 rounded-full" style={{ background: theme, color: theme, animation: "forgePulse 2s infinite" }} />
            <span className="text-xs tracking-[0.35em] uppercase font-semibold text-white/80">{label}</span>
          </div>
        )}

        <h1
          className="forge-anim uppercase text-white"
          style={{ ...rise(0.2), fontFamily: FONT_HEAD, fontWeight: 900, fontSize: "clamp(3.2rem, 11vw, 9.5rem)", lineHeight: 0.86, letterSpacing: "-0.01em" }}
        >
          {words.join(" ")}
          {lastWord && (
            <>
              {" "}
              <span style={{ color: "transparent", WebkitTextStroke: `2px ${theme}` }}>{lastWord}</span>
            </>
          )}
        </h1>

        <div className="mt-10 flex flex-col lg:flex-row lg:items-end lg:justify-between gap-8">
          <div className="max-w-xl">
            {venue.hero_subheading && (
              <p className="forge-anim text-base md:text-lg text-white/70 leading-relaxed mb-8" style={rise(0.4)}>
                {venue.hero_subheading}
              </p>
            )}
            <div className="forge-anim flex flex-wrap gap-4" style={rise(0.55)}>
              <a
                href="#inquiry"
                className="group inline-flex items-center gap-3 px-8 py-4 text-sm font-bold uppercase tracking-wider transition-transform duration-300 hover:-translate-y-1"
                style={{ background: theme, color: INK, boxShadow: `0 14px 40px ${theme}55` }}
              >
                {venue.hero_button_text || "Get Started"}
                <ArrowRight size={18} className="transition-transform duration-300 group-hover:translate-x-1.5" />
              </a>
              <a
                href="#about"
                className="px-8 py-4 text-sm font-bold uppercase tracking-wider text-white border border-white/30 transition-all duration-300 hover:bg-white hover:text-black"
              >
                Explore
              </a>
            </div>
          </div>

          {averageRating && (
            <div className="forge-anim flex items-center gap-4 px-6 py-4 border border-white/15 backdrop-blur-md self-start lg:self-auto" style={{ ...rise(0.7), background: "rgba(255,255,255,0.05)" }}>
              <Star size={26} style={{ color: theme, fill: theme }} />
              <div>
                <p className="text-2xl font-extrabold text-white leading-none" style={{ fontFamily: FONT_HEAD }}>{Number(averageRating).toFixed(1)} / 5</p>
                <p className="text-xs text-white/50 mt-1">{reviewCount} {reviewCount === 1 ? "review" : "reviews"}</p>
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="relative z-10 overflow-hidden py-4" style={{ background: theme, color: INK }}>
        <div className="flex w-max forge-anim" style={{ animation: "forgeMarquee 30s linear infinite" }}>
          {[...row, ...row].map((t, i) => (
            <span key={i} className="flex items-center gap-8 mx-8 text-xl md:text-2xl font-extrabold uppercase tracking-wider whitespace-nowrap" style={{ fontFamily: FONT_HEAD }}>
              {t}
              <span aria-hidden>✦</span>
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}
import React from "react";
import { ArrowRight, Star } from "lucide-react";
import { onAccent } from "../../../../lib/verticals";
import { getBusinessLabel } from "../../../../lib/businessLabel";
import { useVenueReviews } from "../../../../hooks/useVenueReviews";
import { AnimatedValue } from "../forge/shared.jsx";
import { TplStyles, rise } from "../shared/themed.jsx";

const MONO = "'JetBrains Mono', monospace";

export default function Hero({ venue, ui }) {
  const a = venue.theme_color;
  const label = getBusinessLabel(venue) || venue.city || "";
  const { averageRating, reviewCount } = useVenueReviews(venue.id);
  const hl = (venue.about_highlights || []).slice(0, 2);
  const box = { background: ui.card, border: `1px solid ${ui.border}`, borderRadius: "24px" };

  return (
    <section id="home" className="relative min-h-screen pt-36 pb-16 overflow-hidden" style={{ background: ui.bgs[0], color: ui.text, fontFamily: ui.body }}>
      <TplStyles fonts={ui.fonts} />
      <div className="absolute inset-0 pointer-events-none opacity-[0.07]" style={{ backgroundImage: "linear-gradient(#fff 1px,transparent 1px),linear-gradient(90deg,#fff 1px,transparent 1px)", backgroundSize: "56px 56px" }} />
      <div className="tpl-anim absolute -top-40 left-1/2 -translate-x-1/2 w-[760px] h-[460px] rounded-full blur-[130px]" style={{ background: a, animation: "tplGlow 8s ease-in-out infinite" }} />

      <div className="relative z-10 max-w-6xl mx-auto px-6 text-center">
        {label && (
          <span className="tpl-anim inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs uppercase tracking-widest" style={{ ...rise(0.1), fontFamily: MONO, border: `1px solid ${a}66`, color: a, background: `${a}14` }}>
            <span className="w-1.5 h-1.5 rounded-full" style={{ background: a }} /> {label}
          </span>
        )}
        <h1 className="tpl-anim mt-6 mx-auto max-w-4xl" style={{ ...rise(0.2), fontFamily: ui.head, fontWeight: 800, fontSize: "clamp(2.6rem,7vw,6rem)", lineHeight: 1.02, letterSpacing: "-0.035em", backgroundImage: "linear-gradient(180deg,#ffffff 25%,#8da2c8)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>
          {venue.hero_heading || venue.hall_name}
        </h1>
        {venue.hero_subheading && <p className="tpl-anim mt-6 mx-auto max-w-2xl text-lg leading-relaxed" style={{ ...rise(0.35), color: ui.muted }}>{venue.hero_subheading}</p>}
        <div className="tpl-anim mt-9 flex flex-wrap gap-4 justify-center" style={rise(0.5)}>
          <a href="#inquiry" className="group inline-flex items-center gap-2 px-8 py-4 rounded-xl text-sm font-bold transition-transform duration-300 hover:-translate-y-1" style={{ background: a, color: onAccent(a), boxShadow: `0 0 40px ${a}66` }}>
            {venue.hero_button_text || "Get Started"} <ArrowRight size={17} className="transition-transform group-hover:translate-x-1" />
          </a>
          <a href="#about" className="px-8 py-4 rounded-xl text-sm font-semibold border border-white/15 bg-white/5 hover:bg-white/10 transition-colors">Learn more</a>
        </div>

        <div className="tpl-anim mt-16 grid grid-cols-1 md:grid-cols-4 gap-4 text-left" style={rise(0.65)}>
          <div className="md:col-span-2 md:row-span-2 overflow-hidden relative min-h-[260px]" style={{ ...box, boxShadow: `0 0 60px ${a}33` }}>
            {venue.hero_image_url ? (
              <img src={venue.hero_image_url} alt={venue.hall_name} className="absolute inset-0 w-full h-full object-cover" />
            ) : (
              <div className="absolute inset-0 flex items-center justify-center text-8xl font-black" style={{ color: a }}>{venue.hall_name?.[0]}</div>
            )}
          </div>
          {hl.map((h, i) => (
            <div key={i} className="p-6" style={box}>
              <p className="text-xs uppercase tracking-widest" style={{ fontFamily: MONO, color: ui.muted }}>{h.title}</p>
              <p className="mt-3 text-4xl font-extrabold" style={{ color: a, fontFamily: ui.head }}><AnimatedValue value={h.value || "—"} /></p>
            </div>
          ))}
          {averageRating && (
            <div className="p-6 md:col-span-2" style={box}>
              <p className="text-xs uppercase tracking-widest" style={{ fontFamily: MONO, color: ui.muted }}>Rated by members</p>
              <p className="mt-3 flex items-center gap-3 text-4xl font-extrabold" style={{ fontFamily: ui.head }}>
                <Star size={28} style={{ color: a, fill: a }} /> {Number(averageRating).toFixed(1)}
                <span className="text-sm font-normal" style={{ color: ui.muted }}>({reviewCount})</span>
              </p>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
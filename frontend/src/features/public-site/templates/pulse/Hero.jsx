import React from "react";
import { ArrowRight, Star } from "lucide-react";
import { getBusinessLabel } from "../../../../lib/businessLabel";
import { useVenueReviews } from "../../../../hooks/useVenueReviews";
import { AnimatedValue } from "../forge/shared.jsx";
import { TplStyles, rise, splitTitle } from "../shared/themed.jsx";

export default function Hero({ venue, ui }) {
  const a = venue.theme_color;
  const label = getBusinessLabel(venue) || venue.city || "";
  const { averageRating, reviewCount } = useVenueReviews(venue.id);
  const { first, last } = splitTitle(venue);
  const hl = (venue.about_highlights || []).slice(0, 3);

  return (
    <section
      id="home"
      className="relative min-h-screen flex items-center overflow-hidden text-white"
      style={{ background: `linear-gradient(135deg, #060a22 0%, #11205f 52%, ${a} 150%)`, fontFamily: ui.body }}
    >
      <TplStyles fonts={ui.fonts} />
      <div className="tpl-anim absolute -top-32 -left-24 w-[520px] h-[520px] rounded-full blur-[130px]" style={{ background: a, animation: "tplGlow 7s ease-in-out infinite" }} />
      <div className="absolute bottom-0 right-0 w-[420px] h-[420px] rounded-full blur-[120px] opacity-30" style={{ background: "#7c3aed" }} />

      <div className="relative z-10 w-full max-w-7xl mx-auto px-6 pt-36 pb-20 grid lg:grid-cols-2 gap-14 items-center">
        <div>
          {label && (
            <span className="tpl-anim inline-flex items-center gap-2 px-4 py-2 rounded-full text-xs font-semibold tracking-wider uppercase border border-white/20 bg-white/10 backdrop-blur" style={rise(0.1)}>
              <span className="w-2 h-2 rounded-full" style={{ background: a }} /> {label}
            </span>
          )}
          <h1 className="tpl-anim mt-6" style={{ ...rise(0.2), fontFamily: ui.head, fontWeight: 700, fontSize: "clamp(2.6rem,6.2vw,5.4rem)", lineHeight: 1.04, letterSpacing: "-0.03em" }}>
            {first} {last && <span style={{ background: `linear-gradient(90deg, #fff, ${a})`, WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>{last}</span>}
          </h1>
          {venue.hero_subheading && <p className="tpl-anim mt-6 text-lg text-white/70 max-w-xl leading-relaxed" style={rise(0.35)}>{venue.hero_subheading}</p>}
          <div className="tpl-anim mt-9 flex flex-wrap gap-4" style={rise(0.5)}>
            <a href="#inquiry" className="group inline-flex items-center gap-2 px-8 py-4 rounded-full text-sm font-bold bg-white text-slate-900 transition-transform duration-300 hover:-translate-y-1">
              {venue.hero_button_text || "Get Started"} <ArrowRight size={17} className="transition-transform group-hover:translate-x-1" />
            </a>
            <a href="#about" className="px-8 py-4 rounded-full text-sm font-semibold border border-white/30 bg-white/5 backdrop-blur hover:bg-white/15 transition-colors">Learn more</a>
          </div>
          {hl.length > 0 && (
            <div className="tpl-anim mt-12 flex flex-wrap gap-4" style={rise(0.65)}>
              {hl.map((h, i) => (
                <div key={i} className="px-5 py-3 rounded-2xl border border-white/15 bg-white/10 backdrop-blur">
                  <p className="text-2xl font-bold leading-none"><AnimatedValue value={h.value || h.title} /></p>
                  {h.value && <p className="text-[11px] uppercase tracking-wider text-white/60 mt-1">{h.title}</p>}
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="tpl-anim relative" style={rise(0.3)}>
          <div className="absolute -inset-4 rounded-full opacity-50 blur-2xl" style={{ background: `linear-gradient(135deg, ${a}, #7c3aed)` }} />
          <div className="relative aspect-[4/5] max-w-md mx-auto overflow-hidden border-4 border-white/20" style={{ animation: "tplBlob 12s ease-in-out infinite" }}>
            {venue.hero_image_url ? (
              <img src={venue.hero_image_url} alt={venue.hall_name} className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-9xl font-bold" style={{ background: `${a}44` }}>{venue.hall_name?.[0]}</div>
            )}
          </div>
          {averageRating && (
            <div className="tpl-anim absolute left-0 md:-left-6 bottom-10 px-5 py-4 rounded-2xl border border-white/20 bg-white/15 backdrop-blur-xl flex items-center gap-3" style={{ animation: "tplFloat 6s ease-in-out infinite" }}>
              <Star size={22} style={{ color: "#fbbf24", fill: "#fbbf24" }} />
              <div>
                <p className="font-bold leading-none">{Number(averageRating).toFixed(1)} / 5</p>
                <p className="text-xs text-white/60 mt-1">{reviewCount} reviews</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
import React from "react";
import { getBusinessLabel } from "../../../../lib/businessLabel";
import { TplStyles, rise, splitTitle } from "../shared/themed.jsx";

export default function Hero({ venue, ui }) {
  const a = venue.theme_color;
  const label = getBusinessLabel(venue) || "";
  const { first, last } = splitTitle(venue);

  return (
    <section id="home" className="relative min-h-screen pt-32 pb-12 overflow-hidden" style={{ background: ui.bgs[0], color: ui.text, fontFamily: ui.body }}>
      <TplStyles fonts={ui.fonts} />
      <div className="max-w-7xl mx-auto px-6">
        <div className="tpl-anim flex items-center justify-between border-b pb-4 text-xs uppercase tracking-[0.25em]" style={{ ...rise(0.05), borderColor: ui.text }}>
          <span>{label || "Welcome"}</span>
          <span className="hidden sm:inline">{venue.city}</span>
          <span>Scroll ↓</span>
        </div>

        <div className="grid lg:grid-cols-12 gap-10 mt-12 items-end">
          <div className="lg:col-span-8">
            <h1 className="tpl-anim" style={{ ...rise(0.15), fontFamily: ui.head, fontWeight: 400, fontSize: "clamp(3.4rem,10.5vw,9.5rem)", lineHeight: 0.9, letterSpacing: "-0.03em" }}>
              {first} {last && <em style={{ color: a }}>{last}</em>}
            </h1>
            <div className="tpl-anim mt-10 flex flex-wrap items-center gap-8 text-sm font-semibold" style={rise(0.4)}>
              <a href="#inquiry" className="pb-1 border-b-2 transition-all hover:pr-3" style={{ borderColor: a }}>
                {venue.hero_button_text || "Book a visit"} →
              </a>
              <a href="#about" className="pb-1 border-b border-black/40 hover:border-black">Our story ↓</a>
            </div>
          </div>

          <div className="lg:col-span-4 tpl-anim" style={rise(0.3)}>
            {venue.hero_image_url ? (
              <img src={venue.hero_image_url} alt={venue.hall_name} className="w-full aspect-[3/4] object-cover" style={{ filter: "grayscale(0.15) contrast(1.05)" }} />
            ) : (
              <div className="w-full aspect-[3/4] flex items-center justify-center text-9xl" style={{ background: `${a}22`, color: a, fontFamily: ui.head }}>{venue.hall_name?.[0]}</div>
            )}
            {venue.hero_subheading && <p className="mt-4 text-xs leading-relaxed uppercase tracking-wider" style={{ color: ui.muted }}>{venue.hero_subheading}</p>}
          </div>
        </div>
      </div>
    </section>
  );
}
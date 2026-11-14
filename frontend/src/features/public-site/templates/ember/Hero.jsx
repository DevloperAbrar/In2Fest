import React from "react";
import { onAccent } from "../../../../lib/verticals";
import { getBusinessLabel } from "../../../../lib/businessLabel";
import { TplStyles, rise } from "../shared/themed.jsx";

export default function Hero({ venue, ui }) {
  const a = venue.theme_color;
  const label = getBusinessLabel(venue) || venue.city || "";
  const services = (venue.services || []).filter((s) => s.visible !== false);
  const cardA = services[0] || { name: "Start Today", description: "Take the first step. Talk to us and we will guide you." };
  const cardB = services[1] || { name: "Know More", description: "See what we offer and what makes us different." };

  return (
    <section id="home" className="relative" style={{ background: "#0a0a0a", fontFamily: ui.body }}>
      <TplStyles fonts={ui.fonts} />
      <div className="relative min-h-screen flex items-center justify-center text-center overflow-hidden px-6">
        <div className="absolute inset-0" style={{ backgroundImage: `url(${venue.hero_image_url || "/placeholder-venue.jpg"})`, backgroundSize: "cover", backgroundPosition: "center", filter: "brightness(0.42) contrast(1.1)" }} />
        <div className="absolute inset-0" style={{ background: "linear-gradient(180deg, rgba(10,10,10,.55), rgba(10,10,10,.9))" }} />
        <div className="relative z-10 max-w-5xl pt-24 pb-40 text-white">
          {label && (
            <p className="tpl-anim inline-flex items-center gap-4 text-sm font-semibold uppercase tracking-[0.35em]" style={{ ...rise(0.1), color: a }}>
              <span className="w-10 h-px" style={{ background: a }} /> {label} <span className="w-10 h-px" style={{ background: a }} />
            </p>
          )}
          <h1 className="tpl-anim uppercase mt-6" style={{ ...rise(0.2), fontFamily: ui.head, fontWeight: 700, fontSize: "clamp(3rem,9vw,8rem)", lineHeight: 0.95 }}>
            {venue.hero_heading || venue.hall_name}
          </h1>
          {venue.hero_subheading && <p className="tpl-anim mt-6 text-lg text-white/70 max-w-2xl mx-auto leading-relaxed" style={rise(0.4)}>{venue.hero_subheading}</p>}
          <a href="#inquiry" className="tpl-anim inline-block mt-10 px-10 py-4 text-sm font-bold uppercase tracking-widest border-2 text-white transition-all duration-300 hover:text-black hover:bg-white" style={{ ...rise(0.55), borderColor: "#fff" }}>
            {venue.hero_button_text || "Join Now"}
          </a>
        </div>
      </div>

      <div className="relative z-10 max-w-6xl mx-auto px-6 -mt-28 grid md:grid-cols-2">
        <div className="tpl-anim p-10 md:p-12" style={{ ...rise(0.6), background: a, color: onAccent(a) }}>
          <h3 className="uppercase" style={{ fontFamily: ui.head, fontWeight: 700, fontSize: "2.2rem" }}>{cardA.name}</h3>
          <p className="mt-4 text-sm leading-relaxed opacity-80 line-clamp-3">{cardA.description}</p>
          <a href="#inquiry" className="inline-block mt-6 px-7 py-3 text-xs font-bold uppercase tracking-widest border-2" style={{ borderColor: onAccent(a) }}>Join Now</a>
        </div>
        <div className="tpl-anim p-10 md:p-12 text-white" style={{ ...rise(0.75), background: "#161616", borderTop: "1px solid rgba(255,255,255,.08)" }}>
          <h3 className="uppercase" style={{ fontFamily: ui.head, fontWeight: 700, fontSize: "2.2rem" }}>{cardB.name}</h3>
          <p className="mt-4 text-sm leading-relaxed text-white/60 line-clamp-3">{cardB.description}</p>
          <a href="#about" className="inline-block mt-6 px-7 py-3 text-xs font-bold uppercase tracking-widest border-2 border-white/60 hover:bg-white hover:text-black transition-colors">Know More</a>
        </div>
      </div>
      <div className="h-16" />
    </section>
  );
}
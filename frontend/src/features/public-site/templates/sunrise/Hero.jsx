import React from "react";
import { ArrowRight } from "lucide-react";
import { onAccent } from "../../../../lib/verticals";
import { getBusinessLabel } from "../../../../lib/businessLabel";
import { AnimatedValue } from "../forge/shared.jsx";
import { TplStyles, rise, splitTitle } from "../shared/themed.jsx";

export default function Hero({ venue, ui }) {
  const a = venue.theme_color;
  const label = getBusinessLabel(venue) || venue.city || "";
  const { first, last } = splitTitle(venue);
  const hl = (venue.about_highlights || []).slice(0, 4);
  const g = (venue.gallery || []).map((x) => x.url);
  const photos = [g[0], venue.hero_image_url, g[1]].filter(Boolean);
  const three = photos.length === 3;

  return (
    <section id="home" className="relative min-h-screen pt-36 pb-20 overflow-hidden" style={{ background: "linear-gradient(180deg,#fff8ee 0%,#ffffff 100%)", color: ui.text, fontFamily: ui.body }}>
      <TplStyles fonts={ui.fonts} />
      <div className="absolute -top-24 -left-24 w-[420px] h-[420px] rounded-full blur-[110px] opacity-30" style={{ background: a }} />
      <div className="absolute top-40 -right-24 w-[360px] h-[360px] rounded-full blur-[110px] opacity-25" style={{ background: "#fb923c" }} />

      <div className="relative z-10 max-w-6xl mx-auto px-6 text-center">
        {label && (
          <span className="tpl-anim inline-block px-5 py-2 rounded-full text-xs font-bold uppercase tracking-widest" style={{ ...rise(0.1), background: `${a}22`, color: a }}>{label}</span>
        )}
        <h1 className="tpl-anim mt-6 mx-auto max-w-4xl" style={{ ...rise(0.2), fontFamily: ui.head, fontWeight: 700, fontSize: "clamp(2.6rem,6.4vw,5.4rem)", lineHeight: 1.06, letterSpacing: "-0.03em" }}>
          {first}{" "}
          {last && (
            <span style={{ backgroundImage: `linear-gradient(transparent 62%, ${a}55 62%)` }}>{last}</span>
          )}
        </h1>
        {venue.hero_subheading && <p className="tpl-anim mt-6 mx-auto max-w-2xl text-lg leading-relaxed" style={{ ...rise(0.35), color: ui.muted }}>{venue.hero_subheading}</p>}
        <div className="tpl-anim mt-9 flex flex-wrap gap-4 justify-center" style={rise(0.5)}>
          <a href="#inquiry" className="group inline-flex items-center gap-2 px-8 py-4 rounded-full text-sm font-bold transition-transform duration-300 hover:-translate-y-1" style={{ background: a, color: onAccent(a), boxShadow: `0 14px 34px ${a}55` }}>
            {venue.hero_button_text || "Get Started"} <ArrowRight size={17} className="transition-transform group-hover:translate-x-1" />
          </a>
          <a href="#about" className="px-8 py-4 rounded-full text-sm font-semibold border-2 transition-colors hover:bg-black hover:text-white" style={{ borderColor: "#1c1917" }}>Our story</a>
        </div>

        {photos.length > 0 && (
          <div className={`tpl-anim mt-14 grid gap-4 ${three ? "grid-cols-3" : "grid-cols-1"}`} style={rise(0.65)}>
            {photos.map((src, i) => (
              <img key={i} src={src} alt="" className={`w-full object-cover shadow-xl ${three ? (i === 1 ? "h-72 md:h-[26rem] -translate-y-6" : "h-56 md:h-80") : "h-64 md:h-[26rem]"}`} style={{ borderRadius: "32px" }} />
            ))}
          </div>
        )}

        {hl.length > 0 && (
          <div className="mt-12 grid grid-cols-2 md:grid-cols-4 gap-4">
            {hl.map((h, i) => (
              <div key={i} className="p-5 rounded-3xl bg-white" style={{ boxShadow: "0 10px 40px rgba(0,0,0,0.06)" }}>
                <p className="text-3xl font-bold" style={{ color: a, fontFamily: ui.head }}><AnimatedValue value={h.value || h.title} /></p>
                {h.value && <p className="text-xs mt-1" style={{ color: ui.muted }}>{h.title}</p>}
              </div>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
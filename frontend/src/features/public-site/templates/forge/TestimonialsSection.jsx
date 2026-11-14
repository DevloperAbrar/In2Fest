import React from "react";
import { Star } from "lucide-react";
import { useVenueReviews } from "../../../../hooks/useVenueReviews";
import { ForgeStyles, Reveal, INK, FONT_HEAD, FONT_BODY } from "./shared.jsx";

export default function TestimonialsSection({ venue }) {
  // Same approved reviews that show on the vendor's Marketplace profile
  const { reviews: testimonials, averageRating, reviewCount } = useVenueReviews(venue.id);
  if (!testimonials.length) return null;
  const theme = venue.theme_color || "#facc15";

  return (
    <section id="testimonials" className="relative py-28 md:py-36 overflow-hidden" style={{ background: INK, fontFamily: FONT_BODY }}>
      <ForgeStyles />
      <div className="max-w-7xl mx-auto px-6">
        <Reveal className="mb-16">
          <p className="text-xs tracking-[0.4em] uppercase font-bold mb-4" style={{ color: theme }}>Reviews</p>
          <h2 className="uppercase text-white font-black leading-[0.9]" style={{ fontFamily: FONT_HEAD, fontSize: "clamp(2.6rem, 6vw, 4.8rem)" }}>
            What They <span style={{ color: theme }}>Say</span>
          </h2>
          {averageRating && (
            <p className="mt-5 flex items-center gap-2 text-sm text-white/50">
              <Star size={15} style={{ color: theme, fill: theme }} />
              <span className="font-bold text-white">{Number(averageRating).toFixed(1)}</span>
              <span>out of 5 · {reviewCount} {reviewCount === 1 ? "review" : "reviews"}</span>
            </p>
          )}
        </Reveal>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {testimonials.map((t, idx) => (
            <Reveal key={t.id || idx} delay={(idx % 3) * 100}>
              <div className="relative h-full flex flex-col p-8 border border-white/10 transition-all duration-500 hover:-translate-y-2" style={{ background: "#111" }}>
                <span className="absolute top-2 right-5 text-8xl font-black leading-none select-none" style={{ color: `${theme}22`, fontFamily: FONT_HEAD }}>”</span>
                <div className="flex gap-1 mb-5">
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Star key={i} size={15} style={i < (t.rating || 5) ? { color: theme, fill: theme } : { color: "#ffffff22", fill: "#ffffff22" }} />
                  ))}
                </div>
                <p className="text-white/65 leading-relaxed text-sm flex-1">{t.description}</p>

                {t.reply && (
                  <div className="mt-5 p-3 text-xs leading-relaxed text-white/50 border-l-2" style={{ borderColor: theme, background: "rgba(255,255,255,0.04)" }}>
                    <p className="font-semibold text-white/70 mb-0.5">Owner&apos;s reply</p>
                    {t.reply}
                  </div>
                )}

                <div className="flex items-center gap-3 mt-7 pt-6 border-t border-white/10">
                  <div className="w-11 h-11 flex items-center justify-center text-lg font-black flex-shrink-0" style={{ background: theme, color: INK, fontFamily: FONT_HEAD }}>
                    {t.name?.[0]?.toUpperCase()}
                  </div>
                  <div>
                    <p className="text-sm font-bold text-white">{t.name}</p>
                    {t.location && <p className="text-xs text-white/40 mt-0.5">{t.location}</p>}
                  </div>
                </div>
              </div>
            </Reveal>
          ))}
        </div>
      </div>
    </section>
  );
}
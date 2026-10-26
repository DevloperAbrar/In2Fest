import React, { useState } from "react";
import { Check } from "lucide-react";
import { useFetch } from "../../../../hooks/useFetch";
import { Reveal, SectionShell } from "../SectionShell.jsx";
import { inr } from "../../../../lib/verticals";

/* ─── helpers ─── */
function monthsOf(plan) {
  const unit = String(plan.duration_unit || "").toLowerCase();
  const v = Number(plan.duration_value || 0);
  if (unit.startsWith("year")) return v * 12;
  if (unit.startsWith("month")) return v;
  if (unit.startsWith("week")) return v / 4.345;
  if (unit.startsWith("day")) return v / 30;
  return 0;
}

function durationLabel(plan) {
  const unit = String(plan.duration_unit || "").toLowerCase().replace(/s$/, "");
  const v = Number(plan.duration_value || 0);
  return `${v} ${unit}${v > 1 ? "s" : ""}`;
}

/* ─── BMI quick check (lead magnet) ─── */
function BmiCard({ theme, onTrial }) {
  const [h, setH] = useState("");
  const [w, setW] = useState("");
  const hm = Number(h) / 100;
  const bmi = hm > 0 && Number(w) > 0 ? Number(w) / (hm * hm) : null;
  const label =
    bmi === null ? null : bmi < 18.5 ? "Underweight" : bmi < 25 ? "Healthy range" : bmi < 30 ? "Overweight" : "Obese range";
  const input =
    "w-full px-4 py-3 rounded-xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 text-sm text-stone-900 dark:text-white focus:outline-none focus:ring-2";

  return (
    <div className="mt-16 max-w-3xl mx-auto rounded-3xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 p-8 shadow-sm">
      <h3 className="text-xl font-extrabold text-stone-900 dark:text-white">Not sure where to start?</h3>
      <p className="text-sm text-stone-500 dark:text-stone-400 mt-1">Check your BMI, then let our trainers build your plan.</p>
      <div className="grid sm:grid-cols-3 gap-3 mt-5">
        <input className={input} inputMode="numeric" placeholder="Height (cm)" value={h} onChange={(e) => setH(e.target.value)} />
        <input className={input} inputMode="numeric" placeholder="Weight (kg)" value={w} onChange={(e) => setW(e.target.value)} />
        <div className="flex items-center justify-center rounded-xl font-extrabold text-lg text-white" style={{ backgroundColor: theme }}>
          {bmi ? bmi.toFixed(1) : "BMI"}
        </div>
      </div>
      {label && (
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <p className="text-sm font-semibold text-stone-700 dark:text-stone-200">{label}</p>
          {onTrial && (
            <button type="button" onClick={onTrial} className="px-5 py-2.5 rounded-full text-sm font-bold text-white" style={{ backgroundColor: theme }}>
              Get my personalised plan
            </button>
          )}
        </div>
      )}
    </div>
  );
}

/* ─── Membership plans: live from the Gym module, manual packages as fallback ─── */
export function GymPlans({ config, theme, toneIdx, venue, actions }) {
  const { data: plans } = useFetch(venue?.id ? `/public/gym/${venue.id}/plans` : null, { deps: [venue?.id] });
  const live = Array.isArray(plans) ? plans : [];
  const manual = config?.items || [];
  const onTrial = actions?.openTrial;
  if (live.length === 0 && manual.length === 0) return null;

  const cards =
    live.length > 0
      ? live.map((p) => {
          const months = monthsOf(p);
          return {
            id: p.id,
            name: p.name,
            duration: durationLabel(p),
            price: p.final_price,
            strike: p.price > p.final_price ? p.price : null,
            perMonth: months > 1 ? Math.round(p.final_price / months) : null,
            lines: String(p.description || "").split("\n").filter(Boolean),
            joining: p.joining_fee > 0 ? p.joining_fee : 0,
            popular: p.is_popular
          };
        })
      : manual.map((it, i) => ({
          id: it.id || i,
          name: it.title,
          duration: "",
          price: it.price,
          lines: String(it.description || "").split("\n").filter(Boolean),
          popular: /popular|best|premium/i.test(it.tag || ""),
          tag: it.tag
        }));

  return (
    <SectionShell title={config?.title || "Membership Plans"} toneIdx={toneIdx} theme={theme} subtitle="Join Today">
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
        {cards.map((c, idx) => (
          <Reveal key={c.id} delay={idx * 100}>
            <div
              className={`relative rounded-3xl p-8 border transition-all duration-300 hover:-translate-y-2 bg-white dark:bg-stone-800 ${
                c.popular ? "md:scale-105 border-transparent shadow-2xl" : "border-stone-100 dark:border-stone-700 shadow-sm hover:shadow-xl"
              }`}
              style={c.popular ? { boxShadow: `0 24px 48px -12px ${theme}55`, outline: `2px solid ${theme}` } : undefined}
            >
              {(c.popular || c.tag) && (
                <span className="absolute -top-3.5 left-7 text-[11px] font-bold text-white px-4 py-1.5 rounded-full shadow-lg uppercase tracking-wider" style={{ backgroundColor: theme }}>
                  {c.tag || "Most Popular"}
                </span>
              )}
              <h3 className="font-extrabold text-xl text-stone-900 dark:text-white mt-2">{c.name}</h3>
              {c.duration && <p className="text-xs uppercase tracking-widest text-stone-400 mt-1">{c.duration}</p>}

              <div className="mt-4 flex items-baseline gap-2">
                <span className="text-4xl font-extrabold" style={{ color: theme }}>
                  {typeof c.price === "number" ? inr(c.price) : c.price}
                </span>
                {c.strike && <span className="text-sm text-stone-400 line-through">{inr(c.strike)}</span>}
              </div>
              {c.perMonth && <p className="text-xs text-stone-500 dark:text-stone-400 mt-1">≈ {inr(c.perMonth)} / month</p>}
              {c.joining > 0 && <p className="text-xs text-stone-500 dark:text-stone-400 mt-1">+ {inr(c.joining)} joining fee</p>}

              {c.lines.length > 0 && (
                <ul className="mt-5 space-y-2.5">
                  {c.lines.map((l, i) => (
                    <li key={i} className="flex items-start gap-2.5 text-sm text-stone-600 dark:text-stone-300">
                      <Check size={16} className="mt-0.5 shrink-0" style={{ color: theme }} /> {l}
                    </li>
                  ))}
                </ul>
              )}

              {onTrial && (
                <button
                  type="button"
                  onClick={onTrial}
                  className="mt-7 w-full py-3 rounded-xl font-bold text-white transition-transform hover:scale-[1.02]"
                  style={{ backgroundColor: theme }}
                >
                  Join this plan
                </button>
              )}
            </div>
          </Reveal>
        ))}
      </div>
      <BmiCard theme={theme} onTrial={onTrial} />
    </SectionShell>
  );
}

/* ─── Programs: image tiles (Cardio, Strength, Yoga, Zumba...) ─── */
export function GymPrograms({ config, theme, toneIdx }) {
  const items = config?.items || [];
  if (!items.length) return null;
  return (
    <SectionShell title={config.title} toneIdx={toneIdx} theme={theme} subtitle="Train Your Way">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
        {items.map((it, idx) => (
          <Reveal key={it.id || idx} delay={idx * 80}>
            <div className="group relative aspect-[4/5] rounded-3xl overflow-hidden bg-stone-900 shadow-lg">
              {it.image_url ? (
                <img src={it.image_url} alt={it.title} loading="lazy" className="absolute inset-0 w-full h-full object-cover group-hover:scale-110 transition-transform duration-700" />
              ) : (
                <div className="absolute inset-0" style={{ background: `linear-gradient(145deg, ${theme}, #0c0a09)` }} />
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent" />
              <div className="absolute inset-x-0 bottom-0 p-6 text-white">
                {it.subtitle && (
                  <span className="inline-block mb-2 px-3 py-1 rounded-full text-[11px] font-bold uppercase tracking-wider" style={{ backgroundColor: theme }}>
                    {it.subtitle}
                  </span>
                )}
                <h3 className="text-2xl font-extrabold uppercase italic tracking-tight text-white">{it.title}</h3>
                {it.description && <p className="mt-1 text-sm text-white/80 line-clamp-3">{it.description}</p>}
                {it.price && <p className="mt-2 font-bold" style={{ color: theme }}>{it.price}</p>}
              </div>
            </div>
          </Reveal>
        ))}
      </div>
    </SectionShell>
  );
}

/* ─── Member transformations ─── */
export function GymTransformations({ config, theme, toneIdx }) {
  const items = config?.items || [];
  if (!items.length) return null;
  return (
    <SectionShell title={config.title} toneIdx={toneIdx} theme={theme} subtitle="Real Members. Real Results.">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {items.map((it, idx) => (
          <Reveal key={it.id || idx} delay={idx * 80}>
            <div className="rounded-3xl overflow-hidden bg-white dark:bg-stone-800 border border-stone-100 dark:border-stone-700 shadow-sm hover:shadow-xl transition-shadow">
              <div className="aspect-[4/5] bg-stone-200 dark:bg-stone-700">
                {it.image_url && <img src={it.image_url} alt={it.title} loading="lazy" className="w-full h-full object-cover" />}
              </div>
              <div className="p-5 flex items-center justify-between gap-3">
                <p className="font-bold text-stone-900 dark:text-white">{it.title}</p>
                {it.subtitle && (
                  <span className="px-3 py-1 rounded-full text-xs font-bold text-white whitespace-nowrap" style={{ backgroundColor: theme }}>
                    {it.subtitle}
                  </span>
                )}
              </div>
            </div>
          </Reveal>
        ))}
      </div>
    </SectionShell>
  );
}

/* ─── Trainers ─── */
export function GymTrainers({ config, theme, toneIdx }) {
  const items = config?.items || [];
  if (!items.length) return null;
  return (
    <SectionShell title={config.title} toneIdx={toneIdx} theme={theme} subtitle="Coaches">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-5">
        {items.map((it, idx) => (
          <Reveal key={it.id || idx} delay={idx * 80}>
            <div className="group relative aspect-[3/4] rounded-3xl overflow-hidden bg-stone-900 shadow-lg">
              {it.image_url ? (
                <img src={it.image_url} alt={it.title} loading="lazy" className="absolute inset-0 w-full h-full object-cover grayscale group-hover:grayscale-0 group-hover:scale-105 transition-all duration-500" />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center text-6xl font-black text-white/80" style={{ background: `linear-gradient(145deg, ${theme}, #0c0a09)` }}>
                  {it.title?.[0]}
                </div>
              )}
              <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-transparent" />
              <div className="absolute inset-x-0 bottom-0 p-4 text-white">
                <p className="font-extrabold">{it.title}</p>
                {it.subtitle && <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: theme }}>{it.subtitle}</p>}
                {it.description && (
                  <p className="mt-1 text-xs text-white/80 max-h-0 overflow-hidden group-hover:max-h-24 transition-all duration-500">{it.description}</p>
                )}
              </div>
            </div>
          </Reveal>
        ))}
      </div>
    </SectionShell>
  );
}
import React, { useEffect, useRef, useState } from "react";
import { Reveal, SectionShell } from "../SectionShell.jsx";
import { waLink } from "../../../../lib/verticals";

/* ─── Animated number: "1200+" counts up when it scrolls into view ─── */
export function CountUp({ value, className = "", style }) {
  const m = String(value ?? "").match(/^([^\d]*)([\d,.]+)(.*)$/);
  const ref = useRef(null);
  const [started, setStarted] = useState(false);
  const [n, setN] = useState(0);
  const target = m ? parseFloat(m[2].replace(/,/g, "")) : 0;

  useEffect(() => {
    if (!m || !ref.current) return undefined;
    const io = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) { setStarted(true); io.disconnect(); }
    }, { threshold: 0.4 });
    io.observe(ref.current);
    return () => io.disconnect();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (!started) return undefined;
    let raf;
    const t0 = performance.now();
    const tick = (t) => {
      const p = Math.min(1, (t - t0) / 1200);
      setN(target * (1 - Math.pow(1 - p, 3)));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [started, target]);

  if (!m) return <span ref={ref} className={className} style={style}>{value}</span>;
  const decimals = m[2].includes(".");
  return (
    <span ref={ref} className={className} style={style}>
      {m[1]}{decimals ? n.toFixed(1) : Math.round(n).toLocaleString("en-IN")}{m[3]}
    </span>
  );
}

/* ─── Stats band ─── */
export function Stats({ config, theme }) {
  const items = (config?.items || []).filter((i) => i.title || i.subtitle);
  if (!items.length) return null;
  return (
    <section className="px-6 py-14 text-white" style={{ background: `linear-gradient(135deg, #0c0a09, ${theme}dd)` }}>
      <div className="max-w-6xl mx-auto grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
        {items.slice(0, 4).map((it, idx) => (
          <Reveal key={it.id || idx} delay={idx * 80}>
            <CountUp value={it.subtitle} className="block text-4xl md:text-5xl font-extrabold" />
            <p className="mt-2 text-sm uppercase tracking-widest text-white/70">{it.title}</p>
          </Reveal>
        ))}
      </div>
    </section>
  );
}

/* ─── Offers (scrollable cards) ─── */
export function Offers({ config, theme, toneIdx, venue }) {
  const items = config?.items || [];
  if (!items.length) return null;
  return (
    <SectionShell title={config.title} toneIdx={toneIdx} theme={theme} subtitle="Deals">
      <div className="flex gap-4 overflow-x-auto snap-x snap-mandatory pb-4 -mx-6 px-6">
        {items.map((it, idx) => {
          const link = waLink(venue, `Hi, I want to claim this offer: ${it.title}`);
          return (
            <Reveal key={it.id || idx} delay={idx * 70} className="snap-start shrink-0">
              <div
                className="w-72 h-full rounded-3xl p-6 text-white shadow-xl flex flex-col"
                style={{ background: `linear-gradient(135deg, ${theme}, ${theme}99)` }}
              >
                {it.tag && (
                  <span className="self-start px-3 py-1 rounded-full bg-white/20 backdrop-blur text-xs font-bold uppercase tracking-wider">
                    {it.tag}
                  </span>
                )}
                <h3 className="mt-3 text-xl font-extrabold leading-snug text-white">{it.title}</h3>
                {it.description && <p className="mt-2 text-sm text-white/85 flex-1">{it.description}</p>}
                {link && (
                  <a href={link} target="_blank" rel="noopener noreferrer" className="mt-5 text-sm font-bold underline underline-offset-4">
                    Claim on WhatsApp →
                  </a>
                )}
              </div>
            </Reveal>
          );
        })}
      </div>
    </SectionShell>
  );
}

/* ─── Video / virtual tour (lightweight: iframe loads only after the click) ─── */
function parseVideo(url) {
  const u = String(url || "").trim();
  let m = u.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([\w-]{11})/);
  if (m) return { kind: "yt", id: m[1] };
  m = u.match(/vimeo\.com\/(?:video\/)?(\d+)/);
  if (m) return { kind: "vimeo", id: m[1] };
  return null;
}

function VideoCard({ item, theme }) {
  const [play, setPlay] = useState(false);
  const video = parseVideo(item.url);
  if (!video) return null;
  const src =
    video.kind === "yt"
      ? `https://www.youtube-nocookie.com/embed/${video.id}?autoplay=1&rel=0`
      : `https://player.vimeo.com/video/${video.id}?autoplay=1`;
  const poster = video.kind === "yt" ? `https://i.ytimg.com/vi/${video.id}/hqdefault.jpg` : null;

  return (
    <div>
      <div className="relative aspect-video rounded-3xl overflow-hidden bg-stone-900 shadow-2xl">
        {play ? (
          <iframe
            src={src}
            title={item.title}
            className="absolute inset-0 w-full h-full"
            allow="autoplay; encrypted-media; fullscreen; picture-in-picture"
            allowFullScreen
          />
        ) : (
          <button type="button" onClick={() => setPlay(true)} className="absolute inset-0 w-full h-full group" aria-label={`Play ${item.title}`}>
            {poster && <img src={poster} alt="" loading="lazy" className="w-full h-full object-cover opacity-80 group-hover:opacity-100 transition-opacity" />}
            <span className="absolute inset-0 flex items-center justify-center">
              <span
                className="w-20 h-20 rounded-full flex items-center justify-center text-white shadow-2xl group-hover:scale-110 transition-transform"
                style={{ backgroundColor: theme }}
              >
                <svg width="30" height="30" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z" /></svg>
              </span>
            </span>
          </button>
        )}
      </div>
      {item.description && <p className="mt-3 text-sm text-center text-stone-500 dark:text-stone-400">{item.description}</p>}
    </div>
  );
}

export function VideoTour({ config, theme, toneIdx }) {
  const items = (config?.items || []).filter((i) => parseVideo(i.url));
  if (!items.length) return null;
  return (
    <SectionShell title={config.title} toneIdx={toneIdx} theme={theme} subtitle="Walkthrough">
      <div className={items.length > 1 ? "grid md:grid-cols-2 gap-6" : "max-w-4xl mx-auto"}>
        {items.slice(0, 4).map((it, idx) => (
          <Reveal key={it.id || idx} delay={idx * 80}>
            <VideoCard item={it} theme={theme} />
          </Reveal>
        ))}
      </div>
    </SectionShell>
  );
}

/* ─── Weekly timetable with day tabs ─── */
const DAYS = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

function runsOnDay(tag, dayIdx) {
  const t = String(tag || "").toLowerCase().trim();
  if (!t || /\b(daily|everyday|all)\b/.test(t)) return true;
  const range = t.match(/([a-z]{3})[a-z]*\s*(?:-|–|to)\s*([a-z]{3})/);
  if (range) {
    const a = DAYS.findIndex((d) => d.toLowerCase() === range[1]);
    const b = DAYS.findIndex((d) => d.toLowerCase() === range[2]);
    if (a >= 0 && b >= 0) {
      return a <= b ? dayIdx >= a && dayIdx <= b : dayIdx >= a || dayIdx <= b;
    }
  }
  return t.split(/[^a-z]+/).some((w) => w.slice(0, 3) === DAYS[dayIdx].toLowerCase());
}

export function Schedule({ config, theme, toneIdx }) {
  const items = config?.items || [];
  const [day, setDay] = useState((new Date().getDay() + 6) % 7); // today (Mon = 0)
  if (!items.length) return null;
  const todays = items.filter((it) => runsOnDay(it.tag, day));

  return (
    <SectionShell title={config.title} toneIdx={toneIdx} theme={theme} subtitle="Timetable">
      <div className="flex justify-center gap-2 mb-8 overflow-x-auto pb-1">
        {DAYS.map((d, i) => (
          <button
            key={d}
            type="button"
            onClick={() => setDay(i)}
            className="px-4 py-2 rounded-full text-sm font-bold border transition-colors shrink-0"
            style={day === i ? { backgroundColor: theme, borderColor: theme, color: "#fff" } : { borderColor: `${theme}55`, color: theme }}
          >
            {d}
          </button>
        ))}
      </div>

      <div className="max-w-3xl mx-auto space-y-3">
        {todays.length === 0 && <p className="text-center text-stone-400 py-8">No classes on this day.</p>}
        {todays.map((it, idx) => (
          <Reveal key={it.id || idx} delay={idx * 50}>
            <div className="flex items-center gap-4 rounded-2xl bg-white dark:bg-stone-800 border border-stone-100 dark:border-stone-700 p-4 shadow-sm">
              <div className="w-32 shrink-0 text-sm font-extrabold tabular-nums" style={{ color: theme }}>{it.subtitle}</div>
              <div className="min-w-0">
                <p className="font-bold text-stone-900 dark:text-white">{it.title}</p>
                {it.description && <p className="text-xs text-stone-500 dark:text-stone-400 mt-0.5">{it.description}</p>}
              </div>
            </div>
          </Reveal>
        ))}
      </div>
    </SectionShell>
  );
}
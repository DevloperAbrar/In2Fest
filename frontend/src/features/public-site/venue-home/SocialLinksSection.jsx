import React from "react";
import { ArrowUpRight } from "lucide-react";
import SocialIcon from "../../../components/common/SocialIcon.jsx";
import { getPlatform, safeHref, getDisplayHandle } from "../../../lib/socialPlatforms";
import { useScrollReveal } from "../../../hooks/useScrollReveal";
import { SectionShell, Reveal } from "./SectionShell.jsx";

const STYLES = `
@keyframes sl-pop {
  0%   { opacity: 0; transform: translateY(18px) scale(.7); }
  60%  { opacity: 1; transform: translateY(-4px) scale(1.06); }
  100% { opacity: 1; transform: none; }
}
@keyframes sl-shine {
  0%   { transform: translateX(-130%) skewX(-20deg); }
  100% { transform: translateX(330%) skewX(-20deg); }
}
@keyframes sl-drift {
  0%, 100% { transform: translate(0, 0) scale(1); }
  50%      { transform: translate(26px, -18px) scale(1.12); }
}

.sl-orb { animation: sl-drift 14s ease-in-out infinite; }

/* ---------- card style ---------- */
.sl-card {
  position: relative; display: flex; align-items: center; gap: 1rem;
  padding: 1rem 1.1rem; border-radius: 1.25rem; overflow: hidden; isolation: isolate;
  text-decoration: none; -webkit-tap-highlight-color: transparent;
  transition: transform .35s cubic-bezier(.22,1,.36,1), box-shadow .35s ease, border-color .35s ease;
}
.sl-card::before {
  content: ""; position: absolute; inset: 0; z-index: -1;
  background: var(--sl-bg); transform: translateY(101%);
  transition: transform .5s cubic-bezier(.22,1,.36,1);
}
.sl-card::after {
  content: ""; position: absolute; top: 0; bottom: 0; left: 0; width: 35%;
  background: linear-gradient(90deg, transparent, rgba(255,255,255,.38), transparent);
  transform: translateX(-130%) skewX(-20deg); pointer-events: none;
}
.sl-card:hover, .sl-card:focus-visible {
  transform: translateY(-6px); border-color: transparent; outline: none;
  box-shadow: 0 22px 40px -14px var(--sl-color);
}
.sl-card:hover::before, .sl-card:focus-visible::before { transform: translateY(0); }
.sl-card:hover::after { animation: sl-shine .9s ease; }
.sl-card:active { transform: translateY(-2px) scale(.98); }

.sl-tile { transition: transform .45s cubic-bezier(.34,1.56,.64,1), background .3s ease, color .3s ease; }
.sl-arrow { opacity: .4; transform: translate(-4px, 4px); transition: opacity .35s ease, transform .35s ease, color .3s ease; }

.sl-card:hover .sl-name, .sl-card:hover .sl-handle, .sl-card:hover .sl-arrow,
.sl-card:focus-visible .sl-name, .sl-card:focus-visible .sl-handle, .sl-card:focus-visible .sl-arrow { color: #fff !important; }
.sl-card:hover .sl-arrow, .sl-card:focus-visible .sl-arrow { opacity: 1; transform: translate(0, 0); }
.sl-card:hover .sl-tile, .sl-card:focus-visible .sl-tile {
  background: rgba(255,255,255,.22) !important; color: #fff !important; transform: rotate(-8deg) scale(1.1);
}
.dark .sl-tile[data-invert="1"] { color: #fff !important; background: rgba(255,255,255,.12) !important; }

/* ---------- icon row style ---------- */
.sl-icon-btn {
  position: relative; display: flex; align-items: center; justify-content: center;
  width: 3.5rem; height: 3.5rem; border-radius: 9999px; color: #fff;
  background: var(--sl-bg); text-decoration: none; -webkit-tap-highlight-color: transparent;
  box-shadow: 0 10px 24px -10px var(--sl-color);
  transition: transform .35s cubic-bezier(.34,1.56,.64,1), box-shadow .35s ease;
}
.sl-icon-btn:hover, .sl-icon-btn:focus-visible {
  transform: translateY(-7px) scale(1.12); outline: none; box-shadow: 0 20px 30px -8px var(--sl-color);
}
.sl-icon-btn:active { transform: translateY(-2px) scale(.96); }
.sl-icon-btn::after {
  content: attr(data-label); position: absolute; bottom: calc(100% + 12px); left: 50%;
  transform: translate(-50%, 6px); white-space: nowrap; font-size: 11px; font-weight: 600;
  background: #111; color: #fff; padding: 4px 10px; border-radius: 8px;
  opacity: 0; pointer-events: none; transition: opacity .25s ease, transform .25s ease;
}
.sl-icon-btn:hover::after, .sl-icon-btn:focus-visible::after { opacity: 1; transform: translate(-50%, 0); }
.sl-pop { animation: sl-pop .75s cubic-bezier(.22,1,.36,1) both; }

@media (prefers-reduced-motion: reduce) {
  .sl-orb, .sl-pop, .sl-card:hover::after { animation: none !important; }
  .sl-card, .sl-card::before, .sl-tile, .sl-arrow, .sl-icon-btn { transition: none !important; }
}
`;

function prepare(items) {
  return (Array.isArray(items) ? items : [])
    .map((it) => ({ ...it, p: getPlatform(it.platform), href: safeHref(it.url) }))
    .filter((l) => l.href);
}

function CardGrid({ links }) {
  const layout =
    links.length === 1
      ? "max-w-md mx-auto grid-cols-1"
      : links.length === 2
        ? "max-w-2xl mx-auto grid-cols-1 sm:grid-cols-2"
        : "max-w-5xl mx-auto grid-cols-1 sm:grid-cols-2 lg:grid-cols-3";

  return (
    <div className={`grid gap-4 ${layout}`}>
      {links.map((l, i) => (
        <Reveal key={l.id || l.href} delay={i * 80}>
          <a
            href={l.href}
            target="_blank"
            rel="noopener noreferrer"
            title={l.p.cta}
            aria-label={`${l.p.label}: ${l.p.cta} (opens in a new tab)`}
            className="sl-card bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 shadow-sm"
            style={{ "--sl-bg": l.p.bg, "--sl-color": `${l.p.color}66` }}
          >
            <span
              className="sl-tile w-12 h-12 rounded-2xl flex items-center justify-center shrink-0"
              data-invert={l.p.invert ? "1" : undefined}
              style={{ background: `${l.p.color}1a`, color: l.p.color }}
            >
              <SocialIcon platform={l.platform} size={24} />
            </span>

            <span className="min-w-0 flex-1">
              <span className="sl-name block text-sm font-bold text-stone-900 dark:text-white">{l.p.label}</span>
              <span className="sl-handle block text-xs text-stone-500 dark:text-stone-400 truncate">
                {getDisplayHandle(l)}
              </span>
            </span>

            <span className="sl-arrow shrink-0 w-8 h-8 rounded-full flex items-center justify-center text-stone-500 dark:text-stone-400">
              <ArrowUpRight size={18} />
            </span>
          </a>
        </Reveal>
      ))}
    </div>
  );
}

function IconRow({ links }) {
  const [ref, visible] = useScrollReveal();
  return (
    <div ref={ref} className="flex flex-wrap items-center justify-center gap-5 pt-6">
      {links.map((l, i) => (
        <a
          key={l.id || l.href}
          href={l.href}
          target="_blank"
          rel="noopener noreferrer"
          data-label={l.p.label}
          aria-label={`${l.p.label}: ${l.p.cta} (opens in a new tab)`}
          className={`sl-icon-btn ${visible ? "sl-pop" : "opacity-0"}`}
          style={{ "--sl-bg": l.p.bg, "--sl-color": `${l.p.color}99`, animationDelay: `${i * 90}ms` }}
        >
          <SocialIcon platform={l.platform} size={24} />
        </a>
      ))}
    </div>
  );
}

// The links themselves. Also used for the live preview in the Website Builder editor.
export function SocialLinksView({ items, style = "cards" }) {
  const links = prepare(items);
  if (!links.length) return null;
  return (
    <>
      <style>{STYLES}</style>
      {style === "icons" ? <IconRow links={links} /> : <CardGrid links={links} />}
    </>
  );
}

export default function SocialLinksSection({ config, theme, toneIdx = 0 }) {
  const items = Array.isArray(config?.items) ? config.items : [];
  if (!prepare(items).length) return null;

  return (
    <SectionShell
      title={config?.title || "Follow Us"}
      subtitle={config?.subtitle || "Stay Connected"}
      toneIdx={toneIdx}
      theme={theme}
    >
      <div className="relative">
        <span
          aria-hidden="true"
          className="sl-orb pointer-events-none absolute -top-16 -left-10 w-64 h-64 rounded-full blur-3xl opacity-20"
          style={{ background: theme }}
        />
        <span
          aria-hidden="true"
          className="sl-orb pointer-events-none absolute -bottom-16 -right-10 w-72 h-72 rounded-full blur-3xl opacity-20"
          style={{ background: theme, animationDelay: "-7s" }}
        />
        <div className="relative">
          <SocialLinksView items={items} style={config?.style} />
        </div>
      </div>
    </SectionShell>
  );
}
import React from "react";
import { Check, ArrowRight } from "lucide-react";
import { SectionHead } from "./ui";
import { Floaty, Arches, Plus, RunArt, GetArt, FoundArt } from "./art";
import { USE_CUSTOM_PANEL_ART } from "./assets";

const APP_URL = import.meta.env.VITE_APP_URL || "http://localhost:5173";

const PANELS = [
  {
    key: "run",
    n: "01",
    word: "Run it.",
    promise: "Your whole business in one simple dashboard.",
    points: ["Members, students or customers", "Plans, renewals and fee receipts", "QR attendance", "Bills with GST", "Import your list from Excel"],
    bg: "#1a2035", fg: "#ffffff", sub: "rgba(255,255,255,0.72)", chip: "rgba(255,255,255,0.12)", tick: "#f5a623",
    Art: RunArt,
  },
  {
    key: "get",
    n: "02",
    word: "Get it.",
    promise: "Get your own website on your own address.",
    points: ["Professional templates", "Services, plans, gallery, reviews", "Enquiry form and call button", "Google Map built in", "Looks right on every phone"],
    bg: "#e8192c", fg: "#ffffff", sub: "rgba(255,255,255,0.82)", chip: "rgba(255,255,255,0.16)", tick: "#f5a623",
    Art: GetArt,
  },
  {
    key: "found",
    n: "03",
    word: "Found it.",
    promise: "Get found by customers who are looking near you.",
    points: ["Listed by city and category", "Customers call or WhatsApp you directly", "Real customer reviews", "No commission on any customer"],
    bg: "#f5a623", fg: "#1a2035", sub: "rgba(26,32,53,0.78)", chip: "rgba(26,32,53,0.10)", tick: "#e8192c",
    Art: FoundArt,
  },
];

function PanelArt({ p }) {
  if (USE_CUSTOM_PANEL_ART) {
    return <img src={`/art/${p.key}.png`} alt="" loading="lazy" className="w-full h-auto" />;
  }
  return <p.Art className="w-full h-auto" />;
}

export default function StackPanels() {
  return (
    <section className="bg-[#FFF6E8] pt-16 md:pt-24 pb-16 md:pb-28">
      <div className="max-w-6xl mx-auto px-4">
        <SectionHead
          center
          eyebrow="How In2Fest works"
          title="Three things every local business needs."
          sub="Most owners juggle a register, a Facebook page and a listing site. Here it is one place."
        />
        <div className="mt-12 md:mt-16 flex flex-col gap-6 md:gap-8">
          {PANELS.map((p, i) => (
            <article
              key={p.key}
              className="md:sticky rounded-[2rem] md:rounded-[2.75rem] overflow-hidden relative shadow-[0_30px_60px_-30px_rgba(26,32,53,0.55)]"
              style={{ background: p.bg, color: p.fg, top: `calc(5.5rem + ${i * 16}px)` }}
            >
              <Arches
                className="absolute -right-12 -top-10 rotate-180 opacity-20 hidden md:block"
                colors={[p.fg, p.fg, p.fg]}
                width={260}
              />
              <Floaty className="absolute right-[44%] top-8 hidden md:block" delay={i * 0.5}><Plus size={26} color={p.tick} /></Floaty>
              <div className="relative grid md:grid-cols-[1fr_1.05fr] items-end gap-4 p-7 md:p-12 md:min-h-[460px]">
                <div className="self-start">
                  <span
                    className="inline-flex items-center rounded-full px-3.5 py-1 text-xs font-extrabold tracking-widest"
                    style={{ background: p.chip }}
                  >
                    STEP {p.n}
                  </span>
                  <h3
                    className="font-display font-extrabold mt-4"
                    style={{ fontSize: "clamp(3.2rem, 9vw, 6.4rem)", letterSpacing: "-0.04em", lineHeight: 0.95 }}
                  >
                    {p.word}
                  </h3>
                  <p className="mt-4 text-lg md:text-xl font-semibold max-w-md leading-snug" style={{ color: p.sub }}>
                    {p.promise}
                  </p>
                  <ul className="mt-6 flex flex-wrap gap-2 max-w-md">
                    {p.points.map((pt) => (
                      <li key={pt} className="inline-flex items-center gap-1.5 rounded-full px-3.5 py-1.5 text-[13px] font-semibold" style={{ background: p.chip }}>
                        <Check size={14} strokeWidth={3} style={{ color: p.tick }} />
                        {pt}
                      </li>
                    ))}
                  </ul>
                  {i === 0 && (
                    <a
                      href={`${APP_URL}/login`}
                      className="inline-flex items-center gap-2 mt-7 rounded-full bg-accent-500 hover:bg-accent-600 transition px-6 py-3 text-sm font-extrabold text-white"
                    >
                      Start free <ArrowRight size={15} />
                    </a>
                  )}
                </div>
                <div className="md:translate-y-6 md:-mr-4">
                  <PanelArt p={p} />
                </div>
              </div>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
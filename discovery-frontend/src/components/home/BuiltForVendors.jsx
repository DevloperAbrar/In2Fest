import React, { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { LayoutDashboard, Globe2, CalendarCheck2, FileText, ArrowRight, CheckCircle2 } from "lucide-react";
import { BRAND_NAME } from "../../lib/constants";

function pillarImage(name) {
  try { return new URL(`../../assets/vendor-toolkit/${name}.jpg`, import.meta.url).href; } catch { return null; }
}

const PILLARS = [
  {
    icon: LayoutDashboard,
    title: "Run your business from one screen",
    desc: "Bookings, leads, availability and analytics  - the entire operation, in a single clean dashboard instead of five different tools.",
    points: ["Live analytics on views, leads & bookings", "One inbox for every inquiry"],
    image: "dashboard"
  },
  {
    icon: Globe2,
    title: "Look professional, instantly",
    desc: "Pick a template, add your details, and go live with a real branded website  - not just another directory row.",
    points: ["Free branded website per vendor", "Always-current public profile"],
    image: "website-builder"
  },
  {
    icon: CalendarCheck2,
    title: "Never miss a lead again",
    desc: "Customers see your real availability and book instantly  - no back-and-forth calls, no double-booking.",
    points: ["Live slot booking calendar", "Instant inquiry notifications"],
    image: "booking-calendar"
  },
  {
    icon: FileText,
    title: "Close deals & build trust",
    desc: "Send professional quotations and invoices, then collect genuine reviews from completed bookings  - all in-app.",
    points: ["Quotation & invoice builder", "Verified review collection"],
    image: "quotation-review"
  }
];

function useScrollSpy(count) {
  const refs = useRef([]);
  const [active, setActive] = useState(0);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) setActive(Number(entry.target.dataset.idx));
        });
      },
      { rootMargin: "-35% 0px -35% 0px", threshold: 0 }
    );
    refs.current.forEach((el) => el && observer.observe(el));
    return () => observer.disconnect();
  }, [count]);

  return [refs, active];
}

function PillarImage({ name, alt }) {
  const [failed, setFailed] = useState(false);
  const src = pillarImage(name);
  if (!src || failed) {
    return <div className="w-full h-full bg-gradient-to-br from-navy-100 to-accent-100" />;
  }
  return <img src={src} alt={alt} onError={() => setFailed(true)} className="w-full h-full object-cover" />;
}

export default function BuiltForVendors() {
  const [refs, active] = useScrollSpy(PILLARS.length);

  return (
    <section className="py-14 md:py-24 bg-white">
      <div className="max-w-6xl mx-auto px-4">
        <div className="text-center mb-14">
          <p
            className="inline-block text-xs font-bold tracking-widest uppercase mb-3 px-3 py-1 rounded-full"
            style={{ color: "#1a2035", background: "#1a20350a" }}
          >
            Built for vendors, felt by you
          </p>
          <h2
            className="font-display font-extrabold text-navy-900"
            style={{ fontSize: "clamp(1.6rem, 4vw, 2.4rem)", letterSpacing: "-0.02em" }}
          >
            Every vendor on {BRAND_NAME} runs on the same toolkit
          </h2>
          <p className="text-gray-500 text-sm md:text-base max-w-xl mx-auto mt-3">
            That's why profiles stay current, availability is real, and replies come fast  - it isn't manual effort, it's built into how they work.
          </p>
        </div>

        <div className="grid md:grid-cols-2 gap-10 lg:gap-16 items-start">
          {/* Sticky image column  - cross-fades as you scroll past each feature */}
          <div className="hidden md:block md:sticky md:top-24 h-[440px] rounded-3xl overflow-hidden shadow-lg">
            <AnimatePresence mode="wait">
              <motion.div
                key={active}
                initial={{ opacity: 0, scale: 1.04 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.45, ease: "easeOut" }}
                className="w-full h-full"
              >
                <PillarImage name={PILLARS[active].image} alt={PILLARS[active].title} />
              </motion.div>
            </AnimatePresence>
            <div className="absolute inset-0 bg-gradient-to-t from-navy-900/70 via-transparent to-transparent pointer-events-none" />
            <div className="absolute bottom-6 left-6 right-6 text-white">
              <p className="font-display font-bold text-lg">{PILLARS[active].title}</p>
            </div>
          </div>

          {/* Scrolling feature steps */}
          <div className="space-y-10 md:space-y-24">
            {PILLARS.map((pillar, i) => (
              <div
                key={pillar.title}
                ref={(el) => (refs.current[i] = el)}
                data-idx={i}
                className="md:min-h-[200px] flex flex-col justify-center"
              >
                <div className="md:hidden w-full h-40 rounded-2xl overflow-hidden mb-4">
                  <PillarImage name={pillar.image} alt={pillar.title} />
                </div>

                <motion.div
                  initial={{ opacity: 0, x: 16 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true, margin: "-80px" }}
                  transition={{ duration: 0.45 }}
                >
                  <div
                    className="w-10 h-10 rounded-xl flex items-center justify-center mb-4"
                    style={{ background: active === i ? "#e8192c" : "#e8192c12" }}
                  >
                    <pillar.icon size={19} style={{ color: active === i ? "#fff" : "#e8192c" }} />
                  </div>
                  <h3 className="font-display font-bold text-navy-900 text-lg mb-2">{pillar.title}</h3>
                  <p className="text-sm text-gray-500 leading-relaxed mb-4">{pillar.desc}</p>
                  <ul className="space-y-2">
                    {pillar.points.map((p) => (
                      <li key={p} className="flex items-center gap-2 text-sm text-gray-600">
                        <CheckCircle2 size={15} style={{ color: "#16a34a" }} className="flex-shrink-0" />
                        {p}
                      </li>
                    ))}
                  </ul>
                </motion.div>
              </div>
            ))}
          </div>
        </div>

        <div className="flex justify-center mt-16">
          <Link
            to="/for-vendors"
            className="flex items-center gap-2 px-7 py-3.5 rounded-xl text-sm font-bold text-white transition-opacity hover:opacity-90"
            style={{ background: "linear-gradient(135deg,#e8192c,#f5a623)" }}
          >
            See the full vendor toolkit <ArrowRight size={15} />
          </Link>
        </div>
      </div>
    </section>
  );
}
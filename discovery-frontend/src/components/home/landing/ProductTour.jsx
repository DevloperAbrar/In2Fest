import React, { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useInView, useReducedMotion } from "framer-motion";
import { Check } from "lucide-react";
import { DashboardMock, WebsiteMock, MarketplaceMock } from "./ProductMock";
import { SectionHead } from "./ui";

const STEPS = [
  {
    key: "run",
    tag: "01 · Run",
    title: "Your whole business in one dashboard",
    points: [
      "Members, students or customers in one list, with plans and renewals",
      "Fee receipts and invoices, GST included",
      "QR attendance for gyms and study rooms",
      "Bring your existing list in from Excel",
    ],
    mock: () => <DashboardMock vertical="gym" />,
  },
  {
    key: "show",
    tag: "02 · Show",
    title: "Your own website, ready from your profile",
    points: [
      "A professional template on your own in2fest.com address",
      "Services, plans, gallery and reviews on one page",
      "Enquiry form, call button and embedded Google Map",
      "Opens fast and looks right on every phone",
    ],
    mock: () => <WebsiteMock />,
  },
  {
    key: "grow",
    tag: "03 · Grow",
    title: "Get found by customers near you",
    points: [
      "Listed on the In2Fest marketplace by city and category",
      "Customers call or message you directly on WhatsApp",
      "Reviews from real customers build trust",
      "No commission on any customer you get",
    ],
    mock: () => <MarketplaceMock />,
  },
];

function Step({ step, index, onActive }) {
  const ref = useRef(null);
  const inView = useInView(ref, { margin: "-45% 0px -45% 0px" });
  useEffect(() => { if (inView) onActive(index); }, [inView, index, onActive]);
  return (
    <div ref={ref} className="md:min-h-[78vh] flex flex-col justify-center py-10 md:py-0">
      <p className="text-xs font-bold tracking-[0.18em] uppercase text-gold-600">{step.tag}</p>
      <h3
        className="font-display font-extrabold text-navy-700 mt-3"
        style={{ fontSize: "clamp(1.6rem, 3.4vw, 2.4rem)", letterSpacing: "-0.02em", lineHeight: 1.12 }}
      >
        {step.title}
      </h3>
      <ul className="mt-6 space-y-3">
        {step.points.map((p) => (
          <li key={p} className="flex gap-3 text-navy-500 text-[15px] leading-relaxed">
            <Check size={18} className="text-accent-500 mt-0.5 flex-shrink-0" />
            {p}
          </li>
        ))}
      </ul>
      {/* Phones and tablets: the visual sits right under its text */}
      <div className="md:hidden mt-7">{step.mock()}</div>
    </div>
  );
}

export default function ProductTour() {
  const reduce = useReducedMotion();
  const [active, setActive] = useState(0);
  const current = STEPS[active];

  return (
    <section className="bg-white py-16 md:py-24">
      <div className="max-w-7xl mx-auto px-4">
        <SectionHead
          eyebrow="One platform"
          title="Three jobs, handled in one place."
          sub="Most businesses juggle a notebook, a Facebook page and a listing site. In2Fest replaces all three."
        />
        <div className="mt-10 md:mt-6 grid md:grid-cols-2 gap-x-14">
          <div>
            {STEPS.map((s, i) => (
              <Step key={s.key} step={s} index={i} onActive={setActive} />
            ))}
          </div>
          <div className="hidden md:block">
            <div className="sticky top-28 mt-24">
              <AnimatePresence mode="wait" initial={false}>
                <motion.div
                  key={current.key}
                  initial={reduce ? false : { opacity: 0, y: 16 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={reduce ? { opacity: 1 } : { opacity: 0, y: -12 }}
                  transition={{ duration: 0.3 }}
                >
                  {current.mock()}
                </motion.div>
              </AnimatePresence>
              <div className="mt-5 flex justify-center gap-2" aria-hidden="true">
                {STEPS.map((s, i) => (
                  <span
                    key={s.key}
                    className={`h-1.5 rounded-full transition-all ${i === active ? "w-8 bg-accent-500" : "w-3 bg-navy-100"}`}
                  />
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
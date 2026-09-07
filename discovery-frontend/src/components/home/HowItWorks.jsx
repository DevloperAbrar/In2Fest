import React from "react";
import { Link } from "react-router-dom";
import { Search, CalendarCheck2, PartyPopper, ArrowRight } from "lucide-react";

const STEPS = [
  {
    n: "01",
    icon: Search,
    title: "Browse & Compare",
    desc: "Search verified vendors by category and city. See real portfolios, packages and pricing  - no phone calls needed just to get basic info.",
  },
  {
    n: "02",
    icon: CalendarCheck2,
    title: "Check Slots & Book",
    desc: "See a vendor's live availability calendar, send an inquiry or lock your date directly. Get a quotation on the platform before you commit.",
  },
  {
    n: "03",
    icon: PartyPopper,
    title: "Get Married, Stress-Free",
    desc: "Track every booking  - hall, catering, decor, photography  - from one dashboard, right up to the big day.",
  },
];

export default function HowItWorks() {
  return (
    <section className="bg-white py-16 md:py-20">
      <div className="max-w-5xl mx-auto px-4">
        <div className="text-center mb-14">
          <p
            className="inline-block text-xs font-bold tracking-widest uppercase mb-3 px-3 py-1 rounded-full"
            style={{ color: "#e8192c", background: "#e8192c0d" }}
          >
            Our Process
          </p>
          <h2
            className="font-display font-extrabold text-navy-900 mb-3"
            style={{ fontSize: "clamp(1.6rem, 4vw, 2.4rem)", letterSpacing: "-0.02em" }}
          >
            From idea to a booked event  - simply
          </h2>
          <p className="text-gray-500 text-sm md:text-base max-w-lg mx-auto">
            A transparent process, start to finish. No middlemen chasing you for a "cut."
          </p>
        </div>

        {/* Steps  - connected timeline on desktop, stacked on mobile */}
        <div className="relative grid grid-cols-1 md:grid-cols-3 gap-6 md:gap-4">
          {/* Connecting line (desktop only) */}
          <div
            className="hidden md:block absolute top-8 left-[16.5%] right-[16.5%] h-[2px]"
            style={{ background: "linear-gradient(90deg, #e8192c33, #f5a62333)" }}
          />

          {STEPS.map(({ n, icon: Icon, title, desc }, i) => (
            <div key={n} className="relative flex flex-col items-center text-center px-2">
              <div
                className="relative z-10 w-16 h-16 rounded-2xl flex items-center justify-center mb-5 shadow-sm"
                style={{
                  background: i === 1
                    ? "linear-gradient(135deg,#e8192c,#f5a623)"
                    : "white",
                  border: i === 1 ? "none" : "2px solid #1a20351a",
                }}
              >
                <Icon size={26} color={i === 1 ? "white" : "#1a2035"} />
              </div>
              <span
                className="text-[11px] font-black tracking-wider mb-1.5"
                style={{ color: "#e8192c" }}
              >
                STEP {n}
              </span>
              <h3 className="font-semibold text-navy-900 text-base mb-2">{title}</h3>
              <p className="text-xs md:text-sm text-gray-500 leading-relaxed max-w-[240px]">
                {desc}
              </p>
            </div>
          ))}
        </div>

        <div className="flex justify-center mt-12">
          <Link
            to="/search"
            className="flex items-center gap-2 px-6 py-3 rounded-xl text-sm font-bold text-white transition-opacity hover:opacity-90"
            style={{ background: "#1a2035" }}
          >
            Start Browsing Vendors <ArrowRight size={15} />
          </Link>
        </div>
      </div>
    </section>
  );
}
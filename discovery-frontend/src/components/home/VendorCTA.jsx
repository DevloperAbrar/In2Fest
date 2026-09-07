import React from "react";
import { Link } from "react-router-dom";
import { TrendingUp, ArrowRight, Sparkles } from "lucide-react";

export default function VendorCTA() {
  return (
    <section className="py-14" style={{ background: "linear-gradient(135deg,#1a2035,#12172a)" }}>
      <div className="max-w-3xl mx-auto px-4 text-center">
        <span className="inline-flex items-center gap-1.5 text-xs font-black tracking-widest uppercase text-white bg-white/10 border border-white/15 px-4 py-1.5 rounded-full mb-5">
          <TrendingUp size={12} style={{ color: "#f5a623" }} />
          Own a wedding or event business?
        </span>
        <h2 className="font-display font-extrabold text-white mb-4" style={{ fontSize: "clamp(1.5rem,3.5vw,2.25rem)" }}>
          List free & get your own website
        </h2>
        <p className="text-white/70 text-sm md:text-base mb-7 max-w-xl mx-auto">
          Get discovered by couples searching right now, plus a free branded website and booking calendar.
        </p>
        <div className="flex flex-col sm:flex-row items-center justify-center gap-3">
          <Link
            to="/for-vendors"
            className="flex items-center gap-2 px-7 py-3.5 rounded-xl text-sm font-bold text-white"
            style={{ background: "#e8192c" }}
          >
            List Your Business Free <ArrowRight size={15} />
          </Link>
          <Link
            to="/get-website"
            className="flex items-center gap-2 px-7 py-3.5 rounded-xl text-sm font-bold text-white"
            style={{ background: "linear-gradient(135deg,#e8192c,#f5a623)" }}
          >
            <Sparkles size={15} /> See the website builder
          </Link>
        </div>
      </div>
    </section>
  );
}
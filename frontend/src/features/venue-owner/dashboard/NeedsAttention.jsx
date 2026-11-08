import React from "react";
import { Link } from "react-router-dom";
import { motion, useReducedMotion } from "framer-motion";
import { AlertTriangle, ChevronRight, MessageSquare, Star } from "lucide-react";
import { Surface, SectionHeader } from "./dashboardUi.jsx";
import { TONES } from "./dashboardTheme.js";

// Mobile-only colours for each alert row
const MOBILE_ROW = {
  sky: { row: "bg-sky-50", icon: "text-sky-600" },
  amber: { row: "bg-amber-50", icon: "text-amber-600" },
  red: { row: "bg-primary-50", icon: "text-primary-600" },
  emerald: { row: "bg-emerald-50", icon: "text-emerald-600" },
  violet: { row: "bg-violet-50", icon: "text-violet-600" },
  navy: { row: "bg-navy-50", icon: "text-navy-600" }
};

// Desktop / tablet row (unchanged)
function Row({ icon: Icon, tone, text, to }) {
  const body = (
    <div className="flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-navy-50/70 transition-colors">
      <span className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${TONES[tone].chip}`}>
        <Icon size={17} />
      </span>
      <p className="text-[13px] font-medium text-navy-800 flex-1 leading-snug">{text}</p>
      {to && <ChevronRight size={16} className="text-navy-300 shrink-0" />}
    </div>
  );
  return to ? <Link to={to} className="tap-scale block">{body}</Link> : body;
}

// Mobile row
function MobileRow({ icon: Icon, tone, text, to }) {
  const style = MOBILE_ROW[tone] || MOBILE_ROW.navy;
  const body = (
    <div className={`flex items-center gap-3 rounded-2xl px-3 py-3 ${style.row}`}>
      <span className={`w-10 h-10 rounded-xl bg-white shadow-sm flex items-center justify-center shrink-0 ${style.icon}`}>
        <Icon size={18} strokeWidth={2.1} />
      </span>
      <p className="text-[13px] font-medium text-navy-800 flex-1 leading-snug">{text}</p>
      {to && <ChevronRight size={16} className="text-navy-300 shrink-0" />}
    </div>
  );
  return to ? <Link to={to} className="tap-scale block">{body}</Link> : body;
}

function AllClear() {
  const reduce = useReducedMotion();
  return (
    <>
      {/* Mobile */}
      <div className="md:hidden relative overflow-hidden rounded-3xl border border-emerald-100 bg-gradient-to-br from-emerald-50 via-white to-white shadow-card px-4 py-4 flex items-center gap-3.5">
        <svg width="46" height="46" viewBox="0 0 46 46" fill="none" aria-hidden="true" className="shrink-0">
          <circle cx="23" cy="23" r="22" className="fill-emerald-100/70" />
          <circle cx="23" cy="23" r="16" className="fill-emerald-500" />
          <motion.path
            d="M15.5 23.5 L20.5 28.5 L30.5 17.5"
            stroke="#fff"
            strokeWidth="2.6"
            strokeLinecap="round"
            strokeLinejoin="round"
            initial={reduce ? false : { pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 0.6, delay: 0.3 }}
          />
        </svg>
        <div className="min-w-0">
          <p className="text-[14px] font-semibold text-navy-900">You're all caught up</p>
          <p className="text-xs text-navy-400 mt-0.5">Nothing needs your attention right now.</p>
        </div>
      </div>

      {/* Desktop / tablet (unchanged) */}
      <Surface className="hidden md:flex px-4 py-3.5 items-center gap-3">
        <svg width="34" height="34" viewBox="0 0 34 34" fill="none" aria-hidden="true">
          <circle cx="17" cy="17" r="16" className="fill-emerald-50 stroke-emerald-200" strokeWidth="1.5" />
          <motion.path
            d="M10.5 17.5 L15 22 L23.5 12.5"
            className="stroke-emerald-500"
            strokeWidth="2.4"
            strokeLinecap="round"
            strokeLinejoin="round"
            initial={reduce ? false : { pathLength: 0 }}
            animate={{ pathLength: 1 }}
            transition={{ duration: 0.6, delay: 0.3 }}
          />
        </svg>
        <div>
          <p className="text-[13.5px] font-semibold text-navy-800">You're all caught up</p>
          <p className="text-xs text-navy-400">Nothing needs your attention right now.</p>
        </div>
      </Surface>
    </>
  );
}

export default function NeedsAttention({
  newInquiriesCount = 0,
  unrepliedReviewsCount = 0,
  pendingReviewsCount = 0,
  whatsappFailedCount = 0
}) {
  const items = [];

  if (newInquiriesCount > 0) {
    items.push({
      icon: MessageSquare,
      tone: "sky",
      text: `${newInquiriesCount} new inquir${newInquiriesCount === 1 ? "y needs" : "ies need"} a response`,
      to: "/dashboard/inquiries"
    });
  }
  if (unrepliedReviewsCount > 0) {
    items.push({
      icon: Star,
      tone: "amber",
      text: `${unrepliedReviewsCount} review${unrepliedReviewsCount === 1 ? "" : "s"} awaiting your reply`,
      to: "/dashboard/reviews"
    });
  }
  if (pendingReviewsCount > 0) {
    items.push({
      icon: Star,
      tone: "amber",
      text: `${pendingReviewsCount} review${pendingReviewsCount === 1 ? "" : "s"} awaiting moderation`,
      to: "/dashboard/reviews"
    });
  }
  if (whatsappFailedCount > 0) {
    items.push({
      icon: AlertTriangle,
      tone: "red",
      text: `${whatsappFailedCount} WhatsApp message${whatsappFailedCount === 1 ? "" : "s"} failed to deliver (last 30 days)`,
      to: null
    });
  }

  if (items.length === 0) return <AllClear />;

  return (
    <>
      {/* Mobile */}
      <div className="md:hidden rounded-3xl bg-white border border-navy-100/70 shadow-card p-4">
        <div className="flex items-center justify-between mb-3">
          <h2 className="font-display font-semibold text-[15px] text-navy-900">Needs your attention</h2>
          <span className="min-w-[24px] h-6 px-2 rounded-full bg-primary-50 text-primary-600 text-[12px] font-bold flex items-center justify-center tabular-nums">
            {items.length}
          </span>
        </div>
        <div className="space-y-2">
          {items.map((item, idx) => (
            <MobileRow key={idx} {...item} />
          ))}
        </div>
      </div>

      {/* Desktop / tablet (unchanged) */}
      <Surface className="hidden md:block p-4">
        <SectionHeader title={`Needs your attention · ${items.length}`} />
        <div className="-mx-1 space-y-0.5">
          {items.map((item, idx) => (
            <Row key={idx} {...item} />
          ))}
        </div>
      </Surface>
    </>
  );
}
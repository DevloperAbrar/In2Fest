import React from "react";
import { Link } from "react-router-dom";
import { motion, useReducedMotion } from "framer-motion";
import { AlertTriangle, ChevronRight, MessageSquare, Star } from "lucide-react";
import { Surface, SectionHeader } from "./dashboardUi.jsx";
import { TONES } from "./dashboardTheme.js";

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

function AllClear() {
  const reduce = useReducedMotion();
  return (
    <Surface className="px-4 py-3.5 flex items-center gap-3">
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
    <Surface className="p-4">
      <SectionHeader title={`Needs your attention · ${items.length}`} />
      <div className="-mx-1 space-y-0.5">
        {items.map((item, idx) => (
          <Row key={idx} {...item} />
        ))}
      </div>
    </Surface>
  );
}
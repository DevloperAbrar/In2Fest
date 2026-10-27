import React from "react";
import { Link } from "react-router-dom";
import { ChevronRight } from "lucide-react";
import { formatCurrency } from "../../../lib/formatters";
import { Surface, SectionHeader } from "./dashboardUi.jsx";
import { TONES } from "./dashboardTheme.js";

const formatValue = (item) => {
  const v = Number(item.value) || 0;
  return item.kind === "currency" ? formatCurrency(Math.round(v)) : v.toLocaleString("en-IN");
};

function Row({ item }) {
  const tone = TONES[item.tone] || TONES.navy;
  const body = (
    <>
      <span className={`w-2.5 h-2.5 rounded-full shrink-0 ${tone.dot}`} aria-hidden="true" />
      <span className="min-w-0 flex-1">
        <span className="block text-[13.5px] font-medium text-navy-900 truncate">{item.label}</span>
        {item.hint && <span className="block text-[11.5px] text-navy-400 truncate">{item.hint}</span>}
      </span>
      <span className="font-display font-semibold text-[15px] text-navy-900 tabular-nums shrink-0">{formatValue(item)}</span>
      {item.to && <ChevronRight size={15} className="text-navy-300 shrink-0" />}
    </>
  );
  const cls = "flex items-center gap-3 py-3";
  return item.to ? (
    <Link to={item.to} className={`tap-scale ${cls} hover:bg-navy-50/60 -mx-2 px-2 rounded-xl`}>
      {body}
    </Link>
  ) : (
    <div className={cls}>{body}</div>
  );
}

export default function SegmentPulse({ title, items = [] }) {
  if (!items.length) return null;
  return (
    <Surface className="p-4 md:p-5">
      <SectionHeader title={title || "At a glance"} />
      <div className="divide-y divide-navy-100/70">
        {items.map((item) => (
          <Row key={item.key || item.label} item={item} />
        ))}
      </div>
    </Surface>
  );
}
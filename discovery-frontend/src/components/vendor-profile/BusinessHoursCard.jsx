import React, { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Clock, ChevronDown } from "lucide-react";

const DAYS = [
  ["mon", "Monday"], ["tue", "Tuesday"], ["wed", "Wednesday"], ["thu", "Thursday"],
  ["fri", "Friday"], ["sat", "Saturday"], ["sun", "Sunday"],
];

const toMin = (t) => {
  const [h, m] = String(t).split(":").map(Number);
  return h * 60 + (m || 0);
};

function fmt(t) {
  const [h, m] = String(t).split(":").map(Number);
  return `${h % 12 || 12}:${String(m || 0).padStart(2, "0")} ${h >= 12 ? "PM" : "AM"}`;
}

// Current day and time in India, so "open now" is right for the vendor wherever the visitor is.
function nowInIndia() {
  const parts = new Intl.DateTimeFormat("en-US", {
    timeZone: "Asia/Kolkata",
    weekday: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(new Date());
  const get = (type) => parts.find((p) => p.type === type)?.value;
  return {
    day: String(get("weekday")).slice(0, 3).toLowerCase(),
    minutes: (Number(get("hour")) % 24) * 60 + Number(get("minute")),
  };
}

function openStatus(hours) {
  if (hours.always_open) return { open: true, text: "Open 24 hours" };

  const { day, minutes } = nowInIndia();
  const today = hours.days?.[day];
  if (!today || today.closed || !today.shifts?.length) return { open: false, text: "Closed today" };

  for (const s of today.shifts) {
    const o = toMin(s.open);
    const c = toMin(s.close);
    const isOpen = c > o ? minutes >= o && minutes < c : minutes >= o || minutes < c; // c <= o means it closes after midnight
    if (isOpen) return { open: true, text: `Open now, closes ${fmt(s.close)}` };
  }
  const next = today.shifts.find((s) => toMin(s.open) > minutes);
  return { open: false, text: next ? `Closed now, opens ${fmt(next.open)}` : "Closed now" };
}

// Used by the hero to show the live "Open now" pill. Returns null when the vendor has no hours.
export function getOpenStatus(hours) {
  if (!hours || typeof hours !== "object" || hours.enabled === false || !hours.days) return null;
  return openStatus(hours);
}

export default function BusinessHoursCard({ hours }) {
  const [expanded, setExpanded] = useState(false);

  if (!hours || typeof hours !== "object" || hours.enabled === false || !hours.days) return null;

  const status = openStatus(hours);
  const todayKey = nowInIndia().day;

  const label = (d) => {
    const closed = !d || d.closed || !d.shifts?.length;
    return closed ? "Closed" : d.shifts.map((s) => `${fmt(s.open)} - ${fmt(s.close)}`).join(", ");
  };

  const todayName = DAYS.find(([k]) => k === todayKey)?.[1];

  return (
    <div className="bg-white border border-gray-100 rounded-3xl shadow-[0_1px_2px_rgba(11,14,28,0.04),0_10px_28px_-14px_rgba(11,14,28,0.10)] p-5">
      <div className="flex items-center justify-between gap-3 mb-3">
        <h3 className="font-display font-bold text-navy-900 flex items-center gap-2.5">
          <span className="w-9 h-9 rounded-xl bg-navy-50 text-navy-700 flex items-center justify-center">
            <Clock size={17} />
          </span>
          Opening hours
        </h3>
        <span
          className={`inline-flex items-center gap-1.5 text-[11px] font-semibold px-2.5 py-1 rounded-full ${
            status.open ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-600"
          }`}
        >
          <span className={`w-1.5 h-1.5 rounded-full ${status.open ? "bg-emerald-500" : "bg-rose-500"}`} />
          {status.text}
        </span>
      </div>

      {hours.always_open ? (
        <p className="text-sm text-gray-600">Open every day, all day.</p>
      ) : (
        <>
          <div className="flex items-start justify-between gap-3 text-sm bg-navy-50/70 rounded-xl px-3.5 py-2.5">
            <span className="font-semibold text-navy-900">Today ({todayName})</span>
            <span className="text-right text-navy-700 font-medium">{label(hours.days[todayKey])}</span>
          </div>

          <AnimatePresence initial={false}>
            {expanded && (
              <motion.ul
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.25 }}
                className="overflow-hidden"
              >
                <div className="pt-3 space-y-2">
                  {DAYS.map(([key, name]) => (
                    <li
                      key={key}
                      className={`flex items-start justify-between gap-3 text-xs ${
                        key === todayKey ? "font-bold text-navy-900" : "text-gray-500"
                      }`}
                    >
                      <span>{name}</span>
                      <span className="text-right">{label(hours.days[key])}</span>
                    </li>
                  ))}
                </div>
              </motion.ul>
            )}
          </AnimatePresence>

          <button
            type="button"
            onClick={() => setExpanded((e) => !e)}
            className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-accent-600 hover:text-accent-700"
          >
            {expanded ? "Hide full week" : "See full week"}
            <ChevronDown size={14} className={`transition-transform ${expanded ? "rotate-180" : ""}`} />
          </button>
        </>
      )}

      {hours.note && <p className="mt-3 text-xs text-gray-400">{hours.note}</p>}
    </div>
  );
}
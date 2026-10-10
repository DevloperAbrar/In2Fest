import React from "react";
import { Clock } from "lucide-react";

const DAYS = [
  ["mon", "Monday"], ["tue", "Tuesday"], ["wed", "Wednesday"], ["thu", "Thursday"],
  ["fri", "Friday"], ["sat", "Saturday"], ["sun", "Sunday"]
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
    hour12: false
  }).formatToParts(new Date());
  const get = (type) => parts.find((p) => p.type === type)?.value;
  return {
    day: String(get("weekday")).slice(0, 3).toLowerCase(),
    minutes: (Number(get("hour")) % 24) * 60 + Number(get("minute"))
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

export default function BusinessHoursCard({ hours }) {
  if (!hours || typeof hours !== "object" || hours.enabled === false || !hours.days) return null;

  const status = openStatus(hours);
  const todayKey = nowInIndia().day;

  return (
    <div className="bg-white border border-gray-100 rounded-2xl shadow-sm p-5">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2">
          <Clock size={14} className="text-gray-400" /> Opening hours
        </h3>
        <span
          className={`text-[11px] font-semibold px-2.5 py-1 rounded-full ${
            status.open ? "bg-emerald-50 text-emerald-700" : "bg-rose-50 text-rose-600"
          }`}
        >
          {status.text}
        </span>
      </div>

      {hours.always_open ? (
        <p className="text-sm text-gray-600">Open every day, all day.</p>
      ) : (
        <ul className="space-y-1.5">
          {DAYS.map(([key, name]) => {
            const d = hours.days[key];
            const closed = !d || d.closed || !d.shifts?.length;
            return (
              <li
                key={key}
                className={`flex items-start justify-between gap-3 text-xs ${
                  key === todayKey ? "font-semibold text-gray-900" : "text-gray-500"
                }`}
              >
                <span>{name}</span>
                <span className="text-right">
                  {closed ? "Closed" : d.shifts.map((s) => `${fmt(s.open)} - ${fmt(s.close)}`).join(", ")}
                </span>
              </li>
            );
          })}
        </ul>
      )}

      {hours.note && <p className="mt-3 text-xs text-gray-400">{hours.note}</p>}
    </div>
  );
}
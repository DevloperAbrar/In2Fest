import React, { useEffect, useState } from "react";
import { DAYS, normalizeBusinessHours, formatTime, getOpenStatus, getIstParts } from "../../../lib/businessHours";

export default function BusinessHoursDisplay({ hours, theme = "#7c3aed" }) {
  const h = normalizeBusinessHours(hours);
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60000);
    return () => clearInterval(id);
  }, []);

  const status = getOpenStatus(h, now);
  const { dayKey } = getIstParts(now);

  return (
    <div className="max-w-md mx-auto bg-white dark:bg-stone-800 rounded-3xl shadow-sm border border-stone-100 dark:border-stone-700 p-6">
      <div className="flex items-center justify-center gap-2 mb-5">
        <span className={`inline-block w-2.5 h-2.5 rounded-full ${status.isOpen ? "bg-green-500" : "bg-red-500"}`} />
        <span className={`text-sm font-bold ${status.isOpen ? "text-green-600" : "text-red-500"}`}>{status.label}</span>
        {status.detail && <span className="text-sm text-stone-400">· {status.detail}</span>}
      </div>

      {h.always_open ? (
        <p className="text-center text-stone-700 dark:text-stone-200 font-semibold">Open 24 hours, 7 days a week</p>
      ) : (
        <div>
          {DAYS.map((d) => {
            const day = h.days[d.key];
            const isToday = d.key === dayKey;
            return (
              <div
                key={d.key}
                className="flex items-start justify-between gap-4 py-2.5 px-3 rounded-xl"
                style={isToday ? { backgroundColor: `${theme}14` } : undefined}
              >
                <span className={`text-sm ${isToday ? "font-bold" : "font-medium"} text-stone-900 dark:text-white`}>
                  {d.label}
                </span>
                {day.closed ? (
                  <span className="text-sm text-stone-400">Closed</span>
                ) : (
                  <span className="text-sm font-medium text-right" style={{ color: theme }}>
                    {day.shifts.map((s, i) => (
                      <span key={i} className="block">
                        {formatTime(s.open)} - {formatTime(s.close)}
                      </span>
                    ))}
                  </span>
                )}
              </div>
            );
          })}
        </div>
      )}

      {h.note && <p className="mt-4 text-center text-xs text-stone-400">{h.note}</p>}
    </div>
  );
}
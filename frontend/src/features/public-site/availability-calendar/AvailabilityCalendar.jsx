import React, { useEffect, useMemo, useState } from "react";
import { ChevronLeft, ChevronRight, Loader2, Info, Package, Clock } from "lucide-react";
import axiosInstance from "../../../lib/axiosInstance";
import { requestInquiryForDate } from "../../../hooks/useInquiryDatePrefill";

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const pad = (n) => String(n).padStart(2, "0");
const getDaysInMonth = (y, m) => new Date(y, m + 1, 0).getDate();
const getFirstDay = (y, m) => new Date(y, m, 1).getDay();
const toYMD = (y, m, d) => `${y}-${pad(m + 1)}-${pad(d)}`;

function fmt(t) {
  if (!t) return "";
  const [h, m] = String(t).split(":");
  const hr = parseInt(h, 10);
  return `${hr % 12 || 12}:${m} ${hr >= 12 ? "PM" : "AM"}`;
}

const STATUS_CELL = {
  past: "text-stone-300 dark:text-stone-700 cursor-default",
  available:
    "bg-green-50 text-green-700 hover:bg-green-100 dark:bg-green-500/10 dark:text-green-400 dark:hover:bg-green-500/20",
  partial:
    "bg-amber-50 text-amber-700 hover:bg-amber-100 dark:bg-amber-500/10 dark:text-amber-400 dark:hover:bg-amber-500/20",
  booked:
    "bg-rose-50 text-rose-600 hover:bg-rose-100 dark:bg-rose-500/10 dark:text-rose-400 dark:hover:bg-rose-500/20",
};

// Day window the mini-timeline is drawn across (6 AM - 11 PM)
const TIMELINE_START_MIN = 6 * 60;
const TIMELINE_END_MIN = 23 * 60;

function timeToMin(t) {
  const [h, m] = String(t).split(":").map(Number);
  return h * 60 + (m || 0);
}

function timelinePct(t) {
  const pct = ((timeToMin(t) - TIMELINE_START_MIN) / (TIMELINE_END_MIN - TIMELINE_START_MIN)) * 100;
  return Math.max(0, Math.min(100, pct));
}

// Merge overlapping booked ranges into clean, non-overlapping busy blocks
function mergeRanges(ranges) {
  if (!ranges.length) return [];
  const sorted = [...ranges].sort((a, b) => a.start_time.localeCompare(b.start_time));
  const merged = [{ ...sorted[0] }];
  for (const r of sorted.slice(1)) {
    const last = merged[merged.length - 1];
    if (r.start_time <= last.end_time) {
      if (r.end_time > last.end_time) last.end_time = r.end_time;
    } else {
      merged.push({ ...r });
    }
  }
  return merged;
}

function MiniTimeline({ busyBlocks }) {
  return (
    <div>
      <div className="relative h-2.5 rounded-md bg-slate-100 dark:bg-stone-700 overflow-hidden">
        {busyBlocks.map((r, i) => {
          const left = timelinePct(r.start_time);
          const right = timelinePct(r.end_time);
          return (
            <div
              key={i}
              className="absolute top-0 bottom-0 rounded-sm bg-red-500"
              style={{ left: `${left}%`, width: `${Math.max(1.5, right - left)}%` }}
            />
          );
        })}
      </div>
      <div className="flex justify-between mt-0.5">
        <span className="text-[8px] font-semibold text-stone-300 dark:text-stone-500">6 AM</span>
        <span className="text-[8px] font-semibold text-stone-300 dark:text-stone-500">11 PM</span>
      </div>
    </div>
  );
}

function DayPopover({ label, ymd, dayInfo, theme, col, onClose, onSendInquiry }) {
  const items = [
    ...(dayInfo?.slots || []).map((s) => ({ ...s, _kind: "slot" })),
    ...(dayInfo?.packages || []).map((p) => ({ ...p, _kind: "package" })),
  ];

  // Keep the popup inside the card for the first / last columns
  const posClass = col <= 1 ? "left-0" : col >= 5 ? "right-0" : "left-1/2 -translate-x-1/2";
  const arrowClass = col <= 1 ? "left-5" : col >= 5 ? "right-5" : "left-1/2 -translate-x-1/2";

  return (
    <>
      <div className="fixed inset-0 z-40" onClick={onClose} aria-hidden="true" />
      <div
        role="dialog"
        aria-label={`Availability for ${label}`}
        className={`absolute z-50 top-[calc(100%+8px)] ${posClass} w-[264px] max-w-[calc(100vw-2rem)] max-h-[360px] flex flex-col rounded-2xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-900 shadow-2xl text-left`}
      >
        <div
          className={`absolute -top-1.5 ${arrowClass} w-3 h-3 rotate-45 bg-white dark:bg-stone-900 border-l border-t border-stone-200 dark:border-stone-700`}
        />

        <div className="flex items-center justify-between px-3.5 pt-3.5 pb-2.5 border-b border-stone-100 dark:border-stone-800 flex-shrink-0">
          <span className="font-bold text-[13px] text-stone-900 dark:text-white">{label}</span>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="text-stone-400 hover:text-stone-600 dark:hover:text-stone-200 text-[15px] leading-none p-0.5"
          >
            ✕
          </button>
        </div>

        <div className="overflow-y-auto min-h-0 px-3.5 pt-2.5 pb-3 flex flex-col gap-2.5">
          {items.length === 0 && (
            <p className="text-xs text-stone-400 m-0">No slots configured</p>
          )}

          {items.map((item, i) => {
            const isSlot = item._kind === "slot";
            const fullyBooked = item.is_fully_booked;
            const avail = item.available;
            const total = isSlot ? item.total_units : null;
            const busyBlocks = isSlot ? mergeRanges(item.ranges || []) : [];

            return (
              <div
                key={item.slot_id || item.package_id || i}
                className={`rounded-lg bg-stone-50 dark:bg-stone-800/60 border-l-[3px] px-2.5 py-2 ${
                  fullyBooked ? "border-l-red-500" : "border-l-emerald-500"
                }`}
              >
                <div className="flex items-center justify-between gap-1.5">
                  <div className="flex items-center gap-1.5 min-w-0">
                    {isSlot ? (
                      <Clock size={11} className="flex-shrink-0 text-stone-500 dark:text-stone-400" />
                    ) : (
                      <Package size={11} className="flex-shrink-0 text-purple-600" />
                    )}
                    <span className="font-semibold text-xs text-stone-800 dark:text-stone-100 truncate">
                      {isSlot ? item.slot_name : item.package_name}
                    </span>
                  </div>
                  <span
                    className={`flex-shrink-0 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                      fullyBooked
                        ? "bg-red-100 text-red-600 dark:bg-red-500/15 dark:text-red-400"
                        : avail > 0
                        ? "bg-emerald-100 text-emerald-600 dark:bg-emerald-500/15 dark:text-emerald-400"
                        : "bg-amber-100 text-amber-700 dark:bg-amber-500/15 dark:text-amber-400"
                    }`}
                  >
                    {fullyBooked ? "Full" : `${avail} free`}
                  </span>
                </div>

                {isSlot && busyBlocks.length > 0 ? (
                  <div className="mt-2">
                    <MiniTimeline busyBlocks={busyBlocks} />
                    <div className="flex flex-wrap gap-1 mt-1.5">
                      {busyBlocks.map((r, ri) => (
                        <span
                          key={ri}
                          className="text-[10px] font-semibold text-red-700 bg-red-50 dark:text-red-400 dark:bg-red-500/10 rounded-md px-1.5 py-0.5"
                        >
                          {fmt(r.start_time)} – {fmt(r.end_time)}
                        </span>
                      ))}
                    </div>
                    {total > 1 && (
                      <div className="text-[9.5px] text-stone-400 mt-1.5">
                        Peak usage: {item.occupied}/{total} units
                      </div>
                    )}
                  </div>
                ) : isSlot ? (
                  <div className="text-[11px] font-medium text-green-600 dark:text-green-400 mt-1.5">
                    Available all day
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>

        {onSendInquiry && (
          <div className="px-3.5 pt-2.5 pb-3.5 border-t border-stone-100 dark:border-stone-800 flex-shrink-0">
            <button
              type="button"
              onClick={() => {
                onSendInquiry(ymd);
                onClose();
              }}
              className="w-full rounded-xl py-2.5 text-[12.5px] font-bold text-white transition-opacity hover:opacity-90"
              style={{ backgroundColor: theme }}
            >
              Send Inquiry for this date
            </button>
          </div>
        )}
      </div>
    </>
  );
}

export default function AvailabilityCalendar({ venue, onSendInquiry = requestInquiryForDate }) {
  const theme = venue?.theme_color || "#7c3aed";

  const now = new Date();
  const todayYMD = toYMD(now.getFullYear(), now.getMonth(), now.getDate());

  const [viewYear, setViewYear] = useState(() => new Date().getFullYear());
  const [viewMonth, setViewMonth] = useState(() => new Date().getMonth());
  const [monthData, setMonthData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);
  const [activeDay, setActiveDay] = useState(null);
  const [reloadKey, setReloadKey] = useState(0);

  // Uses the PUBLIC discovery endpoint - no login needed
  useEffect(() => {
    if (!venue?.id) return undefined;
    let cancelled = false;

    setLoading(true);
    setError(false);
    setActiveDay(null);

    const from = toYMD(viewYear, viewMonth, 1);
    const to = toYMD(viewYear, viewMonth, getDaysInMonth(viewYear, viewMonth));

    axiosInstance
      .get(`/discovery/vendor-availability/${venue.id}`, { params: { from, to } })
      .then(({ data }) => {
        if (!cancelled) setMonthData(data?.data || null);
      })
      .catch(() => {
        if (!cancelled) setError(true);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => {
      cancelled = true;
    };
  }, [venue?.id, viewYear, viewMonth, reloadKey]);

  // Close popup on Escape
  useEffect(() => {
    if (!activeDay) return undefined;
    const onKey = (e) => {
      if (e.key === "Escape") setActiveDay(null);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [activeDay]);

  const dayMap = useMemo(() => {
    const map = {};
    if (monthData?.days) for (const d of monthData.days) map[d.date] = d;
    return map;
  }, [monthData]);

  const prevMonth = () => {
    if (viewMonth === 0) {
      setViewYear((y) => y - 1);
      setViewMonth(11);
    } else setViewMonth((m) => m - 1);
  };
  const nextMonth = () => {
    if (viewMonth === 11) {
      setViewYear((y) => y + 1);
      setViewMonth(0);
    } else setViewMonth((m) => m + 1);
  };
  const canGoPrev =
    viewYear > now.getFullYear() || (viewYear === now.getFullYear() && viewMonth > now.getMonth());

  const daysInMonth = getDaysInMonth(viewYear, viewMonth);
  const firstDay = getFirstDay(viewYear, viewMonth);
  const cells = [
    ...Array(firstDay).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  const hasAny = (monthData?.slots?.length || 0) + (monthData?.packages?.length || 0) > 0;

  return (
    <section
      id="availability"
      className="scroll-mt-24 py-24 bg-white dark:bg-stone-950 transition-colors"
    >
      <div className="max-w-3xl mx-auto px-4 sm:px-6">
        {/* Heading - same style as the other sections */}
        <div className="text-center mb-12">
          <div className="flex items-center justify-center gap-3 mb-4">
            <div className="h-px w-8" style={{ backgroundColor: theme }} />
            <span
              className="text-sm font-semibold uppercase tracking-widest"
              style={{ color: theme }}
            >
              Plan Your Event
            </span>
            <div className="h-px w-8" style={{ backgroundColor: theme }} />
          </div>
          <h2
            className="text-4xl md:text-5xl font-extrabold text-stone-900 dark:text-white"
            style={{ letterSpacing: "-0.02em" }}
          >
            Check Availability
          </h2>
          <p className="text-stone-400 dark:text-stone-500 mt-3 text-sm max-w-md mx-auto">
            Tap any date to see slot &amp; package availability.
          </p>
        </div>

        <div className="bg-white dark:bg-stone-900 rounded-3xl border border-stone-200/70 dark:border-stone-800 shadow-xl shadow-black/5 p-4 sm:p-8">
          {/* Month nav */}
          <div className="flex items-center justify-between mb-4">
            <button
              type="button"
              onClick={prevMonth}
              disabled={!canGoPrev}
              aria-label="Previous month"
              className="w-9 h-9 rounded-xl border border-stone-200 dark:border-stone-700 flex items-center justify-center hover:bg-stone-50 dark:hover:bg-stone-800 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
            >
              <ChevronLeft size={16} className="text-stone-600 dark:text-stone-300" />
            </button>
            <span className="font-bold text-base text-stone-900 dark:text-white">
              {MONTHS[viewMonth]} {viewYear}
            </span>
            <button
              type="button"
              onClick={nextMonth}
              aria-label="Next month"
              className="w-9 h-9 rounded-xl border border-stone-200 dark:border-stone-700 flex items-center justify-center hover:bg-stone-50 dark:hover:bg-stone-800 transition-colors"
            >
              <ChevronRight size={16} className="text-stone-600 dark:text-stone-300" />
            </button>
          </div>

          {/* Weekday headers */}
          <div className="grid grid-cols-7 mb-1.5">
            {DAYS.map((d) => (
              <div
                key={d}
                className="text-center text-[10px] font-semibold uppercase tracking-wider text-stone-400 py-1"
              >
                {d}
              </div>
            ))}
          </div>

          {/* Grid / states */}
          {loading ? (
            <div className="flex items-center justify-center h-[220px] text-stone-400">
              <Loader2 size={22} className="animate-spin" />
            </div>
          ) : error ? (
            <div className="flex flex-col items-center justify-center h-[220px] gap-3 text-stone-400 text-sm">
              <span>Could not load availability</span>
              <button
                type="button"
                onClick={() => setReloadKey((k) => k + 1)}
                className="px-4 py-1.5 rounded-full text-xs font-semibold text-white"
                style={{ backgroundColor: theme }}
              >
                Try again
              </button>
            </div>
          ) : !hasAny ? (
            <div className="flex flex-col items-center justify-center h-[220px] gap-3 text-stone-400 text-center px-4">
              <Info size={20} />
              <span className="text-sm">
                Live availability isn&apos;t published yet. Send us an enquiry and we&apos;ll
                confirm your date.
              </span>
              <button
                type="button"
                onClick={() => onSendInquiry("")}
                className="px-4 py-1.5 rounded-full text-xs font-semibold text-white"
                style={{ backgroundColor: theme }}
              >
                Send an Enquiry
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-7 gap-1">
              {cells.map((day, idx) => {
                if (!day) return <div key={`e-${idx}`} />;

                const ymd = toYMD(viewYear, viewMonth, day);
                const dayInfo = dayMap[ymd];
                const isPast = ymd < todayYMD;
                const status = isPast
                  ? "past"
                  : dayInfo?.day_status && dayInfo.day_status !== "past"
                  ? dayInfo.day_status
                  : "available";
                const isToday = ymd === todayYMD;
                const isActive = activeDay === ymd;

                const slotsOfDay = dayInfo?.slots || [];
                const pkgsOfDay = dayInfo?.packages || [];
                const totalCount = slotsOfDay.length + pkgsOfDay.length;
                const freeCount = [...slotsOfDay, ...pkgsOfDay].filter(
                  (x) => !x.is_fully_booked
                ).length;

                return (
                  <div key={ymd} className="relative">
                    <button
                      type="button"
                      disabled={isPast}
                      onClick={() => setActiveDay(isActive ? null : ymd)}
                      aria-expanded={isActive}
                      aria-label={`${MONTHS[viewMonth]} ${day}${
                        totalCount ? `, ${freeCount} of ${totalCount} available` : ""
                      }`}
                      className={`w-full min-h-[64px] sm:min-h-[76px] pt-2 pb-1 rounded-xl flex flex-col items-center justify-start select-none transition-colors ${
                        STATUS_CELL[status]
                      } ${isActive ? "ring-2 ring-inset ring-current" : ""}`}
                      style={
                        isToday ? { outline: `2px solid ${theme}`, outlineOffset: "-2px" } : undefined
                      }
                    >
                      <span
                        className={`text-sm leading-none ${
                          isToday ? "font-extrabold" : "font-semibold"
                        }`}
                      >
                        {day}
                      </span>

                      {!isPast && dayInfo && (
                        <span className="flex flex-wrap justify-center gap-0.5 mt-1.5 max-w-[34px]">
                          {slotsOfDay.slice(0, 3).map((s, i) => (
                            <span
                              key={`s${i}`}
                              className={`inline-block w-1.5 h-1.5 rounded-full ${
                                s.is_fully_booked
                                  ? "bg-red-500"
                                  : s.available < s.total_units
                                  ? "bg-amber-500"
                                  : "bg-emerald-500"
                              }`}
                            />
                          ))}
                          {pkgsOfDay.slice(0, 2).map((p, i) => (
                            <span
                              key={`p${i}`}
                              className={`inline-block w-1.5 h-1.5 rounded-full ${
                                p.is_fully_booked ? "bg-red-500" : "bg-purple-500"
                              }`}
                            />
                          ))}
                        </span>
                      )}

                      {!isPast && totalCount > 0 && (
                        <span className="text-[9px] font-semibold mt-0.5">
                          {freeCount}/{totalCount}
                        </span>
                      )}
                    </button>

                    {isActive && dayInfo && (
                      <DayPopover
                        label={`${MONTHS[viewMonth]} ${day}`}
                        ymd={ymd}
                        dayInfo={dayInfo}
                        theme={theme}
                        col={idx % 7}
                        onClose={() => setActiveDay(null)}
                        onSendInquiry={onSendInquiry}
                      />
                    )}
                  </div>
                );
              })}
            </div>
          )}

          {/* Legend */}
          <div className="flex flex-wrap gap-4 mt-5 pt-4 border-t border-stone-100 dark:border-stone-800">
            {[
              { cls: "bg-emerald-500", label: "Available" },
              { cls: "bg-amber-500", label: "Partial" },
              { cls: "bg-red-500", label: "Booked" },
              { cls: "bg-purple-500", label: "Package" },
            ].map(({ cls, label }) => (
              <div key={label} className="flex items-center gap-1.5">
                <span className={`inline-block w-2 h-2 rounded-full ${cls}`} />
                <span className="text-[11px] font-medium text-stone-500 dark:text-stone-400">
                  {label}
                </span>
              </div>
            ))}
            <div className="flex items-center gap-1.5">
              <span
                className="inline-block w-3.5 h-3.5 rounded"
                style={{ border: `2px solid ${theme}` }}
              />
              <span className="text-[11px] font-medium text-stone-500 dark:text-stone-400">
                Today
              </span>
            </div>
          </div>

          <p className="flex items-center gap-1 text-[10px] text-stone-400 mt-2">
            <Info size={11} /> Numbers show free/total slots + packages per day
          </p>
        </div>
      </div>
    </section>
  );
}
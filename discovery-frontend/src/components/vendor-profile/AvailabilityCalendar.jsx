import React, { useEffect, useState, useMemo } from "react";
import { ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import api from "../../lib/api";

/**
 * AvailabilityCalendar
 *
 * Read-only calendar showing booked vs available dates for a venue.
 * Fetches slot data from the same endpoint the subdomain website uses.
 *
 * Props:
 *   venueId : number  - the venue's ID
 */

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = [
  "January","February","March","April","May","June",
  "July","August","September","October","November","December"
];

function getDaysInMonth(year, month) {
  return new Date(year, month + 1, 0).getDate();
}

function getFirstDayOfMonth(year, month) {
  return new Date(year, month, 1).getDay();
}

function toYMD(year, month, day) {
  return `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

export default function AvailabilityCalendar({ venueId }) {
  const today = new Date();
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [bookedDates, setBookedDates] = useState([]); // array of "YYYY-MM-DD" strings
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);

  // Fetch booked dates whenever the viewed month changes
  useEffect(() => {
    if (!venueId) return;
    setLoading(true);
    setError(false);

    // Build month range to send to the API
    const from = `${viewYear}-${String(viewMonth + 1).padStart(2, "0")}-01`;
    const lastDay = getDaysInMonth(viewYear, viewMonth);
    const to = `${viewYear}-${String(viewMonth + 1).padStart(2, "0")}-${lastDay}`;

    api
      .get(`/vendor/availability/${venueId}`, { params: { from, to } })
      .then(({ data }) => {
        // Expecting data.data to be an array of "YYYY-MM-DD" booked dates
        setBookedDates(data?.data?.booked_dates || []);
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [venueId, viewYear, viewMonth]);

  const bookedSet = useMemo(() => new Set(bookedDates), [bookedDates]);

  const daysInMonth = getDaysInMonth(viewYear, viewMonth);
  const firstDay = getFirstDayOfMonth(viewYear, viewMonth);
  const todayYMD = toYMD(today.getFullYear(), today.getMonth(), today.getDate());

  const prevMonth = () => {
    if (viewMonth === 0) { setViewYear(y => y - 1); setViewMonth(11); }
    else setViewMonth(m => m - 1);
  };

  const nextMonth = () => {
    if (viewMonth === 11) { setViewYear(y => y + 1); setViewMonth(0); }
    else setViewMonth(m => m + 1);
  };

  // Don't allow going before current month
  const canGoPrev = viewYear > today.getFullYear() ||
    (viewYear === today.getFullYear() && viewMonth > today.getMonth());

  // Cells: leading empty + day cells
  const cells = [
    ...Array(firstDay).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  return (
    <div className="bg-white border border-gray-100 rounded-xl p-5 shadow-sm">
      <h2 className="font-semibold text-gray-800 mb-4 text-base">Availability</h2>

      {/* Month navigation */}
      <div className="flex items-center justify-between mb-4">
        <button
          onClick={prevMonth}
          disabled={!canGoPrev}
          className="p-1.5 rounded-lg hover:bg-gray-100 disabled:opacity-30 disabled:cursor-not-allowed transition-colors"
          aria-label="Previous month"
        >
          <ChevronLeft size={16} />
        </button>
        <span className="text-sm font-semibold text-gray-700">
          {MONTHS[viewMonth]} {viewYear}
        </span>
        <button
          onClick={nextMonth}
          className="p-1.5 rounded-lg hover:bg-gray-100 transition-colors"
          aria-label="Next month"
        >
          <ChevronRight size={16} />
        </button>
      </div>

      {/* Day headers */}
      <div className="grid grid-cols-7 mb-1">
        {DAYS.map(d => (
          <div key={d} className="text-center text-xs text-gray-400 font-medium py-1">{d}</div>
        ))}
      </div>

      {/* Calendar grid */}
      {loading ? (
        <div className="flex items-center justify-center h-32 text-gray-400">
          <Loader2 size={20} className="animate-spin" />
        </div>
      ) : error ? (
        <div className="flex items-center justify-center h-32 text-gray-400 text-sm">
          Could not load availability
        </div>
      ) : (
        <div className="grid grid-cols-7 gap-px">
          {cells.map((day, idx) => {
            if (!day) return <div key={`empty-${idx}`} />;

            const ymd = toYMD(viewYear, viewMonth, day);
            const isPast = ymd < todayYMD;
            const isBooked = bookedSet.has(ymd);
            const isToday = ymd === todayYMD;

            let cellClass = "aspect-square flex items-center justify-center text-xs rounded-lg font-medium transition-colors ";

            if (isPast) {
              cellClass += "text-gray-300 cursor-default";
            } else if (isBooked) {
              cellClass += "bg-red-50 text-red-400 line-through cursor-default";
            } else if (isToday) {
              cellClass += "bg-primary-600 text-white ring-2 ring-primary-300";
            } else {
              cellClass += "bg-green-50 text-green-700 hover:bg-green-100 cursor-default";
            }

            return (
              <div key={ymd} className={cellClass} title={isBooked ? "Booked" : isPast ? "" : "Available"}>
                {day}
              </div>
            );
          })}
        </div>
      )}

      {/* Legend */}
      <div className="flex items-center gap-4 mt-4 flex-wrap">
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded bg-green-100 border border-green-200" />
          <span className="text-xs text-gray-500">Available</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded bg-red-100 border border-red-200" />
          <span className="text-xs text-gray-500">Booked</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-3 rounded bg-primary-600" />
          <span className="text-xs text-gray-500">Today</span>
        </div>
      </div>
    </div>
  );
}
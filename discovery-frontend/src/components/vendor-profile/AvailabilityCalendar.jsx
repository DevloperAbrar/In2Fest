// discovery-frontend/src/components/vendor-profile/AvailabilityCalendar.jsx

import React, { useEffect, useState, useMemo, useCallback } from "react";
import { ChevronLeft, ChevronRight, Loader2, Info } from "lucide-react";
import api from "../../lib/api";

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

function formatTime(t) {
  if (!t) return "";
  const [h, m] = t.split(":");
  const hour = parseInt(h, 10);
  const ampm = hour >= 12 ? "PM" : "AM";
  const display = hour % 12 === 0 ? 12 : hour % 12;
  return `${display}:${m} ${ampm}`;
}

// Dot indicator for slot status inside a day cell
function SlotDot({ slot, selectedVenueType }) {
  const booked = selectedVenueType
    ? slot.venue_types_booked.includes(selectedVenueType)
    : slot.is_booked;

  return (
    <span
      title={`${slot.slot_name}: ${booked ? "Booked" : "Available"}`}
      style={{
        display: "inline-block",
        width: 6,
        height: 6,
        borderRadius: "50%",
        backgroundColor: booked ? "#EF4444" : "#10B981",
        flexShrink: 0,
      }}
    />
  );
}

// Tooltip shown on click of a day cell
function DayTooltip({ day, slots, selectedVenueType, allVenueTypes, onClose }) {
  return (
    <>
      {/* Backdrop to close on outside click */}
      <div
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 40,
        }}
        onClick={onClose}
      />
      <div
        style={{
          position: "absolute",
          zIndex: 50,
          top: "calc(100% + 8px)",
          left: "50%",
          transform: "translateX(-50%)",
          width: 220,
          backgroundColor: "#fff",
          border: "1px solid #E2E8F0",
          borderRadius: 14,
          boxShadow: "0 8px 24px rgba(15,23,42,0.12)",
          padding: "14px 14px 10px",
          fontSize: 12,
        }}
      >
        {/* Arrow */}
        <div style={{
          position: "absolute",
          top: -7,
          left: "50%",
          transform: "translateX(-50%)",
          width: 12,
          height: 12,
          backgroundColor: "#fff",
          border: "1px solid #E2E8F0",
          borderBottom: "none",
          borderRight: "none",
          transform: "translateX(-50%) rotate(45deg)",
        }} />

        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 10 }}>
          <span style={{ fontWeight: 700, color: "#0F172A", fontSize: 13 }}>{day}</span>
          <button
            onClick={onClose}
            style={{
              border: "none",
              background: "none",
              cursor: "pointer",
              color: "#94A3B8",
              fontSize: 15,
              lineHeight: 1,
              padding: "0 2px",
            }}
          >
            ✕
          </button>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {slots.map((slot, i) => {
            const booked = selectedVenueType
              ? slot.venue_types_booked.includes(selectedVenueType)
              : slot.is_booked;

            const partialTypes = !selectedVenueType && allVenueTypes.length > 0
              ? allVenueTypes.filter(vt => slot.venue_types_booked.includes(vt))
              : [];

            return (
              <div
                key={slot.slot_id}
                style={{
                  paddingBottom: i < slots.length - 1 ? 8 : 0,
                  borderBottom: i < slots.length - 1 ? "1px solid #F1F5F9" : "none",
                }}
              >
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 6 }}>
                  <span style={{ fontWeight: 600, color: "#1E293B", fontSize: 12 }}>{slot.slot_name}</span>
                  <span style={{
                    padding: "2px 8px",
                    borderRadius: 20,
                    fontSize: 10,
                    fontWeight: 700,
                    letterSpacing: 0.2,
                    backgroundColor: booked ? "#FEE2E2" : "#D1FAE5",
                    color: booked ? "#DC2626" : "#059669",
                  }}>
                    {booked ? "Booked" : "Free"}
                  </span>
                </div>
                {slot.start_time && slot.end_time && (
                  <div style={{ color: "#94A3B8", marginTop: 3, fontSize: 11 }}>
                    {formatTime(slot.start_time)} – {formatTime(slot.end_time)}
                  </div>
                )}
                {partialTypes.length > 0 && (
                  <div style={{ color: "#64748B", marginTop: 4, fontSize: 10 }}>
                    Booked halls: {partialTypes.join(", ")}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </>
  );
}

export default function AvailabilityCalendar({ venueId }) {
  const today = new Date();
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [monthData, setMonthData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(false);
  const [selectedVenueType, setSelectedVenueType] = useState("");
  const [activeDay, setActiveDay] = useState(null);

  const fetchMonth = useCallback((year, month) => {
    if (!venueId) return;
    setLoading(true);
    setError(false);
    setActiveDay(null);

    const from = `${year}-${String(month + 1).padStart(2, "0")}-01`;
    const lastDay = getDaysInMonth(year, month);
    const to = `${year}-${String(month + 1).padStart(2, "0")}-${lastDay}`;

    const params = { from, to };
    if (selectedVenueType) params.venue_type = selectedVenueType;

    api
      .get(`/vendor-availability/${venueId}`, { params })
      .then(({ data }) => setMonthData(data?.data || null))
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [venueId, selectedVenueType]);

  useEffect(() => {
    fetchMonth(viewYear, viewMonth);
  }, [viewYear, viewMonth, fetchMonth]);

  const dayMap = useMemo(() => {
    const map = {};
    if (monthData?.days) {
      for (const d of monthData.days) map[d.date] = d;
    }
    return map;
  }, [monthData]);

  const prevMonth = () => {
    if (viewMonth === 0) { setViewYear(y => y - 1); setViewMonth(11); }
    else setViewMonth(m => m - 1);
  };

  const nextMonth = () => {
    if (viewMonth === 11) { setViewYear(y => y + 1); setViewMonth(0); }
    else setViewMonth(m => m + 1);
  };

  const canGoPrev = viewYear > today.getFullYear() ||
    (viewYear === today.getFullYear() && viewMonth > today.getMonth());

  const daysInMonth = getDaysInMonth(viewYear, viewMonth);
  const firstDay = getFirstDayOfMonth(viewYear, viewMonth);

  const cells = [
    ...Array(firstDay).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  const allVenueTypes = monthData?.venue_types || [];
  const hasVenueTypes = allVenueTypes.length > 0;
  const hasSlots = (monthData?.slots?.length || 0) > 0;

  const todayYMD = today.toISOString().split("T")[0];

  // Status → theme tokens
  const statusTheme = {
    past:      { bg: "transparent", text: "#CBD5E1", hover: "transparent" },
    available: { bg: "#F0FDF4",     text: "#15803D", hover: "#DCFCE7" },
    partial:   { bg: "#FFFBEB",     text: "#B45309", hover: "#FEF3C7" },
    booked:    { bg: "#FFF1F2",     text: "#DC2626", hover: "#FFE4E6" },
  };

  return (
    <div style={{
      backgroundColor: "#fff",
      borderRadius: 20,
      padding: "24px 20px 20px",
      boxShadow: "0 2px 16px rgba(15,23,42,0.07)",
      border: "1px solid #F1F5F9",
      fontFamily: "'Inter', system-ui, sans-serif",
      width: "100%",
    }}>
      {/* Header */}
      <div style={{ marginBottom: 20 }}>
        <h2 style={{ fontWeight: 700, color: "#0F172A", fontSize: 18, margin: 0 }}>
          Availability
        </h2>
        <p style={{ color: "#94A3B8", fontSize: 12, margin: "4px 0 0", fontWeight: 400 }}>
          Tap any date to see slot details
        </p>
      </div>

      {/* Venue type filter tabs */}
      {hasVenueTypes && (
        <div style={{
          display: "flex",
          gap: 6,
          flexWrap: "wrap",
          marginBottom: 20,
          backgroundColor: "#F8FAFC",
          borderRadius: 12,
          padding: 4,
        }}>
          {["", ...allVenueTypes].map((vt) => {
            const isActive = selectedVenueType === vt;
            return (
              <button
                key={vt || "__all__"}
                onClick={() => setSelectedVenueType(vt)}
                style={{
                  flex: vt === "" ? "1 1 auto" : "1 1 0",
                  padding: "7px 14px",
                  borderRadius: 9,
                  border: "none",
                  cursor: "pointer",
                  fontSize: 12,
                  fontWeight: 600,
                  transition: "all 0.15s",
                  backgroundColor: isActive ? "#0F172A" : "transparent",
                  color: isActive ? "#fff" : "#64748B",
                  boxShadow: isActive ? "0 1px 6px rgba(15,23,42,0.18)" : "none",
                  whiteSpace: "nowrap",
                  textTransform: "capitalize",
                }}
              >
                {vt === "" ? "All Halls" : vt.replace(/-/g, " ")}
              </button>
            );
          })}
        </div>
      )}

      {/* Month navigation */}
      <div style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        marginBottom: 16,
      }}>
        <button
          onClick={prevMonth}
          disabled={!canGoPrev}
          aria-label="Previous month"
          style={{
            width: 34,
            height: 34,
            borderRadius: 10,
            border: "1px solid #E2E8F0",
            backgroundColor: "#fff",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: canGoPrev ? "pointer" : "not-allowed",
            opacity: canGoPrev ? 1 : 0.3,
            transition: "background 0.15s",
          }}
        >
          <ChevronLeft size={15} color="#475569" />
        </button>

        <span style={{ fontWeight: 700, color: "#0F172A", fontSize: 15, letterSpacing: -0.2 }}>
          {MONTHS[viewMonth]} {viewYear}
        </span>

        <button
          onClick={nextMonth}
          aria-label="Next month"
          style={{
            width: 34,
            height: 34,
            borderRadius: 10,
            border: "1px solid #E2E8F0",
            backgroundColor: "#fff",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            cursor: "pointer",
            transition: "background 0.15s",
          }}
        >
          <ChevronRight size={15} color="#475569" />
        </button>
      </div>

      {/* Day-of-week headers */}
      <div style={{
        display: "grid",
        gridTemplateColumns: "repeat(7, 1fr)",
        marginBottom: 6,
      }}>
        {DAYS.map(d => (
          <div key={d} style={{
            textAlign: "center",
            fontSize: 10,
            fontWeight: 600,
            color: "#94A3B8",
            padding: "4px 0",
            letterSpacing: 0.6,
            textTransform: "uppercase",
          }}>
            {d}
          </div>
        ))}
      </div>

      {/* Calendar grid */}
      {loading ? (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 180, color: "#94A3B8" }}>
          <Loader2 size={22} style={{ animation: "spin 1s linear infinite" }} />
        </div>
      ) : error ? (
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: 180, color: "#94A3B8", fontSize: 13 }}>
          Could not load availability
        </div>
      ) : !hasSlots ? (
        <div style={{ display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", height: 180, color: "#94A3B8", gap: 8 }}>
          <Info size={18} />
          <span style={{ fontSize: 13 }}>No slots configured yet</span>
        </div>
      ) : (
        <div style={{
          display: "grid",
          gridTemplateColumns: "repeat(7, 1fr)",
          gap: 3,
        }}>
          {cells.map((day, idx) => {
            if (!day) return <div key={`empty-${idx}`} />;

            const ymd = toYMD(viewYear, viewMonth, day);
            const dayInfo = dayMap[ymd];
            const status = dayInfo?.day_status || (ymd < todayYMD ? "past" : "available");
            const isToday = ymd === todayYMD;
            const isActive = activeDay === ymd;

            let effectiveStatus = status;
            if (selectedVenueType && dayInfo) {
              const allSlotsBooked = (dayInfo.slots || []).every(
                s => s.venue_types_booked.includes(selectedVenueType)
              );
              const someSlotsBooked = (dayInfo.slots || []).some(
                s => s.venue_types_booked.includes(selectedVenueType)
              );
              if (status !== "past") {
                effectiveStatus = allSlotsBooked ? "booked" : someSlotsBooked ? "partial" : "available";
              }
            }

            const theme = statusTheme[effectiveStatus] || statusTheme.available;
            const canClick = effectiveStatus !== "past";
            const isPast = effectiveStatus === "past";

            return (
              <div
                key={ymd}
                onClick={() => {
                  if (!canClick) return;
                  setActiveDay(isActive ? null : ymd);
                }}
                style={{
                  position: "relative",
                  minHeight: 72,
                  display: "flex",
                  flexDirection: "column",
                  alignItems: "center",
                  justifyContent: "flex-start",
                  paddingTop: 10,
                  paddingBottom: 6,
                  borderRadius: 10,
                  cursor: canClick ? "pointer" : "default",
                  backgroundColor: isActive ? (theme.hover) : theme.bg,
                  outline: isToday ? "2px solid #6366F1" : isActive ? `2px solid ${theme.text}` : "2px solid transparent",
                  outlineOffset: -2,
                  transition: "background-color 0.12s, outline 0.12s",
                  userSelect: "none",
                }}
                onMouseEnter={e => {
                  if (canClick && !isActive) e.currentTarget.style.backgroundColor = theme.hover;
                }}
                onMouseLeave={e => {
                  if (!isActive) e.currentTarget.style.backgroundColor = isActive ? theme.hover : theme.bg;
                }}
              >
                {/* Day number */}
                <span style={{
                  fontSize: 15,
                  fontWeight: isToday ? 800 : 600,
                  color: theme.text,
                  lineHeight: 1,
                  textDecoration: effectiveStatus === "booked" ? "line-through" : "none",
                }}>
                  {day}
                </span>

                {/* Slot dots — only when not "past" and slots exist */}
                {canClick && dayInfo?.slots?.length > 0 && !selectedVenueType && (
                  <div style={{
                    display: "flex",
                    gap: 3,
                    marginTop: 5,
                    flexWrap: "wrap",
                    justifyContent: "center",
                    maxWidth: 32,
                  }}>
                    {dayInfo.slots.slice(0, 3).map((slot) => (
                      <SlotDot
                        key={slot.slot_id}
                        slot={slot}
                        selectedVenueType={selectedVenueType}
                      />
                    ))}
                    {dayInfo.slots.length > 3 && (
                      <span style={{ fontSize: 9, color: "#94A3B8", lineHeight: 1.2 }}>
                        +{dayInfo.slots.length - 3}
                      </span>
                    )}
                  </div>
                )}

                {/* Single status dot for venue-type filtered view */}
                {canClick && selectedVenueType && effectiveStatus !== "past" && (
                  <div style={{
                    width: 6,
                    height: 6,
                    borderRadius: "50%",
                    marginTop: 5,
                    backgroundColor:
                      effectiveStatus === "booked" ? "#EF4444"
                      : effectiveStatus === "partial" ? "#F59E0B"
                      : "#10B981",
                  }} />
                )}

                {/* Tooltip */}
                {isActive && dayInfo?.slots?.length > 0 && (
                  <DayTooltip
                    day={`${MONTHS[viewMonth]} ${day}`}
                    slots={dayInfo.slots}
                    selectedVenueType={selectedVenueType}
                    allVenueTypes={allVenueTypes}
                    onClose={() => setActiveDay(null)}
                  />
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Legend */}
      <div style={{
        display: "flex",
        alignItems: "center",
        gap: 16,
        marginTop: 18,
        flexWrap: "wrap",
        borderTop: "1px solid #F1F5F9",
        paddingTop: 14,
      }}>
        {[
          { color: "#10B981", label: "Available" },
          ...(hasVenueTypes && !selectedVenueType ? [{ color: "#F59E0B", label: "Partial" }] : []),
          { color: "#EF4444", label: "Booked" },
        ].map(({ color, label }) => (
          <div key={label} style={{ display: "flex", alignItems: "center", gap: 6 }}>
            <span style={{
              display: "inline-block",
              width: 8,
              height: 8,
              borderRadius: "50%",
              backgroundColor: color,
            }} />
            <span style={{ fontSize: 11, color: "#64748B", fontWeight: 500 }}>{label}</span>
          </div>
        ))}
        <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
          <span style={{
            display: "inline-block",
            width: 14,
            height: 14,
            borderRadius: 4,
            border: "2px solid #6366F1",
            backgroundColor: "transparent",
          }} />
          <span style={{ fontSize: 11, color: "#64748B", fontWeight: 500 }}>Today</span>
        </div>
      </div>

      {hasVenueTypes && !selectedVenueType && (
        <p style={{
          fontSize: 10,
          color: "#94A3B8",
          marginTop: 8,
          display: "flex",
          alignItems: "center",
          gap: 4,
          margin: "8px 0 0",
        }}>
          <Info size={11} />
          Amber dates have some halls still available — filter by hall above for details.
        </p>
      )}

      {/* Spin keyframe for the loader */}
      <style>{`@keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}
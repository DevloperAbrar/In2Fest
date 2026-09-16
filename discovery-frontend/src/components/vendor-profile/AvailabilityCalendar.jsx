import React, { useEffect, useState, useMemo, useCallback } from "react";
import { ChevronLeft, ChevronRight, Loader2, Info, Package, Clock } from "lucide-react";
import api from "../../lib/api";

const DAYS   = ["Sun","Mon","Tue","Wed","Thu","Fri","Sat"];
const MONTHS = ["January","February","March","April","May","June","July","August","September","October","November","December"];

function getDaysInMonth(y, m) { return new Date(y, m + 1, 0).getDate(); }
function getFirstDay(y, m)    { return new Date(y, m, 1).getDay(); }
function toYMD(y, m, d)       { return `${y}-${String(m+1).padStart(2,"0")}-${String(d).padStart(2,"0")}`; }
function fmt(t) {
  if (!t) return "";
  const [h, m] = t.split(":");
  const hr = parseInt(h);
  return `${hr%12||12}:${m} ${hr>=12?"PM":"AM"}`;
}

const statusTheme = {
  past:      { bg: "transparent", text: "#CBD5E1" },
  available: { bg: "#F0FDF4",     text: "#15803D" },
  partial:   { bg: "#FFFBEB",     text: "#B45309" },
  booked:    { bg: "#FFF1F2",     text: "#DC2626" },
};

// Day window the mini-timeline visual is drawn across. Event/venue bookings
// realistically fall in this range - tighten or widen if a vendor's actual
// hours differ noticeably.
const TIMELINE_START_MIN = 6 * 60;   // 6:00 AM
const TIMELINE_END_MIN   = 23 * 60;  // 11:00 PM

function timeToMin(t) {
  const [h, m] = String(t).split(":").map(Number);
  return h * 60 + (m || 0);
}

function timelinePct(t) {
  const mins = timeToMin(t);
  const pct = ((mins - TIMELINE_START_MIN) / (TIMELINE_END_MIN - TIMELINE_START_MIN)) * 100;
  return Math.max(0, Math.min(100, pct));
}

// Collapses raw per-booking ranges into merged, non-overlapping busy blocks
// for a clean display - e.g. four overlapping 1-6pm bookings become one
// "1:00 PM - 6:00 PM" block instead of four separate rows.
function mergeRanges(ranges) {
  if (!ranges.length) return [];
  const sorted = [...ranges].sort((a, b) => a.start_time.localeCompare(b.start_time));
  const merged = [sorted[0]];
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
      <div style={{ position:"relative", height:10, borderRadius:5, backgroundColor:"#F1F5F9", overflow:"hidden" }}>
        {busyBlocks.map((r, i) => {
          const left  = timelinePct(r.start_time);
          const right = timelinePct(r.end_time);
          return (
            <div key={i} style={{
              position:"absolute", top:0, bottom:0,
              left:`${left}%`, width:`${Math.max(1.5, right - left)}%`,
              backgroundColor:"#EF4444", borderRadius:3
            }} />
          );
        })}
      </div>
      <div style={{ display:"flex", justifyContent:"space-between", marginTop:2 }}>
        <span style={{ fontSize:8, color:"#CBD5E1", fontWeight:600 }}>6 AM</span>
        <span style={{ fontSize:8, color:"#CBD5E1", fontWeight:600 }}>11 PM</span>
      </div>
    </div>
  );
}

function Tooltip({ day, dayInfo, onClose }) {
  const slots    = dayInfo?.slots    || [];
  const packages = dayInfo?.packages || [];
  const all      = [...slots.map(s => ({ ...s, _kind: "slot" })), ...packages.map(p => ({ ...p, _kind: "package" }))];

  return (
    <>
      <div style={{ position:"fixed", inset:0, zIndex:40 }} onClick={onClose} />
      <div style={{
        position:"absolute", zIndex:50, top:"calc(100% + 8px)", left:"50%",
        transform:"translateX(-50%)", width:264, backgroundColor:"#fff",
        border:"1px solid #E2E8F0", borderRadius:16,
        boxShadow:"0 12px 32px rgba(15,23,42,0.16)",
        display:"flex", flexDirection:"column", maxHeight:360
      }}>
        <div style={{ position:"absolute", top:-7, left:"50%", transform:"translateX(-50%) rotate(45deg)",
          width:12, height:12, backgroundColor:"#fff", border:"1px solid #E2E8F0",
          borderBottom:"none", borderRight:"none" }} />

        <div style={{
          display:"flex", justifyContent:"space-between", alignItems:"center",
          padding:"14px 14px 10px", borderBottom:"1px solid #F1F5F9", flexShrink:0
        }}>
          <span style={{ fontWeight:700, color:"#0F172A", fontSize:13 }}>{day}</span>
          <button onClick={onClose} style={{ border:"none", background:"none", cursor:"pointer", color:"#94A3B8", fontSize:15, lineHeight:1, padding:2 }}>✕</button>
        </div>

        <div style={{ overflowY:"auto", padding:"10px 14px 12px", display:"flex", flexDirection:"column", gap:10 }}>
          {all.length === 0 && <p style={{ color:"#94A3B8", fontSize:12, margin:0 }}>No slots configured</p>}
          {all.map((item, i) => {
            const isSlot      = item._kind === "slot";
            const fullyBooked = item.is_fully_booked;
            const avail       = item.available;
            const total       = isSlot ? item.total_units : null;
            const busyBlocks  = isSlot ? mergeRanges(item.ranges || []) : [];

            return (
              <div key={i} style={{
                borderLeft: `3px solid ${fullyBooked ? "#EF4444" : "#10B981"}`,
                borderRadius: 8,
                backgroundColor: "#FAFBFC",
                padding: "8px 10px"
              }}>
                <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", gap:6 }}>
                  <div style={{ display:"flex", alignItems:"center", gap:5, minWidth:0 }}>
                    {isSlot
                      ? <Clock size={11} color="#64748B" style={{ flexShrink:0 }} />
                      : <Package size={11} color="#7C3AED" style={{ flexShrink:0 }} />}
                    <span style={{ fontWeight:600, color:"#1E293B", fontSize:12, whiteSpace:"nowrap", overflow:"hidden", textOverflow:"ellipsis" }}>
                      {isSlot ? item.slot_name : item.package_name}
                    </span>
                  </div>
                  <span style={{
                    flexShrink:0, padding:"2px 8px", borderRadius:20, fontSize:10, fontWeight:700,
                    backgroundColor: fullyBooked ? "#FEE2E2" : avail > 0 ? "#D1FAE5" : "#FEF3C7",
                    color: fullyBooked ? "#DC2626" : avail > 0 ? "#059669" : "#B45309"
                  }}>
                    {fullyBooked ? "Full" : `${avail} free`}
                  </span>
                </div>

                {isSlot && busyBlocks.length > 0 ? (
                  <div style={{ marginTop:7 }}>
                    <MiniTimeline busyBlocks={busyBlocks} />
                    <div style={{ display:"flex", flexWrap:"wrap", gap:4, marginTop:6 }}>
                      {busyBlocks.map((r, ri) => (
                        <span key={ri} style={{
                          fontSize:10, fontWeight:600, color:"#B91C1C",
                          backgroundColor:"#FEF2F2", borderRadius:6, padding:"2px 7px"
                        }}>
                          {fmt(r.start_time)} – {fmt(r.end_time)}
                        </span>
                      ))}
                    </div>
                    {total > 1 && (
                      <div style={{ color:"#94A3B8", marginTop:5, fontSize:9.5 }}>
                        Peak usage: {item.occupied}/{total} units
                      </div>
                    )}
                  </div>
                ) : isSlot ? (
                  <div style={{ color:"#16A34A", marginTop:6, fontSize:11, fontWeight:500 }}>
                    Available all day
                  </div>
                ) : null}
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
  const [viewYear, setViewYear]     = useState(today.getFullYear());
  const [viewMonth, setViewMonth]   = useState(today.getMonth());
  const [monthData, setMonthData]   = useState(null);
  const [loading, setLoading]       = useState(false);
  const [error, setError]           = useState(false);
  const [activeDay, setActiveDay]   = useState(null);

  const fetchMonth = useCallback((year, month) => {
    if (!venueId) return;
    setLoading(true); setError(false); setActiveDay(null);
    const from = `${year}-${String(month+1).padStart(2,"0")}-01`;
    const to   = `${year}-${String(month+1).padStart(2,"0")}-${getDaysInMonth(year,month)}`;
    api.get(`/vendor-availability/${venueId}`, { params:{ from, to } })
      .then(({ data }) => setMonthData(data?.data || null))
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [venueId]);

  useEffect(() => { fetchMonth(viewYear, viewMonth); }, [viewYear, viewMonth, fetchMonth]);

  const dayMap = useMemo(() => {
    const map = {};
    if (monthData?.days) for (const d of monthData.days) map[d.date] = d;
    return map;
  }, [monthData]);

  const prevMonth = () => { if (viewMonth===0){setViewYear(y=>y-1);setViewMonth(11);}else setViewMonth(m=>m-1); };
  const nextMonth = () => { if (viewMonth===11){setViewYear(y=>y+1);setViewMonth(0);}else setViewMonth(m=>m+1); };
  const canGoPrev = viewYear > today.getFullYear() || (viewYear===today.getFullYear() && viewMonth>today.getMonth());

  const daysInMonth = getDaysInMonth(viewYear, viewMonth);
  const firstDay    = getFirstDay(viewYear, viewMonth);
  const todayYMD    = today.toISOString().split("T")[0];

  const cells = [...Array(firstDay).fill(null), ...Array.from({length:daysInMonth},(_,i)=>i+1)];

  const hasSlots    = (monthData?.slots?.length    || 0) > 0;
  const hasPackages = (monthData?.packages?.length || 0) > 0;
  const hasAny      = hasSlots || hasPackages;

  return (
    <div style={{ backgroundColor:"#fff", borderRadius:20, padding:"24px 20px 20px",
      boxShadow:"0 2px 16px rgba(15,23,42,0.07)", border:"1px solid #F1F5F9",
      fontFamily:"'Inter',system-ui,sans-serif", width:"100%" }}>

      <div style={{ marginBottom:20 }}>
        <h2 style={{ fontWeight:700, color:"#0F172A", fontSize:18, margin:0 }}>Availability</h2>
        <p style={{ color:"#94A3B8", fontSize:12, margin:"4px 0 0" }}>Tap any date to see slot & package availability</p>
      </div>

      {/* Month nav */}
      <div style={{ display:"flex", alignItems:"center", justifyContent:"space-between", marginBottom:16 }}>
        <button onClick={prevMonth} disabled={!canGoPrev}
          style={{ width:34, height:34, borderRadius:10, border:"1px solid #E2E8F0", backgroundColor:"#fff",
            display:"flex", alignItems:"center", justifyContent:"center",
            cursor:canGoPrev?"pointer":"not-allowed", opacity:canGoPrev?1:0.3 }}>
          <ChevronLeft size={15} color="#475569" />
        </button>
        <span style={{ fontWeight:700, color:"#0F172A", fontSize:15 }}>{MONTHS[viewMonth]} {viewYear}</span>
        <button onClick={nextMonth}
          style={{ width:34, height:34, borderRadius:10, border:"1px solid #E2E8F0", backgroundColor:"#fff",
            display:"flex", alignItems:"center", justifyContent:"center", cursor:"pointer" }}>
          <ChevronRight size={15} color="#475569" />
        </button>
      </div>

      {/* Day headers */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(7,1fr)", marginBottom:6 }}>
        {DAYS.map(d => (
          <div key={d} style={{ textAlign:"center", fontSize:10, fontWeight:600, color:"#94A3B8", padding:"4px 0", letterSpacing:0.6, textTransform:"uppercase" }}>
            {d}
          </div>
        ))}
      </div>

      {/* Grid */}
      {loading ? (
        <div style={{ display:"flex", alignItems:"center", justifyContent:"center", height:180, color:"#94A3B8" }}>
          <Loader2 size={22} style={{ animation:"spin 1s linear infinite" }} />
        </div>
      ) : error ? (
        <div style={{ display:"flex", alignItems:"center", justifyContent:"center", height:180, color:"#94A3B8", fontSize:13 }}>
          Could not load availability
        </div>
      ) : !hasAny ? (
        <div style={{ display:"flex", flexDirection:"column", alignItems:"center", justifyContent:"center", height:180, color:"#94A3B8", gap:8 }}>
          <Info size={18} /><span style={{ fontSize:13 }}>No slots configured yet</span>
        </div>
      ) : (
        <div style={{ display:"grid", gridTemplateColumns:"repeat(7,1fr)", gap:3 }}>
          {cells.map((day, idx) => {
            if (!day) return <div key={`e-${idx}`} />;
            const ymd     = toYMD(viewYear, viewMonth, day);
            const dayInfo = dayMap[ymd];
            const status  = dayInfo?.day_status || (ymd < todayYMD ? "past" : "available");
            const isToday = ymd === todayYMD;
            const isActive = activeDay === ymd;
            const theme   = statusTheme[status] || statusTheme.available;
            const canClick = status !== "past";

            // Count free units across all slots + packages for this day
            const freeCount = dayInfo
              ? [...(dayInfo.slots||[]), ...(dayInfo.packages||[])].filter(x => !x.is_fully_booked).length
              : 0;
            const totalCount = dayInfo
              ? (dayInfo.slots||[]).length + (dayInfo.packages||[]).length
              : 0;

            return (
              <div key={ymd}
                onClick={() => { if (!canClick) return; setActiveDay(isActive ? null : ymd); }}
                style={{
                  position:"relative", minHeight:68,
                  display:"flex", flexDirection:"column", alignItems:"center",
                  justifyContent:"flex-start", paddingTop:8, paddingBottom:4,
                  borderRadius:10,
                  cursor: canClick ? "pointer" : "default",
                  backgroundColor: isActive ? (statusTheme[status]?.bg || "#F0FDF4") : theme.bg,
                  outline: isToday ? "2px solid #6366F1" : isActive ? `2px solid ${theme.text}` : "2px solid transparent",
                  outlineOffset: -2,
                  transition:"background-color 0.12s",
                  userSelect:"none"
                }}>

                <span style={{ fontSize:14, fontWeight:isToday?800:600, color:theme.text, lineHeight:1 }}>
                  {day}
                </span>

                {/* Availability dots */}
                {canClick && dayInfo && (
                  <div style={{ display:"flex", gap:2, marginTop:4, flexWrap:"wrap", justifyContent:"center", maxWidth:28 }}>
                    {(dayInfo.slots || []).slice(0, 3).map((s, i) => (
                      <span key={i} style={{
                        display:"inline-block", width:5, height:5, borderRadius:"50%",
                        backgroundColor: s.is_fully_booked ? "#EF4444" : s.available < s.total_units ? "#F59E0B" : "#10B981"
                      }} />
                    ))}
                    {(dayInfo.packages || []).slice(0, 2).map((p, i) => (
                      <span key={`p${i}`} style={{
                        display:"inline-block", width:5, height:5, borderRadius:"50%",
                        backgroundColor: p.is_fully_booked ? "#EF4444" : "#A855F7"
                      }} />
                    ))}
                  </div>
                )}

                {/* Free count badge */}
                {canClick && totalCount > 0 && (
                  <span style={{ fontSize:9, color:theme.text, marginTop:2, fontWeight:600 }}>
                    {freeCount}/{totalCount}
                  </span>
                )}

                {/* Tooltip */}
                {isActive && dayInfo && (
                  <Tooltip
                    day={`${MONTHS[viewMonth]} ${day}`}
                    dayInfo={dayInfo}
                    onClose={() => setActiveDay(null)}
                  />
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Legend */}
      <div style={{ display:"flex", gap:16, marginTop:18, flexWrap:"wrap", borderTop:"1px solid #F1F5F9", paddingTop:14 }}>
        {[
          { color:"#10B981", label:"Available" },
          { color:"#F59E0B", label:"Partial" },
          { color:"#EF4444", label:"Booked" },
          { color:"#A855F7", label:"Package" },
        ].map(({ color, label }) => (
          <div key={label} style={{ display:"flex", alignItems:"center", gap:6 }}>
            <span style={{ display:"inline-block", width:8, height:8, borderRadius:"50%", backgroundColor:color }} />
            <span style={{ fontSize:11, color:"#64748B", fontWeight:500 }}>{label}</span>
          </div>
        ))}
        <div style={{ display:"flex", alignItems:"center", gap:6 }}>
          <span style={{ display:"inline-block", width:14, height:14, borderRadius:4, border:"2px solid #6366F1" }} />
          <span style={{ fontSize:11, color:"#64748B", fontWeight:500 }}>Today</span>
        </div>
      </div>

      <p style={{ fontSize:10, color:"#94A3B8", marginTop:8, display:"flex", alignItems:"center", gap:4 }}>
        <Info size={11} /> Numbers show free/total slots+packages per day
      </p>

      <style>{`@keyframes spin { from{transform:rotate(0deg)}to{transform:rotate(360deg)} }`}</style>
    </div>
  );
}
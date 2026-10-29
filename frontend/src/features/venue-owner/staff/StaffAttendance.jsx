import React, { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ChevronLeft, ChevronRight, CheckCheck } from "lucide-react";
import { useVenue } from "../../../context/VenueContext.jsx";
import { staffService } from "../../../services/staffService";
import Button from "../../../components/common/Button";
import Card from "../../../components/common/Card";
import Loader from "../../../components/common/Loader";
import EmptyState from "../../../components/common/EmptyState";
import { showSuccess, showError } from "../../../components/common/Toast";
import { errMsg, todayISO, fmtDate } from "../gym/gymShared.jsx";
import { StaffPage, STATUS } from "./staffShared.jsx";

export default function StaffAttendance() {
  const { venue } = useVenue();
  const vid = venue?.id;
  const [date, setDate] = useState(todayISO());
  const [data, setData] = useState(null);
  const [marks, setMarks] = useState({});
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (!vid) return;
    setLoading(true);
    try {
      const r = await staffService.attendance(vid, date);
      setData(r.data.data);
      setMarks({});
    } catch (e) { showError(errMsg(e)); } finally { setLoading(false); }
  }, [vid, date]);
  useEffect(() => { load(); }, [load]);

  const shift = (n) => {
    const d = new Date(`${date}T00:00:00Z`);
    d.setUTCDate(d.getUTCDate() + n);
    const s = d.toISOString().slice(0, 10);
    if (s <= todayISO()) setDate(s);
  };
  const cur = (r) => (r.id in marks ? marks[r.id] : r.status);
  const pick = (r, s) => setMarks((m) => ({ ...m, [r.id]: cur(r) === s ? null : s }));
  const allPresent = () => setMarks((m) => {
    const n = { ...m };
    (data?.rows || []).forEach((r) => { if (!r.is_week_off && !cur(r)) n[r.id] = "present"; });
    return n;
  });
  const dirty = Object.keys(marks).length;

  const save = async () => {
    setBusy(true);
    try {
      const entries = Object.entries(marks).map(([staff_id, status]) => ({ staff_id, status }));
      const r = await staffService.markAttendance(vid, { date, entries });
      setData(r.data.data);
      setMarks({});
      showSuccess("Attendance saved");
    } catch (e) { showError(errMsg(e)); } finally { setBusy(false); }
  };

  const rows = data?.rows || [];
  const tally = rows.reduce((a, r) => {
    const s = cur(r);
    if (s) a[s] = (a[s] || 0) + 1;
    else if (!r.is_week_off) a.none = (a.none || 0) + 1;
    return a;
  }, {});
  const isToday = date === todayISO();

  return (
    <StaffPage title="Daily attendance" subtitle={isToday ? "Mark today's attendance for your team" : `Editing ${fmtDate(date)}`}
      actions={<Button onClick={save} loading={busy} disabled={!dirty}>Save{dirty ? ` (${dirty})` : ""}</Button>}>
      <Card className="mb-4">
        <div className="flex items-center justify-between gap-2">
          <button type="button" onClick={() => shift(-1)} className="p-2 rounded-lg border border-navy-200"><ChevronLeft size={16} /></button>
          <div className="text-center">
            <input type="date" value={date} max={todayISO()} onChange={(e) => e.target.value && e.target.value <= todayISO() && setDate(e.target.value)}
              className="border border-navy-200 rounded-lg px-3 py-1.5 text-sm" />
            <p className="text-xs text-navy-400 mt-1">{isToday ? "Today" : fmtDate(date)}</p>
          </div>
          <button type="button" onClick={() => shift(1)} disabled={date >= todayISO()} className="p-2 rounded-lg border border-navy-200 disabled:opacity-30"><ChevronRight size={16} /></button>
        </div>
        <div className="flex flex-wrap gap-2 mt-3 text-xs">
          {STATUS.map((s) => <span key={s.key} className="px-2 py-1 rounded-full bg-navy-50 text-navy-600">{s.label}: <b>{tally[s.key] || 0}</b></span>)}
          <span className="px-2 py-1 rounded-full bg-amber-50 text-amber-700">Not marked: <b>{tally.none || 0}</b></span>
        </div>
      </Card>

      {loading ? <Loader /> : !rows.length ? (
        <EmptyState title="No staff for this date" description="Add staff from the Staff tab first." />
      ) : (
        <>
          <div className="flex justify-end mb-2">
            <Button variant="outline" onClick={allPresent}><CheckCheck size={15} /> Mark all present</Button>
          </div>
          <div className="space-y-2">
            {rows.map((r) => (
              <Card key={r.id}>
                <div className="flex items-center justify-between mb-2 gap-2">
                  <div className="min-w-0">
                    <Link to={`/dashboard/staff/members/${r.id}`} className="font-semibold text-navy-900 truncate block hover:text-primary-600">{r.name}</Link>
                    <p className="text-xs text-navy-400 truncate">{[r.designation, r.shift_timing].filter(Boolean).join(" · ") || r.staff_code}</p>
                  </div>
                  {r.is_week_off && !cur(r) && <span className="text-[11px] px-2 py-1 rounded-full bg-navy-50 text-navy-500 whitespace-nowrap">Week off</span>}
                </div>
                <div className="grid grid-cols-3 sm:grid-cols-5 gap-1">
                  {STATUS.map((s) => (
                    <button key={s.key} type="button" onClick={() => pick(r, s.key)}
                      className={`py-2 rounded-lg border text-[11.5px] font-medium ${cur(r) === s.key ? s.on : "border-navy-200 text-navy-500"}`}>{s.label}</button>
                  ))}
                </div>
              </Card>
            ))}
          </div>
          <p className="text-xs text-navy-400 mt-3">
            <b>Leave</b>: the first free leave days of the month (set per staff) are not deducted, after that each day is deducted.{" "}
            <b>Paid leave</b> and <b>Holiday</b> are never deducted. Tap a selected button again to clear it. Unmarked days count as present.
          </p>
        </>
      )}
    </StaffPage>
  );
}
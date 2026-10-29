import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, ChevronLeft, ChevronRight, Phone, Wallet } from "lucide-react";
import { useVenue } from "../../../context/VenueContext.jsx";
import { staffService } from "../../../services/staffService";
import Button from "../../../components/common/Button";
import Card from "../../../components/common/Card";
import Loader from "../../../components/common/Loader";
import { showSuccess, showError } from "../../../components/common/Toast";
import { errMsg, todayISO, fmtDate } from "../gym/gymShared.jsx";
import { StaffPage, STATUS, DAYS, money, monthLabel, shiftMonth } from "./staffShared.jsx";
import StaffSalarySheet from "./StaffSalarySheet.jsx";

const MAX_BACK_DAYS = 120; // same limit as the server
const WEEK = ["S", "M", "T", "W", "T", "F", "S"];
const dow = (ymd) => new Date(`${ymd}T00:00:00Z`).getUTCDay();
const backDays = (ymd, today) => Math.round((Date.parse(`${today}T00:00:00Z`) - Date.parse(`${ymd}T00:00:00Z`)) / 86400000);
const validYmd = (v) => {
  const x = v ? String(v).slice(0, 10) : "";
  return /^\d{4}-\d{2}-\d{2}$/.test(x) ? x : null;
};

// Solid calendar colours so each day is clear at a glance.
const CAL = {
  present: { cell: "bg-emerald-500 text-white", dot: "bg-emerald-500", label: "Present" },
  absent: { cell: "bg-red-500 text-white", dot: "bg-red-500", label: "Leave" },
  half_day: { cell: "bg-amber-400 text-white", dot: "bg-amber-400", label: "Half day" },
  paid_leave: { cell: "bg-sky-500 text-white", dot: "bg-sky-500", label: "Paid leave" },
  holiday: { cell: "bg-violet-500 text-white", dot: "bg-violet-500", label: "Holiday" },
  week_off: { cell: "bg-slate-300 text-slate-700", dot: "bg-slate-300", label: "Week off" }
};
const LEGEND = ["present", "absent", "half_day", "paid_leave", "holiday", "week_off"];

export default function StaffDetail() {
  const { id } = useParams();
  const nav = useNavigate();
  const { venue } = useVenue();
  const vid = venue?.id;
  const today = todayISO();
  const [month, setMonth] = useState(today.slice(0, 7));
  const [d, setD] = useState(null);
  const [loaded, setLoaded] = useState(false);
  const [sel, setSel] = useState(null);
  const [busy, setBusy] = useState(false);
  const [sheet, setSheet] = useState(false);

  const load = useCallback(async () => {
    if (!vid) return;
    try {
      const r = await staffService.staffMonth(vid, id, month);
      setD(r.data.data);
    } catch (e) {
      showError(errMsg(e));
      if (e?.response?.status === 404) nav("/dashboard/staff/members", { replace: true });
    } finally { setLoaded(true); }
  }, [vid, id, month, nav]);
  useEffect(() => { setSel(null); load(); }, [load]);

  const rec = useMemo(() => new Map((d?.attendance || []).map((a) => [String(a.date).slice(0, 10), a.status])), [d]);

  const cells = useMemo(() => {
    const first = new Date(`${month}-01T00:00:00Z`).getUTCDay();
    const n = new Date(Date.UTC(Number(month.slice(0, 4)), Number(month.slice(5, 7)), 0)).getUTCDate();
    return [...Array(first).fill(null), ...Array.from({ length: n }, (_, i) => `${month}-${String(i + 1).padStart(2, "0")}`)];
  }, [month]);

  if (!loaded) return <StaffPage title="Staff"><Loader /></StaffPage>;
  if (!d) return <StaffPage title="Staff"><Link to="/dashboard/staff/members" className="text-sm text-primary-600">Back to staff</Link></StaffPage>;

  const s = d.staff;
  const k = d.calc;
  const off = Array.isArray(s.weekly_off_days) ? s.weekly_off_days : [];
  const joined = validYmd(s.joining_date);
  const left = validYmd(s.left_date);
  const inRange = (ymd) => (!joined || ymd >= joined) && (!left || ymd <= left);
  const editable = (ymd) => inRange(ymd) && ymd <= today && backDays(ymd, today) <= MAX_BACK_DAYS;

  const mark = async (status) => {
    if (!sel) return;
    setBusy(true);
    try {
      await staffService.markAttendance(vid, { date: sel, entries: [{ staff_id: s.id, status: rec.get(sel) === status ? null : status }] });
      await load();
      showSuccess("Saved");
    } catch (e) { showError(errMsg(e)); } finally { setBusy(false); }
  };

  const cellClass = (ymd) => {
    const st = rec.get(ymd);
    if (st && CAL[st]) return CAL[st].cell;
    if (!inRange(ymd)) return "bg-navy-50/60 text-navy-300";
    if (ymd > today) return "border border-dashed border-navy-200 text-navy-300 bg-white";
    if (off.includes(dow(ymd))) return CAL.week_off.cell;
    return "border border-emerald-300 text-emerald-700 bg-emerald-50";
  };

  const free = Number(k.free_leave_days) || 0;
  const pct = free > 0 ? Math.min(100, (k.absence_units / free) * 100) : k.absence_units > 0 ? 100 : 0;
  const canPrev = !joined || month > joined.slice(0, 7);
  const canNext = month < today.slice(0, 7);
  const tiles = [
    ["Present", k.counts.present, "text-emerald-700"], ["Leave", k.counts.absent, "text-red-600"], ["Half day", k.counts.half_day, "text-amber-600"],
    ["Paid leave", k.counts.paid_leave, "text-sky-700"], ["Holiday", k.counts.holiday, "text-violet-700"], ["Week off", k.counts.week_off, "text-navy-500"]
  ];

  return (
    <StaffPage title={s.name} subtitle={[s.designation, s.staff_code].filter(Boolean).join(" · ")}
      actions={<Link to="/dashboard/staff/members" className="flex items-center gap-1 text-sm text-navy-500 px-3 py-2 rounded-xl border border-navy-200"><ArrowLeft size={14} /> Back</Link>}>
      <Card className="mb-4">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-navy-500">
          <span className="flex items-center gap-1"><Phone size={11} /> +91 {s.phone}</span>
          <span>Joined {fmtDate(s.joining_date)}{left ? ` · Left ${fmtDate(left)}` : ""}</span>
          <span>Weekly off: {off.length ? off.map((x) => DAYS[x]).join(", ") : "none"}</span>
          {s.shift_timing && <span>{s.shift_timing}</span>}
        </div>
      </Card>

      <Card className="mb-4">
        <div className="flex items-center justify-between mb-3">
          <button type="button" aria-label="Previous month" disabled={!canPrev} onClick={() => setMonth(shiftMonth(month, -1))} className="p-2 rounded-lg border border-navy-200 disabled:opacity-30"><ChevronLeft size={16} /></button>
          <p className="font-semibold text-navy-900">{monthLabel(month)}</p>
          <button type="button" aria-label="Next month" disabled={!canNext} onClick={() => setMonth(shiftMonth(month, 1))} className="p-2 rounded-lg border border-navy-200 disabled:opacity-30"><ChevronRight size={16} /></button>
        </div>

        <div className="grid grid-cols-7 gap-1 text-center text-[11px] text-navy-400 mb-1">{WEEK.map((w, i) => <span key={i}>{w}</span>)}</div>
        <div className="grid grid-cols-7 gap-1">
          {cells.map((ymd, i) => ymd ? (
            <button key={ymd} type="button" disabled={!editable(ymd)} onClick={() => setSel(ymd === sel ? null : ymd)}
              className={`aspect-square rounded-lg text-sm font-semibold flex items-center justify-center ${cellClass(ymd)} ${sel === ymd ? "ring-2 ring-offset-1 ring-navy-900" : ""} ${editable(ymd) ? "" : "cursor-default"}`}>
              {Number(ymd.slice(8))}
            </button>
          ) : <span key={`b${i}`} />)}
        </div>

        <div className="flex flex-wrap gap-x-3 gap-y-1 mt-3 text-[11px] text-navy-500">
          {LEGEND.map((key) => <span key={key} className="flex items-center gap-1"><i className={`w-2.5 h-2.5 rounded-full ${CAL[key].dot}`} />{CAL[key].label}</span>)}
          <span className="flex items-center gap-1"><i className="w-2.5 h-2.5 rounded-full border border-emerald-400 bg-emerald-50" />Not marked (counts as present)</span>
        </div>

        {sel && (
          <div className="mt-3 pt-3 border-t border-navy-100">
            <p className="text-sm font-medium text-navy-800 mb-2">{fmtDate(sel)}{off.includes(dow(sel)) ? " · weekly off" : ""}</p>
            <div className="grid grid-cols-3 sm:grid-cols-5 gap-1">
              {STATUS.map((x) => (
                <button key={x.key} type="button" disabled={busy} onClick={() => mark(x.key)}
                  className={`py-2 rounded-lg border text-[11.5px] font-medium disabled:opacity-50 ${rec.get(sel) === x.key ? x.on : "border-navy-200 text-navy-500"}`}>{x.label}</button>
              ))}
            </div>
            <p className="text-[11px] text-navy-400 mt-1.5">Tap the selected status again to clear the day.</p>
          </div>
        )}
      </Card>

      <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 mb-4">
        {tiles.map(([l, v, c]) => (
          <div key={l} className="bg-white border border-navy-100/70 rounded-xl py-2.5 text-center">
            <p className={`text-lg font-bold ${c}`}>{v}</p>
            <p className="text-[11px] text-navy-400">{l}</p>
          </div>
        ))}
      </div>

      <Card className="mb-4">
        <div className="flex justify-between text-sm mb-1.5">
          <span className="font-medium text-navy-800">Leave used this month</span>
          <span className="text-navy-600"><b>{k.absence_units}</b> of {free} free</span>
        </div>
        <div className="h-2 rounded-full bg-navy-50 overflow-hidden">
          <div className={`h-full ${k.chargeable_units > 0 ? "bg-red-500" : "bg-emerald-500"}`} style={{ width: `${pct}%` }} />
        </div>
        <p className="text-xs text-navy-500 mt-2">
          {k.chargeable_units > 0
            ? `${k.chargeable_units} day(s) over the free limit × ${money(k.deduction_per_day)} = ${money(k.attendance_deduction)} deducted`
            : "Within the free limit, nothing is deducted"}
          {k.counts.unmarked > 0 && ` · ${k.counts.unmarked} day(s) not marked yet`}
        </p>
      </Card>

      <Card>
        <div className="grid grid-cols-3 gap-2 text-center">
          <div><p className="text-[11px] text-navy-400">Net salary</p><p className="font-bold">{money(k.net_amount)}</p></div>
          <div><p className="text-[11px] text-navy-400">Paid</p><p className="font-bold text-emerald-700">{money(d.paid)}</p></div>
          <div><p className="text-[11px] text-navy-400">Balance</p><p className={`font-bold ${d.balance > 0 ? "text-red-600" : ""}`}>{money(d.balance)}</p></div>
        </div>
        <div className="flex justify-end mt-3">
          <Button onClick={() => setSheet(true)}><Wallet size={15} /> Salary, pay & receipts</Button>
        </div>
      </Card>

      {sheet && <StaffSalarySheet vid={vid} staffId={s.id} month={month} onClose={() => setSheet(false)} onChanged={load} />}
    </StaffPage>
  );
}
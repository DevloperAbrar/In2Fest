import React, { useCallback, useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { ArrowLeft, Check, X } from "lucide-react";
import { useVenue } from "../../../context/VenueContext.jsx";
import { gymService } from "../../../services/gymService";
import Button from "../../../components/common/Button";
import Input from "../../../components/common/Input";
import Loader from "../../../components/common/Loader";
import { showError } from "../../../components/common/Toast";
import { GymPage, errMsg, todayISO } from "./gymShared.jsx";
import { Surface, EmptyState } from "./gymUi.jsx";
import { useGymVariant } from "./gymVariant.js";

const DAY_LABEL = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

// Batch-wise attendance. Uses the same daily attendance records as the Attendance tab, so both
// screens always agree.
export default function AcademyBatchAttendance() {
  const { id } = useParams();
  const { venue } = useVenue();
  const vid = venue?.id;
  const { terms } = useGymVariant();
  const [date, setDate] = useState(todayISO());
  const [detail, setDetail] = useState(null);
  const [marks, setMarks] = useState({});
  const [dayInfo, setDayInfo] = useState({ off_reason: "", truncated: false });
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!vid) return;
    gymService.acBatch(vid, id).then((r) => setDetail(r.data.data)).catch((e) => showError(errMsg(e)));
  }, [vid, id]);

  const loadDay = useCallback(async () => {
    if (!vid) return;
    setLoading(true);
    try {
      const r = await gymService.attGet(vid, "/day", { date });
      const d = r.data.data;
      const m = {};
      (d.items || []).forEach((i) => { if (i.att_status) m[i.id] = i.att_status; });
      setMarks(m);
      setDayInfo({ off_reason: d.off_reason || "", truncated: !!d.truncated });
    } catch (e) { showError(errMsg(e)); } finally { setLoading(false); }
  }, [vid, date]);

  useEffect(() => { loadDay(); }, [loadDay]);

  const students = detail?.students || [];
  const counts = useMemo(() => {
    let present = 0, absent = 0;
    students.forEach((s) => { if (marks[s.id] === "present") present += 1; else if (marks[s.id] === "absent") absent += 1; });
    return { present, absent, unmarked: students.length - present - absent };
  }, [students, marks]);

  const mark = async (s, status) => {
    const prev = marks[s.id];
    const next = prev === status ? "clear" : status;
    setMarks((m) => { const c = { ...m }; if (next === "clear") delete c[s.id]; else c[s.id] = next; return c; });
    try { await gymService.attPost(vid, "/mark", { date, member_id: s.id, status: next }); }
    catch (e) {
      setMarks((m) => { const c = { ...m }; if (prev) c[s.id] = prev; else delete c[s.id]; return c; });
      showError(errMsg(e));
    }
  };

  const markAllPresent = async () => {
    const todo = students.filter((s) => !marks[s.id]);
    if (!todo.length) return;
    setBusy(true);
    try {
      for (let i = 0; i < todo.length; i += 8) {
        const chunk = todo.slice(i, i + 8);
        await Promise.all(chunk.map((s) => gymService.attPost(vid, "/mark", { date, member_id: s.id, status: "present" })));
      }
    } catch (e) { showError(errMsg(e)); } finally { setBusy(false); await loadDay(); }
  };

  if (!detail) return <GymPage title={terms.batches}><Loader /></GymPage>;
  const b = detail.batch;
  const runsToday = (b.days || []).includes(new Date(`${date}T00:00:00`).getDay());

  return (
    <GymPage
      title={`${b.name}: Attendance`}
      subtitle={`${(b.days || []).map((d) => DAY_LABEL[d]).join(", ")} · ${b.start_time} - ${b.end_time}`}
      actions={<Link to="/dashboard/gym/batches" className="tap-scale inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border border-navy-200 text-sm font-medium text-navy-700"><ArrowLeft size={15} /> Back</Link>}
    >
      <Surface className="p-4">
        <div className="flex flex-wrap items-end gap-3">
          <div className="w-44"><Input label="Date" type="date" max={todayISO()} value={date} onChange={(e) => e.target.value && setDate(e.target.value)} /></div>
          <div className="text-sm text-navy-700 pb-2">
            <b className="text-emerald-600">{counts.present}</b> present · <b className="text-red-600">{counts.absent}</b> absent · <b>{counts.unmarked}</b> not marked
          </div>
          <Button className="ml-auto" onClick={markAllPresent} loading={busy} disabled={!counts.unmarked}>Mark remaining present</Button>
        </div>
        {dayInfo.off_reason && <p className="mt-3 text-xs rounded-lg bg-amber-50 text-amber-800 px-3 py-2">Marked as closed: {dayInfo.off_reason}</p>}
        {!runsToday && <p className="mt-3 text-xs rounded-lg bg-navy-50 text-navy-600 px-3 py-2">This {terms.batch.toLowerCase()} does not run on this day.</p>}
        {dayInfo.truncated && <p className="mt-3 text-xs rounded-lg bg-amber-50 text-amber-800 px-3 py-2">Your day list is very long, so some marks may not show here. Use the Attendance tab to check.</p>}
      </Surface>

      <div className="mt-3 space-y-2">
        {students.length === 0 ? (
          <Surface className="p-6"><EmptyState title={`No ${terms.people.toLowerCase()} in this ${terms.batch.toLowerCase()}`} description={`Add ${terms.people.toLowerCase()} from the ${terms.batches} tab.`} /></Surface>
        ) : loading ? <Loader /> : students.map((s) => (
          <Surface key={s.id} className="p-3 flex items-center gap-3">
            <div className="min-w-0 flex-1">
              <p className="font-medium text-[14px] text-navy-900 truncate">{s.name}</p>
              <p className="text-xs text-navy-400">{s.member_code}</p>
            </div>
            <button type="button" onClick={() => mark(s, "present")} aria-label="Present"
              className={`w-11 h-11 rounded-xl border flex items-center justify-center ${marks[s.id] === "present" ? "bg-emerald-600 text-white border-emerald-600" : "bg-white text-emerald-700 border-emerald-200"}`}><Check size={18} /></button>
            <button type="button" onClick={() => mark(s, "absent")} aria-label="Absent"
              className={`w-11 h-11 rounded-xl border flex items-center justify-center ${marks[s.id] === "absent" ? "bg-red-600 text-white border-red-600" : "bg-white text-red-600 border-red-200"}`}><X size={18} /></button>
          </Surface>
        ))}
      </div>
    </GymPage>
  );
}
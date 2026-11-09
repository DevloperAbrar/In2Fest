import React, { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Plus, Search, Download, Users, Upload } from "lucide-react";
import { useFetch } from "../../../hooks/useFetch";
import { libraryService } from "../../../services/libraryService";
import Button from "../../../components/common/Button";
import Loader from "../../../components/common/Loader";
import { showError } from "../../../components/common/Toast";
import { LibraryPage, LibStatus, Panel, useLib, errMsg, fmtDate, inr, downloadBlob, shiftRange } from "./libraryShared.jsx";
import StudentForm from "./StudentForm.jsx";
import { CsvImport } from "./libraryUi.jsx";

const IMPORT_COLS = ["name", "phone", "hall", "shift", "seat", "months", "joined_on", "amount_paid", "payment_mode", "father_name", "address", "aadhaar", "exam_preparing", "discount", "registration_fee"]
  .map((key) => ({ key, required: ["name", "phone", "hall", "shift", "seat"].includes(key) }));
const IMPORT_SAMPLE = [{ name: "Rahul Sharma", phone: "9876543210", hall: "Hall 1", shift: "Morning", seat: 12, months: 3, joined_on: "01/10/2026", amount_paid: 2400, payment_mode: "upi", father_name: "Suresh Sharma", address: "Bhopal", aadhaar: "", exam_preparing: "UPSC", discount: 0, registration_fee: 0 }];

const CHIPS = [["", "All", "all"], ["active", "Active", "active"], ["expiring", "Expiring", "expiring"], ["expired", "Expired", "expired"], ["dues", "Dues", "dues"], ["frozen", "Frozen", "frozen"], ["left", "Left", "left"]];
const selectCls = "px-3 py-2 border border-navy-200 rounded-lg text-sm bg-white";

export default function LibraryStudents() {
  const { vid } = useLib();
  const nav = useNavigate();
  const [status, setStatus] = useState("");
  const [q, setQ] = useState("");
  const [hall, setHall] = useState("");
  const [shift, setShift] = useState("");
  const [page, setPage] = useState(1);
  const [adding, setAdding] = useState(false);
  const [importing, setImporting] = useState(false);

  const qs = useMemo(() => {
    const p = new URLSearchParams({ page: String(page), limit: "20" });
    if (status) p.set("status", status);
    if (q.trim()) p.set("q", q.trim());
    if (hall) p.set("hall_id", hall);
    if (shift) p.set("shift_id", shift);
    return p.toString();
  }, [status, q, hall, shift, page]);

  const { data, loading, refetch } = useFetch(vid ? `/venues/${vid}/library/students?${qs}` : null, { skip: !vid });
  const { data: hallData } = useFetch(vid ? `/venues/${vid}/library/halls` : null, { skip: !vid });
  const { data: shiftData } = useFetch(vid ? `/venues/${vid}/library/shifts` : null, { skip: !vid });
  const { data: settings } = useFetch(vid ? `/venues/${vid}/library/settings` : null, { skip: !vid });

  const halls = hallData?.items || [];
  const shifts = shiftData?.items || [];
  const items = data?.items || [];
  const counts = data?.counts || {};
  const pages = data ? Math.max(Math.ceil(data.total / data.limit), 1) : 1;
  const notReady = halls.length === 0 || shifts.length === 0;

  const exportCsv = async () => {
    try {
      const r = await libraryService.exportStudents(vid, { status: status || undefined, q: q.trim() || undefined, hall_id: hall || undefined, shift_id: shift || undefined });
      downloadBlob(r.data, "library-students.csv");
    } catch (e) { showError(errMsg(e)); }
  };

  return (
    <LibraryPage title="Students" subtitle={`${counts.all ?? 0} students`}
      actions={<><Button variant="outline" onClick={() => setImporting(true)} disabled={notReady} className="hidden md:inline-flex"><Upload size={15} /> Import</Button><Button variant="outline" onClick={exportCsv} className="hidden md:inline-flex"><Download size={15} /> Export</Button><Button onClick={() => setAdding(true)} disabled={notReady}><Plus size={15} /> Add student</Button></>}>
      {notReady && (
        <Panel className="p-4 mb-4 border-amber-200 bg-amber-50/50 text-sm text-amber-800">
          Create at least one <Link to="/dashboard/library/halls" className="underline font-medium">hall</Link> and one <Link to="/dashboard/library/shifts" className="underline font-medium">shift</Link> before adding students.
        </Panel>
      )}
      <div className="flex gap-2 overflow-x-auto pb-2 mb-3 [&::-webkit-scrollbar]:hidden" style={{ scrollbarWidth: "none" }}>
        {CHIPS.map(([key, label, ck]) => (
          <button key={label} type="button" onClick={() => { setStatus(key); setPage(1); }}
            className={`shrink-0 px-3.5 py-1.5 rounded-full text-[13px] font-medium border ${status === key ? "bg-navy-900 text-white border-navy-900" : "bg-white text-navy-600 border-navy-100"}`}>
            {label} <span className="opacity-60">{counts[ck] ?? ""}</span>
          </button>
        ))}
      </div>
      <div className="flex flex-wrap gap-2 mb-4">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-navy-300" />
          <input className="w-full pl-9 pr-3 py-2 border border-navy-200 rounded-lg text-sm" placeholder="Search name, phone, ID or father's name" value={q} onChange={(e) => { setQ(e.target.value); setPage(1); }} />
        </div>
        <select className={selectCls} value={hall} onChange={(e) => { setHall(e.target.value); setPage(1); }}><option value="">All halls</option>{halls.map((h) => <option key={h.id} value={h.id}>{h.name}</option>)}</select>
        <select className={selectCls} value={shift} onChange={(e) => { setShift(e.target.value); setPage(1); }}><option value="">All shifts</option>{shifts.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}</select>
      </div>

      {loading && !data ? <Loader /> : items.length === 0 ? (
        <Panel className="p-10 text-center"><Users className="mx-auto text-navy-300" size={34} /><p className="mt-3 font-semibold text-navy-900">No students found</p></Panel>
      ) : (
        <div className="space-y-2">
          {items.map((s) => (
            <Link key={s.id} to={`/dashboard/library/students/${s.id}`} className="block">
              <Panel className="p-3.5 hover:border-primary-200 transition-colors">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-full bg-navy-100 overflow-hidden shrink-0 flex items-center justify-center text-navy-600 font-semibold">
                    {s.photo_url ? <img src={s.photo_url} alt="" className="w-full h-full object-cover" /> : s.name.slice(0, 1).toUpperCase()}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-semibold text-navy-900 truncate">{s.name} <span className="text-[11.5px] text-navy-400 font-normal">{s.student_code}</span></p>
                    <p className="text-[12.5px] text-navy-500 truncate">
                      {s.hall_name ? `${s.hall_name} · Seat ${s.seat_no} · ${s.shift_name} (${shiftRange(s)})` : "No seat"} · {s.phone}
                    </p>
                  </div>
                  <div className="text-right shrink-0 space-y-1">
                    <LibStatus status={s.display_status} daysLeft={s.days_left} />
                    <p className="text-[11.5px] text-navy-400">{s.end_date ? `till ${fmtDate(s.end_date)}` : ""}</p>
                    {s.balance_due > 0 && <p className="text-[11.5px] font-semibold text-red-600">Due {inr(s.balance_due)}</p>}
                  </div>
                </div>
              </Panel>
            </Link>
          ))}
        </div>
      )}
      {pages > 1 && (
        <div className="flex items-center justify-center gap-3 mt-5 text-sm">
          <Button variant="outline" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Previous</Button>
          <span className="text-navy-500">Page {page} of {pages}</span>
          <Button variant="outline" disabled={page >= pages} onClick={() => setPage((p) => p + 1)}>Next</Button>
        </div>
      )}
      {adding && (
        <StudentForm vid={vid} halls={halls} shifts={shifts} settings={settings} onClose={() => setAdding(false)}
          onSaved={(created) => { setAdding(false); refetch(); if (created) nav(`/dashboard/library/students/${created.id}`); }} />
      )}
            {importing && (
        <CsvImport title="Import students" columns={IMPORT_COLS} sample={IMPORT_SAMPLE}
          hint="Move your existing students in one go. Halls and shifts must already exist with the same names. Dates can be DD/MM/YYYY. Registration fee defaults to 0 here."
          onImport={async (rows) => (await libraryService.importStudents(vid, rows)).data.data}
          onClose={() => setImporting(false)} onDone={() => { setImporting(false); refetch(); }} />
      )}
    </LibraryPage>
  );
}
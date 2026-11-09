import React, { useState } from "react";
import { Link } from "react-router-dom";
import { Plus, Pencil, Trash2, Eye, Armchair } from "lucide-react";
import { useFetch } from "../../../hooks/useFetch";
import { libraryService } from "../../../services/libraryService";
import Button from "../../../components/common/Button";
import Input from "../../../components/common/Input";
import Modal from "../../../components/common/Modal";
import Loader from "../../../components/common/Loader";
import ConfirmDialog from "../../../components/common/ConfirmDialog";
import { showSuccess, showError } from "../../../components/common/Toast";
import { LibraryPage, Panel, Meter, useLib, errMsg, shiftRange } from "./libraryShared.jsx";
import { SeatGrid, SeatLegend } from "./libraryUi.jsx";

const TEMPLATES = [10, 20, 30, 50, 100];
const BLANK = { name: "", seat_start: "1", seat_end: "20", seats_per_row: "10", blocked_seats: "", is_active: true };

function SeatsModal({ vid, hall, shifts, onClose }) {
  const [shiftId, setShiftId] = useState("");
  const { data, loading } = useFetch(hall ? `/venues/${vid}/library/halls/${hall.id}/seatmap${shiftId ? `?shift_id=${shiftId}` : ""}` : null, { skip: !hall });
  return (
    <Modal isOpen={!!hall} onClose={onClose} title={hall ? `${hall.name} · seat map` : "Seats"} size="lg">
      <label className="block mb-3">
        <span className="block text-[13px] font-medium text-navy-700 mb-1.5">View by shift</span>
        <select className="w-full px-3 py-2 border border-navy-200 rounded-lg text-sm bg-white" value={shiftId} onChange={(e) => setShiftId(e.target.value)}>
          <option value="">All shifts (any student)</option>
          {shifts.map((s) => <option key={s.id} value={s.id}>{s.name} · {shiftRange(s)}</option>)}
        </select>
      </label>
      {loading || !data ? <Loader /> : (
        <>
          <SeatGrid seats={data.seats} perRow={data.hall.seats_per_row} onView={() => {}} />
          <div className="mt-3"><SeatLegend /></div>
          <div className="mt-4 max-h-48 overflow-y-auto divide-y divide-navy-50">
            {data.seats.filter((s) => s.student).map((s) => (
              <Link key={s.no} to={`/dashboard/library/students/${s.student.id}`} className="flex items-center justify-between py-2 text-sm hover:bg-navy-50/50">
                <span><b className="text-navy-900">Seat {s.no}</b> · {s.student.name} <span className="text-navy-400">({s.student.code})</span></span>
                <span className="text-[12px] text-navy-500">{s.student.shift_name}</span>
              </Link>
            ))}
          </div>
        </>
      )}
    </Modal>
  );
}

export default function LibraryHalls() {
  const { vid, isOwner } = useLib();
  const { data, loading, refetch } = useFetch(vid ? `/venues/${vid}/library/halls?all=true` : null, { skip: !vid });
  const { data: shiftData } = useFetch(vid ? `/venues/${vid}/library/shifts` : null, { skip: !vid });
  const [editing, setEditing] = useState(null);
  const [f, setF] = useState(BLANK);
  const [view, setView] = useState(null);
  const [del, setDel] = useState(null);
  const [busy, setBusy] = useState(false);
  const items = data?.items || [];
  const set = (k) => (e) => setF((s) => ({ ...s, [k]: e.target.type === "checkbox" ? e.target.checked : e.target.value }));

  const open = (h) => {
    setF(h ? { name: h.name, seat_start: String(h.seat_start), seat_end: String(h.seat_end), seats_per_row: String(h.seats_per_row), blocked_seats: (h.blocked_seats || []).join(", "), is_active: h.is_active } : BLANK);
    setEditing(h || "new");
  };
  const total = Math.max((Number(f.seat_end) || 0) - (Number(f.seat_start) || 0) + 1, 0) - f.blocked_seats.split(/[,\s]+/).filter(Boolean).length;

  const save = async () => {
    setBusy(true);
    try {
      const body = { name: f.name.trim(), seat_start: Number(f.seat_start), seat_end: Number(f.seat_end), seats_per_row: Number(f.seats_per_row) || 10, blocked_seats: f.blocked_seats, is_active: f.is_active };
      if (editing === "new") await libraryService.createHall(vid, body); else await libraryService.updateHall(vid, editing.id, body);
      showSuccess("Hall saved"); setEditing(null); refetch();
    } catch (e) { showError(errMsg(e)); } finally { setBusy(false); }
  };
  const remove = async () => {
    try {
      const r = await libraryService.deleteHall(vid, del.id);
      showSuccess(r.data.data.archived ? "Hall was used before, so it was deactivated" : "Hall deleted"); refetch();
    } catch (e) { showError(errMsg(e)); } finally { setDel(null); }
  };

  return (
    <LibraryPage title="Halls & Seats" subtitle="Create as many halls as you need, each with its own seat numbers"
      actions={isOwner && <Button onClick={() => open(null)}><Plus size={15} /> Add hall</Button>}>
      {loading ? <Loader /> : items.length === 0 ? (
        <Panel className="p-10 text-center">
          <Armchair className="mx-auto text-navy-300" size={36} />
          <p className="mt-3 font-semibold text-navy-900">No halls yet</p>
          <p className="text-sm text-navy-400 mb-4">Start by creating your first hall, for example "Hall 1" with 50 seats.</p>
          {isOwner && <Button onClick={() => open(null)}><Plus size={15} /> Add hall</Button>}
        </Panel>
      ) : (
        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-3">
          {items.map((h) => (
            <Panel key={h.id} className={`p-4 ${h.is_active ? "" : "opacity-60"}`}>
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-semibold text-navy-900 truncate">{h.name}{!h.is_active && <span className="ml-2 text-[11px] text-navy-400">(inactive)</span>}</p>
                  <p className="text-[12.5px] text-navy-400">Seats {h.seat_start} to {h.seat_end} · {h.total_seats} usable</p>
                </div>
                <div className="flex gap-1">
                  <button type="button" onClick={() => setView(h)} className="p-2 rounded-lg hover:bg-navy-50 text-navy-500" aria-label="View seats"><Eye size={16} /></button>
                  {isOwner && <button type="button" onClick={() => open(h)} className="p-2 rounded-lg hover:bg-navy-50 text-navy-500" aria-label="Edit"><Pencil size={16} /></button>}
                  {isOwner && <button type="button" onClick={() => setDel(h)} className="p-2 rounded-lg hover:bg-red-50 text-red-500" aria-label="Delete"><Trash2 size={16} /></button>}
                </div>
              </div>
              <div className="mt-3"><Meter percent={h.total_seats ? Math.round((h.occupied_seats / h.total_seats) * 100) : 0} /></div>
              <p className="mt-1.5 text-[12px] text-navy-500">{h.occupied_seats} seats in use · {h.student_count} students</p>
            </Panel>
          ))}
        </div>
      )}

      <SeatsModal vid={vid} hall={view} shifts={shiftData?.items || []} onClose={() => setView(null)} />

      <Modal isOpen={!!editing} onClose={() => setEditing(null)} title={editing === "new" ? "Add hall" : "Edit hall"} size="md">
        <div className="space-y-4">
          <Input label="Hall / room name *" placeholder="e.g. Hall 1, AC Room, Ground Floor" value={f.name} onChange={set("name")} />
          <div>
            <p className="text-sm font-medium text-gray-700 mb-1.5">Quick template (number of seats)</p>
            <div className="flex flex-wrap gap-2">
              {TEMPLATES.map((n) => (
                <button key={n} type="button" onClick={() => setF((s) => ({ ...s, seat_start: "1", seat_end: String(n) }))}
                  className={`px-3.5 py-1.5 rounded-full border text-sm font-medium ${Number(f.seat_end) === n && f.seat_start === "1" ? "bg-navy-900 text-white border-navy-900" : "bg-white text-navy-700 border-navy-200"}`}>{n}</button>
              ))}
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <Input label="Start seat" type="number" min="1" value={f.seat_start} onChange={set("seat_start")} />
            <Input label="End seat" type="number" min="1" value={f.seat_end} onChange={set("seat_end")} />
            <Input label="Seats per row" type="number" min="1" max="30" value={f.seats_per_row} onChange={set("seats_per_row")} />
          </div>
          <Input label="Blocked seats (optional)" placeholder="e.g. 7, 13 (broken or reserved)" value={f.blocked_seats} onChange={set("blocked_seats")} />
          <p className="text-[13px] text-navy-500">This hall will have <b>{Math.max(total, 0)}</b> usable seats.</p>
          <label className="flex items-center gap-2 text-sm text-navy-700"><input type="checkbox" checked={f.is_active} onChange={set("is_active")} /> Hall is active</label>
          <div className="flex justify-end gap-3 pt-1">
            <Button variant="outline" onClick={() => setEditing(null)}>Cancel</Button>
            <Button onClick={save} loading={busy} disabled={!f.name.trim()}>Save hall</Button>
          </div>
        </div>
      </Modal>
      <ConfirmDialog isOpen={!!del} onClose={() => setDel(null)} onConfirm={remove} title="Delete hall?" confirmText="Delete"
        message="A hall with students cannot be deleted. A hall that was used before is deactivated so history stays safe." />
    </LibraryPage>
  );
}
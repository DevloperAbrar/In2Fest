import React, { useState } from "react";
import { Link } from "react-router-dom";
import { Plus, Pencil, Trash2, Clock, Users } from "lucide-react";
import { useVenue } from "../../../context/VenueContext.jsx";
import { useAuth } from "../../../context/AuthContext";
import { useFetch } from "../../../hooks/useFetch";
import { gymService } from "../../../services/gymService";
import Button from "../../../components/common/Button";
import Card from "../../../components/common/Card";
import Input from "../../../components/common/Input";
import Modal from "../../../components/common/Modal";
import Loader from "../../../components/common/Loader";
import EmptyState from "../../../components/common/EmptyState";
import ConfirmDialog from "../../../components/common/ConfirmDialog";
import { showSuccess, showError } from "../../../components/common/Toast";
import { GymPage, StatusPill, fmtDate, errMsg } from "./gymShared.jsx";

const BLANK = { name: "", start_time: "07:00", end_time: "08:00", capacity: "", is_active: true };
const PRESETS = [["Morning 6-7", "06:00", "07:00"], ["Morning 7-8", "07:00", "08:00"], ["Morning 8-9", "08:00", "09:00"], ["Evening 6-7", "18:00", "19:00"], ["Evening 7-8", "19:00", "20:00"]];

export const fmtTime = (t) => {
  if (!t || !/^\d{2}:\d{2}$/.test(t)) return "";
  const [h, m] = t.split(":").map(Number);
  return `${h % 12 || 12}:${String(m).padStart(2, "0")} ${h < 12 ? "AM" : "PM"}`;
};
export const shiftRange = (s) => `${fmtTime(s.start_time || s.shift_start)} - ${fmtTime(s.end_time || s.shift_end)}`;

// Members of one shift (opened from a shift card).
function ShiftMembersModal({ vid, shift, onClose }) {
  const { data, loading } = useFetch(shift ? `/venues/${vid}/gym/shifts/${shift.id}` : null, { skip: !shift });
  return (
    <Modal isOpen={!!shift} onClose={onClose} title={shift ? `${shift.name} · ${shiftRange(shift)}` : "Shift"} size="lg">
      {loading || !data ? <Loader /> : (
        <div className="space-y-3">
          <p className="text-sm text-gray-600">{data.total} member{data.total === 1 ? "" : "s"} · {data.active} with an active membership</p>
          {data.members.length === 0 ? (
            <p className="text-sm text-gray-500 py-6 text-center">No members in this shift yet. Choose this shift while adding or editing a member.</p>
          ) : (
            <div className="divide-y border rounded-xl max-h-[55vh] overflow-y-auto">
              {data.members.map((m) => (
                <Link key={m.id} to={`/dashboard/gym/members/${m.id}`} className="flex items-center gap-3 px-3 py-2.5 hover:bg-gray-50">
                  {m.photo_url
                    ? <img src={m.photo_url} alt="" className="w-9 h-9 rounded-full object-cover" />
                    : <div className="w-9 h-9 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center font-semibold">{m.name[0]}</div>}
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-gray-900 truncate">{m.name} <span className="text-xs text-gray-400">{m.member_code}</span></p>
                    <p className="text-xs text-gray-500 truncate">{m.phone}{m.plan_name ? ` · ${m.plan_name}` : ""}{m.end_date ? ` · till ${fmtDate(m.end_date)}` : ""}</p>
                  </div>
                  <StatusPill status={m.display_status} daysLeft={m.days_left} />
                </Link>
              ))}
            </div>
          )}
        </div>
      )}
    </Modal>
  );
}

export default function GymShifts() {
  const { venue } = useVenue();
  const { user } = useAuth();
  const vid = venue?.id;
  const isOwner = user?.role !== "team_member" || !!user?.isDemo;
  const { data, loading, refetch } = useFetch(vid ? `/venues/${vid}/gym/shifts?all=true` : null, { skip: !vid });
  const [editing, setEditing] = useState(null); // null | "new" | shift
  const [f, setF] = useState(BLANK);
  const [view, setView] = useState(null);
  const [del, setDel] = useState(null);
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setF((s) => ({ ...s, [k]: e.target.type === "checkbox" ? e.target.checked : e.target.value }));
  const items = data?.items || [];

  const openForm = (s) => {
    setF(s ? { name: s.name, start_time: s.start_time, end_time: s.end_time, capacity: s.capacity ?? "", is_active: s.is_active } : BLANK);
    setEditing(s || "new");
  };
  const save = async () => {
    setBusy(true);
    try {
      const body = { name: f.name.trim(), start_time: f.start_time, end_time: f.end_time, capacity: f.capacity === "" ? null : +f.capacity, is_active: f.is_active };
      if (editing === "new") await gymService.createShift(vid, body); else await gymService.updateShift(vid, editing.id, body);
      showSuccess("Shift saved"); setEditing(null); refetch();
    } catch (e) { showError(errMsg(e)); } finally { setBusy(false); }
  };
  const remove = async () => {
    try {
      const r = await gymService.deleteShift(vid, del.id);
      showSuccess(r.data.data.archived ? "Shift has members, so it was deactivated" : "Shift deleted"); refetch();
    } catch (e) { showError(errMsg(e)); } finally { setDel(null); }
  };

  return (
    <GymPage title="Shifts" subtitle="Optional: create time slots and see which members attend each one"
      actions={isOwner && <Button onClick={() => openForm(null)}><Plus size={15} /> Add shift</Button>}>
      {loading ? <Loader /> : !items.length ? (
        <EmptyState title="No shifts yet" description="Shifts are optional. Create slots like Morning 7-8 AM to assign members and see how many attend each slot." />
      ) : (
        <>
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {items.map((s) => {
              const cap = s.capacity ? Math.min(Math.round((s.member_count / s.capacity) * 100), 100) : null;
              return (
                <Card key={s.id} className={s.is_active ? "" : "opacity-60"}>
                  <div className="flex justify-between items-start">
                    <div className="min-w-0">
                      <h3 className="font-semibold text-gray-900 truncate">{s.name}</h3>
                      <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5"><Clock size={12} /> {shiftRange(s)}{s.is_active ? "" : " · Inactive"}</p>
                    </div>
                    {isOwner && (
                      <div className="flex gap-1">
                        <button onClick={() => openForm(s)} aria-label="Edit shift" className="p-1.5 text-gray-400 hover:text-gray-700"><Pencil size={15} /></button>
                        <button onClick={() => setDel(s)} aria-label="Delete shift" className="p-1.5 text-gray-400 hover:text-red-600"><Trash2 size={15} /></button>
                      </div>
                    )}
                  </div>
                  <p className="text-3xl font-bold mt-3">{s.member_count} <span className="text-sm font-normal text-gray-500">member{s.member_count === 1 ? "" : "s"}</span></p>
                  <p className="text-xs text-gray-500 mt-0.5">{s.active_count} active{s.capacity ? ` · capacity ${s.capacity}` : ""}</p>
                  {cap !== null && (
                    <div className="h-1.5 bg-gray-100 rounded-full mt-2 overflow-hidden">
                      <div className={`h-full ${cap >= 100 ? "bg-red-500" : cap >= 80 ? "bg-amber-500" : "bg-emerald-500"}`} style={{ width: `${cap}%` }} />
                    </div>
                  )}
                  <Button variant="outline" className="mt-3 w-full" onClick={() => setView(s)}><Users size={14} /> View members</Button>
                </Card>
              );
            })}
          </div>
          {data.unassigned > 0 && <p className="text-xs text-gray-500 mt-3">{data.unassigned} member{data.unassigned === 1 ? " has" : "s have"} no shift assigned.</p>}
        </>
      )}

      <ShiftMembersModal vid={vid} shift={view} onClose={() => setView(null)} />

      <Modal isOpen={!!editing} onClose={() => setEditing(null)} title={editing === "new" ? "Add shift" : "Edit shift"} size="md">
        <div className="space-y-3">
          {editing === "new" && (
            <div className="flex flex-wrap gap-2">
              {PRESETS.map(([label, a, b]) => (
                <button key={label} type="button" onClick={() => setF((s) => ({ ...s, name: label, start_time: a, end_time: b }))}
                  className="px-3 py-1 rounded-full border text-xs text-gray-600">{label}</button>
              ))}
            </div>
          )}
          <Input label="Shift name *" placeholder="Morning batch" maxLength={60} value={f.name} onChange={set("name")} />
          <div className="grid grid-cols-2 gap-3">
            <Input label="Start time *" type="time" value={f.start_time} onChange={set("start_time")} />
            <Input label="End time *" type="time" value={f.end_time} onChange={set("end_time")} />
          </div>
          <Input label="Capacity (optional)" inputMode="numeric" placeholder="e.g. 30" value={f.capacity} onChange={(e) => setF((s) => ({ ...s, capacity: e.target.value.replace(/\D/g, "") }))} />
          <p className="text-xs text-gray-400">Capacity is only a guide on this page. It never stops you from adding a member.</p>
          {editing !== "new" && <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={f.is_active} onChange={set("is_active")} /> Active (can be chosen for new members)</label>}
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setEditing(null)}>Cancel</Button>
            <Button onClick={save} loading={busy} disabled={!f.name.trim() || !f.start_time || !f.end_time}>Save shift</Button>
          </div>
        </div>
      </Modal>
      <ConfirmDialog isOpen={!!del} onClose={() => setDel(null)} onConfirm={remove} title="Delete shift?" confirmText="Delete" message="If members are assigned to this shift it will be deactivated instead of deleted. No member is removed." />
    </GymPage>
  );
}

// Small card for the gym overview. Renders nothing when the gym does not use shifts.
export function ShiftOverviewCard() {
  const { venue } = useVenue();
  const vid = venue?.id;
  const { data } = useFetch(vid ? `/venues/${vid}/gym/shifts` : null, { skip: !vid });
  const items = data?.items || [];
  if (!items.length) return null;
  const max = Math.max(...items.map((s) => s.member_count), 1);
  return (
    <div className="bg-white rounded-2xl border border-navy-100/60 p-4 md:p-5">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-navy-900 text-[15px]">Members by shift</h3>
        <Link to="/dashboard/gym/shifts" className="text-xs text-primary-600 font-medium">View all</Link>
      </div>
      <div className="space-y-2.5">
        {items.map((s) => (
          <div key={s.id}>
            <div className="flex justify-between text-[13px]"><span className="text-navy-800">{s.name} <span className="text-xs text-navy-400">{shiftRange(s)}</span></span><b className="tabular-nums">{s.member_count}</b></div>
            <div className="h-1.5 bg-navy-50 rounded-full mt-1 overflow-hidden"><div className="h-full bg-primary-500" style={{ width: `${(s.member_count / max) * 100}%` }} /></div>
          </div>
        ))}
      </div>
      {data.unassigned > 0 && <p className="text-xs text-navy-400 mt-3">{data.unassigned} without a shift</p>}
    </div>
  );
}
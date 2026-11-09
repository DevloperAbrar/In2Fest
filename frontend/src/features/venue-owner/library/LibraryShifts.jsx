import React, { useState } from "react";
import { Plus, Pencil, Trash2, Clock } from "lucide-react";
import { useFetch } from "../../../hooks/useFetch";
import { libraryService } from "../../../services/libraryService";
import Button from "../../../components/common/Button";
import Input from "../../../components/common/Input";
import Modal from "../../../components/common/Modal";
import Loader from "../../../components/common/Loader";
import ConfirmDialog from "../../../components/common/ConfirmDialog";
import { showSuccess, showError } from "../../../components/common/Toast";
import { LibraryPage, Panel, useLib, errMsg, inr, shiftRange } from "./libraryShared.jsx";

const BLANK = { name: "", start_time: "06:00", end_time: "14:00", price: "", is_active: true };
const PRESETS = [["Morning", "06:00", "14:00"], ["Evening", "14:00", "22:00"], ["Night", "22:00", "06:00"], ["Full day", "06:00", "22:00"]];

export default function LibraryShifts() {
  const { vid, isOwner } = useLib();
  const { data, loading, refetch } = useFetch(vid ? `/venues/${vid}/library/shifts?all=true` : null, { skip: !vid });
  const [editing, setEditing] = useState(null);
  const [f, setF] = useState(BLANK);
  const [del, setDel] = useState(null);
  const [busy, setBusy] = useState(false);
  const items = data?.items || [];
  const set = (k) => (e) => setF((s) => ({ ...s, [k]: e.target.type === "checkbox" ? e.target.checked : e.target.value }));

  const open = (s) => {
    setF(s ? { name: s.name, start_time: s.start_time, end_time: s.end_time, price: String(Number(s.price)), is_active: s.is_active } : BLANK);
    setEditing(s || "new");
  };
  const save = async () => {
    setBusy(true);
    try {
      const body = { name: f.name.trim(), start_time: f.start_time, end_time: f.end_time, price: Number(f.price), is_active: f.is_active };
      if (editing === "new") await libraryService.createShift(vid, body); else await libraryService.updateShift(vid, editing.id, body);
      showSuccess("Shift saved"); setEditing(null); refetch();
    } catch (e) { showError(errMsg(e)); } finally { setBusy(false); }
  };
  const remove = async () => {
    try {
      const r = await libraryService.deleteShift(vid, del.id);
      showSuccess(r.data.data.archived ? "Shift was used before, so it was deactivated" : "Shift deleted"); refetch();
    } catch (e) { showError(errMsg(e)); } finally { setDel(null); }
  };

  return (
    <LibraryPage title="Shifts" subtitle="Time slots with a monthly fee. A seat can be sold once per non-overlapping shift"
      actions={isOwner && <Button onClick={() => open(null)}><Plus size={15} /> Add shift</Button>}>
      {loading ? <Loader /> : items.length === 0 ? (
        <Panel className="p-10 text-center">
          <Clock className="mx-auto text-navy-300" size={36} />
          <p className="mt-3 font-semibold text-navy-900">No shifts yet</p>
          <p className="text-sm text-navy-400 mb-4">Create shifts like Morning, Evening or Night, each with its own price.</p>
          {isOwner && <Button onClick={() => open(null)}><Plus size={15} /> Add shift</Button>}
        </Panel>
      ) : (
        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-3">
          {items.map((s) => (
            <Panel key={s.id} className={`p-4 ${s.is_active ? "" : "opacity-60"}`}>
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="font-semibold text-navy-900 truncate">{s.name}{!s.is_active && <span className="ml-2 text-[11px] text-navy-400">(inactive)</span>}</p>
                  <p className="text-[13px] text-navy-500 mt-0.5">{shiftRange(s)}</p>
                </div>
                {isOwner && (
                  <div className="flex gap-1">
                    <button type="button" onClick={() => open(s)} className="p-2 rounded-lg hover:bg-navy-50 text-navy-500" aria-label="Edit"><Pencil size={16} /></button>
                    <button type="button" onClick={() => setDel(s)} className="p-2 rounded-lg hover:bg-red-50 text-red-500" aria-label="Delete"><Trash2 size={16} /></button>
                  </div>
                )}
              </div>
              <div className="mt-3 flex items-end justify-between">
                <p className="font-display text-2xl font-bold text-navy-900">{inr(s.price)}<span className="text-[12px] font-normal text-navy-400"> / month</span></p>
                <p className="text-[12.5px] text-navy-500">{s.student_count} students</p>
              </div>
            </Panel>
          ))}
        </div>
      )}

      <Modal isOpen={!!editing} onClose={() => setEditing(null)} title={editing === "new" ? "Add shift" : "Edit shift"} size="md">
        <div className="space-y-4">
          {editing === "new" && (
            <div className="flex flex-wrap gap-2">
              {PRESETS.map(([n, a, b]) => (
                <button key={n} type="button" onClick={() => setF((s) => ({ ...s, name: s.name || n, start_time: a, end_time: b }))}
                  className="px-3 py-1.5 rounded-full border border-navy-200 text-sm text-navy-700 hover:bg-navy-50">{n} {a}-{b}</button>
              ))}
            </div>
          )}
          <Input label="Shift name *" placeholder="e.g. Morning, Evening, Night" value={f.name} onChange={set("name")} />
          <div className="grid grid-cols-2 gap-3">
            <Input label="Start time *" type="time" value={f.start_time} onChange={set("start_time")} />
            <Input label="End time *" type="time" value={f.end_time} onChange={set("end_time")} />
          </div>
          <p className="text-[12px] text-navy-400 -mt-2">A shift can cross midnight, for example 10:00 PM to 6:00 AM.</p>
          <Input label="Monthly price (₹) *" type="number" min="0" placeholder="e.g. 800" value={f.price} onChange={set("price")} />
          <label className="flex items-center gap-2 text-sm text-navy-700"><input type="checkbox" checked={f.is_active} onChange={set("is_active")} /> Shift is active</label>
          <div className="flex justify-end gap-3 pt-1">
            <Button variant="outline" onClick={() => setEditing(null)}>Cancel</Button>
            <Button onClick={save} loading={busy} disabled={!f.name.trim() || f.price === ""}>Save shift</Button>
          </div>
        </div>
      </Modal>
      <ConfirmDialog isOpen={!!del} onClose={() => setDel(null)} onConfirm={remove} title="Delete shift?" confirmText="Delete"
        message="A shift with students cannot be deleted. A shift that was used before is deactivated so history stays safe." />
    </LibraryPage>
  );
}
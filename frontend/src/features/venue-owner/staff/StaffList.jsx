import React, { useState } from "react";
import { Link } from "react-router-dom";
import { Plus, Pencil, Trash2, Phone, ChevronRight } from "lucide-react";
import { useVenue } from "../../../context/VenueContext.jsx";
import { useFetch } from "../../../hooks/useFetch";
import { staffService } from "../../../services/staffService";
import Button from "../../../components/common/Button";
import Card from "../../../components/common/Card";
import Input from "../../../components/common/Input";
import Modal from "../../../components/common/Modal";
import Loader from "../../../components/common/Loader";
import EmptyState from "../../../components/common/EmptyState";
import ConfirmDialog from "../../../components/common/ConfirmDialog";
import { showSuccess, showError } from "../../../components/common/Toast";
import { Field, TextArea, errMsg, todayISO, fmtDate } from "../gym/gymShared.jsx";
import { StaffPage, money, DAYS } from "./staffShared.jsx";

const BLANK = {
  name: "", phone: "", email: "", designation: "", joining_date: "", monthly_salary: "", deduction_per_day: "", free_leave_days: "2",
  weekly_off_days: [0], shift_timing: "", upi_id: "", address: "", emergency_contact: "", notes: ""
};
const ROLES = ["Trainer", "Receptionist", "Manager", "Housekeeping", "Accountant", "Nutritionist", "Sales"];
const TODAY_CHIP = {
  present: "bg-emerald-50 text-emerald-700", absent: "bg-red-50 text-red-700", half_day: "bg-amber-50 text-amber-700",
  paid_leave: "bg-sky-50 text-sky-700", holiday: "bg-violet-50 text-violet-700", week_off: "bg-navy-50 text-navy-500"
};
const TODAY_LABEL = { present: "Present", absent: "Leave", half_day: "Half day", paid_leave: "Paid leave", holiday: "Holiday", week_off: "Week off" };

export default function StaffList() {
  const { venue } = useVenue();
  const vid = venue?.id;
  const [status, setStatus] = useState("active");
  const { data: staff, loading, refetch } = useFetch(vid ? `/venues/${vid}/staff?status=${status}` : null, { skip: !vid });
  const [editing, setEditing] = useState(null);
  const [f, setF] = useState(BLANK);
  const [del, setDel] = useState(null);
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setF((s) => ({ ...s, [k]: e.target.value }));

  const open = (s) => {
    setF(s ? { ...BLANK, ...Object.fromEntries(Object.entries(s).map(([k, v]) => [k, v == null ? "" : v])), weekly_off_days: s.weekly_off_days || [], free_leave_days: String(Number(s.free_leave_days || 0)) } : { ...BLANK, joining_date: todayISO() });
    setEditing(s || "new");
  };
  const toggleDay = (d) => setF((s) => ({ ...s, weekly_off_days: s.weekly_off_days.includes(d) ? s.weekly_off_days.filter((x) => x !== d) : [...s.weekly_off_days, d] }));

  const save = async () => {
    setBusy(true);
    try {
      if (editing === "new") await staffService.create(vid, f); else await staffService.update(vid, editing.id, f);
      showSuccess("Staff saved");
      setEditing(null);
      refetch();
    } catch (e) { showError(errMsg(e)); } finally { setBusy(false); }
  };
  const remove = async () => {
    try {
      const r = await staffService.remove(vid, del.id);
      showSuccess(r.data.data.archived ? "Has history, so marked as left" : "Staff deleted");
      refetch();
    } catch (e) { showError(errMsg(e)); } finally { setDel(null); }
  };
  const reactivate = async (s) => {
    try { await staffService.update(vid, s.id, { is_active: true }); showSuccess("Staff reactivated"); refetch(); } catch (e) { showError(errMsg(e)); }
  };

  return (
    <StaffPage title="Staff" subtitle="Your team, salary and leave rules"
      actions={<Button onClick={() => open(null)}><Plus size={15} /> Add staff</Button>}>
      <div className="flex gap-2 mb-3">
        {[["active", "Working"], ["inactive", "Left"]].map(([k, l]) => (
          <button key={k} type="button" onClick={() => setStatus(k)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium border ${status === k ? "bg-navy-900 text-white border-navy-900" : "text-navy-600 border-navy-200"}`}>{l}</button>
        ))}
      </div>

      {loading ? <Loader /> : !staff?.length ? (
        <EmptyState title={status === "active" ? "No staff yet" : "Nobody has left"} description={status === "active" ? "Add trainers and staff to track attendance and salary." : ""} />
      ) : (
        <div className="grid sm:grid-cols-2 gap-3">
          {staff.map((s) => (
            <Card key={s.id} className={s.is_active ? "" : "opacity-70"}>
              <div className="flex justify-between items-start gap-2">
                <Link to={`/dashboard/staff/members/${s.id}`} className="min-w-0 block">
                  <h3 className="font-semibold text-navy-900 truncate hover:text-primary-600">{s.name}</h3>
                  <p className="text-xs text-navy-400">{s.staff_code}{s.designation ? ` · ${s.designation}` : ""}</p>
                </Link>
                <div className="flex gap-1">
                  <button onClick={() => open(s)} aria-label="Edit" className="p-1.5 text-navy-400 hover:text-navy-700"><Pencil size={15} /></button>
                  <button onClick={() => setDel(s)} aria-label="Remove" className="p-1.5 text-navy-400 hover:text-red-600"><Trash2 size={15} /></button>
                </div>
              </div>
              <p className="text-xl font-bold mt-2">{money(s.monthly_salary)} <span className="text-xs font-normal text-navy-400">/ month</span></p>
              <ul className="text-xs text-navy-500 mt-1 space-y-0.5">
                <li className="flex items-center gap-1"><Phone size={11} /> +91 {s.phone}</li>
                <li>Joined {fmtDate(s.joining_date)}{s.left_date ? ` · Left ${fmtDate(s.left_date)}` : ""}</li>
                <li>{Number(s.free_leave_days)} free leave day(s), then {money(s.deduction_per_day)} per day</li>
                <li>Weekly off: {(s.weekly_off_days || []).length ? s.weekly_off_days.map((d) => DAYS[d]).join(", ") : "none"}</li>
              </ul>
              <div className="mt-3 flex items-center justify-between">
                {s.is_active && s.today_status
                  ? <span className={`text-[11px] px-2 py-1 rounded-full ${TODAY_CHIP[s.today_status]}`}>Today: {TODAY_LABEL[s.today_status]}</span>
                  : <span />}
                <div className="flex items-center gap-3">
                  {!s.is_active && <button onClick={() => reactivate(s)} className="text-xs text-primary-600 font-medium">Reactivate</button>}
                  <Link to={`/dashboard/staff/members/${s.id}`} className="text-xs text-primary-600 font-medium flex items-center">Attendance & salary <ChevronRight size={14} /></Link>
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Modal isOpen={!!editing} onClose={() => setEditing(null)} title={editing === "new" ? "Add staff" : "Edit staff"} size="lg">
        <div className="space-y-3">
          <div className="grid sm:grid-cols-2 gap-3">
            <Input label="Name *" value={f.name} onChange={set("name")} />
            <Input label="Mobile number *" inputMode="numeric" maxLength={12} value={f.phone} onChange={set("phone")} />
            <Input label="Email" type="email" value={f.email} onChange={set("email")} />
            <div>
              <Input label="Designation" list="staff-roles" value={f.designation} onChange={set("designation")} />
              <datalist id="staff-roles">{ROLES.map((r) => <option key={r} value={r} />)}</datalist>
            </div>
            <Input label="Joining date *" type="date" value={f.joining_date} onChange={set("joining_date")} />
            <Input label="Shift timing" placeholder="6 AM - 2 PM" value={f.shift_timing} onChange={set("shift_timing")} />
            <Input label="Salary per month (₹) *" inputMode="decimal" value={f.monthly_salary} onChange={set("monthly_salary")} />
            <div>
              <Input label="Deduction per leave day (₹)" inputMode="decimal" value={f.deduction_per_day} onChange={set("deduction_per_day")} />
              <button type="button" disabled={!Number(f.monthly_salary)} onClick={() => setF((s) => ({ ...s, deduction_per_day: String(Math.round(Number(s.monthly_salary) / 30)) }))}
                className="text-xs text-primary-600 mt-1 disabled:opacity-40">Use salary ÷ 30</button>
            </div>
            <Input label="Free leave days per month (no deduction)" inputMode="decimal" value={f.free_leave_days} onChange={set("free_leave_days")} />
            <Input label="UPI ID (for salary)" value={f.upi_id} onChange={set("upi_id")} />
          </div>
          <Field label="Weekly off (paid)">
            <div className="flex flex-wrap gap-1.5">
              {DAYS.map((d, i) => (
                <button key={d} type="button" onClick={() => toggleDay(i)}
                  className={`px-3 py-1.5 rounded-full text-xs font-medium border ${f.weekly_off_days.includes(i) ? "bg-navy-900 text-white border-navy-900" : "text-navy-600 border-navy-200"}`}>{d}</button>
              ))}
            </div>
          </Field>
          <div className="grid sm:grid-cols-2 gap-3">
            <Input label="Emergency contact" value={f.emergency_contact} onChange={set("emergency_contact")} />
            <Input label="Address" value={f.address} onChange={set("address")} />
          </div>
          <Field label="Notes"><TextArea value={f.notes} onChange={set("notes")} /></Field>
          <p className="text-xs text-navy-400">Leave days up to the free limit are not deducted. After that, each leave day (half day = 0.5) costs the deduction amount. Weekly off, paid leave and holidays are always paid.</p>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setEditing(null)}>Cancel</Button>
            <Button onClick={save} loading={busy} disabled={!f.name || !f.phone || !f.joining_date || !f.monthly_salary}>Save</Button>
          </div>
        </div>
      </Modal>
      <ConfirmDialog isOpen={!!del} onClose={() => setDel(null)} onConfirm={remove} title="Remove staff?" confirmText="Remove"
        message="If this person has attendance or salary history they are marked as left (history is kept). Otherwise they are deleted." />
    </StaffPage>
  );
}
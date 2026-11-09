import React, { useRef, useState } from "react";
import { Camera } from "lucide-react";
import { libraryService } from "../../../services/libraryService";
import Button from "../../../components/common/Button";
import Input from "../../../components/common/Input";
import Modal from "../../../components/common/Modal";
import { showSuccess, showError } from "../../../components/common/Toast";
import { Field, TextArea, MODES, errMsg, inr, todayISO } from "./libraryShared.jsx";
import { SeatPicker } from "./libraryUi.jsx";

const selectCls = "w-full px-3 py-2 border border-navy-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary-500/40";
const Sec = ({ title, children }) => (
  <section className="rounded-2xl border border-navy-100/70 bg-navy-50/30 p-4">
    <p className="text-[13px] font-semibold text-navy-800 mb-3">{title}</p>
    <div className="space-y-3">{children}</div>
  </section>
);

// mode="create": full admission form. mode="edit": details only (seat / fee changes use their own actions).
export default function StudentForm({ vid, mode = "create", student, halls = [], shifts = [], settings, onClose, onSaved }) {
  const edit = mode === "edit";
  const [f, setF] = useState({
    name: student?.name || "", phone: student?.phone || "", father_name: student?.father_name || "",
    joined_on: student?.joined_on || todayISO(), dob: student?.dob || "", gender: student?.gender || "",
    email: student?.email || "", address: student?.address || "", aadhaar: "", exam_preparing: student?.exam_preparing || "",
    emergency_phone: student?.emergency_phone || "", notes: student?.notes || "",
    duration_unit: "months", duration_value: "1", discount: "", registration_fee: "", pay_amount: "", pay_mode: "cash", pay_ref: ""
  });
  const [seat, setSeat] = useState({ hall_id: "", shift_id: "", seat_no: "" });
  const [photo, setPhoto] = useState(null);
  const [showMore, setShowMore] = useState(edit);
  const [busy, setBusy] = useState(false);
  const fileRef = useRef(null);
  const set = (k) => (e) => setF((s) => ({ ...s, [k]: e.target.value }));

  const shift = shifts.find((s) => s.id === seat.shift_id);
  const price = Number(shift?.price) || 0;
  const value = Number(f.duration_value) || 0;
  const base = f.duration_unit === "months" ? price * value : (price * value) / 30;
  const disc = Math.min(Math.max(Number(f.discount) || 0, 0), base);
  const reg = f.registration_fee === "" ? Number(settings?.registration_fee) || 0 : Number(f.registration_fee) || 0;
  const total = Math.round((base - disc + reg) * 100) / 100;

  const ready = f.name.trim() && f.phone.trim() && (edit || (seat.hall_id && seat.shift_id && seat.seat_no));

  const submit = async () => {
    setBusy(true);
    try {
      const details = {
        name: f.name.trim(), phone: f.phone.trim(), father_name: f.father_name, dob: f.dob, gender: f.gender, email: f.email,
        address: f.address, exam_preparing: f.exam_preparing, emergency_phone: f.emergency_phone, notes: f.notes
      };
      if (f.aadhaar.trim() || edit === false) details.aadhaar = f.aadhaar;
      if (edit) {
        if (!f.aadhaar.trim()) delete details.aadhaar;
        await libraryService.updateStudent(vid, student.id, details);
        if (photo) await libraryService.uploadPhoto(vid, student.id, photo);
        showSuccess("Details updated");
        onSaved();
        return;
      }
      const body = {
        ...details, joined_on: f.joined_on, ...seat, seat_no: Number(seat.seat_no),
        duration_unit: f.duration_unit, duration_value: Number(f.duration_value), discount: Number(f.discount) || 0
      };
      if (f.registration_fee !== "") body.registration_fee = Number(f.registration_fee);
      if (Number(f.pay_amount) > 0) body.payment = { amount: Number(f.pay_amount), mode: f.pay_mode, reference: f.pay_ref };
      const r = await libraryService.enroll(vid, body);
      const created = r.data.data.student;
      if (photo) {
        try { await libraryService.uploadPhoto(vid, created.id, photo); } catch (e) { showError("Student added, but the photo could not be uploaded"); }
      }
      showSuccess(`${created.name} added (${created.student_code})`);
      onSaved(created);
    } catch (e) { showError(errMsg(e)); } finally { setBusy(false); }
  };

  return (
    <Modal isOpen onClose={onClose} title={edit ? "Edit student details" : "Add student"} size="xl">
      <div className="space-y-4">
        <Sec title="Student">
          <div className="flex items-center gap-4">
            <button type="button" onClick={() => fileRef.current?.click()} className="w-20 h-20 rounded-full border-2 border-dashed border-navy-200 bg-white flex items-center justify-center overflow-hidden shrink-0 text-navy-400 hover:border-primary-400">
              {photo ? <img src={URL.createObjectURL(photo)} alt="" className="w-full h-full object-cover" /> : student?.photo_url ? <img src={student.photo_url} alt="" className="w-full h-full object-cover" /> : <Camera size={22} />}
            </button>
            <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => setPhoto(e.target.files?.[0] || null)} />
            <p className="text-[12.5px] text-navy-400">Photo (optional). Used on the student card.</p>
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            <Input label="Name *" value={f.name} onChange={set("name")} />
            <Input label="Phone *" inputMode="numeric" maxLength={13} placeholder="10-digit mobile" value={f.phone} onChange={set("phone")} />
            <Input label="Father's name" value={f.father_name} onChange={set("father_name")} />
            {!edit && <Input label="Joining date" type="date" value={f.joined_on} onChange={set("joined_on")} />}
          </div>
        </Sec>

        {!edit && (
          <>
            <Sec title="Hall, shift & seat (required)">
              <SeatPicker vid={vid} halls={halls} shifts={shifts} value={seat} onChange={setSeat} />
            </Sec>
            <Sec title="Fee">
              <div className="grid sm:grid-cols-4 gap-3">
                <Field label="Period"><select className={selectCls} value={f.duration_unit} onChange={set("duration_unit")}><option value="months">Months</option><option value="days">Days</option></select></Field>
                <Input label={f.duration_unit === "months" ? "Months" : "Days"} type="number" min="1" value={f.duration_value} onChange={set("duration_value")} />
                <Input label="Discount (₹)" type="number" min="0" value={f.discount} onChange={set("discount")} />
                <Input label="Registration fee (₹)" type="number" min="0" placeholder={String(settings?.registration_fee || 0)} value={f.registration_fee} onChange={set("registration_fee")} />
              </div>
              <div className="flex items-center justify-between rounded-xl bg-white border border-navy-100 px-4 py-3">
                <span className="text-sm text-navy-500">Total fee</span>
                <span className="font-display text-xl font-bold text-navy-900">{shift ? inr(total) : "Choose a shift"}</span>
              </div>
            </Sec>
            <Sec title="Payment now (optional)">
              <div className="grid sm:grid-cols-3 gap-3">
                <Input label="Amount received (₹)" type="number" min="0" value={f.pay_amount} onChange={set("pay_amount")} />
                <Field label="Mode"><select className={selectCls} value={f.pay_mode} onChange={set("pay_mode")}>{MODES.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}</select></Field>
                <Input label="Reference (optional)" placeholder="UPI ref / note" value={f.pay_ref} onChange={set("pay_ref")} />
              </div>
              {shift && <button type="button" className="text-[12.5px] text-primary-600 font-medium" onClick={() => setF((s) => ({ ...s, pay_amount: String(total) }))}>Received full amount ({inr(total)})</button>}
              <p className="text-[12px] text-navy-400">Leave empty to add the fee as pending. You can record payments later.</p>
            </Sec>
          </>
        )}

        <button type="button" onClick={() => setShowMore((v) => !v)} className="text-sm font-medium text-primary-600">{showMore ? "Hide" : "Show"} more details (all optional)</button>
        {showMore && (
          <Sec title="More details (optional)">
            <div className="grid sm:grid-cols-2 gap-3">
              <Input label="Date of birth" type="date" value={f.dob} onChange={set("dob")} />
              <Field label="Gender"><select className={selectCls} value={f.gender} onChange={set("gender")}><option value="">-</option><option value="male">Male</option><option value="female">Female</option><option value="other">Other</option></select></Field>
              <Input label="Email" type="email" value={f.email} onChange={set("email")} />
              <Input label="Preparing for (exam / course)" placeholder="e.g. UPSC, NEET, CA" value={f.exam_preparing} onChange={set("exam_preparing")} />
              <Input label="Emergency contact" inputMode="numeric" value={f.emergency_phone} onChange={set("emergency_phone")} />
              <Input label={`Aadhaar number${student?.aadhaar_masked ? ` (saved: ${student.aadhaar_masked})` : ""}`} inputMode="numeric" maxLength={14} placeholder="12 digits" value={f.aadhaar} onChange={set("aadhaar")} />
            </div>
            <Field label="Address"><TextArea value={f.address} onChange={set("address")} /></Field>
            <Field label="Notes"><TextArea rows={2} value={f.notes} onChange={set("notes")} /></Field>
          </Sec>
        )}

        <div className="flex justify-end gap-3 pt-1">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={submit} loading={busy} disabled={!ready}>{edit ? "Save changes" : "Add student"}</Button>
        </div>
      </div>
    </Modal>
  );
}
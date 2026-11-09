import React, { useRef, useState } from "react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { Phone, MessageCircle, CreditCard, RefreshCw, ArrowRightLeft, Snowflake, Pencil, Download, LogOut, Trash2, Camera, Receipt } from "lucide-react";
import { useFetch } from "../../../hooks/useFetch";
import { libraryService } from "../../../services/libraryService";
import Button from "../../../components/common/Button";
import Input from "../../../components/common/Input";
import Modal from "../../../components/common/Modal";
import Loader from "../../../components/common/Loader";
import ConfirmDialog from "../../../components/common/ConfirmDialog";
import { showSuccess, showError } from "../../../components/common/Toast";
import { LibraryPage, LibStatus, Panel, MODES, useLib, errMsg, fmtDate, inr, todayISO, downloadBlob, waUrl, shiftRange, Field } from "./libraryShared.jsx";
import { SeatPicker } from "./libraryUi.jsx";
import StudentForm from "./StudentForm.jsx";

const selectCls = "w-full px-3 py-2 border border-navy-200 rounded-lg text-sm bg-white";

function PayModal({ vid, student, balance, onClose, onDone }) {
  const [f, setF] = useState({ amount: String(balance || ""), mode: "cash", reference: "", paid_on: todayISO() });
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setF((s) => ({ ...s, [k]: e.target.value }));
  const go = async () => {
    setBusy(true);
    try { await libraryService.recordPayment(vid, student.id, { ...f, amount: Number(f.amount) }); showSuccess("Payment recorded"); onDone(); }
    catch (e) { showError(errMsg(e)); } finally { setBusy(false); }
  };
  return (
    <Modal isOpen onClose={onClose} title="Record payment" size="sm">
      <div className="space-y-3">
        <p className="text-sm text-navy-500">Balance due: <b className="text-red-600">{inr(balance)}</b></p>
        <Input label="Amount (₹)" type="number" min="0" value={f.amount} onChange={set("amount")} />
        <Field label="Mode"><select className={selectCls} value={f.mode} onChange={set("mode")}>{MODES.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}</select></Field>
        <Input label="Reference (optional)" value={f.reference} onChange={set("reference")} />
        <Input label="Date" type="date" max={todayISO()} value={f.paid_on} onChange={set("paid_on")} />
        <div className="flex justify-end gap-3 pt-1"><Button variant="outline" onClick={onClose}>Cancel</Button><Button onClick={go} loading={busy} disabled={!(Number(f.amount) > 0)}>Save payment</Button></div>
      </div>
    </Modal>
  );
}

function RenewModal({ vid, student, halls, shifts, hasSeat, onClose, onDone }) {
  const [f, setF] = useState({ duration_unit: "months", duration_value: "1", discount: "", pay_amount: "", pay_mode: "cash" });
  const [seat, setSeat] = useState({ hall_id: "", shift_id: "", seat_no: "" });
  const [change, setChange] = useState(!hasSeat);
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setF((s) => ({ ...s, [k]: e.target.value }));
  const go = async () => {
    setBusy(true);
    try {
      const body = { duration_unit: f.duration_unit, duration_value: Number(f.duration_value), discount: Number(f.discount) || 0 };
      if (change) Object.assign(body, seat, { seat_no: Number(seat.seat_no) });
      if (Number(f.pay_amount) > 0) body.payment = { amount: Number(f.pay_amount), mode: f.pay_mode };
      await libraryService.renew(vid, student.id, body);
      showSuccess("Renewed"); onDone();
    } catch (e) { showError(errMsg(e)); } finally { setBusy(false); }
  };
  return (
    <Modal isOpen onClose={onClose} title="Renew membership" size="lg">
      <div className="space-y-4">
        <p className="text-[13px] text-navy-500">The new period starts after the current one ends (or today if it already expired).</p>
        <div className="grid sm:grid-cols-3 gap-3">
          <Field label="Period"><select className={selectCls} value={f.duration_unit} onChange={set("duration_unit")}><option value="months">Months</option><option value="days">Days</option></select></Field>
          <Input label={f.duration_unit === "months" ? "Months" : "Days"} type="number" min="1" value={f.duration_value} onChange={set("duration_value")} />
          <Input label="Discount (₹)" type="number" min="0" value={f.discount} onChange={set("discount")} />
        </div>
        {hasSeat && <label className="flex items-center gap-2 text-sm text-navy-700"><input type="checkbox" checked={change} onChange={(e) => setChange(e.target.checked)} /> Change hall / shift / seat while renewing</label>}
        {change && <SeatPicker vid={vid} halls={halls} shifts={shifts} value={seat} onChange={setSeat} />}
        <div className="grid sm:grid-cols-2 gap-3">
          <Input label="Payment received now (₹, optional)" type="number" min="0" value={f.pay_amount} onChange={set("pay_amount")} />
          <Field label="Mode"><select className={selectCls} value={f.pay_mode} onChange={set("pay_mode")}>{MODES.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}</select></Field>
        </div>
        <div className="flex justify-end gap-3"><Button variant="outline" onClick={onClose}>Cancel</Button><Button onClick={go} loading={busy} disabled={change && !(seat.hall_id && seat.shift_id && seat.seat_no)}>Renew</Button></div>
      </div>
    </Modal>
  );
}

function MoveModal({ vid, student, halls, shifts, onClose, onDone }) {
  const [seat, setSeat] = useState({ hall_id: "", shift_id: "", seat_no: "" });
  const [busy, setBusy] = useState(false);
  const go = async () => {
    setBusy(true);
    try { await libraryService.move(vid, student.id, { ...seat, seat_no: Number(seat.seat_no) }); showSuccess("Seat changed"); onDone(); }
    catch (e) { showError(errMsg(e)); } finally { setBusy(false); }
  };
  return (
    <Modal isOpen onClose={onClose} title="Change hall / shift / seat" size="lg">
      <div className="space-y-4">
        <p className="text-[13px] text-navy-500">The fee already paid stays the same. The new shift's price applies from the next renewal.</p>
        <SeatPicker vid={vid} halls={halls} shifts={shifts} value={seat} onChange={setSeat} />
        <div className="flex justify-end gap-3"><Button variant="outline" onClick={onClose}>Cancel</Button><Button onClick={go} loading={busy} disabled={!(seat.hall_id && seat.shift_id && seat.seat_no)}>Move student</Button></div>
      </div>
    </Modal>
  );
}

export default function StudentDetail() {
  const { id } = useParams();
  const nav = useNavigate();
  const { vid, venue, isOwner } = useLib();
  const { data, loading, refetch } = useFetch(vid ? `/venues/${vid}/library/students/${id}` : null, { skip: !vid });
  const { data: hallData } = useFetch(vid ? `/venues/${vid}/library/halls` : null, { skip: !vid });
  const { data: shiftData } = useFetch(vid ? `/venues/${vid}/library/shifts` : null, { skip: !vid });
  const month = todayISO().slice(0, 7);
  const { data: att } = useFetch(vid ? `/venues/${vid}/library/students/${id}/attendance?month=${month}` : null, { skip: !vid });
  const { data: loanData } = useFetch(vid ? `/venues/${vid}/library/students/${id}/loans` : null, { skip: !vid });
  const [modal, setModal] = useState(null);
  const [confirm, setConfirm] = useState(null);
  const [typed, setTyped] = useState("");
  const [aadhaar, setAadhaar] = useState("");
  const fileRef = useRef(null);

  if (loading || !data) return <LibraryPage title="Student"><Loader /></LibraryPage>;
  const { student: s, allocation: a, memberships, payments } = data;
  const halls = hallData?.items || [];
  const shifts = shiftData?.items || [];
  const done = () => { setModal(null); refetch(); };
  const run = async (fn, ok) => { try { await fn(); showSuccess(ok); refetch(); } catch (e) { showError(errMsg(e)); } finally { setConfirm(null); } };
  const libName = venue?.hall_name || "the library";

  const wa = (kind) => {
    const text = kind === "due"
      ? `Hi ${s.name}, your pending fee at ${libName} is ₹${Number(s.balance_due).toLocaleString("en-IN")}. Please pay at the desk or by UPI. Thank you!`
      : `Hi ${s.name}, your seat at ${libName} is valid till ${fmtDate(s.end_date)}. Please renew to keep your seat. Thank you!`;
    window.open(waUrl(`91${s.phone}`, text), "_blank", "noopener");
  };

  const dl = async (fn, name, mime) => {
    try { const r = await fn(); downloadBlob(new Blob([r.data], { type: mime }), name); } catch (e) { showError(errMsg(e, "Download failed")); }
  };
  const reveal = async () => { try { const r = await libraryService.revealAadhaar(vid, s.id); setAadhaar(r.data.data.aadhaar); } catch (e) { showError(errMsg(e)); } };
  const upload = async (file) => {
    if (!file) return;
    try { await libraryService.uploadPhoto(vid, s.id, file); showSuccess("Photo updated"); refetch(); } catch (e) { showError(errMsg(e)); }
  };

  const Action = ({ icon: Icon, label, onClick, tone = "" }) => (
    <button type="button" onClick={onClick} className={`flex items-center gap-2 px-3.5 py-2.5 rounded-xl border border-navy-100 bg-white text-[13px] font-medium hover:bg-navy-50 ${tone || "text-navy-700"}`}><Icon size={15} />{label}</button>
  );

  return (
    <LibraryPage title={s.name} subtitle={`${s.student_code} · ${s.phone}`}>
      <Link to="/dashboard/library/students" className="text-[13px] text-primary-600 font-medium">← All students</Link>
      <Panel className="p-4 mt-3 mb-4">
        <div className="flex items-start gap-4">
          <button type="button" onClick={() => fileRef.current?.click()} className="relative w-20 h-20 rounded-full bg-navy-100 overflow-hidden shrink-0 flex items-center justify-center text-2xl font-bold text-navy-500 group">
            {s.photo_url ? <img src={s.photo_url} alt="" className="w-full h-full object-cover" /> : s.name.slice(0, 1).toUpperCase()}
            <span className="absolute inset-0 bg-black/40 text-white hidden group-hover:flex items-center justify-center"><Camera size={20} /></span>
          </button>
          <input ref={fileRef} type="file" accept="image/*" className="hidden" onChange={(e) => upload(e.target.files?.[0])} />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2"><LibStatus status={s.display_status} daysLeft={s.days_left} /><span className="text-[12.5px] text-navy-400">Joined {fmtDate(s.joined_on)}</span></div>
            <p className="mt-2 text-sm text-navy-700">{a ? <><b>{a.hall_name}</b> · Seat <b>{a.seat_no}</b> · {a.shift_name} ({shiftRange(a)})</> : "No seat allotted"}</p>
            <p className="text-sm text-navy-500">Valid till <b className="text-navy-800">{s.end_date ? fmtDate(s.end_date) : "-"}</b>{s.father_name ? ` · Father: ${s.father_name}` : ""}</p>
            <div className="mt-2 flex flex-wrap gap-x-5 gap-y-1 text-sm">
              <span className="text-navy-500">Paid <b className="text-emerald-600">{inr(s.total_paid)}</b></span>
              <span className="text-navy-500">Due <b className={Number(s.balance_due) > 0 ? "text-red-600" : "text-navy-800"}>{inr(s.balance_due)}</b></span>
              <span className="text-navy-500">Present this month <b className="text-navy-800">{data.attendance_this_month}</b></span>
            </div>
          </div>
        </div>
        <div className="mt-4 flex flex-wrap gap-2">
          {Number(s.balance_due) > 0 && <Action icon={CreditCard} label="Record payment" onClick={() => setModal("pay")} tone="text-emerald-700" />}
          <Action icon={RefreshCw} label="Renew" onClick={() => setModal("renew")} />
          {a && s.status !== "left" && <Action icon={ArrowRightLeft} label="Change seat / shift" onClick={() => setModal("move")} />}
          <Action icon={Download} label="Student card" onClick={() => dl(() => libraryService.card(vid, s.id), `${s.student_code}-card.png`, "image/png")} />
          <Action icon={Phone} label="Call" onClick={() => { window.location.href = `tel:${s.phone}`; }} />
          <Action icon={MessageCircle} label={Number(s.balance_due) > 0 ? "WhatsApp: dues" : "WhatsApp: renewal"} onClick={() => wa(Number(s.balance_due) > 0 ? "due" : "renew")} />
          <Action icon={Pencil} label="Edit details" onClick={() => setModal("edit")} />
          {s.status === "active" && <Action icon={Snowflake} label="Freeze" onClick={() => setConfirm({ t: "Freeze this student?", m: "The seat stays reserved. When you unfreeze, the end date moves forward by the days frozen.", go: () => run(() => libraryService.freeze(vid, s.id), "Frozen") })} />}
          {s.status === "frozen" && <Action icon={Snowflake} label="Unfreeze" onClick={() => run(() => libraryService.unfreeze(vid, s.id), "Unfrozen")} />}
          {s.status !== "left" && <Action icon={LogOut} label="Mark as left" tone="text-amber-700" onClick={() => setConfirm({ t: "Mark student as left?", m: "The seat is released for someone else. All records are kept and you can renew later.", go: () => run(() => libraryService.leave(vid, s.id), "Marked as left") })} />}
          {isOwner && <Action icon={Trash2} label="Delete" tone="text-red-600" onClick={() => { setTyped(""); setConfirm({ t: "Delete student permanently?", m: `This removes all payments and attendance for ${s.name}. Type ${s.student_code} to confirm.`, danger: true }); }} />}
        </div>
      </Panel>

      <div className="grid lg:grid-cols-2 gap-4">
        <Panel className="p-4">
          <p className="font-semibold text-navy-900 mb-2">Memberships</p>
          {memberships.length === 0 ? <p className="text-sm text-navy-400">None yet.</p> : memberships.map((m) => (
            <div key={m.id} className="py-2.5 border-b border-navy-50 last:border-0 text-sm">
              <div className="flex justify-between"><span className="font-medium text-navy-800">{fmtDate(m.start_date)} → {fmtDate(m.end_date)}</span><span className="text-[12px] text-navy-400 capitalize">{m.kind}</span></div>
              <p className="text-[12.5px] text-navy-500">{m.shift_name} · {m.hall_name} · Seat {m.seat_no}</p>
              <p className="text-[12.5px]">Fee {inr(m.total_amount)} · Paid <b className="text-emerald-600">{inr(m.amount_paid)}</b>{Number(m.total_amount) - Number(m.amount_paid) > 0 && <> · Due <b className="text-red-600">{inr(Number(m.total_amount) - Number(m.amount_paid))}</b></>}</p>
            </div>
          ))}
        </Panel>
        <Panel className="p-4">
          <p className="font-semibold text-navy-900 mb-2">Payments</p>
          {payments.length === 0 ? <p className="text-sm text-navy-400">No payments yet.</p> : payments.map((p) => (
            <div key={p.id} className="flex items-center justify-between py-2.5 border-b border-navy-50 last:border-0 text-sm">
              <div><p className={`font-medium ${p.status === "void" ? "line-through text-navy-400" : "text-navy-800"}`}>{inr(p.amount)} <span className="text-[12px] text-navy-400 font-normal capitalize">{p.mode.replace("_", " ")}</span></p><p className="text-[12px] text-navy-400">{p.receipt_no} · {fmtDate(p.paid_on)}{p.status === "void" ? " · cancelled" : ""}</p></div>
              <div className="flex gap-1">
                {p.status === "paid" && <button type="button" title="Receipt" onClick={() => dl(() => libraryService.receipt(vid, p.id), `${p.receipt_no}.pdf`, "application/pdf")} className="p-2 rounded-lg hover:bg-navy-50 text-navy-500"><Receipt size={16} /></button>}
                {isOwner && p.status === "paid" && <button type="button" title="Cancel payment" onClick={() => setConfirm({ t: "Cancel this payment?", m: "The amount returns to the student's balance. The receipt is kept as cancelled.", go: () => run(() => libraryService.voidPayment(vid, p.id, "Cancelled by owner"), "Payment cancelled") })} className="p-2 rounded-lg hover:bg-red-50 text-red-500"><Trash2 size={15} /></button>}
              </div>
            </div>
          ))}
        </Panel>
        <Panel className="p-4">
          <p className="font-semibold text-navy-900 mb-2">Attendance · {att ? `${att.present} days present` : "…"}</p>
          <div className="flex flex-wrap gap-1.5">
            {(att?.days || []).map((d) => <span key={d.date} title={d.date} className={`w-8 h-8 rounded-lg text-[11px] flex items-center justify-center font-medium ${d.status === "present" ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"}`}>{Number(d.date.slice(8))}</span>)}
            {att && att.days.length === 0 && <p className="text-sm text-navy-400">No attendance marked this month.</p>}
          </div>
        </Panel>
        <Panel className="p-4">
          <p className="font-semibold text-navy-900 mb-2">Books</p>
          {!loanData || loanData.items.length === 0 ? <p className="text-sm text-navy-400">No books issued yet.</p> : loanData.items.map((l) => (
            <div key={l.id} className="py-2 border-b border-navy-50 last:border-0 text-sm">
              <p className="font-medium text-navy-800">{l.title}</p>
              <p className="text-[12.5px] text-navy-500">
                {l.status === "issued" ? `Due ${fmtDate(l.due_on)}${l.days_overdue > 0 ? ` · ${l.days_overdue} days overdue` : ""}` : `${l.status === "lost" ? "Lost" : "Returned"} ${fmtDate(l.returned_on)}`}
                {l.fine_due > 0 ? ` · fine due ${inr(l.fine_due)}` : ""}
              </p>
            </div>
          ))}
        </Panel>
        <Panel className="p-4">
          <p className="font-semibold text-navy-900 mb-2">Details</p>
          <dl className="text-sm space-y-1.5 text-navy-600">
            {[["Date of birth", s.dob && fmtDate(s.dob)], ["Gender", s.gender], ["Email", s.email], ["Preparing for", s.exam_preparing], ["Emergency contact", s.emergency_phone], ["Address", s.address], ["Notes", s.notes]].map(([k, v]) => v ? <div key={k} className="flex gap-3"><dt className="w-32 shrink-0 text-navy-400">{k}</dt><dd className="capitalize-none break-words">{v}</dd></div> : null)}
            <div className="flex gap-3"><dt className="w-32 shrink-0 text-navy-400">Aadhaar</dt><dd>{aadhaar || s.aadhaar_masked || "-"} {isOwner && s.aadhaar_masked && !aadhaar && <button type="button" onClick={reveal} className="ml-2 text-primary-600 text-[12px] font-medium">Show</button>}</dd></div>
          </dl>
        </Panel>
      </div>

      {modal === "pay" && <PayModal vid={vid} student={s} balance={Number(s.balance_due)} onClose={() => setModal(null)} onDone={done} />}
      {modal === "renew" && <RenewModal vid={vid} student={s} halls={halls} shifts={shifts} hasSeat={!!a} onClose={() => setModal(null)} onDone={done} />}
      {modal === "move" && <MoveModal vid={vid} student={s} halls={halls} shifts={shifts} onClose={() => setModal(null)} onDone={done} />}
      {modal === "edit" && <StudentForm vid={vid} mode="edit" student={s} onClose={() => setModal(null)} onSaved={done} />}

      <ConfirmDialog
        isOpen={!!confirm} onClose={() => setConfirm(null)} title={confirm?.t} message={confirm?.m}
        confirmText={confirm?.danger ? "Delete" : "Confirm"} variant={confirm?.danger ? "danger" : "primary"}
        onConfirm={confirm?.danger
          ? () => run(async () => { await libraryService.deletePermanent(vid, s.id, typed); nav("/dashboard/library/students"); }, "Student deleted")
          : confirm?.go}
      />
      {confirm?.danger && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[60] bg-white border border-navy-200 rounded-xl shadow-xl p-3 w-72">
          <Input placeholder={`Type ${s.student_code}`} value={typed} onChange={(e) => setTyped(e.target.value)} />
        </div>
      )}
    </LibraryPage>
  );
}
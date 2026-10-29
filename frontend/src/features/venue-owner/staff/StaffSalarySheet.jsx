import React, { useEffect, useState } from "react";
import { FileText } from "lucide-react";
import { staffService } from "../../../services/staffService";
import Button from "../../../components/common/Button";
import Input from "../../../components/common/Input";
import Select from "../../../components/common/Select";
import Modal from "../../../components/common/Modal";
import Loader from "../../../components/common/Loader";
import { showSuccess, showError } from "../../../components/common/Toast";
import { errMsg, todayISO, fmtDate, downloadBlob } from "../gym/gymShared.jsx";
import { money, monthLabel, PAY_MODES } from "./staffShared.jsx";

// One staff member's salary for one month: breakdown, bonus/advance, payments and receipts.
export default function StaffSalarySheet({ vid, staffId, month, onClose, onChanged }) {
  const [d, setD] = useState(null);
  const [adj, setAdj] = useState({ bonus: "", other_deduction: "", note: "" });
  const [pay, setPay] = useState({ amount: "", mode: "cash", paid_on: todayISO(), reference: "" });
  const [busy, setBusy] = useState(false);

  const apply = (data) => {
    setD(data);
    setAdj({ bonus: data.calc.bonus || "", other_deduction: data.calc.other_deduction || "", note: data.calc.adjustment_note || "" });
    setPay((p) => ({ ...p, amount: data.balance > 0 ? String(data.balance) : "" }));
    if (onChanged) onChanged();
  };
  useEffect(() => {
    staffService.staffMonth(vid, staffId, month).then((r) => apply(r.data.data)).catch((e) => { showError(errMsg(e)); onClose(); });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [staffId, month]);

  const run = async (fn, ok) => {
    setBusy(true);
    try { const r = await fn(); apply(r.data.data); showSuccess(ok); } catch (e) { showError(errMsg(e)); } finally { setBusy(false); }
  };
  const receipt = async (p) => {
    try { const r = await staffService.receipt(vid, p.id); downloadBlob(r.data, `${p.receipt_no || "salary-receipt"}.pdf`); } catch (e) { showError(errMsg(e, "Could not download the receipt")); }
  };
  const cancel = (p) => {
    const reason = window.prompt(`Why are you cancelling ${p.receipt_no}?`);
    if (reason && reason.trim()) run(() => staffService.cancelPayment(vid, p.id, { reason }), "Payment cancelled");
  };

  if (!d) return <Modal isOpen onClose={onClose} title="Salary"><Loader /></Modal>;
  const k = d.calc;
  const row = (l, v, strong) => (
    <div className={`flex justify-between text-sm py-1 ${strong ? "font-bold border-t border-navy-100 mt-1 pt-2" : ""}`}><span className="text-navy-600">{l}</span><span>{v}</span></div>
  );

  return (
    <Modal isOpen onClose={onClose} title={`${d.staff.name} · ${monthLabel(month)}`} size="lg">
      <div className="space-y-4">
        <div>
          {row("Monthly salary", money(k.monthly_salary))}
          {k.eligible_days < k.days_in_month && row(`Pro-rated (${k.eligible_days} of ${k.days_in_month} days)`, money(k.base_amount))}
          {row(`Leave deduction (${k.absence_units} taken, ${k.free_leave_days} free, ${k.chargeable_units} charged)`, `- ${money(k.attendance_deduction)}`)}
          {k.bonus > 0 && row("Bonus", `+ ${money(k.bonus)}`)}
          {k.other_deduction > 0 && row("Advance / other", `- ${money(k.other_deduction)}`)}
          {row("Net salary", money(k.net_amount), true)}
          {row("Paid", money(d.paid))}
          {row("Balance", money(d.balance), true)}
          <p className="text-xs text-navy-400 mt-2">
            Present {k.counts.present} · Leave {k.counts.absent} · Half {k.counts.half_day} · Paid leave {k.counts.paid_leave} · Holiday {k.counts.holiday} · Week off {k.counts.week_off}
            {k.counts.unmarked > 0 && <span className="text-amber-700"> · {k.counts.unmarked} day(s) not marked (counted as present)</span>}
            {k.counts.upcoming > 0 && ` · ${k.counts.upcoming} day(s) still to come`}
          </p>
        </div>

        <div className="border-t border-navy-100 pt-3">
          <p className="text-sm font-semibold mb-2">Bonus / advance for this month</p>
          <div className="grid grid-cols-2 gap-2">
            <Input label="Bonus (₹)" inputMode="decimal" value={adj.bonus} onChange={(e) => setAdj({ ...adj, bonus: e.target.value })} />
            <Input label="Advance / deduction (₹)" inputMode="decimal" value={adj.other_deduction} onChange={(e) => setAdj({ ...adj, other_deduction: e.target.value })} />
          </div>
          <Input className="mt-2" label="Note" value={adj.note} onChange={(e) => setAdj({ ...adj, note: e.target.value })} />
          <div className="flex justify-end mt-2">
            <Button variant="outline" loading={busy} onClick={() => run(() => staffService.setAdjustment(vid, staffId, { month, ...adj }), "Saved")}>Save changes</Button>
          </div>
        </div>

        <div className="border-t border-navy-100 pt-3">
          <p className="text-sm font-semibold mb-2">Pay salary</p>
          <div className="grid grid-cols-2 gap-2">
            <Input label="Amount (₹)" inputMode="decimal" value={pay.amount} onChange={(e) => setPay({ ...pay, amount: e.target.value })} />
            <Select label="Mode" value={pay.mode} onChange={(e) => setPay({ ...pay, mode: e.target.value })} options={PAY_MODES} />
            <Input label="Date" type="date" max={todayISO()} value={pay.paid_on} onChange={(e) => setPay({ ...pay, paid_on: e.target.value })} />
            <Input label="Reference" value={pay.reference} onChange={(e) => setPay({ ...pay, reference: e.target.value })} />
          </div>
          <div className="flex justify-end mt-2">
            <Button loading={busy} disabled={!(Number(pay.amount) > 0) || d.balance <= 0}
              onClick={() => run(() => staffService.pay(vid, staffId, { month, ...pay }), "Salary paid, receipt ready")}>Pay & create receipt</Button>
          </div>
        </div>

        {d.payments.length > 0 && (
          <div className="border-t border-navy-100 pt-3">
            <p className="text-sm font-semibold mb-2">Payments</p>
            {d.payments.map((p) => (
              <div key={p.id} className="flex items-center justify-between text-sm py-1.5 gap-2">
                <div className={p.status === "cancelled" ? "line-through text-navy-400" : ""}>
                  <b>{money(p.amount)}</b> · {p.mode.replace("_", " ")} · {fmtDate(p.paid_on)} <span className="text-xs text-navy-400">{p.receipt_no}</span>
                </div>
                <div className="flex gap-2 items-center">
                  <button onClick={() => receipt(p)} aria-label="Download receipt" className="text-primary-600"><FileText size={16} /></button>
                  {p.status === "paid" && <button onClick={() => cancel(p)} className="text-xs text-red-600">Cancel</button>}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </Modal>
  );
}
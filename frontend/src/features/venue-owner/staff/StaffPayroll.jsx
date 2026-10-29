import React, { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useVenue } from "../../../context/VenueContext.jsx";
import { staffService } from "../../../services/staffService";
import Button from "../../../components/common/Button";
import Card from "../../../components/common/Card";
import Input from "../../../components/common/Input";
import Select from "../../../components/common/Select";
import Modal from "../../../components/common/Modal";
import Loader from "../../../components/common/Loader";
import EmptyState from "../../../components/common/EmptyState";
import { showSuccess, showError } from "../../../components/common/Toast";
import { errMsg, todayISO } from "../gym/gymShared.jsx";
import { StaffPage, money, monthLabel, shiftMonth, PAY_MODES } from "./staffShared.jsx";
import StaffSalarySheet from "./StaffSalarySheet.jsx";

const CHIP = { unpaid: "bg-red-50 text-red-700", partial: "bg-amber-50 text-amber-700", paid: "bg-emerald-50 text-emerald-700", none: "bg-navy-50 text-navy-500" };
const CHIP_L = { unpaid: "Unpaid", partial: "Part paid", paid: "Paid", none: "Nothing due" };

export default function StaffPayroll() {
  const { venue } = useVenue();
  const vid = venue?.id;
  const [month, setMonth] = useState(todayISO().slice(0, 7));
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [open, setOpen] = useState(null);
  const [all, setAll] = useState(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(async () => {
    if (!vid) return;
    try { const r = await staffService.payroll(vid, month); setData(r.data.data); } catch (e) { showError(errMsg(e)); } finally { setLoading(false); }
  }, [vid, month]);
  useEffect(() => { setLoading(true); load(); }, [load]);

  const payAll = async () => {
    setBusy(true);
    try {
      const r = await staffService.payAll(vid, { month, ...all });
      showSuccess(`Paid ${r.data.data.paid_count} staff · ${money(r.data.data.total)}`);
      setAll(null);
      load();
    } catch (e) { showError(errMsg(e)); } finally { setBusy(false); }
  };

  const t = data?.totals;
  const isNow = month >= todayISO().slice(0, 7);

  return (
    <StaffPage title="Salary" subtitle="Month-wise salary, payments and receipts"
      actions={t?.pending_count > 0 && <Button onClick={() => setAll({ mode: "cash", paid_on: todayISO() })}>Pay all pending</Button>}>
      <Card className="mb-4">
        <div className="flex items-center justify-between">
          <button type="button" aria-label="Previous month" onClick={() => setMonth(shiftMonth(month, -1))} className="p-2 rounded-lg border border-navy-200"><ChevronLeft size={16} /></button>
          <p className="font-semibold text-navy-900">{monthLabel(month)}</p>
          <button type="button" aria-label="Next month" disabled={isNow} onClick={() => setMonth(shiftMonth(month, 1))} className="p-2 rounded-lg border border-navy-200 disabled:opacity-30"><ChevronRight size={16} /></button>
        </div>
        {t && (
          <div className="grid grid-cols-3 gap-2 mt-3 text-center">
            <div><p className="text-xs text-navy-400">Payable</p><p className="font-bold">{money(t.net)}</p></div>
            <div><p className="text-xs text-navy-400">Paid</p><p className="font-bold text-emerald-700">{money(t.paid)}</p></div>
            <div><p className="text-xs text-navy-400">Pending</p><p className="font-bold text-red-600">{money(t.pending)}</p></div>
          </div>
        )}
        {isNow && <p className="text-xs text-navy-400 mt-2">This month is still running. Days not marked yet count as present, so these amounts can change as leaves are marked.</p>}
      </Card>

      {loading ? <Loader /> : !data?.rows.length ? (
        <EmptyState title="No staff this month" description="Add staff to see their salary here." />
      ) : (
        <div className="space-y-2">
          {data.rows.map((r) => (
            <Card key={r.staff.id}>
              <button type="button" className="w-full text-left" onClick={() => setOpen(r.staff.id)}>
                <div className="flex items-center justify-between gap-2">
                  <div className="min-w-0">
                    <p className="font-semibold text-navy-900 truncate">{r.staff.name}</p>
                    <p className="text-xs text-navy-400">{r.staff.designation || r.staff.staff_code}</p>
                  </div>
                  <span className={`text-[11px] px-2 py-1 rounded-full whitespace-nowrap ${CHIP[r.status]}`}>{CHIP_L[r.status]}</span>
                </div>
                <div className="grid grid-cols-3 gap-2 mt-2 text-sm">
                  <div><p className="text-[11px] text-navy-400">Net salary</p><b>{money(r.calc.net_amount)}</b></div>
                  <div><p className="text-[11px] text-navy-400">Paid</p><b>{money(r.paid)}</b></div>
                  <div><p className="text-[11px] text-navy-400">Balance</p><b className={r.balance > 0 ? "text-red-600" : ""}>{money(r.balance)}</b></div>
                </div>
                {r.calc.attendance_deduction > 0 && <p className="text-xs text-amber-700 mt-1">Leave deduction {money(r.calc.attendance_deduction)} ({r.calc.chargeable_units} day(s) over the free limit)</p>}
              </button>
              <div className="mt-2 pt-2 border-t border-navy-100/70 flex justify-end">
                <Link to={`/dashboard/staff/members/${r.staff.id}`} className="text-xs text-primary-600 font-medium flex items-center">Attendance calendar <ChevronRight size={14} /></Link>
              </div>
            </Card>
          ))}
        </div>
      )}

      {open && <StaffSalarySheet vid={vid} staffId={open} month={month} onClose={() => setOpen(null)} onChanged={load} />}

      <Modal isOpen={!!all} onClose={() => setAll(null)} title="Pay all pending salaries" size="sm">
        {all && (
          <div className="space-y-3">
            <p className="text-sm text-navy-600">{t?.pending_count} staff will be paid their full balance ({money(t?.pending)}) and a receipt is created for each.</p>
            <Select label="Mode" value={all.mode} onChange={(e) => setAll({ ...all, mode: e.target.value })} options={PAY_MODES} />
            <Input label="Date" type="date" max={todayISO()} value={all.paid_on} onChange={(e) => setAll({ ...all, paid_on: e.target.value })} />
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setAll(null)}>Cancel</Button>
              <Button onClick={payAll} loading={busy}>Confirm payment</Button>
            </div>
          </div>
        )}
      </Modal>
    </StaffPage>
  );
}
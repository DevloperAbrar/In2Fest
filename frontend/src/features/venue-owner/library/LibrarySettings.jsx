import React, { useEffect, useState } from "react";
import { Plus, X } from "lucide-react";
import { useFetch } from "../../../hooks/useFetch";
import { libraryService } from "../../../services/libraryService";
import Button from "../../../components/common/Button";
import Input from "../../../components/common/Input";
import Loader from "../../../components/common/Loader";
import ConfirmDialog from "../../../components/common/ConfirmDialog";
import { showSuccess, showError } from "../../../components/common/Toast";
import { LibraryPage, Panel, useLib, errMsg, Field } from "./libraryShared.jsx";

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const selectCls = "w-full px-3 py-2 border border-navy-200 rounded-lg text-sm bg-white";
const Check = ({ checked, onChange, label, hint }) => (
  <label className="flex items-start gap-3 py-2">
    <input type="checkbox" className="mt-1" checked={checked} onChange={(e) => onChange(e.target.checked)} />
    <span><span className="block text-sm font-medium text-navy-800">{label}</span>{hint && <span className="block text-[12.5px] text-navy-400">{hint}</span>}</span>
  </label>
);

export default function LibrarySettings() {
  const { vid } = useLib();
  const { data, loading, refetch } = useFetch(vid ? `/venues/${vid}/library/settings` : null, { skip: !vid });
  const [f, setF] = useState(null);
  const [busy, setBusy] = useState(false);
  const [regen, setRegen] = useState(false);
  const [holiday, setHoliday] = useState({ date: "", name: "" });

  useEffect(() => { if (data) setF({ ...data, registration_fee: String(data.registration_fee), fine_per_day: String(data.fine_per_day) }); }, [data]);
  if (loading || !f) return <LibraryPage title="Library settings"><Loader /></LibraryPage>;

  const set = (k, v) => setF((s) => ({ ...s, [k]: v }));
  const toggleDay = (d) => set("weekly_off", f.weekly_off.includes(d) ? f.weekly_off.filter((x) => x !== d) : [...f.weekly_off, d]);
  const addHoliday = () => {
    if (!holiday.date) return;
    set("holidays", [...f.holidays.filter((h) => h.date !== holiday.date), holiday].sort((a, b) => a.date.localeCompare(b.date)));
    setHoliday({ date: "", name: "" });
  };

  const save = async () => {
    setBusy(true);
    try {
      await libraryService.saveSettings(vid, {
        qr_enabled: f.qr_enabled, qr_mode: f.qr_mode, require_phone: f.require_phone, enforce_shift: f.enforce_shift,
        grace_minutes: Number(f.grace_minutes), registration_fee: Number(f.registration_fee) || 0, receipt_prefix: f.receipt_prefix,
        weekly_off: f.weekly_off, holidays: f.holidays, loan_days: Number(f.loan_days), max_books: Number(f.max_books), fine_per_day: Number(f.fine_per_day) || 0
      });
      showSuccess("Settings saved"); refetch();
    } catch (e) { showError(errMsg(e)); } finally { setBusy(false); }
  };
  const regenerate = async () => {
    try { await libraryService.regenerateQr(vid); showSuccess("New QR created. Print the new poster."); refetch(); }
    catch (e) { showError(errMsg(e)); } finally { setRegen(false); }
  };

  return (
    <LibraryPage title="Library settings" actions={<Button onClick={save} loading={busy}>Save settings</Button>}>
      <div className="grid lg:grid-cols-2 gap-4">
        <Panel className="p-4 space-y-3">
          <p className="font-semibold text-navy-900">Fees & receipts</p>
          <Input label="Registration / admission fee (₹)" type="number" min="0" value={f.registration_fee} onChange={(e) => set("registration_fee", e.target.value)} />
          <p className="text-[12px] text-navy-400 -mt-1">Charged once when a new student joins. You can change it for each student.</p>
          <Input label="Receipt prefix" maxLength={6} value={f.receipt_prefix} onChange={(e) => set("receipt_prefix", e.target.value)} />
        </Panel>

        <Panel className="p-4 space-y-1">
          <p className="font-semibold text-navy-900 mb-1">QR attendance</p>
          <Check checked={f.qr_enabled} onChange={(v) => set("qr_enabled", v)} label="Allow students to mark attendance by QR" />
          <Field label="QR type">
            <select className={selectCls} value={f.qr_mode} onChange={(e) => set("qr_mode", e.target.value)}>
              <option value="static">Printed poster (same QR every day)</option>
              <option value="rotating">Rotating QR on a screen (safest, changes every minute)</option>
            </select>
          </Field>
          <Check checked={f.require_phone} onChange={(v) => set("require_phone", v)} label="Ask last 4 digits of mobile" hint="Stops a student marking attendance for a friend." />
          <Check checked={f.enforce_shift} onChange={(v) => set("enforce_shift", v)} label="Allow check-in only during the student's own shift" hint="If off, attendance is still marked but flagged as outside shift." />
          <Input label="Grace time around shift (minutes)" type="number" min="0" max="240" value={f.grace_minutes} onChange={(e) => set("grace_minutes", e.target.value)} />
          <Button variant="outline" onClick={() => setRegen(true)} className="mt-2">Create a new QR (old one stops working)</Button>
        </Panel>

        <Panel className="p-4">
          <p className="font-semibold text-navy-900 mb-2">Weekly off & holidays</p>
          <div className="flex flex-wrap gap-2 mb-4">
            {DAYS.map((d, i) => <button key={d} type="button" onClick={() => toggleDay(i)} className={`px-3 py-1.5 rounded-full border text-sm ${f.weekly_off.includes(i) ? "bg-navy-900 text-white border-navy-900" : "bg-white text-navy-600 border-navy-200"}`}>{d}</button>)}
          </div>
          <div className="flex gap-2 mb-3">
            <input type="date" value={holiday.date} onChange={(e) => setHoliday((h) => ({ ...h, date: e.target.value }))} className="px-3 py-2 border border-navy-200 rounded-lg text-sm" />
            <input placeholder="Holiday name" value={holiday.name} onChange={(e) => setHoliday((h) => ({ ...h, name: e.target.value }))} className="flex-1 px-3 py-2 border border-navy-200 rounded-lg text-sm" />
            <Button variant="outline" onClick={addHoliday}><Plus size={15} /></Button>
          </div>
          {f.holidays.map((h) => (
            <div key={h.date} className="flex items-center justify-between py-1.5 text-sm border-b border-navy-50"><span>{h.date} · {h.name || "Holiday"}</span><button type="button" onClick={() => set("holidays", f.holidays.filter((x) => x.date !== h.date))} className="text-red-500"><X size={15} /></button></div>
          ))}
        </Panel>

        <Panel className="p-4 space-y-3">
          <p className="font-semibold text-navy-900">Book lending (used in the Books section)</p>
          <div className="grid grid-cols-3 gap-3">
            <Input label="Loan days" type="number" min="1" value={f.loan_days} onChange={(e) => set("loan_days", e.target.value)} />
            <Input label="Max books / student" type="number" min="1" value={f.max_books} onChange={(e) => set("max_books", e.target.value)} />
            <Input label="Fine per day (₹)" type="number" min="0" value={f.fine_per_day} onChange={(e) => set("fine_per_day", e.target.value)} />
          </div>
        </Panel>
      </div>
      <ConfirmDialog isOpen={regen} onClose={() => setRegen(false)} onConfirm={regenerate} title="Create a new QR?" confirmText="Create new QR"
        message="The printed poster and the kiosk link you use now will stop working. You will need to print or open the new one." />
    </LibraryPage>
  );
}
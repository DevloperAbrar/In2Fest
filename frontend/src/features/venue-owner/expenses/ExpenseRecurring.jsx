import React, { useState } from "react";
import { Plus, Trash2 } from "lucide-react";
import { useFetch } from "../../../hooks/useFetch";
import Loader from "../../../components/common/Loader";
import Button from "../../../components/common/Button";
import Modal from "../../../components/common/Modal";
import ConfirmDialog from "../../../components/common/ConfirmDialog";
import { showSuccess, showError } from "../../../components/common/Toast";
import { expenseService } from "../../../services/expenseService";
import { Panel, Field, inr, errMsg, fmtDate, todayISO, inputCls, MODES } from "./expenseShared.jsx";

const ordinal = (n) => `${n}${["th", "st", "nd", "rd"][n % 100 > 10 && n % 100 < 14 ? 0 : Math.min(n % 10, 4) % 4] || "th"}`;
const describe = (r) =>
  r.frequency === "weekly" ? "Every week" : r.frequency === "monthly" ? `Monthly on the ${ordinal(r.day_of_month)}` : `Yearly on the ${ordinal(r.day_of_month)}`;

const blank = () => ({ type: "expense", category_slug: "", amount: "", frequency: "monthly", day_of_month: Math.min(Number(todayISO().slice(8, 10)), 28), start_date: todayISO(), end_date: "", mode: "cash", vendor_name: "", note: "" });

export default function ExpenseRecurring({ vid, categories = [], categoryOf, refreshKey, onChanged }) {
  const { data, loading, refetch } = useFetch(vid ? `/venues/${vid}/expenses/recurring` : null, { skip: !vid, deps: [refreshKey] });
  const [open, setOpen] = useState(false);
  const [f, setF] = useState(blank());
  const [saving, setSaving] = useState(false);
  const [del, setDel] = useState(null);
  const set = (k, v) => setF((p) => ({ ...p, [k]: v }));
  const options = categories.filter((c) => c.kind === f.type && c.is_active);

  const done = () => { refetch(); onChanged?.(); };

  const save = async (e) => {
    e.preventDefault();
    if (!(Number(f.amount) > 0)) return showError("Enter an amount greater than 0");
    if (!f.category_slug) return showError("Choose a category");
    setSaving(true);
    try {
      await expenseService.createRecurring(vid, {
        ...f, amount: Number(f.amount), day_of_month: Number(f.day_of_month), end_date: f.end_date || null
      });
      showSuccess("Recurring entry created");
      setOpen(false);
      done();
    } catch (err) {
      showError(errMsg(err, "Could not save"));
    } finally {
      setSaving(false);
    }
  };

  const toggle = async (r) => {
    try { await expenseService.updateRecurring(vid, r.id, { is_active: !r.is_active }); showSuccess(r.is_active ? "Paused" : "Resumed"); done(); }
    catch (err) { showError(errMsg(err, "Could not update")); }
  };
  const remove = async () => {
    try { await expenseService.deleteRecurring(vid, del.id); showSuccess("Deleted. Past entries stay in your books."); setDel(null); done(); }
    catch (err) { showError(errMsg(err, "Could not delete")); }
  };

  return (
    <>
      <div className="flex items-start justify-between gap-3 mb-4">
        <p className="text-[13px] text-navy-500">Set rent, salaries, internet and other fixed costs once. They post automatically on their date.</p>
        <Button className="shrink-0" onClick={() => { setF(blank()); setOpen(true); }}><Plus size={16} />New</Button>
      </div>

      {loading && !data ? <Loader /> : (data || []).length === 0 ? (
        <Panel className="p-8 text-center text-sm text-navy-400">No recurring entries yet. Add your monthly rent to start.</Panel>
      ) : (
        <div className="space-y-2">
          {data.map((r) => {
            const c = categoryOf(r.type, r.category_slug);
            return (
              <Panel key={r.id} className={`p-3 flex items-center gap-3 ${r.is_active ? "" : "opacity-60"}`}>
                <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: c?.color || "#94a3b8" }} />
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-navy-900 truncate">{c?.label || r.category_slug}{r.vendor_name && <span className="text-navy-400 font-normal"> · {r.vendor_name}</span>}</p>
                  <p className="text-[12.5px] text-navy-500">{describe(r)} · {r.is_active ? `Next ${fmtDate(r.next_run_on)}` : "Paused"}{r.end_date ? ` · Ends ${fmtDate(r.end_date)}` : ""}</p>
                </div>
                <b className={`tabular-nums ${r.type === "income" ? "text-emerald-600" : "text-red-600"}`}>{inr(r.amount)}</b>
                <button type="button" onClick={() => toggle(r)} className="text-[12.5px] text-navy-500 hover:underline">{r.is_active ? "Pause" : "Resume"}</button>
                <button type="button" title="Delete" onClick={() => setDel(r)} className="p-2 rounded-lg hover:bg-red-50 text-red-500"><Trash2 size={16} /></button>
              </Panel>
            );
          })}
        </div>
      )}

      <Modal isOpen={open} onClose={() => setOpen(false)} title="New recurring entry">
        <form onSubmit={save} className="space-y-4">
          <div className="grid grid-cols-2 gap-1 p-1 bg-navy-50 rounded-xl">
            {[["expense", "Expense"], ["income", "Income"]].map(([v, label]) => (
              <button key={v} type="button" onClick={() => setF((p) => ({ ...p, type: v, category_slug: "" }))}
                className={`py-2 rounded-lg text-sm font-medium ${f.type === v ? "bg-white shadow-sm text-navy-900" : "text-navy-400"}`}>{label}</button>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Category">
              <select value={f.category_slug} onChange={(e) => set("category_slug", e.target.value)} className={inputCls}>
                <option value="">Select</option>
                {options.map((c) => <option key={c.slug} value={c.slug}>{c.label}</option>)}
              </select>
            </Field>
            <Field label="Amount (₹)">
              <input type="number" min="0" step="0.01" value={f.amount} onChange={(e) => set("amount", e.target.value)} className={inputCls} />
            </Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Repeats">
              <select value={f.frequency} onChange={(e) => set("frequency", e.target.value)} className={inputCls}>
                <option value="weekly">Weekly</option><option value="monthly">Monthly</option><option value="yearly">Yearly</option>
              </select>
            </Field>
            {f.frequency !== "weekly" && (
              <Field label="Day of month (1–28)">
                <input type="number" min="1" max="28" value={f.day_of_month} onChange={(e) => set("day_of_month", e.target.value)} className={inputCls} />
              </Field>
            )}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Starts"><input type="date" value={f.start_date} onChange={(e) => set("start_date", e.target.value)} className={inputCls} /></Field>
            <Field label="Ends (optional)"><input type="date" value={f.end_date} min={f.start_date} onChange={(e) => set("end_date", e.target.value)} className={inputCls} /></Field>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Payment mode">
              <select value={f.mode} onChange={(e) => set("mode", e.target.value)} className={inputCls}>
                {MODES.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
              </select>
            </Field>
            <Field label="Paid to (optional)"><input value={f.vendor_name} maxLength={100} onChange={(e) => set("vendor_name", e.target.value)} className={inputCls} /></Field>
          </div>
          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setOpen(false)}>Cancel</Button>
            <Button type="submit" loading={saving}>Create</Button>
          </div>
        </form>
      </Modal>

      <ConfirmDialog
        isOpen={!!del} onClose={() => setDel(null)} onConfirm={remove}
        title="Delete recurring entry?" confirmText="Delete"
        message="Future entries stop. Entries already posted stay in your books."
      />
    </>
  );
}
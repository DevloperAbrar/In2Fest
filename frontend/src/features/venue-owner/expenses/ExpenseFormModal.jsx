import React, { useEffect, useState } from "react";
import Modal from "../../../components/common/Modal";
import Button from "../../../components/common/Button";
import { showSuccess, showError } from "../../../components/common/Toast";
import { expenseService } from "../../../services/expenseService";
import { Field, MODES, errMsg, todayISO, inputCls } from "./expenseShared.jsx";

const blank = (type = "expense") => ({
  type, amount: "", category_slug: "", entry_date: todayISO(), paid: true,
  mode: "cash", vendor_name: "", reference: "", note: ""
});

export default function ExpenseFormModal({ isOpen, onClose, vid, categories = [], entry, defaultType = "expense", hints, onSaved }) {
  const [f, setF] = useState(blank(defaultType));
  const [saving, setSaving] = useState(false);
  const editing = !!entry;
  const set = (k, v) => setF((p) => ({ ...p, [k]: v }));

  useEffect(() => {
    if (!isOpen) return;
    setF(
      entry
        ? {
            type: entry.type, amount: String(entry.amount), category_slug: entry.category_slug, entry_date: entry.entry_date,
            paid: entry.status === "paid", mode: entry.mode || "cash", vendor_name: entry.vendor_name || "",
            reference: entry.reference || "", note: entry.note || ""
          }
        : blank(defaultType)
    );
  }, [isOpen, entry, defaultType]);

  const options = categories.filter((c) => c.kind === f.type && (c.is_active || c.slug === f.category_slug));
  const isExpense = f.type === "expense";

  const submit = async (another) => {
    const amount = Number(f.amount);
    if (!(amount > 0)) return showError("Enter an amount greater than 0");
    if (!f.category_slug) return showError("Choose a category");
    const payload = {
      type: f.type, amount, category_slug: f.category_slug, entry_date: f.entry_date,
      status: isExpense && !f.paid ? "due" : "paid", mode: f.mode,
      vendor_name: f.vendor_name, reference: f.reference, note: f.note
    };
    setSaving(true);
    try {
      if (editing) await expenseService.updateEntry(vid, entry.id, payload);
      else await expenseService.createEntry(vid, payload);
      showSuccess(editing ? "Entry updated" : isExpense ? "Expense added" : "Income added");
      onSaved?.();
      if (another && !editing) setF((p) => ({ ...blank(p.type), category_slug: p.category_slug, entry_date: p.entry_date }));
      else onClose();
    } catch (e) {
      showError(errMsg(e, "Could not save this entry"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={editing ? "Edit entry" : isExpense ? "Add expense" : "Add income"}>
      <form onSubmit={(e) => { e.preventDefault(); submit(false); }} className="space-y-4">
        {!editing && (
          <div className="grid grid-cols-2 gap-1 p-1 bg-navy-50 rounded-xl">
            {[["expense", "Expense"], ["income", "Income"]].map(([v, label]) => (
              <button
                key={v} type="button"
                onClick={() => setF((p) => ({ ...p, type: v, category_slug: "", paid: true }))}
                className={`py-2 rounded-lg text-sm font-medium transition-colors ${f.type === v ? "bg-white shadow-sm text-navy-900" : "text-navy-400"}`}
              >
                {label}
              </button>
            ))}
          </div>
        )}

        <div className="grid grid-cols-2 gap-3">
          <Field label="Amount (₹)">
            <input type="number" inputMode="decimal" min="0" step="0.01" autoFocus value={f.amount} onChange={(e) => set("amount", e.target.value)} className={inputCls} placeholder="0" />
          </Field>
          <Field label={isExpense && !f.paid ? "Due date" : "Date"}>
            <input type="date" value={f.entry_date} max={f.paid ? todayISO() : undefined} onChange={(e) => set("entry_date", e.target.value)} className={inputCls} />
          </Field>
        </div>

        <Field label="Category">
          <select value={f.category_slug} onChange={(e) => set("category_slug", e.target.value)} className={inputCls}>
            <option value="">Select category</option>
            {options.map((c) => <option key={c.slug} value={c.slug}>{c.label}</option>)}
          </select>
        </Field>

        {hints?.payroll_auto && isExpense && f.category_slug === "salaries" && (
          <p className="text-[12.5px] text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
            Salaries paid from Staff → Payroll are already counted automatically. Add only salaries paid outside the app.
          </p>
        )}

        {isExpense && (
          <label className="flex items-center gap-2 text-sm text-navy-700">
            <input type="checkbox" checked={!f.paid} onChange={(e) => set("paid", !e.target.checked)} className="rounded border-navy-300" />
            Pay later (bill not paid yet)
          </label>
        )}

        <div className="grid grid-cols-2 gap-3">
          <Field label="Payment mode">
            <select value={f.mode} onChange={(e) => set("mode", e.target.value)} className={inputCls}>
              {MODES.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
            </select>
          </Field>
          <Field label={isExpense ? "Paid to (optional)" : "Received from (optional)"}>
            <input value={f.vendor_name} maxLength={100} onChange={(e) => set("vendor_name", e.target.value)} className={inputCls} />
          </Field>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Bill / reference no. (optional)">
            <input value={f.reference} maxLength={80} onChange={(e) => set("reference", e.target.value)} className={inputCls} />
          </Field>
          <Field label="Note (optional)">
            <input value={f.note} maxLength={300} onChange={(e) => set("note", e.target.value)} className={inputCls} />
          </Field>
        </div>

        <div className="flex flex-wrap justify-end gap-2 pt-1">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          {!editing && <Button variant="secondary" loading={saving} onClick={() => submit(true)}>Save & add another</Button>}
          <Button type="submit" loading={saving}>{editing ? "Save changes" : "Save"}</Button>
        </div>
      </form>
    </Modal>
  );
}
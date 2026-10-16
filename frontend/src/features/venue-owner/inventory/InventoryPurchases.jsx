import React, { useState } from "react";
import { Plus, Trash2, Pencil } from "lucide-react";
import Modal from "../../../components/common/Modal";
import Button from "../../../components/common/Button";
import { useFetch } from "../../../hooks/useFetch";
import { inventoryService } from "../../../services/inventoryService";
import { showSuccess, showError } from "../../../components/common/Toast";
import { inr, todayStr } from "../../../lib/billingMath";
import { Field, inputCls } from "../billing/billingShared.jsx";

const errMsg = (e, fallback) => e.response?.data?.message || fallback;

/* ------------------------------- Suppliers ------------------------------- */

function SupplierModal({ vid, supplier, onClose, onDone }) {
  const [f, setF] = useState({
    name: supplier?.name || "", phone: supplier?.phone || "", gstin: supplier?.gstin || "",
    address: supplier?.address || "", notes: supplier?.notes || ""
  });
  const [saving, setSaving] = useState(false);
  const set = (p) => setF((s) => ({ ...s, ...p }));

  const save = async () => {
    if (!f.name.trim()) return showError("Supplier name is required");
    setSaving(true);
    try {
      if (supplier) await inventoryService.updateSupplier(vid, supplier.id, f);
      else await inventoryService.createSupplier(vid, f);
      showSuccess("Supplier saved");
      onDone();
    } catch (e) {
      showError(errMsg(e, "Could not save the supplier"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal isOpen onClose={onClose} title={supplier ? "Edit supplier" : "Add supplier"} size="sm">
      <div className="space-y-4">
        <Field label="Name"><input className={inputCls} value={f.name} onChange={(e) => set({ name: e.target.value })} autoFocus /></Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Phone"><input className={inputCls} value={f.phone} onChange={(e) => set({ phone: e.target.value })} /></Field>
          <Field label="GSTIN"><input className={inputCls} maxLength={15} value={f.gstin} onChange={(e) => set({ gstin: e.target.value.toUpperCase() })} /></Field>
        </div>
        <Field label="Address"><input className={inputCls} value={f.address} onChange={(e) => set({ address: e.target.value })} /></Field>
        <Button onClick={save} loading={saving} className="w-full">Save</Button>
      </div>
    </Modal>
  );
}

export function SuppliersTab({ vid }) {
  const { data, loading, refetch } = useFetch(`/venues/${vid}/inventory/suppliers`);
  const [editing, setEditing] = useState(null); // null | "new" | supplier
  const rows = data || [];

  const remove = async (s) => {
    if (!window.confirm(`Remove ${s.name}? Old purchases keep their record.`)) return;
    try { await inventoryService.deleteSupplier(vid, s.id); refetch(); } catch (e) { showError(errMsg(e, "Could not remove")); }
  };

  return (
    <>
      <div className="flex justify-end mb-3">
        <Button onClick={() => setEditing("new")}><Plus size={14} /> Add supplier</Button>
      </div>
      {loading ? (
        <p className="text-sm text-navy-400 py-10 text-center">Loading…</p>
      ) : rows.length === 0 ? (
        <p className="text-sm text-navy-400 py-10 text-center">No suppliers yet.</p>
      ) : (
        <div className="bg-white rounded-2xl border border-navy-100/70 shadow-card divide-y divide-navy-100/70">
          {rows.map((s) => (
            <div key={s.id} className="flex items-center gap-3 px-4 py-3">
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-navy-800 truncate">{s.name}</p>
                <p className="text-xs text-navy-400 truncate">{[s.phone, s.gstin].filter(Boolean).join(" · ") || "—"}</p>
              </div>
              {Number(s.balance_due) > 0 && <p className="text-xs font-medium text-red-600 shrink-0">Due {inr(s.balance_due, 0)}</p>}
              <button type="button" onClick={() => setEditing(s)} className="h-8 w-8 grid place-items-center rounded-lg text-navy-400 hover:bg-navy-50"><Pencil size={15} /></button>
              <button type="button" onClick={() => remove(s)} className="h-8 w-8 grid place-items-center rounded-lg text-red-400 hover:bg-red-50"><Trash2 size={15} /></button>
            </div>
          ))}
        </div>
      )}
      {editing && (
        <SupplierModal vid={vid} supplier={editing === "new" ? null : editing} onClose={() => setEditing(null)} onDone={() => { setEditing(null); refetch(); }} />
      )}
    </>
  );
}

/* ------------------------------- Purchases ------------------------------- */

const blankLine = () => ({ item_id: "", variant: "", quantity: "1", unit_cost: "" });

function PurchaseModal({ vid, items, onClose, onDone }) {
  const sup = useFetch(`/venues/${vid}/inventory/suppliers`);
  const [f, setF] = useState({ supplier_id: "", bill_number: "", bill_date: todayStr(), amount_paid: "", notes: "" });
  const [lines, setLines] = useState([blankLine()]);
  const [saving, setSaving] = useState(false);

  const setLine = (idx, patch) => setLines((ls) => ls.map((l, i) => (i === idx ? { ...l, ...patch } : l)));
  const itemOf = (id) => items.find((i) => i.id === id);
  const total = lines.reduce((s, l) => s + (Number(l.quantity) || 0) * (Number(l.unit_cost) || 0), 0);

  const pick = (idx, id) => {
    const it = itemOf(id);
    setLine(idx, { item_id: id, variant: it?.variants?.[0] || "", unit_cost: it?.cost_price ? String(it.cost_price) : "" });
  };

  const save = async () => {
    const used = lines.filter((l) => l.item_id);
    if (used.length === 0) return showError("Add at least one product");
    for (let i = 0; i < used.length; i += 1) {
      if (!(Number(used[i].quantity) > 0)) return showError(`Line ${i + 1}: enter a quantity`);
      if (used[i].unit_cost === "" || !(Number(used[i].unit_cost) >= 0)) return showError(`Line ${i + 1}: enter the cost price`);
    }
    setSaving(true);
    try {
      await inventoryService.createPurchase(vid, {
        ...f,
        amount_paid: Number(f.amount_paid) || 0,
        lines: used.map((l) => ({ item_id: l.item_id, variant: l.variant, quantity: Number(l.quantity), unit_cost: Number(l.unit_cost) }))
      });
      showSuccess("Purchase saved, stock updated");
      onDone();
    } catch (e) {
      showError(errMsg(e, "Could not save the purchase"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal isOpen onClose={onClose} title="New purchase (stock in)" size="lg">
      <div className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Field label="Supplier">
            <select className={inputCls} value={f.supplier_id} onChange={(e) => setF({ ...f, supplier_id: e.target.value })}>
              <option value="">No supplier</option>
              {(sup.data || []).map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </Field>
          <Field label="Bill no."><input className={inputCls} value={f.bill_number} onChange={(e) => setF({ ...f, bill_number: e.target.value })} /></Field>
          <Field label="Bill date"><input className={inputCls} type="date" value={f.bill_date} onChange={(e) => setF({ ...f, bill_date: e.target.value })} /></Field>
        </div>

        <div className="space-y-3">
          {lines.map((l, idx) => {
            const it = itemOf(l.item_id);
            return (
              <div key={idx} className="rounded-xl border border-navy-100/70 p-3 space-y-2">
                <select className={inputCls} value={l.item_id} onChange={(e) => pick(idx, e.target.value)}>
                  <option value="">Select product</option>
                  {items.map((i) => <option key={i.id} value={i.id}>{i.name}</option>)}
                </select>
                <div className="grid grid-cols-3 gap-2">
                  {it?.variants?.length > 0 ? (
                    <select className={inputCls} value={l.variant} onChange={(e) => setLine(idx, { variant: e.target.value })}>
                      {it.variants.map((v) => <option key={v} value={v}>{v}</option>)}
                    </select>
                  ) : <div />}
                  <input className={inputCls} type="number" min="0" step="any" placeholder="Qty" value={l.quantity} onChange={(e) => setLine(idx, { quantity: e.target.value })} />
                  <input className={inputCls} type="number" min="0" step="any" placeholder="Cost ₹" value={l.unit_cost} onChange={(e) => setLine(idx, { unit_cost: e.target.value })} />
                </div>
                {lines.length > 1 && (
                  <button type="button" onClick={() => setLines((ls) => ls.filter((_, i) => i !== idx))} className="text-xs text-red-500">Remove line</button>
                )}
              </div>
            );
          })}
          <Button variant="outline" onClick={() => setLines((ls) => [...ls, blankLine()])}><Plus size={14} /> Add product</Button>
        </div>

        <div className="grid grid-cols-2 gap-3 items-end">
          <Field label="Paid now (₹)"><input className={inputCls} type="number" min="0" value={f.amount_paid} onChange={(e) => setF({ ...f, amount_paid: e.target.value })} /></Field>
          <p className="text-right text-sm text-navy-500">Total <b className="text-navy-900 text-base">{inr(total)}</b></p>
        </div>
        <Button onClick={save} loading={saving} className="w-full">Save purchase</Button>
      </div>
    </Modal>
  );
}

export function PurchasesTab({ vid, items, onChanged }) {
  const { data, loading, refetch } = useFetch(`/venues/${vid}/inventory/purchases`);
  const [open, setOpen] = useState(false);
  const rows = data || [];

  const done = () => { setOpen(false); refetch(); onChanged && onChanged(); };

  const pay = async (p) => {
    const due = Number(p.total) - Number(p.amount_paid);
    const v = window.prompt(`Amount paid to supplier (balance ${inr(due, 0)})`, String(due));
    if (!v) return;
    try { await inventoryService.payPurchase(vid, p.id, Number(v)); refetch(); } catch (e) { showError(errMsg(e, "Could not record payment")); }
  };

  const cancel = async (p) => {
    if (!window.confirm("Cancel this purchase? The stock it added will be taken back out.")) return;
    try { await inventoryService.cancelPurchase(vid, p.id); showSuccess("Purchase cancelled"); refetch(); onChanged && onChanged(); } catch (e) { showError(errMsg(e, "Could not cancel")); }
  };

  return (
    <>
      <div className="flex justify-end mb-3">
        <Button onClick={() => setOpen(true)} disabled={items.length === 0}><Plus size={14} /> New purchase</Button>
      </div>
      {loading ? (
        <p className="text-sm text-navy-400 py-10 text-center">Loading…</p>
      ) : rows.length === 0 ? (
        <p className="text-sm text-navy-400 py-10 text-center">No purchases yet. Record a supplier bill to add stock.</p>
      ) : (
        <div className="bg-white rounded-2xl border border-navy-100/70 shadow-card divide-y divide-navy-100/70">
          {rows.map((p) => {
            const due = Number(p.total) - Number(p.amount_paid);
            const cancelled = p.status === "cancelled";
            return (
              <div key={p.id} className={`px-4 py-3 ${cancelled ? "opacity-50" : ""}`}>
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-navy-800 truncate">{p.supplier_name || "No supplier"}{p.bill_number ? ` · ${p.bill_number}` : ""}</p>
                    <p className="text-xs text-navy-400 truncate">
                      {p.items.map((l) => `${l.name}${l.variant ? ` (${l.variant})` : ""} ×${l.quantity}`).join(", ")}
                    </p>
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-semibold tabular-nums">{inr(p.total, 0)}</p>
                    <p className={`text-[11px] ${cancelled ? "text-navy-400" : due > 0.009 ? "text-red-600" : "text-emerald-600"}`}>
                      {cancelled ? "Cancelled" : due > 0.009 ? `Due ${inr(due, 0)}` : "Paid"}
                    </p>
                  </div>
                </div>
                {!cancelled && (
                  <div className="flex gap-3 mt-1.5">
                    {due > 0.009 && <button type="button" onClick={() => pay(p)} className="text-xs text-primary-600">Record payment</button>}
                    <button type="button" onClick={() => cancel(p)} className="text-xs text-red-500">Cancel purchase</button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
      {open && <PurchaseModal vid={vid} items={items} onClose={() => setOpen(false)} onDone={done} />}
    </>
  );
}
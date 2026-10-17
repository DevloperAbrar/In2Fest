import React, { useEffect, useMemo, useState } from "react";
import { Plus, Trash2, Search } from "lucide-react";
import Modal from "../../../components/common/Modal";
import Button from "../../../components/common/Button";
import api from "../../../services/api";
import { ordersService } from "../../../services/ordersService";
import { showError } from "../../../components/common/Toast";
import { Field, inputCls } from "../billing/billingShared.jsx";

export const money = (n) => `₹${Number(n || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;

function Toggle({ checked, onChange, label, hint }) {
  return (
    <label className="flex items-start justify-between gap-4 py-2 cursor-pointer">
      <span>
        <span className="block text-sm font-medium text-navy-800">{label}</span>
        {hint && <span className="block text-xs text-navy-400 mt-0.5">{hint}</span>}
      </span>
      <input type="checkbox" checked={checked} onChange={(e) => onChange(e.target.checked)} className="mt-1 h-5 w-5 accent-primary-600" />
    </label>
  );
}

const chip = (active) =>
  `px-3 h-9 rounded-full border text-sm ${active ? "bg-navy-800 text-white border-navy-800" : "bg-white text-navy-600 border-navy-200"}`;

/* ─── Accept / change time ─── */
export function AcceptModal({ order, defaultMinutes = 20, title, onClose, onSubmit }) {
  const [minutes, setMinutes] = useState(defaultMinutes);
  const [busy, setBusy] = useState(false);
  const go = async () => {
    setBusy(true);
    try { await onSubmit(Number(minutes)); } finally { setBusy(false); }
  };
  return (
    <Modal isOpen onClose={onClose} title={title || `Accept order #${order.order_no}`} size="sm">
      <div className="space-y-4">
        <p className="text-sm text-navy-500">When will it be ready? The customer sees this time on their tracking page.</p>
        <div className="flex flex-wrap gap-2">
          {[10, 15, 20, 30, 45, 60].map((m) => (
            <button key={m} type="button" onClick={() => setMinutes(m)} className={chip(Number(minutes) === m)}>{m} min</button>
          ))}
        </div>
        <Field label="Or type minutes">
          <input className={inputCls} type="number" min="1" max="480" value={minutes} onChange={(e) => setMinutes(e.target.value)} />
        </Field>
        <Button onClick={go} loading={busy} className="w-full">
          {order.status === "pending" ? "Accept order" : "Update time"}
        </Button>
      </div>
    </Modal>
  );
}

/* ─── Cancel / report ─── */
export function ReasonModal({ title, description, quick = [], confirmLabel, danger = true, onClose, onSubmit }) {
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const go = async () => {
    if (reason.trim().length < 2) return showError("Please write a short reason");
    setBusy(true);
    try { await onSubmit(reason.trim()); } finally { setBusy(false); }
  };
  return (
    <Modal isOpen onClose={onClose} title={title} size="sm">
      <div className="space-y-4">
        {description && <p className="text-sm text-navy-500">{description}</p>}
        {quick.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {quick.map((q) => <button key={q} type="button" onClick={() => setReason(q)} className={chip(reason === q)}>{q}</button>)}
          </div>
        )}
        <Field label="Reason (the customer will see this)">
          <input className={inputCls} maxLength={200} value={reason} onChange={(e) => setReason(e.target.value)} autoFocus />
        </Field>
        <Button variant={danger ? "danger" : "primary"} onClick={go} loading={busy} className="w-full">{confirmLabel}</Button>
      </div>
    </Modal>
  );
}

/* ─── Handover: verify code -> bill -> payment ─── */
export function CompleteModal({ order, onClose, onSubmit }) {
  const verified = Boolean(order.code_verified_at);
  const [code, setCode] = useState("");
  const [skip, setSkip] = useState(false);
  const [reason, setReason] = useState("");
  const [paid, setPaid] = useState(true);
  const [method, setMethod] = useState("cash");
  const [busy, setBusy] = useState(false);

  const go = async () => {
    if (!verified && !skip && code.trim().length < 4) return showError("Enter the 4-character pickup code");
    if (!verified && skip && reason.trim().length < 3) return showError("Write a reason for skipping the code");
    setBusy(true);
    try {
      await onSubmit({
        code: !verified && !skip ? code.trim() : undefined,
        override_reason: !verified && skip ? reason.trim() : undefined,
        mark_paid: paid,
        payment_method: method
      });
    } finally { setBusy(false); }
  };

  return (
    <Modal isOpen onClose={onClose} title={`Hand over order #${order.order_no}`} size="sm">
      <div className="space-y-4">
        <div className="rounded-xl bg-navy-50/70 p-3 text-sm">
          <p className="font-medium text-navy-800">{order.customer_name} · {order.customer_phone}</p>
          <ul className="mt-1 text-navy-500">
            {order.items.map((i, k) => <li key={k}>{i.qty} × {i.name}{i.variant ? ` (${i.variant})` : ""}</li>)}
          </ul>
          <p className="mt-2 font-semibold text-navy-900">Total {money(order.total)}</p>
        </div>

        {verified ? (
          <p className="text-sm text-emerald-600 font-medium">Pickup code already verified ✓</p>
        ) : !skip ? (
          <Field label="Ask the customer for their pickup code">
            <input
              className={`${inputCls} text-center text-2xl tracking-[0.4em] font-semibold uppercase`}
              maxLength={4} value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} placeholder="----" autoFocus
            />
          </Field>
        ) : (
          <Field label="Why are you skipping the code?" hint="This is saved on the order.">
            <input className={inputCls} maxLength={200} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. customer lost phone, ID checked" />
          </Field>
        )}
        {!verified && (
          <button type="button" onClick={() => setSkip((s) => !s)} className="text-xs text-primary-600 underline">
            {skip ? "Use the code instead" : "Customer can't show the code?"}
          </button>
        )}

        <div className="border-t border-navy-100/70 pt-3">
          <Toggle checked={paid} onChange={setPaid} label="Customer paid at the counter" hint="Records the payment on the bill" />
          {paid && (
            <div className="flex gap-2 mt-1">
              {[["cash", "Cash"], ["upi", "UPI"], ["card", "Card"]].map(([v, l]) => (
                <button key={v} type="button" onClick={() => setMethod(v)} className={chip(method === v)}>{l}</button>
              ))}
            </div>
          )}
        </div>

        <Button onClick={go} loading={busy} className="w-full">Verify &amp; generate bill</Button>
      </div>
    </Modal>
  );
}

/* ─── Edit order ─── */
export function EditOrderModal({ vid, order, onClose, onSaved }) {
  const [rows, setRows] = useState(() => order.items.map((i) => ({ ...i })));
  const [note, setNote] = useState(order.customer_note || "");
  const [catalog, setCatalog] = useState([]);
  const [q, setQ] = useState("");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    api.get(`/venues/${vid}/billing/service-items`, { params: { item_type: "product" } })
      .then((r) => setCatalog((r.data.data || []).filter((i) => i.is_active !== false)))
      .catch(() => {});
  }, [vid]);

  const matches = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return [];
    return catalog.filter((i) => i.name.toLowerCase().includes(s)).slice(0, 6);
  }, [q, catalog]);

  const total = rows.reduce((s, r) => s + Number(r.qty || 0) * Number(r.unit_price || 0), 0);
  const patch = (idx, p) => setRows((rs) => rs.map((r, i) => (i === idx ? { ...r, ...p } : r)));

  const addCatalog = (it) => {
    const labels = (Array.isArray(it.variants) ? it.variants : []).map((v) => v.label).filter(Boolean);
    setRows((rs) => [...rs, { item_id: it.id, name: it.name, variant: labels[0] || "", qty: 1, unit_price: Number(it.default_price), _labels: labels }]);
    setQ("");
  };

  const save = async () => {
    setBusy(true);
    try {
      const items = rows.map((r) => ({ item_id: r.item_id || undefined, name: r.name, variant: r.variant, qty: Number(r.qty), unit_price: Number(r.unit_price), unit: r.unit }));
      await ordersService.edit(vid, order.id, { items, customer_note: note });
      await onSaved();
    } catch (e) {
      showError(e.response?.data?.message || "Could not save changes");
    } finally { setBusy(false); }
  };

  return (
    <Modal isOpen onClose={onClose} title={`Edit order #${order.order_no}`} size="lg">
      <div className="space-y-4">
        <div className="space-y-2">
          {rows.map((r, idx) => {
            const labels = r._labels || [];
            return (
              <div key={idx} className="flex items-center gap-2 rounded-xl border border-navy-100/70 p-2">
                <div className="flex-1 min-w-0">
                  {r.item_id ? (
                    <p className="text-sm font-medium text-navy-800 truncate">{r.name}</p>
                  ) : (
                    <input className={inputCls} value={r.name} placeholder="Item name" onChange={(e) => patch(idx, { name: e.target.value })} />
                  )}
                  {labels.length > 0 ? (
                    <select className="mt-1 text-xs border border-navy-200 rounded-lg px-2 py-1" value={r.variant} onChange={(e) => patch(idx, { variant: e.target.value })}>
                      {labels.map((l) => <option key={l} value={l}>{l}</option>)}
                    </select>
                  ) : r.variant ? <p className="text-xs text-navy-400">{r.variant}</p> : null}
                </div>
                <input className="w-16 h-10 rounded-lg border border-navy-200 px-2 text-sm text-center" type="number" min="0.01" step="any" value={r.qty} onChange={(e) => patch(idx, { qty: e.target.value })} aria-label="Quantity" />
                <input className="w-24 h-10 rounded-lg border border-navy-200 px-2 text-sm text-right" type="number" min="0" step="any" value={r.unit_price} onChange={(e) => patch(idx, { unit_price: e.target.value })} aria-label="Price" />
                <button type="button" onClick={() => setRows((rs) => rs.filter((_, i) => i !== idx))} className="text-navy-300 hover:text-red-500 p-1" aria-label="Remove item" disabled={rows.length === 1}>
                  <Trash2 size={16} />
                </button>
              </div>
            );
          })}
        </div>

        <div className="relative">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-navy-300" />
          <input className={`${inputCls} pl-9`} placeholder="Add an item from your catalog…" value={q} onChange={(e) => setQ(e.target.value)} />
          {matches.length > 0 && (
            <div className="absolute z-10 left-0 right-0 mt-1 bg-white rounded-xl border border-navy-100 shadow-lg overflow-hidden">
              {matches.map((m) => (
                <button key={m.id} type="button" onClick={() => addCatalog(m)} className="w-full flex justify-between px-3 py-2 text-sm hover:bg-navy-50 text-left">
                  <span>{m.name}</span><span className="text-navy-400">{money(m.default_price)}</span>
                </button>
              ))}
            </div>
          )}
        </div>
        <button type="button" onClick={() => setRows((rs) => [...rs, { item_id: null, name: "", variant: "", qty: 1, unit_price: 0 }])} className="inline-flex items-center gap-1 text-sm text-primary-600">
          <Plus size={14} /> Add a custom item
        </button>

        <Field label="Note"><input className={inputCls} maxLength={300} value={note} onChange={(e) => setNote(e.target.value)} /></Field>

        <div className="flex items-center justify-between border-t border-navy-100/70 pt-3">
          <div>
            <p className="text-xs text-navy-400">New total</p>
            <p className="text-lg font-semibold text-navy-900">{money(total)}</p>
          </div>
          <Button onClick={save} loading={busy}>Save changes</Button>
        </div>
        <p className="text-xs text-navy-400">The customer sees the updated items and total on their tracking page.</p>
      </div>
    </Modal>
  );
}

/* ─── Settings ─── */
export function SettingsModal({ vid, settings, isOwner, onClose, onSaved }) {
  const [s, setS] = useState({ ...settings });
  const [blocked, setBlocked] = useState([]);
  const [busy, setBusy] = useState(false);
  const set = (k, v) => setS((x) => ({ ...x, [k]: v }));

  const loadBlocked = () => ordersService.blocked(vid).then((r) => setBlocked(r.data.data || [])).catch(() => {});
  useEffect(() => { if (isOwner) loadBlocked(); /* eslint-disable-next-line */ }, []);

  const save = async () => {
    setBusy(true);
    try {
      const r = await ordersService.saveSettings(vid, s);
      await onSaved(r.data.data);
    } catch (e) {
      showError(e.response?.data?.message || "Could not save settings");
    } finally { setBusy(false); }
  };

  return (
    <Modal isOpen onClose={onClose} title="Pickup order settings" size="md">
      <div className="space-y-4">
        <div className="divide-y divide-navy-100/70">
          <Toggle checked={s.enabled} onChange={(v) => set("enabled", v)} label="Take online pickup orders" hint="Customers order from your website and collect at your counter. No delivery." />
          <Toggle checked={s.accepting} onChange={(v) => set("accepting", v)} label="Accepting orders right now" hint="Turn off when you are busy or closed." />
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Default prep time (min)"><input className={inputCls} type="number" min="5" max="240" value={s.default_prep_minutes} onChange={(e) => set("default_prep_minutes", e.target.value)} /></Field>
          <Field label="Minimum order (₹)"><input className={inputCls} type="number" min="0" value={s.min_order_amount} onChange={(e) => set("min_order_amount", e.target.value)} /></Field>
          <Field label="Open orders per phone"><input className={inputCls} type="number" min="1" max="10" value={s.max_active_per_phone} onChange={(e) => set("max_active_per_phone", e.target.value)} /></Field>
          <Field label="Block after no-shows"><input className={inputCls} type="number" min="1" max="10" value={s.block_after_no_shows} onChange={(e) => set("block_after_no_shows", e.target.value)} /></Field>
        </div>
        <Field label="Message shown to customers" hint="e.g. Pay at the counter. Please show your pickup code.">
          <input className={inputCls} maxLength={300} value={s.instructions} onChange={(e) => set("instructions", e.target.value)} />
        </Field>

        {isOwner && blocked.length > 0 && (
          <div>
            <p className="text-xs font-medium text-navy-500 mb-1">Blocked numbers</p>
            <div className="rounded-xl border border-navy-100/70 divide-y divide-navy-100/70">
              {blocked.map((b) => (
                <div key={b.phone} className="flex items-center justify-between px-3 py-2 text-sm">
                  <span>{b.name} · {b.phone} <span className="text-xs text-navy-400">({b.fake ? "fake" : `${b.no_shows} no-shows`})</span></span>
                  <button type="button" className="text-primary-600 text-xs" onClick={() => ordersService.unblock(vid, b.phone).then(loadBlocked)}>Unblock</button>
                </div>
              ))}
            </div>
          </div>
        )}

        {isOwner ? <Button onClick={save} loading={busy} className="w-full">Save settings</Button> : <p className="text-xs text-navy-400">Only the owner can change these settings.</p>}
      </div>
    </Modal>
  );
}
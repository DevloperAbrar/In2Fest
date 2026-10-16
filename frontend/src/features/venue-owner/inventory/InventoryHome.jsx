import React, { useMemo, useState } from "react";
import { Search, Download, AlertTriangle, PackageX, Wallet, Package, SlidersHorizontal } from "lucide-react";
import DashboardLayout from "../../../components/layout/DashboardLayout.jsx";
import Modal from "../../../components/common/Modal";
import Button from "../../../components/common/Button";
import { ownerSidebarItems } from "../ownerSidebarItems.js";
import { useVenue } from "../../../context/VenueContext.jsx";
import { useFetch } from "../../../hooks/useFetch";
import { inventoryService } from "../../../services/inventoryService";
import { showSuccess, showError } from "../../../components/common/Toast";
import { inr } from "../../../lib/billingMath";
import { Field, inputCls } from "../billing/billingShared.jsx";
import { downloadBlob } from "../gym/gymShared.jsx";
import { PurchasesTab, SuppliersTab } from "./InventoryPurchases.jsx";

const STATUS = {
  ok: { label: "In stock", cls: "bg-emerald-50 text-emerald-600" },
  low: { label: "Low", cls: "bg-amber-50 text-amber-600" },
  out: { label: "Out", cls: "bg-red-50 text-red-600" },
  untracked: { label: "Not tracked", cls: "bg-navy-50 text-navy-400" }
};

const MOVE_LABEL = {
  opening: "Opening stock", purchase: "Purchase", purchase_reversal: "Purchase cancelled", sale: "Sale",
  sale_reversal: "Sale reversed", return: "Return", return_reversal: "Return reversed", adjustment: "Adjustment"
};

const REASONS = {
  add: [["recount", "Recount"], ["found", "Found"], ["other", "Other"]],
  remove: [["damaged", "Damaged"], ["lost", "Lost / stolen"], ["returned_to_supplier", "Returned to supplier"], ["other", "Other"]],
  set: [["recount", "Physical recount"]]
};

function Pill({ status }) {
  const s = STATUS[status] || STATUS.untracked;
  return <span className={`inline-flex px-2 py-0.5 rounded-full text-[11px] font-medium ${s.cls}`}>{s.label}</span>;
}

function Stat({ icon: Icon, label, value, tone = "text-navy-900", onClick, active }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`text-left bg-white rounded-2xl border shadow-card p-4 ${active ? "border-navy-800" : "border-navy-100/70"} ${onClick ? "hover:bg-navy-50/40" : "cursor-default"}`}
    >
      <div className="flex items-center gap-2 text-xs text-navy-400"><Icon size={14} /> {label}</div>
      <p className={`mt-1.5 text-xl font-semibold tabular-nums ${tone}`}>{value}</p>
    </button>
  );
}

function AdjustModal({ vid, item, onClose, onDone }) {
  const hasSizes = item.variants.length > 0;
  const [variant, setVariant] = useState(hasSizes ? item.variants[0] : "");
  const [mode, setMode] = useState("add");
  const [qty, setQty] = useState("");
  const [reason, setReason] = useState("recount");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  const current = hasSizes ? Number(item.variant_stock[variant] || 0) : item.stock_qty;
  const changeMode = (m) => { setMode(m); setReason(REASONS[m][0][0]); };

  const submit = async () => {
    if (qty === "" || Number(qty) < 0 || (mode !== "set" && !(Number(qty) > 0))) return showError("Enter a valid quantity");
    setSaving(true);
    try {
      await inventoryService.adjust(vid, item.id, { variant, mode, qty: Number(qty), reason, note });
      showSuccess("Stock updated");
      onDone();
    } catch (e) {
      showError(e.response?.data?.message || "Could not update stock");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal isOpen onClose={onClose} title={`Adjust stock · ${item.name}`} size="sm">
      <div className="space-y-4">
        {hasSizes && (
          <Field label="Size">
            <div className="flex flex-wrap gap-2">
              {item.variants.map((l) => (
                <button key={l} type="button" onClick={() => setVariant(l)}
                  className={`px-3 h-9 rounded-full border text-sm ${variant === l ? "bg-navy-800 text-white border-navy-800" : "bg-white text-navy-600 border-navy-200"}`}>
                  {l} <span className="opacity-60">({Number(item.variant_stock[l] || 0)})</span>
                </button>
              ))}
            </div>
          </Field>
        )}
        <p className="text-xs text-navy-400">Current stock{hasSizes ? ` (${variant})` : ""}: <b className="text-navy-800">{current}</b></p>
        <div className="grid grid-cols-3 gap-2">
          {[["add", "Add"], ["remove", "Remove"], ["set", "Set to"]].map(([m, l]) => (
            <button key={m} type="button" onClick={() => changeMode(m)}
              className={`h-10 rounded-lg text-sm font-medium border ${mode === m ? "bg-navy-800 text-white border-navy-800" : "bg-white text-navy-500 border-navy-200"}`}>{l}</button>
          ))}
        </div>
        <Field label={mode === "set" ? "Counted quantity" : "Quantity"}>
          <input className={inputCls} type="number" min="0" step="any" value={qty} onChange={(e) => setQty(e.target.value)} autoFocus />
        </Field>
        <Field label="Reason">
          <select className={inputCls} value={reason} onChange={(e) => setReason(e.target.value)}>
            {REASONS[mode].map(([v, l]) => <option key={v} value={v}>{l}</option>)}
          </select>
        </Field>
        <Field label="Note (optional)">
          <input className={inputCls} maxLength={200} value={note} onChange={(e) => setNote(e.target.value)} />
        </Field>
        <Button onClick={submit} loading={saving} className="w-full">Save</Button>
      </div>
    </Modal>
  );
}

function HistoryTab({ vid }) {
  const { data, loading } = useFetch(`/venues/${vid}/inventory/movements?limit=150`);
  const rows = data || [];
  if (loading) return <p className="text-sm text-navy-400 py-10 text-center">Loading…</p>;
  if (rows.length === 0) return <p className="text-sm text-navy-400 py-10 text-center">No stock movement yet.</p>;
  return (
    <div className="bg-white rounded-2xl border border-navy-100/70 shadow-card divide-y divide-navy-100/70">
      {rows.map((m) => (
        <div key={m.id} className="flex items-center justify-between gap-3 px-4 py-3">
          <div className="min-w-0">
            <p className="text-sm font-medium text-navy-800 truncate">{m.item_name}{m.variant ? ` (${m.variant})` : ""}</p>
            <p className="text-xs text-navy-400 truncate">
              {MOVE_LABEL[m.type] || m.type}{m.note ? ` · ${m.note}` : ""} · {new Date(m.createdAt || m.created_at).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" })}
            </p>
          </div>
          <div className="text-right shrink-0">
            <p className={`text-sm font-semibold tabular-nums ${Number(m.qty_change) < 0 ? "text-red-600" : "text-emerald-600"}`}>
              {Number(m.qty_change) > 0 ? "+" : ""}{Number(m.qty_change)}
            </p>
            <p className="text-[11px] text-navy-400">Balance {Number(m.balance_after)}</p>
          </div>
        </div>
      ))}
    </div>
  );
}

export default function InventoryHome() {
  const { venue } = useVenue();
  const vid = venue?.id;
  const [tab, setTab] = useState("stock");
  const [filter, setFilter] = useState("all");
  const [q, setQ] = useState("");
  const [adjusting, setAdjusting] = useState(null);

  const ov = useFetch(vid ? `/venues/${vid}/inventory/overview` : null, { skip: !vid });
  const st = useFetch(vid ? `/venues/${vid}/inventory/stock` : null, { skip: !vid });
  const items = st.data || [];
  const o = ov.data || {};

  const list = useMemo(() => {
    const s = q.trim().toLowerCase();
    return items.filter((i) => {
      if (filter !== "all" && i.stock_status !== filter) return false;
      if (!s) return true;
      return [i.name, i.category, i.brand, i.sku, i.barcode].some((v) => String(v || "").toLowerCase().includes(s));
    });
  }, [items, filter, q]);

  const refreshAll = () => { ov.refetch(); st.refetch(); };

  const exportCsv = async () => {
    try {
      const r = await inventoryService.exportStock(vid);
      downloadBlob(r.data, "stock-report.csv");
    } catch {
      showError("Could not export the stock report");
    }
  };

  return (
    <DashboardLayout sidebarItems={ownerSidebarItems} pageTitle="Inventory">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-5">
        <Stat icon={Package} label="Products tracked" value={`${o.tracked_products ?? 0} / ${o.total_products ?? 0}`} onClick={() => { setTab("stock"); setFilter("all"); }} active={filter === "all"} />
        <Stat icon={Wallet} label="Stock value (cost)" value={inr(o.cost_value || 0, 0)} />
        <Stat icon={AlertTriangle} label="Low stock" value={o.low_count ?? 0} tone="text-amber-600" onClick={() => { setTab("stock"); setFilter("low"); }} active={filter === "low"} />
        <Stat icon={PackageX} label="Out of stock" value={o.out_count ?? 0} tone="text-red-600" onClick={() => { setTab("stock"); setFilter("out"); }} active={filter === "out"} />
      </div>

      <div className="flex gap-2 overflow-x-auto mb-4">
        {[["stock", "Stock"], ["purchases", "Purchases"], ["suppliers", "Suppliers"], ["history", "History"]].map(([k, l]) => (
          <button key={k} type="button" onClick={() => setTab(k)}
            className={`px-4 h-9 rounded-full text-sm font-medium border whitespace-nowrap ${tab === k ? "bg-navy-800 text-white border-navy-800" : "bg-white text-navy-500 border-navy-200 hover:bg-navy-50"}`}>{l}</button>
        ))}
      </div>

      {tab === "stock" && (
        <>
          <div className="flex flex-col sm:flex-row gap-3 mb-3">
            <div className="relative flex-1">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-navy-300" />
              <input className={`${inputCls} pl-9`} placeholder="Search name, brand, SKU or barcode" value={q} onChange={(e) => setQ(e.target.value)} />
            </div>
            <Button variant="outline" onClick={exportCsv}><Download size={14} /> Export</Button>
          </div>
          <div className="flex gap-2 overflow-x-auto mb-3">
            {[["all", "All"], ["low", "Low"], ["out", "Out"], ["untracked", "Not tracked"]].map(([k, l]) => (
              <button key={k} type="button" onClick={() => setFilter(k)}
                className={`px-3 h-8 rounded-full text-xs font-medium border whitespace-nowrap ${filter === k ? "bg-navy-800 text-white border-navy-800" : "bg-white text-navy-500 border-navy-200"}`}>{l}</button>
            ))}
          </div>

          {st.loading ? (
            <p className="text-sm text-navy-400 py-10 text-center">Loading…</p>
          ) : items.length === 0 ? (
            <div className="bg-white rounded-2xl border border-navy-100/70 p-10 text-center text-sm text-navy-400">
              No products yet. Add products in Products &amp; Catalog and turn on "Track stock".
            </div>
          ) : list.length === 0 ? (
            <p className="text-sm text-navy-400 py-10 text-center">Nothing matches.</p>
          ) : (
            <div className="bg-white rounded-2xl border border-navy-100/70 shadow-card divide-y divide-navy-100/70">
              {list.map((i) => (
                <div key={i.id} className="flex items-center gap-3 px-4 py-3">
                  {i.image_url ? <img src={i.image_url} alt="" className="w-11 h-11 rounded-lg object-cover shrink-0" /> : <div className="w-11 h-11 rounded-lg bg-navy-50 shrink-0" />}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <p className="text-sm font-medium text-navy-800 truncate">{i.name}</p>
                      <Pill status={i.stock_status} />
                    </div>
                    <p className="text-xs text-navy-400 truncate">
                      {[i.brand, i.category, i.sku].filter(Boolean).join(" · ") || "—"}
                    </p>
                    {i.track_stock && i.variants.length > 0 && (
                      <p className="text-[11px] text-navy-500 mt-0.5 truncate">
                        {i.variants.map((l) => `${l}: ${Number(i.variant_stock[l] || 0)}`).join("  ·  ")}
                      </p>
                    )}
                  </div>
                  <div className="text-right shrink-0">
                    <p className="text-sm font-semibold tabular-nums text-navy-900">{i.track_stock ? i.stock_qty : "—"}</p>
                    {i.track_stock && <p className="text-[11px] text-navy-400">{inr(i.stock_value, 0)}</p>}
                  </div>
                  <button type="button" onClick={() => setAdjusting(i)} title="Adjust stock" className="h-9 w-9 grid place-items-center rounded-lg text-navy-500 hover:bg-navy-50 shrink-0">
                    <SlidersHorizontal size={16} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </>
      )}

      {tab === "purchases" && <PurchasesTab vid={vid} items={items} onChanged={refreshAll} />}
      {tab === "suppliers" && <SuppliersTab vid={vid} />}
      {tab === "history" && <HistoryTab vid={vid} />}

      {adjusting && (
        <AdjustModal vid={vid} item={adjusting} onClose={() => setAdjusting(null)} onDone={() => { setAdjusting(null); refreshAll(); }} />
      )}
    </DashboardLayout>
  );
}
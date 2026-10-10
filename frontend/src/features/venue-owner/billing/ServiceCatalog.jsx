import React, { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Plus, Search, Pencil, Trash2, Package } from "lucide-react";
import DashboardLayout from "../../../components/layout/DashboardLayout.jsx";
import Modal from "../../../components/common/Modal";
import Button from "../../../components/common/Button";
import { ownerSidebarItems } from "../ownerSidebarItems.js";
import { useVenue } from "../../../context/VenueContext.jsx";
import { useFetch } from "../../../hooks/useFetch";
import { useBusinessProfile } from "../../../hooks/useBusinessProfile";
import { billingService } from "../../../services/billingService";
import { showSuccess, showError } from "../../../components/common/Toast";
import { DEFAULT_BILLING, GST_RATES, inr } from "../../../lib/billingMath";
import { Field, Toggle, inputCls } from "./billingShared.jsx";

const blank = (cfg) => ({
  name: "",
  item_type: cfg.itemType === "product" ? "product" : "service",
  default_price: "",
  unit: cfg.defaultUnit,
  hsn_sac: "",
  tax_rate: "",
  sku: "",
  description: "",
  track_stock: false,
  stock_qty: "",
  is_active: true
});

export default function ServiceCatalog() {
  const navigate = useNavigate();
  const { venue } = useVenue();
  const { profile, terms } = useBusinessProfile();
  const cfg = useMemo(() => ({ ...DEFAULT_BILLING, ...(profile?.billing || {}) }), [profile]);
  const taxLabel = cfg.taxCodeLabel || "SAC";

  const { data, loading, refetch } = useFetch(venue ? `/venues/${venue.id}/billing/service-items` : null, { skip: !venue });
  const items = data || [];

  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [editing, setEditing] = useState(null); // item id | "new" | null
  const [form, setForm] = useState(blank(cfg));
  const [saving, setSaving] = useState(false);
  const [delItem, setDelItem] = useState(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter((i) => {
      if (typeFilter !== "all" && i.item_type !== typeFilter) return false;
      if (!q) return true;
      return i.name.toLowerCase().includes(q) || String(i.sku || "").toLowerCase().includes(q) || String(i.hsn_sac || "").includes(q);
    });
  }, [items, query, typeFilter]);

  const openNew = () => { setForm(blank(cfg)); setEditing("new"); };
  const openEdit = (i) => {
    setForm({
      name: i.name || "",
      item_type: i.item_type || "service",
      default_price: String(i.default_price ?? ""),
      unit: i.unit || cfg.defaultUnit,
      hsn_sac: i.hsn_sac || "",
      tax_rate: i.tax_rate !== null && i.tax_rate !== undefined ? String(Number(i.tax_rate)) : "",
      sku: i.sku || "",
      description: i.description || "",
      track_stock: Boolean(i.track_stock),
      stock_qty: i.stock_qty !== null && i.stock_qty !== undefined ? String(Number(i.stock_qty)) : "",
      is_active: i.is_active !== false
    });
    setEditing(i.id);
  };
  const setF = (patch) => setForm((p) => ({ ...p, ...patch }));

  const save = async () => {
    if (!form.name.trim()) return showError("Item name is required");
    if (!(Number(form.default_price) >= 0) || form.default_price === "") return showError("Enter a price (0 or more)");
    const payload = {
      name: form.name.trim(),
      item_type: form.item_type,
      default_price: Number(form.default_price),
      unit: form.unit || null,
      hsn_sac: form.hsn_sac || null,
      tax_rate: form.tax_rate === "" ? null : Number(form.tax_rate),
      sku: form.sku || null,
      description: form.description || null,
      track_stock: form.track_stock,
      stock_qty: form.track_stock && form.stock_qty !== "" ? Number(form.stock_qty) : null,
      is_active: form.is_active
    };
    setSaving(true);
    try {
      if (editing === "new") await billingService.createServiceItem(venue.id, payload);
      else await billingService.updateServiceItem(venue.id, editing, payload);
      showSuccess(editing === "new" ? "Item added" : "Item updated");
      setEditing(null);
      refetch();
    } catch (err) {
      showError(err.response?.data?.message || "Could not save the item");
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (i) => {
    try {
      await billingService.updateServiceItem(venue.id, i.id, { is_active: !i.is_active });
      refetch();
    } catch (err) {
      showError(err.response?.data?.message || "Could not update the item");
    }
  };

  const confirmDelete = async () => {
    const i = delItem;
    setDelItem(null);
    try {
      await billingService.deleteServiceItem(venue.id, i.id);
      showSuccess("Item deleted");
      refetch();
    } catch (err) {
      showError(err.response?.data?.message || "Could not delete the item");
    }
  };

  const units = Array.from(new Set([...(cfg.units || []), form.unit].filter(Boolean)));

  return (
    <DashboardLayout sidebarItems={ownerSidebarItems} pageTitle="Items & Services">
      <button
        type="button"
        onClick={() => navigate("/dashboard/billing/invoice")}
        className="inline-flex items-center gap-1.5 text-sm text-navy-500 hover:text-navy-800 mb-4"
      >
        <ArrowLeft size={16} /> Back to billing
      </button>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
        <p className="text-sm text-navy-400">Save what you sell once, add it to any bill in one tap.</p>
        <Button onClick={openNew}><Plus size={16} /> Add item</Button>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-navy-300" />
          <input className={`${inputCls} pl-9`} placeholder={`Search by name, SKU or ${taxLabel}`} value={query} onChange={(e) => setQuery(e.target.value)} />
        </div>
        <div className="flex gap-2">
          {[["all", "All"], ["service", "Services"], ["product", "Products"]].map(([v, l]) => (
            <button
              key={v}
              onClick={() => setTypeFilter(v)}
              className={`px-3 h-10 rounded-lg text-sm font-medium border ${typeFilter === v ? "bg-navy-800 text-white border-navy-800" : "bg-white text-navy-500 border-navy-200 hover:bg-navy-50"}`}
            >
              {l}
            </button>
          ))}
        </div>
      </div>

      {loading && !data ? (
        <div className="bg-white rounded-2xl border border-navy-100/70 shadow-card p-12 text-center text-sm text-navy-400">Loading…</div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-navy-100/70 shadow-card py-14 px-6 flex flex-col items-center text-center">
          <Package size={36} className="text-navy-200 mb-3" />
          <h3 className="font-medium text-navy-800">{items.length ? "No items match your search" : "No items yet"}</h3>
          <p className="text-sm text-navy-400 mt-1 mb-4 max-w-sm">
            Add your {terms.offerings.toLowerCase()} with price, unit and tax so billing takes seconds.
          </p>
          {!items.length && <Button onClick={openNew}><Plus size={16} /> Add first item</Button>}
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-navy-100/70 shadow-card divide-y divide-navy-100/60">
          {filtered.map((i) => (
            <div key={i.id} className={`flex items-center gap-3 px-4 sm:px-5 py-3.5 ${i.is_active === false ? "opacity-55" : ""}`}>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="font-medium text-navy-900 truncate">{i.name}</p>
                  <span className="shrink-0 px-1.5 py-0.5 rounded text-[10px] font-medium uppercase tracking-wide bg-navy-50 text-navy-500">{i.item_type}</span>
                </div>
                <p className="text-xs text-navy-400 mt-0.5 truncate">
                  {i.unit || "—"}
                  {i.hsn_sac ? ` · ${taxLabel} ${i.hsn_sac}` : ""}
                  {i.tax_rate !== null && i.tax_rate !== undefined ? ` · GST ${Number(i.tax_rate)}%` : ""}
                  {i.track_stock ? ` · Stock ${Number(i.stock_qty ?? 0)}` : ""}
                  {i.sku ? ` · ${i.sku}` : ""}
                </p>
              </div>
              <p className="font-semibold text-navy-900 tabular-nums shrink-0">{inr(i.default_price)}</p>
              <div className="flex items-center gap-0.5 shrink-0">
                <button onClick={() => toggleActive(i)} className="hidden sm:block px-2 h-8 rounded-lg text-xs text-navy-400 hover:bg-navy-50">
                  {i.is_active === false ? "Enable" : "Hide"}
                </button>
                <button onClick={() => openEdit(i)} className="w-8 h-8 flex items-center justify-center rounded-lg text-navy-400 hover:bg-navy-50" aria-label="Edit"><Pencil size={15} /></button>
                <button onClick={() => setDelItem(i)} className="w-8 h-8 flex items-center justify-center rounded-lg text-navy-400 hover:text-red-600 hover:bg-red-50" aria-label="Delete"><Trash2 size={15} /></button>
              </div>
            </div>
          ))}
        </div>
      )}

      <Modal isOpen={Boolean(editing)} onClose={() => setEditing(null)} title={editing === "new" ? "Add item" : "Edit item"} size="md">
        <div className="space-y-4">
          <div className="grid grid-cols-2 gap-2 p-1 rounded-xl bg-navy-50">
            {[["service", "Service"], ["product", "Product"]].map(([v, l]) => (
              <button
                key={v}
                type="button"
                onClick={() => setF({ item_type: v })}
                className={`h-9 rounded-lg text-sm font-medium ${form.item_type === v ? "bg-white text-navy-900 shadow-sm" : "text-navy-400"}`}
              >
                {l}
              </button>
            ))}
          </div>

          <Field label="Name">
            <input className={inputCls} value={form.name} maxLength={150} onChange={(e) => setF({ name: e.target.value })} autoFocus />
          </Field>

          <div className="grid grid-cols-2 gap-3">
            <Field label="Price (₹)">
              <input className={inputCls} type="number" min="0" inputMode="decimal" value={form.default_price} onChange={(e) => setF({ default_price: e.target.value })} />
            </Field>
            <Field label="Unit">
              <select className={inputCls} value={form.unit} onChange={(e) => setF({ unit: e.target.value })}>
                {units.map((u) => <option key={u} value={u}>{u}</option>)}
              </select>
            </Field>
            <Field label={`${taxLabel} code`}>
              <input className={inputCls} maxLength={10} value={form.hsn_sac} onChange={(e) => setF({ hsn_sac: e.target.value })} />
            </Field>
            <Field label="GST rate" hint="Blank = business default">
              <select className={inputCls} value={form.tax_rate} onChange={(e) => setF({ tax_rate: e.target.value })}>
                <option value="">Default ({cfg.defaultGstRate}%)</option>
                {GST_RATES.map((r) => <option key={r} value={String(r)}>{r}%</option>)}
              </select>
            </Field>
          </div>

          <Field label="SKU / code (optional)">
            <input className={inputCls} maxLength={50} value={form.sku} onChange={(e) => setF({ sku: e.target.value })} />
          </Field>
          <Field label="Description (optional)">
            <input className={inputCls} value={form.description} onChange={(e) => setF({ description: e.target.value })} />
          </Field>

          {form.item_type === "product" && (
            <div className="rounded-xl border border-navy-100/70 px-4 py-1">
              <Toggle label="Track stock" checked={form.track_stock} onChange={(v) => setF({ track_stock: v })} hint="Stock is recorded here; automatic deduction on billing comes next" />
              {form.track_stock && (
                <div className="pb-3">
                  <Field label="Quantity in stock">
                    <input className={inputCls} type="number" min="0" value={form.stock_qty} onChange={(e) => setF({ stock_qty: e.target.value })} />
                  </Field>
                </div>
              )}
            </div>
          )}

          <Button onClick={save} loading={saving} className="w-full">{editing === "new" ? "Add item" : "Save changes"}</Button>
        </div>
      </Modal>

      <Modal isOpen={Boolean(delItem)} onClose={() => setDelItem(null)} title="Delete this item?" size="sm">
        <p className="text-sm text-navy-500 mb-5">
          {delItem?.name} will be removed from your catalog. Existing bills are not affected.
        </p>
        <div className="flex gap-3">
          <Button variant="outline" onClick={() => setDelItem(null)} className="flex-1">Cancel</Button>
          <Button variant="danger" onClick={confirmDelete} className="flex-1">Delete</Button>
        </div>
      </Modal>
    </DashboardLayout>
  );
}
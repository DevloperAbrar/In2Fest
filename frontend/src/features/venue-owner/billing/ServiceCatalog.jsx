import React, { useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ArrowLeft, Plus, Search, Pencil, Trash2, Package, Camera, ImagePlus, X, Globe } from "lucide-react";
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

// One-tap suggestions so a shopkeeper never has to type these.
const SIZE_PRESETS = {
  "clothing-store": ["S", "M", "L", "XL", "XXL"],
  "footwear-store": ["6", "7", "8", "9", "10"],
  "fashion-designing": ["S", "M", "L", "XL"]
};
const CATEGORY_PRESETS = {
  "clothing-store": ["Men", "Women", "Kids", "Ethnic wear"],
  "footwear-store": ["Men", "Women", "Kids", "Sports"],
  "fashion-designing": ["Women", "Men", "Kids"]
};

const blank = (cfg, keep = {}) => ({
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
  is_active: true,
  image_url: "",
  category: "",
  variants: [],
  show_on_website: cfg.itemType === "product",
  ...keep
});

// Shrinks a phone photo (often 4-8 MB) to ~200 KB before upload.
function compressImage(file, maxSide = 1200, quality = 0.82) {
  return new Promise((resolve) => {
    if (!file.type || !file.type.startsWith("image/")) return resolve(file);
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      try {
        const scale = Math.min(1, maxSide / Math.max(img.width, img.height));
        const canvas = document.createElement("canvas");
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        canvas.getContext("2d").drawImage(img, 0, 0, canvas.width, canvas.height);
        canvas.toBlob(
          (blob) => {
            URL.revokeObjectURL(url);
            resolve(blob ? new File([blob], "photo.jpg", { type: "image/jpeg" }) : file);
          },
          "image/jpeg",
          quality
        );
      } catch {
        URL.revokeObjectURL(url);
        resolve(file);
      }
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      resolve(file);
    };
    img.src = url;
  });
}

export default function ServiceCatalog() {
  const navigate = useNavigate();
  const { venue } = useVenue();
  const { profile, terms } = useBusinessProfile();
  const cfg = useMemo(() => ({ ...DEFAULT_BILLING, ...(profile?.billing || {}) }), [profile]);
  const taxLabel = cfg.taxCodeLabel || "SAC";
  const slug = venue?.business_category || "";

  const { data, loading, refetch } = useFetch(venue ? `/venues/${venue.id}/billing/service-items` : null, { skip: !venue });
  const items = data || [];

  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [editing, setEditing] = useState(null); // item id | "new" | null
  const [form, setForm] = useState(blank(cfg));
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [customSize, setCustomSize] = useState("");
  const [delItem, setDelItem] = useState(null);
  const cameraRef = useRef(null);
  const galleryRef = useRef(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter((i) => {
      if (typeFilter !== "all" && i.item_type !== typeFilter) return false;
      if (!q) return true;
      return (
        i.name.toLowerCase().includes(q) ||
        String(i.sku || "").toLowerCase().includes(q) ||
        String(i.hsn_sac || "").includes(q) ||
        String(i.category || "").toLowerCase().includes(q)
      );
    });
  }, [items, query, typeFilter]);

  const categoryOptions = useMemo(
    () => Array.from(new Set([...(CATEGORY_PRESETS[slug] || []), ...items.map((i) => i.category).filter(Boolean)])),
    [items, slug]
  );
  const sizeOptions = useMemo(
    () => Array.from(new Set([...(SIZE_PRESETS[slug] || []), ...form.variants])),
    [slug, form.variants]
  );

  const setF = (patch) => setForm((p) => ({ ...p, ...patch }));
  const openNew = () => { setForm(blank(cfg)); setCustomSize(""); setEditing("new"); };
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
      is_active: i.is_active !== false,
      image_url: i.image_url || "",
      category: i.category || "",
      variants: Array.isArray(i.variants) ? i.variants.map((v) => v.label).filter(Boolean) : [],
      show_on_website: Boolean(i.show_on_website)
    });
    setCustomSize("");
    setEditing(i.id);
  };

  const toggleSize = (label) =>
    setF({ variants: form.variants.includes(label) ? form.variants.filter((v) => v !== label) : [...form.variants, label] });

  const addCustomSize = () => {
    const label = customSize.trim().slice(0, 20);
    if (!label) return;
    if (!form.variants.some((v) => v.toLowerCase() === label.toLowerCase())) setF({ variants: [...form.variants, label] });
    setCustomSize("");
  };

  const onPickPhoto = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = ""; // allow picking the same photo again
    if (!file) return;
    setUploading(true);
    try {
      const small = await compressImage(file);
      const fd = new FormData();
      fd.append("itemImage", small);
      const res = await billingService.uploadItemImage(venue.id, fd);
      setF({ image_url: res.data.data.url });
    } catch (err) {
      showError(err.response?.data?.message || "Photo upload failed. Please try again.");
    } finally {
      setUploading(false);
    }
  };

  const save = async (addNext = false) => {
    if (!form.name.trim()) return showError("Item name is required");
    if (!(Number(form.default_price) >= 0) || form.default_price === "") return showError("Enter a price (0 or more)");
    const isProduct = form.item_type === "product";
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
      is_active: form.is_active,
      image_url: form.image_url || null,
      category: form.category.trim() || null,
      variants: isProduct ? form.variants : [],
      show_on_website: isProduct && form.show_on_website
    };
    setSaving(true);
    try {
      if (editing === "new") await billingService.createServiceItem(venue.id, payload);
      else await billingService.updateServiceItem(venue.id, editing, payload);
      refetch();
      if (editing === "new" && addNext) {
        // Keep what is usually the same for the next product: category, sizes, tax, website setting
        setForm(blank(cfg, {
          item_type: form.item_type,
          unit: form.unit,
          hsn_sac: form.hsn_sac,
          tax_rate: form.tax_rate,
          category: form.category,
          variants: form.variants,
          show_on_website: form.show_on_website
        }));
        showSuccess("Added. Next item");
      } else {
        showSuccess(editing === "new" ? "Item added" : "Item updated");
        setEditing(null);
      }
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
  const isProduct = form.item_type === "product";

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
        <p className="text-sm text-navy-400">Save what you sell once. It shows on your website and in billing.</p>
        <Button onClick={openNew}><Plus size={16} /> Add item</Button>
      </div>

      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-navy-300" />
          <input className={`${inputCls} pl-9`} placeholder={`Search by name, category, SKU or ${taxLabel}`} value={query} onChange={(e) => setQuery(e.target.value)} />
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
            Add your {terms.offerings.toLowerCase()} with a photo and price. It takes about 20 seconds each.
          </p>
          {!items.length && <Button onClick={openNew}><Plus size={16} /> Add first item</Button>}
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-navy-100/70 shadow-card divide-y divide-navy-100/60">
          {filtered.map((i) => (
            <div key={i.id} className={`flex items-center gap-3 px-4 sm:px-5 py-3.5 ${i.is_active === false ? "opacity-55" : ""}`}>
              {i.image_url ? (
                <img src={i.image_url} alt="" className="w-11 h-11 rounded-lg object-cover shrink-0 bg-navy-50" />
              ) : (
                <div className="w-11 h-11 rounded-lg bg-navy-50 flex items-center justify-center shrink-0 text-navy-200"><Package size={18} /></div>
              )}
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <p className="font-medium text-navy-900 truncate">{i.name}</p>
                  <span className="shrink-0 px-1.5 py-0.5 rounded text-[10px] font-medium uppercase tracking-wide bg-navy-50 text-navy-500">{i.item_type}</span>
                  {i.show_on_website && (
                    <span className="shrink-0 inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium bg-emerald-50 text-emerald-600"><Globe size={10} /> Website</span>
                  )}
                </div>
                <p className="text-xs text-navy-400 mt-0.5 truncate">
                  {i.category ? `${i.category} · ` : ""}
                  {i.unit || "—"}
                  {Array.isArray(i.variants) && i.variants.length ? ` · ${i.variants.map((v) => v.label).join(", ")}` : ""}
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
                onClick={() => setF({ item_type: v, show_on_website: v === "product" ? form.show_on_website : false })}
                className={`h-9 rounded-lg text-sm font-medium ${form.item_type === v ? "bg-white text-navy-900 shadow-sm" : "text-navy-400"}`}
              >
                {l}
              </button>
            ))}
          </div>

          {isProduct && (
            <div>
              <input ref={cameraRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={onPickPhoto} />
              <input ref={galleryRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={onPickPhoto} />
              {form.image_url ? (
                <div className="relative w-32 h-32">
                  <img src={form.image_url} alt="Product" className="w-32 h-32 rounded-xl object-cover border border-navy-100" />
                  <button
                    type="button"
                    onClick={() => setF({ image_url: "" })}
                    className="absolute -top-2 -right-2 w-6 h-6 rounded-full bg-white border border-navy-200 shadow flex items-center justify-center text-navy-500"
                    aria-label="Remove photo"
                  >
                    <X size={13} />
                  </button>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    disabled={uploading}
                    onClick={() => cameraRef.current?.click()}
                    className="h-24 rounded-xl border-2 border-dashed border-navy-200 text-navy-500 flex flex-col items-center justify-center gap-1 text-sm hover:bg-navy-50 disabled:opacity-60"
                  >
                    <Camera size={22} /> {uploading ? "Uploading…" : "Take photo"}
                  </button>
                  <button
                    type="button"
                    disabled={uploading}
                    onClick={() => galleryRef.current?.click()}
                    className="h-24 rounded-xl border-2 border-dashed border-navy-200 text-navy-500 flex flex-col items-center justify-center gap-1 text-sm hover:bg-navy-50 disabled:opacity-60"
                  >
                    <ImagePlus size={22} /> From gallery
                  </button>
                </div>
              )}
            </div>
          )}

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
          </div>

          {isProduct && (
            <>
              <Field label="Category">
                {categoryOptions.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-2">
                    {categoryOptions.map((c) => (
                      <button
                        key={c}
                        type="button"
                        onClick={() => setF({ category: form.category === c ? "" : c })}
                        className={`px-3 h-8 rounded-full text-xs font-medium border ${form.category === c ? "bg-navy-800 text-white border-navy-800" : "bg-white text-navy-500 border-navy-200"}`}
                      >
                        {c}
                      </button>
                    ))}
                  </div>
                )}
                <input className={inputCls} maxLength={80} placeholder="Or type a new category" value={form.category} onChange={(e) => setF({ category: e.target.value })} />
              </Field>

              <Field label="Sizes (tap to select)">
                <div className="flex flex-wrap gap-2 mb-2">
                  {sizeOptions.map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => toggleSize(s)}
                      className={`min-w-[2.5rem] px-3 h-8 rounded-lg text-xs font-medium border ${form.variants.includes(s) ? "bg-navy-800 text-white border-navy-800" : "bg-white text-navy-500 border-navy-200"}`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input
                    className={inputCls}
                    maxLength={20}
                    placeholder="Other size or colour"
                    value={customSize}
                    onChange={(e) => setCustomSize(e.target.value)}
                    onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addCustomSize(); } }}
                  />
                  <button type="button" onClick={addCustomSize} className="px-4 h-10 rounded-lg border border-navy-200 text-sm text-navy-600 hover:bg-navy-50">Add</button>
                </div>
              </Field>

              <div className="rounded-xl border border-navy-100/70 px-4 py-1">
                <Toggle label="Show on my website" checked={form.show_on_website} onChange={(v) => setF({ show_on_website: v })} hint="Customers can see it and ask about it on WhatsApp" />
              </div>
            </>
          )}

          <details className="rounded-xl border border-navy-100/70 px-4 py-3">
            <summary className="text-sm font-medium text-navy-600 cursor-pointer">More details (GST, SKU, stock)</summary>
            <div className="space-y-4 mt-4">
              <div className="grid grid-cols-2 gap-3">
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
              {isProduct && (
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
            </div>
          </details>

          {editing === "new" ? (
            <div className="grid grid-cols-2 gap-3">
              <Button variant="outline" onClick={() => save(true)} loading={saving} disabled={uploading}>Save & add next</Button>
              <Button onClick={() => save(false)} loading={saving} disabled={uploading}>Save</Button>
            </div>
          ) : (
            <Button onClick={() => save(false)} loading={saving} disabled={uploading} className="w-full">Save changes</Button>
          )}
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
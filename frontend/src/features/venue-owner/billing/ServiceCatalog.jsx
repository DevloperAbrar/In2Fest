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
import { venueService } from "../../../services/venueService";
import { showSuccess, showError } from "../../../components/common/Toast";
import { DEFAULT_BILLING, GST_RATES, inr } from "../../../lib/billingMath";
import { Field, Toggle, inputCls } from "./billingShared.jsx";

// One-tap suggestions so a shopkeeper never has to type these.
const SIZE_PRESETS = {
  "clothing-store": ["S", "M", "L", "XL", "XXL"],
  "footwear-store": ["6", "7", "8", "9", "10"],
  "fashion-designing": ["S", "M", "L", "XL"]
};

// Suggested category tree per shop type: Category -> sub-categories.
const PRESET_TREES = {
  "clothing-store": {
    Men: ["Shirts", "T-Shirts", "Jeans", "Trousers", "Ethnic wear"],
    Women: ["Kurtis", "Sarees", "Suits", "Tops", "Jeans", "Lehenga"],
    Kids: ["Boys", "Girls", "Infants"]
  },
  "footwear-store": {
    Men: ["Formal", "Casual", "Sports", "Sandals"],
    Women: ["Heels", "Flats", "Sandals", "Sports"],
    Kids: ["School shoes", "Sandals", "Sports"]
  },
  "fashion-designing": {
    Women: ["Blouse", "Suit", "Lehenga", "Gown"],
    Men: ["Kurta", "Sherwani", "Suit"],
    Kids: ["Ethnic wear"]
  }
};

const NONE = "__none__"; // tab for products without a category

// A category is stored as text: "Men" or "Men > Shirts".
const parseCat = (value) => {
  const [top = "", sub = ""] = String(value || "").split(">").map((p) => p.trim());
  return { top, sub };
};
const joinCat = (top, sub) => (sub ? `${top} > ${sub}` : top);
const sameText = (a, b) => String(a || "").toLowerCase() === String(b || "").toLowerCase();
const flattenTree = (tree) =>
  Object.entries(tree).flatMap(([top, subs]) => [top, ...subs.map((s) => joinCat(top, s))]);

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
  mrp: "",
  offer_label: "",
  offer_ends_at: "",
  brand: "",
  barcode: "",
  cost_price: "",
  low_stock_threshold: "",
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

function Chip({ active, onClick, small, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`${small ? "px-3 h-8 text-xs" : "px-4 h-9 text-sm"} rounded-full font-medium border whitespace-nowrap ${active ? "bg-navy-800 text-white border-navy-800" : "bg-white text-navy-500 border-navy-200 hover:bg-navy-50"
        }`}
    >
      {children}
    </button>
  );
}

export default function ServiceCatalog() {
  const navigate = useNavigate();
  const { venue, refetchVenue } = useVenue();
  const { profile, terms, loading: profileLoading } = useBusinessProfile();
  const isShop = profile?.key === "retail";
  const cfg = useMemo(() => ({ ...DEFAULT_BILLING, ...(profile?.billing || {}) }), [profile]);
  const taxLabel = cfg.taxCodeLabel || "SAC";
  const slug = venue?.business_category || "";
  const preset = PRESET_TREES[slug] || null;

  const { data, loading, refetch } = useFetch(venue ? `/venues/${venue.id}/billing/service-items` : null, { skip: !venue });
  const items = data || [];

  // Categories the vendor created are saved inside the website's product_catalog section.
  const catalogSection = (venue?.page_sections || []).find((s) => s.type === "product_catalog");
  const savedCats = useMemo(
    () => (Array.isArray(catalogSection?.config?.categories) ? catalogSection.config.categories : []),
    [catalogSection]
  );

  const [query, setQuery] = useState("");
  const [typeFilter, setTypeFilter] = useState("all");
  const [activeTop, setActiveTop] = useState("all");
  const [activeSub, setActiveSub] = useState("all");
  const [localCats, setLocalCats] = useState([]); // used only if the site has no product_catalog section
  const [skipSetup, setSkipSetup] = useState(false);
  const [catModal, setCatModal] = useState(false);
  const [newTop, setNewTop] = useState("");
  const [newSub, setNewSub] = useState("");
  const [catSaving, setCatSaving] = useState(false);
  const [editing, setEditing] = useState(null); // item id | "new" | null
  const [form, setForm] = useState(blank(cfg));
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [customSize, setCustomSize] = useState("");
  const [delItem, setDelItem] = useState(null);
  const cameraRef = useRef(null);
  const galleryRef = useRef(null);

  // Category tree = saved categories + categories already used by products
  const tree = useMemo(() => {
    const map = new Map();
    const add = (value) => {
      const { top, sub } = parseCat(value);
      if (!top) return;
      const key = Array.from(map.keys()).find((k) => sameText(k, top)) || top;
      if (!map.has(key)) map.set(key, new Set());
      if (sub) map.get(key).add(sub);
    };
    [...savedCats, ...localCats, ...items.map((i) => i.category)].forEach(add);
    return Array.from(map.entries()).map(([top, subs]) => ({ top, subs: Array.from(subs) }));
  }, [savedCats, localCats, items]);

  const countOf = (top, sub) =>
    items.filter((i) => {
      const c = parseCat(i.category);
      return sameText(c.top, top) && (!sub || sameText(c.sub, sub));
    }).length;
  const uncategorised = items.filter((i) => !parseCat(i.category).top).length;
  const activeNode = tree.find((t) => sameText(t.top, activeTop));
  const showSetup = isShop && tree.length === 0 && items.length === 0 && !skipSetup;

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return items.filter((i) => {
      if (!isShop && typeFilter !== "all" && i.item_type !== typeFilter) return false;
      if (isShop) {
        const c = parseCat(i.category);
        if (activeTop === NONE && c.top) return false;
        if (activeTop !== "all" && activeTop !== NONE) {
          if (!sameText(c.top, activeTop)) return false;
          if (activeSub !== "all" && !sameText(c.sub, activeSub)) return false;
        }
      }
      if (!q) return true;
      return (
        i.name.toLowerCase().includes(q) ||
        String(i.sku || "").toLowerCase().includes(q) ||
        String(i.hsn_sac || "").includes(q) ||
        String(i.category || "").toLowerCase().includes(q)
      );
    });
  }, [items, query, typeFilter, isShop, activeTop, activeSub]);

  const sizeOptions = useMemo(
    () => Array.from(new Set([...(SIZE_PRESETS[slug] || []), ...form.variants])),
    [slug, form.variants]
  );

  const formCat = parseCat(form.category);
  const formSubs = tree.find((t) => sameText(t.top, formCat.top))?.subs || [];

  // ---------- categories ----------
  const saveCategories = async (list) => {
    setCatSaving(true);
    try {
      if (catalogSection) {
        const next = (venue.page_sections || []).map((s) =>
          s.type === "product_catalog" ? { ...s, config: { ...(s.config || {}), categories: list } } : s
        );
        await venueService.update(venue.id, { page_sections: next });
        await refetchVenue();
      } else {
        setLocalCats(list);
      }
      return true;
    } catch (err) {
      showError(err.response?.data?.message || "Could not save categories");
      return false;
    } finally {
      setCatSaving(false);
    }
  };

  const baseCats = catalogSection ? savedCats : localCats;

  const usePreset = async () => {
    if (!preset) return;
    if (await saveCategories(flattenTree(preset))) showSuccess("Categories ready. Now add your first product");
  };

  const openCatModal = (top = "") => {
    setNewTop(top);
    setNewSub("");
    setCatModal(true);
  };

  const addCategory = async () => {
    const top = newTop.trim().slice(0, 40);
    const sub = newSub.trim().slice(0, 40);
    if (!top) return showError("Enter a category name");
    const list = [...baseCats];
    const has = (v) => list.some((x) => sameText(x, v));
    if (!has(top)) list.push(top);
    if (sub && !has(joinCat(top, sub))) list.push(joinCat(top, sub));
    if (!(await saveCategories(list))) return;
    setActiveTop(top);
    setActiveSub(sub || "all");
    setCatModal(false);
    setNewTop("");
    setNewSub("");
  };

  const removeCategory = async (top, sub) => {
    const list = baseCats.filter((c) => {
      const p = parseCat(c);
      if (!sameText(p.top, top)) return true;
      return sub ? !sameText(p.sub, sub) : false;
    });
    if (await saveCategories(list)) {
      if (sub) setActiveSub("all");
      else { setActiveTop("all"); setActiveSub("all"); }
    }
  };

  // ---------- product form ----------
  const setF = (patch) => setForm((p) => ({ ...p, ...patch }));

  const openNew = () => {
    const category =
      activeTop === "all" || activeTop === NONE ? "" : joinCat(activeTop, activeSub === "all" ? "" : activeSub);
    setForm(blank(cfg, { category: isShop ? category : "" }));
    setCustomSize("");
    setEditing("new");
  };

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
      show_on_website: Boolean(i.show_on_website),
      mrp: i.mrp !== null && i.mrp !== undefined ? String(Number(i.mrp)) : "",
      offer_label: i.offer_label || "",
      offer_ends_at: i.offer_ends_at || "",
      brand: i.brand || "",
      barcode: i.barcode || "",
      cost_price: i.cost_price !== null && i.cost_price !== undefined ? String(Number(i.cost_price)) : "",
      low_stock_threshold: i.low_stock_threshold !== null && i.low_stock_threshold !== undefined ? String(Number(i.low_stock_threshold)) : ""
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

  const pickTop = (top) => setF({ category: sameText(formCat.top, top) && !formCat.sub ? "" : top });
  const pickSub = (sub) =>
    setF({ category: sameText(formCat.sub, sub) ? formCat.top : joinCat(formCat.top, sub) });

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

  const itemType = isShop ? "product" : form.item_type;
  const isProduct = itemType === "product";

  const save = async (addNext = false) => {
    if (!form.name.trim()) return showError("Item name is required");
    if (!(Number(form.default_price) >= 0) || form.default_price === "") return showError("Enter a price (0 or more)");
    const payload = {
      name: form.name.trim(),
      item_type: itemType,
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
      show_on_website: isProduct && form.show_on_website,
      mrp: form.mrp === "" ? null : Number(form.mrp),
      offer_label: form.offer_label.trim() || null,
      offer_ends_at: form.offer_ends_at || null,
      brand: form.brand.trim() || null,
      barcode: form.barcode.trim() || null,
      cost_price: form.cost_price === "" ? null : Number(form.cost_price),
      low_stock_threshold: form.low_stock_threshold === "" ? null : Number(form.low_stock_threshold)
    };
    setSaving(true);
    try {
      if (editing === "new") await billingService.createServiceItem(venue.id, payload);
      else await billingService.updateServiceItem(venue.id, editing, payload);
      refetch();
      if (refetchVenue) refetchVenue(); // keeps the dashboard checklist in sync
      if (editing === "new" && addNext) {
        // Keep what is usually the same for the next product
        setForm(blank(cfg, {
          item_type: itemType,
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
      if (refetchVenue) refetchVenue();
    } catch (err) {
      showError(err.response?.data?.message || "Could not delete the item");
    }
  };

  const units = Array.from(new Set([...(cfg.units || []), form.unit].filter(Boolean)));
  const sizeLabel = SIZE_PRESETS[slug] ? "Sizes (tap to select)" : "Options like size or colour (optional)";

  if (profileLoading) {
    return (
      <DashboardLayout sidebarItems={ownerSidebarItems} pageTitle="Products & Catalog">
        <div className="bg-white rounded-2xl border border-navy-100/70 shadow-card p-12 text-center text-sm text-navy-400">Loading…</div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout sidebarItems={ownerSidebarItems} pageTitle={isShop ? "Products & Catalog" : "Items & Services"}>
      <button
        type="button"
        onClick={() => navigate(isShop ? "/dashboard" : "/dashboard/billing/invoice")}
        className="inline-flex items-center gap-1.5 text-sm text-navy-500 hover:text-navy-800 mb-4"
      >
        <ArrowLeft size={16} /> {isShop ? "Back to dashboard" : "Back to billing"}
      </button>

      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5">
        <p className="text-sm text-navy-400">Save what you sell once. It shows on your website and in billing.</p>
        {!showSetup && <Button onClick={openNew}><Plus size={16} /> {isShop ? "Add product" : "Add item"}</Button>}
      </div>

      {/* Step 1 for shops: categories first */}
      {showSetup && (
        <div className="bg-white rounded-2xl border border-navy-100/70 shadow-card p-5 sm:p-6 mb-5">
          <p className="text-xs font-semibold uppercase tracking-wide text-primary-600">Step 1 of 2</p>
          <h3 className="font-semibold text-navy-900 mt-1">Set up your categories first</h3>
          <p className="text-sm text-navy-400 mt-1 max-w-xl">
            Customers find products by category, for example Men → Shirts. You can add or remove categories anytime.
          </p>
          {preset && (
            <div className="mt-4 rounded-xl bg-navy-50 p-3 text-sm text-navy-600">
              {Object.entries(preset).map(([top, subs]) => (
                <p key={top} className="py-0.5">
                  <span className="font-medium text-navy-800">{top}</span>
                  <span className="text-navy-400"> · {subs.join(", ")}</span>
                </p>
              ))}
            </div>
          )}
          <div className="flex flex-col sm:flex-row gap-2 mt-4">
            {preset && <Button onClick={usePreset} loading={catSaving}>Use these categories</Button>}
            <Button variant="outline" onClick={() => openCatModal("")}>Add my own</Button>
            <button type="button" onClick={() => setSkipSetup(true)} className="px-3 h-10 text-sm text-navy-400 hover:text-navy-700">
              Skip for now
            </button>
          </div>
        </div>
      )}

      {/* Category tabs (shops) */}
      {isShop && !showSetup && (
        <div className="mb-4 space-y-2">
          <div className="flex flex-wrap gap-2 items-center">
            <Chip active={activeTop === "all"} onClick={() => { setActiveTop("all"); setActiveSub("all"); }}>
              All ({items.length})
            </Chip>
            {tree.map((t) => (
              <Chip key={t.top} active={sameText(activeTop, t.top)} onClick={() => { setActiveTop(t.top); setActiveSub("all"); }}>
                {t.top} ({countOf(t.top)})
              </Chip>
            ))}
            {uncategorised > 0 && tree.length > 0 && (
              <Chip active={activeTop === NONE} onClick={() => { setActiveTop(NONE); setActiveSub("all"); }}>
                Others ({uncategorised})
              </Chip>
            )}
            <button
              type="button"
              onClick={() => openCatModal("")}
              className="inline-flex items-center gap-1 px-3 h-9 rounded-full border border-dashed border-navy-300 text-sm text-navy-500 hover:bg-navy-50"
            >
              <Plus size={14} /> Category
            </button>
          </div>

          {activeNode && (
            <div className="flex flex-wrap gap-2 items-center">
              <Chip small active={activeSub === "all"} onClick={() => setActiveSub("all")}>All {activeNode.top}</Chip>
              {activeNode.subs.map((s) => (
                <Chip key={s} small active={sameText(activeSub, s)} onClick={() => setActiveSub(s)}>
                  {s} ({countOf(activeNode.top, s)})
                </Chip>
              ))}
              <button
                type="button"
                onClick={() => openCatModal(activeNode.top)}
                className="inline-flex items-center gap-1 px-3 h-8 rounded-full border border-dashed border-navy-300 text-xs text-navy-500 hover:bg-navy-50"
              >
                <Plus size={12} /> Sub-category
              </button>
              {activeSub === "all" && countOf(activeNode.top) === 0 && (
                <button type="button" onClick={() => removeCategory(activeNode.top)} className="text-xs text-red-500 hover:underline px-2">
                  Remove {activeNode.top}
                </button>
              )}
              {activeSub !== "all" && countOf(activeNode.top, activeSub) === 0 && (
                <button type="button" onClick={() => removeCategory(activeNode.top, activeSub)} className="text-xs text-red-500 hover:underline px-2">
                  Remove {activeSub}
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {!showSetup && (
        <div className="flex flex-col sm:flex-row gap-3 mb-4">
          <div className="relative flex-1">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-navy-300" />
            <input className={`${inputCls} pl-9`} placeholder={`Search by name, category, SKU or ${taxLabel}`} value={query} onChange={(e) => setQuery(e.target.value)} />
          </div>
          {!isShop && (
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
          )}
        </div>
      )}

      {showSetup ? null : loading && !data ? (
        <div className="bg-white rounded-2xl border border-navy-100/70 shadow-card p-12 text-center text-sm text-navy-400">Loading…</div>
      ) : filtered.length === 0 ? (
        <div className="bg-white rounded-2xl border border-navy-100/70 shadow-card py-14 px-6 flex flex-col items-center text-center">
          <Package size={36} className="text-navy-200 mb-3" />
          <h3 className="font-medium text-navy-800">{items.length ? "No items here yet" : "No items yet"}</h3>
          <p className="text-sm text-navy-400 mt-1 mb-4 max-w-sm">
            {isShop
              ? "Step 2: add a product with a photo and price. It takes about 20 seconds each."
              : `Add your ${terms.offerings.toLowerCase()} with a photo and price. It takes about 20 seconds each.`}
          </p>
          <Button onClick={openNew}><Plus size={16} /> {isShop ? "Add product" : "Add first item"}</Button>
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
                  {!isShop && (
                    <span className="shrink-0 px-1.5 py-0.5 rounded text-[10px] font-medium uppercase tracking-wide bg-navy-50 text-navy-500">{i.item_type}</span>
                  )}
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
                  {i.track_stock
                    ? ` · ${Number(i.stock_qty ?? 0) <= 0 ? "Out of stock" : Number(i.stock_qty) <= Number(i.low_stock_threshold ?? 5) ? `Low: ${Number(i.stock_qty)} left` : `Stock ${Number(i.stock_qty)}`}`
                    : ""}
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

      {/* Add category */}
      <Modal isOpen={catModal} onClose={() => setCatModal(false)} title="Add category" size="sm">
        <div className="space-y-4">
          <Field label="Category (e.g. Men)">
            <input
              className={inputCls}
              list="catalog-tops"
              maxLength={40}
              value={newTop}
              onChange={(e) => setNewTop(e.target.value)}
              autoFocus
            />
            <datalist id="catalog-tops">
              {tree.map((t) => <option key={t.top} value={t.top} />)}
            </datalist>
          </Field>
          {preset && (
            <div className="flex flex-wrap gap-2">
              {Object.keys(preset).filter((t) => !tree.some((x) => sameText(x.top, t))).map((t) => (
                <Chip key={t} small active={sameText(newTop, t)} onClick={() => setNewTop(t)}>{t}</Chip>
              ))}
            </div>
          )}
          <Field label="Sub-category (optional, e.g. Shirts)">
            <input className={inputCls} maxLength={40} value={newSub} onChange={(e) => setNewSub(e.target.value)} />
          </Field>
          {preset && preset[newTop] && (
            <div className="flex flex-wrap gap-2">
              {preset[newTop]
                .filter((s) => !tree.find((t) => sameText(t.top, newTop))?.subs.some((x) => sameText(x, s)))
                .map((s) => (
                  <Chip key={s} small active={sameText(newSub, s)} onClick={() => setNewSub(s)}>{s}</Chip>
                ))}
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <Button variant="outline" onClick={() => setCatModal(false)}>Cancel</Button>
            <Button onClick={addCategory} loading={catSaving}>Add</Button>
          </div>
        </div>
      </Modal>

      {/* Add / edit product */}
      <Modal isOpen={Boolean(editing)} onClose={() => setEditing(null)} title={editing === "new" ? (isShop ? "Add product" : "Add item") : "Edit item"} size="md">
        <div className="space-y-4">
          {!isShop && (
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
          )}

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

          <div className={isShop ? "" : "grid grid-cols-2 gap-3"}>
            <Field label="Price (₹)">
              <input className={inputCls} type="number" min="0" inputMode="decimal" value={form.default_price} onChange={(e) => setF({ default_price: e.target.value })} />
            </Field>
            {!isShop && (
              <Field label="Unit">
                <select className={inputCls} value={form.unit} onChange={(e) => setF({ unit: e.target.value })}>
                  {units.map((u) => <option key={u} value={u}>{u}</option>)}
                </select>
              </Field>
            )}
          </div>

          {isProduct && (
            <>
              <Field label="Category">
                {tree.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-2">
                    {tree.map((t) => (
                      <Chip key={t.top} small active={sameText(formCat.top, t.top)} onClick={() => pickTop(t.top)}>{t.top}</Chip>
                    ))}
                  </div>
                )}
                {formSubs.length > 0 && (
                  <div className="flex flex-wrap gap-2 mb-2 pl-2 border-l-2 border-navy-100">
                    {formSubs.map((s) => (
                      <Chip key={s} small active={sameText(formCat.sub, s)} onClick={() => pickSub(s)}>{s}</Chip>
                    ))}
                  </div>
                )}
                <input
                  className={inputCls}
                  maxLength={80}
                  placeholder="Not listed? Type it, e.g. Men > Jackets"
                  value={form.category}
                  onChange={(e) => setF({ category: e.target.value })}
                />
              </Field>

              <Field label={sizeLabel}>
                {sizeOptions.length > 0 && (
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
                )}
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
              {isShop && (
                <Field label="Unit">
                  <select className={inputCls} value={form.unit} onChange={(e) => setF({ unit: e.target.value })}>
                    {units.map((u) => <option key={u} value={u}>{u}</option>)}
                  </select>
                </Field>
              )}
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
              {isProduct && (
                <>
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="MRP (₹)" hint="Shows a % OFF badge on your website">
                      <input className={inputCls} type="number" min="0" value={form.mrp} onChange={(e) => setF({ mrp: e.target.value })} />
                    </Field>
                    <Field label="Cost price (₹)" hint="What you paid">
                      <input className={inputCls} type="number" min="0" value={form.cost_price} onChange={(e) => setF({ cost_price: e.target.value })} />
                    </Field>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="Offer tag (optional)">
                      <input className={inputCls} maxLength={60} placeholder="Diwali Sale" value={form.offer_label} onChange={(e) => setF({ offer_label: e.target.value })} />
                    </Field>
                    <Field label="Offer ends on">
                      <input className={inputCls} type="date" value={form.offer_ends_at} onChange={(e) => setF({ offer_ends_at: e.target.value })} />
                    </Field>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <Field label="Brand">
                      <input className={inputCls} maxLength={80} value={form.brand} onChange={(e) => setF({ brand: e.target.value })} />
                    </Field>
                    <Field label="Barcode" hint="Scan it at billing">
                      <input className={inputCls} maxLength={50} value={form.barcode} onChange={(e) => setF({ barcode: e.target.value })} />
                    </Field>
                  </div>
                </>
              )}
              <Field label="SKU / code (optional)">
                <input className={inputCls} maxLength={50} value={form.sku} onChange={(e) => setF({ sku: e.target.value })} />
              </Field>
              <Field label="Description (optional)">
                <input className={inputCls} value={form.description} onChange={(e) => setF({ description: e.target.value })} />
              </Field>
              {isProduct && (
                <div className="rounded-xl border border-navy-100/70 px-4 py-1">
                  <Toggle label="Track stock" checked={form.track_stock} onChange={(v) => setF({ track_stock: v })} hint="Stock reduces automatically when you create an invoice" />
                  {form.track_stock && (
                    <div className="pb-3 space-y-3">
                      {form.variants.length > 0 ? (
                        <p className="text-xs text-navy-400">This product has sizes. Set the stock of each size from the Inventory page.</p>
                      ) : (
                        <Field label="Quantity in stock">
                          <input className={inputCls} type="number" min="0" value={form.stock_qty} onChange={(e) => setF({ stock_qty: e.target.value })} />
                        </Field>
                      )}
                      <Field label="Low stock alert at" hint="Blank = 5">
                        <input className={inputCls} type="number" min="0" value={form.low_stock_threshold} onChange={(e) => setF({ low_stock_threshold: e.target.value })} />
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
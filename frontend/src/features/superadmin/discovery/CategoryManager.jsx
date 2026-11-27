import React, { useState, useMemo, useEffect } from "react";
import { Plus, Search } from "lucide-react";
import DashboardLayout from "../../../components/layout/DashboardLayout.jsx";
import { adminSidebarItems } from "../adminSidebarItems.js";
import { useFetch } from "../../../hooks/useFetch";
import Input from "../../../components/common/Input";
import Select from "../../../components/common/Select";
import Button from "../../../components/common/Button";
import Loader from "../../../components/common/Loader";
import Modal from "../../../components/common/Modal";
import { adminDiscoveryService } from "../../../services/adminDiscoveryService";
import { showSuccess, showError } from "../../../components/common/Toast";

// One choice for the Super Admin. Each kind sets BOTH the functionality (what the vendor sees after
// login) and the business type (invoice wording and home page group). "none" = basic profile only.
const CATEGORY_KINDS = [
  { value: "gym", label: "Gym & Fitness", short: "Gym & Fitness", business_type: "health_wellness", segment: "gym" },
  { value: "academy", label: "Sports Academy (cricket, football, badminton, swimming...)", short: "Sports Academy", business_type: "education", segment: "academy" },
  { value: "studio", label: "Classes & Studios (dance, music, art, yoga, martial arts)", short: "Classes & Studios", business_type: "education", segment: "studio" },
  { value: "library", label: "Library & Study Rooms", short: "Library & Study Room", business_type: "library", segment: "library" },
  { value: "shop", label: "Shops & Retail", short: "Shops & Retail", business_type: "retail", segment: "shop" },
  { value: "food", label: "Restaurants & Food", short: "Restaurants & Food", business_type: "food", segment: "food" },
  { value: "events", label: "Events & Celebrations", short: "Events & Celebrations", business_type: "events", segment: "events" },
  { value: "coaching", label: "Coaching, Schools & Training (basic profile)", short: "Coaching, Schools & Training", business_type: "education", segment: "none" },
  { value: "wellness", label: "Salon, Clinic & Wellness (basic profile)", short: "Salon, Clinic & Wellness", business_type: "health_wellness", segment: "none" },
  { value: "professional", label: "Professional Services (basic profile)", short: "Professional Services", business_type: "professional", segment: "none" },
  { value: "home", label: "Home & Repair Services (basic profile)", short: "Home & Repair Services", business_type: "home_services", segment: "none" },
  { value: "other", label: "Other Business (basic profile)", short: "Other Business", business_type: "general", segment: "none" }
];
const KIND_OPTIONS = [
  { value: "", label: "Select category type..." },
  ...CATEGORY_KINDS.map((k) => ({ value: k.value, label: k.label }))
];

// The 4 business types that new vendors can sign up for. Value = the launch group saved on the category.
const SIGNUP_KINDS = { gym: "gym", academy: "sports", studio: "studios", library: "library" };
const SIGNUP_KIND_KEYS = Object.keys(SIGNUP_KINDS);

const STATUS_OPTIONS = [
  { value: "live", label: "Live: open for sign-up and shown on the marketplace" },
  { value: "hidden", label: "Hidden: not shown, existing vendors keep working" },
  { value: "soon", label: "Coming soon" }
];

const EMPTY_FORM = {
  id: null,
  name: "",
  slug: "",
  icon: "tag",
  tagline: "",
  kind: "",
  business_type: "general",
  segment: "",
  launch_status: "live",
  max_secondary_categories: 2,
  display_order: "",
  is_venue_type: false,
  show_on_home: true,
  active: true,
  image_url: null
};

// Works out which kind a category currently is (used to group the list and to show the dropdown value).
function kindOf(segment, businessType) {
  const bySegment = segment && segment !== "none" ? CATEGORY_KINDS.find((k) => k.segment === segment) : null;
  if (bySegment) return bySegment.value;
  const basic = CATEGORY_KINDS.find((k) => k.segment === "none" && k.business_type === businessType);
  const any = CATEGORY_KINDS.find((k) => k.business_type === businessType);
  return (basic || any || CATEGORY_KINDS[CATEGORY_KINDS.length - 1]).value;
}

const kindLabel = (value) => CATEGORY_KINDS.find((k) => k.value === value)?.short || value;

const MAX_IMAGE_MB = 5;

function SlugPreview({ name, customSlug }) {
  const auto = name.toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
  const slug = customSlug || auto;
  if (!slug) return null;
  return (
    <p className="text-xs text-gray-400 mt-1">
      URL slug: <span className="font-mono text-primary-600">/{slug}</span>
    </p>
  );
}

// Image picker with live preview. `current` is an already-saved URL, `file` a newly chosen File.
function ImagePicker({ current, file, removed, onPick, onRemove }) {
  const [preview, setPreview] = useState(null);

  useEffect(() => {
    if (!file) { setPreview(null); return undefined; }
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const shown = preview || (removed ? null : current);

  const handleChange = (e) => {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;
    if (!/^image\/(jpeg|png|webp)$/.test(f.type)) return showError("Use a JPG, PNG or WEBP image");
    if (f.size > MAX_IMAGE_MB * 1024 * 1024) return showError(`Image must be under ${MAX_IMAGE_MB} MB`);
    onPick(f);
  };

  return (
    <div>
      <p className="text-sm font-medium text-gray-700 mb-1.5">Home page image</p>
      <div className="flex items-center gap-4">
        <div className="w-32 h-24 rounded-lg border border-dashed border-gray-300 bg-gray-50 overflow-hidden flex items-center justify-center shrink-0">
          {shown ? (
            <img src={shown} alt="" className="w-full h-full object-cover" />
          ) : (
            <span className="text-xs text-gray-400 px-2 text-center">No image</span>
          )}
        </div>
        <div className="space-y-2">
          <label className="inline-block text-xs px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50 cursor-pointer">
            {shown ? "Replace image" : "Upload image"}
            <input type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handleChange} />
          </label>
          {shown && (
            <button type="button" onClick={onRemove} className="block text-xs text-red-500 hover:underline">
              Remove image
            </button>
          )}
          <p className="text-[11px] text-gray-400">4:3 photo, about 1600 x 1200, JPG or WEBP, under {MAX_IMAGE_MB} MB.</p>
        </div>
      </div>
    </div>
  );
}

function StatusBadge({ cat }) {
  const map = {
    live: { text: "Live", cls: "bg-emerald-50 text-emerald-700" },
    soon: { text: "Coming soon", cls: "bg-amber-50 text-amber-700" },
    hidden: { text: "Hidden", cls: "bg-gray-100 text-gray-500" }
  };
  const s = map[cat.launch_status] || map.hidden;
  return <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${s.cls}`}>{s.text}</span>;
}

// One of the 4 business types a new vendor can sign up for.
function OverviewCard({ kind, cats, onAdd, onEdit }) {
  const live = cats.filter((c) => c.active && c.launch_status === "live");
  const vendors = cats.reduce((sum, c) => sum + (Number(c.vendor_count) || 0), 0);

  return (
    <div className={`rounded-xl border p-4 ${live.length > 0 ? "border-emerald-200 bg-emerald-50/40" : "border-dashed border-gray-300 bg-white"}`}>
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-semibold text-gray-800 leading-tight">{kind.short}</p>
        {live.length > 0 ? (
          <span className="text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 shrink-0">Open</span>
        ) : (
          <span className="text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full bg-gray-100 text-gray-500 shrink-0">Not set up</span>
        )}
      </div>

      {live.length > 0 ? (
        <>
          <ul className="mt-2 space-y-1">
            {live.map((c) => (
              <li key={c.id}>
                <button type="button" onClick={() => onEdit(c)} className="text-sm text-primary-600 hover:underline text-left">
                  {c.name} <span className="font-mono text-[11px] text-gray-400">/{c.slug}</span>
                </button>
              </li>
            ))}
          </ul>
          {live.length > 1 && (
            <p className="text-[11px] text-amber-700 mt-2">
              {live.length} categories are open here, so new vendors get an extra "exact type" choice.
            </p>
          )}
        </>
      ) : (
        <p className="text-xs text-gray-500 mt-2">
          {cats.length > 0
            ? "Categories exist but none is Live. Edit one and set its status to Live."
            : "No category yet. New vendors can't sign up for this."}
        </p>
      )}

      <div className="flex items-center justify-between mt-3">
        <span className="text-xs text-gray-500">{vendors} {vendors === 1 ? "vendor" : "vendors"}</span>
        {live.length === 0 && cats.length === 0 && (
          <button type="button" onClick={() => onAdd(kind.value)} className="text-xs font-semibold text-primary-600 hover:underline">
            + Add
          </button>
        )}
      </div>
    </div>
  );
}

function CategoryRow({ cat, isSignup, onEdit, onDelete, onToggleActive }) {
  const inUse = Number(cat.vendor_count) > 0;
  return (
    <tr className={`border-t border-gray-50 hover:bg-gray-50 ${!cat.active ? "opacity-50" : ""}`}>
      <td className="px-4 py-3 text-gray-400 text-xs">{cat.display_order}</td>
      <td className="px-4 py-3">
        <div className="flex items-center gap-3">
          {cat.image_url ? (
            <img src={cat.image_url} alt="" className="w-12 h-9 rounded object-cover border border-gray-100 shrink-0" />
          ) : (
            <span className="w-12 h-9 rounded bg-gray-50 border border-dashed border-gray-200 shrink-0" />
          )}
          <div className="min-w-0">
            <p className="font-medium text-gray-800 leading-tight">{cat.name}</p>
            <p className="font-mono text-[11px] text-primary-600">{cat.slug}</p>
          </div>
        </div>
      </td>
      <td className="px-4 py-3">
        {isSignup ? <StatusBadge cat={cat} /> : <span className="text-xs text-gray-300">-</span>}
      </td>
      <td className="px-4 py-3 text-xs text-gray-600">{cat.vendor_count || 0}</td>
      <td className="px-4 py-3 text-xs text-gray-500">{cat.show_on_home === false ? "Hidden" : "Shown"}</td>
      <td className="px-4 py-3">
        <input
          type="checkbox"
          className="accent-primary-600"
          checked={!!cat.active}
          onChange={() => onToggleActive(cat)}
        />
      </td>
      <td className="px-4 py-3 text-right">
        <div className="flex justify-end gap-2">
          <button
            onClick={() => onEdit(cat)}
            className="text-xs px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50"
          >
            Edit
          </button>
          <button
            onClick={() => onDelete(cat)}
            disabled={inUse}
            title={inUse ? `${cat.vendor_count} vendor(s) use this category. Deactivate it instead.` : "Delete category"}
            className="text-xs px-3 py-1.5 rounded-lg border border-red-100 text-red-500 hover:bg-red-50 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent"
          >
            Delete
          </button>
        </div>
      </td>
    </tr>
  );
}

export default function CategoryManager() {
  const { data: categories, loading, refetch } = useFetch("/admin/discovery/categories");
  const { data: businessTypes } = useFetch("/meta/business-types");

  const [search, setSearch] = useState("");
  const [kindFilter, setKindFilter] = useState("");
  const [formState, setFormState] = useState(null); // { mode: "create" | "edit", values }
  const [imageFile, setImageFile] = useState(null);
  const [removeImage, setRemoveImage] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const businessTypeOptions = useMemo(
    () => (businessTypes || []).map((t) => ({ value: t.key, label: t.label })),
    [businessTypes]
  );

  // Every category with the kind it really is, grouped by kind.
  const allByKind = useMemo(() => {
    const map = {};
    CATEGORY_KINDS.forEach((k) => { map[k.value] = []; });
    (categories || []).forEach((cat) => {
      map[kindOf(cat.segment_key || cat.segment, cat.business_type)].push(cat);
    });
    return map;
  }, [categories]);

  // Same, but after the search box and the type filter.
  const q = search.trim().toLowerCase();
  const shownByKind = useMemo(() => {
    const map = {};
    CATEGORY_KINDS.forEach((k) => {
      map[k.value] = kindFilter && kindFilter !== k.value
        ? []
        : allByKind[k.value].filter(
            (c) => !q || c.name.toLowerCase().includes(q) || String(c.slug).includes(q)
          );
    });
    return map;
  }, [allByKind, kindFilter, q]);

  const totalShown = CATEGORY_KINDS.reduce((n, k) => n + shownByKind[k.value].length, 0);

  // ───────── form helpers ─────────
  const setField = (key, value) =>
    setFormState((s) => ({ ...s, values: { ...s.values, [key]: value } }));

  const applyKind = (kindValue, values, isCreate) => {
    const kind = CATEGORY_KINDS.find((k) => k.value === kindValue);
    if (!kind) return { ...values, kind: "", business_type: "general", segment: "" };
    return {
      ...values,
      kind: kind.value,
      business_type: kind.business_type,
      segment: kind.segment,
      // Each of the 4 sign-up types is one centralized category: no extra services.
      ...(isCreate && SIGNUP_KIND_KEYS.includes(kind.value) ? { max_secondary_categories: 0 } : {})
    };
  };

  const openCreate = (kindValue = "") => {
    setImageFile(null);
    setRemoveImage(false);
    setFormState({ mode: "create", values: applyKind(kindValue, { ...EMPTY_FORM }, true) });
  };

  const openEdit = (cat) => {
    setImageFile(null);
    setRemoveImage(false);
    setFormState({
      mode: "edit",
      values: {
        ...EMPTY_FORM,
        id: cat.id,
        name: cat.name,
        slug: cat.slug,
        icon: cat.icon || "",
        tagline: cat.tagline || "",
        kind: kindOf(cat.segment_key || cat.segment, cat.business_type),
        business_type: cat.business_type || "general",
        segment: cat.segment || "",
        launch_status: cat.launch_status || "hidden",
        max_secondary_categories: Number.isInteger(cat.max_secondary_categories) ? cat.max_secondary_categories : 2,
        display_order: cat.display_order ?? "",
        is_venue_type: !!cat.is_venue_type,
        show_on_home: cat.show_on_home !== false,
        active: cat.active !== false,
        image_url: cat.image_url || null
      }
    });
  };

  const closeForm = () => setFormState(null);

  const handleSave = async () => {
    const v = formState.values;
    if (!v.name.trim()) { showError("Category name is required"); return; }
    if (!v.kind) { showError("Pick a category type"); return; }

    const signupGroup = SIGNUP_KINDS[v.kind];
    const base = {
      name: v.name,
      icon: v.icon,
      tagline: v.tagline,
      display_order: v.display_order === "" ? "" : Number(v.display_order),
      business_type: v.business_type,
      max_secondary_categories: v.max_secondary_categories,
      is_venue_type: v.is_venue_type,
      show_on_home: v.show_on_home,
      // Status and group are only for the 4 sign-up types. Live needs a group, so both are sent together.
      ...(signupGroup ? { launch_status: v.launch_status || "live", launch_group: signupGroup } : {})
    };

    setSaving(true);
    try {
      if (formState.mode === "create") {
        await adminDiscoveryService.createCategory({
          ...base,
          slug: v.slug,
          segment: v.segment,
          image: imageFile || undefined
        });
        showSuccess("Category created");
      } else {
        await adminDiscoveryService.updateCategory(v.id, {
          ...base,
          segment: v.segment || undefined,
          active: v.active,
          image: imageFile || undefined,
          remove_image: removeImage && !imageFile ? true : undefined
        });
        showSuccess("Category updated");
      }
      closeForm();
      refetch();
    } catch (err) {
      showError(err?.response?.data?.message || "Could not save category");
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await adminDiscoveryService.deleteCategory(deleteTarget.id);
      showSuccess("Category deleted");
      setDeleteTarget(null);
      refetch();
    } catch (err) {
      showError(err?.response?.data?.message || "Could not delete category");
    } finally {
      setDeleting(false);
    }
  };

  const toggleActive = async (cat) => {
    try {
      await adminDiscoveryService.updateCategory(cat.id, { active: !cat.active });
      refetch();
    } catch {
      showError("Could not update category");
    }
  };

  const form = formState?.values;
  const isCreate = formState?.mode === "create";
  const formIsSignupKind = form ? SIGNUP_KIND_KEYS.includes(form.kind) : false;

  return (
    <DashboardLayout sidebarItems={adminSidebarItems} pageTitle="Category Manager">
      {loading ? (
        <Loader />
      ) : (
        <>
          {/* The 4 business types new vendors can sign up for */}
          <div className="mb-6">
            <h2 className="text-sm font-semibold text-gray-700">Open for sign-up</h2>
            <p className="text-xs text-gray-400 mt-0.5 mb-3">
              New vendors choose one of these on the first onboarding page. A type is open when it has an active
              category with status Live.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-3">
              {SIGNUP_KIND_KEYS.map((key) => {
                const kind = CATEGORY_KINDS.find((k) => k.value === key);
                return (
                  <OverviewCard key={key} kind={kind} cats={allByKind[key]} onAdd={openCreate} onEdit={openEdit} />
                );
              })}
            </div>
          </div>

          {/* Toolbar */}
          <div className="flex flex-wrap items-center gap-3 mb-4">
            <div className="relative flex-1 min-w-[220px] max-w-md">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by name or slug"
                className="w-full pl-9 pr-3 py-2 border border-gray-300 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
            <div className="w-64">
              <Select
                options={[{ value: "", label: "All category types" }, ...CATEGORY_KINDS.map((k) => ({ value: k.value, label: k.short }))]}
                value={kindFilter}
                onChange={(e) => setKindFilter(e.target.value)}
              />
            </div>
            <span className="text-xs text-gray-400">{totalShown} of {(categories || []).length} categories</span>
            <div className="ml-auto">
              <Button onClick={() => openCreate()}>
                <Plus size={15} className="mr-1" /> Add category
              </Button>
            </div>
          </div>

          {/* Grouped list */}
          <div className="space-y-3">
            {CATEGORY_KINDS.map((kind) => {
              const rows = shownByKind[kind.value];
              if (rows.length === 0) return null;
              const isSignup = SIGNUP_KIND_KEYS.includes(kind.value);
              const vendors = rows.reduce((sum, c) => sum + (Number(c.vendor_count) || 0), 0);
              return (
                <details
                  key={`${kind.value}-${q || kindFilter ? "f" : "n"}`}
                  open={isSignup || Boolean(q) || Boolean(kindFilter)}
                  className="bg-white rounded-xl border border-gray-100 overflow-hidden group"
                >
                  <summary className="flex items-center justify-between gap-3 px-4 py-3 cursor-pointer select-none bg-gray-50/70 hover:bg-gray-50">
                    <span className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-gray-800">{kind.short}</span>
                      {isSignup && (
                        <span className="text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full bg-primary-50 text-primary-700">
                          Sign-up type
                        </span>
                      )}
                    </span>
                    <span className="text-xs text-gray-500">
                      {rows.length} {rows.length === 1 ? "category" : "categories"} · {vendors} {vendors === 1 ? "vendor" : "vendors"}
                    </span>
                  </summary>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm min-w-[760px]">
                      <thead className="text-gray-400 text-left text-xs">
                        <tr>
                          <th className="px-4 py-2 font-medium">Order</th>
                          <th className="px-4 py-2 font-medium">Category</th>
                          <th className="px-4 py-2 font-medium">Sign-up</th>
                          <th className="px-4 py-2 font-medium">Vendors</th>
                          <th className="px-4 py-2 font-medium">Home</th>
                          <th className="px-4 py-2 font-medium">Active</th>
                          <th className="px-4 py-2 font-medium text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {rows.map((cat) => (
                          <CategoryRow
                            key={cat.id}
                            cat={cat}
                            isSignup={isSignup}
                            onEdit={openEdit}
                            onDelete={setDeleteTarget}
                            onToggleActive={toggleActive}
                          />
                        ))}
                      </tbody>
                    </table>
                  </div>
                </details>
              );
            })}
            {totalShown === 0 && (
              <div className="text-center bg-white border border-dashed border-gray-200 rounded-xl py-10 text-sm text-gray-500">
                No category matches your search.
              </div>
            )}
          </div>
        </>
      )}

      {/* Add / Edit modal */}
      {formState && (
        <Modal
          isOpen={!!formState}
          onClose={closeForm}
          title={isCreate ? "Add category" : `Edit: ${form.name}`}
          size="lg"
        >
          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <Input
                  label="Category name *"
                  value={form.name}
                  onChange={(e) => setField("name", e.target.value)}
                  placeholder="e.g. Sports Academy"
                />
                {isCreate && <SlugPreview name={form.name} customSlug={form.slug} />}
              </div>
              {isCreate ? (
                <Input
                  label="Slug (auto-generated if blank)"
                  value={form.slug}
                  onChange={(e) => setField("slug", e.target.value)}
                  placeholder="e.g. academy"
                />
              ) : (
                <div>
                  <p className="block text-sm font-medium text-gray-700 mb-1">Slug</p>
                  <p className="text-sm font-mono text-primary-600 pt-2">{form.slug}</p>
                  <p className="text-[11px] text-gray-400 mt-1">Cannot be changed, it is the public URL.</p>
                </div>
              )}
            </div>

            <div>
              <Select
                label="Category type *"
                options={KIND_OPTIONS}
                value={form.kind}
                onChange={(e) => setFormState((s) => ({ ...s, values: applyKind(e.target.value, s.values, isCreate) }))}
              />
              <p className="text-xs text-gray-400 mt-1">
                {isCreate
                  ? "Decides the vendor menu, tools, website sections and marketplace form."
                  : "Changing this changes the menu, tools, website sections, marketplace form and invoice wording of every vendor in this category."}
              </p>
            </div>

            {formIsSignupKind && (
              <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-3.5">
                <Select
                  label="Status"
                  options={STATUS_OPTIONS}
                  value={form.launch_status}
                  onChange={(e) => setField("launch_status", e.target.value)}
                />
                <p className="text-xs text-gray-500 mt-1.5">
                  Only Live categories appear on the first onboarding page and on the marketplace. Hiding a category never
                  breaks a vendor's page.
                </p>
              </div>
            )}

            <Input
              label="Tagline (shown under the name on home)"
              value={form.tagline}
              maxLength={160}
              onChange={(e) => setField("tagline", e.target.value)}
              placeholder="e.g. Coaching for cricket, football and more near you"
            />

            <div className="max-w-xs">
              <Input
                label="Extra services allowed (0 = single category only)"
                type="number"
                min={0}
                max={10}
                value={form.max_secondary_categories}
                onChange={(e) => setField("max_secondary_categories", e.target.value)}
              />
              <p className="text-xs text-gray-400 mt-1">
                How many other categories a vendor can add when this is their main one. Use 0 for the 4 sign-up types.
              </p>
            </div>

            <ImagePicker
              current={form.image_url}
              file={imageFile}
              removed={removeImage}
              onPick={(f) => { setImageFile(f); setRemoveImage(false); }}
              onRemove={() => { setImageFile(null); setRemoveImage(true); }}
            />

            <details className="text-sm rounded-xl border border-gray-200 p-3.5">
              <summary className="cursor-pointer text-gray-600 font-medium">More options</summary>
              <div className="mt-3 space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <Input
                    label="Icon name (lucide)"
                    value={form.icon}
                    onChange={(e) => setField("icon", e.target.value)}
                    placeholder="e.g. dumbbell"
                  />
                  <Input
                    label="Display order"
                    type="number"
                    value={form.display_order}
                    onChange={(e) => setField("display_order", e.target.value)}
                    placeholder="Blank = put at the end"
                  />
                </div>
                <div>
                  <Select
                    label="Business type (invoice wording and home page group)"
                    options={businessTypeOptions}
                    value={form.business_type}
                    onChange={(e) => setField("business_type", e.target.value)}
                  />
                  <p className="text-xs text-gray-400 mt-1">
                    Filled in automatically from Category type. Change it only if you need different invoice wording.
                  </p>
                </div>
                <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    className="accent-primary-600"
                    checked={!!form.is_venue_type}
                    onChange={(e) => setField("is_venue_type", e.target.checked)}
                  />
                  Venue type
                  <span className="text-xs text-gray-400">(uses venue checklist: address, capacity etc.)</span>
                </label>
                <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer select-none">
                  <input
                    type="checkbox"
                    className="accent-primary-600"
                    checked={!!form.show_on_home}
                    onChange={(e) => setField("show_on_home", e.target.checked)}
                  />
                  Show on home page
                </label>
              </div>
            </details>

            {!isCreate && (
              <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer select-none">
                <input
                  type="checkbox"
                  className="accent-primary-600"
                  checked={!!form.active}
                  onChange={(e) => setField("active", e.target.checked)}
                />
                Active (visible in marketplace)
              </label>
            )}
          </div>

          <div className="flex justify-end gap-3 mt-6">
            <Button variant="outline" onClick={closeForm}>Cancel</Button>
            <Button loading={saving} onClick={handleSave}>{isCreate ? "Add Category" : "Save Changes"}</Button>
          </div>
        </Modal>
      )}

      {/* Delete confirm modal */}
      {deleteTarget && (
        <Modal isOpen={!!deleteTarget} onClose={() => setDeleteTarget(null)} title="Delete Category" size="sm">
          <p className="text-sm text-gray-600 mb-2">
            Are you sure you want to delete <strong>{deleteTarget.name}</strong>?
          </p>
          <p className="text-xs text-gray-400 mb-5">
            Deleting cannot be undone. Deactivate instead if you only want to hide it.
          </p>
          <div className="flex justify-end gap-3">
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>Cancel</Button>
            <Button variant="danger" loading={deleting} onClick={handleDelete}>Yes, Delete</Button>
          </div>
        </Modal>
      )}
    </DashboardLayout>
  );
}
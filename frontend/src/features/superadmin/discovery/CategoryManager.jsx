import React, { useState, useMemo, useEffect } from "react";
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

const EMPTY_FORM = {
  name: "",
  slug: "",
  icon: "tag",
  tagline: "",
  is_venue_type: false,
  show_on_home: true,
  display_order: "",
  business_type: "general"
};

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

export default function CategoryManager() {
  const { data: categories, loading, refetch } = useFetch("/admin/discovery/categories");
  const { data: businessTypes } = useFetch("/meta/business-types");
  const [form, setForm] = useState(EMPTY_FORM);
  const [imageFile, setImageFile] = useState(null);
  const [saving, setSaving] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [editFile, setEditFile] = useState(null);
  const [editRemoved, setEditRemoved] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const businessTypeOptions = useMemo(
    () => (businessTypes || []).map((t) => ({ value: t.key, label: t.label })),
    [businessTypes]
  );

  const businessTypeLabel = (key) =>
    (businessTypes || []).find((t) => t.key === key)?.label || key || "-";

  const handleCreate = async () => {
    if (!form.name.trim()) { showError("Category name is required"); return; }
    setSaving(true);
    try {
      await adminDiscoveryService.createCategory({ ...form, image: imageFile || undefined });
      showSuccess("Category created");
      setForm(EMPTY_FORM);
      setImageFile(null);
      refetch();
    } catch (err) {
      showError(err?.response?.data?.message || "Could not create category");
    } finally {
      setSaving(false);
    }
  };

  const openEdit = (cat) => {
    setEditFile(null);
    setEditRemoved(false);
    setEditTarget({
      ...cat,
      business_type: cat.business_type || "general",
      tagline: cat.tagline || "",
      show_on_home: cat.show_on_home !== false
    });
  };

  const handleUpdate = async () => {
    setSaving(true);
    try {
      await adminDiscoveryService.updateCategory(editTarget.id, {
        name: editTarget.name,
        icon: editTarget.icon,
        tagline: editTarget.tagline,
        display_order: editTarget.display_order,
        active: editTarget.active,
        is_venue_type: editTarget.is_venue_type,
        show_on_home: editTarget.show_on_home,
        business_type: editTarget.business_type,
        image: editFile || undefined,
        remove_image: editRemoved && !editFile ? true : undefined
      });
      showSuccess("Category updated");
      setEditTarget(null);
      refetch();
    } catch (err) {
      showError(err?.response?.data?.message || "Could not update category");
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

  return (
    <DashboardLayout sidebarItems={adminSidebarItems} pageTitle="Category Manager">

      {/* Add new */}
      <div className="bg-white rounded-xl border border-gray-100 p-5 mb-6">
        <h2 className="text-sm font-semibold text-gray-700 mb-4">Add New Category</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-3">
          <div>
            <Input
              label="Category name *"
              value={form.name}
              onChange={(e) => set("name", e.target.value)}
              placeholder="e.g. Gym & Fitness"
            />
            <SlugPreview name={form.name} customSlug={form.slug} />
          </div>
          <Input
            label="Slug (auto-generated if blank)"
            value={form.slug}
            onChange={(e) => set("slug", e.target.value)}
            placeholder="e.g. gym-fitness"
          />
          <Input
            label="Icon name (lucide)"
            value={form.icon}
            onChange={(e) => set("icon", e.target.value)}
            placeholder="e.g. dumbbell"
          />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
          <div>
            <Select
              label="Business type"
              options={businessTypeOptions}
              value={form.business_type}
              onChange={(e) => set("business_type", e.target.value)}
            />
            <p className="text-xs text-gray-400 mt-1">
              Also decides which group this category appears under on the home page.
            </p>
          </div>
          <div className="md:col-span-2">
            <Input
              label="Tagline (shown under the name on home)"
              value={form.tagline}
              maxLength={160}
              onChange={(e) => set("tagline", e.target.value)}
              placeholder="e.g. Gyms, studios and trainers near you"
            />
          </div>
        </div>
        <div className="mb-4">
          <ImagePicker
            current={null}
            file={imageFile}
            removed={false}
            onPick={setImageFile}
            onRemove={() => setImageFile(null)}
          />
        </div>
        <div className="flex flex-wrap items-center gap-6 mb-4">
          <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer select-none">
            <input
              type="checkbox"
              className="accent-primary-600"
              checked={form.is_venue_type}
              onChange={(e) => set("is_venue_type", e.target.checked)}
            />
            Venue type
            <span className="text-xs text-gray-400">(uses venue checklist: address, capacity etc.)</span>
          </label>
          <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer select-none">
            <input
              type="checkbox"
              className="accent-primary-600"
              checked={form.show_on_home}
              onChange={(e) => set("show_on_home", e.target.checked)}
            />
            Show on home page
          </label>
        </div>
        <Button loading={saving} onClick={handleCreate}>Add Category</Button>
      </div>

      {/* Table */}
      {loading ? <Loader /> : (
        <div className="bg-white rounded-xl border border-gray-100 overflow-x-auto">
          <table className="w-full text-sm min-w-[820px]">
            <thead className="bg-gray-50 text-gray-500 text-left">
              <tr>
                <th className="px-4 py-3">Order</th>
                <th className="px-4 py-3">Image</th>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Slug</th>
                <th className="px-4 py-3">Business type</th>
                <th className="px-4 py-3">Home</th>
                <th className="px-4 py-3">Active</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {(categories || []).map((cat) => (
                <tr key={cat.id} className={`border-t border-gray-50 hover:bg-gray-50 ${!cat.active ? "opacity-50" : ""}`}>
                  <td className="px-4 py-3 text-gray-400 text-xs">{cat.display_order}</td>
                  <td className="px-4 py-3">
                    {cat.image_url ? (
                      <img src={cat.image_url} alt="" className="w-14 h-10 rounded object-cover border border-gray-100" />
                    ) : (
                      <span className="text-[11px] text-gray-300">None</span>
                    )}
                  </td>
                  <td className="px-4 py-3 font-medium text-gray-800">{cat.name}</td>
                  <td className="px-4 py-3 font-mono text-xs text-primary-600">{cat.slug}</td>
                  <td className="px-4 py-3">
                    <span className="text-xs px-2 py-0.5 rounded-full font-medium bg-primary-50 text-primary-700">
                      {businessTypeLabel(cat.business_type)}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500">{cat.show_on_home === false ? "Hidden" : "Shown"}</td>
                  <td className="px-4 py-3">
                    <input
                      type="checkbox"
                      className="accent-primary-600"
                      checked={cat.active}
                      onChange={() => toggleActive(cat)}
                    />
                  </td>
                  <td className="px-4 py-3 text-right">
                    <div className="flex justify-end gap-2">
                      <button
                        onClick={() => openEdit(cat)}
                        className="text-xs px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:bg-gray-50"
                      >
                        Edit
                      </button>
                      <button
                        onClick={() => setDeleteTarget(cat)}
                        className="text-xs px-3 py-1.5 rounded-lg border border-red-100 text-red-500 hover:bg-red-50"
                      >
                        Delete
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Edit modal */}
      {editTarget && (
        <Modal isOpen={!!editTarget} onClose={() => setEditTarget(null)} title={`Edit: ${editTarget.name}`} size="md">
          <div className="space-y-3">
            <Input
              label="Name"
              value={editTarget.name}
              onChange={(e) => setEditTarget({ ...editTarget, name: e.target.value })}
            />
            <p className="text-xs text-gray-400">
              Slug: <span className="font-mono text-primary-600">{editTarget.slug}</span>
              <span className="ml-2 text-gray-300">(cannot be changed, it is the public URL)</span>
            </p>
            <Input
              label="Tagline"
              value={editTarget.tagline}
              maxLength={160}
              onChange={(e) => setEditTarget({ ...editTarget, tagline: e.target.value })}
            />
            <Input
              label="Icon name"
              value={editTarget.icon || ""}
              onChange={(e) => setEditTarget({ ...editTarget, icon: e.target.value })}
            />
            <ImagePicker
              current={editTarget.image_url}
              file={editFile}
              removed={editRemoved}
              onPick={(f) => { setEditFile(f); setEditRemoved(false); }}
              onRemove={() => { setEditFile(null); setEditRemoved(true); }}
            />
            <div>
              <Select
                label="Business type"
                options={businessTypeOptions}
                value={editTarget.business_type}
                onChange={(e) => setEditTarget({ ...editTarget, business_type: e.target.value })}
              />
              <p className="text-xs text-gray-400 mt-1">
                Changing this updates the profile questions, billing setup and home page group for every vendor in this category.
              </p>
            </div>
            <Input
              label="Display order"
              type="number"
              value={editTarget.display_order}
              onChange={(e) => setEditTarget({ ...editTarget, display_order: Number(e.target.value) })}
            />
            <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
              <input
                type="checkbox"
                className="accent-primary-600"
                checked={!!editTarget.is_venue_type}
                onChange={(e) => setEditTarget({ ...editTarget, is_venue_type: e.target.checked })}
              />
              Venue type (uses venue checklist)
            </label>
            <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
              <input
                type="checkbox"
                className="accent-primary-600"
                checked={!!editTarget.show_on_home}
                onChange={(e) => setEditTarget({ ...editTarget, show_on_home: e.target.checked })}
              />
              Show on home page
            </label>
            <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
              <input
                type="checkbox"
                className="accent-primary-600"
                checked={!!editTarget.active}
                onChange={(e) => setEditTarget({ ...editTarget, active: e.target.checked })}
              />
              Active (visible in marketplace)
            </label>
          </div>
          <div className="flex justify-end gap-3 mt-5">
            <Button variant="outline" onClick={() => setEditTarget(null)}>Cancel</Button>
            <Button loading={saving} onClick={handleUpdate}>Save Changes</Button>
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
            This will fail if any vendors are currently using this category. Deactivate instead if you want to hide it.
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
import React, { useState } from "react";
import DashboardLayout from "../../../components/layout/DashboardLayout.jsx";
import { adminSidebarItems } from "../adminSidebarItems.js";
import { useFetch } from "../../../hooks/useFetch";
import Input from "../../../components/common/Input";
import Button from "../../../components/common/Button";
import Loader from "../../../components/common/Loader";
import Modal from "../../../components/common/Modal";
import { adminDiscoveryService } from "../../../services/adminDiscoveryService";
import { showSuccess, showError } from "../../../components/common/Toast";

const EMPTY_FORM = { name: "", slug: "", icon: "tag", is_venue_type: false, display_order: "" };

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

export default function CategoryManager() {
  const { data: categories, loading, refetch } = useFetch("/admin/discovery/categories");
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [editTarget, setEditTarget] = useState(null); // category being edited
  const [deleteTarget, setDeleteTarget] = useState(null); // category to confirm-delete
  const [deleting, setDeleting] = useState(false);

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const handleCreate = async () => {
    if (!form.name.trim()) { showError("Category name is required"); return; }
    setSaving(true);
    try {
      await adminDiscoveryService.createCategory(form);
      showSuccess("Category created");
      setForm(EMPTY_FORM);
      refetch();
    } catch (err) {
      showError(err?.response?.data?.message || "Could not create category");
    } finally {
      setSaving(false);
    }
  };

  const openEdit = (cat) => {
    setEditTarget({ ...cat });
  };

  const handleUpdate = async () => {
    setSaving(true);
    try {
      await adminDiscoveryService.updateCategory(editTarget.id, {
        name: editTarget.name,
        icon: editTarget.icon,
        display_order: editTarget.display_order,
        active: editTarget.active,
        is_venue_type: editTarget.is_venue_type
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

      {/* ── Add new ── */}
      <div className="bg-white rounded-xl border border-gray-100 p-5 mb-6">
        <h2 className="text-sm font-semibold text-gray-700 mb-4">Add New Category</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-3">
          <div>
            <Input
              label="Category name *"
              value={form.name}
              onChange={(e) => set("name", e.target.value)}
              placeholder="e.g. Wedding Planner"
            />
            <SlugPreview name={form.name} customSlug={form.slug} />
          </div>
          <Input
            label="Slug (auto-generated if blank)"
            value={form.slug}
            onChange={(e) => set("slug", e.target.value)}
            placeholder="e.g. wedding-planner"
          />
          <Input
            label="Icon name (lucide)"
            value={form.icon}
            onChange={(e) => set("icon", e.target.value)}
            placeholder="e.g. calendar"
          />
        </div>
        <div className="flex items-center gap-6 mb-4">
          <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer select-none">
            <input
              type="checkbox"
              className="accent-primary-600"
              checked={form.is_venue_type}
              onChange={(e) => set("is_venue_type", e.target.checked)}
            />
            Venue type
            <span className="text-xs text-gray-400">(uses venue checklist  - address, capacity etc.)</span>
          </label>
        </div>
        <Button loading={saving} onClick={handleCreate}>Add Category</Button>
      </div>

      {/* ── Table ── */}
      {loading ? <Loader /> : (
        <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500 text-left">
              <tr>
                <th className="px-4 py-3">Order</th>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Slug</th>
                <th className="px-4 py-3">Icon</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Active</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {(categories || []).map((cat) => (
                <tr key={cat.id} className={`border-t border-gray-50 hover:bg-gray-50 ${!cat.active ? "opacity-50" : ""}`}>
                  <td className="px-4 py-3 text-gray-400 text-xs">{cat.display_order}</td>
                  <td className="px-4 py-3 font-medium text-gray-800">{cat.name}</td>
                  <td className="px-4 py-3 font-mono text-xs text-primary-600">{cat.slug}</td>
                  <td className="px-4 py-3 text-gray-500 text-xs">{cat.icon}</td>
                  <td className="px-4 py-3">
                    <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${cat.is_venue_type ? "bg-blue-50 text-blue-700" : "bg-gray-100 text-gray-500"}`}>
                      {cat.is_venue_type ? "Venue" : "Service"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <input
                      type="checkbox"
                      className="accent-primary-600"
                      checked={cat.active}
                      onChange={() => toggleActive(cat)}
                    />
                  </td>
                  <td className="px-4 py-3 text-right flex justify-end gap-2">
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
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* ── Edit modal ── */}
      {editTarget && (
        <Modal isOpen={!!editTarget} onClose={() => setEditTarget(null)} title={`Edit  - ${editTarget.name}`} size="sm">
          <div className="space-y-3">
            <Input
              label="Name"
              value={editTarget.name}
              onChange={(e) => setEditTarget({ ...editTarget, name: e.target.value })}
            />
            <p className="text-xs text-gray-400">
              Slug: <span className="font-mono text-primary-600">{editTarget.slug}</span>
              <span className="ml-2 text-gray-300">(cannot be changed  - it's the public URL)</span>
            </p>
            <Input
              label="Icon name"
              value={editTarget.icon || ""}
              onChange={(e) => setEditTarget({ ...editTarget, icon: e.target.value })}
            />
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
                checked={editTarget.is_venue_type}
                onChange={(e) => setEditTarget({ ...editTarget, is_venue_type: e.target.checked })}
              />
              Venue type (uses venue checklist)
            </label>
            <label className="flex items-center gap-2 text-sm text-gray-600 cursor-pointer">
              <input
                type="checkbox"
                className="accent-primary-600"
                checked={editTarget.active}
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

      {/* ── Delete confirm modal ── */}
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
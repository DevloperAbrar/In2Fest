import React, { useState, useEffect, useRef } from "react";
import DashboardLayout from "../../../components/layout/DashboardLayout.jsx";
import { adminSidebarItems } from "../adminSidebarItems.js";
import Loader from "../../../components/common/Loader";
import Button from "../../../components/common/Button";
import Modal from "../../../components/common/Modal";
import { showSuccess, showError } from "../../../components/common/Toast";
import api from "../../../services/api";
import { Megaphone, Plus, Pencil, Trash2, Eye, EyeOff, ImageIcon } from "lucide-react";

const EMPTY_FORM = { title: "", link_url: "", display_order: "0", is_active: true };

export default function AnnouncementManager() {
  const [announcements, setAnnouncements] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null); // null = create, object = edit
  const [form, setForm] = useState(EMPTY_FORM);
  const [imageFile, setImageFile] = useState(null);
  const [imagePreview, setImagePreview] = useState(null);
  const [saving, setSaving] = useState(false);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const fileRef = useRef();

  const fetchAll = () => {
    setLoading(true);
    api
      .get("/announcements")
      .then(({ data }) => setAnnouncements(data.data))
      .catch(() => showError("Could not load announcements"))
      .finally(() => setLoading(false));
  };

  useEffect(() => { fetchAll(); }, []);

  const openCreate = () => {
    setEditing(null);
    setForm(EMPTY_FORM);
    setImageFile(null);
    setImagePreview(null);
    setModalOpen(true);
  };

  const openEdit = (ann) => {
    setEditing(ann);
    setForm({
      title: ann.title,
      link_url: ann.link_url || "",
      display_order: String(ann.display_order ?? 0),
      is_active: ann.is_active
    });
    setImageFile(null);
    setImagePreview(ann.image_url || null);
    setModalOpen(true);
  };

  const handleImageChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setImageFile(file);
    setImagePreview(URL.createObjectURL(file));
  };

  const handleSave = async () => {
    if (!form.title.trim()) { showError("Title is required"); return; }
    setSaving(true);
    try {
      const fd = new FormData();
      fd.append("title", form.title.trim());
      fd.append("link_url", form.link_url || "");
      fd.append("display_order", form.display_order || "0");
      fd.append("is_active", String(form.is_active));
      if (imageFile) fd.append("image", imageFile);

      if (editing) {
        await api.put(`/announcements/${editing.id}`, fd, {
          headers: { "Content-Type": "multipart/form-data" }
        });
        showSuccess("Announcement updated");
      } else {
        await api.post("/announcements", fd, {
          headers: { "Content-Type": "multipart/form-data" }
        });
        showSuccess("Announcement created");
      }
      setModalOpen(false);
      fetchAll();
    } catch {
      showError("Could not save announcement");
    } finally {
      setSaving(false);
    }
  };

  const handleToggleActive = async (ann) => {
    try {
      const fd = new FormData();
      fd.append("title", ann.title);
      fd.append("is_active", String(!ann.is_active));
      fd.append("display_order", String(ann.display_order ?? 0));
      await api.put(`/announcements/${ann.id}`, fd, {
        headers: { "Content-Type": "multipart/form-data" }
      });
      showSuccess(ann.is_active ? "Deactivated" : "Activated");
      fetchAll();
    } catch {
      showError("Could not update");
    }
  };

  const handleDelete = async (id) => {
    try {
      await api.delete(`/announcements/${id}`);
      showSuccess("Deleted");
      setDeleteConfirm(null);
      fetchAll();
    } catch {
      showError("Could not delete");
    }
  };

  return (
    <DashboardLayout sidebarItems={adminSidebarItems} pageTitle="Announcements">
      <div className="flex justify-between items-center mb-5">
        <p className="text-sm text-gray-500">
          Announcements are shown as a popup/slider to first-time visitors on the discovery homepage.
        </p>
        <Button onClick={openCreate}>
          <Plus className="w-4 h-4 mr-1" /> Add Announcement
        </Button>
      </div>

      {loading ? (
        <Loader fullScreen />
      ) : announcements.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-gray-400">
          <Megaphone className="w-12 h-12 mb-3 opacity-30" />
          <p className="text-sm">No announcements yet. Create one above.</p>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-xs text-gray-500 uppercase tracking-wide">
                <th className="px-4 py-3 text-left">Order</th>
                <th className="px-4 py-3 text-left">Image</th>
                <th className="px-4 py-3 text-left">Title</th>
                <th className="px-4 py-3 text-left">Link</th>
                <th className="px-4 py-3 text-left">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {announcements.map((ann) => (
                <tr key={ann.id} className="border-t border-gray-50 hover:bg-gray-50/50">
                  <td className="px-4 py-3 text-gray-500 text-center w-12">{ann.display_order}</td>
                  <td className="px-4 py-3 w-20">
                    {ann.image_url ? (
                      <img
                        src={ann.image_url}
                        alt={ann.title}
                        className="w-14 h-10 object-cover rounded-md border border-gray-100"
                      />
                    ) : (
                      <div className="w-14 h-10 bg-gray-100 rounded-md flex items-center justify-center">
                        <ImageIcon className="w-4 h-4 text-gray-300" />
                      </div>
                    )}
                  </td>
                  <td className="px-4 py-3 font-medium text-gray-800">{ann.title}</td>
                  <td className="px-4 py-3 text-gray-400 max-w-[140px] truncate">
                    {ann.link_url || "—"}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium ${
                        ann.is_active
                          ? "bg-green-50 text-green-700"
                          : "bg-gray-100 text-gray-500"
                      }`}
                    >
                      {ann.is_active ? "Active" : "Inactive"}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => handleToggleActive(ann)}
                        title={ann.is_active ? "Deactivate" : "Activate"}
                        className="p-1.5 rounded hover:bg-gray-100 text-gray-400 hover:text-gray-700"
                      >
                        {ann.is_active ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                      <button
                        onClick={() => openEdit(ann)}
                        title="Edit"
                        className="p-1.5 rounded hover:bg-blue-50 text-gray-400 hover:text-blue-600"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => setDeleteConfirm(ann.id)}
                        title="Delete"
                        className="p-1.5 rounded hover:bg-red-50 text-gray-400 hover:text-red-600"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Create / Edit Modal */}
      <Modal
        isOpen={modalOpen}
        onClose={() => setModalOpen(false)}
        title={editing ? "Edit Announcement" : "New Announcement"}
        size="md"
      >
        <div className="p-5 space-y-4">
          {/* Image upload */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Banner Image
            </label>
            <div
              className="border-2 border-dashed border-gray-200 rounded-xl overflow-hidden cursor-pointer hover:border-blue-300 transition-colors"
              onClick={() => fileRef.current?.click()}
            >
              {imagePreview ? (
                <img
                  src={imagePreview}
                  alt="preview"
                  className="w-full h-40 object-cover"
                />
              ) : (
                <div className="h-32 flex flex-col items-center justify-center text-gray-400 gap-2">
                  <ImageIcon className="w-8 h-8" />
                  <span className="text-xs">Click to upload image</span>
                </div>
              )}
            </div>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleImageChange}
            />
            {imagePreview && (
              <button
                className="text-xs text-red-500 mt-1 hover:underline"
                onClick={() => { setImageFile(null); setImagePreview(null); }}
              >
                Remove image
              </button>
            )}
          </div>

          {/* Title */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Title <span className="text-red-500">*</span>
            </label>
            <input
              type="text"
              value={form.title}
              onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
              placeholder="e.g. Summer Sale — 20% Off All Bookings"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-100"
            />
          </div>

          {/* Link URL */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Link URL <span className="text-gray-400">(optional)</span>
            </label>
            <input
              type="url"
              value={form.link_url}
              onChange={(e) => setForm((f) => ({ ...f, link_url: e.target.value }))}
              placeholder="https://..."
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-100"
            />
          </div>

          {/* Display Order */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">
              Display Order
            </label>
            <input
              type="number"
              min="0"
              value={form.display_order}
              onChange={(e) => setForm((f) => ({ ...f, display_order: e.target.value }))}
              className="w-24 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-100"
            />
            <p className="text-xs text-gray-400 mt-0.5">Lower number = shown first in the slider</p>
          </div>

          {/* Active toggle */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setForm((f) => ({ ...f, is_active: !f.is_active }))}
              className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                form.is_active ? "bg-blue-600" : "bg-gray-200"
              }`}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  form.is_active ? "translate-x-6" : "translate-x-1"
                }`}
              />
            </button>
            <span className="text-sm text-gray-600">
              {form.is_active ? "Active (visible to visitors)" : "Inactive (hidden)"}
            </span>
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <Button variant="ghost" onClick={() => setModalOpen(false)}>
              Cancel
            </Button>
            <Button loading={saving} onClick={handleSave}>
              {editing ? "Save Changes" : "Create"}
            </Button>
          </div>
        </div>
      </Modal>

      {/* Delete Confirm */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/30 p-4">
          <div className="bg-white rounded-2xl shadow-xl p-6 w-full max-w-sm">
            <h3 className="font-semibold text-gray-800 mb-2">Delete Announcement?</h3>
            <p className="text-sm text-gray-500 mb-5">This cannot be undone.</p>
            <div className="flex justify-end gap-2">
              <Button variant="ghost" onClick={() => setDeleteConfirm(null)}>
                Cancel
              </Button>
              <Button
                variant="danger"
                onClick={() => handleDelete(deleteConfirm)}
              >
                Delete
              </Button>
            </div>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
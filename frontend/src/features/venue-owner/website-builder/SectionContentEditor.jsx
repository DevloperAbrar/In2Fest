import React, { useState, useRef } from "react";
import { useParams, useNavigate } from "react-router-dom";
import DashboardLayout from "../../../components/layout/DashboardLayout.jsx";
import { ownerSidebarItems } from "../ownerSidebarItems.js";
import { useVenue } from "../../../context/VenueContext.jsx";
import Button from "../../../components/common/Button";
import { venueService } from "../../../services/venueService";
import { showSuccess, showError } from "../../../components/common/Toast";
import { SECTION_TYPES, FIELD_LABELS, emptyItem } from "../../../lib/sectionLibrary";
import { Plus, Trash2, Upload, X, Loader2 } from "lucide-react";

function ImageUploadField({ item, venueId, onUploaded }) {
  const inputRef = useRef(null);
  const [uploading, setUploading] = useState(false);

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = ""; // allow re-selecting the same file later
    if (!file) return;

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("sectionImage", file);
      const res = await venueService.uploadSectionImage(venueId, formData);
      onUploaded(res.data.data.url);
    } catch {
      showError("Image upload failed. Please try a JPEG, PNG or WEBP under the size limit.");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div>
      <label className="block text-xs text-gray-500 mb-1">Image</label>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp"
        onChange={handleFile}
        className="hidden"
      />

      {item.image_url ? (
        <div className="relative w-32 h-32 rounded-lg overflow-hidden border border-gray-200 group">
          <img src={item.image_url} alt="" className="w-full h-full object-cover" />
          <button
            type="button"
            onClick={() => onUploaded("")}
            className="absolute top-1 right-1 bg-black/60 text-white rounded-full p-1 opacity-0 group-hover:opacity-100 transition-opacity"
            title="Remove image"
          >
            <X size={12} />
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => inputRef.current?.click()}
          disabled={uploading}
          className="w-32 h-32 rounded-lg border-2 border-dashed border-gray-200 flex flex-col items-center justify-center gap-1 text-gray-400 hover:border-primary-300 hover:text-primary-500 transition-all disabled:opacity-50"
        >
          {uploading ? <Loader2 size={18} className="animate-spin" /> : <Upload size={18} />}
          <span className="text-xs">{uploading ? "Uploading..." : "Upload"}</span>
        </button>
      )}
    </div>
  );
}

export default function SectionContentEditor() {
  const { type } = useParams();
  const { venue, refetchVenue } = useVenue();
  const navigate = useNavigate();
  const def = SECTION_TYPES[type];

  const [title, setTitle] = useState("");
  const [items, setItems] = useState([]);
  const [saving, setSaving] = useState(false);

  React.useEffect(() => {
    if (!venue?.page_sections) return;
    const existing = venue.page_sections.find((s) => s.type === type);
    setTitle(existing?.config?.title || def?.defaultConfig?.title || "");
    setItems(existing?.config?.items || []);
  }, [venue, type]);

  if (!def || !def.itemFields) {
    return (
      <DashboardLayout sidebarItems={ownerSidebarItems} pageTitle="Section not found">
        <p className="text-sm text-gray-500">
          This section type doesn't exist.{" "}
          <button className="text-primary-600 underline" onClick={() => navigate("/dashboard/website")}>
            Back to Website Builder
          </button>
        </p>
      </DashboardLayout>
    );
  }

  const updateItem = (id, field, value) => {
    setItems(items.map((it) => (it.id === id ? { ...it, [field]: value } : it)));
  };

  const addItem = () => setItems([...items, emptyItem()]);
  const removeItem = (id) => setItems(items.filter((it) => it.id !== id));

  const save = async () => {
    if (!venue?.page_sections) return;
    setSaving(true);
    try {
      const nextSections = venue.page_sections.map((s) =>
        s.type === type ? { ...s, config: { title, items: items.filter((it) => it.title?.trim()) } } : s
      );
      await venueService.update(venue.id, { page_sections: nextSections });
      await refetchVenue();
      showSuccess(`${def.label} updated`);
      navigate("/dashboard");
    } catch {
      showError("Failed to save section");
    } finally {
      setSaving(false);
    }
  };

  return (
    <DashboardLayout sidebarItems={ownerSidebarItems} pageTitle={def.label}>
      <div className="max-w-2xl bg-white p-6 rounded-xl border border-gray-100 space-y-5">
        <div>
          <label className="block text-xs text-gray-500 mb-1">Section Heading</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>

        {items.length === 0 && (
          <p className="text-sm text-gray-400 text-center py-4">
            No entries yet. Add your first one below.
          </p>
        )}

        <div className="space-y-4">
          {items.map((item, idx) => (
            <div key={item.id} className="border border-gray-100 rounded-xl p-4 space-y-3 bg-gray-50">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-gray-400">Entry {idx + 1}</span>
                <button onClick={() => removeItem(item.id)} className="text-red-400 hover:text-red-600">
                  <Trash2 size={14} />
                </button>
              </div>

              {def.itemFields.map((field) =>
                field === "image_url" ? (
                  <ImageUploadField
                    key={field}
                    item={item}
                    venueId={venue.id}
                    onUploaded={(url) => updateItem(item.id, "image_url", url)}
                  />
                ) : (
                  <div key={field}>
                    <label className="block text-xs text-gray-500 mb-1">{FIELD_LABELS[field]}</label>
                    {field === "description" ? (
                      <textarea
                        value={item[field] || ""}
                        onChange={(e) => updateItem(item.id, field, e.target.value)}
                        rows={3}
                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
                      />
                    ) : (
                      <input
                        type="text"
                        value={item[field] || ""}
                        onChange={(e) => updateItem(item.id, field, e.target.value)}
                        className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                      />
                    )}
                  </div>
                )
              )}
            </div>
          ))}
        </div>

        <button
          onClick={addItem}
          className="w-full border-2 border-dashed border-gray-200 rounded-xl py-3 text-sm text-gray-400 hover:border-primary-300 hover:text-primary-500 transition-all flex items-center justify-center gap-2"
        >
          <Plus size={16} /> Add Entry
        </button>

        <div className="flex gap-3">
          <Button onClick={save} loading={saving} className="flex-1">Save Section</Button>
          <Button variant="outline" onClick={() => navigate("/dashboard/website")}>Back to Website Builder</Button>
        </div>
      </div>
    </DashboardLayout>
  );
}
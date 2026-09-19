import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import DashboardLayout from "../../../components/layout/DashboardLayout.jsx";
import { ownerSidebarItems } from "../ownerSidebarItems.js";
import { useVenue } from "../../../context/VenueContext.jsx";
import { useFetch } from "../../../hooks/useFetch";
import Button from "../../../components/common/Button";
import { venueService } from "../../../services/venueService";
import { showSuccess, showError } from "../../../components/common/Toast";
import { emptyItem } from "../../../lib/sectionLibrary";
import { Plus, Trash2, Download } from "lucide-react";

// Converts a Slots-module package into a website section item
function packageToItem(pkg) {
  const slotNames = (pkg.slots || []).map((s) => s.name).filter(Boolean);
  return {
    ...emptyItem(),
    title: pkg.name || "",
    price: pkg.price != null ? `₹${Number(pkg.price).toLocaleString("en-IN")}` : "",
    description: pkg.description || (slotNames.length > 0 ? `Includes: ${slotNames.join(", ")}` : ""),
    tag: pkg.tag || "",
  };
}

export default function PackagesSectionEditor() {
  const { venue, refetchVenue } = useVenue();
  const navigate = useNavigate();

  // Vendor's real packages from the Slots module
  const { data: slotPackages, loading: pkgsLoading } = useFetch(
    venue ? `/venues/${venue.id}/packages` : null,
    { skip: !venue }
  );

  const [title, setTitle] = useState("");
  const [items, setItems] = useState([]);
  const [saving, setSaving] = useState(false);
  // track which slot-package ids are already imported (by name match)
  const [importedIds, setImportedIds] = useState(new Set());

  React.useEffect(() => {
    if (!venue?.page_sections) return;
    const existing = venue.page_sections.find((s) => s.type === "packages");
    setTitle(existing?.config?.title || "Our Packages");
    setItems(existing?.config?.items || []);
  }, [venue]);

  const updateItem = (id, field, value) =>
    setItems(items.map((it) => (it.id === id ? { ...it, [field]: value } : it)));

  const removeItem = (id) => {
    const item = items.find((it) => it.id === id);
    setItems(items.filter((it) => it.id !== id));
    // allow re-importing if this item came from a slot package
    if (item?._slotPkgId) {
      setImportedIds((prev) => { const n = new Set(prev); n.delete(item._slotPkgId); return n; });
    }
  };

  const importPackage = (pkg) => {
    const newItem = { ...packageToItem(pkg), _slotPkgId: pkg.id };
    setItems((prev) => [...prev, newItem]);
    setImportedIds((prev) => new Set([...prev, pkg.id]));
  };

  const addManual = () => setItems((prev) => [...prev, emptyItem()]);

  const save = async () => {
    if (!venue?.page_sections) return;
    setSaving(true);
    try {
      const nextSections = venue.page_sections.map((s) =>
        s.type === "packages"
          ? {
              ...s,
              config: {
                title,
                // strip internal helper field before saving
                items: items
                  .filter((it) => it.title?.trim())
                  .map(({ _slotPkgId, ...rest }) => rest),
              },
            }
          : s
      );
      await venueService.update(venue.id, { page_sections: nextSections });
      await refetchVenue();
      showSuccess("Packages section updated");
      navigate("/dashboard");
    } catch {
      showError("Failed to save section");
    } finally {
      setSaving(false);
    }
  };

  const availableToImport = (slotPackages || []).filter((p) => !importedIds.has(p.id));

  return (
    <DashboardLayout sidebarItems={ownerSidebarItems} pageTitle="Packages">
      <div className="max-w-2xl bg-white p-6 rounded-xl border border-gray-100 space-y-6">

        {/* Section heading */}
        <div>
          <label className="block text-xs text-gray-500 mb-1">Section Heading</label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
          />
        </div>

        {/* Import from Slots packages */}
        <div className="bg-indigo-50 border border-indigo-100 rounded-xl p-4 space-y-3">
          <div className="flex items-center gap-2">
            <Download size={15} className="text-indigo-600" />
            <span className="text-sm font-medium text-indigo-800">Import from your Slots packages</span>
          </div>

          {pkgsLoading ? (
            <p className="text-xs text-indigo-500">Loading your packages…</p>
          ) : availableToImport.length === 0 ? (
            <p className="text-xs text-indigo-500">
              {(slotPackages || []).length === 0
                ? "No packages found. Create them first under Slots → Packages."
                : "All your packages have been imported."}
            </p>
          ) : (
            <div className="flex flex-wrap gap-2">
              {availableToImport.map((pkg) => (
                <button
                  key={pkg.id}
                  type="button"
                  onClick={() => importPackage(pkg)}
                  className="flex items-center gap-1.5 bg-white border border-indigo-200 text-indigo-700 text-xs font-medium px-3 py-1.5 rounded-lg hover:bg-indigo-100 transition"
                >
                  <Plus size={12} /> {pkg.name}
                  {pkg.price != null && (
                    <span className="text-indigo-400 ml-1">
                      ₹{Number(pkg.price).toLocaleString("en-IN")}
                    </span>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Current entries */}
        {items.length === 0 && (
          <p className="text-sm text-gray-400 text-center py-2">
            No entries yet. Import a package above or add one manually.
          </p>
        )}

        <div className="space-y-4">
          {items.map((item, idx) => (
            <div key={item.id} className="border border-gray-100 rounded-xl p-4 space-y-3 bg-gray-50">
              <div className="flex items-center justify-between">
                <span className="text-xs font-medium text-gray-400">
                  Entry {idx + 1}
                  {item._slotPkgId && (
                    <span className="ml-2 text-indigo-400">(imported)</span>
                  )}
                </span>
                <button onClick={() => removeItem(item.id)} className="text-red-400 hover:text-red-600">
                  <Trash2 size={14} />
                </button>
              </div>

              {[
                { field: "title", label: "Title" },
                { field: "price", label: "Price" },
                { field: "tag", label: "Tag / Badge" },
              ].map(({ field, label }) => (
                <div key={field}>
                  <label className="block text-xs text-gray-500 mb-1">{label}</label>
                  <input
                    type="text"
                    value={item[field] || ""}
                    onChange={(e) => updateItem(item.id, field, e.target.value)}
                    className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
                  />
                </div>
              ))}

              <div>
                <label className="block text-xs text-gray-500 mb-1">Description</label>
                <textarea
                  value={item.description || ""}
                  onChange={(e) => updateItem(item.id, "description", e.target.value)}
                  rows={3}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
                />
              </div>
            </div>
          ))}
        </div>

        {/* Add manual entry */}
        <button
          onClick={addManual}
          className="w-full border-2 border-dashed border-gray-200 rounded-xl py-3 text-sm text-gray-400 hover:border-primary-300 hover:text-primary-500 transition-all flex items-center justify-center gap-2"
        >
          <Plus size={16} /> Add Entry Manually
        </button>

        <div className="flex gap-3">
          <Button onClick={save} loading={saving} className="flex-1">Save Section</Button>
          <Button variant="outline" onClick={() => navigate("/dashboard/website")}>
            Back to Website Builder
          </Button>
        </div>
      </div>
    </DashboardLayout>
  );
}
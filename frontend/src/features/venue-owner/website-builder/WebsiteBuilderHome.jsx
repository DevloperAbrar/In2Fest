import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import DashboardLayout from "../../../components/layout/DashboardLayout.jsx";
import { ownerSidebarItems } from "../ownerSidebarItems.js";
import { useVenue } from "../../../context/VenueContext.jsx";
import { venueService } from "../../../services/venueService";
import { showSuccess, showError } from "../../../components/common/Toast";
import Button from "../../../components/common/Button";
import { SECTION_TYPES } from "../../../lib/sectionLibrary";
import SectionPickerModal from "./SectionPickerModal.jsx";
import { BASE_DOMAIN } from "../../../lib/constants";
import { GripVertical, Eye, EyeOff, Trash2, Pencil, Plus, Layers } from "lucide-react";

export default function WebsiteBuilderHome() {
  const navigate = useNavigate();
  const { venue, refetchVenue } = useVenue();
  const [sections, setSections] = useState([]);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [dragIndex, setDragIndex] = useState(null);

  useEffect(() => {
    if (venue?.page_sections) setSections(venue.page_sections);
  }, [venue]);

  const isDev = import.meta.env.DEV;
  const publicUrl = venue?.subdomain
    ? isDev
      ? `http://${venue.subdomain}.localhost:5173`
      : `https://${venue.subdomain}.${BASE_DOMAIN}`
    : null;

  const markDirty = (next) => {
    setSections(next);
    setDirty(true);
  };

  const toggleVisible = (type) => {
    markDirty(sections.map((s) => (s.type === type ? { ...s, visible: !s.visible } : s)));
  };

  const removeSection = (type) => {
    markDirty(sections.filter((s) => s.type !== type));
  };

  const addSection = (type) => {
    const def = SECTION_TYPES[type];
    if (!def || sections.some((s) => s.type === type)) return;
    markDirty([...sections, { type, visible: true, config: def.defaultConfig ? { ...def.defaultConfig, items: [] } : null }]);
    setPickerOpen(false);
  };

  const handleDragStart = (index) => setDragIndex(index);
  const handleDragOver = (e) => e.preventDefault();
  const handleDrop = (index) => {
    if (dragIndex === null || dragIndex === index) return;
    const next = [...sections];
    const [moved] = next.splice(dragIndex, 1);
    next.splice(index, 0, moved);
    setDragIndex(null);
    markDirty(next);
  };

  const editSection = (type) => {
    const def = SECTION_TYPES[type];
    if (!def) return;
    navigate(def.editorRoute || `/dashboard/website/section/${type}`);
  };

  const save = async () => {
    setSaving(true);
    try {
      await venueService.update(venue.id, { page_sections: sections });
      await refetchVenue();
      setDirty(false);
      showSuccess("Website layout updated");
    } catch {
      showError("Failed to save layout");
    } finally {
      setSaving(false);
    }
  };

  const addableTypes = Object.keys(SECTION_TYPES).filter(
    (type) => SECTION_TYPES[type].removable && !sections.some((s) => s.type === type)
  );

  return (
    <DashboardLayout sidebarItems={ownerSidebarItems} pageTitle="Website Builder">
      <div className="max-w-4xl">
        {publicUrl && (
          <div className="bg-primary-50 border border-primary-100 rounded-xl p-4 mb-6 flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500">Your public website</p>
              <p className="font-medium text-primary-700">{publicUrl}</p>
            </div>
            <a href={publicUrl} target="_blank" rel="noreferrer" className="text-sm text-primary-600 hover:underline">
              Preview →
            </a>
          </div>
        )}

        {/* Template selector banner */}
        <div className="bg-white border border-navy-100 rounded-xl p-4 mb-6 flex items-center justify-between gap-4">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-lg bg-primary-50 flex items-center justify-center flex-shrink-0">
              <Layers size={17} className="text-primary-600" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-navy-800">
                Template:{" "}
                <span className="text-primary-600 capitalize">
                  {venue?.template_id || "Classic"}
                </span>
              </p>
              <p className="text-xs text-navy-400 truncate">Change the look and feel of your public website</p>
            </div>
          </div>
          <button
            onClick={() => navigate("/dashboard/website/template")}
            className="flex-shrink-0 text-sm font-semibold text-primary-600 bg-primary-50 hover:bg-primary-100 px-4 py-2 rounded-lg transition-colors"
          >
            Change Template
          </button>
        </div>

        <p className="text-gray-500 mb-6 text-sm">
          Drag sections to reorder, hide the ones you don't need, and add new ones from the library.
          Click Save Layout when you're done.
        </p>

        <div className="space-y-3">
          {sections.map((section, index) => {
            const def = SECTION_TYPES[section.type];
            if (!def) return null;
            const Icon = def.icon;
            return (
              <div
                key={section.type}
                draggable
                onDragStart={() => handleDragStart(index)}
                onDragOver={handleDragOver}
                onDrop={() => handleDrop(index)}
                className={`bg-white border rounded-xl p-4 flex items-center gap-3 transition-all ${section.visible === false ? "border-gray-100 opacity-60" : "border-gray-100 hover:border-primary-200"
                  }`}
              >
                <span className="cursor-grab text-gray-300 hover:text-gray-400">
                  <GripVertical size={18} />
                </span>

                <div className={`p-2 rounded-lg ${def.color}`}>
                  <Icon size={18} />
                </div>

                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-800 text-sm">{def.label}</p>
                  <p className="text-xs text-gray-500 truncate">{def.description}</p>
                </div>

                {def.toggleable && (
                  <button
                    onClick={() => toggleVisible(section.type)}
                    title={section.visible === false ? "Hidden  - click to show" : "Visible  - click to hide"}
                    className="text-gray-400 hover:text-gray-600 p-1"
                  >
                    {section.visible === false ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                )}

                <button
                  onClick={() => editSection(section.type)}
                  title="Edit content"
                  className="text-gray-400 hover:text-primary-600 p-1"
                >
                  <Pencil size={16} />
                </button>

                {def.removable && (
                  <button
                    onClick={() => removeSection(section.type)}
                    title="Remove section"
                    className="text-gray-400 hover:text-red-500 p-1"
                  >
                    <Trash2 size={16} />
                  </button>
                )}
              </div>
            );
          })}
        </div>

        {addableTypes.length > 0 && (
          <button
            onClick={() => setPickerOpen(true)}
            className="w-full mt-4 border-2 border-dashed border-gray-200 rounded-xl py-3 text-sm text-gray-400 hover:border-primary-300 hover:text-primary-500 transition-all flex items-center justify-center gap-2"
          >
            <Plus size={16} /> Add Section
          </button>
        )}

        <div className="flex gap-3 mt-6">
          <Button onClick={save} loading={saving} disabled={!dirty} className="flex-1">
            Save Layout
          </Button>
        </div>

        {pickerOpen && (
          <SectionPickerModal
            types={addableTypes}
            onSelect={addSection}
            onClose={() => setPickerOpen(false)}
          />
        )}
      </div>
    </DashboardLayout>
  );
}
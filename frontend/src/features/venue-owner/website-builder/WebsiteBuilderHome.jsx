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
import DisplayOptionsCard from "./DisplayOptionsCard.jsx";
import NavbarOptionsCard from "./NavbarOptionsCard.jsx";
import BuilderCard from "./BuilderCard.jsx";
import { BASE_DOMAIN } from "../../../lib/constants";
import { GripVertical, Eye, EyeOff, Trash2, Pencil, Plus, Copy, ExternalLink, ChevronUp, ChevronDown } from "lucide-react";

import auroraPreview from "../../../assets/templates/aurora.png";
import bloomPreview from "../../../assets/templates/bloom.png";
import slatePreview from "../../../assets/templates/slate.png";
import classicPreview from "../../../assets/templates/classic.png";

// Same ids the Template picker uses. Any other value (for example the default "template-1") renders as Classic.
const TEMPLATE_INFO = {
  aurora: { name: "Aurora", tagline: "Dark luxury", image: auroraPreview },
  bloom: { name: "Bloom", tagline: "Warm editorial", image: bloomPreview },
  slate: { name: "Slate", tagline: "Bold minimal", image: slatePreview },
  classic: { name: "Classic", tagline: "Clean and versatile", image: classicPreview }
};

export default function WebsiteBuilderHome() {
  const navigate = useNavigate();
  const { venue, refetchVenue } = useVenue();
  const [sections, setSections] = useState([]);
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [dragIndex, setDragIndex] = useState(null);

  useEffect(() => {
    // Don't overwrite unsaved layout changes when the venue refetches
    // (e.g. after toggling a "What visitors can see" option).
    if (venue?.page_sections && !dirty) setSections(venue.page_sections);
  }, [venue]);

  const isDev = import.meta.env.DEV;
  const publicUrl = venue?.subdomain
    ? isDev
      ? `http://${venue.subdomain}.localhost:5173`
      : `https://${venue.subdomain}.${BASE_DOMAIN}`
    : null;

  const activeTemplate = TEMPLATE_INFO[venue?.template_id] || TEMPLATE_INFO.classic;

  const markDirty = (next) => {
    setSections(next);
    setDirty(true);
  };

  const toggleVisible = (type) => {
    markDirty(sections.map((s) => (s.type === type ? { ...s, visible: s.visible === false } : s)));
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

  const moveSection = (index, dir) => {
    const target = index + dir;
    if (target < 0 || target >= sections.length) return;
    const next = [...sections];
    [next[index], next[target]] = [next[target], next[index]];
    markDirty(next);
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

  const copyLink = async () => {
    try {
      await navigator.clipboard.writeText(publicUrl);
      showSuccess("Link copied");
    } catch {
      showError("Could not copy the link");
    }
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

  const isGymVenue = [venue?.business_category, ...(venue?.secondary_categories || [])].includes("gym-fitness");
  const addableTypes = Object.keys(SECTION_TYPES).filter(
    (type) =>
      SECTION_TYPES[type].removable &&
      (!SECTION_TYPES[type].gymOnly || isGymVenue) &&
      !sections.some((s) => s.type === type)
  );

  const visibleSections = sections.filter((s) => SECTION_TYPES[s.type]);

  return (
    <DashboardLayout sidebarItems={ownerSidebarItems} pageTitle="Website Builder">
      <div className="max-w-4xl space-y-6 pb-10">
        {/* Public link */}
        {publicUrl && (
          <div className="flex flex-col gap-3 rounded-2xl border border-primary-100 bg-primary-50/60 p-4 sm:flex-row sm:items-center sm:justify-between sm:p-5">
            <div className="min-w-0">
              <p className="text-xs font-medium uppercase tracking-wide text-gray-500">Your public website</p>
              <p className="mt-1 break-all text-sm font-semibold text-primary-700 sm:text-base">{publicUrl}</p>
            </div>
            <div className="flex flex-shrink-0 gap-2">
              <button
                type="button"
                onClick={copyLink}
                className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg border border-primary-200 bg-white px-3.5 py-2 text-sm font-medium text-primary-700 transition-colors hover:bg-primary-50 sm:flex-none"
              >
                <Copy size={15} /> Copy link
              </button>
              <a
                href={publicUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex flex-1 items-center justify-center gap-1.5 rounded-lg bg-primary-600 px-3.5 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-700 sm:flex-none"
              >
                <ExternalLink size={15} /> Open site
              </a>
            </div>
          </div>
        )}

        {/* 1. Template */}
        <BuilderCard
          step="1"
          title="Template"
          description="The look and feel of your public website."
          action={
            <Button variant="outline" onClick={() => navigate("/dashboard/website/template")} className="w-full sm:w-auto">
              Change template
            </Button>
          }
        >
          <div className="flex items-center gap-4">
            <img
              src={activeTemplate.image}
              alt={`${activeTemplate.name} template preview`}
              className="h-16 w-24 flex-shrink-0 rounded-lg border border-gray-200 object-cover object-top"
            />
            <div className="min-w-0">
              <p className="text-sm font-semibold text-gray-900">{activeTemplate.name}</p>
              <p className="text-xs text-gray-500">{activeTemplate.tagline}</p>
            </div>
          </div>
        </BuilderCard>

        {/* 2. What visitors can see */}
        <DisplayOptionsCard />

        {/* 3. Website menu */}
        <NavbarOptionsCard />

        {/* 4. Page sections */}
        <BuilderCard
          step="4"
          title="Page sections"
          description="Choose which sections appear on your page and in what order. Use the arrows or drag to reorder."
          action={
            addableTypes.length > 0 ? (
              <Button variant="outline" onClick={() => setPickerOpen(true)} className="w-full sm:w-auto">
                <Plus size={16} /> Add section
              </Button>
            ) : null
          }
        >
          {visibleSections.length === 0 ? (
            <div className="rounded-xl border-2 border-dashed border-gray-200 py-8 text-center text-sm text-gray-400">
              No sections yet. Add your first one.
            </div>
          ) : (
            <ul className="space-y-2.5">
              {sections.map((section, index) => {
                const def = SECTION_TYPES[section.type];
                if (!def) return null;
                const Icon = def.icon;
                const isHidden = section.visible === false;
                return (
                  <li
                    key={section.type}
                    draggable
                    onDragStart={() => handleDragStart(index)}
                    onDragOver={handleDragOver}
                    onDrop={() => handleDrop(index)}
                    className={`flex flex-wrap items-center gap-x-3 gap-y-2 rounded-xl border p-3 transition-colors sm:flex-nowrap ${
                      isHidden ? "border-gray-100 bg-gray-50" : "border-gray-200 bg-white hover:border-primary-200"
                    }`}
                  >
                    <span className="hidden cursor-grab text-gray-300 hover:text-gray-500 sm:block">
                      <GripVertical size={18} />
                    </span>

                    <div className={`flex-shrink-0 rounded-lg p-2 ${def.color} ${isHidden ? "opacity-60" : ""}`}>
                      <Icon size={18} />
                    </div>

                    <div className={`min-w-0 flex-1 basis-40 ${isHidden ? "opacity-60" : ""}`}>
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="truncate text-sm font-semibold text-gray-900">{def.label}</p>
                        {isHidden && (
                          <span className="rounded-full bg-gray-200 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-gray-600">
                            Hidden
                          </span>
                        )}
                        {def.autoManaged && (
                          <span
                            title="Filled automatically from your Marketplace reviews"
                            className="rounded-full bg-orange-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-orange-600"
                          >
                            Auto
                          </span>
                        )}
                      </div>
                      <p className="truncate text-xs text-gray-500">{def.description}</p>
                    </div>

                    <div className="ml-auto flex flex-shrink-0 items-center gap-0.5">
                      <button
                        type="button"
                        onClick={() => moveSection(index, -1)}
                        disabled={index === 0}
                        title="Move up"
                        className="rounded p-1.5 text-gray-400 hover:bg-gray-50 hover:text-gray-700 disabled:opacity-25 disabled:hover:bg-transparent"
                      >
                        <ChevronUp size={16} />
                      </button>
                      <button
                        type="button"
                        onClick={() => moveSection(index, 1)}
                        disabled={index === sections.length - 1}
                        title="Move down"
                        className="rounded p-1.5 text-gray-400 hover:bg-gray-50 hover:text-gray-700 disabled:opacity-25 disabled:hover:bg-transparent"
                      >
                        <ChevronDown size={16} />
                      </button>

                      {def.toggleable && (
                        <button
                          type="button"
                          onClick={() => toggleVisible(section.type)}
                          title={isHidden ? "Hidden. Click to show" : "Visible. Click to hide"}
                          className="rounded p-1.5 text-gray-400 hover:bg-gray-50 hover:text-gray-700"
                        >
                          {isHidden ? <EyeOff size={16} /> : <Eye size={16} />}
                        </button>
                      )}

                      {!def.autoManaged && (
                        <button
                          type="button"
                          onClick={() => editSection(section.type)}
                          className="ml-1 inline-flex items-center gap-1.5 rounded-lg border border-gray-200 px-2.5 py-1.5 text-xs font-medium text-gray-700 transition-colors hover:border-primary-300 hover:text-primary-600"
                        >
                          <Pencil size={13} /> Edit
                        </button>
                      )}

                      {def.removable && (
                        <button
                          type="button"
                          onClick={() => removeSection(section.type)}
                          title="Remove section"
                          className="ml-1 rounded p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-500"
                        >
                          <Trash2 size={16} />
                        </button>
                      )}
                    </div>
                  </li>
                );
              })}
            </ul>
          )}

          <div className="mt-6 flex flex-col gap-3 border-t border-gray-100 pt-4 sm:flex-row sm:items-center sm:justify-between">
            <p className={`text-xs ${dirty ? "text-amber-600" : "text-gray-400"}`}>
              {dirty ? "You have unsaved layout changes." : "Layout is up to date."}
            </p>
            <Button onClick={save} loading={saving} disabled={!dirty} className="w-full sm:w-auto">
              Save layout
            </Button>
          </div>
        </BuilderCard>

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
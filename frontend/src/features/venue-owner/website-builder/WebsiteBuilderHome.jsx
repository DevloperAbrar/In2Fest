import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import DashboardLayout from "../../../components/layout/DashboardLayout.jsx";
import { ownerSidebarItems } from "../ownerSidebarItems.js";
import { useVenue } from "../../../context/VenueContext.jsx";
import { venueService } from "../../../services/venueService";
import { showSuccess, showError } from "../../../components/common/Toast";
import { SECTION_TYPES } from "../../../lib/sectionLibrary";
import SectionPickerModal from "./SectionPickerModal.jsx";
import DisplayOptionsCard from "./DisplayOptionsCard.jsx";
import NavbarOptionsCard from "./NavbarOptionsCard.jsx";
import BuilderCard, { Switch, SaveBar } from "./BuilderCard.jsx";
import { BASE_DOMAIN } from "../../../lib/constants";
import {
  GripVertical,
  Trash2,
  Pencil,
  Plus,
  Copy,
  ExternalLink,
  ChevronUp,
  ChevronDown,
  Palette,
  LayoutList,
  Menu as MenuIcon,
  SlidersHorizontal,
  ArrowUpDown,
  Check
} from "lucide-react";

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

const TABS = [
  { key: "design", label: "Design", icon: Palette },
  { key: "sections", label: "Sections", icon: LayoutList },
  { key: "menu", label: "Menu", icon: MenuIcon },
  { key: "options", label: "Options", icon: SlidersHorizontal }
];

const ANIMATION_CSS = `
@keyframes wbInRight { from { opacity: 0; transform: translateX(28px); } to { opacity: 1; transform: none; } }
@keyframes wbInLeft { from { opacity: 0; transform: translateX(-28px); } to { opacity: 1; transform: none; } }
.wb-in-right { animation: wbInRight .26s cubic-bezier(.22,1,.36,1); }
.wb-in-left { animation: wbInLeft .26s cubic-bezier(.22,1,.36,1); }
@media (prefers-reduced-motion: reduce) { .wb-in-right, .wb-in-left { animation: none; } }
`;

export default function WebsiteBuilderHome() {
  const navigate = useNavigate();
  const { venue, refetchVenue } = useVenue();
  const [tab, setTab] = useState("design");
  const [dir, setDir] = useState(0);
  const [sections, setSections] = useState([]);
  const [dirty, setDirty] = useState(false);
  const [menuDirty, setMenuDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [arranging, setArranging] = useState(false);
  const [dragIndex, setDragIndex] = useState(null);
  const touchRef = useRef(null);

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

  const goTab = (key) => {
    if (key === tab) return;
    setDir(TABS.findIndex((t) => t.key === key) > TABS.findIndex((t) => t.key === tab) ? 1 : -1);
    setTab(key);
  };

  // Swipe left or right anywhere on the content to move between tabs.
  const onTouchStart = (e) => {
    const t = e.touches[0];
    const blocked = e.target.closest("input, textarea, select, [draggable='true']");
    touchRef.current = blocked ? null : { x: t.clientX, y: t.clientY };
  };
  const onTouchEnd = (e) => {
    const start = touchRef.current;
    touchRef.current = null;
    if (!start) return;
    const t = e.changedTouches[0];
    const dx = t.clientX - start.x;
    const dy = t.clientY - start.y;
    if (Math.abs(dx) < 70 || Math.abs(dx) < Math.abs(dy) * 1.5) return;
    const i = TABS.findIndex((x) => x.key === tab);
    const next = TABS[i + (dx < 0 ? 1 : -1)];
    if (next) goTab(next.key);
  };

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

  const moveSection = (index, d) => {
    const target = index + d;
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
      setArranging(false);
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

  const knownSections = sections.filter((s) => SECTION_TYPES[s.type]);

  const panelClass = (key) =>
    key === tab ? (dir > 0 ? "wb-in-right" : dir < 0 ? "wb-in-left" : "") : "hidden";

  return (
    <DashboardLayout sidebarItems={ownerSidebarItems} pageTitle="Website Builder">
      <style>{ANIMATION_CSS}</style>
      <div className="max-w-3xl space-y-4 pb-10">
        {/* Public link */}
        {publicUrl && (
          <div className="flex items-center gap-3 rounded-2xl border border-gray-100 bg-white p-3 pl-4 shadow-[0_1px_2px_rgba(16,24,40,0.04)]">
            <span className="relative flex h-2.5 w-2.5 flex-shrink-0">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-green-400 opacity-60" />
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-green-500" />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-[11px] font-medium text-gray-400">Your website is live</p>
              <p className="truncate text-sm font-semibold text-gray-900">{publicUrl.replace(/^https?:\/\//, "")}</p>
            </div>
            <button
              type="button"
              onClick={copyLink}
              aria-label="Copy link"
              className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl border border-gray-200 text-gray-600 transition-colors hover:bg-gray-50 active:scale-95"
            >
              <Copy size={16} />
            </button>
            <a
              href={publicUrl}
              target="_blank"
              rel="noreferrer"
              aria-label="Open site"
              className="flex h-10 flex-shrink-0 items-center gap-1.5 rounded-xl bg-primary-600 px-3.5 text-sm font-medium text-white transition-colors hover:bg-primary-700 active:scale-95"
            >
              <ExternalLink size={15} />
              <span className="hidden sm:inline">Open site</span>
              <span className="sm:hidden">Open</span>
            </a>
          </div>
        )}

        {/* Tabs */}
        <div role="tablist" aria-label="Website builder sections" className="grid grid-cols-4 gap-1 rounded-2xl bg-gray-100 p-1">
          {TABS.map((t) => {
            const Icon = t.icon;
            const active = t.key === tab;
            const showDot = (t.key === "sections" && dirty) || (t.key === "menu" && menuDirty);
            return (
              <button
                key={t.key}
                type="button"
                role="tab"
                aria-selected={active}
                onClick={() => goTab(t.key)}
                className={`relative flex flex-col items-center gap-1 rounded-xl py-2 text-[11.5px] font-medium transition-all duration-200 ${
                  active ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
                }`}
              >
                <Icon size={18} className={active ? "text-primary-600" : ""} />
                {t.label}
                {showDot && <span className="absolute right-2.5 top-1.5 h-2 w-2 rounded-full bg-amber-500" />}
              </button>
            );
          })}
        </div>

        {/* Panels. All stay mounted so unsaved edits are never lost when switching tabs. */}
        <div onTouchStart={onTouchStart} onTouchEnd={onTouchEnd}>
          {/* DESIGN */}
          <div role="tabpanel" className={panelClass("design")}>
            <BuilderCard title="Template" description="The look and feel of your public website.">
              <div className="overflow-hidden rounded-xl border border-gray-100 bg-gray-50">
                <img
                  src={activeTemplate.image}
                  alt={`${activeTemplate.name} template preview`}
                  className="h-48 w-full object-cover object-top sm:h-64"
                />
              </div>
              <div className="mt-4 flex items-center justify-between gap-3">
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-gray-900">{activeTemplate.name}</p>
                  <p className="text-xs text-gray-500">{activeTemplate.tagline}</p>
                </div>
                <button
                  type="button"
                  onClick={() => navigate("/dashboard/website/template")}
                  className="flex-shrink-0 rounded-xl border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:border-primary-300 hover:text-primary-600 active:scale-95"
                >
                  Change template
                </button>
              </div>
            </BuilderCard>
          </div>

          {/* SECTIONS */}
          <div role="tabpanel" className={panelClass("sections")}>
            <BuilderCard
              title="Page sections"
              description={
                arranging
                  ? "Move sections up or down, or remove the ones you don't need."
                  : "Turn sections on or off, or tap one to edit its content."
              }
            >
              <div className="mb-4 flex gap-2">
                {addableTypes.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setPickerOpen(true)}
                    className="flex flex-1 items-center justify-center gap-1.5 rounded-xl border border-gray-200 py-2.5 text-sm font-medium text-gray-700 transition-colors hover:border-primary-300 hover:text-primary-600 active:scale-95"
                  >
                    <Plus size={16} /> Add section
                  </button>
                )}
                {knownSections.length > 1 && (
                  <button
                    type="button"
                    onClick={() => setArranging((a) => !a)}
                    className={`flex flex-1 items-center justify-center gap-1.5 rounded-xl py-2.5 text-sm font-medium transition-colors active:scale-95 ${
                      arranging
                        ? "bg-primary-600 text-white"
                        : "border border-gray-200 text-gray-700 hover:border-primary-300 hover:text-primary-600"
                    }`}
                  >
                    {arranging ? <Check size={16} /> : <ArrowUpDown size={16} />}
                    {arranging ? "Done" : "Arrange"}
                  </button>
                )}
              </div>

              {knownSections.length === 0 ? (
                <div className="rounded-xl border-2 border-dashed border-gray-200 py-8 text-center text-sm text-gray-400">
                  No sections yet. Add your first one.
                </div>
              ) : (
                <ul className="space-y-2">
                  {sections.map((section, index) => {
                    const def = SECTION_TYPES[section.type];
                    if (!def) return null;
                    const Icon = def.icon;
                    const isHidden = section.visible === false;
                    const canEdit = !def.autoManaged;

                    return (
                      <li
                        key={section.type}
                        draggable={arranging}
                        onDragStart={() => handleDragStart(index)}
                        onDragOver={handleDragOver}
                        onDrop={() => handleDrop(index)}
                        className={`flex items-center gap-3 rounded-2xl border p-3 transition-colors ${
                          isHidden && !arranging ? "border-gray-100 bg-gray-50" : "border-gray-200 bg-white"
                        }`}
                      >
                        {arranging && (
                          <span className="hidden cursor-grab text-gray-300 md:block">
                            <GripVertical size={18} />
                          </span>
                        )}

                        <div className={`flex-shrink-0 rounded-xl p-2.5 ${def.color} ${isHidden ? "opacity-50" : ""}`}>
                          <Icon size={18} />
                        </div>

                        {arranging || !canEdit ? (
                          <div className={`min-w-0 flex-1 ${isHidden && !arranging ? "opacity-60" : ""}`}>
                            <div className="flex items-center gap-2">
                              <p className="truncate text-sm font-semibold text-gray-900">{def.label}</p>
                              {def.autoManaged && (
                                <span
                                  title="Filled automatically from your Marketplace reviews"
                                  className="flex-shrink-0 rounded-full bg-orange-50 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-orange-600"
                                >
                                  Auto
                                </span>
                              )}
                            </div>
                            <p className="truncate text-xs text-gray-500">
                              {isHidden ? "Hidden from website" : def.description}
                            </p>
                          </div>
                        ) : (
                          <button
                            type="button"
                            onClick={() => editSection(section.type)}
                            className={`min-w-0 flex-1 text-left ${isHidden ? "opacity-60" : ""}`}
                          >
                            <p className="truncate text-sm font-semibold text-gray-900">{def.label}</p>
                            <p className="truncate text-xs text-gray-500">
                              {isHidden ? "Hidden from website" : def.description}
                            </p>
                          </button>
                        )}

                        {arranging ? (
                          <div className="flex flex-shrink-0 items-center">
                            <button
                              type="button"
                              onClick={() => moveSection(index, -1)}
                              disabled={index === 0}
                              aria-label="Move up"
                              className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 disabled:opacity-25 disabled:hover:bg-transparent"
                            >
                              <ChevronUp size={18} />
                            </button>
                            <button
                              type="button"
                              onClick={() => moveSection(index, 1)}
                              disabled={index === sections.length - 1}
                              aria-label="Move down"
                              className="rounded-lg p-2 text-gray-500 hover:bg-gray-100 disabled:opacity-25 disabled:hover:bg-transparent"
                            >
                              <ChevronDown size={18} />
                            </button>
                            {def.removable && (
                              <button
                                type="button"
                                onClick={() => removeSection(section.type)}
                                aria-label="Remove section"
                                className="rounded-lg p-2 text-gray-400 hover:bg-red-50 hover:text-red-500"
                              >
                                <Trash2 size={17} />
                              </button>
                            )}
                          </div>
                        ) : (
                          <div className="flex flex-shrink-0 items-center gap-2">
                            {canEdit && (
                              <button
                                type="button"
                                onClick={() => editSection(section.type)}
                                aria-label={`Edit ${def.label}`}
                                className="flex h-9 w-9 items-center justify-center rounded-xl border border-gray-200 text-gray-500 transition-colors hover:border-primary-300 hover:text-primary-600 active:scale-95"
                              >
                                <Pencil size={15} />
                              </button>
                            )}
                            {def.toggleable && (
                              <Switch
                                checked={!isHidden}
                                onChange={() => toggleVisible(section.type)}
                                label={`Show ${def.label} on website`}
                              />
                            )}
                          </div>
                        )}
                      </li>
                    );
                  })}
                </ul>
              )}
            </BuilderCard>

            <SaveBar
              dirty={dirty}
              saving={saving}
              onSave={save}
              text="Layout changes not saved"
              buttonLabel="Save layout"
            />
          </div>

          {/* MENU */}
          <div role="tabpanel" className={panelClass("menu")}>
            <NavbarOptionsCard onDirtyChange={setMenuDirty} />
          </div>

          {/* OPTIONS */}
          <div role="tabpanel" className={panelClass("options")}>
            <DisplayOptionsCard />
          </div>
        </div>

        {pickerOpen && (
          <SectionPickerModal types={addableTypes} onSelect={addSection} onClose={() => setPickerOpen(false)} />
        )}
      </div>
    </DashboardLayout>
  );
}
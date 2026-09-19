import React, { useState, useEffect } from "react";
import { AlertCircle, Plus, X } from "lucide-react";
import Button from "../../../../components/common/Button";
import Select from "../../../../components/common/Select";

let idCounter = 0;
const makeId = () => `svc-${Date.now()}-${idCounter++}`;

function normalizeGroups(venue) {
  const detail = venue.marketplace_services_detail;
  if (Array.isArray(detail) && detail.length > 0) {
    return detail.map((g) => ({
      id: makeId(),
      name: g?.name || "",
      options: Array.isArray(g?.options) ? g.options.filter(Boolean) : []
    }));
  }
  // Backward compatibility: older venues only have the flat string list.
  if (Array.isArray(venue.marketplace_services) && venue.marketplace_services.length > 0) {
    return venue.marketplace_services.map((name) => ({ id: makeId(), name, options: [] }));
  }
  return [];
}

function flattenGroups(groups) {
  const flat = [];
  groups.forEach((g) => {
    const name = (g.name || "").trim();
    if (!name) return;
    flat.push(name);
    (g.options || []).forEach((opt) => {
      const trimmed = (opt || "").trim();
      if (trimmed) flat.push(trimmed);
    });
  });
  return Array.from(new Set(flat));
}

export default function ServicesChecklistTab({ venue, categories, onSave, saving, onNext, onBack }) {
  const [groups, setGroups] = useState(() => normalizeGroups(venue));
  const [selectedSlug, setSelectedSlug] = useState("");
  const [optionInputs, setOptionInputs] = useState({}); // { [groupId]: draftText }
  const [triedNext, setTriedNext] = useState(false);

  useEffect(() => {
    setGroups(normalizeGroups(venue));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [venue.marketplace_services_detail, venue.marketplace_services]);

  if (!venue.business_category) {
    return (
      <div className="space-y-5">
        <div className="text-sm text-gray-500">
          Select a primary category in the Business Details tab first  - the options here come from it.
        </div>
        <div className="flex items-center justify-between pt-2">
          {onBack ? <Button variant="outline" onClick={onBack}>Back</Button> : <span />}
        </div>
      </div>
    );
  }

  const categoryLookup = new Map((categories || []).map((c) => [c.slug, c.name]));

  // The categories the vendor picked during registration/Business Details:
  // primary category + up to 2 secondary categories.
  const registeredSlugs = Array.from(
    new Set([venue.business_category, ...(venue.secondary_categories || [])].filter(Boolean))
  );
  const registeredCategoryOptions = registeredSlugs.map((slug) => ({
    slug,
    name: categoryLookup.get(slug) || slug
  }));

  const existingNames = groups.map((g) => g.name.trim().toLowerCase());
  const availableCategoryOptions = registeredCategoryOptions.filter(
    (opt) => !existingNames.includes(opt.name.trim().toLowerCase())
  );

  const addGroup = (name) => {
    const trimmed = (name || "").trim();
    if (!trimmed) return;
    if (existingNames.includes(trimmed.toLowerCase())) return;
    setGroups((prev) => [...prev, { id: makeId(), name: trimmed, options: [] }]);
  };

  const handleAddSelected = () => {
    if (!selectedSlug) return;
    addGroup(categoryLookup.get(selectedSlug) || selectedSlug);
    setSelectedSlug("");
  };

  const removeGroup = (id) => {
    setGroups((prev) => prev.filter((g) => g.id !== id));
    setOptionInputs((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
  };

  const addOption = (groupId) => {
    const draft = (optionInputs[groupId] || "").trim();
    if (!draft) return;
    setGroups((prev) =>
      prev.map((g) => {
        if (g.id !== groupId) return g;
        if (g.options.some((o) => o.toLowerCase() === draft.toLowerCase())) return g;
        return { ...g, options: [...g.options, draft] };
      })
    );
    setOptionInputs((prev) => ({ ...prev, [groupId]: "" }));
  };

  const removeOption = (groupId, option) => {
    setGroups((prev) =>
      prev.map((g) =>
        g.id === groupId ? { ...g, options: g.options.filter((o) => o !== option) } : g
      )
    );
  };

  const canGoNext = groups.length > 0;

  const handleNext = () => {
    setTriedNext(true);
    if (canGoNext) onNext();
  };

  const handleSave = () => {
    onSave({
      marketplace_services: flattenGroups(groups),
      marketplace_services_detail: groups.map((g) => ({ name: g.name, options: g.options }))
    });
  };

  return (
    <div className="space-y-5">
      <div className="text-sm text-gray-500">
        Pick from the categories you registered under and break each one into sub-services if it
        helps customers (e.g. "Photography" &rarr; "Inhouse shoot", "Outdoor shoot").
      </div>

      {/* Add a service from the vendor's own registered categories */}
      {availableCategoryOptions.length > 0 ? (
        <div className="flex gap-2">
          <Select
            className="flex-1"
            options={[
              { value: "", label: "Select a category you registered under" },
              ...availableCategoryOptions.map((opt) => ({ value: opt.slug, label: opt.name }))
            ]}
            value={selectedSlug}
            onChange={(e) => setSelectedSlug(e.target.value)}
          />
          <Button type="button" onClick={handleAddSelected} disabled={!selectedSlug}>
            <Plus size={16} className="mr-1" /> Add
          </Button>
        </div>
      ) : (
        <div className="text-xs text-gray-400">
          All your registered categories have been added below. Add more categories in Business
          Details if you offer more.
        </div>
      )}

      {/* Added services */}
      <div className="space-y-3">
        {groups.map((g) => (
          <div key={g.id} className="border border-gray-200 rounded-lg p-3">
            <div className="flex items-center justify-between">
              <span className="text-sm font-medium text-gray-800">{g.name}</span>
              <button
                type="button"
                onClick={() => removeGroup(g.id)}
                className="text-gray-400 hover:text-red-500"
                aria-label={`Remove ${g.name}`}
              >
                <X size={16} />
              </button>
            </div>

            {g.options.length > 0 && (
              <div className="flex flex-wrap gap-2 mt-2">
                {g.options.map((opt) => (
                  <span
                    key={opt}
                    className="flex items-center gap-1 bg-gray-100 text-gray-700 text-xs rounded-full px-3 py-1"
                  >
                    {opt}
                    <button
                      type="button"
                      onClick={() => removeOption(g.id, opt)}
                      className="hover:text-red-500"
                      aria-label={`Remove ${opt}`}
                    >
                      <X size={12} />
                    </button>
                  </span>
                ))}
              </div>
            )}

            <div className="flex gap-2 mt-2">
              <input
                type="text"
                value={optionInputs[g.id] || ""}
                onChange={(e) => setOptionInputs((prev) => ({ ...prev, [g.id]: e.target.value }))}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    addOption(g.id);
                  }
                }}
                placeholder={`Add a sub-service under "${g.name}" (optional)`}
                className="flex-1 border border-gray-200 rounded-lg px-3 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-primary-200"
              />
              <Button type="button" variant="outline" onClick={() => addOption(g.id)}>
                <Plus size={14} />
              </Button>
            </div>
          </div>
        ))}

        {groups.length === 0 && (
          <div className="text-sm text-gray-400 border border-dashed border-gray-200 rounded-lg p-4 text-center">
            No services added yet. Select a category above to add your first one.
          </div>
        )}
      </div>

      {triedNext && !canGoNext && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-start gap-2">
          <AlertCircle size={16} className="text-red-500 mt-0.5 flex-shrink-0" />
          <p className="text-sm text-red-700">Please add at least one service before continuing.</p>
        </div>
      )}

      <div className="flex items-center justify-between pt-2">
        {onBack ? <Button variant="outline" onClick={onBack}>Back</Button> : <span />}
        <div className="flex items-center gap-2">
          <Button loading={saving} onClick={handleSave}>
            Save Services
          </Button>
          {onNext && (
            <Button variant="outline" onClick={handleNext}>Next</Button>
          )}
        </div>
      </div>
    </div>
  );
}
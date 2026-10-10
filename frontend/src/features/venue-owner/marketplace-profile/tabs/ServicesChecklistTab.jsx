import React, { useState, useEffect } from "react";
import { AlertCircle, Plus, X } from "lucide-react";
import Button from "../../../../components/common/Button";

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

export default function ServicesChecklistTab({ venue, categories, schema, onSave, saving, onNext, onBack }) {
  const [groups, setGroups] = useState(() => normalizeGroups(venue));
  const [newName, setNewName] = useState("");
  const [optionInputs, setOptionInputs] = useState({}); // { [groupId]: draftText }
  const [triedNext, setTriedNext] = useState(false);

  useEffect(() => {
    setGroups(normalizeGroups(venue));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [venue.marketplace_services_detail, venue.marketplace_services]);

  const L = schema.labels;

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

  // The vendor's own registered categories are offered as quick-add chips too.
  const registeredNames = Array.from(
    new Set([venue.business_category, ...(venue.secondary_categories || [])].filter(Boolean))
  ).map((slug) => categoryLookup.get(slug) || slug);

  const existingNames = groups.map((g) => g.name.trim().toLowerCase());

  const suggestions = Array.from(new Set([...(schema.services_suggestions || []), ...registeredNames])).filter(
    (name) => !existingNames.includes(name.trim().toLowerCase())
  );

  const addGroup = (name) => {
    const trimmed = (name || "").trim().slice(0, 60);
    if (!trimmed) return;
    if (existingNames.includes(trimmed.toLowerCase())) return;
    setGroups((prev) => [...prev, { id: makeId(), name: trimmed, options: [] }]);
  };

  const handleAddTyped = () => {
    addGroup(newName);
    setNewName("");
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
      <div className="text-sm text-gray-500">{L.servicesHint}</div>

      {/* Type your own */}
      <div className="flex gap-2">
        <input
          type="text"
          value={newName}
          maxLength={60}
          onChange={(e) => setNewName(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              handleAddTyped();
            }
          }}
          placeholder={L.servicesPlaceholder}
          className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
        />
        <Button type="button" onClick={handleAddTyped} disabled={!newName.trim()}>
          <Plus size={16} className="mr-1" /> Add
        </Button>
      </div>

      {/* Quick add suggestions */}
      {suggestions.length > 0 && (
        <div>
          <p className="text-xs text-gray-400 mb-2">Quick add</p>
          <div className="flex flex-wrap gap-2">
            {suggestions.map((name) => (
              <button
                key={name}
                type="button"
                onClick={() => addGroup(name)}
                className="flex items-center gap-1 text-xs text-gray-600 border border-dashed border-gray-300 rounded-full px-3 py-1.5 hover:border-primary-400 hover:text-primary-600 hover:bg-primary-50 transition-colors"
              >
                <Plus size={12} /> {name}
              </button>
            ))}
          </div>
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
                placeholder={`Add a sub-item under "${g.name}" (optional)`}
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
            Nothing added yet. Type above or tap a quick-add suggestion to add your first one.
          </div>
        )}
      </div>

      {triedNext && !canGoNext && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-start gap-2">
          <AlertCircle size={16} className="text-red-500 mt-0.5 flex-shrink-0" />
          <p className="text-sm text-red-700">Please add at least one item before continuing.</p>
        </div>
      )}

      <div className="flex items-center justify-between pt-2">
        {onBack ? <Button variant="outline" onClick={onBack}>Back</Button> : <span />}
        <div className="flex items-center gap-2">
          <Button loading={saving} onClick={handleSave}>
            Save
          </Button>
          {onNext && (
            <Button variant="outline" onClick={handleNext}>Next</Button>
          )}
        </div>
      </div>
    </div>
  );
}
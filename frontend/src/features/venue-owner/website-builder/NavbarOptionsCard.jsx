import React, { useEffect, useMemo, useState } from "react";
import { useVenue } from "../../../context/VenueContext.jsx";
import { venueService } from "../../../services/venueService";
import { showSuccess, showError } from "../../../components/common/Toast";
import { getNavCandidates, getNavSetting, MAX_INLINE_NAV_LINKS } from "../../../lib/navItems";
import { Menu, GripVertical, ChevronUp, ChevronDown, ChevronDown as CaretDown, X, Plus } from "lucide-react";

export default function NavbarOptionsCard() {
  const { venue, refetchVenue } = useVenue();
  const candidates = useMemo(() => getNavCandidates(venue), [venue]);
  const byKey = useMemo(() => Object.fromEntries(candidates.map((c) => [c.key, c])), [candidates]);

  const [onKeys, setOnKeys] = useState([]);   // shown in menu, in order
  const [offKeys, setOffKeys] = useState([]); // not in menu
  const [labels, setLabels] = useState({});   // custom menu names
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [dragKey, setDragKey] = useState(null);
  const [overKey, setOverKey] = useState(null);

  const load = (list, useStored) => {
    const on = [];
    const off = [];
    const lbl = {};
    list.forEach((c) => {
      const s = useStored ? getNavSetting(venue, c) : { show: c.defaultShow, customLabel: "" };
      (s.show ? on : off).push(c.key);
      if (s.customLabel) lbl[c.key] = s.customLabel;
    });
    setOnKeys(on);
    setOffKeys(off);
    setLabels(lbl);
  };

  // Re-sync from the saved venue, but never overwrite unsaved edits.
  useEffect(() => {
    if (!dirty) load(candidates, true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [venue]);

  if (!venue || candidates.length === 0) return null;

  const touch = () => setDirty(true);
  const nameOf = (key) => (labels[key] || "").trim() || byKey[key]?.label || key;

  const move = (key, dir) => {
    const i = onKeys.indexOf(key);
    const j = i + dir;
    if (i < 0 || j < 0 || j >= onKeys.length) return;
    const next = [...onKeys];
    [next[i], next[j]] = [next[j], next[i]];
    setOnKeys(next);
    touch();
  };

  const dropOn = (targetKey) => {
    const from = onKeys.indexOf(dragKey);
    const to = onKeys.indexOf(targetKey);
    setDragKey(null);
    setOverKey(null);
    if (from < 0 || to < 0 || from === to) return;
    const next = [...onKeys];
    const [moved] = next.splice(from, 1);
    next.splice(to, 0, moved);
    setOnKeys(next);
    touch();
  };

  const addKey = (key) => {
    setOffKeys((o) => o.filter((k) => k !== key));
    setOnKeys((o) => [...o, key]);
    touch();
  };

  const removeKey = (key) => {
    setOnKeys((o) => o.filter((k) => k !== key));
    setOffKeys((o) => [key, ...o]);
    touch();
  };

  const resetToDefault = () => {
    load(getNavCandidates(venue, { ignoreOrder: true }), false);
    touch();
  };

  const save = async () => {
    setSaving(true);
    try {
      const items = { ...(venue.nav_config?.items || {}) };
      candidates.forEach((c) => {
        const entry = { show: onKeys.includes(c.key) };
        const label = (labels[c.key] || "").trim();
        if (label && label !== c.label) entry.label = label;
        items[c.key] = entry;
      });

      // Menu order = shown items first (in order), then the rest.
      const order = [...onKeys, ...offKeys].filter((k) => byKey[k]);
      const leftover = (venue.nav_config?.order || []).filter((k) => !order.includes(k));

      await venueService.update(venue.id, { nav_config: { items, order: [...order, ...leftover] } });
      await refetchVenue();
      setDirty(false);
      showSuccess("Website menu updated");
    } catch (err) {
      showError(err?.response?.data?.message || "Could not save the menu. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const shown = onKeys.filter((k) => byKey[k]);
  const hidden = offKeys.filter((k) => byKey[k]);
  const inlinePreview = shown.slice(0, MAX_INLINE_NAV_LINKS);
  const morePreview = shown.slice(MAX_INLINE_NAV_LINKS);

  return (
    <div className="bg-white border border-gray-100 rounded-xl p-5 mb-6">
      {/* Header */}
      <div className="flex items-start justify-between gap-3 mb-1">
        <div className="flex items-center gap-2">
          <Menu size={16} className="text-gray-400" />
          <h3 className="text-sm font-semibold text-gray-800">Website menu (navbar)</h3>
          <span className="text-[11px] font-semibold text-primary-600 bg-primary-50 px-2 py-0.5 rounded-full">
            {shown.length} in menu
          </span>
        </div>
        <button
          type="button"
          onClick={resetToDefault}
          className="text-xs font-medium text-gray-400 hover:text-primary-600"
        >
          Reset to default
        </button>
      </div>
      <p className="text-xs text-gray-400 mb-4">
        Pick the sections that get a link in your website's top menu, drag them (or use the arrows) to set the order,
        and rename any link.
      </p>

      {/* Live preview */}
      <div className="rounded-lg bg-stone-900 px-4 py-3 mb-5">
        <p className="text-[10px] uppercase tracking-widest text-stone-500 mb-2">Menu preview</p>
        {shown.length === 0 ? (
          <p className="text-xs text-stone-400">No links selected. Visitors will see only your name and buttons.</p>
        ) : (
          <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs font-medium text-white">
            {inlinePreview.map((k) => (
              <span key={k}>{nameOf(k)}</span>
            ))}
            {morePreview.length > 0 && (
              <span className="flex items-center gap-1 text-stone-300">
                More <CaretDown size={12} />
                <span className="text-[10px] text-stone-500">({morePreview.length})</span>
              </span>
            )}
          </div>
        )}
      </div>

      {/* In the menu (ordered) */}
      <p className="text-xs font-semibold text-gray-600 mb-2">Shown in menu</p>
      {shown.length === 0 ? (
        <div className="border-2 border-dashed border-gray-200 rounded-lg py-5 text-center text-xs text-gray-400 mb-5">
          Nothing here yet. Add sections from the list below.
        </div>
      ) : (
        <ul className="space-y-2 mb-5">
          {shown.map((key, i) => {
            const c = byKey[key];
            const inMore = i >= MAX_INLINE_NAV_LINKS;
            return (
              <li
                key={key}
                onDragOver={(e) => {
                  if (dragKey) {
                    e.preventDefault();
                    setOverKey(key);
                  }
                }}
                onDrop={() => dropOn(key)}
                className={`flex items-center gap-3 px-3 py-2.5 bg-white border rounded-lg transition-all ${
                  overKey === key && dragKey !== key
                    ? "border-primary-400 ring-2 ring-primary-100"
                    : "border-gray-100 hover:border-gray-200"
                } ${dragKey === key ? "opacity-40" : ""}`}
              >
                <span
                  draggable
                  title="Drag to reorder"
                  onDragStart={(e) => {
                    setDragKey(key);
                    e.dataTransfer.effectAllowed = "move";
                    e.dataTransfer.setData("text/plain", key);
                    const row = e.currentTarget.closest("li");
                    if (row) e.dataTransfer.setDragImage(row, 20, 20);
                  }}
                  onDragEnd={() => {
                    setDragKey(null);
                    setOverKey(null);
                  }}
                  className="cursor-grab active:cursor-grabbing text-gray-300 hover:text-gray-500"
                >
                  <GripVertical size={18} />
                </span>

                <span className="w-6 h-6 flex-shrink-0 rounded-full bg-primary-50 text-primary-600 text-xs font-bold flex items-center justify-center">
                  {i + 1}
                </span>

                <div className="flex-1 min-w-0 flex flex-col sm:flex-row sm:items-center gap-2">
                  <div className="sm:w-44 min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate">{c.label}</p>
                    {inMore && <p className="text-[10px] text-amber-600">Goes under "More"</p>}
                  </div>
                  <input
                    type="text"
                    value={labels[key] || ""}
                    maxLength={24}
                    placeholder={`Menu name (${c.label})`}
                    onChange={(e) => {
                      setLabels((l) => ({ ...l, [key]: e.target.value }));
                      touch();
                    }}
                    className="flex-1 min-w-0 text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:border-primary-400"
                  />
                </div>

                <div className="flex items-center flex-shrink-0">
                  <button
                    type="button"
                    onClick={() => move(key, -1)}
                    disabled={i === 0}
                    title="Move up"
                    className="p-1.5 rounded text-gray-400 hover:text-gray-700 hover:bg-gray-50 disabled:opacity-25 disabled:hover:bg-transparent"
                  >
                    <ChevronUp size={16} />
                  </button>
                  <button
                    type="button"
                    onClick={() => move(key, 1)}
                    disabled={i === shown.length - 1}
                    title="Move down"
                    className="p-1.5 rounded text-gray-400 hover:text-gray-700 hover:bg-gray-50 disabled:opacity-25 disabled:hover:bg-transparent"
                  >
                    <ChevronDown size={16} />
                  </button>
                  <button
                    type="button"
                    onClick={() => removeKey(key)}
                    title="Remove from menu"
                    className="p-1.5 rounded text-gray-400 hover:text-red-500 hover:bg-red-50"
                  >
                    <X size={16} />
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {/* Not in the menu */}
      {hidden.length > 0 && (
        <>
          <p className="text-xs font-semibold text-gray-600 mb-2">Not in menu</p>
          <div className="flex flex-wrap gap-2 mb-2">
            {hidden.map((key) => (
              <button
                key={key}
                type="button"
                onClick={() => addKey(key)}
                className="flex items-center gap-1.5 text-sm text-gray-600 border border-dashed border-gray-300 rounded-full pl-3 pr-3.5 py-1.5 hover:border-primary-400 hover:text-primary-600 hover:bg-primary-50 transition-colors"
              >
                <Plus size={14} /> {byKey[key].label}
              </button>
            ))}
          </div>
        </>
      )}

      {/* Footer */}
      <div className="mt-5 flex items-center justify-end gap-3">
        {dirty && <span className="text-xs text-amber-600">Unsaved changes</span>}
        <button
          type="button"
          onClick={save}
          disabled={!dirty || saving}
          className="px-5 py-2 rounded-lg text-sm font-semibold text-white bg-primary-600 hover:bg-primary-700 disabled:opacity-40 disabled:cursor-not-allowed transition-colors"
        >
          {saving ? "Saving..." : "Save menu"}
        </button>
      </div>
    </div>
  );
}
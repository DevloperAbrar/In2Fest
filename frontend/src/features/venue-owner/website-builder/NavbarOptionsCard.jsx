import React, { useEffect, useMemo, useState } from "react";
import { useVenue } from "../../../context/VenueContext.jsx";
import { venueService } from "../../../services/venueService";
import { showSuccess, showError } from "../../../components/common/Toast";
import { getNavCandidates, getNavSetting, MAX_INLINE_NAV_LINKS } from "../../../lib/navItems";
import { GripVertical, ChevronUp, ChevronDown, X, Plus, Pencil } from "lucide-react";
import BuilderCard, { SaveBar } from "./BuilderCard.jsx";

export default function NavbarOptionsCard({ onDirtyChange }) {
  const { venue, refetchVenue } = useVenue();
  const candidates = useMemo(() => getNavCandidates(venue), [venue]);
  const byKey = useMemo(() => Object.fromEntries(candidates.map((c) => [c.key, c])), [candidates]);

  const [onKeys, setOnKeys] = useState([]); // shown in menu, in order
  const [offKeys, setOffKeys] = useState([]); // not in menu
  const [labels, setLabels] = useState({}); // custom menu names
  const [dirty, setDirty] = useState(false);
  const [saving, setSaving] = useState(false);
  const [dragKey, setDragKey] = useState(null);
  const [overKey, setOverKey] = useState(null);
  const [editKey, setEditKey] = useState(null);

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

  useEffect(() => {
    if (onDirtyChange) onDirtyChange(dirty);
  }, [dirty, onDirtyChange]);

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
    if (editKey === key) setEditKey(null);
    touch();
  };

  const resetToDefault = () => {
    load(getNavCandidates(venue, { ignoreOrder: true }), false);
    setEditKey(null);
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
      setEditKey(null);
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
    <div>
      <BuilderCard
        title="Website menu"
        description="The links in your website's top menu. Set their order and rename them."
        action={
          <button
            type="button"
            onClick={resetToDefault}
            className="text-xs font-medium text-gray-500 hover:text-primary-600"
          >
            Reset
          </button>
        }
      >
        {/* Live preview */}
        <div className="mb-5 rounded-xl bg-stone-900 px-4 py-3.5">
          <p className="mb-2 text-[10px] font-medium uppercase tracking-widest text-stone-500">How your menu looks</p>
          {shown.length === 0 ? (
            <p className="text-xs text-stone-400">No links selected. Visitors will see only your name and buttons.</p>
          ) : (
            <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 text-xs font-medium text-white">
              {inlinePreview.map((k) => (
                <span key={k}>{nameOf(k)}</span>
              ))}
              {morePreview.length > 0 && (
                <span className="flex items-center gap-1 text-stone-300">
                  More <ChevronDown size={12} />
                  <span className="text-[10px] text-stone-500">({morePreview.length})</span>
                </span>
              )}
            </div>
          )}
        </div>

        {/* In the menu (ordered) */}
        <div className="mb-2 flex items-center justify-between">
          <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">In the menu</p>
          <span className="rounded-full bg-primary-50 px-2.5 py-0.5 text-[11px] font-semibold text-primary-600">
            {shown.length} selected
          </span>
        </div>

        {shown.length === 0 ? (
          <div className="rounded-xl border-2 border-dashed border-gray-200 py-6 text-center text-sm text-gray-400">
            Nothing here yet. Add links from the list below.
          </div>
        ) : (
          <ul className="space-y-2">
            {shown.map((key, i) => {
              const c = byKey[key];
              const inMore = i >= MAX_INLINE_NAV_LINKS;
              const custom = (labels[key] || "").trim();
              const editing = editKey === key;
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
                  className={`rounded-xl border bg-white transition-colors ${
                    overKey === key && dragKey !== key ? "border-primary-400 ring-2 ring-primary-100" : "border-gray-200"
                  } ${dragKey === key ? "opacity-40" : ""}`}
                >
                  <div className="flex items-center gap-2 py-2 pl-3 pr-1.5">
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
                      className="hidden cursor-grab text-gray-300 hover:text-gray-500 active:cursor-grabbing md:block"
                    >
                      <GripVertical size={18} />
                    </span>

                    <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-gray-100 text-[11px] font-semibold text-gray-600">
                      {i + 1}
                    </span>

                    <button
                      type="button"
                      onClick={() => setEditKey(editing ? null : key)}
                      className="min-w-0 flex-1 py-1 text-left"
                    >
                      <p className="truncate text-sm font-medium text-gray-900">{nameOf(key)}</p>
                      {custom && custom !== c.label ? (
                        <p className="truncate text-[11px] text-gray-400">Original: {c.label}</p>
                      ) : inMore ? (
                        <p className="text-[11px] text-amber-600">Goes under "More"</p>
                      ) : null}
                    </button>

                    <button
                      type="button"
                      onClick={() => setEditKey(editing ? null : key)}
                      title="Rename"
                      className={`rounded-lg p-2 transition-colors ${
                        editing ? "bg-primary-50 text-primary-600" : "text-gray-400 hover:bg-gray-50 hover:text-gray-700"
                      }`}
                    >
                      <Pencil size={15} />
                    </button>
                    <div className="flex flex-shrink-0 items-center">
                      <button
                        type="button"
                        onClick={() => move(key, -1)}
                        disabled={i === 0}
                        title="Move up"
                        className="rounded-lg p-2 text-gray-400 hover:bg-gray-50 hover:text-gray-700 disabled:opacity-25 disabled:hover:bg-transparent"
                      >
                        <ChevronUp size={16} />
                      </button>
                      <button
                        type="button"
                        onClick={() => move(key, 1)}
                        disabled={i === shown.length - 1}
                        title="Move down"
                        className="rounded-lg p-2 text-gray-400 hover:bg-gray-50 hover:text-gray-700 disabled:opacity-25 disabled:hover:bg-transparent"
                      >
                        <ChevronDown size={16} />
                      </button>
                      <button
                        type="button"
                        onClick={() => removeKey(key)}
                        title="Remove from menu"
                        className="rounded-lg p-2 text-gray-400 hover:bg-red-50 hover:text-red-500"
                      >
                        <X size={16} />
                      </button>
                    </div>
                  </div>

                  {editing && (
                    <div className="border-t border-gray-100 px-3 pb-3 pt-2.5">
                      <label className="mb-1 block text-[11px] font-medium text-gray-500">Menu name</label>
                      <input
                        type="text"
                        autoFocus
                        value={labels[key] || ""}
                        maxLength={24}
                        placeholder={c.label}
                        onChange={(e) => {
                          setLabels((l) => ({ ...l, [key]: e.target.value }));
                          touch();
                        }}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") setEditKey(null);
                        }}
                        className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-100"
                      />
                      <p className="mt-1 text-[11px] text-gray-400">Leave empty to use "{c.label}".</p>
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}

        {/* Not in the menu */}
        {hidden.length > 0 && (
          <div className="mt-6">
            <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">Not in the menu</p>
            <div className="flex flex-wrap gap-2">
              {hidden.map((key) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => addKey(key)}
                  className="flex items-center gap-1.5 rounded-full border border-dashed border-gray-300 py-2 pl-3 pr-3.5 text-sm text-gray-600 transition-colors hover:border-primary-400 hover:bg-primary-50 hover:text-primary-600 active:scale-95"
                >
                  <Plus size={14} /> {byKey[key].label}
                </button>
              ))}
            </div>
          </div>
        )}
      </BuilderCard>

      <SaveBar dirty={dirty} saving={saving} onSave={save} text="Menu changes not saved" buttonLabel="Save menu" />
    </div>
  );
}
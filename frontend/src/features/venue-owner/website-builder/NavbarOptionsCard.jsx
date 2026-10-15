import React, { useEffect, useMemo, useState } from "react";
import { useVenue } from "../../../context/VenueContext.jsx";
import { venueService } from "../../../services/venueService";
import { showSuccess, showError } from "../../../components/common/Toast";
import Button from "../../../components/common/Button";
import { getNavCandidates, getNavSetting, MAX_INLINE_NAV_LINKS } from "../../../lib/navItems";
import { GripVertical, ChevronUp, ChevronDown, ChevronDown as CaretDown, X, Plus } from "lucide-react";
import BuilderCard from "./BuilderCard.jsx";

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
    <BuilderCard
      step="3"
      title="Website menu"
      description="Choose the links in your website's top menu, set their order and rename them."
      action={
        <>
          <span className="rounded-full bg-primary-50 px-2.5 py-1 text-[11px] font-semibold text-primary-600">
            {shown.length} in menu
          </span>
          <button
            type="button"
            onClick={resetToDefault}
            className="text-xs font-medium text-gray-500 hover:text-primary-600"
          >
            Reset to default
          </button>
        </>
      }
    >
      {/* Live preview */}
      <div className="mb-6 rounded-xl bg-stone-900 px-4 py-3.5">
        <p className="mb-2 text-[10px] font-medium uppercase tracking-widest text-stone-500">How your menu looks</p>
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
      <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">In the menu</p>
      {shown.length === 0 ? (
        <div className="mb-6 rounded-xl border-2 border-dashed border-gray-200 py-6 text-center text-sm text-gray-400">
          Nothing here yet. Add sections from the list below.
        </div>
      ) : (
        <ul className="mb-6 space-y-2">
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
                className={`flex flex-wrap items-center gap-x-3 gap-y-2 rounded-xl border bg-white px-3 py-2.5 transition-colors sm:flex-nowrap ${
                  overKey === key && dragKey !== key
                    ? "border-primary-400 ring-2 ring-primary-100"
                    : "border-gray-200 hover:border-gray-300"
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
                  className="hidden cursor-grab text-gray-300 hover:text-gray-500 active:cursor-grabbing sm:block"
                >
                  <GripVertical size={18} />
                </span>

                <span className="flex h-6 w-6 flex-shrink-0 items-center justify-center rounded-full bg-gray-100 text-xs font-semibold text-gray-600">
                  {i + 1}
                </span>

                <div className="min-w-0 flex-1 basis-40">
                  <p className="truncate text-sm font-medium text-gray-900">{c.label}</p>
                  {inMore && <p className="text-[11px] text-amber-600">Goes under "More"</p>}
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
                  className="order-last w-full min-w-0 rounded-lg border border-gray-200 px-3 py-1.5 text-sm focus:border-primary-400 focus:outline-none focus:ring-2 focus:ring-primary-100 sm:order-none sm:w-52"
                />

                <div className="ml-auto flex flex-shrink-0 items-center sm:ml-0">
                  <button
                    type="button"
                    onClick={() => move(key, -1)}
                    disabled={i === 0}
                    title="Move up"
                    className="rounded p-1.5 text-gray-400 hover:bg-gray-50 hover:text-gray-700 disabled:opacity-25 disabled:hover:bg-transparent"
                  >
                    <ChevronUp size={16} />
                  </button>
                  <button
                    type="button"
                    onClick={() => move(key, 1)}
                    disabled={i === shown.length - 1}
                    title="Move down"
                    className="rounded p-1.5 text-gray-400 hover:bg-gray-50 hover:text-gray-700 disabled:opacity-25 disabled:hover:bg-transparent"
                  >
                    <ChevronDown size={16} />
                  </button>
                  <button
                    type="button"
                    onClick={() => removeKey(key)}
                    title="Remove from menu"
                    className="rounded p-1.5 text-gray-400 hover:bg-red-50 hover:text-red-500"
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
          <p className="mb-2 text-xs font-semibold uppercase tracking-wide text-gray-500">Not in the menu</p>
          <div className="flex flex-wrap gap-2">
            {hidden.map((key) => (
              <button
                key={key}
                type="button"
                onClick={() => addKey(key)}
                className="flex items-center gap-1.5 rounded-full border border-dashed border-gray-300 py-1.5 pl-3 pr-3.5 text-sm text-gray-600 transition-colors hover:border-primary-400 hover:bg-primary-50 hover:text-primary-600"
              >
                <Plus size={14} /> {byKey[key].label}
              </button>
            ))}
          </div>
        </>
      )}

      {/* Footer */}
      <div className="mt-6 flex flex-col gap-3 border-t border-gray-100 pt-4 sm:flex-row sm:items-center sm:justify-between">
        <p className={`text-xs ${dirty ? "text-amber-600" : "text-gray-400"}`}>
          {dirty ? "You have unsaved changes." : "Menu is up to date."}
        </p>
        <Button onClick={save} loading={saving} disabled={!dirty} className="w-full sm:w-auto">
          Save menu
        </Button>
      </div>
    </BuilderCard>
  );
}
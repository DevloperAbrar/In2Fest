import React, { useEffect, useMemo, useState } from "react";
import { Check, Search, ChevronDown } from "lucide-react";
import { ICON_GROUPS, SERVICE_ICONS, resolveServiceIcon } from "../../../lib/serviceIcons";

export default function ServiceIconPicker({ value, onChange, defaultGroup = "general" }) {
  const startGroup = ICON_GROUPS.some((g) => g.key === defaultGroup) ? defaultGroup : "all";
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [group, setGroup] = useState(startGroup);

  useEffect(() => {
    setGroup(startGroup);
  }, [startGroup]);

  const selected = resolveServiceIcon(value);
  const SelectedIcon = selected?.Icon;
  const q = query.trim().toLowerCase();

  const list = useMemo(
    () =>
      SERVICE_ICONS.filter((i) => {
        if (q) return `${i.label} ${i.keywords} ${i.key}`.toLowerCase().includes(q);
        return group === "all" || i.group === group;
      }),
    [q, group]
  );

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex items-center gap-3 border border-gray-200 bg-white rounded-lg px-3 py-2 hover:border-primary-300 transition-colors"
      >
        <span className="w-9 h-9 rounded-lg bg-primary-50 text-primary-600 flex items-center justify-center">
          {SelectedIcon ? <SelectedIcon size={20} strokeWidth={1.75} /> : null}
        </span>
        <span className="text-left">
          <span className="block text-sm font-medium text-gray-800">{selected?.label || "Choose icon"}</span>
          <span className="block text-xs text-gray-400">Click to change</span>
        </span>
        <ChevronDown size={16} className={`text-gray-400 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div className="mt-2 border border-gray-200 bg-white rounded-xl p-3 shadow-sm">
          <div className="relative mb-3">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search icon: class, grocery, salon, repair..."
              className="w-full border border-gray-200 rounded-lg pl-8 pr-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>

          {!q && (
            <div className="flex gap-1.5 overflow-x-auto pb-2 mb-2">
              {[{ key: "all", label: "All" }, ...ICON_GROUPS].map((g) => (
                <button
                  key={g.key}
                  type="button"
                  onClick={() => setGroup(g.key)}
                  className={`whitespace-nowrap text-xs font-medium px-3 py-1.5 rounded-full border transition-colors ${
                    group === g.key
                      ? "bg-primary-600 text-white border-primary-600"
                      : "bg-white text-gray-600 border-gray-200 hover:border-primary-300"
                  }`}
                >
                  {g.label}
                </button>
              ))}
            </div>
          )}

          {list.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-6">No icon found. Try another word.</p>
          ) : (
            <div className="grid grid-cols-6 sm:grid-cols-8 gap-1.5 max-h-56 overflow-y-auto pr-1">
              {list.map((i) => {
                const active = selected?.key === i.key;
                const Icon = i.Icon;
                return (
                  <button
                    key={i.key}
                    type="button"
                    title={i.label}
                    aria-label={i.label}
                    aria-pressed={active}
                    onClick={() => {
                      onChange(i.key);
                      setOpen(false);
                    }}
                    className={`relative aspect-square rounded-lg flex items-center justify-center border transition-all ${
                      active
                        ? "border-primary-500 bg-primary-50 text-primary-600"
                        : "border-gray-100 text-gray-600 hover:border-primary-300 hover:bg-gray-50"
                    }`}
                  >
                    <Icon size={20} strokeWidth={1.75} />
                    {active && (
                      <span className="absolute -top-1 -right-1 w-4 h-4 rounded-full bg-primary-600 text-white flex items-center justify-center">
                        <Check size={10} strokeWidth={3} />
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
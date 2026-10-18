import React from "react";
import { Plus, X } from "lucide-react";

const inputCls =
  "w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500";

// Editor for a "catalog" attribute: a list of rows (halls, packages, products, trainers...).
export default function CatalogInput({ attr, value = [], onChange }) {
  const fields = attr.fields || [];
  const max = attr.max || 20;

  const blank = () => Object.fromEntries(fields.map((f) => [f.key, f.type === "boolean" ? false : ""]));
  const update = (i, key, v) => onChange(value.map((row, idx) => (idx === i ? { ...row, [key]: v } : row)));

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{attr.label}</label>
      <p className="mb-2 text-xs text-gray-400">
        Add up to {max}. The first field ({fields[0]?.label}) is required for a row to be saved.
      </p>

      <div className="space-y-3">
        {value.map((row, i) => (
          <div key={i} className="relative border border-gray-200 rounded-xl p-3 bg-gray-50">
            <button
              type="button"
              onClick={() => onChange(value.filter((_, idx) => idx !== i))}
              className="absolute top-2 right-2 text-gray-400 hover:text-red-500"
              aria-label="Remove row"
            >
              <X size={16} />
            </button>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pr-6">
              {fields.map((f) =>
                f.type === "boolean" ? (
                  <label key={f.key} className="flex items-center gap-2 text-sm text-gray-700 self-end pb-2">
                    <input
                      type="checkbox"
                      checked={row[f.key] === true}
                      onChange={(e) => update(i, f.key, e.target.checked)}
                      className="h-4 w-4 accent-primary-600"
                    />
                    {f.label}
                  </label>
                ) : (
                  <div key={f.key}>
                    <p className="text-xs text-gray-500 mb-1">{f.label}{f.unit ? ` (${f.unit})` : ""}</p>
                    <input
                      type={f.type === "number" ? "number" : "text"}
                      min={f.type === "number" ? 0 : undefined}
                      maxLength={f.type === "number" ? undefined : f.max || 100}
                      className={inputCls}
                      value={row[f.key] ?? ""}
                      onChange={(e) => update(i, f.key, e.target.value)}
                    />
                  </div>
                )
              )}
            </div>
          </div>
        ))}
      </div>

      {value.length < max && (
        <button
          type="button"
          onClick={() => onChange([...value, blank()])}
          className="mt-2 flex items-center gap-1 text-sm font-medium text-primary-600 hover:underline"
        >
          <Plus size={14} /> Add {attr.label.toLowerCase().replace(/s$/, "")}
        </button>
      )}
    </div>
  );
}
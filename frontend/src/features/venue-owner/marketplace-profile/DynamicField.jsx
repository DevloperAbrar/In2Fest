import React, { useState } from "react";
import { Plus, X } from "lucide-react";
import Input from "../../../components/common/Input";
import Select from "../../../components/common/Select";
import MultiSelect from "../../../components/common/MultiSelect";

function TagsInput({ label, hint, value = [], onChange, max = 10, placeholder }) {
  const [draft, setDraft] = useState("");

  const add = () => {
    const t = draft.trim().replace(/,$/, "").slice(0, 30);
    setDraft("");
    if (!t) return;
    if (value.length >= max) return;
    if (value.some((v) => v.toLowerCase() === t.toLowerCase())) return;
    onChange([...value, t]);
  };

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      {value.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-2">
          {value.map((t) => (
            <span key={t} className="flex items-center gap-1 bg-primary-50 text-primary-700 text-xs font-medium rounded-full px-3 py-1">
              {t}
              <button type="button" onClick={() => onChange(value.filter((v) => v !== t))} aria-label={`Remove ${t}`}>
                <X size={12} />
              </button>
            </span>
          ))}
        </div>
      )}
      <div className="flex gap-2">
        <input
          type="text"
          value={draft}
          disabled={value.length >= max}
          placeholder={value.length >= max ? `Maximum ${max} reached` : placeholder || "Type and press Enter"}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === ",") {
              e.preventDefault();
              add();
            }
          }}
          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 disabled:bg-gray-50"
        />
        <button
          type="button"
          onClick={add}
          disabled={!draft.trim() || value.length >= max}
          className="px-3 rounded-lg border border-gray-300 text-gray-600 hover:bg-gray-50 disabled:opacity-40"
          aria-label="Add"
        >
          <Plus size={16} />
        </button>
      </div>
      {hint && <p className="mt-1 text-xs text-gray-400">{hint}</p>}
    </div>
  );
}

function KeyValueInput({ label, hint, value = [], onChange, max = 8 }) {
  const update = (index, patch) => onChange(value.map((row, i) => (i === index ? { ...row, ...patch } : row)));

  return (
    <div>
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      {hint && <p className="mb-2 text-xs text-gray-400">{hint}</p>}
      <div className="space-y-2">
        {value.map((row, i) => (
          <div key={i} className="flex gap-2">
            <input
              type="text"
              value={row.label || ""}
              maxLength={30}
              placeholder="Label (e.g. Warranty)"
              onChange={(e) => update(i, { label: e.target.value })}
              className="w-1/3 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
            <input
              type="text"
              value={row.value || ""}
              maxLength={100}
              placeholder="Value (e.g. 1 year)"
              onChange={(e) => update(i, { value: e.target.value })}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
            <button
              type="button"
              onClick={() => onChange(value.filter((_, idx) => idx !== i))}
              className="px-2 text-gray-400 hover:text-red-500"
              aria-label="Remove row"
            >
              <X size={16} />
            </button>
          </div>
        ))}
      </div>
      {value.length < max && (
        <button
          type="button"
          onClick={() => onChange([...value, { label: "", value: "" }])}
          className="mt-2 flex items-center gap-1 text-sm font-medium text-primary-600 hover:underline"
        >
          <Plus size={14} /> Add detail
        </button>
      )}
    </div>
  );
}

// Renders one schema attribute with the right input for its type.
export default function DynamicField({ attr, value, onChange }) {
  const label = `${attr.label}${attr.unit ? ` (${attr.unit})` : ""}${attr.required ? " *" : ""}`;

  switch (attr.type) {
    case "boolean":
      return (
        <label className="flex items-center gap-3 border border-gray-200 rounded-lg px-3 py-2.5 cursor-pointer hover:border-primary-300 transition-colors">
          <input
            type="checkbox"
            checked={value === true}
            onChange={(e) => onChange(e.target.checked)}
            className="h-4 w-4 rounded border-gray-300 accent-primary-600"
          />
          <span className="text-sm text-gray-700">{attr.label}</span>
        </label>
      );

    case "select":
      return (
        <Select
          label={label}
          options={[
            { value: "", label: "Select" },
            ...(attr.options || []).map((o) => ({ value: o, label: o }))
          ]}
          value={value || ""}
          onChange={(e) => onChange(e.target.value || undefined)}
        />
      );

    case "multiselect":
      return (
        <MultiSelect
          label={label}
          options={(attr.options || []).map((o) => ({ value: o, label: o }))}
          value={Array.isArray(value) ? value : []}
          onChange={(vals) => onChange(vals)}
          placeholder="Select all that apply"
        />
      );

    case "tags":
      return (
        <TagsInput
          label={label}
          hint={attr.hint}
          value={Array.isArray(value) ? value : []}
          onChange={onChange}
          max={attr.max || 10}
          placeholder={attr.placeholder}
        />
      );

    case "keyvalue":
      return (
        <KeyValueInput
          label={label}
          hint={attr.hint}
          value={Array.isArray(value) ? value : []}
          onChange={onChange}
          max={attr.max || 8}
        />
      );

    case "number":
      return (
        <Input
          label={label}
          type="number"
          min={attr.min !== undefined ? attr.min : 0}
          max={attr.max}
          value={value ?? ""}
          onChange={(e) => onChange(e.target.value === "" ? undefined : e.target.value)}
        />
      );

    case "textarea":
      return (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
          <textarea
            rows={3}
            maxLength={attr.max || 500}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            value={value || ""}
            onChange={(e) => onChange(e.target.value || undefined)}
          />
        </div>
      );

    default:
      return (
        <Input
          label={label}
          type="text"
          maxLength={attr.max || 120}
          placeholder={attr.placeholder}
          value={value || ""}
          onChange={(e) => onChange(e.target.value || undefined)}
        />
      );
  }
}
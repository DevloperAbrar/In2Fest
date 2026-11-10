import React from "react";
import { Check, ListChecks } from "lucide-react";
import { SectionCard } from "./ProfileKit";

function hasValue(v) {
  if (v === undefined || v === null || v === "") return false;
  if (Array.isArray(v)) return v.length > 0;
  if (typeof v === "boolean") return v === true; // "No" is not worth showing
  return true;
}

// Short text for one attribute value (used in the stats strip and detail rows).
export function formatAttrValue(attr, v) {
  if (!hasValue(v)) return "";
  if (Array.isArray(v)) return attr.type === "keyvalue" ? "" : v.join(", ");
  if (typeof v === "boolean") return "Yes";
  if (attr.type === "number") {
    const n = Number(v).toLocaleString("en-IN");
    if (attr.unit === "₹") return `₹${n}`;
    return attr.unit ? `${n} ${attr.unit}` : n;
  }
  return String(v);
}

function buildGroups(schema, values) {
  if (!schema?.attributes?.length || !values) return [];
  return (schema.groups || [])
    .map((name) => ({
      name,
      attrs: schema.attributes.filter(
        (a) => a.group === name && a.key !== "highlights" && a.type !== "catalog" && hasValue(values[a.key])
      ),
    }))
    .filter((g) => g.attrs.length > 0);
}

// Lets the page know whether to show the "Details" tab at all.
export function hasAttributeContent(schema, values) {
  return buildGroups(schema, values).length > 0;
}

// Renders the category specific details a vendor filled in, grouped the same way
// as in the vendor dashboard. Only values the vendor actually filled are shown.
export default function ProfileAttributes({ schema, values }) {
  const groups = buildGroups(schema, values);
  if (!groups.length) return null;

  return (
    <>
      {groups.map(({ name, attrs }) => {
        const rows = attrs.filter((a) => ["text", "textarea", "select", "number"].includes(a.type));
        const chips = attrs.filter((a) => ["multiselect", "tags"].includes(a.type));
        const checks = attrs.filter((a) => a.type === "boolean");
        const pairs = attrs.filter((a) => a.type === "keyvalue");

        return (
          <SectionCard key={name} icon={ListChecks} title={name}>
            <div className="space-y-5">
              {rows.length > 0 && (
                <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {rows.map((a) => (
                    <div key={a.key} className="bg-gray-50 rounded-2xl px-4 py-3">
                      <dt className="text-[11px] uppercase tracking-wide font-semibold text-gray-400">{a.label}</dt>
                      <dd className="text-sm font-semibold text-navy-900 mt-1 break-words">
                        {formatAttrValue(a, values[a.key])}
                      </dd>
                    </div>
                  ))}
                </dl>
              )}

              {chips.map((a) => (
                <div key={a.key}>
                  <p className="text-[11px] uppercase tracking-wide font-semibold text-gray-400 mb-2">{a.label}</p>
                  <div className="flex flex-wrap gap-2">
                    {values[a.key].map((item) => (
                      <span
                        key={item}
                        className="text-xs font-medium bg-navy-50 text-navy-700 border border-navy-100 px-3 py-1.5 rounded-full hover:bg-navy-100 transition-colors"
                      >
                        {item}
                      </span>
                    ))}
                  </div>
                </div>
              ))}

              {checks.length > 0 && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                  {checks.map((a) => (
                    <div
                      key={a.key}
                      className="flex items-center gap-2.5 text-sm font-medium text-gray-700 bg-gray-50 rounded-xl px-3 py-2.5"
                    >
                      <span className="w-6 h-6 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center flex-shrink-0">
                        <Check size={13} strokeWidth={3} />
                      </span>
                      {a.label}
                    </div>
                  ))}
                </div>
              )}

              {pairs.map((a) => (
                <dl key={a.key} className="divide-y divide-gray-100 border border-gray-100 rounded-2xl overflow-hidden">
                  {values[a.key].map((row, i) => (
                    <div key={i} className="flex items-start justify-between gap-4 px-4 py-3 odd:bg-gray-50/60">
                      <dt className="text-sm text-gray-500">{row.label}</dt>
                      <dd className="text-sm font-semibold text-navy-900 text-right">{row.value}</dd>
                    </div>
                  ))}
                </dl>
              ))}
            </div>
          </SectionCard>
        );
      })}
    </>
  );
}
import React from "react";
import { CheckCircle2 } from "lucide-react";

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

function Card({ title, children }) {
  return (
    <div className="bg-white border border-gray-100 rounded-2xl p-5 md:p-6 shadow-sm">
      <h2 className="font-display font-bold text-navy-900 mb-4 text-lg">{title}</h2>
      <div className="space-y-4">{children}</div>
    </div>
  );
}

// Renders the category specific details a vendor filled in, grouped the same way
// as in the vendor dashboard. Only values the vendor actually filled are shown.
export default function ProfileAttributes({ schema, values }) {
  if (!schema?.attributes?.length || !values) return null;

  const groups = (schema.groups || [])
    .map((name) => ({
      name,
      attrs: schema.attributes.filter(
        (a) => a.group === name && a.key !== "highlights" && hasValue(values[a.key])
      )
    }))
    .filter((g) => g.attrs.length > 0);

  if (!groups.length) return null;

  return (
    <>
      {groups.map(({ name, attrs }) => {
        const rows = attrs.filter((a) => ["text", "textarea", "select", "number"].includes(a.type));
        const chips = attrs.filter((a) => ["multiselect", "tags"].includes(a.type));
        const checks = attrs.filter((a) => a.type === "boolean");
        const pairs = attrs.filter((a) => a.type === "keyvalue");

        return (
          <Card key={name} title={name}>
            {rows.length > 0 && (
              <dl className="grid grid-cols-1 sm:grid-cols-2 gap-x-6 gap-y-3">
                {rows.map((a) => (
                  <div key={a.key}>
                    <dt className="text-xs text-gray-400">{a.label}</dt>
                    <dd className="text-sm font-medium text-gray-800 mt-0.5">{formatAttrValue(a, values[a.key])}</dd>
                  </div>
                ))}
              </dl>
            )}

            {chips.map((a) => (
              <div key={a.key}>
                <p className="text-xs text-gray-400 mb-1.5">{a.label}</p>
                <div className="flex flex-wrap gap-2">
                  {values[a.key].map((item) => (
                    <span key={item} className="text-xs bg-navy-50 text-navy-700 border border-navy-100 px-3 py-1 rounded-full">
                      {item}
                    </span>
                  ))}
                </div>
              </div>
            ))}

            {checks.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {checks.map((a) => (
                  <div key={a.key} className="flex items-center gap-2 text-sm text-gray-700 bg-gray-50 rounded-lg px-3 py-2.5">
                    <CheckCircle2 size={15} className="text-emerald-500 flex-shrink-0" />
                    {a.label}
                  </div>
                ))}
              </div>
            )}

            {pairs.map((a) => (
              <dl key={a.key} className="divide-y divide-gray-100 border border-gray-100 rounded-xl">
                {values[a.key].map((row, i) => (
                  <div key={i} className="flex items-start justify-between gap-4 px-4 py-2.5">
                    <dt className="text-sm text-gray-500">{row.label}</dt>
                    <dd className="text-sm font-medium text-gray-800 text-right">{row.value}</dd>
                  </div>
                ))}
              </dl>
            ))}
          </Card>
        );
      })}
    </>
  );
}
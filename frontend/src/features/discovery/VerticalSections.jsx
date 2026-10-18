import React from "react";
import { CheckCircle2 } from "lucide-react";

// Attributes that are shown elsewhere (chips under the tagline / extra details card)
const SPECIAL_KEYS = new Set(["highlights", "custom_details"]);

function isFilled(v) {
  if (v === undefined || v === null || v === "" || v === false) return false;
  if (Array.isArray(v)) return v.length > 0;
  if (typeof v === "object") return Object.keys(v).length > 0;
  return true;
}

function Card({ title, children }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
      <h2 className="text-base font-semibold text-gray-800 mb-4">{title}</h2>
      {children}
    </div>
  );
}

function Chip({ children, check }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-xs text-gray-700 bg-gray-50 border border-gray-100 rounded-full px-3 py-1.5">
      {check && <CheckCircle2 size={13} className="text-green-500 flex-shrink-0" />}
      {children}
    </span>
  );
}

function formatNumber(attr, value) {
  const n = Number(value).toLocaleString("en-IN");
  if (attr.unit === "₹") return `₹${n}`;
  return attr.unit ? `${n} ${attr.unit}` : n;
}

function toPairs(value) {
  if (Array.isArray(value)) {
    return value
      .map((p) => [p?.key ?? p?.label ?? p?.name, p?.value])
      .filter(([k, v]) => k && v);
  }
  if (value && typeof value === "object") return Object.entries(value).filter(([, v]) => v);
  return [];
}

// WhatsApp link with a message that fits the vertical (gym asks for a trial, food for an order...).
export function buildWhatsAppLink(number, vertical, businessName) {
  const digits = String(number || "").replace(/\D/g, "");
  if (!digits) return null;
  const base = vertical?.whatsapp_message || "Hi, I found you on In2Fest and would like to know more.";
  const text = businessName ? `${base} (${businessName})` : base;
  return `https://wa.me/${digits}?text=${encodeURIComponent(text)}`;
}

// Short "key highlights" chips shown in the hero, under the tagline.
export function HighlightChips({ schema, values }) {
  const list = Array.isArray(values?.highlights) ? values.highlights.filter(Boolean) : [];
  if (!list.length) return null;
  return (
    <div className="flex flex-wrap gap-2 mt-3">
      {list.slice(0, 6).map((h) => (
        <Chip key={h} check>{h}</Chip>
      ))}
    </div>
  );
}

// Renders the vendor's category-specific details, one card per group,
// with the groups of the vendor's vertical first.
export function AttributeSections({ schema, values }) {
  if (!schema || !values) return null;

  const order = schema.vertical?.group_order || [];
  const rank = (g) => {
    const i = order.indexOf(g);
    return i === -1 ? 999 : i;
  };
  const groups = [...(schema.groups || [])].sort((a, b) => rank(a) - rank(b));

  const cards = groups
    .map((group) => {
      const attrs = (schema.attributes || []).filter(
        (a) => a.group === group && !SPECIAL_KEYS.has(a.key) && isFilled(values[a.key])
      );
      if (!attrs.length) return null;

      const rows = attrs.filter((a) => ["select", "text", "number"].includes(a.type));
      const lists = attrs.filter((a) => ["multiselect", "tags"].includes(a.type));
      const flags = attrs.filter((a) => a.type === "boolean");

      return (
        <Card key={group} title={group}>
          {rows.length > 0 && (
            <dl className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-4 last:mb-0">
              {rows.map((a) => (
                <div key={a.key} className="bg-gray-50 rounded-lg px-3 py-2">
                  <dt className="text-xs text-gray-400">{a.label}</dt>
                  <dd className="text-sm font-semibold text-gray-700">
                    {a.type === "number" ? formatNumber(a, values[a.key]) : String(values[a.key])}
                  </dd>
                </div>
              ))}
            </dl>
          )}

          {lists.map((a) => (
            <div key={a.key} className="mb-4 last:mb-0">
              <p className="text-xs text-gray-400 mb-2">{a.label}</p>
              <div className="flex flex-wrap gap-2">
                {values[a.key].map((v) => (
                  <Chip key={v}>{v}</Chip>
                ))}
              </div>
            </div>
          ))}

          {flags.length > 0 && (
            <div className="flex flex-wrap gap-2">
              {flags.map((a) => (
                <Chip key={a.key} check>{a.label}</Chip>
              ))}
            </div>
          )}
        </Card>
      );
    })
    .filter(Boolean);

  const extra = toPairs(values.custom_details);
  if (extra.length > 0) {
    cards.push(
      <Card key="custom_details" title="Extra details">
        <dl className="space-y-2">
          {extra.map(([k, v]) => (
            <div key={k} className="flex justify-between gap-4 text-sm border-b border-gray-100 pb-2 last:border-0 last:pb-0">
              <dt className="text-gray-500">{k}</dt>
              <dd className="font-semibold text-gray-800 text-right">{String(v)}</dd>
            </div>
          ))}
        </dl>
      </Card>
    );
  }

  if (!cards.length) return null;
  return <>{cards}</>;
}
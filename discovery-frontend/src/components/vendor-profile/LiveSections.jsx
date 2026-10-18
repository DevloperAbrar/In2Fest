import React, { useMemo, useState } from "react";
import { CheckCircle2, Star, Snowflake } from "lucide-react";

const rupee = (n) => `₹${Number(n || 0).toLocaleString("en-IN")}`;
const hasRows = (v) => Array.isArray(v) && v.length > 0;

function Card({ title, subtitle, children }) {
  return (
    <div className="bg-white border border-gray-100 rounded-2xl p-5 md:p-6 shadow-sm">
      <h2 className="font-display font-bold text-navy-900 text-lg">{title}</h2>
      {subtitle && <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>}
      <div className="mt-4">{children}</div>
    </div>
  );
}

/* ------------------------------ Gym plans ------------------------------ */
function GymPlans({ plans }) {
  return (
    <Card title="Membership plans" subtitle="Prices are set by the gym. Ask about current offers when you visit.">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {plans.map((p) => (
          <div key={p.id} className={`relative rounded-xl border p-4 ${p.is_popular ? "border-navy-300 bg-navy-50/40" : "border-gray-100 bg-gray-50"}`}>
            {p.is_popular && (
              <span className="absolute -top-2 right-3 inline-flex items-center gap-1 text-[10px] font-semibold uppercase bg-navy-700 text-white px-2 py-0.5 rounded-full">
                <Star size={10} className="fill-white" /> Popular
              </span>
            )}
            <p className="text-sm font-semibold text-gray-800">{p.name}</p>
            <p className="text-xs text-gray-500 mb-2">{p.duration_label}</p>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold text-navy-800">{rupee(p.final_price)}</span>
              {p.discount_percent > 0 && (
                <>
                  <span className="text-xs text-gray-400 line-through">{rupee(p.price)}</span>
                  <span className="text-xs font-semibold text-green-600">{Number(p.discount_percent)}% off</span>
                </>
              )}
            </div>
            {p.per_month && p.duration_label !== "1 month" && (
              <p className="text-xs text-gray-500 mt-0.5">about {rupee(p.per_month)} / month</p>
            )}
            {p.description && <p className="text-xs text-gray-600 mt-2">{p.description}</p>}
            <ul className="mt-3 space-y-1 text-xs text-gray-600">
              {p.joining_fee > 0 ? (
                <li>Joining fee {rupee(p.joining_fee)}</li>
              ) : (
                <li className="flex items-center gap-1.5"><CheckCircle2 size={12} className="text-green-500" /> No joining fee</li>
              )}
              {p.pt_addon_price > 0 && <li>Personal training add-on {rupee(p.pt_addon_price)}</li>}
              {p.freeze_allowed && p.max_freeze_days > 0 && (
                <li className="flex items-center gap-1.5"><Snowflake size={12} className="text-sky-500" /> Freeze up to {p.max_freeze_days} days</li>
              )}
            </ul>
          </div>
        ))}
      </div>
    </Card>
  );
}

/* ------------------------------ Food menu ------------------------------ */
const DOT = { veg: ["border-green-600", "bg-green-600"], nonveg: ["border-red-600", "bg-red-600"], egg: ["border-amber-500", "bg-amber-500"] };

function FoodDot({ type }) {
  const [border, fill] = DOT[type] || DOT.veg;
  return (
    <span className={`inline-flex w-4 h-4 border-2 rounded-sm items-center justify-center bg-white flex-shrink-0 ${border}`}>
      <span className={`w-2 h-2 rounded-full ${fill}`} />
    </span>
  );
}

const itemPrice = (i) =>
  i.variants?.length ? i.variants.map((v) => `${v.name} ${rupee(v.price)}`).join(" · ") : rupee(i.price);

function FoodMenu({ categories, items }) {
  const [active, setActive] = useState("all");
  const [vegOnly, setVegOnly] = useState(false);
  const [showAll, setShowAll] = useState(false);

  const tabs = useMemo(() => {
    const base = [{ id: "all", name: "All" }, ...categories];
    if (items.some((i) => !i.category_id)) base.push({ id: "none", name: "Others" });
    return base;
  }, [categories, items]);

  const list = useMemo(
    () =>
      items.filter((i) => {
        if (vegOnly && i.food_type !== "veg") return false;
        if (active === "all") return true;
        if (active === "none") return !i.category_id;
        return i.category_id === active;
      }),
    [items, active, vegOnly]
  );
  const visible = showAll ? list : list.slice(0, 12);

  return (
    <Card title="Menu" subtitle="Live from the restaurant. Sold-out items are not available right now.">
      <div className="flex items-center gap-2 mb-4">
        <div className="flex gap-1.5 overflow-x-auto pb-1 flex-1">
          {tabs.map((t) => (
            <button key={t.id} onClick={() => { setActive(t.id); setShowAll(false); }}
              className={`px-3 py-1 rounded-full text-xs whitespace-nowrap border ${active === t.id ? "bg-navy-700 text-white border-navy-700" : "text-gray-600 border-gray-200"}`}>
              {t.name}
            </button>
          ))}
        </div>
        <button onClick={() => setVegOnly((v) => !v)}
          className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs border whitespace-nowrap ${vegOnly ? "border-green-600 text-green-700 bg-green-50" : "border-gray-200 text-gray-600"}`}>
          <FoodDot type="veg" /> Veg only
        </button>
      </div>

      {visible.length === 0 ? (
        <p className="text-sm text-gray-400">No dishes here yet.</p>
      ) : (
        <div className="divide-y divide-gray-100">
          {visible.map((i) => (
            <div key={i.id} className={`py-3 flex items-start gap-3 ${i.is_available ? "" : "opacity-50"}`}>
              <div className="mt-0.5"><FoodDot type={i.food_type} /></div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900">
                  {i.name}{" "}
                  {i.is_bestseller && <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 align-middle">Bestseller</span>}
                  {!i.is_available && <span className="ml-1 text-[10px] px-1.5 py-0.5 rounded bg-gray-100 text-gray-500 align-middle">Sold out</span>}
                </p>
                <p className="text-xs font-semibold text-gray-700 mt-0.5">{itemPrice(i)}</p>
                {i.description && <p className="text-xs text-gray-500 mt-1 line-clamp-2">{i.description}</p>}
              </div>
              {i.image_url && <img src={i.image_url} alt={i.name} loading="lazy" className="w-16 h-16 rounded-lg object-cover flex-shrink-0" />}
            </div>
          ))}
        </div>
      )}

      {list.length > 12 && (
        <button onClick={() => setShowAll((s) => !s)} className="mt-3 text-xs font-medium text-navy-700">
          {showAll ? "Show less" : `Show all ${list.length} dishes`}
        </button>
      )}
    </Card>
  );
}

/* --------------------- Catalogs (halls, packages, products...) --------------------- */
function fmt(field, v) {
  if (field.type === "number") {
    const n = Number(v).toLocaleString("en-IN");
    if (field.unit === "₹") return `₹${n}`;
    return field.unit ? `${n} ${field.unit}` : n;
  }
  return String(v);
}

function CatalogTable({ fields, rows }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left text-xs text-gray-400">
            {fields.map((f) => <th key={f.key} className="pb-2 pr-4 font-medium whitespace-nowrap">{f.label}</th>)}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {rows.map((row, i) => (
            <tr key={i}>
              {fields.map((f, idx) => (
                <td key={f.key} className={`py-2 pr-4 whitespace-nowrap ${idx === 0 ? "font-medium text-gray-800" : "text-gray-600"}`}>
                  {f.type === "boolean" ? (row[f.key] ? "Yes" : "-") : row[f.key] !== undefined ? fmt(f, row[f.key]) : "-"}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function CatalogCards({ fields, rows }) {
  const [first, ...rest] = fields;
  const priceField = fields.find((f) => f.type === "number" && f.unit === "₹");

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
      {rows.map((row, i) => {
        const out = row.out_of_stock === true;
        const details = rest.filter((f) => f !== priceField && f.key !== "out_of_stock" && row[f.key] !== undefined && row[f.key] !== false);
        return (
          <div key={i} className={`border border-gray-100 rounded-xl p-4 bg-gray-50 ${out ? "opacity-60" : ""}`}>
            <div className="flex items-start justify-between gap-2">
              <p className="text-sm font-semibold text-gray-800">{row[first.key]}</p>
              {priceField && row[priceField.key] !== undefined && (
                <p className="text-sm font-bold text-navy-800 whitespace-nowrap">{rupee(row[priceField.key])}</p>
              )}
            </div>
            {out && <span className="inline-block mt-1 text-[10px] px-1.5 py-0.5 rounded bg-gray-200 text-gray-600">Out of stock</span>}
            {details.length > 0 && (
              <ul className="mt-2 space-y-0.5 text-xs text-gray-600">
                {details.map((f) => (
                  <li key={f.key}>{f.type === "boolean" ? f.label : `${f.label}: ${fmt(f, row[f.key])}`}</li>
                ))}
              </ul>
            )}
          </div>
        );
      })}
    </div>
  );
}

/* ------------------------------- Entry point ------------------------------- */
export default function LiveSections({ live, schema, attrs }) {
  const catalogs = (schema?.attributes || []).filter((a) => a.type === "catalog" && hasRows(attrs?.[a.key]));

  return (
    <>
      {live?.type === "gym_plans" && hasRows(live.plans) && <GymPlans plans={live.plans} />}
      {live?.type === "food_menu" && hasRows(live.items) && <FoodMenu categories={live.categories || []} items={live.items} />}
      {catalogs.map((a) => (
        <Card key={a.key} title={a.label}>
          {a.display === "table"
            ? <CatalogTable fields={a.fields} rows={attrs[a.key]} />
            : <CatalogCards fields={a.fields} rows={attrs[a.key]} />}
        </Card>
      ))}
    </>
  );
}
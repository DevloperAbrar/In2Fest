import React, { useMemo, useState } from "react";
import { CheckCircle2, Star, Snowflake, Dumbbell, BookOpen, UtensilsCrossed, LayoutGrid } from "lucide-react";
import { SectionCard, rupee } from "./ProfileKit";

const hasRows = (v) => Array.isArray(v) && v.length > 0;

/* ------------------------------ Gym plans ------------------------------ */
function GymPlans({ plans }) {
  return (
    <SectionCard
      icon={Dumbbell}
      title="Membership plans"
      subtitle="Prices are set by the gym. Ask about current offers when you visit."
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
        {plans.map((p) => {
          const dark = !!p.is_popular;
          return (
            <div
              key={p.id}
              className={`relative rounded-2xl p-5 transition-all duration-300 hover:-translate-y-1 hover:shadow-xl ${
                dark
                  ? "bg-gradient-to-br from-navy-700 to-navy-900 text-white border border-navy-600"
                  : "bg-white border border-gray-200"
              }`}
            >
              {dark && (
                <span className="absolute -top-2.5 right-4 inline-flex items-center gap-1 text-[10px] font-extrabold uppercase tracking-wide bg-gradient-to-r from-gold-500 to-gold-400 text-navy-900 px-2.5 py-1 rounded-full shadow">
                  <Star size={10} className="fill-navy-900" /> Popular
                </span>
              )}
              <p className={`text-sm font-bold ${dark ? "text-white" : "text-navy-900"}`}>{p.name}</p>
              <p className={`text-xs mb-3 ${dark ? "text-white/60" : "text-gray-500"}`}>{p.duration_label}</p>

              <div className="flex items-baseline flex-wrap gap-x-2">
                <span className={`font-display font-extrabold text-3xl ${dark ? "text-gold-400" : "text-navy-800"}`}>
                  {rupee(p.final_price)}
                </span>
                {p.discount_percent > 0 && (
                  <>
                    <span className={`text-xs line-through ${dark ? "text-white/40" : "text-gray-400"}`}>{rupee(p.price)}</span>
                    <span className="text-xs font-bold text-emerald-500">{Number(p.discount_percent)}% off</span>
                  </>
                )}
              </div>
              {p.per_month && p.duration_label !== "1 month" && (
                <p className={`text-xs mt-0.5 ${dark ? "text-white/60" : "text-gray-500"}`}>
                  about {rupee(p.per_month)} / month
                </p>
              )}
              {p.description && (
                <p className={`text-xs mt-3 ${dark ? "text-white/75" : "text-gray-600"}`}>{p.description}</p>
              )}

              <ul className={`mt-4 pt-4 border-t space-y-1.5 text-xs ${dark ? "border-white/10 text-white/80" : "border-gray-100 text-gray-600"}`}>
                {p.joining_fee > 0 ? (
                  <li>Joining fee {rupee(p.joining_fee)}</li>
                ) : (
                  <li className="flex items-center gap-1.5">
                    <CheckCircle2 size={13} className="text-emerald-500" /> No joining fee
                  </li>
                )}
                {p.pt_addon_price > 0 && <li>Personal training add-on {rupee(p.pt_addon_price)}</li>}
                {p.freeze_allowed && p.max_freeze_days > 0 && (
                  <li className="flex items-center gap-1.5">
                    <Snowflake size={13} className="text-sky-400" /> Freeze up to {p.max_freeze_days} days
                  </li>
                )}
              </ul>
            </div>
          );
        })}
      </div>
    </SectionCard>
  );
}

/* ------------------------------ Library shifts ------------------------------ */
const t12 = (t) => {
  const m = /^(\d{2}):(\d{2})$/.exec(String(t || ""));
  if (!m) return "";
  const h = Number(m[1]);
  return `${h % 12 || 12}:${m[2]} ${h < 12 ? "AM" : "PM"}`;
};

function LibraryShifts({ live }) {
  const badge = (s) =>
    s.availability === "full"
      ? ["Full", "bg-red-50 text-red-600", "bg-red-500"]
      : s.availability === "few"
        ? [`Only ${s.free} seats left`, "bg-amber-50 text-amber-700", "bg-amber-500"]
        : ["Seats available", "bg-emerald-50 text-emerald-700", "bg-emerald-500"];

  return (
    <SectionCard
      icon={BookOpen}
      title="Shifts & monthly fees"
      subtitle={`${live.total_seats} seats across ${live.halls} ${live.halls > 1 ? "halls" : "hall"}. Availability is live from the library.`}
    >
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {live.shifts.map((s) => {
          const [label, cls, dot] = badge(s);
          return (
            <div
              key={s.id}
              className="rounded-2xl border border-gray-200 bg-white p-5 transition-all duration-300 hover:-translate-y-1 hover:shadow-lg"
            >
              <p className="text-sm font-bold text-navy-900">{s.name}</p>
              <p className="text-xs text-gray-500 mb-3">
                {t12(s.start_time)} - {t12(s.end_time)}
              </p>
              <div className="flex items-baseline gap-1">
                <span className="font-display font-extrabold text-3xl text-navy-800">{rupee(s.price)}</span>
                <span className="text-xs text-gray-500">/ month</span>
              </div>
              <span className={`inline-flex items-center gap-1.5 mt-4 text-[11px] font-semibold px-2.5 py-1 rounded-full ${cls}`}>
                <span className={`w-1.5 h-1.5 rounded-full ${dot}`} />
                {label}
              </span>
            </div>
          );
        })}
      </div>
    </SectionCard>
  );
}

/* ------------------------------ Food menu ------------------------------ */
const DOT = {
  veg: ["border-green-600", "bg-green-600"],
  nonveg: ["border-red-600", "bg-red-600"],
  egg: ["border-amber-500", "bg-amber-500"],
};

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
    <SectionCard icon={UtensilsCrossed} title="Menu" subtitle="Live from the restaurant. Sold-out items are not available right now.">
      <div className="flex items-center gap-2 mb-4">
        <div className="flex gap-2 overflow-x-auto no-scrollbar pb-1 flex-1">
          {tabs.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => { setActive(t.id); setShowAll(false); }}
              className={`px-3.5 py-1.5 rounded-full text-xs font-semibold whitespace-nowrap border transition-colors ${
                active === t.id
                  ? "bg-navy-800 text-white border-navy-800"
                  : "text-gray-600 border-gray-200 hover:bg-gray-50"
              }`}
            >
              {t.name}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={() => setVegOnly((v) => !v)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold border whitespace-nowrap transition-colors ${
            vegOnly ? "border-green-600 text-green-700 bg-green-50" : "border-gray-200 text-gray-600 hover:bg-gray-50"
          }`}
        >
          <FoodDot type="veg" /> Veg only
        </button>
      </div>

      {visible.length === 0 ? (
        <p className="text-sm text-gray-400">No dishes here yet.</p>
      ) : (
        <div className="divide-y divide-gray-100">
          {visible.map((i) => (
            <div key={i.id} className={`py-4 flex items-start gap-3 ${i.is_available ? "" : "opacity-50"}`}>
              <div className="mt-0.5"><FoodDot type={i.food_type} /></div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-900">
                  {i.name}{" "}
                  {i.is_bestseller && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-gold-400/25 text-gold-600 align-middle font-bold">
                      Bestseller
                    </span>
                  )}
                  {!i.is_available && (
                    <span className="ml-1 text-[10px] px-1.5 py-0.5 rounded bg-gray-100 text-gray-500 align-middle">
                      Sold out
                    </span>
                  )}
                </p>
                <p className="text-sm font-bold text-navy-800 mt-0.5">{itemPrice(i)}</p>
                {i.description && <p className="text-xs text-gray-500 mt-1 line-clamp-2">{i.description}</p>}
              </div>
              {i.image_url && (
                <img
                  src={i.image_url}
                  alt={i.name}
                  loading="lazy"
                  className="w-20 h-20 rounded-2xl object-cover flex-shrink-0"
                />
              )}
            </div>
          ))}
        </div>
      )}

      {list.length > 12 && (
        <button
          type="button"
          onClick={() => setShowAll((s) => !s)}
          className="mt-3 text-sm font-semibold text-accent-600 hover:text-accent-700"
        >
          {showAll ? "Show less" : `Show all ${list.length} dishes`}
        </button>
      )}
    </SectionCard>
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
    <div className="overflow-x-auto rounded-2xl border border-gray-100">
      <table className="w-full text-sm">
        <thead className="bg-gray-50">
          <tr className="text-left text-[11px] uppercase tracking-wide text-gray-400">
            {fields.map((f) => (
              <th key={f.key} className="px-4 py-3 font-semibold whitespace-nowrap">{f.label}</th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {rows.map((row, i) => (
            <tr key={i} className="hover:bg-navy-50/40 transition-colors">
              {fields.map((f, idx) => (
                <td
                  key={f.key}
                  className={`px-4 py-3 whitespace-nowrap ${idx === 0 ? "font-semibold text-navy-900" : "text-gray-600"}`}
                >
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
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
      {rows.map((row, i) => {
        const out = row.out_of_stock === true;
        const details = rest.filter(
          (f) => f !== priceField && f.key !== "out_of_stock" && row[f.key] !== undefined && row[f.key] !== false
        );
        return (
          <div
            key={i}
            className={`border border-gray-200 rounded-2xl p-4 bg-white transition-all duration-300 hover:-translate-y-1 hover:shadow-lg ${
              out ? "opacity-60" : ""
            }`}
          >
            <div className="flex items-start justify-between gap-2">
              <p className="text-sm font-bold text-navy-900">{row[first.key]}</p>
              {priceField && row[priceField.key] !== undefined && (
                <p className="text-sm font-extrabold text-navy-800 whitespace-nowrap bg-gold-400/20 px-2.5 py-1 rounded-lg">
                  {rupee(row[priceField.key])}
                </p>
              )}
            </div>
            {out && (
              <span className="inline-block mt-1.5 text-[10px] px-1.5 py-0.5 rounded bg-gray-200 text-gray-600">
                Out of stock
              </span>
            )}
            {details.length > 0 && (
              <ul className="mt-3 space-y-1 text-xs text-gray-600">
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
      {live?.type === "food_menu" && hasRows(live.items) && (
        <FoodMenu categories={live.categories || []} items={live.items} />
      )}
      {live?.type === "library_shifts" && hasRows(live.shifts) && <LibraryShifts live={live} />}
      {catalogs.map((a) => (
        <SectionCard key={a.key} icon={LayoutGrid} title={a.label}>
          {a.display === "table" ? (
            <CatalogTable fields={a.fields} rows={attrs[a.key]} />
          ) : (
            <CatalogCards fields={a.fields} rows={attrs[a.key]} />
          )}
        </SectionCard>
      ))}
    </>
  );
}
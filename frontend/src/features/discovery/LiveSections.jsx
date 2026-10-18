import React, { useMemo, useState } from "react";
import { CheckCircle2, Star, Snowflake } from "lucide-react";

const rupee = (n) => `₹${Number(n || 0).toLocaleString("en-IN")}`;

function Card({ title, subtitle, children }) {
  return (
    <div className="bg-white rounded-2xl border border-gray-100 shadow-sm p-6">
      <h2 className="text-base font-semibold text-gray-800">{title}</h2>
      {subtitle && <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>}
      <div className="mt-4">{children}</div>
    </div>
  );
}

/* ---------------------------- Gym: membership plans ---------------------------- */
function MembershipPlans({ plans }) {
  return (
    <Card title="Membership plans" subtitle="Prices set by the gym. Ask about offers when you visit.">
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {plans.map((p) => (
          <div
            key={p.id}
            className={`relative rounded-xl border p-4 ${p.is_popular ? "border-primary-300 bg-primary-50/40" : "border-gray-100 bg-gray-50"}`}
          >
            {p.is_popular && (
              <span className="absolute -top-2 right-3 inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide bg-primary-600 text-white px-2 py-0.5 rounded-full">
                <Star size={10} className="fill-white" /> Popular
              </span>
            )}
            <p className="text-sm font-semibold text-gray-800">{p.name}</p>
            <p className="text-xs text-gray-500 mb-2">{p.duration_label}</p>

            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold text-primary-700">{rupee(p.final_price)}</span>
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
                <li className="flex items-center gap-1.5">
                  <CheckCircle2 size={12} className="text-green-500" /> No joining fee
                </li>
              )}
              {p.pt_addon_price > 0 && <li>Personal training add-on {rupee(p.pt_addon_price)}</li>}
              {p.freeze_allowed && p.max_freeze_days > 0 && (
                <li className="flex items-center gap-1.5">
                  <Snowflake size={12} className="text-sky-500" /> Freeze up to {p.max_freeze_days} days
                </li>
              )}
            </ul>
          </div>
        ))}
      </div>
    </Card>
  );
}

/* ----------------------------- Food: live menu ----------------------------- */
const DOT = { veg: "border-green-600 bg-green-600", nonveg: "border-red-600 bg-red-600", egg: "border-amber-500 bg-amber-500" };

function FoodDot({ type }) {
  return (
    <span className={`inline-flex w-4 h-4 border-2 rounded-sm items-center justify-center flex-shrink-0 bg-white ${(DOT[type] || DOT.veg).split(" ")[0]}`}>
      <span className={`w-2 h-2 rounded-full ${(DOT[type] || DOT.veg).split(" ")[1]}`} />
    </span>
  );
}

function priceText(item) {
  if (item.variants?.length) return item.variants.map((v) => `${v.name} ${rupee(v.price)}`).join(" · ");
  return rupee(item.price);
}

const PREVIEW_COUNT = 12;

function FoodMenu({ categories, items }) {
  const [active, setActive] = useState("all");
  const [showAll, setShowAll] = useState(false);
  const [vegOnly, setVegOnly] = useState(false);

  const hasOthers = items.some((i) => !i.category_id);
  const tabs = useMemo(() => {
    const base = [{ id: "all", name: "All" }, ...categories];
    if (hasOthers) base.push({ id: "none", name: "Others" });
    return base;
  }, [categories, hasOthers]);

  const list = useMemo(() => {
    return items.filter((i) => {
      if (vegOnly && i.food_type !== "veg") return false;
      if (active === "all") return true;
      if (active === "none") return !i.category_id;
      return i.category_id === active;
    });
  }, [items, active, vegOnly]);

  const visible = showAll ? list : list.slice(0, PREVIEW_COUNT);

  return (
    <Card title="Menu" subtitle="Live from the restaurant. Items marked sold out are not available right now.">
      <div className="flex items-center gap-2 mb-4">
        <div className="flex gap-1.5 overflow-x-auto pb-1 flex-1">
          {tabs.map((t) => (
            <button
              key={t.id}
              onClick={() => { setActive(t.id); setShowAll(false); }}
              className={`px-3 py-1 rounded-full text-xs whitespace-nowrap border ${active === t.id ? "bg-primary-600 text-white border-primary-600" : "text-gray-600 border-gray-200"}`}
            >
              {t.name}
            </button>
          ))}
        </div>
        <button
          onClick={() => setVegOnly((v) => !v)}
          className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-xs border whitespace-nowrap ${vegOnly ? "border-green-600 text-green-700 bg-green-50" : "border-gray-200 text-gray-600"}`}
        >
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
                  {i.is_bestseller && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-100 text-amber-700 align-middle">Bestseller</span>
                  )}
                  {!i.is_available && (
                    <span className="ml-1 text-[10px] px-1.5 py-0.5 rounded bg-gray-100 text-gray-500 align-middle">Sold out</span>
                  )}
                </p>
                <p className="text-xs font-semibold text-gray-700 mt-0.5">{priceText(i)}</p>
                {i.description && <p className="text-xs text-gray-500 mt-1 line-clamp-2">{i.description}</p>}
              </div>
              {i.image_url && (
                <img src={i.image_url} alt={i.name} loading="lazy" className="w-16 h-16 rounded-lg object-cover flex-shrink-0" />
              )}
            </div>
          ))}
        </div>
      )}

      {list.length > PREVIEW_COUNT && (
        <button onClick={() => setShowAll((s) => !s)} className="mt-3 text-xs font-medium text-primary-600">
          {showAll ? "Show less" : `Show all ${list.length} dishes`}
        </button>
      )}
    </Card>
  );
}

/* ------------------------------- Entry point ------------------------------- */
export default function LiveSections({ live }) {
  if (!live) return null;
  if (live.type === "gym_plans" && live.plans?.length) return <MembershipPlans plans={live.plans} />;
  if (live.type === "food_menu" && live.items?.length) return <FoodMenu categories={live.categories || []} items={live.items} />;
  return null;
}
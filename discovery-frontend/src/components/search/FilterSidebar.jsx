import React, { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  MapPin, Wallet, Users2, Star, X, RotateCcw, ChevronDown, Building2, Sparkles,
} from "lucide-react";
import resolveCategoryIcon from "./categoryIcon";
import useCategories from "./useCategories";

const BUDGET_PRESETS = [
  { label: "Any budget", min: "", max: "" },
  { label: "Under ₹50K", min: "", max: "50000" },
  { label: "₹50K – ₹1L", min: "50000", max: "100000" },
  { label: "₹1L – ₹3L", min: "100000", max: "300000" },
  { label: "₹3L+", min: "300000", max: "" },
];

const RATING_PRESETS = [
  { label: "Any", value: "" },
  { label: "3+", value: "3" },
  { label: "4+", value: "4" },
  { label: "4.5+", value: "4.5" },
];

function activeFilterCount(filters) {
  return ["city", "category", "budget_min", "budget_max", "capacity_min", "rating"].filter(
    (k) => filters[k]
  ).length;
}

/* Collapsible section wrapper - keeps the sidebar scannable instead of one
   long unbroken block of inputs. */
function Section({ title, icon: Icon, children, defaultOpen = true }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border-b border-gray-100 pb-4 last:border-0 last:pb-0">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="w-full flex items-center justify-between mb-3"
      >
        <span className="flex items-center gap-2 text-sm font-bold text-navy-900">
          <Icon size={15} className="text-accent-600" /> {title}
        </span>
        <motion.span animate={{ rotate: open ? 180 : 0 }} transition={{ duration: 0.2 }}>
          <ChevronDown size={15} className="text-gray-400" />
        </motion.span>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="overflow-hidden"
          >
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function FilterBody({ filters, update, categories, venueCategories, vendorCategories }) {
  const [categoryTab, setCategoryTab] = useState("all");
  const activeBudgetIdx = BUDGET_PRESETS.findIndex(
    (p) => p.min === (filters.budget_min || "") && p.max === (filters.budget_max || "")
  );

  const visibleCategories =
    categoryTab === "venues" ? venueCategories : categoryTab === "vendors" ? vendorCategories : categories;

  return (
    <div className="space-y-5">
      {/* City */}
      <Section title="City" icon={MapPin}>
        <div className="relative">
          <MapPin size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-300" />
          <input
            className="w-full pl-9 pr-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-accent-100 focus:border-accent-400 transition-colors"
            value={filters.city || ""}
            onChange={(e) => update("city", e.target.value)}
            placeholder="e.g. Indore"
          />
        </div>
      </Section>

      {/* Category */}
      <Section title="Category" icon={Building2}>
        <div className="flex gap-1.5 mb-3 bg-gray-50 p-1 rounded-lg">
          {[
            { key: "all", label: "All" },
            { key: "venues", label: "Venues" },
            { key: "vendors", label: "Vendors" },
          ].map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setCategoryTab(tab.key)}
              className={[
                "flex-1 text-xs font-semibold py-1.5 rounded-md transition-colors",
                categoryTab === tab.key ? "bg-white text-navy-900 shadow-sm" : "text-gray-500",
              ].join(" ")}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="max-h-56 overflow-y-auto pr-1 space-y-1 no-scrollbar">
          <button
            type="button"
            onClick={() => update("category", "")}
            className={[
              "w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-sm text-left transition-colors",
              !filters.category ? "bg-accent-50 text-accent-700 font-semibold" : "text-gray-600 hover:bg-gray-50",
            ].join(" ")}
          >
            <Sparkles size={14} /> All categories
          </button>
          {visibleCategories.map((cat) => {
            const Icon = resolveCategoryIcon(cat.icon);
            const active = filters.category === cat.slug;
            return (
              <button
                key={cat.slug}
                type="button"
                onClick={() => update("category", active ? "" : cat.slug)}
                className={[
                  "w-full flex items-center gap-2 px-2.5 py-2 rounded-lg text-sm text-left transition-colors",
                  active ? "bg-accent-50 text-accent-700 font-semibold" : "text-gray-600 hover:bg-gray-50",
                ].join(" ")}
              >
                <Icon size={14} /> {cat.label}
              </button>
            );
          })}
          {visibleCategories.length === 0 && (
            <p className="text-xs text-gray-400 px-2.5 py-2">No categories in this group yet.</p>
          )}
        </div>
      </Section>

      {/* Budget */}
      <Section title="Budget" icon={Wallet}>
        <div className="grid grid-cols-1 gap-1.5 mb-3">
          {BUDGET_PRESETS.map((preset, i) => (
            <button
              key={preset.label}
              type="button"
              onClick={() => update("budget", { budget_min: preset.min, budget_max: preset.max })}
              className={[
                "text-left px-3 py-2 rounded-lg text-sm transition-colors",
                activeBudgetIdx === i ? "bg-accent-50 text-accent-700 font-semibold" : "text-gray-600 hover:bg-gray-50",
              ].join(" ")}
            >
              {preset.label}
            </button>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-2">
          <input
            type="number"
            min="0"
            placeholder="Min ₹"
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent-100 focus:border-accent-400"
            value={filters.budget_min || ""}
            onChange={(e) => update("budget_min", e.target.value)}
          />
          <input
            type="number"
            min="0"
            placeholder="Max ₹"
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-accent-100 focus:border-accent-400"
            value={filters.budget_max || ""}
            onChange={(e) => update("budget_max", e.target.value)}
          />
        </div>
      </Section>

      {/* Guest capacity */}
      <Section title="Guest Capacity" icon={Users2} defaultOpen={false}>
        <input
          type="number"
          min="0"
          placeholder="Minimum guests, e.g. 200"
          className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-accent-100 focus:border-accent-400"
          value={filters.capacity_min || ""}
          onChange={(e) => update("capacity_min", e.target.value)}
        />
        <p className="text-[11px] text-gray-400 mt-1.5">Only for venues that list a max guest count.</p>
      </Section>

      {/* Rating */}
      <Section title="Minimum Rating" icon={Star}>
        <div className="flex flex-wrap gap-2">
          {RATING_PRESETS.map((p) => (
            <button
              key={p.label}
              type="button"
              onClick={() => update("rating", p.value)}
              className={[
                "flex items-center gap-1 px-3 py-1.5 rounded-full text-xs font-semibold border transition-colors",
                (filters.rating || "") === p.value
                  ? "bg-navy-900 text-white border-navy-900"
                  : "bg-white text-gray-600 border-gray-200 hover:border-navy-300",
              ].join(" ")}
            >
              {p.value && <Star size={11} className="fill-current" />} {p.label}
            </button>
          ))}
        </div>
      </Section>
    </div>
  );
}

/**
 * FilterSidebar
 *
 * Desktop: sticky column on the left of the results.
 * Mobile: slides in as a full-height drawer from the left, opened via the
 * "Filters" button in the search toolbar (see SearchPage). Same filter body
 * powers both so behaviour never drifts between breakpoints.
 */
export default function FilterSidebar({ filters, onChange, mobileOpen, onMobileClose }) {
  const { categories, venueCategories, vendorCategories } = useCategories();
  const count = activeFilterCount(filters);

  const update = (key, value) => {
    if (key === "budget") {
      onChange({ ...filters, budget_min: value.budget_min, budget_max: value.budget_max });
      return;
    }
    onChange({ ...filters, [key]: value });
  };

  const clearAll = () => {
    const next = { ...filters };
    ["city", "category", "budget_min", "budget_max", "capacity_min", "rating"].forEach(
      (key) => delete next[key]
    );
    onChange(next);
  };

  const header = (
    <div className="flex items-center justify-between mb-1">
      <h3 className="font-display font-bold text-base text-navy-900">Filters</h3>
      {count > 0 && (
        <button
          type="button"
          onClick={clearAll}
          className="flex items-center gap-1 text-xs font-semibold text-accent-600 hover:text-accent-700"
        >
          <RotateCcw size={11} /> Clear ({count})
        </button>
      )}
    </div>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden md:block w-72 flex-shrink-0">
        <div className="sticky top-24 bg-white border border-gray-100 rounded-2xl p-5 shadow-sm">
          {header}
          <div className="mt-3">
            <FilterBody
              filters={filters}
              update={update}
              categories={categories}
              venueCategories={venueCategories}
              vendorCategories={vendorCategories}
            />
          </div>
        </div>
      </aside>

      {/* Mobile drawer */}
      <AnimatePresence>
        {mobileOpen && (
          <div className="md:hidden fixed inset-0 z-50">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={onMobileClose}
              className="absolute inset-0 bg-navy-900/50 backdrop-blur-sm"
            />
            <motion.div
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "tween", duration: 0.25, ease: [0.22, 1, 0.36, 1] }}
              className="absolute left-0 top-0 bottom-0 w-[85%] max-w-sm bg-white shadow-2xl flex flex-col"
            >
              <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
                {header}
                <button
                  type="button"
                  onClick={onMobileClose}
                  className="w-8 h-8 flex items-center justify-center rounded-full bg-gray-50 text-gray-500 flex-shrink-0 ml-2"
                >
                  <X size={16} />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto px-5 py-4">
                <FilterBody
                  filters={filters}
                  update={update}
                  categories={categories}
                  venueCategories={venueCategories}
                  vendorCategories={vendorCategories}
                />
              </div>
              <div className="px-5 py-4 border-t border-gray-100">
                <button
                  type="button"
                  onClick={onMobileClose}
                  className="w-full text-white text-sm font-bold py-3 rounded-xl shadow-sm"
                  style={{ background: "linear-gradient(135deg,#e8192c,#f5a623)" }}
                >
                  Show results
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
}
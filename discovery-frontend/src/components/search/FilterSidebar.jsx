import React, { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  MapPin, Wallet, Users2, Star, X, RotateCcw, ChevronDown, Building2, Sparkles, SlidersHorizontal,
} from "lucide-react";
import resolveCategoryIcon from "./categoryIcon";
import useCategories from "./useCategories";
import CitySelect from "../common/CitySelect";

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

// Guest capacity only makes sense for event venues (or when no category is picked).
const VENUE_SLUGS = ["marriage-hall", "banquet-hall", "party-lawn", "farmhouse"];

const FILTER_KEYS = ["city", "category", "budget_min", "budget_max", "capacity_min", "rating"];

function activeFilterCount(filters) {
  return FILTER_KEYS.filter((k) => filters[k]).length;
}

const inputCls =
  "w-full px-3 py-2.5 border-2 border-navy-100 rounded-xl text-sm text-navy-700 placeholder-navy-300 focus:outline-none focus:border-gold-500 transition-colors";

function Section({ title, icon: Icon, children, defaultOpen = true }) {
  const [open, setOpen] = useState(defaultOpen);
  // Clip only while animating, so dropdowns inside (CitySelect) are not cut off once open.
  const [settled, setSettled] = useState(defaultOpen);

  const toggle = () => {
    setSettled(false);
    setOpen((o) => !o);
  };

  return (
    <div className="border-b border-navy-50 pb-4 last:border-0 last:pb-0">
      <button type="button" onClick={toggle} aria-expanded={open} className="w-full flex items-center justify-between mb-3">
        <span className="flex items-center gap-2.5 text-sm font-extrabold text-navy-700">
          <span className="w-7 h-7 rounded-lg bg-[#FFF6E8] flex items-center justify-center">
            <Icon size={14} className="text-accent-500" />
          </span>
          {title}
        </span>
        <motion.span animate={{ rotate: open ? 180 : 0 }} transition={{ duration: 0.2 }}>
          <ChevronDown size={15} className="text-navy-300" />
        </motion.span>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            onAnimationComplete={() => setSettled(true)}
            style={{ overflow: settled ? "visible" : "hidden" }}
          >
            {children}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

function Pill({ active, onClick, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={[
        "px-3 py-1.5 rounded-full text-xs font-bold border-2 transition-colors",
        active
          ? "bg-navy-700 text-white border-navy-700"
          : "bg-white text-navy-500 border-navy-100 hover:border-navy-300",
      ].join(" ")}
    >
      {children}
    </button>
  );
}

function FilterBody({ filters, update, categories, venueCategories, vendorCategories }) {
  const [categoryTab, setCategoryTab] = useState("all");
  const activeBudgetIdx = BUDGET_PRESETS.findIndex(
    (p) => p.min === (filters.budget_min || "") && p.max === (filters.budget_max || "")
  );

  const visibleCategories =
    categoryTab === "venues" ? venueCategories : categoryTab === "vendors" ? vendorCategories : categories;

  const showCapacity = !filters.category || VENUE_SLUGS.includes(filters.category);

  return (
    <div className="space-y-4">
      <Section title="City" icon={MapPin}>
        <CitySelect value={filters.city || ""} onChange={(val) => update("city", val)} placeholder="All cities" />
      </Section>

      <Section title="Category" icon={Building2}>
        <div className="flex gap-1 mb-3 bg-navy-50 p-1 rounded-xl">
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
                "flex-1 text-xs font-bold py-1.5 rounded-lg transition-colors",
                categoryTab === tab.key ? "bg-white text-navy-700 shadow-sm" : "text-navy-400",
              ].join(" ")}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="max-h-60 overflow-y-auto pr-1 space-y-1 no-scrollbar">
          <button
            type="button"
            onClick={() => update("category", "")}
            className={[
              "w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm text-left transition-colors",
              !filters.category ? "bg-accent-50 text-accent-600 font-extrabold" : "text-navy-500 hover:bg-navy-50",
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
                  "w-full flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm text-left transition-colors",
                  active ? "bg-accent-50 text-accent-600 font-extrabold" : "text-navy-500 hover:bg-navy-50",
                ].join(" ")}
              >
                <Icon size={14} /> {cat.label}
              </button>
            );
          })}
          {visibleCategories.length === 0 && (
            <p className="text-xs text-navy-300 px-3 py-2">No categories in this group yet.</p>
          )}
        </div>
      </Section>

      <Section title="Budget" icon={Wallet}>
        <div className="flex flex-wrap gap-1.5 mb-3">
          {BUDGET_PRESETS.map((preset, i) => (
            <Pill
              key={preset.label}
              active={activeBudgetIdx === i}
              onClick={() => update("budget", { budget_min: preset.min, budget_max: preset.max })}
            >
              {preset.label}
            </Pill>
          ))}
        </div>
        <div className="grid grid-cols-2 gap-2">
          <input
            type="number"
            min="0"
            placeholder="Min ₹"
            className={inputCls}
            value={filters.budget_min || ""}
            onChange={(e) => update("budget_min", e.target.value)}
          />
          <input
            type="number"
            min="0"
            placeholder="Max ₹"
            className={inputCls}
            value={filters.budget_max || ""}
            onChange={(e) => update("budget_max", e.target.value)}
          />
        </div>
      </Section>

      {showCapacity && (
        <Section title="Guest Capacity" icon={Users2} defaultOpen={false}>
          <input
            type="number"
            min="0"
            placeholder="Minimum guests, e.g. 200"
            className={inputCls}
            value={filters.capacity_min || ""}
            onChange={(e) => update("capacity_min", e.target.value)}
          />
          <p className="text-[11px] text-navy-300 mt-1.5">Only for venues that list a max guest count.</p>
        </Section>
      )}

      <Section title="Minimum Rating" icon={Star}>
        <div className="flex flex-wrap gap-2">
          {RATING_PRESETS.map((p) => (
            <Pill key={p.label} active={(filters.rating || "") === p.value} onClick={() => update("rating", p.value)}>
              <span className="inline-flex items-center gap-1">
                {p.value && <Star size={11} className="fill-current" />} {p.label}
              </span>
            </Pill>
          ))}
        </div>
      </Section>
    </div>
  );
}

/**
 * FilterSidebar
 * Desktop: sticky column left of the results (sits under the sticky header).
 * Mobile: slide-in drawer opened from the "Filters" button in the toolbar.
 * Same body powers both so behaviour never drifts between breakpoints.
 */
export default function FilterSidebar({ filters, onChange, mobileOpen, onMobileClose }) {
  const { liveCategories: categories, venueCategories, vendorCategories } = useCategories();
  const count = activeFilterCount(filters);

  const update = (key, value) => {
    if (key === "budget") {
      onChange({ ...filters, budget_min: value.budget_min, budget_max: value.budget_max, page: undefined });
      return;
    }
    onChange({ ...filters, [key]: value, page: undefined });
  };

  const clearAll = () => {
    const next = { ...filters };
    FILTER_KEYS.forEach((key) => delete next[key]);
    delete next.page;
    onChange(next);
  };

  const header = (
    <div className="flex items-center justify-between gap-3 flex-1">
      <h3 className="font-display font-extrabold text-base text-navy-700 flex items-center gap-2">
        <SlidersHorizontal size={16} className="text-accent-500" /> Filters
      </h3>
      {count > 0 && (
        <button
          type="button"
          onClick={clearAll}
          className="flex items-center gap-1 text-xs font-extrabold text-accent-500 hover:text-accent-600"
        >
          <RotateCcw size={11} /> Clear ({count})
        </button>
      )}
    </div>
  );

  return (
    <>
      {/* Desktop sidebar */}
      <aside className="hidden md:block w-72 flex-shrink-0" aria-label="Filters">
        <div className="sticky top-[150px] bg-white border border-navy-100 rounded-3xl p-5 shadow-[0_20px_40px_-30px_rgba(26,32,53,0.4)] max-h-[calc(100vh-170px)] overflow-y-auto no-scrollbar">
          {header}
          <div className="mt-4">
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
          <div className="md:hidden fixed inset-0 z-[60]">
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={onMobileClose}
              className="absolute inset-0 bg-navy-800/60 backdrop-blur-sm"
            />
            <motion.div
              role="dialog"
              aria-modal="true"
              aria-label="Filters"
              initial={{ x: "-100%" }}
              animate={{ x: 0 }}
              exit={{ x: "-100%" }}
              transition={{ type: "tween", duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
              className="absolute left-0 top-0 bottom-0 w-[88%] max-w-sm bg-[#FFFBF3] shadow-2xl flex flex-col"
            >
              <div className="flex items-center justify-between px-5 py-4 border-b border-navy-100 bg-white">
                {header}
                <button
                  type="button"
                  onClick={onMobileClose}
                  aria-label="Close filters"
                  className="w-9 h-9 flex items-center justify-center rounded-full bg-navy-50 text-navy-600 flex-shrink-0 ml-3"
                >
                  <X size={16} />
                </button>
              </div>
              <div className="flex-1 overflow-y-auto px-5 py-5">
                <FilterBody
                  filters={filters}
                  update={update}
                  categories={categories}
                  venueCategories={venueCategories}
                  vendorCategories={vendorCategories}
                />
              </div>
              <div className="px-5 py-4 border-t border-navy-100 bg-white">
                <button
                  type="button"
                  onClick={onMobileClose}
                  className="w-full rounded-full bg-accent-500 text-white text-sm font-extrabold py-3.5 shadow-[0_4px_0_0_#9e0f1b] active:translate-y-1 active:shadow-none transition"
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
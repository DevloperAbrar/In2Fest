import React from "react";
import { AnimatePresence, motion } from "framer-motion";
import { X, RotateCcw } from "lucide-react";
import useCategories from "./useCategories";

function formatINR(n) {
  const num = Number(n);
  if (isNaN(num)) return n;
  if (num >= 100000) return `₹${(num / 100000).toFixed(num % 100000 === 0 ? 0 : 1)}L`;
  if (num >= 1000) return `₹${(num / 1000).toFixed(num % 1000 === 0 ? 0 : 1)}K`;
  return `₹${num.toLocaleString("en-IN")}`;
}

/**
 * Renders every "real" active filter as a removable pill, plus a single
 * "Clear all" action. Keeps people oriented on what's currently narrowing
 * their results - the #1 complaint about buried sidebar filters is that
 * users forget they turned one on and can't work out why results look thin.
 */
export default function ActiveFiltersBar({ filters, onRemove, onClearAll }) {
  const { categories } = useCategories();

  const chips = [];

  if (filters.q) chips.push({ key: "q", label: `"${filters.q}"` });
  if (filters.city) chips.push({ key: "city", label: filters.city });
  if (filters.category) {
    const cat = categories.find((c) => c.slug === filters.category);
    chips.push({ key: "category", label: cat?.label || filters.category });
  }
  if (filters.budget_min || filters.budget_max) {
    const min = filters.budget_min ? formatINR(filters.budget_min) : "₹0";
    const max = filters.budget_max ? formatINR(filters.budget_max) : "Any";
    chips.push({ key: "budget", label: `Budget: ${min} - ${max}`, keys: ["budget_min", "budget_max"] });
  }
  if (filters.capacity_min) chips.push({ key: "capacity_min", label: `${filters.capacity_min}+ guests` });
  if (filters.rating) chips.push({ key: "rating", label: `${filters.rating}★ & up` });

  if (chips.length === 0) return null;

  return (
    <div className="flex items-center gap-2 flex-wrap">
      <AnimatePresence initial={false}>
        {chips.map((chip) => (
          <motion.button
            key={chip.key}
            type="button"
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.8 }}
            transition={{ duration: 0.15 }}
            onClick={() => onRemove(chip.keys || [chip.key])}
            className="flex items-center gap-1.5 bg-navy-50 border border-navy-100 text-navy-700 text-xs font-medium pl-3 pr-2 py-1.5 rounded-full hover:bg-navy-100 transition-colors"
          >
            {chip.label}
            <X size={12} className="text-navy-400" />
          </motion.button>
        ))}
      </AnimatePresence>

      <button
        type="button"
        onClick={onClearAll}
        className="flex items-center gap-1 text-xs font-semibold text-accent-600 hover:text-accent-700 px-2 py-1.5"
      >
        <RotateCcw size={12} /> Clear all
      </button>
    </div>
  );
}
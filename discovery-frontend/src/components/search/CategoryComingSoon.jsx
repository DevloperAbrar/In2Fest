import React from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Rocket, ArrowRight, Sparkles } from "lucide-react";
import resolveCategoryIcon from "./categoryIcon";

/**
 * CategoryComingSoon
 *
 * Shown instead of the normal "no results" empty state when the person has
 * picked a specific category that simply doesn't have any live vendors on
 * the marketplace yet (as opposed to a genuine 0-result filter combo on a
 * category that IS live - that still gets ResultsGrid's regular empty
 * state). We're onboarding vendors category-by-category while ads point at
 * specific categories, so this keeps an unpopulated category page from
 * looking broken/dead instead of just showing nothing.
 */
export default function CategoryComingSoon({ category, categories = [], onSelectCategory, onBrowseAll }) {
  const Icon = resolveCategoryIcon(category?.icon);
  const label = category?.label || "This category";

  // A handful of other live categories to nudge people toward, so the
  // dead end always has an obvious next click.
  const suggestions = categories.filter((c) => c.slug !== category?.slug).slice(0, 6);

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35 }}
      className="relative overflow-hidden text-center py-16 px-6 bg-white border border-gray-100 rounded-2xl"
    >
      {/* soft decorative glow, matches the site's red/gold gradient language */}
      <div
        className="pointer-events-none absolute -top-24 left-1/2 -translate-x-1/2 w-72 h-72 rounded-full opacity-[0.07] blur-3xl"
        style={{ background: "linear-gradient(135deg,#e8192c,#f5a623)" }}
      />

      {/* Icon with pulsing rings */}
      <div className="relative w-24 h-24 mx-auto mb-6">
        {[0, 1].map((i) => (
          <motion.span
            key={i}
            className="absolute inset-0 rounded-full"
            style={{ border: "1.5px solid #e8192c33" }}
            animate={{ scale: [1, 1.6, 1.6], opacity: [0.5, 0, 0] }}
            transition={{ duration: 2.4, repeat: Infinity, delay: i * 0.8, ease: "easeOut" }}
          />
        ))}
        <motion.div
          animate={{ y: [0, -6, 0] }}
          transition={{ duration: 2.6, repeat: Infinity, ease: "easeInOut" }}
          className="relative w-24 h-24 rounded-full flex items-center justify-center shadow-lg"
          style={{ background: "linear-gradient(135deg,#e8192c,#f5a623)" }}
        >
          <Icon size={34} className="text-white" />
        </motion.div>
      </div>

      <motion.span
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1, duration: 0.3 }}
        className="inline-flex items-center gap-1.5 text-[11px] font-bold tracking-widest uppercase text-accent-700 bg-accent-50 border border-accent-100 px-3.5 py-1.5 rounded-full mb-4"
      >
        <Rocket size={12} /> Coming Soon
      </motion.span>

      <motion.h3
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.15, duration: 0.35 }}
        className="font-display font-extrabold text-navy-900 text-xl md:text-2xl mb-2.5"
      >
        {label} vendors are on their way
      </motion.h3>

      <motion.p
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2, duration: 0.35 }}
        className="text-sm text-gray-500 max-w-md mx-auto mb-7 leading-relaxed"
      >
        We're onboarding verified {label.toLowerCase()} vendors right now. This category will go
        live shortly -stay tuned, or explore categories that are already up and running.
      </motion.p>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.25, duration: 0.35 }}
        className="flex flex-wrap items-center justify-center gap-3 mb-9"
      >
        {onBrowseAll && (
          <button
            type="button"
            onClick={onBrowseAll}
            className="flex items-center gap-1.5 text-sm font-bold text-white px-5 py-2.5 rounded-xl shadow-sm"
            style={{ background: "linear-gradient(135deg,#e8192c,#f5a623)" }}
          >
            Browse All Vendors <ArrowRight size={14} />
          </button>
        )}
        <Link
          to="/register-free"
          className="flex items-center gap-1.5 text-sm font-semibold text-navy-800 bg-white border border-gray-200 px-5 py-2.5 rounded-xl shadow-sm hover:border-accent-300 hover:text-accent-600 transition-colors"
        >
          <Sparkles size={14} /> List your {label} business -Free
        </Link>
      </motion.div>

      {suggestions.length > 0 && onSelectCategory && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.3, duration: 0.35 }}
        >
          <p className="text-[11px] font-bold tracking-wide uppercase text-gray-400 mb-3">
            Already live
          </p>
          <div className="flex flex-wrap items-center justify-center gap-2">
            {suggestions.map((c) => {
              const SuggestionIcon = resolveCategoryIcon(c.icon);
              return (
                <button
                  key={c.slug}
                  type="button"
                  onClick={() => onSelectCategory(c.slug)}
                  className="flex items-center gap-1.5 text-xs font-semibold text-gray-600 bg-gray-50 hover:bg-accent-50 hover:text-accent-700 px-3 py-1.5 rounded-full transition-colors"
                >
                  <SuggestionIcon size={12} /> {c.label}
                </button>
              );
            })}
          </div>
        </motion.div>
      )}
    </motion.div>
  );
}
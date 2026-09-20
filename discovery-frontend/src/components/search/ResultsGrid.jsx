import React from "react";
import { motion } from "framer-motion";
import { ChevronLeft, ChevronRight, SearchX } from "lucide-react";
import VendorCard from "./VendorCard";

const gridVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.05 } },
};
const cardVariants = {
  hidden: { opacity: 0, y: 16 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.35, ease: [0.22, 1, 0.36, 1] } },
};

// Windowed page numbers so 40-page results don't render 40 buttons.
function getPageWindow(page, totalPages, span = 5) {
  let start = Math.max(1, page - Math.floor(span / 2));
  let end = Math.min(totalPages, start + span - 1);
  start = Math.max(1, end - span + 1);
  return Array.from({ length: end - start + 1 }, (_, i) => start + i);
}

function VendorGrid({ vendors }) {
  return (
    <motion.div
      variants={gridVariants}
      initial="hidden"
      animate="visible"
      className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4"
    >
      {vendors.map((v) => (
        <motion.div key={v.id} variants={cardVariants}>
          <VendorCard vendor={v} />
        </motion.div>
      ))}
    </motion.div>
  );
}

/**
 * ResultsGrid
 *
 * `activeCategoryLabel` is only used to split/label the two sections below -
 * it never affects which vendors are shown or their order (that's already
 * decided server-side in search.service.js).
 *
 * When the current page of results has a mix of vendors whose PRIMARY
 * category matches what was searched and vendors who only offer it as a
 * secondary service (see category_match on each vendor, from the search
 * API), we show them as two clearly separated groups - specialists first,
 * "also offer this" after - the same way JustDial-style listings separate
 * a category's core businesses from allied/secondary ones. If there's no
 * such mix (no category filter, or every match is primary), this renders
 * exactly like a single plain grid, same as before.
 */
export default function ResultsGrid({ vendors = [], page, totalPages, onPageChange, onClearFilters, activeCategoryLabel }) {
  if (!vendors.length) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3 }}
        className="flex flex-col items-center justify-center text-center py-20 px-6 bg-white border border-gray-100 rounded-2xl"
      >
        <div className="w-14 h-14 rounded-full bg-gray-50 flex items-center justify-center mb-4">
          <SearchX size={24} className="text-gray-300" />
        </div>
        <p className="font-display font-bold text-navy-900 mb-1.5">No vendors match these filters</p>
        <p className="text-sm text-gray-500 max-w-sm mb-5">
          Try widening your budget, choosing a nearby city, or clearing a filter or two.
        </p>
        {onClearFilters && (
          <button
            type="button"
            onClick={onClearFilters}
            className="text-sm font-semibold text-white px-5 py-2.5 rounded-xl shadow-sm"
            style={{ background: "linear-gradient(135deg,#e8192c,#f5a623)" }}
          >
            Clear all filters
          </button>
        )}
      </motion.div>
    );
  }

  const pageWindow = getPageWindow(page, totalPages);

  const hasSecondaryMatches = vendors.some((v) => v.category_match === "secondary");
  const primaryVendors = hasSecondaryMatches ? vendors.filter((v) => v.category_match !== "secondary") : vendors;
  const secondaryVendors = hasSecondaryMatches ? vendors.filter((v) => v.category_match === "secondary") : [];

  return (
    <div>
      {hasSecondaryMatches && primaryVendors.length > 0 && (
        <p className="text-xs font-bold uppercase tracking-wide text-gray-400 mb-3">
          {activeCategoryLabel ? `${activeCategoryLabel} specialists` : "Best match"}
        </p>
      )}

      {primaryVendors.length > 0 && <VendorGrid vendors={primaryVendors} />}

      {hasSecondaryMatches && secondaryVendors.length > 0 && (
        <>
          <div className="flex items-center gap-3 mt-8 mb-4">
            <div className="h-px flex-1 bg-gray-100" />
            <p className="text-xs font-bold uppercase tracking-wide text-gray-400 whitespace-nowrap">
              Also offer {activeCategoryLabel || "this service"}
            </p>
            <div className="h-px flex-1 bg-gray-100" />
          </div>
          <VendorGrid vendors={secondaryVendors} />
        </>
      )}

      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-1.5 mt-10">
          <button
            type="button"
            onClick={() => onPageChange(Math.max(1, page - 1))}
            disabled={page === 1}
            className="w-9 h-9 flex items-center justify-center rounded-lg border border-gray-200 text-gray-500 disabled:opacity-30 hover:bg-gray-50 transition-colors"
          >
            <ChevronLeft size={15} />
          </button>

          {pageWindow[0] > 1 && (
            <>
              <button
                onClick={() => onPageChange(1)}
                className="w-9 h-9 rounded-lg text-sm text-gray-600 hover:bg-gray-50"
              >
                1
              </button>
              {pageWindow[0] > 2 && <span className="text-gray-300 px-1">…</span>}
            </>
          )}

          {pageWindow.map((p) => (
            <button
              key={p}
              onClick={() => onPageChange(p)}
              className={[
                "w-9 h-9 rounded-lg text-sm font-semibold transition-colors",
                p === page ? "text-white shadow-sm" : "text-gray-600 hover:bg-gray-50",
              ].join(" ")}
              style={p === page ? { background: "linear-gradient(135deg,#e8192c,#f5a623)" } : undefined}
            >
              {p}
            </button>
          ))}

          {pageWindow[pageWindow.length - 1] < totalPages && (
            <>
              {pageWindow[pageWindow.length - 1] < totalPages - 1 && (
                <span className="text-gray-300 px-1">…</span>
              )}
              <button
                onClick={() => onPageChange(totalPages)}
                className="w-9 h-9 rounded-lg text-sm text-gray-600 hover:bg-gray-50"
              >
                {totalPages}
              </button>
            </>
          )}

          <button
            type="button"
            onClick={() => onPageChange(Math.min(totalPages, page + 1))}
            disabled={page === totalPages}
            className="w-9 h-9 flex items-center justify-center rounded-lg border border-gray-200 text-gray-500 disabled:opacity-30 hover:bg-gray-50 transition-colors"
          >
            <ChevronRight size={15} />
          </button>
        </div>
      )}
    </div>
  );
}
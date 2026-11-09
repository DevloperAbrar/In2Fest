import React from "react";
import { motion } from "framer-motion";
import { ChevronLeft, ChevronRight } from "lucide-react";
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
      className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5"
    >
      {vendors.map((v) => (
        <motion.div key={v.id} variants={cardVariants} className="min-w-0">
          <VendorCard vendor={v} />
        </motion.div>
      ))}
    </motion.div>
  );
}

function GroupLabel({ children }) {
  return (
    <div className="flex items-center gap-3 mb-4">
      <span className="w-2 h-2 rounded-full bg-accent-500" />
      <p className="text-xs font-extrabold uppercase tracking-[0.16em] text-navy-500 whitespace-nowrap">{children}</p>
      <div className="h-px flex-1 bg-navy-100" />
    </div>
  );
}

function EmptyState({ onClearFilters }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="relative overflow-hidden flex flex-col items-center justify-center text-center py-16 px-6 bg-white border border-navy-100 rounded-3xl"
    >
      <svg width="150" height="90" viewBox="0 0 220 130" aria-hidden="true">
        <path d="M10 110 a100 100 0 0 1 200 0" fill="none" stroke="#f5a623" strokeWidth="14" strokeLinecap="round" />
        <path d="M42 110 a68 68 0 0 1 136 0" fill="none" stroke="#e8192c" strokeWidth="14" strokeLinecap="round" />
        <path d="M74 110 a36 36 0 0 1 72 0" fill="none" stroke="#1a2035" strokeWidth="14" strokeLinecap="round" />
      </svg>
      <p className="mt-5 font-display font-extrabold text-xl text-navy-700">No businesses match these filters</p>
      <p className="mt-2 text-sm text-navy-400 max-w-sm">
        Try widening your budget, choosing a nearby city, or clearing a filter or two.
      </p>
      {onClearFilters && (
        <button
          type="button"
          onClick={onClearFilters}
          className="mt-6 rounded-full bg-accent-500 text-white text-sm font-extrabold px-7 py-3 shadow-[0_4px_0_0_#9e0f1b] hover:-translate-y-0.5 active:translate-y-1 active:shadow-none transition"
        >
          Clear all filters
        </button>
      )}
    </motion.div>
  );
}

const pageBtn =
  "w-10 h-10 flex items-center justify-center rounded-full border-2 border-navy-100 text-navy-500 disabled:opacity-30 hover:border-navy-700 hover:text-navy-700 transition-colors";

/**
 * ResultsGrid
 *
 * `activeCategoryLabel` only splits/labels the two groups below; it never
 * changes which vendors show or their order (decided in search.service.js).
 * Primary-category vendors come first, "also offer this" vendors after.
 */
export default function ResultsGrid({ vendors = [], page, totalPages, onPageChange, onClearFilters, activeCategoryLabel }) {
  if (!vendors.length) return <EmptyState onClearFilters={onClearFilters} />;

  const pageWindow = getPageWindow(page, totalPages);

  const hasSecondaryMatches = vendors.some((v) => v.category_match === "secondary");
  const primaryVendors = hasSecondaryMatches ? vendors.filter((v) => v.category_match !== "secondary") : vendors;
  const secondaryVendors = hasSecondaryMatches ? vendors.filter((v) => v.category_match === "secondary") : [];

  return (
    <div>
      {hasSecondaryMatches && primaryVendors.length > 0 && (
        <GroupLabel>{activeCategoryLabel ? `${activeCategoryLabel} specialists` : "Best match"}</GroupLabel>
      )}

      {primaryVendors.length > 0 && <VendorGrid vendors={primaryVendors} />}

      {hasSecondaryMatches && secondaryVendors.length > 0 && (
        <div className="mt-10">
          <GroupLabel>Also offer {activeCategoryLabel || "this service"}</GroupLabel>
          <VendorGrid vendors={secondaryVendors} />
        </div>
      )}

      {totalPages > 1 && (
        <nav aria-label="Pagination" className="flex items-center justify-center gap-1.5 mt-12">
          <button
            type="button"
            aria-label="Previous page"
            onClick={() => onPageChange(Math.max(1, page - 1))}
            disabled={page === 1}
            className={pageBtn}
          >
            <ChevronLeft size={16} />
          </button>

          {pageWindow[0] > 1 && (
            <>
              <button onClick={() => onPageChange(1)} className="w-10 h-10 rounded-full text-sm font-bold text-navy-500 hover:bg-white">1</button>
              {pageWindow[0] > 2 && <span className="text-navy-300 px-1">…</span>}
            </>
          )}

          {pageWindow.map((p) => (
            <button
              key={p}
              onClick={() => onPageChange(p)}
              aria-current={p === page ? "page" : undefined}
              className={[
                "w-10 h-10 rounded-full text-sm font-extrabold transition-colors",
                p === page ? "bg-navy-700 text-white shadow-md" : "text-navy-500 hover:bg-white",
              ].join(" ")}
            >
              {p}
            </button>
          ))}

          {pageWindow[pageWindow.length - 1] < totalPages && (
            <>
              {pageWindow[pageWindow.length - 1] < totalPages - 1 && <span className="text-navy-300 px-1">…</span>}
              <button onClick={() => onPageChange(totalPages)} className="w-10 h-10 rounded-full text-sm font-bold text-navy-500 hover:bg-white">
                {totalPages}
              </button>
            </>
          )}

          <button
            type="button"
            aria-label="Next page"
            onClick={() => onPageChange(Math.min(totalPages, page + 1))}
            disabled={page === totalPages}
            className={pageBtn}
          >
            <ChevronRight size={16} />
          </button>
        </nav>
      )}
    </div>
  );
}
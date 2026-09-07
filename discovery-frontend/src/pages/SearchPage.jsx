import React, { useEffect, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { AnimatePresence, motion } from "framer-motion";
import { Map, LayoutGrid, SlidersHorizontal, ChevronDown } from "lucide-react";

import api from "../lib/api";
import FilterSidebar from "../components/search/FilterSidebar";
import ResultsGrid from "../components/search/ResultsGrid";
import SearchBar from "../components/search/SearchBar";
import MapView from "../components/search/MapView";
import CategoryChipStrip from "../components/search/CategoryChipStrip";
import ActiveFiltersBar from "../components/search/ActiveFiltersBar";
import SearchStats from "../components/search/SearchStats";
import FloatingOrbs from "../components/common/FloatingOrbs";
import SectionDivider from "../components/common/SectionDivider";
import VendorCTA from "../components/home/VendorCTA";

const SORT_OPTIONS = [
  { value: "relevant", label: "Most Relevant" },
  { value: "highest_rated", label: "Highest Rated" },
  { value: "price_low", label: "Price: Low to High" },
  { value: "price_high", label: "Price: High to Low" },
  { value: "newest", label: "Newest" },
];

/* Skeleton card shown while results are loading, so the page never feels
   blank/frozen the way a plain "Loading..." string does. */
function SkeletonCard() {
  return (
    <div className="bg-white border border-gray-100 rounded-2xl overflow-hidden">
      <div className="h-44 bg-gray-100 animate-pulse" />
      <div className="p-3.5 space-y-2">
        <div className="h-4 bg-gray-100 rounded animate-pulse w-3/4" />
        <div className="h-3 bg-gray-100 rounded animate-pulse w-1/2" />
        <div className="h-3 bg-gray-100 rounded animate-pulse w-2/3" />
      </div>
    </div>
  );
}

export default function SearchPage() {
  const [params, setParams] = useSearchParams();
  const [result, setResult] = useState({ results: [], total: 0, page: 1, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showMap, setShowMap] = useState(false);
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false);
  const [sortOpen, setSortOpen] = useState(false);

  const filters = Object.fromEntries(params.entries());

  useEffect(() => {
    setLoading(true);
    setError(null);
    api.get("/search", { params: filters })
      .then(({ data }) => {
        setResult(data.data);
        setLoading(false);
      })
      .catch((err) => {
        console.error("Search API failed:", err);
        setError(err?.response?.data?.message || err.message || "Something went wrong.");
        setLoading(false);
      });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.toString()]);

  const updateFilters = (next) => {
    const clean = Object.fromEntries(Object.entries(next).filter(([, v]) => v !== "" && v !== undefined));
    setParams(clean);
  };

  const removeFilterKeys = (keys) => {
    const next = { ...filters };
    keys.forEach((k) => delete next[k]);
    updateFilters(next);
  };

  const clearAllFilters = () => {
    const { q } = filters;
    updateFilters(q ? { q } : {});
  };

  const activeSort = filters.sort || "relevant";
  const activeSortLabel = SORT_OPTIONS.find((o) => o.value === activeSort)?.label || "Most Relevant";

  return (
    <>
      <Helmet><title>Search Wedding and Event Vendors - In2Fest</title></Helmet>

      <div className="relative">
        <FloatingOrbs />

        {/* ══ HERO ══ - dark navy band, matches the rest of the site's hero language */}
        <section
          className="relative overflow-hidden"
          style={{ background: "linear-gradient(135deg,#0b0e1c 0%,#1a2035 55%,#2a3151 100%)" }}
        >
          <div className="relative z-10 max-w-6xl mx-auto px-4 pt-14 pb-16 md:pt-16 md:pb-20 text-center">
            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              className="inline-flex items-center gap-1.5 text-xs font-bold tracking-widest uppercase text-white bg-white/10 border border-white/15 px-4 py-1.5 rounded-full mb-5"
            >
              Find &amp; Compare Verified Vendors
            </motion.p>
            <motion.h1
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45, delay: 0.05 }}
              className="font-display font-extrabold text-white mb-6"
              style={{ fontSize: "clamp(1.6rem,4vw,2.5rem)" }}
            >
              {filters.q
                ? <>Results for <span style={{ color: "#f5a623" }}>&ldquo;{filters.q}&rdquo;</span></>
                : <>Search wedding halls, photographers &amp; more</>}
            </motion.h1>
            <motion.div
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45, delay: 0.1 }}
            >
              <SearchBar large />
            </motion.div>
          </div>
        </section>
        <SectionDivider variant="curve" from="#1a2035" to="#faf9ff" height={56} />

        {/* ══ MAIN CONTENT ══ - soft off-white, distinct from the navy hero above */}
        <section style={{ background: "#faf9ff" }} className="relative z-10 pb-16">
          <div className="max-w-6xl mx-auto px-4 pt-6">

            {/* Category quick-pick strip */}
            <div className="mb-4">
              <CategoryChipStrip
                activeSlug={filters.category || ""}
                onSelect={(slug) => updateFilters({ ...filters, category: slug })}
              />
            </div>

            {/* Sticky toolbar: filters button (mobile), active chips, sort, view toggle */}
            <div className="sticky top-0 z-20 -mx-4 px-4 py-3 mb-4 bg-[#faf9ff]/95 backdrop-blur-sm border-b border-gray-100">
              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={() => setMobileFiltersOpen(true)}
                  className="md:hidden flex items-center gap-1.5 text-sm font-semibold bg-white border border-gray-200 px-3.5 py-2 rounded-lg text-navy-800 shadow-sm"
                >
                  <SlidersHorizontal size={14} /> Filters
                </button>

                <p className="text-sm text-gray-500 flex-shrink-0">
                  {!loading && (result.total > 0
                    ? <><span className="font-bold text-navy-900">{result.total}</span> vendors found</>
                    : "No vendors found")}
                </p>

                <div className="flex-1" />

                {/* Sort */}
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setSortOpen((o) => !o)}
                    className="flex items-center gap-1.5 text-sm bg-white border border-gray-200 px-3.5 py-2 rounded-lg text-navy-700 font-medium shadow-sm"
                  >
                    {activeSortLabel} <ChevronDown size={14} className="text-gray-400" />
                  </button>
                  <AnimatePresence>
                    {sortOpen && (
                      <motion.div
                        initial={{ opacity: 0, y: -6 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -6 }}
                        transition={{ duration: 0.15 }}
                        className="absolute right-0 mt-2 w-52 bg-white border border-gray-100 rounded-xl shadow-xl py-1.5 z-30"
                      >
                        {SORT_OPTIONS.map((opt) => (
                          <button
                            key={opt.value}
                            onClick={() => { updateFilters({ ...filters, sort: opt.value }); setSortOpen(false); }}
                            className={[
                              "w-full text-left px-4 py-2 text-sm hover:bg-gray-50 transition-colors",
                              activeSort === opt.value ? "text-accent-600 font-semibold" : "text-gray-600",
                            ].join(" ")}
                          >
                            {opt.label}
                          </button>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                {/* Grid / Map toggle - segmented control */}
                <div className="flex bg-white border border-gray-200 rounded-lg p-1 shadow-sm flex-shrink-0">
                  <button
                    onClick={() => setShowMap(false)}
                    className={[
                      "flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-md transition-colors",
                      !showMap ? "bg-navy-900 text-white" : "text-gray-500",
                    ].join(" ")}
                  >
                    <LayoutGrid size={13} /> List
                  </button>
                  <button
                    onClick={() => setShowMap(true)}
                    className={[
                      "flex items-center gap-1.5 text-xs font-semibold px-3 py-1.5 rounded-md transition-colors",
                      showMap ? "bg-navy-900 text-white" : "text-gray-500",
                    ].join(" ")}
                  >
                    <Map size={13} /> Map
                  </button>
                </div>
              </div>

              <div className="mt-3">
                <ActiveFiltersBar filters={filters} onRemove={removeFilterKeys} onClearAll={clearAllFilters} />
              </div>
            </div>

            {/* Quick stats strip */}
            {!loading && !error && result.results.length > 0 && (
              <div className="mb-5">
                <SearchStats vendors={result.results} total={result.total} />
              </div>
            )}

            {/* Sidebar + results */}
            <div className="flex flex-col md:flex-row gap-6">
              <FilterSidebar
                filters={filters}
                onChange={updateFilters}
                mobileOpen={mobileFiltersOpen}
                onMobileClose={() => setMobileFiltersOpen(false)}
              />

              <div className="flex-1 min-w-0">
                {loading ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}
                  </div>
                ) : error ? (
                  <div className="text-red-600 text-sm bg-red-50 border border-red-100 rounded-2xl px-5 py-4">
                    {error}
                  </div>
                ) : (
                  <AnimatePresence mode="wait">
                    {showMap ? (
                      <motion.div
                        key="map"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.2 }}
                      >
                        {/* Map is deliberately its own visually distinct panel,
                            not just the grid swapped out in place. */}
                        <div className="bg-white border border-gray-100 rounded-2xl p-2 shadow-sm">
                          <MapView vendors={result.results} onClose={() => setShowMap(false)} />
                        </div>
                      </motion.div>
                    ) : (
                      <motion.div
                        key="grid"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.2 }}
                      >
                        <ResultsGrid
                          vendors={result.results}
                          page={result.page}
                          totalPages={result.totalPages}
                          onPageChange={(p) => updateFilters({ ...filters, page: p })}
                          onClearFilters={clearAllFilters}
                        />
                      </motion.div>
                    )}
                  </AnimatePresence>
                )}
              </div>
            </div>
          </div>
        </section>

        <VendorCTA />
      </div>
    </>
  );
}
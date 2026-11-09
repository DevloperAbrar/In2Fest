import React, { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { AnimatePresence, motion } from "framer-motion";
import { Map, LayoutGrid, SlidersHorizontal, ChevronDown, ShieldCheck, MessageCircle, BadgeIndianRupee } from "lucide-react";

import api from "../lib/api";
import FilterSidebar from "../components/search/FilterSidebar";
import ResultsGrid from "../components/search/ResultsGrid";
import SearchBar from "../components/search/SearchBar";
import MapView from "../components/search/MapView";
import CategoryChipStrip from "../components/search/CategoryChipStrip";
import VerticalFilters from "../components/search/VerticalFilters";
import BusinessTypeChips from "../components/search/BusinessTypeChips";
import ActiveFiltersBar from "../components/search/ActiveFiltersBar";
import SearchStats from "../components/search/SearchStats";
import CategoryComingSoon from "../components/search/CategoryComingSoon";
import useCategories from "../components/search/useCategories";

const SORT_OPTIONS = [
  { value: "relevant", label: "Most Relevant" },
  { value: "highest_rated", label: "Highest Rated" },
  { value: "price_low", label: "Price: Low to High" },
  { value: "price_high", label: "Price: High to Low" },
  { value: "newest", label: "Newest" },
];

const POPULAR = ["Gym", "Library", "Shops", "Restaurant", "Events"];

// Filter keys that mean "this 0-result page is a genuine filter-combo miss,
// not an empty category" - if any of these are set alongside category, we
// keep the normal ResultsGrid empty state instead of Coming Soon.
const NON_CATEGORY_FILTER_KEYS = ["city", "budget_min", "budget_max", "capacity_min", "rating"];

/* Skeleton card shown while results are loading. */
function SkeletonCard() {
  return (
    <div className="bg-white border border-navy-100 rounded-3xl overflow-hidden">
      <div className="h-48 bg-navy-50 animate-pulse" />
      <div className="p-4 space-y-2.5">
        <div className="h-4 bg-navy-50 rounded animate-pulse w-3/4" />
        <div className="h-3 bg-navy-50 rounded animate-pulse w-1/2" />
        <div className="flex gap-1.5 pt-1">
          <div className="h-5 w-16 bg-navy-50 rounded-full animate-pulse" />
          <div className="h-5 w-20 bg-navy-50 rounded-full animate-pulse" />
        </div>
        <div className="h-8 bg-navy-50 rounded-full animate-pulse mt-3" />
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
  const { categories } = useCategories();

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
    delete next.page;
    updateFilters(next);
  };

  const clearAllFilters = () => {
    const { q } = filters;
    updateFilters(q ? { q } : {});
  };

  const activeSort = filters.sort || "relevant";
  const activeSortLabel = SORT_OPTIONS.find((o) => o.value === activeSort)?.label || "Most Relevant";

  // A category is picked, it is the ONLY meaningful filter, and the API found
  // nothing -> that category is not onboarded yet. Show Coming Soon instead of
  // the plain empty box. Any other real filter keeps the normal empty state.
  const activeCategory = categories.find((c) => c.slug === filters.category);
  const hasNonCategoryFilters = NON_CATEGORY_FILTER_KEYS.some((k) => filters[k]);
  const isCategoryComingSoon =
    !loading && !error && result.total === 0 && !!filters.category && !hasNonCategoryFilters;

  const pageTitle = filters.q
    ? `${filters.q} - Search Results | In2Fest`
    : activeCategory
    ? `${activeCategory.label}${filters.city ? ` in ${filters.city}` : " near you"} - In2Fest`
    : "Find Verified Local Businesses Near You - In2Fest";

  const filterCount = ["city", "category", "budget_min", "budget_max", "capacity_min", "rating"].filter((k) => filters[k]).length;

  return (
    <>
      <Helmet>
        <title>{pageTitle}</title>
        <meta
          name="description"
          content="Search verified gyms, libraries, restaurants, shops, clinics, salons and more. Compare, then call or WhatsApp the business directly. No commission."
        />
      </Helmet>

      <div className="relative">
        {/* ══ HERO ══ cream, matches the home page */}
        <section className="relative overflow-hidden bg-[#FFF6E8]">
          <svg className="absolute -left-10 -bottom-6 opacity-90 hidden md:block" width="260" height="130" viewBox="0 0 220 110" aria-hidden="true">
            <path d="M10 110 a100 100 0 0 1 200 0" fill="none" stroke="#f5a623" strokeWidth="18" strokeLinecap="round" />
            <path d="M42 110 a68 68 0 0 1 136 0" fill="none" stroke="#e8192c" strokeWidth="18" strokeLinecap="round" />
            <path d="M74 110 a36 36 0 0 1 72 0" fill="none" stroke="#1a2035" strokeWidth="18" strokeLinecap="round" />
          </svg>
          <svg className="absolute -right-10 -bottom-6 opacity-90 hidden md:block" width="260" height="130" viewBox="0 0 220 110" aria-hidden="true">
            <path d="M10 110 a100 100 0 0 1 200 0" fill="none" stroke="#1a2035" strokeWidth="18" strokeLinecap="round" />
            <path d="M42 110 a68 68 0 0 1 136 0" fill="none" stroke="#e8192c" strokeWidth="18" strokeLinecap="round" />
            <path d="M74 110 a36 36 0 0 1 72 0" fill="none" stroke="#f5a623" strokeWidth="18" strokeLinecap="round" />
          </svg>

          <div className="relative z-10 max-w-4xl mx-auto px-4 pt-10 pb-12 md:pt-14 md:pb-16 text-center">
            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4 }}
              className="inline-flex items-center gap-2 text-xs font-bold text-navy-600 bg-white rounded-full px-4 py-1.5 shadow-sm mb-5"
            >
              <span className="w-2 h-2 rounded-full bg-accent-500" /> Find verified local businesses
            </motion.p>
            <motion.h1
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45, delay: 0.05 }}
              className="font-display font-extrabold text-navy-700 mb-6"
              style={{ fontSize: "clamp(1.9rem,5vw,3.2rem)", letterSpacing: "-0.03em", lineHeight: 1.05 }}
            >
              {filters.q ? (
                <>Results for <span className="text-accent-500">&ldquo;{filters.q}&rdquo;</span></>
              ) : activeCategory ? (
                <>{activeCategory.label} <span className="text-accent-500">{filters.city ? `in ${filters.city}` : "near you"}</span></>
              ) : (
                <>Find it. <span className="text-accent-500">Compare it.</span> Contact it.</>
              )}
            </motion.h1>
            <motion.div
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.45, delay: 0.1 }}
            >
              <SearchBar large />
            </motion.div>

            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5, delay: 0.25 }}
              className="mt-5 flex flex-wrap items-center justify-center gap-2"
            >
              <span className="text-xs font-bold text-navy-400 mr-1">Popular:</span>
              {POPULAR.map((p) => (
                <Link
                  key={p}
                  to={`/search?q=${encodeURIComponent(p.toLowerCase())}`}
                  className="rounded-full bg-white border border-navy-100 px-3.5 py-1 text-xs font-bold text-navy-600 hover:border-navy-700 hover:bg-navy-700 hover:text-white transition-colors"
                >
                  {p}
                </Link>
              ))}
            </motion.div>

            <ul className="mt-6 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs font-bold text-navy-500">
              <li className="inline-flex items-center gap-1.5"><ShieldCheck size={15} className="text-emerald-600" /> Verified businesses</li>
              <li className="inline-flex items-center gap-1.5"><MessageCircle size={15} className="text-[#25D366]" /> Contact directly on WhatsApp</li>
              <li className="inline-flex items-center gap-1.5"><BadgeIndianRupee size={15} className="text-gold-600" /> No commission</li>
            </ul>
          </div>
        </section>

        {/* ══ MAIN CONTENT ══ */}
        <section className="relative z-10 pb-16 bg-[#FFFBF3]">
          <div className="max-w-7xl mx-auto px-4 pt-6">

            {/* Category quick-pick strip */}
            <div className="mb-3">
              <CategoryChipStrip
                activeSlug={filters.category || ""}
                onSelect={(slug) => updateFilters({ ...filters, category: slug, business_type: undefined, page: undefined })}
              />
            </div>

            {/* Sticky toolbar. top-[68px] keeps it below the sticky site header. */}
            <div className="sticky top-[68px] z-20 -mx-4 px-4 py-3 mb-4 bg-[#FFFBF3]/95 backdrop-blur-sm border-b border-navy-100">
              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={() => setMobileFiltersOpen(true)}
                  className="md:hidden flex items-center gap-1.5 text-sm font-extrabold bg-white border-2 border-navy-100 px-3.5 py-2 rounded-full text-navy-700"
                >
                  <SlidersHorizontal size={14} /> Filters
                  {filterCount > 0 && (
                    <span className="ml-0.5 w-5 h-5 rounded-full bg-accent-500 text-white text-[11px] flex items-center justify-center">{filterCount}</span>
                  )}
                </button>

                <p className="text-sm text-navy-400 flex-shrink-0">
                  {!loading && (result.total > 0
                    ? <><span className="font-display font-extrabold text-navy-700 text-base">{result.total}</span> businesses found{filters.city ? ` in ${filters.city}` : ""}</>
                    : isCategoryComingSoon ? "Launching soon" : "No businesses found")}
                </p>

                <div className="flex-1" />

                {/* Sort + List/Map toggle don't make sense on the Coming Soon panel */}
                {!isCategoryComingSoon && (
                  <>
                    <div className="relative">
                      <button
                        type="button"
                        onClick={() => setSortOpen((o) => !o)}
                        aria-haspopup="listbox"
                        aria-expanded={sortOpen}
                        className="flex items-center gap-1.5 text-sm bg-white border-2 border-navy-100 hover:border-navy-300 px-4 py-2 rounded-full text-navy-700 font-bold transition-colors"
                      >
                        {activeSortLabel} <ChevronDown size={14} className="text-navy-300" />
                      </button>
                      <AnimatePresence>
                        {sortOpen && (
                          <motion.div
                            initial={{ opacity: 0, y: -6 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -6 }}
                            transition={{ duration: 0.15 }}
                            className="absolute right-0 mt-2 w-56 bg-white border border-navy-100 rounded-2xl shadow-[0_30px_60px_-24px_rgba(26,32,53,0.45)] p-1.5 z-30"
                          >
                            {SORT_OPTIONS.map((opt) => (
                              <button
                                key={opt.value}
                                onClick={() => { updateFilters({ ...filters, sort: opt.value, page: undefined }); setSortOpen(false); }}
                                className={[
                                  "w-full text-left px-3.5 py-2.5 rounded-xl text-sm transition-colors",
                                  activeSort === opt.value ? "bg-accent-50 text-accent-600 font-extrabold" : "text-navy-500 hover:bg-navy-50",
                                ].join(" ")}
                              >
                                {opt.label}
                              </button>
                            ))}
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </div>

                    {/* List / Map toggle */}
                    <div className="flex bg-white border-2 border-navy-100 rounded-full p-0.5 flex-shrink-0">
                      <button
                        onClick={() => setShowMap(false)}
                        aria-pressed={!showMap}
                        className={[
                          "flex items-center gap-1.5 text-xs font-extrabold px-3.5 py-1.5 rounded-full transition-colors",
                          !showMap ? "bg-navy-700 text-white" : "text-navy-400",
                        ].join(" ")}
                      >
                        <LayoutGrid size={13} /> List
                      </button>
                      <button
                        onClick={() => setShowMap(true)}
                        aria-pressed={showMap}
                        className={[
                          "flex items-center gap-1.5 text-xs font-extrabold px-3.5 py-1.5 rounded-full transition-colors",
                          showMap ? "bg-navy-700 text-white" : "text-navy-400",
                        ].join(" ")}
                      >
                        <Map size={13} /> Map
                      </button>
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Type + quick filters + active filters (not sticky, so the toolbar stays slim) */}
            <div className="mb-5">
              <BusinessTypeChips
                city={filters.city}
                category={filters.category}
                active={filters.business_type}
                onSelect={(slug) => updateFilters({ ...filters, business_type: slug, page: undefined })}
              />
              <VerticalFilters category={filters.category} filters={filters} onChange={updateFilters} />
              <ActiveFiltersBar filters={filters} onRemove={removeFilterKeys} onClearAll={clearAllFilters} />
            </div>

            {/* Quick stats strip */}
            {!loading && !error && result.results.length > 0 && (
              <div className="mb-6">
                <SearchStats vendors={result.results} total={result.total} />
              </div>
            )}

            {/* Sidebar + results */}
            <div className="flex flex-col md:flex-row gap-6 items-start">
              <FilterSidebar
                filters={filters}
                onChange={updateFilters}
                mobileOpen={mobileFiltersOpen}
                onMobileClose={() => setMobileFiltersOpen(false)}
              />

              <div className="flex-1 min-w-0 w-full">
                {loading ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-5">
                    {Array.from({ length: 6 }).map((_, i) => <SkeletonCard key={i} />)}
                  </div>
                ) : error ? (
                  <div className="text-accent-600 text-sm bg-accent-50 border border-accent-100 rounded-3xl px-5 py-4">
                    {error}
                  </div>
                ) : isCategoryComingSoon ? (
                  <CategoryComingSoon
                    category={activeCategory || { slug: filters.category, label: filters.category }}
                    categories={categories}
                    onSelectCategory={(slug) => updateFilters({ ...filters, category: slug, page: undefined })}
                    onBrowseAll={clearAllFilters}
                  />
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
                        <div className="bg-white border border-navy-100 rounded-3xl p-2">
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
                          activeCategoryLabel={activeCategory?.label}
                        />
                      </motion.div>
                    )}
                  </AnimatePresence>
                )}
              </div>
            </div>
          </div>
        </section>
        {/* VendorCTA removed: the new Footer already shows the red vendor CTA band on inner pages. */}
      </div>
    </>
  );
}
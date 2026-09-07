import React, { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Helmet } from "react-helmet-async";
import { motion, AnimatePresence } from "framer-motion";
import { Search, ChevronRight, SearchX } from "lucide-react";

import { BASE_DOMAIN, BRAND_NAME } from "../lib/constants";
import { CATEGORY_GROUPS, OTHER_GROUP } from "../lib/categoryGroups";
import useCategories from "../components/search/useCategories";
import resolveCategoryIcon from "../components/search/categoryIcon";
import BreadcrumbNav from "../components/seo/BreadcrumbNav";
import SectionDivider from "../components/common/SectionDivider";

function scrollToGroup(key) {
  document.getElementById(`group-${key}`)?.scrollIntoView({ behavior: "smooth", block: "start" });
}

function CategoryRow({ cat }) {
  const Icon = resolveCategoryIcon(cat.icon);
  return (
    <Link
      to={`/search?category=${cat.slug}`}
      className="group flex items-center gap-3 rounded-xl p-2.5 hover:bg-gray-50 transition-colors"
    >
      <span className="w-9 h-9 rounded-lg bg-gray-50 flex items-center justify-center flex-shrink-0 group-hover:bg-accent-50 transition-colors">
        <Icon size={17} className="text-gray-500 group-hover:text-accent-600 transition-colors" />
      </span>
      <span className="text-sm font-semibold text-navy-800 group-hover:text-navy-900 truncate">
        {cat.label}
      </span>
      <ChevronRight
        size={14}
        className="ml-auto text-gray-300 opacity-0 -translate-x-1 group-hover:opacity-100 group-hover:translate-x-0 transition-all flex-shrink-0"
      />
    </Link>
  );
}

function GroupPanel({ group, items, index }) {
  if (!items.length) return null;
  const GroupIcon = group.icon;

  return (
    <motion.section
      id={`group-${group.key}`}
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-80px" }}
      transition={{ duration: 0.35, delay: Math.min(index * 0.04, 0.16) }}
      className="bg-white border border-gray-100 rounded-2xl shadow-sm p-5 sm:p-6 mb-5 scroll-mt-24"
    >
      <div className="flex items-center gap-3 pb-4 mb-1 border-b border-gray-100">
        <span className="w-9 h-9 rounded-lg bg-accent-50 flex items-center justify-center flex-shrink-0">
          <GroupIcon size={17} className="text-accent-600" />
        </span>
        <h2 className="font-display font-bold text-navy-900 text-base">{group.title}</h2>
        <span className="text-xs text-gray-400 ml-auto flex-shrink-0">
          {items.length} {items.length === 1 ? "category" : "categories"}
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-x-2 gap-y-1 pt-2">
        {items.map((cat) => (
          <CategoryRow key={cat.slug} cat={cat} />
        ))}
      </div>
    </motion.section>
  );
}

export default function CategoriesIndexPage() {
  const { categories, loading } = useCategories();
  const [query, setQuery] = useState("");

  const groupedCategories = useMemo(() => {
    const q = query.trim().toLowerCase();
    const visible = q ? categories.filter((c) => c.label.toLowerCase().includes(q)) : categories;
    const usedSlugs = new Set();

    const groups = CATEGORY_GROUPS.map((group) => {
      const items = visible.filter((c) => group.slugs.includes(c.slug));
      items.forEach((c) => usedSlugs.add(c.slug));
      return { group, items };
    });

    const leftover = visible.filter((c) => !usedSlugs.has(c.slug));
    if (leftover.length) groups.push({ group: OTHER_GROUP, items: leftover });

    return groups.filter((g) => g.items.length > 0);
  }, [categories, query]);

  const totalVisible = groupedCategories.reduce((sum, g) => sum + g.items.length, 0);

  return (
    <>
      <Helmet>
        <title>All Wedding and Event Categories | {BRAND_NAME}</title>
        <meta
          name="description"
          content={`Browse every wedding and event vendor category on ${BRAND_NAME}, from banquet halls and marriage halls to photographers, decorators, caterers, DJs, mehndi artists and event management companies.`}
        />
        <link rel="canonical" href={`https://www.${BASE_DOMAIN}/categories`} />
      </Helmet>

      {/* ══ HERO ══ - same navy band used across the site */}
      <section
        className="relative overflow-hidden"
        style={{ background: "linear-gradient(135deg,#0b0e1c 0%,#1a2035 55%,#2a3151 100%)" }}
      >
        <div className="relative z-10 max-w-5xl mx-auto px-4 pt-8 pb-14 md:pt-10 md:pb-16">
          <BreadcrumbNav items={[{ label: "Categories" }]} />

          <h1 className="font-display font-extrabold text-white mt-6 mb-2.5 text-2xl md:text-3xl">
            Browse by Category
          </h1>
          <p className="text-white/60 text-sm md:text-base max-w-xl mb-6">
            Every wedding and event category available on {BRAND_NAME}. Pick one to see verified vendors near you.
          </p>

          <div className="relative max-w-md">
            <Search size={17} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search a category, e.g. Photographer"
              className="w-full pl-11 pr-4 py-2.5 rounded-full bg-white text-sm text-navy-800 shadow-sm border border-transparent focus:outline-none focus:ring-2 focus:ring-accent-200 focus:border-accent-300"
            />
          </div>
        </div>
      </section>
      <SectionDivider variant="curve" from="#1a2035" to="#faf9ff" height={44} />

      {/* ══ MAIN CONTENT ══ */}
      <section style={{ background: "#faf9ff" }} className="pb-16">
        <div className="max-w-5xl mx-auto px-4 pt-6">
          {/* Quick-jump row - lets people see every group at a glance and skip straight to one */}
          {!loading && groupedCategories.length > 1 && (
            <div className="flex flex-wrap gap-2 mb-6">
              {groupedCategories.map(({ group }) => (
                <button
                  key={group.key}
                  type="button"
                  onClick={() => scrollToGroup(group.key)}
                  className="px-3.5 py-1.5 rounded-full border border-gray-200 bg-white text-xs font-semibold text-gray-600 hover:border-accent-300 hover:text-accent-600 hover:bg-accent-50 transition-colors"
                >
                  {group.title}
                </button>
              ))}
            </div>
          )}

          {loading && categories.length === 0 ? (
            <div className="space-y-5">
              {Array.from({ length: 3 }).map((_, gi) => (
                <div key={gi} className="bg-white border border-gray-100 rounded-2xl p-6">
                  <div className="flex items-center gap-3 pb-4 mb-3 border-b border-gray-100">
                    <div className="w-9 h-9 rounded-lg bg-gray-100 animate-pulse" />
                    <div className="h-4 w-44 rounded bg-gray-100 animate-pulse" />
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-2">
                    {Array.from({ length: 6 }).map((__, ci) => (
                      <div key={ci} className="h-9 rounded-lg bg-gray-100 animate-pulse" />
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : totalVisible === 0 ? (
            <div className="flex flex-col items-center justify-center text-center py-20 px-6 bg-white border border-gray-100 rounded-2xl">
              <div className="w-14 h-14 rounded-full bg-gray-50 flex items-center justify-center mb-4">
                <SearchX size={24} className="text-gray-300" />
              </div>
              <p className="font-display font-bold text-navy-900 mb-1.5">No categories match "{query}"</p>
              <p className="text-sm text-gray-500 max-w-sm mb-5">
                Try a different word, or clear the search to see every category.
              </p>
              <button
                type="button"
                onClick={() => setQuery("")}
                className="text-sm font-semibold text-white px-5 py-2.5 rounded-xl bg-accent-600 hover:bg-accent-700 transition-colors"
              >
                Clear search
              </button>
            </div>
          ) : (
            <AnimatePresence mode="wait">
              <motion.div key={query} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                {groupedCategories.map(({ group, items }, i) => (
                  <GroupPanel key={group.key} group={group} items={items} index={i} />
                ))}
              </motion.div>
            </AnimatePresence>
          )}
        </div>
      </section>
    </>
  );
}
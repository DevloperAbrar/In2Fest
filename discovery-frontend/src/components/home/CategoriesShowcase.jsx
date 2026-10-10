import React, { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight } from "lucide-react";
import useCategories from "../search/useCategories";
import resolveCategoryIcon from "../search/categoryIcon";
import { getCategoryImage } from "../../lib/categoryMedia";

const BG = "#faf9ff";
const PANEL_LIMIT = 4;

// Groups live categories by the business type the Super Admin assigned.
function buildGroups(categories) {
  const map = new Map();
  categories
    .filter((c) => c.showOnHome)
    .forEach((c) => {
      if (!map.has(c.businessType)) {
        map.set(c.businessType, {
          key: c.businessType,
          title: c.businessTypeLabel,
          order: c.businessTypeOrder,
          items: [],
        });
      }
      map.get(c.businessType).items.push(c);
    });
  return [...map.values()].sort((a, b) => a.order - b.order);
}

function Tile({ cat, index }) {
  const [failed, setFailed] = useState(false);
  const src = getCategoryImage(cat);
  const Icon = resolveCategoryIcon(cat.icon);

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-30px" }}
      transition={{ duration: 0.4, delay: Math.min(index, 8) * 0.05, ease: [0.22, 1, 0.36, 1] }}
    >
      <Link
        to={`/search?category=${cat.slug}`}
        className="group relative block overflow-hidden rounded-xl border border-gray-100 bg-gray-100 shadow-sm"
      >
        <div className="relative aspect-[4/3] w-full overflow-hidden">
          {src && !failed ? (
            <img
              src={src}
              alt={cat.label}
              loading="lazy"
              onError={() => setFailed(true)}
              className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-110"
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-navy-50 to-navy-100">
              <Icon size={30} style={{ color: "#9aa0b8" }} />
            </div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/10 to-transparent" />
          <div className="absolute bottom-2.5 left-3 right-3">
            <p className="text-xs sm:text-sm font-bold text-white leading-tight drop-shadow">{cat.label}</p>
            {cat.tagline && (
              <p className="hidden sm:block text-[11px] text-white/75 leading-snug mt-0.5 line-clamp-1">{cat.tagline}</p>
            )}
          </div>
          <span
            className="absolute bottom-0 left-0 h-0.5 w-0 group-hover:w-full transition-all duration-300"
            style={{ background: "#e8192c" }}
          />
        </div>
      </Link>
    </motion.div>
  );
}

function GroupPanel({ group, onOpen, i }) {
  const shown = group.items.slice(0, PANEL_LIMIT);
  const extra = group.items.length - shown.length;
  return (
    <motion.div
      initial={{ opacity: 0, y: 28 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-50px" }}
      transition={{ duration: 0.5, delay: (i % 3) * 0.08, ease: [0.22, 1, 0.36, 1] }}
      className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm hover:shadow-lg transition-shadow h-full"
    >
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-display font-bold text-sm text-navy-900">{group.title}</h3>
        <button
          type="button"
          onClick={() => onOpen(group.key)}
          className="text-xs font-semibold hover:underline"
          style={{ color: "#e8192c" }}
        >
          {extra > 0 ? `+${extra} more` : "Open"}
        </button>
      </div>
      <div className="grid grid-cols-2 gap-2.5">
        {shown.map((cat, idx) => (
          <Tile key={cat.slug} cat={cat} index={idx} />
        ))}
      </div>
    </motion.div>
  );
}

export default function CategoriesShowcase() {
  const { categories } = useCategories();
  const groups = useMemo(() => buildGroups(categories), [categories]);
  const total = groups.reduce((n, g) => n + g.items.length, 0);
  const [active, setActive] = useState("all");

  const activeGroup = groups.find((g) => g.key === active) || null;
  const tabs = [{ key: "all", title: "All" }, ...groups.map((g) => ({ key: g.key, title: g.title }))];

  return (
    <div style={{ background: BG }}>
      <div style={{ lineHeight: 0, background: "#ffffff" }}>
        <svg viewBox="0 0 1440 80" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg" style={{ display: "block", width: "100%", height: "80px" }}>
          <path d="M0,0 Q720,160 1440,0 L1440,80 L0,80 Z" fill={BG} />
        </svg>
      </div>

      <section style={{ background: BG, overflow: "hidden", position: "relative" }}>
        <div className="max-w-6xl mx-auto px-4 pt-10 pb-16 md:pt-14 md:pb-20">
          <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 mb-3">
            <div>
              <p
                className="text-xs font-bold tracking-widest uppercase mb-2 inline-block px-3 py-1 rounded-full"
                style={{ color: "#e8192c", background: "rgba(232,25,44,0.08)", border: "1px solid rgba(232,25,44,0.14)" }}
              >
                Browse Categories
              </p>
              <h2 className="font-display font-extrabold text-2xl md:text-3xl text-navy-900">
                Every local business you need, in one place
              </h2>
            </div>
            <Link
              to="/categories"
              className="flex items-center gap-1 text-sm font-semibold hover:underline flex-shrink-0"
              style={{ color: "#e8192c" }}
            >
              View all categories <ArrowRight size={14} />
            </Link>
          </div>

          <p className="text-gray-500 text-sm md:text-base max-w-xl mb-6">
            {total}+ categories across {groups.length} industries, from classes and clinics to shops, services and events.
          </p>

          {/* Industry filter */}
          <div className="flex gap-2 overflow-x-auto pb-4 mb-6 -mx-4 px-4 no-scrollbar">
            {tabs.map((t) => (
              <button
                key={t.key}
                type="button"
                onClick={() => setActive(t.key)}
                className={`shrink-0 px-4 py-2 rounded-full text-xs font-semibold border transition-colors whitespace-nowrap ${
                  active === t.key
                    ? "text-white border-transparent"
                    : "bg-white text-gray-600 border-gray-200 hover:border-red-300 hover:text-red-600"
                }`}
                style={active === t.key ? { background: "#e8192c" } : undefined}
              >
                {t.title}
              </button>
            ))}
          </div>

          <AnimatePresence mode="wait">
            {activeGroup ? (
              <motion.div
                key={activeGroup.key}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.25 }}
                className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3"
              >
                {activeGroup.items.map((cat, idx) => (
                  <Tile key={cat.slug} cat={cat} index={idx} />
                ))}
              </motion.div>
            ) : (
              <motion.div
                key="all"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.25 }}
                className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 items-start"
              >
                {groups.map((g, i) => (
                  <GroupPanel key={g.key} group={g} i={i} onOpen={setActive} />
                ))}
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </section>

      <div style={{ lineHeight: 0, background: BG }}>
        <svg viewBox="0 0 1440 80" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg" style={{ display: "block", width: "100%", height: "80px" }}>
          <path d="M0,80 Q720,-80 1440,80 L1440,0 L0,0 Z" fill="#ffffff" />
        </svg>
      </div>
    </div>
  );
}
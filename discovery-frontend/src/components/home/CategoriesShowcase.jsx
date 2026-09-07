import React, { useState, useEffect, useMemo, useRef } from "react";
import { Link } from "react-router-dom";
import { motion, useMotionValue, useTransform, useSpring, AnimatePresence } from "framer-motion";
import * as Icons from "lucide-react";
import { ArrowRight, ArrowUpRight } from "lucide-react";
import { CATEGORIES } from "../../lib/constants";
import { metaApi } from "../../lib/api";

const GROUPS = [
  { title: "Venues & Celebration Spaces", keywords: ["marriage-hall", "banquet-hall", "party-lawn", "farmhouse", "tent-house"] },
  { title: "Photography & Films",         keywords: ["photographer", "videographer"] },
  { title: "Décor & Production",          keywords: ["decorator", "sound-lighting", "card-printing"] },
  { title: "Beauty & Styling",            keywords: ["makeup-artist", "mehendi-artist", "mehndi"] },
  { title: "Food & Entertainment",        keywords: ["caterer", "dj", "singer", "music"] },
  { title: "Rituals & Traditions",        keywords: ["pandit", "horse-buggy"] },
  { title: "Planning & Logistics",        keywords: ["event-manager", "wedding-planner", "travel-transport"] },
];

function groupCategories(categories) {
  const used = new Set();
  return GROUPS.map((g) => {
    const items = categories.filter((c) => g.keywords.some((k) => c.slug.includes(k)) && !used.has(c.slug));
    items.forEach((c) => used.add(c.slug));
    return { title: g.title, items };
  }).filter((g) => g.items.length > 0);
}

function categoryImage(slug) {
  try { return new URL(`../../assets/categories/${slug}.jpg`, import.meta.url).href; } catch { return null; }
}

function resolveIcon(name) {
  if (!name) return Icons.Sparkles;
  const pascal = name.split("-").map((s) => s.charAt(0).toUpperCase() + s.slice(1)).join("");
  return Icons[pascal] || Icons.Sparkles;
}

function tileGridClass(count) {
  if (count <= 2) return "grid-cols-2";
  if (count === 3) return "grid-cols-3";
  return "grid-cols-2";
}

/* ── 3-D tilt card ── */
function TiltCard({ children, className }) {
  const ref = useRef(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const rotateX = useSpring(useTransform(y, [-0.5, 0.5], [6, -6]), { stiffness: 260, damping: 22 });
  const rotateY = useSpring(useTransform(x, [-0.5, 0.5], [-6, 6]),  { stiffness: 260, damping: 22 });

  function onMove(e) {
    const r = ref.current?.getBoundingClientRect();
    if (!r) return;
    x.set((e.clientX - r.left) / r.width  - 0.5);
    y.set((e.clientY - r.top)  / r.height - 0.5);
  }
  function onLeave() { x.set(0); y.set(0); }

  return (
    <motion.div
      ref={ref}
      onMouseMove={onMove}
      onMouseLeave={onLeave}
      style={{ rotateX, rotateY, transformStyle: "preserve-3d", perspective: 800 }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

/* ── Category tile ── */
function CategoryTile({ cat, index }) {
  const [imgFailed, setImgFailed] = useState(false);
  const [hovered, setHovered]     = useState(false);
  const src  = categoryImage(cat.slug);
  const Icon = resolveIcon(cat.icon);

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.88, y: 18 }}
      whileInView={{ opacity: 1, scale: 1, y: 0 }}
      viewport={{ once: true, margin: "-30px" }}
      transition={{ duration: 0.45, delay: index * 0.07, ease: [0.22, 1, 0.36, 1] }}
    >
      <Link
        to={`/search?category=${cat.slug}`}
        className="group relative flex flex-col overflow-hidden rounded-xl border border-gray-100 bg-gray-50 shadow-sm"
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        style={{ display: "block" }}
      >
        <div className="relative h-32 sm:h-36 w-full overflow-hidden bg-gradient-to-br from-navy-50 to-navy-100">
          {src && !imgFailed ? (
            <motion.img
              src={src} alt={cat.label} loading="lazy"
              onError={() => setImgFailed(true)}
              className="h-full w-full object-cover"
              animate={{ scale: hovered ? 1.12 : 1 }}
              transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
            />
          ) : (
            <motion.div
              className="flex h-full w-full items-center justify-center"
              animate={{ scale: hovered ? 1.1 : 1 }}
              transition={{ duration: 0.4 }}
            >
              <Icon size={28} style={{ color: "#9aa0b8" }} />
            </motion.div>
          )}
          <div className="absolute inset-0 bg-gradient-to-t from-black/65 via-black/10 to-transparent" />
          <AnimatePresence>
            {hovered && (
              <motion.div
                key="shimmer"
                initial={{ x: "-100%", opacity: 0.6 }}
                animate={{ x: "200%", opacity: 0 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.7, ease: "easeInOut" }}
                className="absolute inset-0 pointer-events-none"
                style={{ background: "linear-gradient(105deg,transparent 40%,rgba(255,255,255,0.28) 50%,transparent 60%)" }}
              />
            )}
          </AnimatePresence>
        </div>
        <motion.span
          className="absolute bottom-2.5 left-3 right-3 text-xs sm:text-sm font-bold text-white leading-tight drop-shadow"
          animate={{ y: hovered ? -2 : 0 }}
          transition={{ duration: 0.3 }}
        >
          {cat.label}
        </motion.span>
        <motion.div
          className="absolute bottom-0 left-0 h-0.5 rounded-full"
          style={{ background: "#e8192c" }}
          initial={{ width: "0%" }}
          animate={{ width: hovered ? "100%" : "0%" }}
          transition={{ duration: 0.35, ease: "easeOut" }}
        />
      </Link>
    </motion.div>
  );
}

/* ── Group panel ── */
function GroupPanel({ group, i }) {
  const items = group.items.slice(0, 4);
  return (
    <motion.div
      initial={{ opacity: 0, y: 32 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: "-50px" }}
      transition={{ duration: 0.55, delay: (i % 3) * 0.1, ease: [0.22, 1, 0.36, 1] }}
    >
      <TiltCard className="rounded-2xl border border-gray-100 bg-white p-4 shadow-sm hover:shadow-xl transition-shadow duration-400 h-full">
        <div style={{ transform: "translateZ(20px)" }}>
          <div className="flex items-center justify-between mb-3">
            <h3 className="font-display font-bold text-sm text-navy-900">{group.title}</h3>
            <motion.div whileHover={{ rotate: 45 }} transition={{ duration: 0.25 }}>
              <ArrowUpRight size={15} className="text-gray-300" />
            </motion.div>
          </div>
          <div className={`grid ${tileGridClass(items.length)} gap-2.5`}>
            {items.map((cat, idx) => (
              <CategoryTile key={cat.slug} cat={cat} index={idx} />
            ))}
          </div>
        </div>
      </TiltCard>
    </motion.div>
  );
}

/* ── Quick-browse chip ── */
function BrowseChip({ cat, index }) {
  const Icon = resolveIcon(cat.icon);
  return (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ duration: 0.35, delay: 0.04 + index * 0.025, ease: "easeOut" }}
      whileHover={{ scale: 1.06 }}
      whileTap={{ scale: 0.95 }}
    >
      <Link
        to={`/search?category=${cat.slug}`}
        className="flex items-center gap-1.5 px-3.5 py-2 rounded-full border border-gray-200 bg-white text-xs font-semibold text-gray-600 hover:border-red-300 hover:text-red-600 hover:bg-red-50 transition-colors whitespace-nowrap"
      >
        <Icon size={13} /> {cat.label}
      </Link>
    </motion.div>
  );
}

const headerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.12 } },
};
const headerChild = {
  hidden:  { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0, transition: { duration: 0.55, ease: [0.22, 1, 0.36, 1] } },
};

export default function CategoriesShowcase() {
  const [categories, setCategories] = useState(CATEGORIES);

  useEffect(() => {
    metaApi.get("/categories")
      .then(({ data }) => {
        const live = (data?.data || []).map((c) => ({ slug: c.slug, label: c.name, icon: c.icon }));
        if (live.length > 0) setCategories(live);
      })
      .catch(() => {});
  }, []);

  const groups = useMemo(() => groupCategories(categories), [categories]);

  // Section bg — very soft warm white, just barely off-white
  const BG = "#faf9ff";

  return (
    <div style={{ background: BG }}>

      {/* ══ ARC TOP — curves UP from the section above (white) into BG ══
          This creates the "protractor / cloud arch" from your reference.
          The white fills the top, the arc dips down to reveal BG below.  */}
      <div style={{ lineHeight: 0, background: "#ffffff" }}>
        <svg
          viewBox="0 0 1440 80"
          preserveAspectRatio="none"
          xmlns="http://www.w3.org/2000/svg"
          style={{ display: "block", width: "100%", height: "80px" }}
        >
          {/* Single deep arc — like the purple cloud in your reference image */}
          <path d="M0,0 Q720,160 1440,0 L1440,80 L0,80 Z" fill={BG} />
        </svg>
      </div>

      {/* ══ MAIN SECTION ══ */}
      <section style={{ background: BG, overflow: "hidden", position: "relative" }}>

        {/* Very faint radial blush at top center */}
        <div aria-hidden style={{
          position: "absolute", top: 0, left: "50%", transform: "translateX(-50%)",
          width: "800px", height: "300px", pointerEvents: "none",
          background: "radial-gradient(ellipse 60% 55% at 50% 0%, rgba(232,25,44,0.04) 0%, transparent 80%)",
        }} />

        <div className="max-w-6xl mx-auto px-4 pt-10 pb-16 md:pt-14 md:pb-20">

          {/* ── Header ── */}
          <motion.div
            variants={headerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, margin: "-60px" }}
            className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-3 mb-3"
          >
            <div>
              <motion.p
                variants={headerChild}
                className="text-xs font-bold tracking-widest uppercase mb-2 inline-block px-3 py-1 rounded-full"
                style={{ color: "#e8192c", background: "rgba(232,25,44,0.08)", border: "1px solid rgba(232,25,44,0.14)" }}
              >
                Browse Categories
              </motion.p>
              <motion.h2
                variants={headerChild}
                className="font-display font-extrabold text-2xl md:text-3xl text-navy-900"
              >
                Everything your event needs, in one place
              </motion.h2>
            </div>
            <motion.div variants={headerChild}>
              <Link
                to="/categories"
                className="flex items-center gap-1 text-sm font-semibold hover:underline flex-shrink-0"
                style={{ color: "#e8192c" }}
              >
                View all categories
                <motion.span
                  className="inline-block"
                  animate={{ x: [0, 4, 0] }}
                  transition={{ repeat: Infinity, duration: 1.6, ease: "easeInOut", repeatDelay: 0.8 }}
                >
                  <ArrowRight size={14} />
                </motion.span>
              </Link>
            </motion.div>
          </motion.div>

          <motion.p
            initial={{ opacity: 0, y: 12 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="text-gray-500 text-sm md:text-base max-w-xl mb-8"
          >
            {categories.length}+ vendor categories, from the marriage hall to the last mehndi cone — grouped so you never have to guess where to start.
          </motion.p>

          {/* ── Quick browse strip ── */}
          <div className="flex gap-2 overflow-x-auto pb-4 mb-8 -mx-4 px-4 no-scrollbar">
            {categories.map((cat, i) => (
              <BrowseChip key={cat.slug} cat={cat} index={i} />
            ))}
          </div>

          {/* ── Group panels grid ── */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5 items-start">
            {groups.map((g, i) => (
              <GroupPanel key={g.title} group={g} i={i} />
            ))}
          </div>

        </div>
      </section>

      {/* ══ ARC BOTTOM — arc curves back down to white for next section ══ */}
      <div style={{ lineHeight: 0, background: BG }}>
        <svg
          viewBox="0 0 1440 80"
          preserveAspectRatio="none"
          xmlns="http://www.w3.org/2000/svg"
          style={{ display: "block", width: "100%", height: "80px" }}
        >
          <path d="M0,80 Q720,-80 1440,80 L1440,0 L0,0 Z" fill="#ffffff" />
        </svg>
      </div>

    </div>
  );
}
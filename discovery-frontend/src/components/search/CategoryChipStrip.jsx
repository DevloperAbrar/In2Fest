import React, { useRef } from "react";
import { motion } from "framer-motion";
import { ChevronLeft, ChevronRight, LayoutGrid } from "lucide-react";
import resolveCategoryIcon from "./categoryIcon";
import useCategories from "./useCategories";

// Pastel tints rotate across the live, admin-managed categories.
const TINTS = ["#FFE6D6", "#DDF3E8", "#FFF0C2", "#FFE0E3", "#E0EAFF"];
const INKS = ["#e8192c", "#0f8a5f", "#d38a10", "#e8192c", "#3a5bd9"];

function Tile({ label, Icon, tint, ink, active, onClick }) {
  return (
    <motion.button
      type="button"
      onClick={onClick}
      whileTap={{ scale: 0.96 }}
      aria-pressed={active}
      className={[
        "group relative flex-shrink-0 w-[98px] flex flex-col items-center gap-2 rounded-[1.4rem] px-2 py-3 border-2 transition-all duration-300",
        active
          ? "border-navy-700 bg-navy-700 -translate-y-0.5 shadow-[0_16px_26px_-14px_rgba(26,32,53,0.75)]"
          : "border-transparent hover:-translate-y-1 hover:shadow-[0_16px_26px_-18px_rgba(26,32,53,0.55)]",
      ].join(" ")}
      style={active ? undefined : { background: tint }}
    >
      <span
        className={[
          "w-12 h-12 rounded-2xl flex items-center justify-center transition duration-300 group-hover:scale-110 group-hover:-rotate-6",
          active ? "bg-white/10" : "bg-white shadow-sm",
        ].join(" ")}
      >
        <Icon size={22} strokeWidth={2.2} style={{ color: active ? "#f5a623" : ink }} />
      </span>
      <span
        className={[
          "text-[11px] font-extrabold leading-tight text-center line-clamp-2 min-h-[2.1em]",
          active ? "text-white" : "text-navy-700",
        ].join(" ")}
      >
        {label}
      </span>
    </motion.button>
  );
}

/**
 * Horizontal quick-pick strip of every live category (super-admin managed).
 * One click sets/clears the `category` filter. Supports mouse wheel,
 * click-and-drag and arrow buttons.
 */
export default function CategoryChipStrip({ activeSlug, onSelect }) {
  const scrollerRef = useRef(null);
  const { categories, loading } = useCategories();

  const scrollBy = (dx) => scrollerRef.current?.scrollBy({ left: dx, behavior: "smooth" });

  const handleWheel = (e) => {
    const el = scrollerRef.current;
    if (!el) return;
    const delta = Math.abs(e.deltaY) > Math.abs(e.deltaX) ? e.deltaY : e.deltaX;
    const canLeft = el.scrollLeft > 0;
    const canRight = el.scrollLeft < el.scrollWidth - el.clientWidth - 1;
    if ((delta < 0 && canLeft) || (delta > 0 && canRight)) {
      e.preventDefault();
      el.scrollLeft += delta;
    }
  };

  const drag = useRef({ down: false, startX: 0, startLeft: 0, moved: false });
  const onDown = (e) => {
    const el = scrollerRef.current;
    if (!el) return;
    drag.current = { down: true, startX: e.pageX, startLeft: el.scrollLeft, moved: false };
    el.classList.add("cursor-grabbing");
  };
  const endDrag = () => {
    drag.current.down = false;
    scrollerRef.current?.classList.remove("cursor-grabbing");
  };
  const onMove = (e) => {
    const el = scrollerRef.current;
    if (!el || !drag.current.down) return;
    const dx = e.pageX - drag.current.startX;
    if (Math.abs(dx) > 3) drag.current.moved = true;
    el.scrollLeft = drag.current.startLeft - dx;
  };
  const onClickCapture = (e) => {
    if (drag.current.moved) {
      e.preventDefault();
      e.stopPropagation();
      drag.current.moved = false;
    }
  };

  if (loading && categories.length === 0) {
    return (
      <div className="flex gap-3 px-1">
        {Array.from({ length: 8 }).map((_, i) => (
          <div key={i} className="h-[112px] w-[98px] flex-shrink-0 rounded-[1.4rem] bg-white/70 animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="relative group/strip">
      <button
        type="button"
        onClick={() => scrollBy(-300)}
        aria-label="Scroll categories left"
        className="hidden md:flex absolute -left-4 top-1/2 -translate-y-1/2 z-10 w-9 h-9 items-center justify-center rounded-full bg-white border border-navy-100 shadow-md text-navy-600 opacity-0 group-hover/strip:opacity-100 transition-opacity"
      >
        <ChevronLeft size={16} />
      </button>
      <button
        type="button"
        onClick={() => scrollBy(300)}
        aria-label="Scroll categories right"
        className="hidden md:flex absolute -right-4 top-1/2 -translate-y-1/2 z-10 w-9 h-9 items-center justify-center rounded-full bg-white border border-navy-100 shadow-md text-navy-600 opacity-0 group-hover/strip:opacity-100 transition-opacity"
      >
        <ChevronRight size={16} />
      </button>

      <div
        ref={scrollerRef}
        onWheel={handleWheel}
        onMouseDown={onDown}
        onMouseMove={onMove}
        onMouseUp={endDrag}
        onMouseLeave={endDrag}
        onClickCapture={onClickCapture}
        className="flex items-stretch gap-3 overflow-x-auto no-scrollbar py-2 px-1 scroll-smooth cursor-grab select-none"
      >
        <Tile label="All categories" Icon={LayoutGrid} tint="#ffffff" ink="#1a2035" active={!activeSlug} onClick={() => onSelect("")} />
        {categories.map((cat, i) => (
          <Tile
            key={cat.slug}
            label={cat.label}
            Icon={resolveCategoryIcon(cat.icon)}
            tint={TINTS[i % TINTS.length]}
            ink={INKS[i % INKS.length]}
            active={activeSlug === cat.slug}
            onClick={() => onSelect(activeSlug === cat.slug ? "" : cat.slug)}
          />
        ))}
      </div>
    </div>
  );
}
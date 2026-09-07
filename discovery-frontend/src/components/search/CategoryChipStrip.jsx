import React, { useRef } from "react";
import { motion } from "framer-motion";
import { ChevronLeft, ChevronRight, LayoutGrid } from "lucide-react";
import resolveCategoryIcon from "./categoryIcon";
import useCategories from "./useCategories";

/**
 * Horizontal, scrollable "quick pick" strip of every live category
 * (super-admin managed, via useCategories). One click sets/clears the
 * `category` filter - the same pattern JustDial/Sulekha use above their
 * result grids so people don't have to open the sidebar for the single
 * most common filter.
 */
export default function CategoryChipStrip({ activeSlug, onSelect }) {
  const scrollerRef = useRef(null);
  const { categories, loading } = useCategories();

  const scrollBy = (dx) => scrollerRef.current?.scrollBy({ left: dx, behavior: "smooth" });

  // Lets people scroll this strip horizontally with a normal mouse wheel
  // (not just trackpad/drag) - convert vertical wheel delta into horizontal
  // scroll, but only when there's actually room to scroll sideways so page
  // scroll still works normally once the strip is fully scrolled.
  const handleWheel = (e) => {
    const el = scrollerRef.current;
    if (!el) return;
    const delta = Math.abs(e.deltaY) > Math.abs(e.deltaX) ? e.deltaY : e.deltaX;
    const canScrollLeft = el.scrollLeft > 0;
    const canScrollRight = el.scrollLeft < el.scrollWidth - el.clientWidth - 1;
    if ((delta < 0 && canScrollLeft) || (delta > 0 && canScrollRight)) {
      e.preventDefault();
      el.scrollLeft += delta;
    }
  };

  // Click-and-drag scrolling with the mouse (like a carousel) - desktop
  // users without a trackpad or horizontal wheel can grab the strip and
  // pull it left/right instead of hunting for the tiny arrow buttons.
  const dragState = useRef({ isDown: false, startX: 0, startScrollLeft: 0, moved: false });

  const handleMouseDown = (e) => {
    const el = scrollerRef.current;
    if (!el) return;
    dragState.current = { isDown: true, startX: e.pageX, startScrollLeft: el.scrollLeft, moved: false };
    el.classList.add("cursor-grabbing");
  };

  const endDrag = () => {
    const el = scrollerRef.current;
    dragState.current.isDown = false;
    el?.classList.remove("cursor-grabbing");
  };

  const handleMouseMove = (e) => {
    const el = scrollerRef.current;
    if (!el || !dragState.current.isDown) return;
    const dx = e.pageX - dragState.current.startX;
    if (Math.abs(dx) > 3) dragState.current.moved = true;
    el.scrollLeft = dragState.current.startScrollLeft - dx;
  };

  // After a real drag, swallow the click that would otherwise fire on the
  // button under the cursor (prevents an accidental category select).
  const handleClickCapture = (e) => {
    if (dragState.current.moved) {
      e.preventDefault();
      e.stopPropagation();
      dragState.current.moved = false;
    }
  };

  if (loading && categories.length === 0) {
    return (
      <div className="flex gap-3 px-1">
        {Array.from({ length: 7 }).map((_, i) => (
          <div key={i} className="h-24 w-24 flex-shrink-0 rounded-2xl bg-gray-100 animate-pulse" />
        ))}
      </div>
    );
  }

  return (
    <div className="relative group/strip">
      {/* Left/right scroll nudges - desktop only, hidden on touch widths */}
      <button
        type="button"
        onClick={() => scrollBy(-260)}
        aria-label="Scroll categories left"
        className="hidden md:flex absolute -left-3 top-1/2 -translate-y-1/2 z-10 w-9 h-9 items-center justify-center rounded-full bg-white border border-gray-200 shadow-md text-navy-600 opacity-0 group-hover/strip:opacity-100 transition-opacity"
      >
        <ChevronLeft size={16} />
      </button>
      <button
        type="button"
        onClick={() => scrollBy(260)}
        aria-label="Scroll categories right"
        className="hidden md:flex absolute -right-3 top-1/2 -translate-y-1/2 z-10 w-9 h-9 items-center justify-center rounded-full bg-white border border-gray-200 shadow-md text-navy-600 opacity-0 group-hover/strip:opacity-100 transition-opacity"
      >
        <ChevronRight size={16} />
      </button>

      <div
        ref={scrollerRef}
        onWheel={handleWheel}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={endDrag}
        onMouseLeave={endDrag}
        onClickCapture={handleClickCapture}
        className="flex items-stretch gap-3 overflow-x-auto no-scrollbar py-1 px-1 scroll-smooth cursor-grab select-none"
      >
        <motion.button
          type="button"
          onClick={() => onSelect("")}
          whileTap={{ scale: 0.96 }}
          className={[
            "flex flex-col items-center justify-center gap-2 flex-shrink-0 w-24 py-3.5 px-2 rounded-2xl border transition-colors",
            !activeSlug
              ? "border-transparent shadow-md"
              : "bg-white text-gray-600 border-gray-100 shadow-sm hover:border-accent-300 hover:text-accent-600 hover:bg-accent-50",
          ].join(" ")}
          style={!activeSlug ? { background: "linear-gradient(135deg,#e8192c,#f5a623)" } : undefined}
        >
          <span
            className={[
              "w-11 h-11 rounded-xl flex items-center justify-center",
              !activeSlug ? "bg-white/20" : "bg-gray-50",
            ].join(" ")}
          >
            <LayoutGrid size={22} className={!activeSlug ? "text-white" : "text-gray-500"} />
          </span>
          <span className={["text-xs font-semibold leading-tight text-center", !activeSlug ? "text-white" : ""].join(" ")}>
            All Categories
          </span>
        </motion.button>

        {categories.map((cat) => {
          const Icon = resolveCategoryIcon(cat.icon);
          const active = activeSlug === cat.slug;
          return (
            <motion.button
              key={cat.slug}
              type="button"
              onClick={() => onSelect(active ? "" : cat.slug)}
              whileTap={{ scale: 0.96 }}
              className={[
                "flex flex-col items-center justify-center gap-2 flex-shrink-0 w-24 py-3.5 px-2 rounded-2xl border transition-colors",
                active
                  ? "border-transparent shadow-md"
                  : "bg-white text-gray-600 border-gray-100 shadow-sm hover:border-accent-300 hover:text-accent-600 hover:bg-accent-50",
              ].join(" ")}
              style={active ? { background: "linear-gradient(135deg,#e8192c,#f5a623)" } : undefined}
            >
              <span
                className={[
                  "w-11 h-11 rounded-xl flex items-center justify-center",
                  active ? "bg-white/20" : "bg-gray-50",
                ].join(" ")}
              >
                <Icon size={22} className={active ? "text-white" : "text-gray-500"} />
              </span>
              <span className={["text-xs font-semibold leading-tight text-center line-clamp-2", active ? "text-white" : ""].join(" ")}>
                {cat.label}
              </span>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
}
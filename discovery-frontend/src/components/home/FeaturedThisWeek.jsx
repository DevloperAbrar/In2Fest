import React, { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import useEmblaCarousel from "embla-carousel-react";
import { motion } from "framer-motion";
import { ChevronLeft, ChevronRight, Flame } from "lucide-react";
import VendorCard from "../search/VendorCard";

/* ── Shimmer skeleton ── */
function SkeletonCard() {
  return (
    <div className="flex-[0_0_82%] sm:flex-[0_0_46%] lg:flex-[0_0_23.5%] min-w-0">
      <style>{`@keyframes ftw-shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}`}</style>
      <div style={{
        height: "280px", borderRadius: "14px", background: "#ebebf0",
        position: "relative", overflow: "hidden", marginBottom: "12px",
      }}>
        <div style={{
          position: "absolute", inset: 0,
          background: "linear-gradient(90deg,transparent 0%,rgba(255,255,255,0.55) 50%,transparent 100%)",
          backgroundSize: "200% 100%",
          animation: "ftw-shimmer 1.6s ease-in-out infinite",
        }} />
      </div>
      <div style={{ height: "12px", width: "70%", borderRadius: "6px", background: "#ebebf0", marginBottom: "8px" }} />
      <div style={{ height: "10px", width: "45%", borderRadius: "6px", background: "#ebebf0" }} />
    </div>
  );
}

export default function FeaturedThisWeek({ vendors = [], loading = false }) {
  const [emblaRef, emblaApi] = useEmblaCarousel({ align: "start", dragFree: true, loop: false });
  const [canPrev, setCanPrev] = useState(false);
  const [canNext, setCanNext] = useState(false);
  const [scrollProgress, setScrollProgress] = useState(0);

  const onSelect = useCallback(() => {
    if (!emblaApi) return;
    setCanPrev(emblaApi.canScrollPrev());
    setCanNext(emblaApi.canScrollNext());
  }, [emblaApi]);

  const onScroll = useCallback(() => {
    if (!emblaApi) return;
    setScrollProgress(emblaApi.scrollProgress());
  }, [emblaApi]);

  useEffect(() => {
    if (!emblaApi) return;
    onSelect();
    onScroll();
    emblaApi.on("select", onSelect);
    emblaApi.on("reInit", onSelect);
    emblaApi.on("scroll", onScroll);
  }, [emblaApi, onSelect, onScroll]);

  if (!loading && vendors.length === 0) return null;

  return (
    <section className="py-14 md:py-20 overflow-hidden" style={{ background: "#f7f8fc" }}>
      <div className="max-w-6xl mx-auto px-4">

        {/* ── Animated header ── */}
        <motion.div
          className="flex items-end justify-between mb-8"
          initial={{ opacity: 0, y: 22 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, margin: "-60px" }}
          transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
        >
          <div>
            <p
              className="inline-flex items-center gap-1.5 text-xs font-bold mb-2 px-3 py-1 rounded-full"
              style={{ color: "#e8192c", background: "rgba(232,25,44,0.08)", border: "1px solid rgba(232,25,44,0.18)" }}
            >
              <Flame size={12} /> Trending now
            </p>
            <h2
              className="font-display font-extrabold text-2xl md:text-3xl text-navy-900"
              style={{ letterSpacing: "-0.02em" }}
            >
              Featured this week
            </h2>
          </div>

          {/* Nav buttons */}
          <div className="hidden sm:flex items-center gap-2">
            <button
              onClick={() => emblaApi?.scrollPrev()}
              disabled={!canPrev}
              style={{
                width: "36px", height: "36px", borderRadius: "50%",
                border: canPrev ? "1.5px solid #e8192c" : "1.5px solid #e0e0e8",
                background: canPrev ? "#e8192c" : "#fff",
                color: canPrev ? "#fff" : "#c0c0cc",
                display: "flex", alignItems: "center", justifyContent: "center",
                cursor: canPrev ? "pointer" : "default",
                transition: "all 0.18s ease",
              }}
            >
              <ChevronLeft size={16} />
            </button>
            <button
              onClick={() => emblaApi?.scrollNext()}
              disabled={!canNext}
              style={{
                width: "36px", height: "36px", borderRadius: "50%",
                border: canNext ? "1.5px solid #e8192c" : "1.5px solid #e0e0e8",
                background: canNext ? "#e8192c" : "#fff",
                color: canNext ? "#fff" : "#c0c0cc",
                display: "flex", alignItems: "center", justifyContent: "center",
                cursor: canNext ? "pointer" : "default",
                transition: "all 0.18s ease",
              }}
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </motion.div>

        {/* ── Carousel — identical structure to original ── */}
        <div className="overflow-hidden" ref={emblaRef}>
          <div className="flex gap-4 -ml-4 pl-4">
            {loading
              ? Array.from({ length: 4 }).map((_, i) => <SkeletonCard key={i} />)
              : vendors.map((v, i) => (
                  <motion.div
                    key={v.id}
                    className="flex-[0_0_82%] sm:flex-[0_0_46%] lg:flex-[0_0_23.5%] min-w-0"
                    initial={{ opacity: 0, y: 30 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, margin: "-40px" }}
                    transition={{ duration: 0.45, delay: i * 0.09, ease: [0.22, 1, 0.36, 1] }}
                    whileHover={{ y: -6, transition: { duration: 0.22 } }}
                  >
                    <VendorCard vendor={v} />
                  </motion.div>
                ))}
          </div>
        </div>

        {/* ── Scroll progress bar ── */}
        {vendors.length > 1 && (
          <div style={{
            marginTop: "20px", height: "3px", background: "#e4e6f0",
            borderRadius: "999px", maxWidth: "100px", overflow: "hidden",
          }}>
            <div style={{
              height: "100%",
              width: `${Math.max(scrollProgress * 100, 14)}%`,
              background: "linear-gradient(90deg,#e8192c,#f5a623)",
              borderRadius: "999px",
              transition: "width 0.15s ease",
            }} />
          </div>
        )}

        {/* ── Browse all ── */}
        <motion.div
          className="text-center mt-8"
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          transition={{ delay: 0.3, duration: 0.4 }}
        >
          <Link
            to="/search"
            className="inline-flex items-center gap-1 text-sm font-semibold"
            style={{
              color: "#e8192c", textDecoration: "none",
              padding: "9px 22px", border: "1.5px solid rgba(232,25,44,0.28)",
              borderRadius: "999px", background: "rgba(232,25,44,0.04)",
              transition: "background 0.18s, color 0.18s",
            }}
            onMouseEnter={e => { e.currentTarget.style.background = "#e8192c"; e.currentTarget.style.color = "#fff"; }}
            onMouseLeave={e => { e.currentTarget.style.background = "rgba(232,25,44,0.04)"; e.currentTarget.style.color = "#e8192c"; }}
          >
            Browse all vendors <ChevronRight size={14} />
          </Link>
        </motion.div>

      </div>
    </section>
  );
}
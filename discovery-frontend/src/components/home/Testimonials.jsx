import React, { useState, useRef, useEffect, useCallback } from "react";
import { Star, Quote, ChevronLeft, ChevronRight } from "lucide-react";
import { motion } from "framer-motion";

const TESTIMONIALS = [
  {
    name: "Priya & Rohan",
    role: "Booked their wedding hall & catering",
    city: "Indore",
    quote: "We compared three halls and booked catering, all without a single confusing phone call. Seeing the actual calendar before deciding made this so much easier.",
    rating: 5,
  },
  {
    name: "Ankit Sharma",
    role: "Decorator, Early Vendor Partner",
    city: "Indore",
    quote: "My own website went live in a day. Inquiries now come straight to my dashboard instead of missed calls.",
    rating: 5,
  },
  {
    name: "Meera Joshi",
    role: "Booked photography & makeup",
    city: "Bhopal",
    quote: "Being able to see real packages and pricing upfront saved us so many awkward negotiation calls.",
    rating: 5,
  },
  {
    name: "Sunita & Vikram",
    role: "Booked full wedding package",
    city: "Indore",
    quote: "From hall to mehndi artist — we found everything on one platform. The vendor verification badge gave us confidence to book without second-guessing.",
    rating: 5,
  },
  {
    name: "Rahul Verma",
    role: "Photographer, Vendor Partner",
    city: "Bhopal",
    quote: "The free website feature brought me 3 new inquiries within the first week. I didn't have to spend anything to get started.",
    rating: 5,
  },
  {
    name: "Kavita & Suresh",
    role: "Booked banquet hall & DJ",
    city: "Ujjain",
    quote: "Direct WhatsApp contact meant no middleman drama. We got a quote in minutes and confirmed the booking the same evening.",
    rating: 5,
  },
  {
    name: "Deepak Events",
    role: "Event Manager, Vendor Partner",
    city: "Indore",
    quote: "Having a live booking calendar visible to clients has completely changed how I manage my schedule. Zero double bookings since joining.",
    rating: 5,
  },
  {
    name: "Nisha & Amit",
    role: "Booked photographer & caterer",
    city: "Jabalpur",
    quote: "The reviews on each vendor profile are from real bookings — that's what sold us. No fake ratings, just honest feedback.",
    rating: 5,
  },
];

const SHOW_SECTION = true;

/* ── Floating sparkle particles ── */
const PARTICLES = Array.from({ length: 14 }, (_, i) => ({
  id: i,
  size: Math.random() * 3 + 2,
  top: `${Math.random() * 100}%`,
  left: `${Math.random() * 100}%`,
  opacity: Math.random() * 0.18 + 0.06,
  duration: Math.random() * 6 + 5,
  delay: Math.random() * 4,
}));

/* ── Single testimonial card ── */
function TestimonialCard({ t, isActive }) {
  return (
    <div
      className="t-card"
      style={{
        background: "#ffffff",
        borderRadius: "20px",
        border: isActive ? "1.5px solid rgba(232,25,44,0.18)" : "1px solid #f0f0f5",
        boxShadow: isActive
          ? "0 16px 48px rgba(232,25,44,0.08), 0 4px 16px rgba(0,0,0,0.06)"
          : "0 2px 12px rgba(0,0,0,0.04)",
        padding: "28px 24px",
        display: "flex",
        flexDirection: "column",
        position: "relative",
        overflow: "hidden",
        transition: "box-shadow 0.3s, border 0.3s",
        scrollSnapAlign: "start",
      }}
    >
      {/* Accent blob top-right */}
      <div style={{
        position: "absolute", top: "-30px", right: "-30px",
        width: "100px", height: "100px", borderRadius: "50%",
        background: "radial-gradient(circle, rgba(232,25,44,0.07) 0%, transparent 70%)",
        pointerEvents: "none",
      }} />

      {/* Quote icon */}
      <div style={{ marginBottom: "14px" }}>
        <Quote size={24} style={{ color: "rgba(232,25,44,0.2)" }} />
      </div>

      {/* Stars */}
      <div style={{ display: "flex", gap: "3px", marginBottom: "12px" }}>
        {Array.from({ length: t.rating }).map((_, i) => (
          <Star key={i} size={13} fill="#f5a623" style={{ color: "#f5a623" }} />
        ))}
      </div>

      {/* Quote text */}
      <p style={{
        fontSize: "0.875rem", color: "#374151",
        lineHeight: 1.7, flex: 1, marginBottom: "20px",
        fontStyle: "italic",
      }}>
        "{t.quote}"
      </p>

      {/* Author */}
      <div style={{
        display: "flex", alignItems: "center", gap: "12px",
        paddingTop: "16px", borderTop: "1px solid #f5f5fa",
        flexWrap: "wrap",
      }}>
        <div style={{
          width: "38px", height: "38px", borderRadius: "50%", flexShrink: 0,
          background: "linear-gradient(135deg, #1a2035, #2a3151)",
          display: "flex", alignItems: "center", justifyContent: "center",
          color: "#fff", fontSize: "0.75rem", fontWeight: 700,
          boxShadow: "0 2px 8px rgba(26,32,53,0.25)",
        }}>
          {t.name[0]}
        </div>
        <div style={{ minWidth: 0 }}>
          <p style={{ fontSize: "0.85rem", fontWeight: 700, color: "#0a0e1e", margin: 0, lineHeight: 1.2 }}>
            {t.name}
          </p>
          <p style={{ fontSize: "0.7rem", color: "#9ca3af", margin: "2px 0 0", lineHeight: 1.3 }}>
            {t.role} · {t.city}
          </p>
        </div>

        {/* Verified chip */}
        <div style={{
          marginLeft: "auto", flexShrink: 0,
          background: "rgba(232,25,44,0.06)",
          border: "1px solid rgba(232,25,44,0.15)",
          borderRadius: "999px", padding: "3px 8px",
          fontSize: "0.6rem", fontWeight: 700,
          color: "#e8192c", letterSpacing: "0.04em",
          whiteSpace: "nowrap",
        }}>
          ✓ Verified
        </div>
      </div>
    </div>
  );
}

export default function Testimonials() {
  const trackRef = useRef(null);
  const resumeTimer = useRef(null);
  const rafRef = useRef(null);

  const [active, setActive] = useState(0);
  const [paused, setPaused] = useState(false);

  const total = TESTIMONIALS.length;

  /* ── Measure one card's width + gap for precise scroll math ── */
  const getStep = useCallback(() => {
    const el = trackRef.current;
    if (!el || !el.children.length) return 0;
    const card = el.children[0];
    const style = window.getComputedStyle(el);
    const gap = parseFloat(style.columnGap || style.gap || "16") || 16;
    return card.offsetWidth + gap;
  }, []);

  /* ── Scroll to a given index ── */
  const scrollToIndex = useCallback((idx) => {
    const el = trackRef.current;
    if (!el) return;
    const clamped = Math.max(0, Math.min(total - 1, idx));
    const step = getStep();
    el.scrollTo({ left: clamped * step, behavior: "smooth" });
  }, [getStep, total]);

  const prev = () => scrollToIndex(active - 1);
  const next = () => scrollToIndex(active + 1);

  /* ── Keep `active` dot in sync with actual scroll position ── */
  const handleScroll = useCallback(() => {
    if (rafRef.current) return;
    rafRef.current = requestAnimationFrame(() => {
      rafRef.current = null;
      const el = trackRef.current;
      if (!el) return;
      const step = getStep();
      if (!step) return;
      const idx = Math.round(el.scrollLeft / step);
      setActive(Math.max(0, Math.min(total - 1, idx)));
    });
  }, [getStep, total]);

  /* ── Pause auto-advance while user is interacting, resume after a short delay ── */
  const notifyInteraction = useCallback(() => {
    setPaused(true);
    if (resumeTimer.current) clearTimeout(resumeTimer.current);
    resumeTimer.current = setTimeout(() => setPaused(false), 3500);
  }, []);

  useEffect(() => {
    return () => {
      if (resumeTimer.current) clearTimeout(resumeTimer.current);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  /* ── Auto-advance ── */
  useEffect(() => {
    if (paused) return;
    const t = setInterval(() => {
      setActive((a) => {
        const nextIdx = a >= total - 1 ? 0 : a + 1;
        scrollToIndex(nextIdx);
        return nextIdx;
      });
    }, 4500);
    return () => clearInterval(t);
  }, [paused, total, scrollToIndex]);

  if (!SHOW_SECTION || total === 0) return null;

  return (
    <section style={{ background: "#fff6ea", position: "relative", overflow: "hidden", padding: "56px 0 64px" }}>

      {/* ── Soft blobs ── */}
      <div aria-hidden style={{
        position: "absolute", inset: 0, pointerEvents: "none",
        background:
          "radial-gradient(ellipse 55% 45% at 10% 50%, rgba(232,25,44,0.05) 0%, transparent 70%)," +
          "radial-gradient(ellipse 45% 40% at 90% 30%, rgba(245,166,35,0.06) 0%, transparent 70%)",
      }} />

      {/* ── Floating particles ── */}
      {PARTICLES.map((p) => (
        <motion.div
          key={p.id}
          aria-hidden
          style={{
            position: "absolute", borderRadius: "50%",
            width: p.size, height: p.size,
            top: p.top, left: p.left,
            background: "#e8192c", opacity: p.opacity,
            pointerEvents: "none",
          }}
          animate={{ y: [0, -16, 0], opacity: [p.opacity, p.opacity * 2.2, p.opacity] }}
          transition={{ duration: p.duration, delay: p.delay, repeat: Infinity, ease: "easeInOut" }}
        />
      ))}

      <div style={{ maxWidth: "1200px", margin: "0 auto", padding: "0 16px", position: "relative" }}>

        {/* ── Header ── */}
        <motion.div
          initial={{ opacity: 0, y: 22 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
          style={{ textAlign: "center", marginBottom: "36px" }}
        >
          <span style={{
            display: "inline-block",
            color: "#e8192c", background: "rgba(232,25,44,0.08)",
            border: "1px solid rgba(232,25,44,0.18)",
            borderRadius: "999px", padding: "4px 14px",
            fontSize: "0.68rem", fontWeight: 700,
            letterSpacing: "0.1em", textTransform: "uppercase",
            marginBottom: "14px",
          }}>
            Real Stories
          </span>

          <h2 style={{
            color: "#0a0e1e", fontWeight: 800, margin: "0 0 10px",
            fontSize: "clamp(1.6rem, 4vw, 2.4rem)",
            letterSpacing: "-0.02em", lineHeight: 1.15,
          }}>
            What people are saying
          </h2>

          <p style={{ color: "#6b7280", fontSize: "0.88rem", margin: 0 }}>
            From real couples and vendors — every review is from a verified booking.
          </p>
        </motion.div>

        {/* ── Carousel track (native scroll-snap: reliable swipe on every device) ── */}
        <div
          ref={trackRef}
          className="t-track"
          onScroll={() => { notifyInteraction(); handleScroll(); }}
          onTouchStart={notifyInteraction}
          onMouseDown={notifyInteraction}
          style={{
            display: "flex",
            gap: "16px",
            overflowX: "auto",
            paddingBottom: "4px",
          }}
        >
          {TESTIMONIALS.map((t, i) => (
            <TestimonialCard key={t.name} t={t} isActive={i === active} />
          ))}
        </div>

        {/* ── Controls row ── */}
        <div style={{
          display: "flex", alignItems: "center",
          justifyContent: "center", gap: "16px", marginTop: "28px",
        }}>
          {/* Prev */}
          <button
            onClick={() => { notifyInteraction(); prev(); }}
            disabled={active === 0}
            aria-label="Previous testimonial"
            style={{
              width: "38px", height: "38px", borderRadius: "50%",
              border: active === 0 ? "1.5px solid #e0e0e8" : "1.5px solid #e8192c",
              background: active === 0 ? "#fff" : "#e8192c",
              color: active === 0 ? "#ccc" : "#fff",
              display: "flex", alignItems: "center", justifyContent: "center",
              cursor: active === 0 ? "default" : "pointer",
              transition: "all 0.18s ease", flexShrink: 0,
            }}
          >
            <ChevronLeft size={16} />
          </button>

          {/* Dot indicators */}
          <div style={{ display: "flex", gap: "6px", alignItems: "center" }}>
            {TESTIMONIALS.map((_, i) => (
              <button
                key={i}
                onClick={() => { notifyInteraction(); scrollToIndex(i); }}
                aria-label={`Go to testimonial ${i + 1}`}
                style={{
                  width: i === active ? "22px" : "7px",
                  height: "7px", borderRadius: "999px",
                  background: i === active ? "#e8192c" : "#d1d5db",
                  border: "none", cursor: "pointer", padding: 0,
                  transition: "width 0.28s ease, background 0.28s ease",
                }}
              />
            ))}
          </div>

          {/* Next */}
          <button
            onClick={() => { notifyInteraction(); next(); }}
            disabled={active === total - 1}
            aria-label="Next testimonial"
            style={{
              width: "38px", height: "38px", borderRadius: "50%",
              border: active === total - 1 ? "1.5px solid #e0e0e8" : "1.5px solid #e8192c",
              background: active === total - 1 ? "#fff" : "#e8192c",
              color: active === total - 1 ? "#ccc" : "#fff",
              display: "flex", alignItems: "center", justifyContent: "center",
              cursor: active === total - 1 ? "default" : "pointer",
              transition: "all 0.18s ease", flexShrink: 0,
            }}
          >
            <ChevronRight size={16} />
          </button>
        </div>
      </div>

      <style>{`
        .t-track {
          scroll-snap-type: x mandatory;
          -webkit-overflow-scrolling: touch;
          scrollbar-width: none;
          -ms-overflow-style: none;
        }
        .t-track::-webkit-scrollbar { display: none; }

        .t-card {
          flex: 0 0 calc(100% - 8px);
          scroll-snap-stop: always;
        }
        @media (min-width: 640px) {
          .t-card { flex: 0 0 calc(50% - 8px); }
        }
        @media (min-width: 1024px) {
          .t-card { flex: 0 0 calc(33.333% - 11px); }
        }
      `}</style>
    </section>
  );
}
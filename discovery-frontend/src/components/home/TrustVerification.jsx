import React, { useState, useEffect, useRef } from "react";
import { motion, useInView } from "framer-motion";
import { ShieldCheck, FileCheck2, BadgeCheck, MessageCircle, Star } from "lucide-react";
import { BRAND_NAME } from "../../lib/constants";

function stepImage(name) {
  try { return new URL(`../../assets/trust/${name}.jpg`, import.meta.url).href; } catch { return null; }
}

const STEPS = [
  {
    icon: ShieldCheck,
    title: "Business verified",
    desc: "Every vendor submits business proof before they're allowed to go live on search.",
    image: "verified-business",
    accent: "#e8192c",
  },
  {
    icon: FileCheck2,
    title: "Documents cross-checked",
    desc: "Our team manually reviews ID, address and category-specific documents — not a bot, a person.",
    image: "document-check",
    accent: "#f5a623",
  },
  {
    icon: BadgeCheck,
    title: "Profile approved",
    desc: "Only after both checks pass does a profile get the verified badge you see on search results.",
    image: "profile-approved",
    accent: "#4ade80",
  },
];

const EXTRA = [
  { icon: MessageCircle, text: "Message vendors directly on WhatsApp — no commission, no middleman." },
  { icon: Star, text: "Ratings come only from real, completed bookings — never paid placements." },
];

/* ── Floating dot particle (pure CSS, no canvas) ── */
function Particle({ style }) {
  return (
    <span
      style={{
        position: "absolute",
        borderRadius: "50%",
        pointerEvents: "none",
        ...style,
      }}
    />
  );
}

const PARTICLES = Array.from({ length: 18 }, (_, i) => ({
  id: i,
  size: Math.random() * 3 + 1.5,
  top: `${Math.random() * 100}%`,
  left: `${Math.random() * 100}%`,
  opacity: Math.random() * 0.25 + 0.06,
  duration: Math.random() * 8 + 6,
  delay: Math.random() * 5,
}));

function StepImage({ name, alt }) {
  const [failed, setFailed] = useState(false);
  const src = stepImage(name);
  if (!src || failed) {
    return (
      <div className="h-40 w-full rounded-xl"
        style={{ background: "linear-gradient(135deg,#1a2035 0%,#0d1526 100%)", opacity: 0.7 }}
      />
    );
  }
  return (
    <img
      src={src}
      alt={alt}
      loading="lazy"
      onError={() => setFailed(true)}
      className="h-40 w-full rounded-xl object-cover"
      style={{ filter: "brightness(0.88) saturate(1.1)" }}
    />
  );
}

/* ── Animated counter for the pill badge ── */
function CountUp({ to, duration = 1.4 }) {
  const [val, setVal] = useState(0);
  const ref = useRef(null);
  const inView = useInView(ref, { once: true });

  useEffect(() => {
    if (!inView) return;
    let start = 0;
    const steps = 40;
    const inc = to / steps;
    const interval = (duration * 1000) / steps;
    const timer = setInterval(() => {
      start += inc;
      if (start >= to) { setVal(to); clearInterval(timer); }
      else setVal(Math.floor(start));
    }, interval);
    return () => clearInterval(timer);
  }, [inView, to, duration]);

  return <span ref={ref}>{val}</span>;
}

export default function TrustVerification() {
  return (
    <section
      style={{ background: "#07090f", position: "relative", overflow: "hidden" }}
      className="py-16 md:py-24"
    >
      {/* ── Background: radial glow blobs ── */}
      <div
        aria-hidden
        style={{
          position: "absolute", inset: 0, pointerEvents: "none",
          background:
            "radial-gradient(ellipse 60% 45% at 20% 50%, rgba(232,25,44,0.08) 0%, transparent 70%)," +
            "radial-gradient(ellipse 50% 40% at 80% 30%, rgba(245,166,35,0.07) 0%, transparent 70%)," +
            "radial-gradient(ellipse 40% 35% at 60% 80%, rgba(74,222,128,0.05) 0%, transparent 70%)",
        }}
      />

      {/* ── Floating particles ── */}
      <div aria-hidden style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
        {PARTICLES.map((p) => (
          <motion.div
            key={p.id}
            style={{
              position: "absolute",
              top: p.top,
              left: p.left,
              width: p.size,
              height: p.size,
              borderRadius: "50%",
              background: "#ffffff",
              opacity: p.opacity,
            }}
            animate={{ y: [0, -18, 0], opacity: [p.opacity, p.opacity * 1.8, p.opacity] }}
            transition={{ duration: p.duration, delay: p.delay, repeat: Infinity, ease: "easeInOut" }}
          />
        ))}
      </div>

      {/* ── Subtle grid lines ── */}
      <div
        aria-hidden
        style={{
          position: "absolute", inset: 0, pointerEvents: "none",
          backgroundImage:
            "linear-gradient(rgba(255,255,255,0.025) 1px, transparent 1px)," +
            "linear-gradient(90deg, rgba(255,255,255,0.025) 1px, transparent 1px)",
          backgroundSize: "48px 48px",
        }}
      />

      <div className="max-w-6xl mx-auto px-4 relative">

        {/* ── Header ── */}
        <motion.div
          className="text-center mb-14"
          initial={{ opacity: 0, y: 24 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
        >
          {/* Stats pills row */}
          <div className="flex flex-wrap justify-center gap-3 mb-6">
            {[
              { val: 3200, label: "vendors verified", suffix: "+" },
              { val: 99, label: "approval accuracy", suffix: "%" },
            ].map((s) => (
              <span
                key={s.label}
                style={{
                  background: "rgba(255,255,255,0.05)",
                  border: "1px solid rgba(255,255,255,0.10)",
                  color: "#fff",
                  borderRadius: "999px",
                  padding: "5px 14px",
                  fontSize: "0.75rem",
                  fontWeight: 600,
                  letterSpacing: "0.02em",
                }}
              >
                <CountUp to={s.val} />{s.suffix}&nbsp;
                <span style={{ opacity: 0.5, fontWeight: 400 }}>{s.label}</span>
              </span>
            ))}
          </div>

          <p
            style={{
              display: "inline-block",
              color: "#e8192c",
              background: "rgba(232,25,44,0.10)",
              border: "1px solid rgba(232,25,44,0.22)",
              borderRadius: "999px",
              fontSize: "0.7rem",
              fontWeight: 700,
              letterSpacing: "0.12em",
              textTransform: "uppercase",
              padding: "4px 12px",
              marginBottom: "14px",
            }}
          >
            How verification works
          </p>

          <h2
            style={{
              color: "#ffffff",
              fontWeight: 800,
              fontSize: "clamp(1.7rem, 4vw, 2.6rem)",
              lineHeight: 1.2,
              letterSpacing: "-0.01em",
            }}
          >
            Every vendor here is{" "}
            <span
              style={{
                background: "linear-gradient(90deg,#e8192c,#f5a623)",
                WebkitBackgroundClip: "text",
                WebkitTextFillColor: "transparent",
              }}
            >
              checked
            </span>
            , not just listed
          </h2>

          <p style={{ color: "rgba(255,255,255,0.45)", fontSize: "0.9rem", marginTop: "12px", maxWidth: "480px", margin: "12px auto 0" }}>
            {BRAND_NAME} doesn't accept a phone number and a photo. Every profile goes through the same three-step review before it's searchable.
          </p>
        </motion.div>

        {/* ── Step cards ── */}
        <div className="relative grid grid-cols-1 md:grid-cols-3 gap-6 mb-12">

          {/* Connector line */}
          <div
            className="hidden md:block absolute"
            style={{ top: "88px", left: "17%", right: "17%", height: "2px", background: "rgba(255,255,255,0.07)", overflow: "hidden" }}
          >
            <motion.div
              initial={{ scaleX: 0 }}
              whileInView={{ scaleX: 1 }}
              viewport={{ once: true }}
              transition={{ duration: 1.3, ease: "easeInOut", delay: 0.3 }}
              style={{ transformOrigin: "left", background: "linear-gradient(90deg,#e8192c,#f5a623,#4ade80)", height: "100%", width: "100%" }}
            />
          </div>

          {STEPS.map((step, i) => (
            <motion.div
              key={step.title}
              initial={{ opacity: 0, y: 28 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-50px" }}
              transition={{ duration: 0.55, delay: i * 0.15 }}
              whileHover={{ y: -4, transition: { duration: 0.22 } }}
              style={{
                position: "relative",
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.09)",
                borderRadius: "18px",
                padding: "22px",
                backdropFilter: "blur(12px)",
                overflow: "hidden",
              }}
            >
              {/* Card glow on hover — accent blob */}
              <div
                aria-hidden
                style={{
                  position: "absolute", top: "-40%", right: "-20%",
                  width: "180px", height: "180px", borderRadius: "50%",
                  background: step.accent,
                  opacity: 0.06, filter: "blur(40px)", pointerEvents: "none",
                }}
              />

              {/* Step number + icon */}
              <div style={{ display: "flex", alignItems: "center", gap: "10px", marginBottom: "16px" }}>
                <span
                  style={{
                    width: "30px", height: "30px", borderRadius: "50%",
                    background: step.accent,
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: "0.7rem", fontWeight: 800, color: "#fff", flexShrink: 0,
                    boxShadow: `0 0 12px ${step.accent}55`,
                  }}
                >
                  {i + 1}
                </span>
                <step.icon size={19} style={{ color: step.accent }} />
              </div>

              <StepImage name={step.image} alt={step.title} />

              <h3
                style={{ color: "#fff", fontWeight: 700, fontSize: "1rem", margin: "14px 0 6px" }}
              >
                {step.title}
              </h3>
              <p style={{ color: "rgba(255,255,255,0.45)", fontSize: "0.83rem", lineHeight: 1.6 }}>
                {step.desc}
              </p>

              {/* Bottom accent line */}
              <div
                style={{
                  position: "absolute", bottom: 0, left: "20%", right: "20%",
                  height: "2px", borderRadius: "999px",
                  background: `linear-gradient(90deg, transparent, ${step.accent}, transparent)`,
                  opacity: 0.5,
                }}
              />
            </motion.div>
          ))}
        </div>

        {/* ── Extra trust bullets ── */}
        <motion.div
          className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-2xl mx-auto"
          initial={{ opacity: 0, y: 18 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.5, delay: 0.2 }}
        >
          {EXTRA.map((e) => (
            <div
              key={e.text}
              style={{
                display: "flex", alignItems: "flex-start", gap: "12px",
                background: "rgba(255,255,255,0.04)",
                border: "1px solid rgba(255,255,255,0.08)",
                borderRadius: "14px", padding: "16px",
              }}
            >
              <span
                style={{
                  width: "32px", height: "32px", borderRadius: "8px", flexShrink: 0,
                  background: "rgba(245,166,35,0.12)", display: "flex",
                  alignItems: "center", justifyContent: "center",
                }}
              >
                <e.icon size={16} style={{ color: "#f5a623" }} />
              </span>
              <p style={{ color: "rgba(255,255,255,0.55)", fontSize: "0.83rem", lineHeight: 1.6 }}>
                {e.text}
              </p>
            </div>
          ))}
        </motion.div>

      </div>
    </section>
  );
}
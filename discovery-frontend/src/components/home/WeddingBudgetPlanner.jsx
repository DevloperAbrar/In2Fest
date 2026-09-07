import React, { useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Users, ArrowRight, Info, Share2, Check, Sparkles } from "lucide-react";
import { BRAND_NAME } from "../../lib/constants";
import CitySelect from "../common/CitySelect";

const STYLES = [
  { id: "simple",   label: "Simple",   emoji: "🌿" },
  { id: "standard", label: "Standard", emoji: "✨" },
  { id: "premium",  label: "Premium",  emoji: "💎" },
  { id: "luxury",   label: "Luxury",   emoji: "👑" },
];

const CATEGORY_MODEL = [
  { key: "venue",       label: "Venue & Hall Rental",     slug: "marriage-hall",  type: "perGuest", defaultOn: true,  rate: { simple: 450, standard: 800, premium: 1400, luxury: 2400 } },
  { key: "catering",    label: "Catering & Food",         slug: "caterer",        type: "perGuest", defaultOn: true,  rate: { simple: 550, standard: 950, premium: 1600, luxury: 2800 } },
  { key: "decor",       label: "Decoration & Stage",      slug: "decorator",      type: "flat",     defaultOn: true,  rate: { simple: 35000, standard: 85000, premium: 220000, luxury: 550000 } },
  { key: "photography", label: "Photography & Films",     slug: "photographer",   type: "flat",     defaultOn: true,  rate: { simple: 25000, standard: 60000, premium: 150000, luxury: 400000 } },
  { key: "makeup",      label: "Bridal Makeup & Styling", slug: "makeup-artist",  type: "flat",     defaultOn: true,  rate: { simple: 8000, standard: 20000, premium: 45000, luxury: 100000 } },
  { key: "music",       label: "DJ, Sound & Lighting",    slug: "dj",             type: "flat",     defaultOn: true,  rate: { simple: 15000, standard: 35000, premium: 80000, luxury: 180000 } },
  { key: "mehendi",     label: "Mehndi Artist",           slug: "mehendi-artist", type: "flat",     defaultOn: false, rate: { simple: 5000, standard: 12000, premium: 25000, luxury: 55000 } },
  { key: "cards",       label: "Invitations & Cards",     slug: "card-printing",  type: "perGuest", defaultOn: false, rate: { simple: 15, standard: 35, premium: 80, luxury: 180 } },
];

const GUEST_TIERS = [
  { max: 150, mult: 0.85 },
  { max: 350, mult: 1 },
  { max: 600, mult: 1.25 },
  { max: Infinity, mult: 1.55 },
];
function guestTierMultiplier(guests) {
  return (GUEST_TIERS.find((t) => guests <= t.max) || GUEST_TIERS[GUEST_TIERS.length - 1]).mult;
}

const PALETTE = ["#e8192c","#f5a623","#1a2035","#2a3151","#ee747c","#f8c976","#6d7591","#9aa0b8"];

function formatINR(n) {
  return "₹" + Math.round(n).toLocaleString("en-IN");
}

function DonutChart({ items, total }) {
  const size = 220, stroke = 26, radius = (size - stroke) / 2;
  const circumference = 2 * Math.PI * radius;
  let cumulative = 0;
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="mx-auto">
      <circle cx={size/2} cy={size/2} r={radius} fill="none" stroke="#ede8e3" strokeWidth={stroke} />
      {items.map((item, i) => {
        const pct  = total > 0 ? item.amount / total : 0;
        const dash = pct * circumference;
        const offset = cumulative;
        cumulative += dash;
        return (
          <motion.circle
            key={item.key}
            cx={size/2} cy={size/2} r={radius}
            fill="none"
            stroke={PALETTE[i % PALETTE.length]}
            strokeWidth={stroke}
            strokeDasharray={`${dash} ${circumference - dash}`}
            strokeDashoffset={-offset}
            transform={`rotate(-90 ${size/2} ${size/2})`}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: i * 0.06 }}
          />
        );
      })}
    </svg>
  );
}

export default function WeddingBudgetPlanner() {
  const navigate = useNavigate();
  const [city, setCity]     = useState("");
  const [guests, setGuests] = useState(300);
  const [style, setStyle]   = useState("standard");
  const [activeKeys, setActiveKeys] = useState(
    new Set(CATEGORY_MODEL.filter((c) => c.defaultOn).map((c) => c.key))
  );
  const [copied, setCopied] = useState(false);

  const toggleCategory = (key) => {
    setActiveKeys((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  };

  const { items, total } = useMemo(() => {
    const tierMult = guestTierMultiplier(guests);
    const list = CATEGORY_MODEL.filter((c) => activeKeys.has(c.key))
      .map((c) => {
        const base   = c.rate[style];
        const amount = c.type === "perGuest" ? base * guests : base * tierMult;
        return { ...c, amount };
      })
      .sort((a, b) => b.amount - a.amount);
    const sum = list.reduce((s, i) => s + i.amount, 0);
    return { items: list, total: sum };
  }, [guests, style, activeKeys]);

  const goToCategory = (slug) => {
    const params = new URLSearchParams();
    params.set("category", slug);
    if (city) params.set("city", city);
    navigate(`/search?${params.toString()}`);
  };

  const shareOnWhatsApp = () => {
    const lines = items.map((i) => `• ${i.label}: ${formatINR(i.amount)}`).join("\n");
    const text  = `My estimated wedding budget for ${guests} guests (${style}):\n\n${lines}\n\nTotal: ${formatINR(total)}\n\nEstimated on ${BRAND_NAME}`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, "_blank");
  };

  const copyEstimate = () => {
    const lines = items.map((i) => `${i.label}: ${formatINR(i.amount)}`).join("\n");
    navigator.clipboard?.writeText(`Total: ${formatINR(total)}\n${lines}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  return (
    <section style={{ position: "relative", overflow: "hidden", background: "#fff7f5" }}>

      {/* ── Soft radial blush glow blobs ── */}
      <div aria-hidden style={{
        position: "absolute", inset: 0, pointerEvents: "none",
        background:
          "radial-gradient(ellipse 60% 50% at 10% 40%, rgba(232,25,44,0.06) 0%, transparent 70%)," +
          "radial-gradient(ellipse 50% 40% at 90% 20%, rgba(245,166,35,0.07) 0%, transparent 70%)," +
          "radial-gradient(ellipse 40% 35% at 50% 95%, rgba(232,25,44,0.04) 0%, transparent 70%)",
      }} />

      {/* ══ WAVE TOP — from previous section (#f7f8fc) into this section ══ */}
      <div style={{ lineHeight: 0 }}>
        <svg viewBox="0 0 1440 90" preserveAspectRatio="none"
          style={{ display: "block", width: "100%", height: "90px" }}
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M0,0 L0,45 Q200,90 400,40 Q600,0 720,50 Q860,95 1080,40 Q1280,0 1440,55 L1440,0 Z"
            fill="#f7f8fc"
          />
        </svg>
      </div>

      <div className="py-10 md:py-16" style={{ position: "relative" }}>
        <div className="max-w-5xl mx-auto px-4">

          {/* ── Header ── */}
          <motion.div
            className="text-center mb-10"
            initial={{ opacity: 0, y: 22 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
          >
            <span style={{
              display: "inline-flex", alignItems: "center", gap: "6px",
              background: "rgba(232,25,44,0.08)", color: "#e8192c",
              border: "1px solid rgba(232,25,44,0.18)",
              borderRadius: "999px", padding: "4px 14px",
              fontSize: "0.68rem", fontWeight: 700, marginBottom: "12px",
            }}>
              <Sparkles size={11} /> Free Tool
            </span>
            <h2 style={{
              color: "#0a0e1e", fontWeight: 800, margin: "0 0 10px",
              fontSize: "clamp(1.6rem, 4vw, 2.4rem)",
              letterSpacing: "-0.02em", lineHeight: 1.15,
            }}>
              Plan your wedding budget in seconds
            </h2>
            <p style={{ color: "#6b7280", fontSize: "0.9rem", maxWidth: "480px", margin: "0 auto" }}>
              Pick what you need, adjust guests and style, and watch your estimate update live — then find real vendors for every category.
            </p>
          </motion.div>

          {/* ── Main card ── */}
          <motion.div
            initial={{ opacity: 0, y: 28 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.5, delay: 0.1, ease: [0.22, 1, 0.36, 1] }}
            style={{
              background: "#ffffff",
              border: "1px solid rgba(232,25,44,0.08)",
              borderRadius: "28px",
              boxShadow: "0 8px 40px rgba(232,25,44,0.07), 0 2px 8px rgba(0,0,0,0.04)",
              padding: "28px 24px",
            }}
            className="grid md:grid-cols-5 gap-8"
          >
            {/* Left controls */}
            <div className="md:col-span-3 space-y-6">

              {/* City + Guests */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <CitySelect value={city} onChange={setCity} placeholder="Select city (optional)" />
                <div>
                  <label className="flex items-center justify-between text-xs font-semibold text-gray-500 mb-2">
                    <span className="flex items-center gap-1.5"><Users size={13} /> Guest count</span>
                    <span className="font-bold text-navy-900">{guests}</span>
                  </label>
                  <input
                    type="range" min={50} max={1000} step={10}
                    value={guests}
                    onChange={(e) => setGuests(Number(e.target.value))}
                    className="w-full"
                    style={{ accentColor: "#e8192c" }}
                  />
                </div>
              </div>

              {/* Style */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-2">Style</label>
                <div className="grid grid-cols-4 gap-2">
                  {STYLES.map((s) => (
                    <button
                      key={s.id}
                      onClick={() => setStyle(s.id)}
                      style={{
                        padding: "10px 4px", borderRadius: "12px",
                        fontSize: "0.75rem", fontWeight: 700,
                        display: "flex", flexDirection: "column",
                        alignItems: "center", gap: "4px",
                        cursor: "pointer", transition: "all 0.18s ease",
                        border: style === s.id ? "none" : "1px solid #e5e7eb",
                        background: style === s.id
                          ? "linear-gradient(135deg,#e8192c,#f5a623)"
                          : "#fafafa",
                        color: style === s.id ? "#fff" : "#6b7280",
                        boxShadow: style === s.id ? "0 4px 14px rgba(232,25,44,0.25)" : "none",
                      }}
                    >
                      <span style={{ fontSize: "1rem" }}>{s.emoji}</span>
                      {s.label}
                    </button>
                  ))}
                </div>
              </div>

              {/* Category toggles */}
              <div>
                <label className="block text-xs font-semibold text-gray-500 mb-2">What do you need?</label>
                <div className="flex flex-wrap gap-2">
                  {CATEGORY_MODEL.map((c) => {
                    const on = activeKeys.has(c.key);
                    return (
                      <button
                        key={c.key}
                        onClick={() => toggleCategory(c.key)}
                        className="flex items-center gap-1.5 px-3 py-2 rounded-full border text-xs font-semibold transition-colors"
                        style={{
                          border: on ? "none" : "1px solid #e5e7eb",
                          background: on ? "#0a0e1e" : "#fafafa",
                          color: on ? "#fff" : "#6b7280",
                          cursor: "pointer",
                        }}
                      >
                        {on && <Check size={12} />}
                        {c.label}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Right: donut */}
            <div className="md:col-span-2 flex flex-col items-center justify-center border-t md:border-t-0 md:border-l border-gray-100 pt-6 md:pt-0 md:pl-8">
              <div style={{ position: "relative" }}>
                <DonutChart items={items} total={total} />
                <div style={{
                  position: "absolute", inset: 0,
                  display: "flex", flexDirection: "column",
                  alignItems: "center", justifyContent: "center",
                }}>
                  <p style={{ fontSize: "0.62rem", color: "#9ca3af", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                    Estimated total
                  </p>
                  <AnimatePresence mode="wait">
                    <motion.p
                      key={total}
                      initial={{ opacity: 0, y: 5 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: -5 }}
                      transition={{ duration: 0.22 }}
                      className="font-display font-extrabold text-navy-900 text-lg"
                      style={{ margin: 0 }}
                    >
                      {formatINR(total)}
                    </motion.p>
                  </AnimatePresence>
                </div>
              </div>

              <div className="flex gap-2 mt-6 w-full">
                <button
                  onClick={shareOnWhatsApp}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-bold text-white"
                  style={{ background: "#25D366", border: "none", cursor: "pointer" }}
                >
                  <Share2 size={13} /> Share
                </button>
                <button
                  onClick={copyEstimate}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2.5 rounded-xl text-xs font-bold border border-gray-200 text-gray-600 hover:border-gray-300"
                  style={{ cursor: "pointer", background: "#fff" }}
                >
                  {copied ? <Check size={13} /> : null} {copied ? "Copied!" : "Copy"}
                </button>
              </div>
            </div>
          </motion.div>

          {/* ── Breakdown rows ── */}
          <div style={{ marginTop: "20px", display: "flex", flexDirection: "column", gap: "10px" }}>
            {items.map((item, i) => (
              <motion.div
                key={item.key}
                initial={{ opacity: 0, x: -14 }}
                whileInView={{ opacity: 1, x: 0 }}
                viewport={{ once: true, margin: "-20px" }}
                transition={{ duration: 0.38, delay: i * 0.05, ease: [0.22, 1, 0.36, 1] }}
                style={{
                  display: "flex", alignItems: "center", gap: "14px",
                  background: "#ffffff",
                  border: "1px solid #f3f4f6",
                  borderRadius: "14px", padding: "14px 16px",
                  boxShadow: "0 1px 4px rgba(0,0,0,0.04)",
                }}
              >
                <span style={{
                  width: "10px", height: "10px", borderRadius: "50%", flexShrink: 0,
                  background: PALETTE[i % PALETTE.length],
                }} />
                <div style={{ flex: 1, minWidth: 0, display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                  <span style={{ fontSize: "0.85rem", fontWeight: 500, color: "#374151" }}>{item.label}</span>
                  <AnimatePresence mode="wait">
                    <motion.span
                      key={item.amount}
                      initial={{ opacity: 0, y: 4 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      style={{ fontSize: "0.88rem", fontWeight: 700, color: "#111827" }}
                    >
                      {formatINR(item.amount)}
                    </motion.span>
                  </AnimatePresence>
                </div>
                <button
                  onClick={() => goToCategory(item.slug)}
                  className="flex-shrink-0 flex items-center gap-1 text-xs font-semibold px-3 py-1.5 rounded-lg border border-gray-200 text-gray-600 hover:border-accent-300 hover:text-accent-700 transition-colors"
                  style={{ cursor: "pointer", background: "#fff" }}
                >
                  Find <ArrowRight size={12} />
                </button>
              </motion.div>
            ))}
            {items.length === 0 && (
              <p className="text-center text-sm text-gray-400 py-6">
                Pick at least one category above to see your estimate.
              </p>
            )}
          </div>

          {/* Disclaimer */}
          <div className="flex items-start gap-2 mt-6 text-[11px] text-gray-400 leading-relaxed max-w-2xl mx-auto">
            <Info size={13} className="flex-shrink-0 mt-0.5" />
            This is an estimate based on typical costs for the selected style and guest count. Actual vendor pricing varies by city, season and package — browse real quotes on {BRAND_NAME}.
          </div>
        </div>
      </div>

      {/* ══ WAVE BOTTOM — back to next section (#f7f8fc) ══ */}
      <div style={{ lineHeight: 0 }}>
        <svg viewBox="0 0 1440 90" preserveAspectRatio="none"
          style={{ display: "block", width: "100%", height: "90px" }}
          xmlns="http://www.w3.org/2000/svg"
        >
          <path
            d="M0,90 L0,45 Q200,0 440,50 Q640,95 720,45 Q860,0 1080,50 Q1280,95 1440,40 L1440,90 Z"
            fill="#f7f8fc"
          />
        </svg>
      </div>

    </section>
  );
}
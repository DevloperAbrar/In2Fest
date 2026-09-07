import React from "react";
import { motion } from "framer-motion";

const PATHS = {
  wave:       "M0,32 C240,80 480,0 720,28 C960,56 1200,8 1440,36 L1440,100 L0,100 Z",
  curve:      "M0,0 C480,100 960,100 1440,0 L1440,100 L0,100 Z",
  angle:      "M0,100 L1440,0 L1440,100 Z",
  // steeper, more dramatic single-cut diagonal  - reads as "modern SaaS" rather than a soft curve
  sharpAngle: "M0,100 L1440,15 L1440,100 Z",
  zigzag:     "M0,55 L120,15 L240,55 L360,15 L480,55 L600,15 L720,55 L840,15 L960,55 L1080,15 L1200,55 L1320,15 L1440,55 L1440,100 L0,100 Z"
};

/**
 * Full-width shape divider dropped between two <section>s.
 * from = background colour of the section ABOVE  (fills the outer strip)
 * to   = background colour of the section BELOW  (fills the shape itself)
 * glow = optional accent colour (hex) for a soft animated highlight sweeping along the seam
 */
export default function SectionDivider({
  variant = "wave",
  from = "#ffffff",
  to = "#ffffff",
  flip = false,
  height = 72,
  glow = null,
  lineColor = "#d9c9a3",
  dotColor = "#e8912a",
}) {
  // ── Decorative squiggle line + accent dot, then a clean diagonal cut ──
  // (matches the "hand-drawn" reference style: thin jagged line floating in
  // the upper colour, a single dot marking its start, then a crisp angled
  // block transitioning into the next section's colour)
  if (variant === "zigzagAngle") {
    return (
      <div
        aria-hidden="true"
        style={{ background: from, height, transform: flip ? "scaleY(-1)" : undefined }}
        className="relative w-full overflow-hidden leading-[0]"
      >
        <svg viewBox="0 0 1440 150" preserveAspectRatio="none" className="w-full h-full block">
          {/* squiggle line */}
          <path
            d="M0,40 L90,15 L180,40 L270,15 L360,40 L450,15 L540,40 L630,15 L720,40 L810,15 L900,40 L990,15 L1080,40 L1170,15 L1260,40 L1350,15 L1440,40"
            fill="none"
            stroke={lineColor}
            strokeWidth="2"
            vectorEffect="non-scaling-stroke"
          />
          {/* accent dot marking the start of the line */}
          <circle cx="26" cy="40" r="6" fill={dotColor} />
          {/* crisp diagonal colour-block cut below the line */}
          <path d="M0,150 L1440,70 L1440,150 Z" fill={to} />
        </svg>

        {glow && (
          <motion.div
            aria-hidden="true"
            className="pointer-events-none absolute top-0 left-0 h-full w-1/3"
            style={{
              background: `linear-gradient(90deg, transparent, ${glow}55, transparent)`,
              mixBlendMode: "screen",
            }}
            initial={{ x: "-100%" }}
            animate={{ x: "400%" }}
            transition={{ duration: 5, repeat: Infinity, ease: "linear", repeatDelay: 1.5 }}
          />
        )}
      </div>
    );
  }

  const path = PATHS[variant] || PATHS.wave;
  return (
    <div
      aria-hidden="true"
      style={{ background: from, height, transform: flip ? "scaleY(-1)" : undefined }}
      className="relative w-full overflow-hidden leading-[0]"
    >
      <svg viewBox="0 0 1440 100" preserveAspectRatio="none" className="w-full h-full block">
        <path d={path} fill={to} />
      </svg>

      {glow && (
        <motion.div
          aria-hidden="true"
          className="pointer-events-none absolute top-0 left-0 h-full w-1/3"
          style={{
            background: `linear-gradient(90deg, transparent, ${glow}55, transparent)`,
            mixBlendMode: "screen",
          }}
          initial={{ x: "-100%" }}
          animate={{ x: "400%" }}
          transition={{ duration: 5, repeat: Infinity, ease: "linear", repeatDelay: 1.5 }}
        />
      )}
    </div>
  );
}
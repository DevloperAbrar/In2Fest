import React from "react";
import { motion, useReducedMotion } from "framer-motion";

const NAVY = "#1a2035";
const RED = "#e8192c";
const GOLD = "#f5a623";
const SOFT = "#F3F4F9";

// Gently floating wrapper for decorative pieces (transform only).
export function Floaty({ children, className = "", delay = 0, range = 12, rotate = 0 }) {
  const reduce = useReducedMotion();
  if (reduce) return <div className={className} style={{ transform: `rotate(${rotate}deg)` }}>{children}</div>;
  return (
    <motion.div
      className={className}
      initial={{ rotate }}
      animate={{ y: [0, -range, 0], rotate: [rotate, rotate + 2, rotate] }}
      transition={{ duration: 6 + delay, repeat: Infinity, ease: "easeInOut", delay }}
    >
      {children}
    </motion.div>
  );
}

/* ── Small decorative shapes ───────────────────────────────────────── */
export const Plus = ({ size = 28, color = GOLD }) => (
  <svg width={size} height={size} viewBox="0 0 28 28" aria-hidden="true">
    <rect x="11" y="0" width="6" height="28" rx="3" fill={color} />
    <rect x="0" y="11" width="28" height="6" rx="3" fill={color} />
  </svg>
);

export const Ring = ({ size = 40, color = RED, stroke = 7 }) => (
  <svg width={size} height={size} viewBox="0 0 40 40" aria-hidden="true">
    <circle cx="20" cy="20" r={20 - stroke / 2} fill="none" stroke={color} strokeWidth={stroke} />
  </svg>
);

export const Squiggle = ({ width = 90, color = NAVY }) => (
  <svg width={width} height={width * 0.2} viewBox="0 0 90 18" aria-hidden="true">
    <path d="M2 9 q8 -12 16 0 t16 0 t16 0 t16 0 t16 0" fill="none" stroke={color} strokeWidth="4" strokeLinecap="round" />
  </svg>
);

export const DotGrid = ({ color = NAVY, opacity = 0.25 }) => (
  <svg width="84" height="84" viewBox="0 0 84 84" aria-hidden="true" opacity={opacity}>
    {Array.from({ length: 36 }).map((_, i) => (
      <circle key={i} cx={7 + (i % 6) * 14} cy={7 + Math.floor(i / 6) * 14} r="2.6" fill={color} />
    ))}
  </svg>
);

export const Triangle = ({ size = 34, color = NAVY }) => (
  <svg width={size} height={size} viewBox="0 0 34 34" aria-hidden="true">
    <path d="M17 4 L31 29 H3 Z" fill={color} strokeLinejoin="round" stroke={color} strokeWidth="4" />
  </svg>
);

// The arch from the In2Fest logo, repeated as a brand motif.
export const Arches = ({ className = "", colors = [GOLD, RED, "#fff"], width = 220 }) => (
  <svg className={className} width={width} height={width / 2} viewBox="0 0 220 110" aria-hidden="true">
    <path d="M10 110 a100 100 0 0 1 200 0" fill="none" stroke={colors[0]} strokeWidth="18" strokeLinecap="round" />
    <path d="M42 110 a68 68 0 0 1 136 0" fill="none" stroke={colors[1]} strokeWidth="18" strokeLinecap="round" />
    <path d="M74 110 a36 36 0 0 1 72 0" fill="none" stroke={colors[2]} strokeWidth="18" strokeLinecap="round" />
  </svg>
);

const Star = ({ x, y, fill = "#fff" }) => (
  <polygon
    transform={`translate(${x} ${y})`}
    fill={fill}
    points="0,-14 3.4,-4.7 13.3,-4.3 5.5,1.8 8.2,11.3 0,5.8 -8.2,11.3 -5.5,1.8 -13.3,-4.3 -3.4,-4.7"
  />
);

/* ── Illustration 1: RUN IT (dashboard) ────────────────────────────── */
export function RunArt({ className = "" }) {
  const bars = [34, 52, 40, 66, 48, 78, 92];
  return (
    <svg className={className} viewBox="0 0 520 380" role="img" aria-label="Business dashboard illustration">
      <rect x="40" y="46" width="372" height="268" rx="24" fill="#fff" />
      <rect x="40" y="46" width="372" height="46" rx="24" fill="#EAEDF5" />
      <rect x="40" y="70" width="372" height="22" fill="#EAEDF5" />
      <circle cx="68" cy="69" r="5.5" fill={RED} />
      <circle cx="86" cy="69" r="5.5" fill={GOLD} />
      <circle cx="104" cy="69" r="5.5" fill="#22c55e" />
      {[0, 1, 2].map((i) => (
        <g key={i} transform={`translate(${62 + i * 112} 108)`}>
          <rect width="102" height="66" rx="14" fill={SOFT} />
          <rect x="12" y="14" width="46" height="6" rx="3" fill="#C3C7D6" />
          <rect x="12" y="32" width={i === 1 ? 54 : 40} height="16" rx="5" fill={i === 2 ? RED : NAVY} />
        </g>
      ))}
      {bars.map((h, i) => (
        <rect key={i} x={62 + i * 27} y={296 - h * 1.15} width="17" height={h * 1.15} rx="6" fill={i === bars.length - 1 ? GOLD : NAVY} />
      ))}
      {[0, 1, 2].map((i) => (
        <g key={i} transform={`translate(262 ${190 + i * 38})`}>
          <rect width="128" height="30" rx="15" fill={SOFT} />
          <circle cx="16" cy="15" r="9" fill={[GOLD, RED, "#22c55e"][i]} />
          <rect x="32" y="10" width="52" height="6" rx="3" fill={NAVY} />
          <rect x="32" y="19" width="34" height="4" rx="2" fill="#C3C7D6" />
        </g>
      ))}
      {/* paid badge */}
      <g>
        <circle cx="414" cy="74" r="30" fill="#22c55e" />
        <path d="M400 74 l10 10 l19 -20" fill="none" stroke="#fff" strokeWidth="7" strokeLinecap="round" strokeLinejoin="round" />
      </g>
      {/* QR card */}
      <g transform="translate(356 214)">
        <rect width="112" height="112" rx="18" fill="#fff" />
        <rect x="16" y="16" width="30" height="30" rx="5" fill="none" stroke={NAVY} strokeWidth="5" />
        <rect x="25" y="25" width="12" height="12" rx="2" fill={NAVY} />
        <rect x="66" y="16" width="30" height="30" rx="5" fill="none" stroke={NAVY} strokeWidth="5" />
        <rect x="75" y="25" width="12" height="12" rx="2" fill={NAVY} />
        <rect x="16" y="66" width="30" height="30" rx="5" fill="none" stroke={NAVY} strokeWidth="5" />
        <rect x="25" y="75" width="12" height="12" rx="2" fill={NAVY} />
        {[[66, 66], [84, 66], [66, 84], [90, 90], [78, 78]].map(([x, y]) => (
          <rect key={x + "-" + y} x={x} y={y} width="10" height="10" rx="2" fill={NAVY} />
        ))}
      </g>
      {/* coin */}
      <circle cx="54" cy="330" r="32" fill={GOLD} />
      <circle cx="54" cy="330" r="24" fill="none" stroke="#fff" strokeOpacity=".6" strokeWidth="3" />
      <text x="54" y="341" textAnchor="middle" fontSize="30" fontWeight="800" fill={NAVY}>₹</text>
    </svg>
  );
}

/* ── Illustration 2: GET IT (website) ──────────────────────────────── */
export function GetArt({ className = "" }) {
  return (
    <svg className={className} viewBox="0 0 520 380" role="img" aria-label="Website illustration">
      <rect x="56" y="36" width="392" height="284" rx="22" fill="#fff" />
      <rect x="56" y="36" width="392" height="44" rx="22" fill="#EAEDF5" />
      <rect x="56" y="58" width="392" height="22" fill="#EAEDF5" />
      <circle cx="82" cy="58" r="5.5" fill={RED} />
      <circle cx="100" cy="58" r="5.5" fill={GOLD} />
      <circle cx="118" cy="58" r="5.5" fill="#22c55e" />
      <rect x="146" y="49" width="210" height="18" rx="9" fill="#fff" />
      <rect x="74" y="94" width="356" height="104" rx="16" fill={NAVY} />
      <rect x="96" y="114" width="64" height="7" rx="3.5" fill={GOLD} />
      <rect x="96" y="132" width="160" height="14" rx="7" fill="#fff" />
      <rect x="96" y="154" width="116" height="14" rx="7" fill="#fff" fillOpacity=".7" />
      <rect x="96" y="176" width="76" height="16" rx="8" fill={RED} />
      <path d="M338 198 v-44 a36 36 0 0 1 72 0 v44 z" fill={GOLD} />
      <path d="M356 198 v-26 a18 18 0 0 1 36 0 v26 z" fill="#fff" fillOpacity=".35" />
      {[0, 1, 2].map((i) => (
        <g key={i} transform={`translate(${74 + i * 122} 214)`}>
          <rect width="112" height="92" rx="14" fill={SOFT} />
          <rect x="10" y="10" width="92" height="38" rx="9" fill={[ "#FFE6D6", "#DDF3E8", "#FFF0C2" ][i]} />
          <rect x="10" y="58" width="64" height="8" rx="4" fill={NAVY} />
          <rect x="10" y="72" width="44" height="6" rx="3" fill="#C3C7D6" />
        </g>
      ))}
      {/* cursor */}
      <path d="M392 262 v40 l11-10 l8 19 l9-4 l-8-18 l15-1 z" fill={NAVY} stroke="#fff" strokeWidth="3" strokeLinejoin="round" />
      {/* domain tag */}
      <rect x="18" y="296" width="214" height="44" rx="22" fill={GOLD} />
      <text x="125" y="324" textAnchor="middle" fontSize="15" fontWeight="800" fill={NAVY}>yourname.in2fest.com</text>
      {/* swatches */}
      <circle cx="476" cy="92" r="16" fill={NAVY} />
      <circle cx="476" cy="132" r="16" fill={GOLD} />
      <circle cx="476" cy="172" r="16" fill="#fff" />
    </svg>
  );
}

/* ── Illustration 3: FOUND IT (phone, map, WhatsApp) ───────────────── */
export function FoundArt({ className = "" }) {
  return (
    <svg className={className} viewBox="0 0 520 380" role="img" aria-label="Local search on a phone illustration">
      <rect x="170" y="14" width="196" height="352" rx="34" fill={NAVY} />
      <rect x="182" y="32" width="172" height="316" rx="24" fill="#fff" />
      <rect x="194" y="48" width="148" height="28" rx="14" fill="#EAEDF5" />
      <circle cx="210" cy="62" r="5.5" fill="none" stroke={NAVY} strokeWidth="2.5" />
      <path d="M214 66 l5 5" stroke={NAVY} strokeWidth="2.5" strokeLinecap="round" />
      <rect x="194" y="88" width="148" height="118" rx="14" fill="#DDF3E8" />
      <path d="M194 150 H342 M240 88 V206 M300 88 V206" stroke="#fff" strokeWidth="7" />
      <rect x="252" y="100" width="36" height="22" rx="6" fill="#BFE6D2" />
      <path d="M268 178 c-15-19-21-27-21-38 a21 21 0 0 1 42 0 c0 11-6 19-21 38z" fill={RED} />
      <circle cx="268" cy="140" r="7.5" fill="#fff" />
      <circle cx="218" cy="116" r="7" fill={NAVY} />
      <circle cx="318" cy="176" r="7" fill={NAVY} />
      {[0, 1].map((i) => (
        <g key={i} transform={`translate(194 ${218 + i * 52})`}>
          <rect width="148" height="44" rx="12" fill={SOFT} />
          <rect x="8" y="8" width="28" height="28" rx="8" fill={i ? RED : GOLD} />
          <rect x="44" y="12" width="52" height="7" rx="3.5" fill={NAVY} />
          <rect x="44" y="25" width="34" height="5" rx="2.5" fill="#C3C7D6" />
          <circle cx="126" cy="22" r="11" fill="#25D366" />
          <path d="M121 22 l4 4 l7 -8" fill="none" stroke="#fff" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" />
        </g>
      ))}
      {/* chat bubbles */}
      <g>
        <rect x="26" y="108" width="156" height="54" rx="20" fill="#fff" />
        <path d="M150 160 l14 16 l4 -18 z" fill="#fff" />
        <text x="104" y="141" textAnchor="middle" fontSize="14" fontWeight="700" fill={NAVY}>Hi, I want to join</text>
      </g>
      <g>
        <rect x="360" y="222" width="140" height="48" rx="20" fill="#25D366" />
        <text x="430" y="252" textAnchor="middle" fontSize="14" fontWeight="800" fill="#fff">New enquiry</text>
      </g>
      {/* rating badge */}
      <circle cx="418" cy="96" r="38" fill={RED} />
      <Star x={418} y={88} />
      <text x="418" y="124" textAnchor="middle" fontSize="15" fontWeight="800" fill="#fff">4.8</text>
      <circle cx="60" cy="300" r="22" fill="#fff" fillOpacity=".55" />
      <g transform="translate(47 287)"><rect x="10" y="0" width="6" height="26" rx="3" fill={NAVY} /><rect x="0" y="10" width="26" height="6" rx="3" fill={NAVY} /></g>
    </svg>
  );
}
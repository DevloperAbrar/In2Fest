import React, { useEffect, useId, useRef, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";

/* Motion presets + colour tones shared by the gym screens. UI only. */

export const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06, delayChildren: 0.02 } }
};

export const fadeUp = {
  hidden: { opacity: 0, y: 14 },
  show: { opacity: 1, y: 0, transition: { duration: 0.42, ease: [0.22, 1, 0.36, 1] } }
};

export const TONES = {
  red: { chip: "bg-primary-50 text-primary-600" },
  navy: { chip: "bg-navy-50 text-navy-600" },
  emerald: { chip: "bg-emerald-50 text-emerald-600" },
  amber: { chip: "bg-amber-50 text-amber-600" },
  sky: { chip: "bg-sky-50 text-sky-600" },
  violet: { chip: "bg-violet-50 text-violet-600" }
};

const AVATAR_TONES = ["red", "sky", "emerald", "amber", "violet", "navy"];

/* Animates a number up to `target`. Returns the value instantly when "reduce motion" is on. */
export function useCountUp(target = 0, duration = 900) {
  const reduce = useReducedMotion();
  const safeTarget = Number.isFinite(Number(target)) ? Number(target) : 0;
  const [value, setValue] = useState(0);
  const fromRef = useRef(0);

  useEffect(() => {
    if (reduce) return undefined;
    const from = fromRef.current;
    const start = performance.now();
    let frame;
    const tick = (now) => {
      const t = Math.min((now - start) / duration, 1);
      const eased = 1 - Math.pow(1 - t, 3);
      const next = from + (safeTarget - from) * eased;
      fromRef.current = next;
      setValue(next);
      if (t < 1) frame = requestAnimationFrame(tick);
    };
    frame = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(frame);
  }, [safeTarget, duration, reduce]);

  return reduce ? safeTarget : value;
}

export function AnimatedNumber({ value = 0, format = (v) => Math.round(v).toLocaleString("en-IN") }) {
  const current = useCountUp(value);
  return <>{format(current)}</>;
}

export function Surface({ className = "", children, ...rest }) {
  return (
    <div className={`bg-white rounded-2xl border border-navy-100/70 shadow-card ${className}`} {...rest}>
      {children}
    </div>
  );
}

export function SectionTitle({ title, hint, action }) {
  return (
    <div className="flex items-center justify-between gap-3 mb-3">
      <div className="min-w-0">
        <h2 className="font-display font-semibold text-[15px] text-navy-900 truncate">{title}</h2>
        {hint && <p className="text-xs text-navy-400 mt-0.5">{hint}</p>}
      </div>
      {action}
    </div>
  );
}

export function InitialsAvatar({ name = "?", size = 38 }) {
  const clean = String(name || "?").trim() || "?";
  const initials = clean
    .split(/\s+/)
    .map((p) => p[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();
  const idx = [...clean].reduce((sum, ch) => sum + ch.charCodeAt(0), 0) % AVATAR_TONES.length;
  return (
    <div
      className={`rounded-full flex items-center justify-center font-display font-semibold text-[12px] shrink-0 ${TONES[AVATAR_TONES[idx]].chip}`}
      style={{ width: size, height: size }}
      aria-hidden="true"
    >
      {initials}
    </div>
  );
}

export function StatTile({ icon: Icon, label, value, format, sublabel, tone = "navy" }) {
  return (
    <motion.div variants={fadeUp}>
      <Surface className="p-4 h-full">
        <span className={`w-9 h-9 rounded-xl flex items-center justify-center ${TONES[tone].chip}`}>
          <Icon size={17} strokeWidth={2.1} />
        </span>
        <p className="mt-3 text-[11.5px] font-medium text-navy-400 truncate">{label}</p>
        <p className="mt-0.5 font-display font-bold text-[22px] leading-tight text-navy-900 truncate tabular-nums">
          <AnimatedNumber value={Number(value) || 0} format={format} />
        </p>
        <p className="text-[11px] text-navy-400 mt-0.5 truncate min-h-[16px]">{sublabel || "\u00A0"}</p>
      </Surface>
    </motion.div>
  );
}

/* ───────── hand-built SVG sparkline ───────── */

function buildPath(points) {
  if (points.length < 2) return "";
  let d = `M ${points[0][0]} ${points[0][1]}`;
  for (let i = 1; i < points.length; i++) {
    const [x0, y0] = points[i - 1];
    const [x1, y1] = points[i];
    const mx = (x0 + x1) / 2;
    d += ` C ${mx} ${y0}, ${mx} ${y1}, ${x1} ${y1}`;
  }
  return d;
}

export function Sparkline({ values = [], width = 160, height = 56, stroke = "#ffffff", className = "" }) {
  const reduce = useReducedMotion();
  const gradId = useId().replace(/:/g, "");
  const pad = 4;
  const max = Math.max(...values, 0);
  const hasData = values.length > 1 && max > 0;
  const stepX = values.length > 1 ? (width - pad * 2) / (values.length - 1) : 0;
  const points = values.map((v, i) => [
    pad + i * stepX,
    hasData ? height - pad - (v / max) * (height - pad * 2) : height - pad - 6
  ]);
  const line = buildPath(points);
  const area = line ? `${line} L ${points[points.length - 1][0]} ${height} L ${points[0][0]} ${height} Z` : "";
  const last = points[points.length - 1];

  return (
    <svg viewBox={`0 0 ${width} ${height}`} className={className} fill="none" aria-hidden="true">
      <defs>
        <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={stroke} stopOpacity="0.28" />
          <stop offset="100%" stopColor={stroke} stopOpacity="0" />
        </linearGradient>
      </defs>
      {area && (
        <motion.path
          d={area}
          fill={`url(#${gradId})`}
          initial={reduce ? false : { opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.8, delay: 0.5 }}
        />
      )}
      {line && (
        <motion.path
          d={line}
          stroke={stroke}
          strokeWidth="2"
          strokeLinecap="round"
          strokeDasharray={hasData ? undefined : "3 5"}
          strokeOpacity={hasData ? 1 : 0.45}
          initial={reduce ? false : { pathLength: 0 }}
          animate={{ pathLength: 1 }}
          transition={{ duration: 1.1, ease: "easeOut" }}
        />
      )}
      {hasData && last && (
        <motion.circle
          cx={last[0]}
          cy={last[1]}
          r="3.5"
          fill={stroke}
          initial={reduce ? false : { scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          transition={{ delay: 1, type: "spring", stiffness: 300, damping: 18 }}
          style={{ transformOrigin: `${last[0]}px ${last[1]}px` }}
        />
      )}
    </svg>
  );
}

/* ───────── progress ring ───────── */

export function ProgressRing({ percent = 0, size = 64, stroke = 6, display, className = "" }) {
  const reduce = useReducedMotion();
  const r = (size - stroke) / 2;
  const clamped = Math.max(0, Math.min(100, Number(percent) || 0));
  return (
    <div className={`relative shrink-0 ${className}`} style={{ width: size, height: size }}>
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90" aria-hidden="true">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" strokeWidth={stroke} className="stroke-navy-100" />
        <motion.circle
          cx={size / 2}
          cy={size / 2}
          r={r}
          fill="none"
          strokeWidth={stroke}
          strokeLinecap="round"
          className="stroke-emerald-500"
          initial={reduce ? false : { pathLength: 0 }}
          animate={{ pathLength: clamped / 100 }}
          transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}
        />
      </svg>
      <span className="absolute inset-0 flex items-center justify-center text-[13px] font-display font-bold text-navy-900 tabular-nums">
        {display !== undefined ? display : `${Math.round(clamped)}%`}
      </span>
    </div>
  );
}

/* ───────── empty state + skeleton ───────── */

export function EmptyState({ title, description }) {
  return (
    <div className="flex flex-col items-center text-center py-5 px-2">
      <svg viewBox="0 0 120 84" className="w-24 h-[67px]" fill="none" aria-hidden="true">
        <ellipse cx="60" cy="76" rx="34" ry="4" className="fill-navy-100/70" />
        <rect x="22" y="12" width="76" height="52" rx="12" className="fill-white stroke-navy-200" strokeWidth="1.5" />
        <rect x="34" y="26" width="30" height="4" rx="2" className="fill-navy-100" />
        <rect x="34" y="36" width="46" height="4" rx="2" className="fill-navy-100" />
        <rect x="34" y="46" width="22" height="4" rx="2" className="fill-navy-100" />
        <circle cx="86" cy="52" r="13" className="fill-emerald-50 stroke-emerald-300" strokeWidth="1.5" />
        <path d="M80 52.5 L84.5 57 L92 47.5" className="stroke-emerald-500" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <p className="mt-2 text-sm font-semibold text-navy-800">{title}</p>
      {description && <p className="mt-0.5 text-xs text-navy-400 max-w-[15rem] leading-relaxed">{description}</p>}
    </div>
  );
}

const Bone = ({ className = "" }) => <div className={`animate-pulse rounded-2xl bg-navy-100/60 ${className}`} />;

export function GymSkeleton() {
  return (
    <div className="space-y-4" aria-busy="true" aria-label="Loading gym overview">
      <Bone className="h-52" />
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
        {[0, 1, 2, 3].map((i) => <Bone key={i} className="h-28" />)}
      </div>
      <Bone className="h-24" />
      <Bone className="h-64" />
    </div>
  );
}
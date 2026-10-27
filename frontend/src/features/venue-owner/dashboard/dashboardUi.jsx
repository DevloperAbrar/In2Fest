import React, { useId } from "react";
import { Link } from "react-router-dom";
import { motion, useReducedMotion } from "framer-motion";
import { ChevronRight } from "lucide-react";
import { useCountUp } from "../../../hooks/useCountUp";
import { TONES, fadeUp } from "./dashboardTheme.js";

const AVATAR_TONES = ["red", "sky", "emerald", "amber", "violet", "navy"];

/* ───────────────────────── small pieces ───────────────────────── */

export function Surface({ className = "", children, ...rest }) {
  return (
    <div className={`bg-white rounded-2xl border border-navy-100/70 shadow-card ${className}`} {...rest}>
      {children}
    </div>
  );
}

export function SectionHeader({ title, to, actionLabel = "View all" }) {
  return (
    <div className="flex items-center justify-between mb-3">
      <h2 className="font-display font-semibold text-[15px] text-navy-900">{title}</h2>
      {to && (
        <Link
          to={to}
          className="tap-scale inline-flex items-center gap-0.5 text-xs font-semibold text-primary-600 hover:text-primary-700"
        >
          {actionLabel} <ChevronRight size={14} />
        </Link>
      )}
    </div>
  );
}

export function AnimatedNumber({ value = 0, format = (v) => Math.round(v).toLocaleString("en-IN") }) {
  const current = useCountUp(value);
  return <>{format(current)}</>;
}

export function InitialsAvatar({ name = "?", size = 38 }) {
  const clean = String(name || "?").trim();
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
  const isNumber = typeof value === "number";
  return (
    <motion.div variants={fadeUp}>
      <Surface className="p-4 h-full">
        <div className="flex items-center justify-between">
          <span className={`w-9 h-9 rounded-xl flex items-center justify-center ${TONES[tone].chip}`}>
            <Icon size={17} strokeWidth={2.1} />
          </span>
        </div>
        <p className="mt-3 text-[11.5px] font-medium text-navy-400 truncate">{label}</p>
        <p className="mt-0.5 font-display font-bold text-[21px] leading-tight text-navy-900 truncate tabular-nums">
          {isNumber ? <AnimatedNumber value={value} format={format} /> : value}
        </p>
        {sublabel && <p className="text-[11px] text-navy-400 mt-0.5 truncate">{sublabel}</p>}
      </Surface>
    </motion.div>
  );
}

/* ───────────────────────── sparkline (hand-built SVG) ───────────────────────── */

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

/* ───────────────────────── empty-state illustrations ───────────────────────── */

export function EmptyArt({ kind = "calendar" }) {
  if (kind === "chat") {
    return (
      <svg viewBox="0 0 120 96" className="w-28 h-24" fill="none" aria-hidden="true">
        <ellipse cx="60" cy="88" rx="38" ry="4" className="fill-navy-100/70" />
        <rect x="14" y="10" width="64" height="38" rx="12" className="fill-white stroke-navy-200" strokeWidth="1.5" />
        <path d="M30 48 L26 60 L42 48 Z" className="fill-white stroke-navy-200" strokeWidth="1.5" strokeLinejoin="round" />
        <rect x="26" y="22" width="40" height="4" rx="2" className="fill-navy-100" />
        <rect x="26" y="32" width="26" height="4" rx="2" className="fill-navy-100" />
        <rect x="52" y="44" width="56" height="34" rx="12" className="fill-primary-50 stroke-primary-200" strokeWidth="1.5" />
        <path d="M92 78 L98 88 L84 78 Z" className="fill-primary-50 stroke-primary-200" strokeWidth="1.5" strokeLinejoin="round" />
        <circle cx="68" cy="61" r="3" className="fill-primary-400" />
        <circle cx="80" cy="61" r="3" className="fill-primary-300" />
        <circle cx="92" cy="61" r="3" className="fill-primary-200" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 120 96" className="w-28 h-24" fill="none" aria-hidden="true">
      <ellipse cx="60" cy="88" rx="38" ry="4" className="fill-navy-100/70" />
      <rect x="20" y="14" width="80" height="66" rx="12" className="fill-white stroke-navy-200" strokeWidth="1.5" />
      <path d="M20 34 H100 V26 a12 12 0 0 0 -12 -12 H32 a12 12 0 0 0 -12 12 Z" className="fill-navy-50 stroke-navy-200" strokeWidth="1.5" strokeLinejoin="round" />
      <rect x="36" y="8" width="5" height="14" rx="2.5" className="fill-navy-300" />
      <rect x="79" y="8" width="5" height="14" rx="2.5" className="fill-navy-300" />
      {[0, 1, 2, 3].map((c) =>
        [0, 1].map((r) => (
          <circle key={`${c}-${r}`} cx={36 + c * 16} cy={48 + r * 16} r="3" className="fill-navy-100" />
        ))
      )}
      <circle cx="84" cy="64" r="13" className="fill-emerald-50 stroke-emerald-300" strokeWidth="1.5" />
      <path d="M78 64.5 L82.5 69 L90 59.5" className="stroke-emerald-500" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}

export function DashEmpty({ kind, title, description }) {
  return (
    <div className="flex flex-col items-center text-center py-6 px-2">
      <EmptyArt kind={kind} />
      <p className="mt-2 text-sm font-semibold text-navy-800">{title}</p>
      {description && <p className="mt-1 text-xs text-navy-400 max-w-[15rem] leading-relaxed">{description}</p>}
    </div>
  );
}

/* ───────────────────────── loading skeleton ───────────────────────── */

const Bone = ({ className = "" }) => <div className={`animate-pulse rounded-2xl bg-navy-100/60 ${className}`} />;

export function DashboardSkeleton() {
  return (
    <div className="space-y-4" aria-busy="true" aria-label="Loading dashboard">
      <Bone className="h-48 md:h-52" />
      <div className="grid grid-cols-4 gap-3">
        {[0, 1, 2, 3].map((i) => <Bone key={i} className="h-20" />)}
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {[0, 1, 2, 3].map((i) => <Bone key={i} className="h-28" />)}
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <Bone className="h-64 lg:col-span-2" />
        <Bone className="h-64" />
      </div>
    </div>
  );
}

/* ───────────────────────── progress ring ───────────────────────── */

export function ProgressRing({ percent = 0, size = 52, stroke = 5, label = true, className = "" }) {
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
          className="stroke-primary-600"
          initial={reduce ? false : { pathLength: 0 }}
          animate={{ pathLength: clamped / 100 }}
          transition={{ duration: 1, ease: [0.22, 1, 0.36, 1] }}
        />
      </svg>
      {label && (
        <span className="absolute inset-0 flex items-center justify-center text-[11.5px] font-display font-bold text-navy-800 tabular-nums">
          {Math.round(clamped)}%
        </span>
      )}
    </div>
  );
}
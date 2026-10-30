import React, { useEffect, useRef, useState } from "react";
import { NavLink, useLocation } from "react-router-dom";
import { motion, useReducedMotion } from "framer-motion";
import { LayoutGrid, Users, Ticket, Dumbbell, UserPlus, MessageCircle, ShoppingBag, Settings, Clock } from "lucide-react";
import DashboardLayout from "../../../components/layout/DashboardLayout.jsx";
import { ownerSidebarItems } from "../ownerSidebarItems.js";
import { useAuth } from "../../../context/AuthContext";
import { gymService } from "../../../services/gymService";
import Modal from "../../../components/common/Modal";
import Button from "../../../components/common/Button";
import Loader from "../../../components/common/Loader";
import { showSuccess, showError } from "../../../components/common/Toast";
import { isDemoMode } from "../../../lib/demoMode";

export const inr = (n) => `₹${Number(n || 0).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
export const todayISO = () => new Date(Date.now() + 330 * 60000).toISOString().slice(0, 10);
export const fmtDate = (d) =>
  d ? new Date(`${d}T00:00:00`).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "-";
export const errMsg = (e, fallback = "Something went wrong") => e?.response?.data?.message || fallback;

const opts = (pairs) => pairs.map(([value, label]) => ({ value, label }));
export const GOALS = opts([["fat_loss", "Fat loss"], ["muscle_gain", "Muscle gain"], ["strength", "Strength"], ["flexibility", "Flexibility"], ["endurance", "Endurance"], ["general_fitness", "General fitness"], ["rehab", "Rehab"], ["other", "Other"]]);
export const MODES = opts([["cash", "Cash"], ["upi", "UPI"], ["card", "Card"], ["bank_transfer", "Bank transfer"], ["other", "Other"]]);
export const BODY_PART_GROUPS = [
  { key: "chest", label: "Chest", parts: ["chest"] },
  { key: "back", label: "Back", parts: ["back", "lower_back", "traps"] },
  { key: "shoulders", label: "Shoulders", parts: ["shoulders", "neck"] },
  { key: "arms", label: "Arms", parts: ["biceps", "triceps", "forearms", "arms"] },
  { key: "legs", label: "Legs", parts: ["quads", "hamstrings", "glutes", "calves", "hips", "legs"] },
  { key: "core", label: "Core", parts: ["core", "obliques"] },
  { key: "cardio", label: "Cardio", parts: ["cardio"] },
  { key: "full_body", label: "Full body", parts: ["full_body"] }
];
// "arms" and "legs" are old values kept only so old data still opens. New plans use the specific muscle.
export const BODY_PARTS = BODY_PART_GROUPS.flatMap((g) => g.parts).filter((p) => p !== "arms" && p !== "legs");
export const waUrl = (phone, text) => `https://wa.me/${isDemoMode() ? "" : phone}?text=${encodeURIComponent(text)}`;
/* ---------- download / copy / share (all from the vendor's own device) ---------- */
export function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    const ta = document.createElement("textarea");
    ta.value = text;
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand("copy");
    ta.remove();
    return ok;
  }
}

// Opens the phone's own share sheet when available, otherwise copies to the clipboard.
export async function shareContent({ title, text }) {
  if (navigator.share) {
    try {
      await navigator.share({ title, text });
      return "shared";
    } catch (e) {
      if (e && e.name === "AbortError") return "cancelled";
    }
  }
  return (await copyText(text)) ? "copied" : "failed";
}

const STATUS = {
  active: { label: "Active", cls: "bg-emerald-50 text-emerald-700 ring-emerald-200/70", dot: "bg-emerald-500" },
  expiring: { label: "Expiring", cls: "bg-amber-50 text-amber-700 ring-amber-200/70", dot: "bg-amber-500" },
  expired: { label: "Expired", cls: "bg-red-50 text-red-700 ring-red-200/70", dot: "bg-red-500" },
  frozen: { label: "Frozen", cls: "bg-sky-50 text-sky-700 ring-sky-200/70", dot: "bg-sky-500" },
  new: { label: "No plan", cls: "bg-navy-50 text-navy-600 ring-navy-200/70", dot: "bg-navy-300" }
};

export function StatusPill({ status, daysLeft }) {
  const s = STATUS[status] || STATUS.new;
  let extra = "";
  if (status === "expiring") extra = daysLeft === 0 ? " · today" : ` · ${daysLeft}d`;
  if (status === "expired" && daysLeft != null) extra = ` · ${Math.abs(daysLeft)}d ago`;
  return (
    <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11.5px] font-medium whitespace-nowrap ring-1 ring-inset ${s.cls}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${s.dot}`} />
      {s.label}{extra}
    </span>
  );
}

export function Field({ label, children }) {
  return (
    <label className="block">
      <span className="block text-[13px] font-medium text-navy-700 mb-1.5">{label}</span>
      {children}
    </label>
  );
}

export const TextArea = ({ className = "", ...p }) => (
  <textarea rows={3} {...p} className={`w-full px-3.5 py-2.5 border border-navy-200 rounded-xl text-sm text-navy-900 placeholder:text-navy-300 focus:outline-none focus:ring-2 focus:ring-primary-500/40 focus:border-primary-400 ${className}`} />
);

/*
  Ready-made text for a member. Mount it only when needed:  {msg && <MessageModal key=... />}
  `types` = [{ key, label }] shows switch chips; otherwise pass params={{ type, payment_id | plan_id }}.
*/
export function MessageModal({ onClose, vid, memberId, title = "Message", types, params = {} }) {
  const [type, setType] = useState(types ? types[0].key : params.type);
  const [text, setText] = useState("");
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let off = false;
    setLoading(true);
    setError("");
    gymService.message(vid, memberId, { ...params, type })
      .then((r) => { if (!off) { setText(r.data.data.text); setPhone(r.data.data.phone || ""); } })
      .catch((e) => { if (!off) { setText(""); setError(errMsg(e, "Could not prepare the message")); } })
      .finally(() => { if (!off) setLoading(false); });
    return () => { off = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [type, memberId, params.payment_id, params.plan_id]);

  const copy = async () => (await copyText(text)) ? showSuccess("Copied") : showError("Could not copy");
  const whatsapp = () => {
    window.open(waUrl(phone, text), "_blank", "noopener");
    gymService.msgSent(vid, { items: [{ type: "member", id: memberId }], label: title }).catch(() => {});
  };

  return (
    <Modal isOpen onClose={onClose} title={title} size="md">
      <div className="space-y-3">
        {types && types.length > 1 && (
          <div className="flex flex-wrap gap-1.5">
            {types.map((t) => (
              <button key={t.key} onClick={() => setType(t.key)}
                className={`tap-scale px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${type === t.key ? "bg-navy-900 text-white border-navy-900" : "text-navy-600 border-navy-200 hover:bg-navy-50"}`}>{t.label}</button>
            ))}
          </div>
        )}
        {loading ? <Loader /> : error ? <p className="text-sm text-red-600">{error}</p> : (
          <textarea rows={8} value={text} onChange={(e) => setText(e.target.value)}
            className="w-full px-3.5 py-2.5 border border-navy-200 rounded-xl text-sm text-navy-900 focus:outline-none focus:ring-2 focus:ring-primary-500/40 focus:border-primary-400" />
        )}
        <p className="text-xs text-navy-400">You can edit the text. Tap WhatsApp to open this member's chat, then press send from your own phone.</p>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={copy} disabled={!text}>Copy</Button>
          <Button onClick={whatsapp} disabled={!text || !phone}>WhatsApp</Button>
        </div>
      </div>
    </Modal>
  );
}

const TAB_DEFS = [
  { to: "/dashboard/gym", label: "Overview", icon: LayoutGrid, end: true },
  { to: "/dashboard/gym/members", label: "Members", icon: Users },
  { to: "/dashboard/gym/plans", label: "Plans", icon: Ticket },
  { to: "/dashboard/gym/shifts", label: "Shifts", icon: Clock },
  { to: "/dashboard/gym/workouts", label: "Workouts", icon: Dumbbell },
  { to: "/dashboard/gym/leads", label: "Leads", icon: UserPlus },
  { to: "/dashboard/gym/messages", label: "Messages", icon: MessageCircle },
  { to: "/dashboard/gym/store", label: "Store", icon: ShoppingBag }
];
const SETTINGS_TAB = { to: "/dashboard/gym/settings", label: "Settings", icon: Settings };

export function GymTabs() {
  const { user } = useAuth();
  const { pathname } = useLocation();
  const reduce = useReducedMotion();
  const rowRef = useRef(null);
  const tabs = user?.role !== "team_member" || user?.isDemo ? [...TAB_DEFS, SETTINGS_TAB] : TAB_DEFS;

  // Keep the active tab in view on small screens.
  useEffect(() => {
    const el = rowRef.current?.querySelector('[aria-current="page"]');
    if (el?.scrollIntoView) el.scrollIntoView({ inline: "center", block: "nearest", behavior: reduce ? "auto" : "smooth" });
  }, [pathname, reduce]);

  return (
    <nav aria-label="Gym sections" className="mb-5 bg-white border border-navy-100/70 shadow-card rounded-2xl p-1">
      <div
        ref={rowRef}
        className="flex gap-1 overflow-x-auto [&::-webkit-scrollbar]:hidden"
        style={{ scrollbarWidth: "none" }}
      >
        {tabs.map(({ to, label, icon: Icon, end }) => (
          <NavLink
            key={to}
            to={to}
            end={!!end}
            className={({ isActive }) =>
              `tap-scale relative flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-[13px] font-medium whitespace-nowrap transition-colors ${
                isActive ? "text-white" : "text-navy-500 hover:text-navy-800 hover:bg-navy-50"
              }`
            }
          >
            {({ isActive }) => (
              <>
                {isActive && (
                  <motion.span
                    layoutId="gym-tab-pill"
                    className="absolute inset-0 rounded-xl bg-navy-900 shadow-sm"
                    transition={reduce ? { duration: 0 } : { type: "spring", stiffness: 420, damping: 34 }}
                  />
                )}
                <Icon size={15} strokeWidth={2.1} className="relative" />
                <span className="relative">{label}</span>
              </>
            )}
          </NavLink>
        ))}
      </div>
    </nav>
  );
}

export function GymPage({ title, subtitle, actions, children }) {
  const reduce = useReducedMotion();
  return (
    <DashboardLayout sidebarItems={ownerSidebarItems} pageTitle="Gym">
      <div className="flex items-start justify-between gap-3 mb-4">
        <div className="min-w-0">
          <h1 className="font-display text-xl font-bold text-navy-900 truncate">{title}</h1>
          {subtitle && <p className="text-[13px] text-navy-400 mt-0.5">{subtitle}</p>}
        </div>
        <div className="flex gap-2 flex-shrink-0">{actions}</div>
      </div>
      <GymTabs />
      <motion.div
        initial={reduce ? false : { opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
      >
        {children}
      </motion.div>
    </DashboardLayout>
  );
}
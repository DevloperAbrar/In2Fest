import React, { useEffect, useState } from "react";
import { NavLink } from "react-router-dom";
import DashboardLayout from "../../../components/layout/DashboardLayout.jsx";
import { ownerSidebarItems } from "../ownerSidebarItems.js";
import { useAuth } from "../../../context/AuthContext";
import { gymService } from "../../../services/gymService";
import Modal from "../../../components/common/Modal";
import Button from "../../../components/common/Button";
import Loader from "../../../components/common/Loader";
import { showSuccess, showError } from "../../../components/common/Toast";

export const inr = (n) => `₹${Number(n || 0).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
export const todayISO = () => new Date(Date.now() + 330 * 60000).toISOString().slice(0, 10);
export const fmtDate = (d) =>
  d ? new Date(`${d}T00:00:00`).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "-";
export const errMsg = (e, fallback = "Something went wrong") => e?.response?.data?.message || fallback;

const opts = (pairs) => pairs.map(([value, label]) => ({ value, label }));
export const GOALS = opts([["fat_loss", "Fat loss"], ["muscle_gain", "Muscle gain"], ["strength", "Strength"], ["flexibility", "Flexibility"], ["endurance", "Endurance"], ["general_fitness", "General fitness"], ["rehab", "Rehab"], ["other", "Other"]]);
export const MODES = opts([["cash", "Cash"], ["upi", "UPI"], ["card", "Card"], ["bank_transfer", "Bank transfer"], ["other", "Other"]]);
export const BODY_PARTS = ["chest", "back", "legs", "shoulders", "arms", "core", "cardio", "full_body"];

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
  active: { label: "Active", cls: "bg-green-100 text-green-700" },
  expiring: { label: "Expiring", cls: "bg-amber-100 text-amber-700" },
  expired: { label: "Expired", cls: "bg-red-100 text-red-700" },
  frozen: { label: "Frozen", cls: "bg-sky-100 text-sky-700" },
  new: { label: "No plan", cls: "bg-gray-100 text-gray-600" }
};

export function StatusPill({ status, daysLeft }) {
  const s = STATUS[status] || STATUS.new;
  let extra = "";
  if (status === "expiring") extra = daysLeft === 0 ? " · today" : ` · ${daysLeft}d`;
  if (status === "expired" && daysLeft != null) extra = ` · ${Math.abs(daysLeft)}d ago`;
  return <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-medium whitespace-nowrap ${s.cls}`}>{s.label}{extra}</span>;
}

export function Field({ label, children }) {
  return (
    <label className="block">
      <span className="block text-sm font-medium text-gray-700 mb-1">{label}</span>
      {children}
    </label>
  );
}

export const TextArea = ({ className = "", ...p }) => (
  <textarea rows={3} {...p} className={`w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 ${className}`} />
);

/*
  Ready-made text for a member. Mount it only when needed:  {msg && <MessageModal key=... />}
  `types` = [{ key, label }] shows switch chips; otherwise pass params={{ type, payment_id | plan_id }}.
*/
export function MessageModal({ onClose, vid, memberId, title = "Message", types, params = {} }) {
  const [type, setType] = useState(types ? types[0].key : params.type);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let off = false;
    setLoading(true);
    setError("");
    gymService.message(vid, memberId, { ...params, type })
      .then((r) => { if (!off) setText(r.data.data.text); })
      .catch((e) => { if (!off) { setText(""); setError(errMsg(e, "Could not prepare the message")); } })
      .finally(() => { if (!off) setLoading(false); });
    return () => { off = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [type, memberId, params.payment_id, params.plan_id]);

  const copy = async () => (await copyText(text)) ? showSuccess("Copied") : showError("Could not copy");
  const share = async () => {
    const r = await shareContent({ title, text });
    if (r === "copied") showSuccess("Copied");
    if (r === "failed") showError("Could not share");
  };

  return (
    <Modal isOpen onClose={onClose} title={title} size="md">
      <div className="space-y-3">
        {types && types.length > 1 && (
          <div className="flex flex-wrap gap-1.5">
            {types.map((t) => (
              <button key={t.key} onClick={() => setType(t.key)}
                className={`px-3 py-1 rounded-full text-xs border ${type === t.key ? "bg-primary-600 text-white border-primary-600" : "text-gray-600"}`}>{t.label}</button>
            ))}
          </div>
        )}
        {loading ? <Loader /> : error ? <p className="text-sm text-red-500">{error}</p> : (
          <textarea rows={8} value={text} onChange={(e) => setText(e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
        )}
        <p className="text-xs text-gray-500">You can edit the text. Copy or share it from your own phone. Nothing is sent from here.</p>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={copy} disabled={!text}>Copy</Button>
          <Button onClick={share} disabled={!text}>Share</Button>
        </div>
      </div>
    </Modal>
  );
}

export function GymTabs() {
  const { user } = useAuth();
  const tabs = [
    ["/dashboard/gym", "Overview", true], ["/dashboard/gym/members", "Members"], ["/dashboard/gym/plans", "Plans"],
    ["/dashboard/gym/workouts", "Workouts"], ["/dashboard/gym/leads", "Leads"]
  ];
  if (user?.role !== "team_member") tabs.push(["/dashboard/gym/settings", "Settings"]);
  return (
    <div className="flex gap-1 mb-5 bg-gray-100 p-1 rounded-xl overflow-x-auto">
      {tabs.map(([to, label, end]) => (
        <NavLink key={to} to={to} end={!!end}
          className={({ isActive }) => `px-4 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap ${isActive ? "bg-white shadow text-gray-900" : "text-gray-500"}`}>
          {label}
        </NavLink>
      ))}
    </div>
  );
}

export function GymPage({ title, subtitle, actions, children }) {
  return (
    <DashboardLayout sidebarItems={ownerSidebarItems} pageTitle="Gym">
      <div className="flex items-start justify-between gap-3 mb-4">
        <div>
          <h1 className="text-lg font-semibold text-gray-900">{title}</h1>
          {subtitle && <p className="text-sm text-gray-500 mt-0.5">{subtitle}</p>}
        </div>
        <div className="flex gap-2 flex-shrink-0">{actions}</div>
      </div>
      <GymTabs />
      {children}
    </DashboardLayout>
  );
}
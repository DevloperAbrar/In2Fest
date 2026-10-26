import React, { useState } from "react";
import { X, CheckCircle2 } from "lucide-react";
import api from "../../../services/api";

const GOALS = [["fat_loss", "Fat loss"], ["muscle_gain", "Muscle gain"], ["strength", "Strength"], ["flexibility", "Flexibility"], ["general_fitness", "General fitness"]];
const TIMES = ["Morning (5-9 AM)", "Late morning (9-12)", "Afternoon (12-4)", "Evening (4-8 PM)", "Night (8-11 PM)"];

export default function FreeTrialModal({ venueId, theme = "#16a34a", onClose }) {
  const [f, setF] = useState({ name: "", phone: "", goal: "", preferred_time: "", website: "" });
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState("");
  const set = (k) => (e) => setF((s) => ({ ...s, [k]: e.target.value }));

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      await api.post(`/public/gym/${venueId}/trial`, f);
      setDone(true);
    } catch (err) {
      setError(err.response?.data?.message || "Something went wrong. Please try again.");
    } finally { setBusy(false); }
  };

  const input = "w-full px-3 py-2.5 border border-stone-300 dark:border-stone-600 rounded-xl text-sm bg-white dark:bg-stone-800 text-stone-900 dark:text-white focus:outline-none focus:ring-2";

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/50 sm:p-4" onClick={onClose}>
      <div className="bg-white dark:bg-stone-900 w-full sm:max-w-md rounded-t-3xl sm:rounded-2xl p-6 shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-stone-900 dark:text-white">Get membership details</h3>
          <button onClick={onClose} className="text-stone-400"><X size={20} /></button>
        </div>
        {done ? (
          <div className="text-center py-6">
            <CheckCircle2 size={44} className="mx-auto mb-3" style={{ color: theme }} />
            <p className="font-semibold text-stone-900 dark:text-white">Thanks! We'll call you shortly.</p>
          </div>
        ) : (
          <form onSubmit={submit} className="space-y-3">
            <p className="text-sm text-stone-500 dark:text-stone-400 -mt-2 mb-1">Share your details and our team will call you back with plans and timings.</p>
            <input className={input} placeholder="Your name" required value={f.name} onChange={set("name")} />
            <input className={input} placeholder="Mobile number" inputMode="numeric" maxLength={10} required value={f.phone} onChange={set("phone")} />
            <select className={input} value={f.goal} onChange={set("goal")}>
              <option value="">Your goal (optional)</option>
              {GOALS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
            </select>
            <select className={input} value={f.preferred_time} onChange={set("preferred_time")}>
              <option value="">Preferred time (optional)</option>
              {TIMES.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
            {/* honeypot: real users never see or fill this */}
            <input className="hidden" tabIndex={-1} autoComplete="off" value={f.website} onChange={set("website")} />
            {error && <p className="text-sm text-red-500">{error}</p>}
            <button type="submit" disabled={busy} className="w-full py-3 rounded-xl text-white font-bold disabled:opacity-60" style={{ backgroundColor: theme }}>
              {busy ? "Sending…" : "Request a call back"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}
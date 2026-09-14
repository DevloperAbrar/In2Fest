import React, { useState, useRef } from "react";
import { X, Calendar, ChevronDown } from "lucide-react";
import { inquiryApi } from "../../lib/api";
import GoogleSignInButton from "./GoogleSignInButton";

const EVENT_TYPES = [
  "Wedding", "Engagement", "Reception", "Birthday Party",
  "Anniversary", "Baby Shower", "Corporate Event",
  "Sangeet", "Haldi", "Mehendi", "Other",
];

export default function InquiryModal({ venue, onClose }) {
  const [step, setStep] = useState("form"); // "form" | "google" | "done"
  const [form, setForm] = useState({
    customer_name: "", phone: "", email: "",
    event_date: "", event_type: "", guest_count: "", message: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const dateRef = useRef(null);

  // Only allow digits, max 10
  const handlePhoneChange = (e) => {
    const digits = e.target.value.replace(/\D/g, "").slice(0, 10);
    setForm({ ...form, phone: digits });
  };

  // Called when user clicks "Continue with Google"
  const goToGoogle = () => {
    setError("");
    if (!form.customer_name.trim()) { setError("Please enter your name."); return; }
    if (form.phone && form.phone.length !== 10) { setError("Phone number must be exactly 10 digits."); return; }
    setStep("google");
  };

  // Called after Google returns a credential (ID token)
  const handleGoogleSuccess = async (credential) => {
    setError("");
    setLoading(true);
    try {
      await inquiryApi.post(`/venues/${venue.id}/inquiries/marketplace`, {
        ...form,
        google_credential: credential,
      });
      setStep("done");
    } catch (err) {
      const msg = err?.response?.data?.message || "Something went wrong. Please try again.";
      setError(msg);
      setStep("form");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleError = (msg) => {
    setError(msg || "Google sign-in failed. Please try again.");
    setStep("form");
  };

  const formatDate = (val) =>
    val ? new Date(val + "T00:00:00").toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" }) : "";

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-xl w-full max-w-md p-5 relative" onClick={(e) => e.stopPropagation()}>
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-400"><X size={20} /></button>

        {/* ── STEP 1: Form ── */}
        {step === "form" && (
          <div className="space-y-3">
            <h3 className="font-semibold text-gray-800 mb-2">Send Inquiry to {venue.hall_name}</h3>

            <input
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              placeholder="Your name *"
              value={form.customer_name}
              onChange={(e) => setForm({ ...form, customer_name: e.target.value })}
            />

            {/* Phone — digits only, max 10 */}
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm text-gray-500 select-none">+91</span>
              <input
                className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-lg text-sm"
                placeholder="10-digit mobile (optional)"
                inputMode="numeric"
                value={form.phone}
                onChange={handlePhoneChange}
              />
              {form.phone.length > 0 && (
                <span className={`absolute right-3 top-1/2 -translate-y-1/2 text-xs ${form.phone.length === 10 ? "text-green-500" : "text-gray-400"}`}>
                  {form.phone.length}/10
                </span>
              )}
            </div>

            {/* DATE FIELD */}
            <div
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm flex items-center gap-2 cursor-pointer"
              onClick={() => dateRef.current?.showPicker()}
            >
              <Calendar size={14} className="text-gray-400 shrink-0" />
              <span className={form.event_date ? "text-gray-800" : "text-gray-400"}>
                {form.event_date ? formatDate(form.event_date) : "Event date"}
              </span>
              {form.event_date && (
                <button type="button" className="ml-auto text-gray-400 hover:text-gray-600"
                  onClick={(e) => { e.stopPropagation(); setForm({ ...form, event_date: "" }); }}>
                  <X size={14} />
                </button>
              )}
              <input ref={dateRef} type="date" className="sr-only"
                value={form.event_date} onChange={(e) => setForm({ ...form, event_date: e.target.value })} />
            </div>

            {/* EVENT TYPE */}
            <div className="relative">
              <select
                className="w-full px-3 py-2 pr-8 border border-gray-300 rounded-lg text-sm bg-white appearance-none text-gray-800"
                value={form.event_type} onChange={(e) => setForm({ ...form, event_type: e.target.value })}>
                <option value="" disabled>Event type</option>
                {EVENT_TYPES.map((type) => <option key={type} value={type}>{type}</option>)}
              </select>
              <ChevronDown size={16} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            </div>

            <input type="number" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" placeholder="Guest count"
              value={form.guest_count} onChange={(e) => setForm({ ...form, guest_count: e.target.value })} />

            <textarea rows={3} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" placeholder="Message"
              value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} />

            {error && <p className="text-xs text-red-500">{error}</p>}

            <button onClick={goToGoogle}
              className="w-full bg-primary-600 text-white text-sm py-2 rounded-lg hover:bg-primary-700 transition-colors">
              Continue with Google →
            </button>
            <p className="text-xs text-center text-gray-400">We use Google to verify your identity — no SMS needed.</p>
          </div>
        )}

        {/* ── STEP 2: Google Sign-In ── */}
        {step === "google" && (
          <div className="space-y-4">
            <h3 className="font-semibold text-gray-800 text-center">Verify with Google</h3>
            <p className="text-sm text-gray-500 text-center">
              Sign in with your Google account to send the inquiry to <strong>{venue.hall_name}</strong>.
            </p>

            {loading ? (
              <p className="text-sm text-center text-gray-500 py-4">Submitting your inquiry…</p>
            ) : (
              <GoogleSignInButton
                onSuccess={handleGoogleSuccess}
                onError={handleGoogleError}
                text="continue_with"
              />
            )}

            {error && <p className="text-xs text-red-500 text-center">{error}</p>}

            <button onClick={() => { setError(""); setStep("form"); }}
              className="w-full text-sm text-gray-500 hover:text-gray-700 underline text-center">
              ← Go back
            </button>
          </div>
        )}

        {/* ── STEP 3: Done ── */}
        {step === "done" && (
          <div className="text-center py-6">
            <div className="text-4xl mb-3">✅</div>
            <p className="font-semibold text-gray-800">Inquiry sent!</p>
            <p className="text-sm text-gray-500 mt-1">{venue.hall_name} will get back to you shortly.</p>
            <button onClick={onClose} className="mt-4 text-primary-600 text-sm hover:underline">Close</button>
          </div>
        )}
      </div>
    </div>
  );
}
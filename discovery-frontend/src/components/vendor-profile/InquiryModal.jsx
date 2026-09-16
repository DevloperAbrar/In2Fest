import React, { useState, useRef, useEffect, useCallback } from "react";
import { X, Calendar, ChevronDown, Clock, Loader2, CheckCircle2, Info } from "lucide-react";
import api, { inquiryApi } from "../../lib/api";
import GoogleSignInButton from "./GoogleSignInButton";

const EVENT_TYPES = [
  "Wedding", "Engagement", "Reception", "Birthday Party",
  "Anniversary", "Baby Shower", "Corporate Event",
  "Sangeet", "Haldi", "Mehendi", "Other",
];

function fmt(t) {
  if (!t) return "";
  const [h, m] = String(t).split(":");
  const hr = parseInt(h, 10);
  return `${hr % 12 || 12}:${m} ${hr >= 12 ? "PM" : "AM"}`;
}

export default function InquiryModal({ venue, onClose, initialDate = "" }) {
  const [step, setStep] = useState("form"); // "form" | "google" | "done"
  const [form, setForm] = useState({
    customer_name: "", phone: "", email: "",
    event_date: initialDate, event_type: "", guest_count: "", message: "",
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const dateRef = useRef(null);

  // Availability for the selected date + which slots the customer picked
  const [daySlots, setDaySlots] = useState([]);      // all slots/packages available that day
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [slotsError, setSlotsError] = useState(false);
  const [selectedSlots, setSelectedSlots] = useState([]); // [{slot_id, slot_name, ...}]

  // Only allow digits, max 10
  const handlePhoneChange = (e) => {
    const digits = e.target.value.replace(/\D/g, "").slice(0, 10);
    setForm({ ...form, phone: digits });
  };

  // Whenever the event date changes, fetch that day's slot/package
  // availability so the customer can pick exactly what they need.
  const fetchDayAvailability = useCallback((dateStr) => {
    if (!venue?.id || !dateStr) { setDaySlots([]); return; }
    setSlotsLoading(true);
    setSlotsError(false);
    api.get(`/vendor-availability/${venue.id}`, { params: { from: dateStr, to: dateStr } })
      .then(({ data }) => {
        const day = data?.data?.days?.[0];
        const slots = (day?.slots || []).map((s) => ({ ...s, _kind: "slot" }));
        const packages = (day?.packages || []).map((p) => ({ ...p, _kind: "package" }));
        setDaySlots([...slots, ...packages]);
      })
      .catch(() => setSlotsError(true))
      .finally(() => setSlotsLoading(false));
  }, [venue?.id]);

  useEffect(() => {
    if (form.event_date) fetchDayAvailability(form.event_date);
    else setDaySlots([]);
    // Clear previous selections whenever the date changes - a slot picked
    // for one date shouldn't silently carry over to another.
    setSelectedSlots([]);
  }, [form.event_date, fetchDayAvailability]);

  const toggleSlot = (item) => {
    if (item.is_fully_booked) return;
    const key = item._kind === "slot" ? item.slot_id : item.package_id;
    const isSelected = selectedSlots.some((s) => s.key === key);
    if (isSelected) {
      setSelectedSlots(selectedSlots.filter((s) => s.key !== key));
      return;
    }
    setSelectedSlots([
      ...selectedSlots,
      item._kind === "slot"
        ? {
            key,
            slot_id: item.slot_id,
            slot_name: item.slot_name,
            service_type: item.service_type || null,
            start_time: item.start_time,
            end_time: item.end_time,
            kind: "slot",
          }
        : {
            key,
            package_id: item.package_id,
            slot_name: item.package_name,
            kind: "package",
          },
    ]);
  };

  // Called when user clicks "Continue with Google"
  const goToGoogle = () => {
    setError("");
    if (!form.customer_name.trim()) { setError("Please enter your name."); return; }
    if (form.phone && form.phone.length !== 10) { setError("Phone number must be exactly 10 digits."); return; }
    if (form.event_date && daySlots.length > 0 && selectedSlots.length === 0) {
      setError("Please select at least one service/slot for your date.");
      return;
    }
    setStep("google");
  };

  // Called after Google returns a credential (ID token)
  const handleGoogleSuccess = async (credential) => {
    setError("");
    setLoading(true);
    try {
      await inquiryApi.post(`/venues/${venue.id}/inquiries/marketplace`, {
        ...form,
        selected_slots: selectedSlots.map(({ key, ...rest }) => rest),
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
      <div className="bg-white rounded-xl w-full max-w-md p-5 relative max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
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

            {/* SLOT / SERVICE PICKER — shown once a date is chosen */}
            {form.event_date && (
              <div className="border border-gray-200 rounded-lg p-3 bg-gray-50">
                <p className="text-xs font-semibold text-gray-600 mb-2">
                  What do you need on {formatDate(form.event_date)}?
                </p>

                {slotsLoading ? (
                  <div className="flex items-center justify-center py-4 text-gray-400">
                    <Loader2 size={16} className="animate-spin" />
                  </div>
                ) : slotsError ? (
                  <p className="text-xs text-gray-400 py-2">Could not load availability for this date.</p>
                ) : daySlots.length === 0 ? (
                  <p className="text-xs text-gray-400 py-2">No specific slots configured - we'll check availability for you.</p>
                ) : (
                  <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                    {daySlots.map((item) => {
                      const key = item._kind === "slot" ? item.slot_id : item.package_id;
                      const name = item._kind === "slot" ? item.slot_name : item.package_name;
                      const isSelected = selectedSlots.some((s) => s.key === key);
                      const disabled = item.is_fully_booked;

                      return (
                        <button
                          type="button"
                          key={key}
                          disabled={disabled}
                          onClick={() => toggleSlot(item)}
                          className={[
                            "w-full text-left rounded-lg border px-3 py-2 transition-colors",
                            disabled
                              ? "border-gray-200 bg-gray-100 opacity-60 cursor-not-allowed"
                              : isSelected
                              ? "border-primary-500 bg-primary-50"
                              : "border-gray-200 bg-white hover:border-primary-300",
                          ].join(" ")}
                        >
                          <div className="flex items-center justify-between gap-2">
                            <div className="flex items-center gap-2 min-w-0">
                              <span className={[
                                "flex items-center justify-center w-4 h-4 rounded border shrink-0",
                                isSelected ? "bg-primary-600 border-primary-600" : "border-gray-300 bg-white",
                              ].join(" ")}>
                                {isSelected && <CheckCircle2 size={12} className="text-white" />}
                              </span>
                              <span className="text-sm font-medium text-gray-800 truncate">{name}</span>
                            </div>
                            <span className={[
                              "shrink-0 text-[10px] font-bold px-2 py-0.5 rounded-full",
                              disabled ? "bg-red-100 text-red-600" : "bg-green-100 text-green-700",
                            ].join(" ")}>
                              {disabled ? "Full" : `${item.available} free`}
                            </span>
                          </div>

                          {item._kind === "slot" && (
                            <div className="flex items-center gap-1 mt-1 text-[11px] text-gray-500">
                              <Clock size={10} />
                              {item.start_time && item.end_time
                                ? `${fmt(item.start_time)} – ${fmt(item.end_time)}`
                                : "Available all day"}
                            </div>
                          )}
                        </button>
                      );
                    })}
                  </div>
                )}

                {selectedSlots.length > 0 && (
                  <p className="text-[11px] text-primary-700 mt-2 flex items-center gap-1">
                    <Info size={11} /> {selectedSlots.length} selected — you can pick more than one.
                  </p>
                )}
              </div>
            )}

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

            {selectedSlots.length > 0 && (
              <div className="flex flex-wrap gap-1.5 justify-center">
                {selectedSlots.map((s) => (
                  <span key={s.key} className="text-[11px] font-medium bg-primary-50 text-primary-700 px-2 py-1 rounded-full">
                    {s.slot_name}
                  </span>
                ))}
              </div>
            )}

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
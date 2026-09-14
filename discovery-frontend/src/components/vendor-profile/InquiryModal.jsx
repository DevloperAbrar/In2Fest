import React, { useState, useRef } from "react";
import { X, Calendar, ChevronDown } from "lucide-react";
import { otpApi, inquiryApi } from "../../lib/api";

const EVENT_TYPES = [
  "Wedding", "Engagement", "Reception", "Birthday Party",
  "Anniversary", "Baby Shower", "Corporate Event",
  "Sangeet", "Haldi", "Mehendi", "Other",
];

export default function InquiryModal({ venue, onClose }) {
  const [step, setStep] = useState("form");
  const [form, setForm] = useState({
    customer_name: "", phone: "", email: "",
    event_date: "", event_type: "", guest_count: "", message: "",
  });
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const dateRef = useRef(null);

  const requestOtp = async () => {
    setError("");
    if (!form.phone || !form.customer_name) { setError("Name and phone are required"); return; }
    setLoading(true);
    try {
      await otpApi.post("/request", { phone: form.phone });
      setStep("otp");
    } catch { setError("Could not send OTP. Try again."); }
    finally { setLoading(false); }
  };

  const verifyAndSubmit = async () => {
    setError("");
    setLoading(true);
    try {
      const { data } = await otpApi.post("/verify", { phone: form.phone, otp });
      const token = data.data.token;
      await inquiryApi.post(`/venues/${venue.id}/inquiries/marketplace`, { ...form, otp_token: token });
      setStep("done");
    } catch { setError("Invalid OTP or something went wrong. Try again."); }
    finally { setLoading(false); }
  };

  const formatDate = (val) =>
    val ? new Date(val + "T00:00:00").toLocaleDateString("en-IN", { day: "numeric", month: "long", year: "numeric" }) : "";

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-xl w-full max-w-md p-5 relative" onClick={(e) => e.stopPropagation()}>
        <button onClick={onClose} className="absolute top-4 right-4 text-gray-400"><X size={20} /></button>

        {step === "form" && (
          <div className="space-y-3">
            <h3 className="font-semibold text-gray-800 mb-2">Send Inquiry to {venue.hall_name}</h3>

            <input className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" placeholder="Your name"
              value={form.customer_name} onChange={(e) => setForm({ ...form, customer_name: e.target.value })} />

            <input className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" placeholder="Phone number"
              value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} />

            <input className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" placeholder="Email (optional)"
              value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} />

            {/* DATE FIELD — click the styled row to open picker */}
            <div
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm flex items-center gap-2 cursor-pointer"
              onClick={() => dateRef.current?.showPicker()}
            >
              <Calendar size={14} className="text-gray-400 shrink-0" />
              <span className={form.event_date ? "text-gray-800" : "text-gray-400"}>
                {form.event_date ? formatDate(form.event_date) : "Event date"}
              </span>
              {form.event_date && (
                <button
                  type="button"
                  className="ml-auto text-gray-400 hover:text-gray-600"
                  onClick={(e) => { e.stopPropagation(); setForm({ ...form, event_date: "" }); }}
                >
                  <X size={14} />
                </button>
              )}
              {/* Hidden real input — only used to open native picker */}
              <input
                ref={dateRef}
                type="date"
                className="sr-only"
                value={form.event_date}
                onChange={(e) => setForm({ ...form, event_date: e.target.value })}
              />
            </div>

            {/* EVENT TYPE DROPDOWN */}
            <div className="relative">
              <select
                className="w-full px-3 py-2 pr-8 border border-gray-300 rounded-lg text-sm bg-white appearance-none text-gray-800"
                value={form.event_type}
                onChange={(e) => setForm({ ...form, event_type: e.target.value })}
              >
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

            <button disabled={loading} onClick={requestOtp}
              className="w-full bg-primary-600 text-white text-sm py-2 rounded-lg disabled:opacity-50">
              {loading ? "Sending OTP..." : "Verify Phone & Send"}
            </button>
          </div>
        )}

        {step === "otp" && (
          <div className="space-y-3">
            <h3 className="font-semibold text-gray-800">Enter the OTP sent to {form.phone}</h3>
            <input className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm tracking-widest text-center"
              maxLength={6} value={otp} onChange={(e) => setOtp(e.target.value)} placeholder="6-digit OTP" />
            {error && <p className="text-xs text-red-500">{error}</p>}
            <button disabled={loading} onClick={verifyAndSubmit}
              className="w-full bg-primary-600 text-white text-sm py-2 rounded-lg disabled:opacity-50">
              {loading ? "Submitting..." : "Verify & Submit Inquiry"}
            </button>
          </div>
        )}

        {step === "done" && (
          <div className="text-center py-6">
            <p className="font-semibold text-gray-800">Inquiry sent!</p>
            <p className="text-sm text-gray-500 mt-1">{venue.hall_name} will get back to you shortly.</p>
            <button onClick={onClose} className="mt-4 text-primary-600 text-sm">Close</button>
          </div>
        )}
      </div>
    </div>
  );
}
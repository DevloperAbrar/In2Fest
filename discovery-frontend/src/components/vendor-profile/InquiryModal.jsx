import React, { useState } from "react";
import { X } from "lucide-react";
import { otpApi, inquiryApi } from "../../lib/api";

export default function InquiryModal({ venue, onClose }) {
  const [step, setStep] = useState("form"); // form -> otp -> done
  const [form, setForm] = useState({ customer_name: "", phone: "", email: "", event_date: "", event_type: "", guest_count: "", message: "" });
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const requestOtp = async () => {
    setError("");
    if (!form.phone || !form.customer_name) { setError("Name and phone are required"); return; }
    setLoading(true);
    try {
      await otpApi.post("/request", { phone: form.phone });
      setStep("otp");
    } catch {
      setError("Could not send OTP. Try again.");
    } finally {
      setLoading(false);
    }
  };

  const verifyAndSubmit = async () => {
    setError("");
    setLoading(true);
    try {
      const { data } = await otpApi.post("/verify", { phone: form.phone, otp });
      const token = data.data.token;
      await inquiryApi.post(`/venues/${venue.id}/inquiries/marketplace`, { ...form, otp_token: token });
      setStep("done");
    } catch {
      setError("Invalid OTP or something went wrong. Try again.");
    } finally {
      setLoading(false);
    }
  };

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
            <input type="date" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              value={form.event_date} onChange={(e) => setForm({ ...form, event_date: e.target.value })} />
            <input className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" placeholder="Event type (e.g. Wedding)"
              value={form.event_type} onChange={(e) => setForm({ ...form, event_type: e.target.value })} />
            <input type="number" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" placeholder="Guest count"
              value={form.guest_count} onChange={(e) => setForm({ ...form, guest_count: e.target.value })} />
            <textarea rows={3} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" placeholder="Message"
              value={form.message} onChange={(e) => setForm({ ...form, message: e.target.value })} />
            {error && <p className="text-xs text-red-500">{error}</p>}
            <button disabled={loading} onClick={requestOtp} className="w-full bg-primary-600 text-white text-sm py-2 rounded-lg disabled:opacity-50">
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
            <button disabled={loading} onClick={verifyAndSubmit} className="w-full bg-primary-600 text-white text-sm py-2 rounded-lg disabled:opacity-50">
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
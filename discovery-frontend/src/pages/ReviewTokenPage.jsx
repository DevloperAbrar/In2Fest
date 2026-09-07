import React, { useState } from "react";
import { useParams } from "react-router-dom";
import { Star } from "lucide-react";
import reviewApi from "../services/reviewApi";

export default function ReviewTokenPage() {
  const { token } = useParams();
  const [form, setForm] = useState({ reviewer_name: "", event_type: "", event_date: "", star_rating: 5, review_text: "" });
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async () => {
    setError("");
    if (!form.reviewer_name || !form.star_rating) { setError("Please fill in your name and rating"); return; }
    setLoading(true);
    try {
      await reviewApi.post(`/token/${token}`, form);
      setSubmitted(true);
    } catch (err) {
      setError(err.response?.data?.message || "This review link is invalid or has already been used");
    } finally {
      setLoading(false);
    }
  };

  if (submitted) {
    return (
      <div className="max-w-md mx-auto px-4 py-20 text-center">
        <h1 className="text-xl font-bold text-gray-800 mb-2">Thank you!</h1>
        <p className="text-sm text-gray-500">Your review has been submitted.</p>
      </div>
    );
  }

  return (
    <div className="max-w-md mx-auto px-4 py-12">
      <h1 className="text-xl font-bold text-gray-800 mb-1">Share your experience</h1>
      <p className="text-sm text-gray-500 mb-6">Your review helps other customers make the right choice.</p>

      <div className="space-y-3">
        <input className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" placeholder="Your name"
          value={form.reviewer_name} onChange={(e) => setForm({ ...form, reviewer_name: e.target.value })} />
        <input className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" placeholder="Event type"
          value={form.event_type} onChange={(e) => setForm({ ...form, event_type: e.target.value })} />
        <input type="date" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
          value={form.event_date} onChange={(e) => setForm({ ...form, event_date: e.target.value })} />
        <div className="flex gap-1">
          {Array.from({ length: 5 }, (_, i) => (
            <button key={i} onClick={() => setForm({ ...form, star_rating: i + 1 })}>
              <Star size={26} className={i < form.star_rating ? "fill-amber-400 text-amber-400" : "text-gray-200"} />
            </button>
          ))}
        </div>
        <textarea rows={4} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" placeholder="Write your review"
          value={form.review_text} onChange={(e) => setForm({ ...form, review_text: e.target.value })} />
        {error && <p className="text-xs text-red-500">{error}</p>}
        <button disabled={loading} onClick={handleSubmit} className="w-full bg-primary-600 text-white text-sm py-2.5 rounded-lg disabled:opacity-50">
          {loading ? "Submitting..." : "Submit Review"}
        </button>
      </div>
    </div>
  );
}
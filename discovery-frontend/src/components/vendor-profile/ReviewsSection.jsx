import React, { useEffect, useState } from "react";
import { Star, X, ShieldCheck, BadgeCheck, MessageSquarePlus, Loader2 } from "lucide-react";
import reviewApi from "../../services/reviewApi";
import dayjs from "dayjs";
import GoogleSignInButton from "./GoogleSignInButton";
import { usePublicAuth } from "../../context/PublicAuthContext.jsx";

export default function ReviewsSection({ venueId }) {
  const [data, setData] = useState(null);
  const [showForm, setShowForm] = useState(false);

  const load = () => {
    reviewApi.get(`/venue/${venueId}`).then(({ data }) => setData(data.data));
  };

  useEffect(() => { load(); }, [venueId]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!data) return null;

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h2 className="font-semibold text-gray-800">
          Reviews {data.review_count > 0 && `(${data.review_count})`}
        </h2>
        <button
          onClick={() => setShowForm(true)}
          className="flex items-center gap-1.5 text-sm text-primary-600 hover:text-primary-700 font-medium"
        >
          <MessageSquarePlus size={16} /> Write a review
        </button>
      </div>

      {data.average_rating && (
        <div className="flex items-center gap-2 mb-4">
          <Star size={18} className="fill-amber-400 text-amber-400" />
          <span className="text-lg font-semibold text-gray-800">{data.average_rating}</span>
          <span className="text-sm text-gray-400">out of 5</span>
        </div>
      )}

      {data.response_rate_badge && (
        <p className="text-xs text-green-600 mb-4">{data.response_rate_badge}</p>
      )}

      <div className="space-y-4">
        {data.reviews.length === 0 && (
          <p className="text-sm text-gray-400">No reviews yet  - be the first to review this vendor.</p>
        )}
        {data.reviews.map((r) => (
          <div key={r.id} className="border-b border-gray-100 pb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <p className="font-medium text-gray-800 text-sm">{r.reviewer_name}</p>
                {r.reviewer_role && (
                  <ShieldCheck size={13} className="text-primary-500" aria-label="Verified reviewer" />
                )}
              </div>
              <div className="flex items-center gap-1">
                {Array.from({ length: 5 }, (_, i) => (
                  <Star key={i} size={13} className={i < r.star_rating ? "fill-amber-400 text-amber-400" : "text-gray-200"} />
                ))}
              </div>
            </div>
            <p className="text-xs text-gray-400 mb-1">
              {r.event_type} {r.event_date && `· ${dayjs(r.event_date).format("MMM YYYY")}`}
            </p>
            <p className="text-sm text-gray-600">{r.review_text}</p>
            {r.owner_reply && (
              <div className="mt-2 bg-gray-50 rounded-lg p-3 text-sm text-gray-600">
                <p className="font-medium text-gray-700 text-xs mb-1">Owner's reply</p>
                {r.owner_reply}
              </div>
            )}
          </div>
        ))}
      </div>

      {showForm && (
        <ReviewFormModal venueId={venueId} onClose={() => setShowForm(false)} onSubmitted={load} />
      )}
    </div>
  );
}

function ReviewFormModal({ venueId, onClose, onSubmitted }) {
  const { activeIdentity, login, refreshMe } = usePublicAuth();
  const [step, setStep] = useState(activeIdentity ? "form" : "auth");
  const [authLoading, setAuthLoading] = useState(false);
  const [form, setForm] = useState({ event_type: "", event_date: "", star_rating: 5, review_text: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const wordCount = form.review_text.trim().split(/\s+/).filter(Boolean).length;
  const formIsValid = wordCount >= 30;

  const handleGoogleAuth = async (credential) => {
    setError("");
    setAuthLoading(true);
    try {
      await login(credential);
      setStep("form");
    } catch (err) {
      setError(err.response?.data?.message || "Could not sign in with Google");
    } finally {
      setAuthLoading(false);
    }
  };

  const submitReview = async () => {
    setError("");
    setLoading(true);
    try {
      await reviewApi.post(
        "/submit",
        { venue_id: venueId, ...form },
        { headers: { Authorization: `Bearer ${activeIdentity.token}` } }
      );
      setStep("done");
      await refreshMe();
      onSubmitted();
    } catch (err) {
      setError(err.response?.data?.message || "Something went wrong, please try again");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-xl w-full max-w-md p-5" onClick={(e) => e.stopPropagation()}>
        {step === "auth" && (
          <div className="space-y-4 text-center py-2">
            <ShieldCheck size={36} className="mx-auto text-primary-500" />
            <div>
              <h3 className="font-semibold text-gray-800">Sign in to write a review</h3>
              <p className="text-sm text-gray-500 mt-1">
                We use Google Sign-In to keep reviews genuine  - no spam, no fake accounts.
              </p>
            </div>
            {error && <p className="text-xs text-red-500">{error}</p>}
            {authLoading ? (
              <div className="flex justify-center py-2"><Loader2 className="animate-spin text-gray-400" size={22} /></div>
            ) : (
              <GoogleSignInButton onSuccess={handleGoogleAuth} onError={(msg) => setError(msg)} />
            )}
            <button onClick={onClose} className="text-xs text-gray-400 hover:text-gray-600">Cancel</button>
          </div>
        )}

        {step === "form" && (
          <div className="space-y-3">
            <h3 className="font-semibold text-gray-800">Write a Review</h3>

            <div className="flex items-center gap-2 bg-gray-50 rounded-lg px-3 py-2">
              <span className="w-7 h-7 rounded-full bg-primary-600 text-white text-xs font-semibold flex items-center justify-center">
                {activeIdentity.name?.[0]?.toUpperCase()}
              </span>
              <span className="text-sm text-gray-700 flex-1 truncate">Reviewing as {activeIdentity.name}</span>
              {activeIdentity.type === "vendor" && (
                <span className="flex items-center gap-1 text-xs text-primary-700 bg-primary-50 border border-primary-100 px-2 py-0.5 rounded-full">
                  <BadgeCheck size={12} /> Vendor
                </span>
              )}
            </div>

            <input className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" placeholder="Event type (e.g. Wedding)"
              value={form.event_type} onChange={(e) => setForm({ ...form, event_type: e.target.value })} />
            <input type="date" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
              value={form.event_date} onChange={(e) => setForm({ ...form, event_date: e.target.value })} />
            <div className="flex gap-1">
              {Array.from({ length: 5 }, (_, i) => (
                <button key={i} onClick={() => setForm({ ...form, star_rating: i + 1 })}>
                  <Star size={22} className={i < form.star_rating ? "fill-amber-400 text-amber-400" : "text-gray-200"} />
                </button>
              ))}
            </div>
            <div>
              <textarea rows={4} className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                placeholder="Write your review (minimum 30 words)"
                value={form.review_text} onChange={(e) => setForm({ ...form, review_text: e.target.value })} />
              <p className={`text-xs mt-1 ${wordCount >= 30 ? "text-green-600" : "text-gray-400"}`}>{wordCount} / 30 words</p>
            </div>
            {error && <p className="text-xs text-red-500">{error}</p>}

            <button
              disabled={!formIsValid || loading}
              onClick={submitReview}
              className="w-full bg-primary-600 text-white text-sm py-2.5 rounded-lg disabled:opacity-50"
            >
              {loading ? "Submitting..." : "Submit Review"}
            </button>
          </div>
        )}

        {step === "done" && (
          <div className="text-center py-6">
            <ShieldCheck size={32} className="mx-auto text-green-500 mb-2" />
            <p className="font-semibold text-gray-800">Thanks for your review!</p>
            <p className="text-sm text-gray-500 mt-1">It's pending approval and will appear here once approved.</p>
            <button onClick={onClose} className="mt-4 text-primary-600 text-sm flex items-center gap-1 mx-auto">
              <X size={14} /> Close
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
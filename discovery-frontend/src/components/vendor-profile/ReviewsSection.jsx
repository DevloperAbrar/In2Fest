import React, { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import { motion } from "framer-motion";
import { Star, X, ShieldCheck, BadgeCheck, MessageSquarePlus, Loader2 } from "lucide-react";
import reviewApi from "../../services/reviewApi";
import dayjs from "dayjs";
import GoogleSignInButton from "./GoogleSignInButton";
import { usePublicAuth } from "../../context/PublicAuthContext.jsx";
import { SectionCard } from "./ProfileKit";

function Stars({ value, size = 14 }) {
  return (
    <span className="inline-flex items-center gap-0.5">
      {Array.from({ length: 5 }, (_, i) => (
        <Star
          key={i}
          size={size}
          className={i < Math.round(value) ? "fill-amber-400 text-amber-400" : "text-gray-200"}
        />
      ))}
    </span>
  );
}

function Distribution({ reviews }) {
  const counts = useMemo(() => {
    const c = { 5: 0, 4: 0, 3: 0, 2: 0, 1: 0 };
    reviews.forEach((r) => {
      const k = Math.min(5, Math.max(1, Number(r.star_rating) || 0));
      if (k) c[k] += 1;
    });
    return c;
  }, [reviews]);
  const total = reviews.length || 1;

  return (
    <div className="flex-1 space-y-1.5 min-w-0">
      {[5, 4, 3, 2, 1].map((n) => (
        <div key={n} className="flex items-center gap-2 text-xs text-gray-500">
          <span className="w-3 font-semibold">{n}</span>
          <Star size={11} className="fill-amber-400 text-amber-400 flex-shrink-0" />
          <div className="flex-1 h-2 rounded-full bg-gray-100 overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              whileInView={{ width: `${(counts[n] / total) * 100}%` }}
              viewport={{ once: true }}
              transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
              className="h-full rounded-full bg-gradient-to-r from-gold-500 to-gold-400"
            />
          </div>
          <span className="w-5 text-right tabular-nums">{counts[n]}</span>
        </div>
      ))}
    </div>
  );
}

function ReviewCard({ r }) {
  return (
    <div className="rounded-2xl border border-gray-100 bg-gray-50/60 p-4 md:p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <span className="w-10 h-10 rounded-full bg-gradient-to-br from-navy-600 to-navy-800 text-white text-sm font-bold flex items-center justify-center flex-shrink-0">
            {String(r.reviewer_name || "?")[0]?.toUpperCase()}
          </span>
          <div className="min-w-0">
            <p className="font-semibold text-navy-900 text-sm flex items-center gap-1.5 truncate">
              {r.reviewer_name}
              {r.reviewer_role && <ShieldCheck size={13} className="text-blue-500 flex-shrink-0" aria-label="Verified reviewer" />}
            </p>
            <p className="text-xs text-gray-400">
              {r.event_type}
              {r.event_type && r.event_date ? " · " : ""}
              {r.event_date && dayjs(r.event_date).format("MMM YYYY")}
            </p>
          </div>
        </div>
        <Stars value={r.star_rating} />
      </div>

      <p className="text-sm text-gray-600 leading-relaxed mt-3">{r.review_text}</p>

      {r.owner_reply && (
        <div className="mt-3 border-l-4 border-gold-500 bg-white rounded-r-xl px-4 py-3">
          <p className="font-semibold text-navy-800 text-xs mb-1">Reply from the owner</p>
          <p className="text-sm text-gray-600">{r.owner_reply}</p>
        </div>
      )}
    </div>
  );
}

export default function ReviewsSection({ venueId }) {
  const [data, setData] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [showAll, setShowAll] = useState(false);

  const load = () => {
    reviewApi
      .get(`/venue/${venueId}`)
      .then(({ data }) => setData(data.data))
      .catch(() => setData({ reviews: [], review_count: 0, average_rating: null }));
  };

  useEffect(() => { load(); }, [venueId]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!data) {
    return (
      <SectionCard id="sec-reviews" icon={Star} title="Reviews">
        <div className="space-y-3 animate-pulse">
          <div className="h-20 rounded-2xl bg-gray-100" />
          <div className="h-24 rounded-2xl bg-gray-100" />
        </div>
      </SectionCard>
    );
  }

  const reviews = data.reviews || [];
  const visible = showAll ? reviews : reviews.slice(0, 4);

  return (
    <SectionCard
      id="sec-reviews"
      icon={Star}
      title={`Reviews${data.review_count > 0 ? ` (${data.review_count})` : ""}`}
      subtitle="Only verified Google sign-ins can review, so it stays genuine."
      action={
        <button
          type="button"
          onClick={() => setShowForm(true)}
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-white bg-gradient-to-r from-accent-500 to-accent-600 px-4 py-2 rounded-xl shadow-md shadow-accent-500/20 hover:opacity-95 active:scale-[0.98] transition-all flex-shrink-0"
        >
          <MessageSquarePlus size={15} /> <span className="hidden sm:inline">Write a review</span>
          <span className="sm:hidden">Review</span>
        </button>
      }
    >
      {data.response_rate_badge && (
        <p className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 px-3 py-1.5 rounded-full mb-4">
          <ShieldCheck size={13} /> {data.response_rate_badge}
        </p>
      )}

      {reviews.length === 0 ? (
        <div className="text-center py-8 px-4 bg-gray-50 rounded-2xl">
          <div className="w-12 h-12 mx-auto rounded-2xl bg-gold-400/20 text-gold-600 flex items-center justify-center mb-3">
            <Star size={22} />
          </div>
          <p className="font-display font-bold text-navy-900">No reviews yet</p>
          <p className="text-sm text-gray-500 mt-1">Used this business? Be the first to share your experience.</p>
        </div>
      ) : (
        <>
          <div className="flex items-center gap-5 md:gap-8 mb-6 p-4 md:p-5 rounded-2xl bg-navy-50/60">
            {data.average_rating && (
              <div className="text-center flex-shrink-0">
                <p className="font-display font-extrabold text-5xl text-navy-900 leading-none">{data.average_rating}</p>
                <div className="mt-2"><Stars value={Number(data.average_rating)} size={15} /></div>
                <p className="text-xs text-gray-500 mt-1.5">{data.review_count} reviews</p>
              </div>
            )}
            <Distribution reviews={reviews} />
          </div>

          <div className="space-y-3">
            {visible.map((r) => <ReviewCard key={r.id} r={r} />)}
          </div>

          {reviews.length > 4 && (
            <button
              type="button"
              onClick={() => setShowAll((s) => !s)}
              className="mt-4 w-full py-2.5 rounded-xl border border-gray-200 text-sm font-semibold text-gray-600 hover:bg-gray-50 transition-colors"
            >
              {showAll ? "Show fewer reviews" : `Show all ${reviews.length} reviews`}
            </button>
          )}
        </>
      )}

      {showForm && (
        <ReviewFormModal venueId={venueId} onClose={() => setShowForm(false)} onSubmitted={load} />
      )}
    </SectionCard>
  );
}

const inputCls =
  "w-full px-3.5 py-2.5 border border-gray-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-navy-200 focus:border-navy-300";

function ReviewFormModal({ venueId, onClose, onSubmitted }) {
  const { activeIdentity, login, refreshMe } = usePublicAuth();
  const [step, setStep] = useState(activeIdentity ? "form" : "auth");
  const [authLoading, setAuthLoading] = useState(false);
  const [form, setForm] = useState({ event_type: "", event_date: "", star_rating: 5, review_text: "" });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const formIsValid = form.review_text.trim().length > 0;

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

  return createPortal(
    <div
      className="fixed inset-0 bg-navy-900/60 backdrop-blur-sm z-[90] flex items-end sm:items-center justify-center p-4"
      onClick={onClose}
    >
      <motion.div
        initial={{ y: 40, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.25 }}
        className="bg-white rounded-3xl w-full max-w-md p-6 shadow-2xl max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {step === "auth" && (
          <div className="space-y-4 text-center py-2">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-navy-50 text-navy-700 flex items-center justify-center">
              <ShieldCheck size={28} />
            </div>
            <div>
              <h3 className="font-display font-bold text-navy-900 text-lg">Sign in to write a review</h3>
              <p className="text-sm text-gray-500 mt-1">
                We use Google Sign-In to keep reviews genuine, with no spam and no fake accounts.
              </p>
            </div>
            {error && <p className="text-xs text-red-500">{error}</p>}
            {authLoading ? (
              <div className="flex justify-center py-2"><Loader2 className="animate-spin text-gray-400" size={22} /></div>
            ) : (
              <GoogleSignInButton onSuccess={handleGoogleAuth} onError={(msg) => setError(msg)} />
            )}
            <button type="button" onClick={onClose} className="text-xs text-gray-400 hover:text-gray-600">Cancel</button>
          </div>
        )}

        {step === "form" && (
          <div className="space-y-3.5">
            <h3 className="font-display font-bold text-navy-900 text-lg">Write a review</h3>

            <div className="flex items-center gap-2.5 bg-gray-50 rounded-xl px-3 py-2.5">
              <span className="w-8 h-8 rounded-full bg-navy-700 text-white text-xs font-bold flex items-center justify-center">
                {activeIdentity.name?.[0]?.toUpperCase()}
              </span>
              <span className="text-sm text-gray-700 flex-1 truncate">Reviewing as {activeIdentity.name}</span>
              {activeIdentity.type === "vendor" && (
                <span className="flex items-center gap-1 text-xs text-navy-700 bg-navy-50 border border-navy-100 px-2 py-0.5 rounded-full">
                  <BadgeCheck size={12} /> Vendor
                </span>
              )}
            </div>

            <div className="flex gap-1.5">
              {Array.from({ length: 5 }, (_, i) => (
                <button type="button" key={i} onClick={() => setForm({ ...form, star_rating: i + 1 })} aria-label={`${i + 1} stars`}>
                  <Star
                    size={30}
                    className={`transition-transform hover:scale-110 ${
                      i < form.star_rating ? "fill-amber-400 text-amber-400" : "text-gray-200"
                    }`}
                  />
                </button>
              ))}
            </div>

            <input
              className={inputCls}
              placeholder="What did you use? (e.g. Membership, Order, Event)"
              value={form.event_type}
              onChange={(e) => setForm({ ...form, event_type: e.target.value })}
            />
            <input
              type="date"
              className={inputCls}
              value={form.event_date}
              onChange={(e) => setForm({ ...form, event_date: e.target.value })}
            />
            <textarea
              rows={4}
              className={inputCls}
              placeholder="Share your experience"
              value={form.review_text}
              onChange={(e) => setForm({ ...form, review_text: e.target.value })}
            />
            {error && <p className="text-xs text-red-500">{error}</p>}

            <button
              type="button"
              disabled={!formIsValid || loading}
              onClick={submitReview}
              className="w-full text-white text-sm font-bold py-3 rounded-xl disabled:opacity-50 bg-gradient-to-r from-accent-500 to-accent-600"
            >
              {loading ? "Submitting..." : "Submit review"}
            </button>
          </div>
        )}

        {step === "done" && (
          <div className="text-center py-6">
            <div className="w-14 h-14 mx-auto rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center mb-3">
              <ShieldCheck size={28} />
            </div>
            <p className="font-display font-bold text-navy-900 text-lg">Thanks for your review!</p>
            <p className="text-sm text-gray-500 mt-1">It is pending approval and will appear here once approved.</p>
            <button type="button" onClick={onClose} className="mt-4 text-navy-700 text-sm font-semibold inline-flex items-center gap-1">
              <X size={14} /> Close
            </button>
          </div>
        )}
      </motion.div>
    </div>,
    document.body
  );
}
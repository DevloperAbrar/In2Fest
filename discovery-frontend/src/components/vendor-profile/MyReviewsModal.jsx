import React, { useEffect, useState } from "react";
import { Star, X, Pencil, Trash2, Loader2 } from "lucide-react";
import dayjs from "dayjs";
import reviewApi from "../../services/reviewApi";
import { usePublicAuth } from "../../context/PublicAuthContext.jsx";

const STATUS_STYLES = {
  pending: "bg-amber-50 text-amber-700 border border-amber-200",
  approved: "bg-green-50 text-green-700 border border-green-200",
  rejected: "bg-gray-100 text-gray-500 border border-gray-200"
};

export default function MyReviewsModal({ onClose }) {
  const { activeIdentity, refreshMe } = usePublicAuth();
  const [reviews, setReviews] = useState(null);
  const [editingId, setEditingId] = useState(null);
  const [draft, setDraft] = useState({ star_rating: 5, review_text: "" });
  const [busyId, setBusyId] = useState(null);
  const [error, setError] = useState("");

  const authHeaders = { headers: { Authorization: `Bearer ${activeIdentity?.token}` } };

  const load = () => {
    reviewApi.get("/mine", authHeaders).then(({ data }) => setReviews(data.data));
  };

  useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const startEdit = (r) => {
    setEditingId(r.id);
    setDraft({ star_rating: r.star_rating, review_text: r.review_text });
    setError("");
  };

  const saveEdit = async (id) => {
    const wordCount = draft.review_text.trim().split(/\s+/).filter(Boolean).length;
    if (wordCount < 30) { setError("Review must be at least 30 words"); return; }
    setBusyId(id);
    try {
      await reviewApi.put(`/${id}/mine`, draft, authHeaders);
      setEditingId(null);
      load();
    } catch (err) {
      setError(err.response?.data?.message || "Could not update review");
    } finally {
      setBusyId(null);
    }
  };

  const deleteReview = async (id) => {
    if (!window.confirm("Delete this review? This cannot be undone.")) return;
    setBusyId(id);
    try {
      await reviewApi.delete(`/${id}/mine`, authHeaders);
      await refreshMe();
      load();
    } catch (err) {
      setError(err.response?.data?.message || "Could not delete review");
    } finally {
      setBusyId(null);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-xl w-full max-w-lg max-h-[85vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-gray-100">
          <h3 className="font-semibold text-gray-800">My Reviews</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600"><X size={20} /></button>
        </div>

        <div className="overflow-y-auto p-5 space-y-4">
          {reviews === null && (
            <div className="flex justify-center py-10"><Loader2 className="animate-spin text-gray-300" size={24} /></div>
          )}

          {reviews?.length === 0 && (
            <p className="text-sm text-gray-400 text-center py-10">You haven't written any reviews yet.</p>
          )}

          {reviews?.map((r) => (
            <div key={r.id} className="border border-gray-100 rounded-lg p-4">
              <div className="flex items-center justify-between mb-1">
                <p className="font-medium text-gray-800 text-sm">{r.Venue?.hall_name || "Venue"}</p>
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full capitalize ${STATUS_STYLES[r.status]}`}>
                  {r.status}
                </span>
              </div>
              <p className="text-xs text-gray-400 mb-2">
                {r.event_type} {r.event_date && `· ${dayjs(r.event_date).format("MMM YYYY")}`}
              </p>

              {editingId === r.id ? (
                <div className="space-y-2">
                  <div className="flex gap-1">
                    {Array.from({ length: 5 }, (_, i) => (
                      <button key={i} onClick={() => setDraft({ ...draft, star_rating: i + 1 })}>
                        <Star size={20} className={i < draft.star_rating ? "fill-amber-400 text-amber-400" : "text-gray-200"} />
                      </button>
                    ))}
                  </div>
                  <textarea
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                    value={draft.review_text}
                    onChange={(e) => setDraft({ ...draft, review_text: e.target.value })}
                  />
                  {error && <p className="text-xs text-red-500">{error}</p>}
                  <div className="flex gap-2">
                    <button
                      disabled={busyId === r.id}
                      onClick={() => saveEdit(r.id)}
                      className="bg-primary-600 text-white text-xs px-3 py-1.5 rounded-lg disabled:opacity-50"
                    >
                      {busyId === r.id ? "Saving..." : "Save"}
                    </button>
                    <button onClick={() => setEditingId(null)} className="text-xs text-gray-500 px-3 py-1.5">Cancel</button>
                  </div>
                  <p className="text-xs text-gray-400">Editing sends your review back for re-approval.</p>
                </div>
              ) : (
                <>
                  <div className="flex gap-0.5 mb-1">
                    {Array.from({ length: 5 }, (_, i) => (
                      <Star key={i} size={13} className={i < r.star_rating ? "fill-amber-400 text-amber-400" : "text-gray-200"} />
                    ))}
                  </div>
                  <p className="text-sm text-gray-600 mb-3">{r.review_text}</p>
                  <div className="flex gap-2">
                    <button onClick={() => startEdit(r)} className="flex items-center gap-1 text-xs text-gray-600 hover:text-primary-600">
                      <Pencil size={13} /> Edit
                    </button>
                    <button
                      disabled={busyId === r.id}
                      onClick={() => deleteReview(r.id)}
                      className="flex items-center gap-1 text-xs text-red-600 hover:text-red-700"
                    >
                      <Trash2 size={13} /> Delete
                    </button>
                  </div>
                </>
              )}
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
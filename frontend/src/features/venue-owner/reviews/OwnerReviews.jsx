import React, { useState } from "react";
import DashboardLayout from "../../../components/layout/DashboardLayout.jsx";
import { ownerSidebarItems } from "../ownerSidebarItems.js";
import { useVenue } from "../../../context/VenueContext.jsx";
import { useFetch } from "../../../hooks/useFetch";
import Loader from "../../../components/common/Loader";
import Card from "../../../components/common/Card";
import ConfirmDialog from "../../../components/common/ConfirmDialog";
import { reviewService } from "../../../services/reviewService";
import { showSuccess, showError } from "../../../components/common/Toast";
import { Star, Trash2, Check, Pencil } from "lucide-react";
import dayjs from "dayjs";

const STATUS_STYLES = {
  pending: "bg-amber-50 text-amber-700 border border-amber-200",
  approved: "bg-green-50 text-green-700 border border-green-200",
  rejected: "bg-gray-100 text-gray-500 border border-gray-200"
};

function StatusBadge({ status }) {
  return (
    <span className={`text-xs font-medium px-2 py-0.5 rounded-full capitalize ${STATUS_STYLES[status] || STATUS_STYLES.pending}`}>
      {status}
    </span>
  );
}

export default function OwnerReviews() {
  const [tab, setTab] = useState("received"); // "received" | "given"

  return (
    <DashboardLayout sidebarItems={ownerSidebarItems} pageTitle="Reviews">
      <div className="flex gap-2 mb-6 border-b border-gray-100">
        <TabButton active={tab === "received"} onClick={() => setTab("received")}>Reviews on My Venue</TabButton>
        <TabButton active={tab === "given"} onClick={() => setTab("given")}>Reviews I've Given</TabButton>
      </div>

      {tab === "received" ? <ReceivedReviews /> : <GivenReviews />}
    </DashboardLayout>
  );
}

function TabButton({ active, onClick, children }) {
  return (
    <button
      onClick={onClick}
      className={`px-3 py-2 text-sm font-medium border-b-2 -mb-px transition-colors ${
        active ? "border-primary-600 text-primary-700" : "border-transparent text-gray-500 hover:text-gray-700"
      }`}
    >
      {children}
    </button>
  );
}

function ReceivedReviews() {
  const { venue, loading: venueLoading } = useVenue();
  const { data, loading, refetch } = useFetch(venue ? `/reviews/owner/${venue.id}` : null);
  const [replyDrafts, setReplyDrafts] = useState({});
  const [submitting, setSubmitting] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleting, setDeleting] = useState(false);

  if (venueLoading || loading) return <Loader fullScreen />;

  const submitReply = async (reviewId) => {
    const text = replyDrafts[reviewId];
    if (!text) return;
    setSubmitting(reviewId);
    try {
      await reviewService.reply(reviewId, text);
      showSuccess("Reply posted");
      await refetch();
    } catch (err) {
      showError(err.response?.data?.message || "Could not post reply");
    } finally {
      setSubmitting(null);
    }
  };

  const approveReview = async (reviewId) => {
    setSubmitting(reviewId);
    try {
      await reviewService.ownerApprove(reviewId);
      showSuccess("Review approved  - now visible on your public listing");
      await refetch();
    } catch (err) {
      showError(err.response?.data?.message || "Could not approve review");
    } finally {
      setSubmitting(null);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setDeleting(true);
    try {
      await reviewService.ownerDelete(deleteTarget.id);
      showSuccess("Review deleted");
      setDeleteTarget(null);
      await refetch();
    } catch (err) {
      showError(err.response?.data?.message || "Could not delete review");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <>
      {data?.average_rating && (
        <div className="flex items-center gap-2 mb-6">
          <Star size={22} className="fill-amber-400 text-amber-400" />
          <span className="text-2xl font-bold text-gray-800">{data.average_rating}</span>
          <span className="text-sm text-gray-400">from {data.review_count} approved reviews</span>
        </div>
      )}

      {(!data?.reviews || data.reviews.length === 0) ? (
        <p className="text-sm text-gray-400">No reviews yet.</p>
      ) : (
        <div className="space-y-4">
          {data.reviews.map((r) => (
            <Card key={r.id}>
              <div className="flex items-center justify-between mb-1">
                <div className="flex items-center gap-2">
                  <p className="font-medium text-gray-800">{r.reviewer_name}</p>
                  <StatusBadge status={r.status} />
                </div>
                <div className="flex gap-0.5">
                  {Array.from({ length: 5 }, (_, i) => (
                    <Star key={i} size={13} className={i < r.star_rating ? "fill-amber-400 text-amber-400" : "text-gray-200"} />
                  ))}
                </div>
              </div>
              <p className="text-xs text-gray-400 mb-2">
                {r.event_type} {r.event_date && `· ${dayjs(r.event_date).format("MMM D, YYYY")}`}
              </p>
              <p className="text-sm text-gray-600 mb-3">{r.review_text}</p>

              {r.owner_reply && (
                <div className="bg-gray-50 rounded-lg p-3 text-sm text-gray-600 mb-3">
                  <p className="font-medium text-gray-700 text-xs mb-1">Your reply</p>
                  {r.owner_reply}
                </div>
              )}

              <div className="flex items-center gap-2 flex-wrap">
                {r.status === "pending" && (
                  <button
                    disabled={submitting === r.id}
                    onClick={() => approveReview(r.id)}
                    className="flex items-center gap-1.5 bg-green-600 hover:bg-green-700 text-white text-sm px-3 py-1.5 rounded-lg disabled:opacity-50"
                  >
                    <Check size={14} /> Approve & Publish
                  </button>
                )}

                {!r.owner_reply && (
                  <div className="flex gap-2 flex-1 min-w-[200px]">
                    <input
                      className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm"
                      placeholder="Reply to this review..."
                      value={replyDrafts[r.id] || ""}
                      onChange={(e) => setReplyDrafts({ ...replyDrafts, [r.id]: e.target.value })}
                    />
                    <button
                      disabled={submitting === r.id}
                      onClick={() => submitReply(r.id)}
                      className="bg-primary-600 text-white text-sm px-4 rounded-lg disabled:opacity-50"
                    >
                      Reply
                    </button>
                  </div>
                )}

                <button
                  onClick={() => setDeleteTarget(r)}
                  className="flex items-center gap-1.5 text-red-600 hover:bg-red-50 text-sm px-3 py-1.5 rounded-lg ml-auto"
                >
                  <Trash2 size={14} /> Delete
                </button>
              </div>
            </Card>
          ))}
        </div>
      )}

      <ConfirmDialog
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={confirmDelete}
        title="Delete this review?"
        message={deleteTarget ? `This will permanently remove the review from ${deleteTarget.reviewer_name}. This cannot be undone.` : ""}
        confirmText="Delete"
        loading={deleting}
      />
    </>
  );
}

function GivenReviews() {
  const { data, loading, refetch } = useFetch("/reviews/given");
  const [editingId, setEditingId] = useState(null);
  const [draft, setDraft] = useState({ star_rating: 5, review_text: "" });
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [busy, setBusy] = useState(false);

  if (loading) return <Loader fullScreen />;

  const reviews = data || [];

  const startEdit = (r) => {
    setEditingId(r.id);
    setDraft({ star_rating: r.star_rating, review_text: r.review_text });
  };

  const saveEdit = async (id) => {
    const wordCount = draft.review_text.trim().split(/\s+/).filter(Boolean).length;
    if (wordCount < 30) { showError("Review must be at least 30 words"); return; }
    setBusy(true);
    try {
      await reviewService.updateGiven(id, draft);
      showSuccess("Review updated  - sent for re-approval");
      setEditingId(null);
      await refetch();
    } catch (err) {
      showError(err.response?.data?.message || "Could not update review");
    } finally {
      setBusy(false);
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) return;
    setBusy(true);
    try {
      await reviewService.deleteGiven(deleteTarget.id);
      showSuccess("Review deleted");
      setDeleteTarget(null);
      await refetch();
    } catch (err) {
      showError(err.response?.data?.message || "Could not delete review");
    } finally {
      setBusy(false);
    }
  };

  if (reviews.length === 0) {
    return <p className="text-sm text-gray-400">You haven't reviewed any other venues yet.</p>;
  }

  return (
    <>
      <div className="space-y-4">
        {reviews.map((r) => (
          <Card key={r.id}>
            <div className="flex items-center justify-between mb-1">
              <div className="flex items-center gap-2">
                <p className="font-medium text-gray-800">{r.Venue?.hall_name || "Venue"}</p>
                <StatusBadge status={r.status} />
              </div>
              <div className="flex gap-0.5">
                {Array.from({ length: 5 }, (_, i) => (
                  <Star key={i} size={13} className={i < r.star_rating ? "fill-amber-400 text-amber-400" : "text-gray-200"} />
                ))}
              </div>
            </div>
            <p className="text-xs text-gray-400 mb-2">
              {r.event_type} {r.event_date && `· ${dayjs(r.event_date).format("MMM D, YYYY")}`}
            </p>

            {editingId === r.id ? (
              <div className="space-y-2">
                <div className="flex gap-1">
                  {Array.from({ length: 5 }, (_, i) => (
                    <button key={i} onClick={() => setDraft({ ...draft, star_rating: i + 1 })}>
                      <Star size={18} className={i < draft.star_rating ? "fill-amber-400 text-amber-400" : "text-gray-200"} />
                    </button>
                  ))}
                </div>
                <textarea
                  rows={3}
                  className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
                  value={draft.review_text}
                  onChange={(e) => setDraft({ ...draft, review_text: e.target.value })}
                />
                <div className="flex gap-2">
                  <button disabled={busy} onClick={() => saveEdit(r.id)} className="bg-primary-600 text-white text-sm px-3 py-1.5 rounded-lg disabled:opacity-50">
                    Save
                  </button>
                  <button onClick={() => setEditingId(null)} className="text-sm text-gray-500 px-3 py-1.5">Cancel</button>
                </div>
              </div>
            ) : (
              <>
                <p className="text-sm text-gray-600 mb-3">{r.review_text}</p>
                <div className="flex items-center gap-2">
                  <button onClick={() => startEdit(r)} className="flex items-center gap-1.5 text-gray-600 hover:text-primary-600 text-sm px-3 py-1.5 rounded-lg">
                    <Pencil size={14} /> Edit
                  </button>
                  <button
                    onClick={() => setDeleteTarget(r)}
                    className="flex items-center gap-1.5 text-red-600 hover:bg-red-50 text-sm px-3 py-1.5 rounded-lg"
                  >
                    <Trash2 size={14} /> Delete
                  </button>
                </div>
              </>
            )}
          </Card>
        ))}
      </div>

      <ConfirmDialog
        isOpen={!!deleteTarget}
        onClose={() => setDeleteTarget(null)}
        onConfirm={confirmDelete}
        title="Delete this review?"
        message={deleteTarget ? `This will permanently remove your review of ${deleteTarget.Venue?.hall_name || "this venue"}.` : ""}
        confirmText="Delete"
        loading={busy}
      />
    </>
  );
}
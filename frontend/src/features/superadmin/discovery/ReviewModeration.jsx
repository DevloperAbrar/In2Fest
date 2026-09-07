import React from "react";
import DashboardLayout from "../../../components/layout/DashboardLayout.jsx";
import { adminSidebarItems } from "../adminSidebarItems.js";
import { useFetch } from "../../../hooks/useFetch";
import Loader from "../../../components/common/Loader";
import Card from "../../../components/common/Card";
import EmptyState from "../../../components/common/EmptyState";
import Button from "../../../components/common/Button";
import { adminDiscoveryService } from "../../../services/adminDiscoveryService";
import { showSuccess, showError } from "../../../components/common/Toast";
import { Star } from "lucide-react";

export default function ReviewModeration() {
  const { data: reviews, loading, refetch } = useFetch("/reviews/admin/pending");

  const approve = async (id) => {
    try { await adminDiscoveryService.approveReview(id); showSuccess("Review approved"); refetch(); }
    catch { showError("Could not approve"); }
  };
  const reject = async (id) => {
    try { await adminDiscoveryService.rejectReview(id); showSuccess("Review rejected"); refetch(); }
    catch { showError("Could not reject"); }
  };

  if (loading) return <DashboardLayout sidebarItems={adminSidebarItems} pageTitle="Review Moderation"><Loader fullScreen /></DashboardLayout>;

  return (
    <DashboardLayout sidebarItems={adminSidebarItems} pageTitle="Review Moderation">
      {(!reviews || reviews.length === 0) ? (
        <EmptyState title="No pending reviews" />
      ) : (
        <div className="space-y-4">
          {reviews.map((r) => (
            <Card key={r.id}>
              <div className="flex items-center justify-between mb-1">
                <p className="font-medium text-gray-800">{r.reviewer_name} <span className="text-gray-400 font-normal">→ {r.Venue?.hall_name}</span></p>
                <div className="flex gap-0.5">
                  {Array.from({ length: 5 }, (_, i) => (
                    <Star key={i} size={13} className={i < r.star_rating ? "fill-amber-400 text-amber-400" : "text-gray-200"} />
                  ))}
                </div>
              </div>
              <p className="text-xs text-gray-400 mb-2">{r.event_type} {r.event_date && `· ${r.event_date}`}</p>
              <p className="text-sm text-gray-600 mb-3">{r.review_text}</p>
              <div className="flex gap-2">
                <Button variant="primary" onClick={() => approve(r.id)}>Approve</Button>
                <Button variant="danger" onClick={() => reject(r.id)}>Reject</Button>
              </div>
            </Card>
          ))}
        </div>
      )}
    </DashboardLayout>
  );
}
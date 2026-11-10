import React, { useState } from "react";
import DashboardLayout from "../../../components/layout/DashboardLayout.jsx";
import { adminSidebarItems } from "../adminSidebarItems.js";
import { useFetch } from "../../../hooks/useFetch";
import Button from "../../../components/common/Button";
import Modal from "../../../components/common/Modal";
import ConfirmDialog from "../../../components/common/ConfirmDialog";
import Loader from "../../../components/common/Loader";
import PlanCard from "./PlanCard.jsx";
import PlanForm from "./PlanForm.jsx";
import { planService } from "../../../services/planService";
import { showSuccess, showError } from "../../../components/common/Toast";
import { Plus } from "lucide-react";

const FILTERS = [
  { key: "all", label: "All" },
  { key: "visible", label: "Visible" },
  { key: "hidden", label: "Hidden" }
];

export default function PlanList() {
  const { data: plans, loading, refetch } = useFetch("/plans");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState(null);
  const [deletingPlan, setDeletingPlan] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const [filter, setFilter] = useState("all");
  const [hidingPlan, setHidingPlan] = useState(null); // plan waiting for "Hide" confirmation
  const [togglingId, setTogglingId] = useState(null);

  const openCreate = () => { setEditingPlan(null); setModalOpen(true); };
  const openEdit = (plan) => { setEditingPlan(plan); setModalOpen(true); };
  const handleSaved = () => { setModalOpen(false); refetch(); };

  const handleDelete = async () => {
    setDeleting(true);
    try {
      await planService.remove(deletingPlan.id);
      showSuccess("Plan deleted");
      setDeletingPlan(null);
      refetch();
    } catch (err) {
      showError(err.response?.data?.message || "Failed to delete plan");
    } finally {
      setDeleting(false);
    }
  };

  const applyVisibility = async (plan, visible) => {
    setTogglingId(plan.id);
    try {
      await planService.setVisibility(plan.id, visible);
      showSuccess(visible ? `"${plan.name}" is visible to new vendors again` : `"${plan.name}" is hidden from new vendors`);
      setHidingPlan(null);
      refetch();
    } catch (err) {
      showError(err.response?.data?.message || "Could not change plan visibility");
      setHidingPlan(null);
    } finally {
      setTogglingId(null);
    }
  };

  // Hiding asks for confirmation. Unhiding is harmless, so it happens right away.
  const handleToggleVisibility = (plan) => {
    if (plan.is_active === false) {
      applyVisibility(plan, true);
    } else {
      setHidingPlan(plan);
    }
  };

  const allPlans = plans || [];
  const visibleCount = allPlans.filter((p) => p.is_active !== false).length;
  const hiddenCount = allPlans.length - visibleCount;
  const counts = { all: allPlans.length, visible: visibleCount, hidden: hiddenCount };

  const shownPlans = allPlans.filter((p) => {
    if (filter === "visible") return p.is_active !== false;
    if (filter === "hidden") return p.is_active === false;
    return true;
  });

  const hidingSubscribers = Number(hidingPlan?.subscriber_count) || 0;

  return (
    <DashboardLayout sidebarItems={adminSidebarItems} pageTitle="Plans">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2">
          {FILTERS.map((f) => (
            <button
              key={f.key}
              type="button"
              onClick={() => setFilter(f.key)}
              className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                filter === f.key
                  ? "bg-primary-600 text-white border-primary-600"
                  : "bg-white text-gray-600 border-gray-200 hover:border-primary-300"
              }`}
            >
              {f.label} ({counts[f.key]})
            </button>
          ))}
        </div>
        <Button onClick={openCreate}><Plus size={16} /> New Plan</Button>
      </div>

      <p className="text-xs text-gray-400 mb-4">
        Hidden plans are not shown to new vendors. Vendors already on a hidden plan keep their features,
        price and renewal exactly as before.
      </p>

      {loading ? (
        <Loader />
      ) : shownPlans.length === 0 ? (
        <p className="text-sm text-gray-400 py-10 text-center">No plans in this view.</p>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {shownPlans.map((plan) => (
            <PlanCard
              key={plan.id}
              plan={plan}
              onEdit={openEdit}
              onDelete={setDeletingPlan}
              onToggleVisibility={handleToggleVisibility}
              busy={togglingId === plan.id}
            />
          ))}
        </div>
      )}

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editingPlan ? "Edit Plan" : "New Plan"}>
        <PlanForm existingPlan={editingPlan} onSaved={handleSaved} onCancel={() => setModalOpen(false)} />
      </Modal>

      <ConfirmDialog
        isOpen={!!hidingPlan}
        onClose={() => setHidingPlan(null)}
        onConfirm={() => applyVisibility(hidingPlan, false)}
        title="Hide this plan from new vendors?"
        message={
          hidingSubscribers > 0
            ? `"${hidingPlan?.name}" will no longer be shown to new vendors. The ${hidingSubscribers} vendor(s) already on it are not affected: they keep their features and price and can still renew. You can unhide it any time.`
            : `"${hidingPlan?.name}" will no longer be shown to new vendors. You can unhide it any time.`
        }
        confirmText="Hide plan"
        loading={togglingId === hidingPlan?.id}
      />

      <ConfirmDialog
        isOpen={!!deletingPlan}
        onClose={() => setDeletingPlan(null)}
        onConfirm={handleDelete}
        title="Delete plan?"
        message={`Are you sure you want to delete "${deletingPlan?.name}"? This can't be undone. If vendors are on it, hide it instead.`}
        confirmText="Delete"
        loading={deleting}
      />
    </DashboardLayout>
  );
}
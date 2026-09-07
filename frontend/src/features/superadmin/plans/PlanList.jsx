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

export default function PlanList() {
  const { data: plans, loading, refetch } = useFetch("/plans");
  const [modalOpen, setModalOpen] = useState(false);
  const [editingPlan, setEditingPlan] = useState(null);
  const [deletingPlan, setDeletingPlan] = useState(null);
  const [deleting, setDeleting] = useState(false);

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

  return (
    <DashboardLayout sidebarItems={adminSidebarItems} pageTitle="Plans">
      <div className="flex justify-end mb-4">
        <Button onClick={openCreate}><Plus size={16} /> New Plan</Button>
      </div>

      {loading ? (
        <Loader />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {plans.map((plan) => (
            <PlanCard key={plan.id} plan={plan} onEdit={openEdit} onDelete={setDeletingPlan} />
          ))}
        </div>
      )}

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editingPlan ? "Edit Plan" : "New Plan"}>
        <PlanForm existingPlan={editingPlan} onSaved={handleSaved} onCancel={() => setModalOpen(false)} />
      </Modal>

      <ConfirmDialog
        isOpen={!!deletingPlan}
        onClose={() => setDeletingPlan(null)}
        onConfirm={handleDelete}
        title="Delete plan?"
        message={`Are you sure you want to delete "${deletingPlan?.name}"? This can't be undone.`}
        confirmText="Delete"
        loading={deleting}
      />
    </DashboardLayout>
  );
}
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import DashboardLayout from "../../../components/layout/DashboardLayout.jsx";
import { ownerSidebarItems } from "../ownerSidebarItems.js";
import { useVenue } from "../../../context/VenueContext.jsx";
import { useFetch } from "../../../hooks/useFetch";
import api from "../../../services/api";
import Button from "../../../components/common/Button";
import Modal from "../../../components/common/Modal";
import Loader from "../../../components/common/Loader";
import EmptyState from "../../../components/common/EmptyState";
import ConfirmDialog from "../../../components/common/ConfirmDialog";
import SlotForm from "./SlotForm.jsx";
import SlotCard from "./SlotCard.jsx";
import { showSuccess, showError } from "../../../components/common/Toast";
import { Plus, LayoutGrid, Info } from "lucide-react";
import { getSlotConfig, PRICING_TYPE_META } from "../../../config/slotCategories";

export default function SlotList() {
  const navigate = useNavigate();
  const { venue, refetchVenue } = useVenue();
  const { data: slots, loading, refetch } = useFetch(venue ? `/venues/${venue.id}/slots` : null, { skip: !venue });

  const [modalOpen, setModalOpen] = useState(false);
  const [editingSlot, setEditingSlot] = useState(null);
  const [deletingSlot, setDeletingSlot] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const categorySlug = venue?.business_category || "";
  const { allowedTypes } = getSlotConfig(categorySlug);
  const hasMultipleTypes = allowedTypes.length > 1;

  const openCreate = () => { setEditingSlot(null); setModalOpen(true); };
  const openEdit = (slot) => { setEditingSlot(slot); setModalOpen(true); };

  const handleSubmit = async (values) => {
    setSubmitting(true);
    try {
      if (editingSlot) {
        await api.patch(`/venues/${venue.id}/slots/${editingSlot.id}`, values);
        showSuccess("Slot updated");
      } else {
        await api.post(`/venues/${venue.id}/slots`, values);
        showSuccess("Slot added");
      }
      setModalOpen(false);
      refetch();
      await refetchVenue();
    } catch (err) {
      showError(err.response?.data?.message || "Failed to save slot");
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async () => {
    try {
      await api.delete(`/venues/${venue.id}/slots/${deletingSlot.id}`);
      showSuccess("Slot deleted");
      refetch();
      await refetchVenue();
    } catch {
      showError("Failed to delete slot");
    } finally {
      setDeletingSlot(null);
    }
  };

  const grouped = (slots || []).reduce((acc, slot) => {
    const t = slot.pricing_type || "time_slot";
    if (!acc[t]) acc[t] = [];
    acc[t].push(slot);
    return acc;
  }, {});

  const typeOrder = ["time_slot", "full_day", "hourly", "package"];

  return (
    <DashboardLayout sidebarItems={ownerSidebarItems} pageTitle="Slots & Availability">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-lg font-semibold text-gray-900">Slots & Availability</h1>
          <p className="text-sm text-gray-500 mt-0.5">Configure how clients book or enquire with you.</p>
        </div>
        <div className="flex gap-3">
          <Button onClick={openCreate}><Plus size={15} className="mr-1" /> Add Slot</Button>
          <Button variant="outline" onClick={() => navigate("/dashboard")} disabled={!slots || slots.length === 0}>Next</Button>
        </div>
      </div>

      {hasMultipleTypes && (
        <div className="flex items-start gap-2 bg-blue-50 border border-blue-100 rounded-xl p-4 mb-6 text-sm text-blue-700">
          <Info size={16} className="flex-shrink-0 mt-0.5" />
          <div>
            <span className="font-medium">You can mix slot types.</span>{" "}
            Add a {allowedTypes.map((t) => PRICING_TYPE_META[t]?.label).join(" slot, a ")} slot  - or any combination  - and they'll all show on your public profile.
          </div>
        </div>
      )}

      {loading ? (
        <Loader />
      ) : !slots || slots.length === 0 ? (
        <EmptyState icon={LayoutGrid} title="No slots configured yet"
          description={categorySlug ? `Add your first slot for your ${categorySlug.replace(/-/g, " ")} business.` : "Add your first slot to start accepting bookings."} />
      ) : (
        <div className="space-y-8">
          {typeOrder.map((type) => {
            const group = grouped[type];
            if (!group || group.length === 0) return null;
            return (
              <div key={type}>
                <div className="flex items-center gap-2 mb-3">
                  <span className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                    type === "time_slot" ? "bg-blue-50 text-blue-700" :
                    type === "full_day" ? "bg-green-50 text-green-700" :
                    type === "hourly" ? "bg-amber-50 text-amber-700" : "bg-purple-50 text-purple-700"
                  }`}>{PRICING_TYPE_META[type]?.label}</span>
                  <span className="text-xs text-gray-400">{group.length} slot{group.length > 1 ? "s" : ""}</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {group.map((slot) => <SlotCard key={slot.id} slot={slot} onEdit={openEdit} onDelete={setDeletingSlot} />)}
                </div>
              </div>
            );
          })}
        </div>
      )}

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title={editingSlot ? "Edit Slot" : "Add Slot"}>
        <SlotForm existingSlot={editingSlot} onSubmit={handleSubmit} onCancel={() => setModalOpen(false)} submitting={submitting} />
      </Modal>

      <ConfirmDialog isOpen={!!deletingSlot} onClose={() => setDeletingSlot(null)} onConfirm={handleDelete}
        title="Delete this slot?" message="Existing bookings on this slot will keep their record, but new bookings can't use it." />
    </DashboardLayout>
  );
}
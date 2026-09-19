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
import PackageForm from "./PackageForm.jsx";
import PackageCard from "./PackageCard.jsx";
import { showSuccess, showError } from "../../../components/common/Toast";
import { Plus, LayoutGrid, Package, Info } from "lucide-react";

export default function SlotList() {
  const navigate = useNavigate();
  const { venue, refetchVenue } = useVenue();
  const { data: slots, loading: slotsLoading, refetch: refetchSlots } = useFetch(
    venue ? `/venues/${venue.id}/slots` : null, { skip: !venue }
  );
  const { data: packages, loading: pkgsLoading, refetch: refetchPkgs } = useFetch(
    venue ? `/venues/${venue.id}/packages` : null, { skip: !venue }
  );

  const [activeTab, setActiveTab]           = useState("slots");
  const [slotModalOpen, setSlotModalOpen]   = useState(false);
  const [pkgModalOpen, setPkgModalOpen]     = useState(false);
  const [editingSlot, setEditingSlot]       = useState(null);
  const [editingPkg, setEditingPkg]         = useState(null);
  const [deletingSlot, setDeletingSlot]     = useState(null);
  const [deletingPkg, setDeletingPkg]       = useState(null);
  const [submitting, setSubmitting]         = useState(false);

  /* ---------- SLOT handlers ---------- */
  const handleSlotSubmit = async (values) => {
    setSubmitting(true);
    try {
      if (editingSlot) {
        await api.patch(`/venues/${venue.id}/slots/${editingSlot.id}`, values);
        showSuccess("Slot updated");
      } else {
        await api.post(`/venues/${venue.id}/slots`, values);
        showSuccess("Slot added");
        // Refresh venue context so setup_completed_steps updates on dashboard
        await refetchVenue();
      }
      setSlotModalOpen(false);
      refetchSlots();
    } catch (err) {
      showError(err.response?.data?.message || "Failed to save slot");
    } finally { setSubmitting(false); }
  };

  const handleSlotDelete = async () => {
    try {
      await api.delete(`/venues/${venue.id}/slots/${deletingSlot.id}`);
      showSuccess("Slot deleted");
      refetchSlots();
      // Slot count may have dropped to 0 — keep checklist in sync
      await refetchVenue();
    } catch { showError("Failed to delete slot"); }
    finally { setDeletingSlot(null); }
  };

  const handleSlotToggle = async (slot) => {
    try {
      await api.patch(`/venues/${venue.id}/slots/${slot.id}/toggle`);
      showSuccess(slot.is_active ? "Slot deactivated" : "Slot activated");
      refetchSlots();
      // Active count changed — keep checklist in sync
      await refetchVenue();
    } catch { showError("Failed to update slot"); }
  };

  /* ---------- PACKAGE handlers ---------- */
  const handlePkgSubmit = async (values) => {
    setSubmitting(true);
    try {
      if (editingPkg) {
        await api.patch(`/venues/${venue.id}/packages/${editingPkg.id}`, values);
        showSuccess("Package updated");
      } else {
        await api.post(`/venues/${venue.id}/packages`, values);
        showSuccess("Package created");
      }
      setPkgModalOpen(false);
      refetchPkgs();
    } catch (err) {
      showError(err.response?.data?.message || "Failed to save package");
    } finally { setSubmitting(false); }
  };

  const handlePkgDelete = async () => {
    try {
      await api.delete(`/venues/${venue.id}/packages/${deletingPkg.id}`);
      showSuccess("Package deleted");
      refetchPkgs();
    } catch { showError("Failed to delete package"); }
    finally { setDeletingPkg(null); }
  };

  const handlePkgToggle = async (pkg) => {
    try {
      await api.patch(`/venues/${venue.id}/packages/${pkg.id}/toggle`);
      showSuccess(pkg.is_active ? "Package deactivated" : "Package activated");
      refetchPkgs();
    } catch { showError("Failed to update package"); }
  };

  const loading = slotsLoading || pkgsLoading;

  return (
    <DashboardLayout sidebarItems={ownerSidebarItems} pageTitle="Slots & Availability">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-lg font-semibold text-gray-900">Slots & Availability</h1>
          <p className="text-sm text-gray-500 mt-0.5">Configure how clients book with you.</p>
        </div>
        <div className="flex gap-3">
          {activeTab === "slots" ? (
            <Button onClick={() => { setEditingSlot(null); setSlotModalOpen(true); }}>
              <Plus size={15} className="mr-1" /> Add Slot
            </Button>
          ) : (
            <Button onClick={() => { setEditingPkg(null); setPkgModalOpen(true); }}>
              <Plus size={15} className="mr-1" /> Add Package
            </Button>
          )}
          <Button variant="outline" onClick={() => navigate("/dashboard")}>Next</Button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-6 bg-gray-100 p-1 rounded-xl w-fit">
        <button onClick={() => setActiveTab("slots")}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            activeTab === "slots" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
          }`}>
          <LayoutGrid size={14} /> Slots
          {slots?.length > 0 && <span className="bg-primary-100 text-primary-700 text-xs px-1.5 py-0.5 rounded-full">{slots.length}</span>}
        </button>
        <button onClick={() => setActiveTab("packages")}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all ${
            activeTab === "packages" ? "bg-white text-gray-900 shadow-sm" : "text-gray-500 hover:text-gray-700"
          }`}>
          <Package size={14} /> Packages
          {packages?.length > 0 && <span className="bg-purple-100 text-purple-700 text-xs px-1.5 py-0.5 rounded-full">{packages.length}</span>}
        </button>
      </div>

      {/* Info banner */}
      <div className="flex items-start gap-2 bg-blue-50 border border-blue-100 rounded-xl p-4 mb-6 text-sm text-blue-700">
        <Info size={16} className="flex-shrink-0 mt-0.5" />
        <span>
          {activeTab === "slots"
            ? "Slots define your service time windows with unit counts (e.g. 3 photography teams). Packages bundle slots together."
            : "Packages combine multiple slots into one bookable bundle. Clients can also book individual slots."}
        </span>
      </div>

      {loading ? <Loader /> : (
        <>
          {/* SLOTS TAB */}
          {activeTab === "slots" && (
            !slots || slots.length === 0 ? (
              <EmptyState icon={LayoutGrid} title="No slots yet" description="Add your first slot to start accepting bookings." />
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {slots.map(slot => (
                  <SlotCard key={slot.id} slot={slot}
                    onEdit={s => { setEditingSlot(s); setSlotModalOpen(true); }}
                    onDelete={setDeletingSlot}
                    onToggle={handleSlotToggle} />
                ))}
              </div>
            )
          )}

          {/* PACKAGES TAB */}
          {activeTab === "packages" && (
            !packages || packages.length === 0 ? (
              <EmptyState icon={Package} title="No packages yet"
                description="Combine your slots into packages. Clients can book a package or individual slots." />
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {packages.map(pkg => (
                  <PackageCard key={pkg.id} pkg={pkg} slots={slots || []}
                    onEdit={p => { setEditingPkg(p); setPkgModalOpen(true); }}
                    onDelete={setDeletingPkg}
                    onToggle={handlePkgToggle} />
                ))}
              </div>
            )
          )}
        </>
      )}

      {/* Slot Modal */}
      <Modal isOpen={slotModalOpen} onClose={() => setSlotModalOpen(false)} title={editingSlot ? "Edit Slot" : "Add Slot"}>
        <SlotForm existingSlot={editingSlot} existingSlots={slots || []}
          onSubmit={handleSlotSubmit} onCancel={() => setSlotModalOpen(false)} submitting={submitting} />
      </Modal>

      {/* Package Modal */}
      <Modal isOpen={pkgModalOpen} onClose={() => setPkgModalOpen(false)} title={editingPkg ? "Edit Package" : "Create Package"}>
        <PackageForm existingPkg={editingPkg} slots={slots || []}
          onSubmit={handlePkgSubmit} onCancel={() => setPkgModalOpen(false)} submitting={submitting} />
      </Modal>

      <ConfirmDialog isOpen={!!deletingSlot} onClose={() => setDeletingSlot(null)} onConfirm={handleSlotDelete}
        title="Delete slot?" message="Existing bookings will keep their record but new bookings can't use it." />
      <ConfirmDialog isOpen={!!deletingPkg} onClose={() => setDeletingPkg(null)} onConfirm={handlePkgDelete}
        title="Delete package?" message="This will remove the package. Existing bookings are unaffected." />
    </DashboardLayout>
  );
}
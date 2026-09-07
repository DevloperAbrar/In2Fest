import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import Button from "../../../components/common/Button";
import ConfirmDialog from "../../../components/common/ConfirmDialog";
import { venueService } from "../../../services/venueService";
import { showSuccess, showError } from "../../../components/common/Toast";
import ImpersonateButton from "./ImpersonateButton.jsx";

export default function VenueActions({ venue, onUpdated }) {
  const navigate = useNavigate();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [loading, setLoading] = useState(false);

  const toggleActive = async () => {
    setLoading(true);
    try {
      await venueService.toggleActive(venue.id, !venue.is_active);
      showSuccess(`Venue ${venue.is_active ? "deactivated" : "activated"}`);
      onUpdated();
    } catch (err) {
      showError(err.response?.data?.message || "Failed to update venue");
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    setLoading(true);
    try {
      await venueService.remove(venue.id);
      showSuccess("Venue deleted");
      navigate("/admin/venues");
    } catch (err) {
      showError(err.response?.data?.message || "Failed to delete venue");
      setLoading(false);
      setConfirmDelete(false);
    }
  };

  return (
    <div className="flex items-center gap-2">
      <Button variant="outline" onClick={toggleActive} loading={loading}>
        {venue.is_active ? "Deactivate" : "Activate"}
      </Button>
      <ImpersonateButton venue={venue} />
      <Button variant="danger" onClick={() => setConfirmDelete(true)}>Delete</Button>

      <ConfirmDialog
        isOpen={confirmDelete}
        onClose={() => setConfirmDelete(false)}
        onConfirm={handleDelete}
        title="Delete this venue?"
        message={`This will permanently delete ${venue.hall_name} and all its data. This cannot be undone.`}
        confirmText="Delete"
        loading={loading}
      />
    </div>
  );
}
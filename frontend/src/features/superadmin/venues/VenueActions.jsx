import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import Button from "../../../components/common/Button";
import ConfirmDialog from "../../../components/common/ConfirmDialog";
import Modal from "../../../components/common/Modal";
import { venueService } from "../../../services/venueService";
import { showSuccess, showError } from "../../../components/common/Toast";
import ImpersonateButton from "./ImpersonateButton.jsx";

const PARTS = [
  { key: "website", label: "Website", help: "The vendor's website (their-name.in2fest.com) stops opening." },
  { key: "marketplace", label: "Marketplace", help: "The vendor disappears from in2fest.com search, city pages and the vendor profile page." },
  { key: "application", label: "Application", help: "The vendor and their team cannot log in to the dashboard. Website and marketplace stay live unless you also tick them." }
];

// true = that part is switched OFF. Older deactivations only set is_active = false,
// which switched everything off, so that still counts as "all off".
function getOffState(venue) {
  const all = venue.is_active === false;
  return {
    website: all || !!venue.website_suspended,
    marketplace: all || !!venue.marketplace_suspended,
    application: all || !!venue.app_suspended
  };
}

export default function VenueActions({ venue, onUpdated }) {
  const navigate = useNavigate();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);
  const [sel, setSel] = useState({ website: false, marketplace: false, application: false });

  const current = getOffState(venue);
  const offCount = PARTS.filter((p) => current[p.key]).length;
  const buttonLabel = offCount === 0 ? "Deactivate" : offCount === PARTS.length ? "Activate" : "Manage status";
  const changed = PARTS.some((p) => sel[p.key] !== current[p.key]);
  const selCount = PARTS.filter((p) => sel[p.key]).length;

  const openModal = () => { setSel(getOffState(venue)); setOpen(true); };
  const closeModal = () => { if (!loading) setOpen(false); };

  const saveStatus = async () => {
    setLoading(true);
    try {
      await venueService.setStatus(venue.id, { website: sel.website, marketplace: sel.marketplace, application: sel.application });
      showSuccess(selCount === PARTS.length ? "Venue deactivated" : selCount === 0 ? "Venue activated" : "Venue status updated");
      setOpen(false);
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
    <div>
      <div className="flex items-center gap-2 flex-wrap">
        <Button variant="outline" onClick={openModal}>{buttonLabel}</Button>
        <ImpersonateButton venue={venue} />
        <Button variant="danger" onClick={() => setConfirmDelete(true)}>Delete</Button>
      </div>

      {offCount > 0 && (
        <div className="flex flex-wrap gap-2 mt-3">
          {PARTS.filter((p) => current[p.key]).map((p) => (
            <span key={p.key} className="text-xs font-medium px-2.5 py-1 rounded-full bg-red-50 text-red-700 border border-red-200">
              {p.label} off
            </span>
          ))}
        </div>
      )}

      <Modal isOpen={open} onClose={closeModal} title="Deactivate venue" size="md">
        <p className="text-sm text-gray-600 mb-3">
          Tick what you want to switch <b>off</b> for <b>{venue.hall_name}</b>. Un-tick to switch it back on. Nothing is deleted.
        </p>

        <div className="space-y-2">
          {PARTS.map((p) => (
            <label
              key={p.key}
              className={`block rounded-xl border-2 p-3 cursor-pointer ${sel[p.key] ? "border-red-400 bg-red-50" : "border-gray-200"}`}
            >
              <div className="flex items-start gap-2">
                <input
                  type="checkbox"
                  className="mt-1"
                  checked={sel[p.key]}
                  onChange={(e) => setSel({ ...sel, [p.key]: e.target.checked })}
                />
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-sm text-gray-800">Deactivate {p.label}</span>
                    <span className={`text-[11px] ${current[p.key] ? "text-red-600" : "text-green-600"}`}>
                      {current[p.key] ? "currently off" : "currently on"}
                    </span>
                  </div>
                  <p className="text-xs text-gray-500 mt-0.5">{p.help}</p>
                </div>
              </div>
            </label>
          ))}
        </div>

        <div className="flex gap-3 mt-3 text-xs">
          <button type="button" className="text-primary-600 font-medium" onClick={() => setSel({ website: true, marketplace: true, application: true })}>Select all</button>
          <button type="button" className="text-primary-600 font-medium" onClick={() => setSel({ website: false, marketplace: false, application: false })}>Activate everything</button>
        </div>

        {sel.application && (
          <p className="text-xs text-red-600 mt-3">The vendor and their team will be signed out on their next action.</p>
        )}

        <div className="flex gap-2 mt-4">
          <Button variant="outline" className="flex-1" onClick={closeModal} disabled={loading}>Cancel</Button>
          <Button
            variant={selCount > 0 ? "danger" : "primary"}
            className="flex-1"
            loading={loading}
            disabled={!changed}
            onClick={saveStatus}
          >
            Save
          </Button>
        </div>
      </Modal>

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
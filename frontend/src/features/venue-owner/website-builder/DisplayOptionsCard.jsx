import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useVenue } from "../../../context/VenueContext.jsx";
import { venueService } from "../../../services/venueService";
import { showSuccess, showError } from "../../../components/common/Toast";
import { Clock } from "lucide-react";

const OPTIONS = [
  {
    field: "show_availability",
    title: "Availability calendar",
    desc: "Shows free and booked dates to visitors. Untick if you don't take date-based bookings."
  },
  {
    field: "show_slots_packages",
    title: "Slots & Packages",
    desc: "Shows your time slots and packages. Untick if you don't use them."
  }
];

export default function DisplayOptionsCard() {
  const { venue, refetchVenue } = useVenue();
  const navigate = useNavigate();
  const [local, setLocal] = useState({});
  const [busy, setBusy] = useState(null);

  if (!venue) return null;

  const valueOf = (field) => (field in local ? local[field] : venue[field] !== false);

  const toggle = async (field) => {
    if (busy) return;
    const next = !valueOf(field);
    setLocal((l) => ({ ...l, [field]: next }));
    setBusy(field);
    try {
      await venueService.update(venue.id, { [field]: next });
      await refetchVenue();
      showSuccess(next ? "Now showing on your website" : "Hidden from your website");
    } catch (err) {
      setLocal((l) => ({ ...l, [field]: !next }));
      showError(err?.response?.data?.message || "Could not save. Please try again.");
    } finally {
      setBusy(null);
    }
  };

  const bh = venue.business_hours;
  const hoursStatus = !bh ? "Not set yet" : bh.enabled === false ? "Hidden" : "Showing on website";

  return (
    <div className="bg-white border border-gray-100 rounded-xl p-5 mb-6">
      <h3 className="text-sm font-semibold text-gray-800 mb-1">Show on my website</h3>
      <p className="text-xs text-gray-400 mb-4">Tick what you want visitors to see. Changes save instantly.</p>

      <div className="space-y-3">
        {OPTIONS.map((o) => (
          <label key={o.field} className="flex items-start gap-3 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={valueOf(o.field)}
              disabled={busy === o.field}
              onChange={() => toggle(o.field)}
              className="mt-0.5 h-5 w-5 rounded border-gray-300 accent-primary-600"
            />
            <span>
              <span className="block text-sm font-medium text-gray-800">{o.title}</span>
              <span className="block text-xs text-gray-400">{o.desc}</span>
            </span>
          </label>
        ))}

        <div className="flex items-center justify-between gap-3 pt-3 border-t border-gray-100">
          <div className="flex items-center gap-3">
            <Clock size={18} className="text-gray-400" />
            <span>
              <span className="block text-sm font-medium text-gray-800">Opening hours</span>
              <span className="block text-xs text-gray-400">{hoursStatus}</span>
            </span>
          </div>
          <button
            type="button"
            onClick={() => navigate("/dashboard/website/hours")}
            className="text-sm font-medium text-primary-600 hover:underline"
          >
            Edit hours
          </button>
        </div>
      </div>
    </div>
  );
}
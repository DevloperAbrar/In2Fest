import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useVenue } from "../../../context/VenueContext.jsx";
import { venueService } from "../../../services/venueService";
import { showSuccess, showError } from "../../../components/common/Toast";
import { Clock } from "lucide-react";
import BuilderCard, { Switch } from "./BuilderCard.jsx";

const OPTIONS = [
  {
    field: "show_availability",
    title: "Availability calendar",
    desc: "Shows free and booked dates to visitors. Turn off if you don't take date-based bookings."
  },
  {
    field: "show_slots_packages",
    title: "Slots and packages",
    desc: "Shows your time slots and packages. Turn off if you don't use them."
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
  const hoursState = !bh
    ? { text: "Not set yet", cls: "bg-amber-50 text-amber-700" }
    : bh.enabled === false
      ? { text: "Hidden", cls: "bg-gray-100 text-gray-600" }
      : { text: "Showing on website", cls: "bg-green-50 text-green-700" };

  return (
    <BuilderCard
      step="2"
      title="What visitors can see"
      description="Switch parts of your website on or off. Changes save instantly."
    >
      <ul className="divide-y divide-gray-100 -my-4">
        {OPTIONS.map((o) => (
          <li key={o.field} className="flex items-center justify-between gap-4 py-4">
            <div className="min-w-0">
              <p className="text-sm font-medium text-gray-900">{o.title}</p>
              <p className="mt-0.5 text-xs text-gray-500">{o.desc}</p>
            </div>
            <Switch
              checked={valueOf(o.field)}
              disabled={busy === o.field}
              onChange={() => toggle(o.field)}
              label={o.title}
            />
          </li>
        ))}

        <li className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-3 min-w-0">
            <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg bg-gray-100 text-gray-500">
              <Clock size={17} />
            </span>
            <div className="min-w-0">
              <p className="text-sm font-medium text-gray-900">Opening hours</p>
              <span className={`mt-1 inline-block rounded-full px-2 py-0.5 text-[11px] font-medium ${hoursState.cls}`}>
                {hoursState.text}
              </span>
            </div>
          </div>
          <button
            type="button"
            onClick={() => navigate("/dashboard/website/hours")}
            className="self-start rounded-lg border border-gray-200 px-3.5 py-2 text-sm font-medium text-gray-700 transition-colors hover:border-primary-300 hover:text-primary-600 sm:self-auto"
          >
            Edit hours
          </button>
        </li>
      </ul>
    </BuilderCard>
  );
}
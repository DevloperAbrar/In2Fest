import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useVenue } from "../../../context/VenueContext.jsx";
import { venueService } from "../../../services/venueService";
import { showSuccess, showError } from "../../../components/common/Toast";
import { Clock, CalendarDays, Package, ChevronRight } from "lucide-react";
import { getVertical } from "../../../lib/verticals";
import BuilderCard, { Switch } from "./BuilderCard.jsx";

const OPTIONS = [
  {
    field: "show_availability",
    title: "Availability calendar",
    desc: "Shows free and booked dates to visitors. Turn off if you don't take date-based bookings.",
    icon: CalendarDays,
    hideForFood: true // restaurants don't use slot-based availability
  },
  {
    field: "show_slots_packages",
    title: "Slots and packages",
    desc: "Shows your time slots and packages. Turn off if you don't use them.",
    icon: Package,
    hideForFood: true // restaurant sites never show event-style slots/packages
  }
];

export default function DisplayOptionsCard() {
  const { venue, refetchVenue } = useVenue();
  const navigate = useNavigate();
  const [local, setLocal] = useState({});
  const [busy, setBusy] = useState(null);

  if (!venue) return null;

  const isFood = getVertical(venue).key === "food";
  const options = OPTIONS.filter((o) => !(isFood && o.hideForFood));

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
    <div className="space-y-4">
      {options.length > 0 && (
        <BuilderCard
          title="What visitors can see"
          description="Switch parts of your website on or off. Changes save instantly."
        >
          <ul className="-my-1 divide-y divide-gray-100">
            {options.map((o) => {
              const Icon = o.icon;
              const on = valueOf(o.field);
              return (
                <li key={o.field} className="flex items-center gap-3 py-3.5">
                  <span
                    className={`flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl transition-colors ${
                      on ? "bg-primary-50 text-primary-600" : "bg-gray-100 text-gray-400"
                    }`}
                  >
                    <Icon size={18} />
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-medium text-gray-900">{o.title}</p>
                    <p className="mt-0.5 text-xs leading-snug text-gray-500">{o.desc}</p>
                  </div>
                  <Switch
                    checked={on}
                    disabled={busy === o.field}
                    onChange={() => toggle(o.field)}
                    label={o.title}
                  />
                </li>
              );
            })}
          </ul>
        </BuilderCard>
      )}

      <button
        type="button"
        onClick={() => navigate("/dashboard/website/hours")}
        className="flex w-full items-center gap-3 rounded-2xl border border-gray-100 bg-white p-4 text-left shadow-[0_1px_2px_rgba(16,24,40,0.04)] transition-colors active:bg-gray-50 sm:p-5"
      >
        <span className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-xl bg-gray-100 text-gray-500">
          <Clock size={18} />
        </span>
        <div className="min-w-0 flex-1">
          <p className="text-sm font-medium text-gray-900">Opening hours</p>
          <span className={`mt-1 inline-block rounded-full px-2 py-0.5 text-[11px] font-medium ${hoursState.cls}`}>
            {hoursState.text}
          </span>
        </div>
        <span className="flex items-center gap-0.5 text-sm font-medium text-primary-600">
          Edit <ChevronRight size={16} />
        </span>
      </button>
    </div>
  );
}
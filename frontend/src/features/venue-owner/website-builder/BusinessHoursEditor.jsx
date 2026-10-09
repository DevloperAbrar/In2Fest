import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import DashboardLayout from "../../../components/layout/DashboardLayout.jsx";
import { ownerSidebarItems } from "../ownerSidebarItems.js";
import { useVenue } from "../../../context/VenueContext.jsx";
import Button from "../../../components/common/Button";
import { venueService } from "../../../services/venueService";
import { showSuccess, showError } from "../../../components/common/Toast";
import { Plus, Trash2, Copy, Clock } from "lucide-react";
import {
  DAYS,
  buildWeek,
  normalizeBusinessHours,
  validateBusinessHours,
  getOpenStatus
} from "../../../lib/businessHours";

const PRESETS = [
  { label: "Mon to Sat, 9 AM - 6 PM", days: ["mon", "tue", "wed", "thu", "fri", "sat"], open: "09:00", close: "18:00" },
  { label: "Every day, 9 AM - 9 PM", days: ["mon", "tue", "wed", "thu", "fri", "sat", "sun"], open: "09:00", close: "21:00" },
  { label: "Mon to Fri, 10 AM - 7 PM", days: ["mon", "tue", "wed", "thu", "fri"], open: "10:00", close: "19:00" }
];

const timeInput =
  "border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 bg-white";

export default function BusinessHoursEditor() {
  const { venue, refetchVenue } = useVenue();
  const navigate = useNavigate();
  const [hours, setHours] = useState(() => normalizeBusinessHours(null));
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (venue) setHours(normalizeBusinessHours(venue.business_hours));
  }, [venue]);

  const patchDay = (key, patch) =>
    setHours((h) => ({ ...h, days: { ...h.days, [key]: { ...h.days[key], ...patch } } }));

  const toggleOpen = (key, isOpen) =>
    setHours((h) => {
      const day = h.days[key];
      const next = isOpen
        ? { closed: false, shifts: day.shifts.length ? day.shifts : [{ open: "09:00", close: "18:00" }] }
        : { closed: true, shifts: [] };
      return { ...h, days: { ...h.days, [key]: next } };
    });

  const setShift = (key, i, field, value) =>
    setHours((h) => {
      const shifts = h.days[key].shifts.map((s, idx) => (idx === i ? { ...s, [field]: value } : s));
      return { ...h, days: { ...h.days, [key]: { ...h.days[key], shifts } } };
    });

  const addShift = (key) =>
    setHours((h) => {
      const day = h.days[key];
      if (day.shifts.length >= 2) return h;
      return { ...h, days: { ...h.days, [key]: { ...day, shifts: [...day.shifts, { open: "16:00", close: "20:00" }] } } };
    });

  const removeShift = (key, i) =>
    setHours((h) => {
      const shifts = h.days[key].shifts.filter((_, idx) => idx !== i);
      return { ...h, days: { ...h.days, [key]: { ...h.days[key], shifts } } };
    });

  const copyToAll = (key) =>
    setHours((h) => {
      const src = h.days[key];
      const days = {};
      DAYS.forEach((d) => {
        days[d.key] = { closed: src.closed, shifts: src.shifts.map((s) => ({ ...s })) };
      });
      return { ...h, days };
    });

  const applyPreset = (p) => setHours((h) => ({ ...h, always_open: false, days: buildWeek(p.days, p.open, p.close) }));

  const save = async () => {
    const error = validateBusinessHours(hours);
    if (error) return showError(error);
    setSaving(true);
    try {
      await venueService.update(venue.id, { business_hours: hours });
      await refetchVenue();
      showSuccess("Opening hours saved");
      navigate("/dashboard/website");
    } catch (err) {
      showError(err?.response?.data?.message || "Failed to save opening hours");
    } finally {
      setSaving(false);
    }
  };

  const status = getOpenStatus(hours);

  return (
    <DashboardLayout sidebarItems={ownerSidebarItems} pageTitle="Opening Hours">
      <div className="max-w-2xl space-y-4">
        <div className="bg-white p-6 rounded-xl border border-gray-100 space-y-3">
          <label className="flex items-center gap-3 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={hours.enabled}
              onChange={(e) => setHours((h) => ({ ...h, enabled: e.target.checked }))}
              className="h-5 w-5 rounded border-gray-300 accent-primary-600"
            />
            <span>
              <span className="block text-sm font-semibold text-gray-800">Show opening hours on my website</span>
              <span className="block text-xs text-gray-400">Untick to hide the Opening Hours section from visitors.</span>
            </span>
          </label>

          <label className="flex items-center gap-3 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={hours.always_open}
              onChange={(e) => setHours((h) => ({ ...h, always_open: e.target.checked }))}
              className="h-5 w-5 rounded border-gray-300 accent-primary-600"
            />
            <span>
              <span className="block text-sm font-semibold text-gray-800">Open 24 hours, all 7 days</span>
              <span className="block text-xs text-gray-400">For pharmacies, hospitals, 24x7 stores.</span>
            </span>
          </label>
        </div>

        {!hours.always_open && (
          <div className="bg-white p-6 rounded-xl border border-gray-100 space-y-4">
            <div>
              <p className="text-xs font-medium text-gray-500 mb-2">Quick setup</p>
              <div className="flex flex-wrap gap-2">
                {PRESETS.map((p) => (
                  <button
                    key={p.label}
                    type="button"
                    onClick={() => applyPreset(p)}
                    className="text-xs font-medium px-3 py-1.5 rounded-full border border-gray-200 text-gray-600 hover:border-primary-300 hover:text-primary-600 transition-colors"
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="divide-y divide-gray-100">
              {DAYS.map((d) => {
                const day = hours.days[d.key];
                return (
                  <div key={d.key} className="py-3 flex flex-col sm:flex-row sm:items-start gap-3">
                    <div className="sm:w-36 flex items-center gap-3">
                      <label className="flex items-center gap-2 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={!day.closed}
                          onChange={(e) => toggleOpen(d.key, e.target.checked)}
                          className="h-4 w-4 rounded border-gray-300 accent-primary-600"
                        />
                        <span className="text-sm font-medium text-gray-800">{d.label}</span>
                      </label>
                    </div>

                    <div className="flex-1 space-y-2">
                      {day.closed ? (
                        <span className="inline-block text-sm text-gray-400 py-1.5">Closed</span>
                      ) : (
                        <>
                          {day.shifts.map((s, i) => (
                            <div key={i} className="flex items-center gap-2 flex-wrap">
                              <input
                                type="time"
                                value={s.open}
                                onChange={(e) => setShift(d.key, i, "open", e.target.value)}
                                className={timeInput}
                                aria-label={`${d.label} opening time`}
                              />
                              <span className="text-xs text-gray-400">to</span>
                              <input
                                type="time"
                                value={s.close}
                                onChange={(e) => setShift(d.key, i, "close", e.target.value)}
                                className={timeInput}
                                aria-label={`${d.label} closing time`}
                              />
                              {i === 1 && (
                                <button
                                  type="button"
                                  onClick={() => removeShift(d.key, i)}
                                  aria-label="Remove second time range"
                                  className="p-1 text-red-400 hover:text-red-600"
                                >
                                  <Trash2 size={14} />
                                </button>
                              )}
                            </div>
                          ))}
                          <div className="flex items-center gap-3">
                            {day.shifts.length < 2 && (
                              <button
                                type="button"
                                onClick={() => addShift(d.key)}
                                className="text-xs text-primary-600 hover:underline flex items-center gap-1"
                              >
                                <Plus size={12} /> Add break (second time range)
                              </button>
                            )}
                            <button
                              type="button"
                              onClick={() => copyToAll(d.key)}
                              className="text-xs text-gray-400 hover:text-gray-700 flex items-center gap-1"
                            >
                              <Copy size={12} /> Copy to all days
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        <div className="bg-white p-6 rounded-xl border border-gray-100 space-y-3">
          <div>
            <label className="block text-xs text-gray-500 mb-1">Note (optional)</label>
            <input
              type="text"
              maxLength={160}
              value={hours.note}
              onChange={(e) => setHours((h) => ({ ...h, note: e.target.value }))}
              placeholder="e.g. Closed on public holidays"
              className="w-full border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>

          <div className="flex items-center gap-2 text-sm bg-gray-50 border border-gray-100 rounded-lg px-3 py-2">
            <Clock size={16} className="text-gray-400" />
            <span className="text-gray-500">Right now visitors see:</span>
            <span className={`font-semibold ${status.isOpen ? "text-green-600" : "text-red-500"}`}>{status.label}</span>
            {status.detail && <span className="text-gray-400">· {status.detail}</span>}
          </div>
        </div>

        <div className="flex gap-3">
          <Button onClick={save} loading={saving} className="flex-1">Save Opening Hours</Button>
          <Button variant="outline" onClick={() => navigate("/dashboard/website")}>Back to Website Builder</Button>
        </div>
      </div>
    </DashboardLayout>
  );
}
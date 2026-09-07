import React, { useState } from "react";
import { bookingService } from "../../../services/bookingService";
import { formatDate } from "../../../lib/formatters";
import { CalendarCheck, Loader2, ArrowRight, AlertTriangle } from "lucide-react";
import { VENUE_TYPE_OPTIONS } from "../../../lib/venueTypes";

export default function AvailabilityCalendar({ venue, slots }) {
  const [selectedSlot, setSelectedSlot] = useState(slots?.[0]?.id || "");
  const [selectedDate, setSelectedDate] = useState("");
  const [selectedVenueType, setSelectedVenueType] = useState("");
  const [status, setStatus] = useState(null);
  const [nextAvailable, setNextAvailable] = useState(null);
  const [checking, setChecking] = useState(false);
  const [formError, setFormError] = useState("");

  const venueTypeOptions = VENUE_TYPE_OPTIONS.filter(
    (opt) => opt.value && venue?.venue_type?.includes(opt.value)
  );

  const checkAvailability = async () => {
    if (!selectedSlot || !selectedDate) return;

    if (venueTypeOptions.length > 0 && !selectedVenueType) {
      setFormError("Please select a hall / venue type before checking availability.");
      setStatus(null);
      setNextAvailable(null);
      return;
    }

    setFormError("");
    setChecking(true);
    setStatus(null);
    setNextAvailable(null);
    try {
      const venueTypes = selectedVenueType ? [selectedVenueType] : [];
      const { data } = await bookingService.checkAvailability(venue.id, selectedSlot, selectedDate, venueTypes);
      setStatus(data.data.available);
      if (!data.data.available) setNextAvailable(data.data.nextAvailableDate);
    } catch {
      setStatus(null);
    } finally {
      setChecking(false);
    }
  };

  if (!slots || slots.length === 0) return null;

  return (
    <section id="availability" className="py-24 bg-white dark:bg-gray-950 transition-colors">
      <div className="max-w-2xl mx-auto px-6 text-center">
        <p className="text-sm font-semibold uppercase tracking-widest mb-3"
          style={{ color: venue.theme_color || "#7c3aed" }}>
          Plan Your Event
        </p>
        <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white mb-12">
          Check Availability
        </h2>

        <div className="bg-gray-50 dark:bg-gray-900 rounded-2xl p-8 border dark:border-gray-800">
          <div className="flex flex-col sm:flex-row gap-3 mb-4">
            {venueTypeOptions.length > 0 && (
              <select
                value={selectedVenueType}
                onChange={(e) => {
                  setSelectedVenueType(e.target.value);
                  if (e.target.value) setFormError("");
                }}
                className={`flex-1 border bg-white dark:bg-gray-800 text-gray-900 dark:text-white rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 ${
                  formError ? "border-red-400 dark:border-red-600" : "border-gray-200 dark:border-gray-700"
                }`}
              >
                <option value="">Select hall / venue type</option>
                {venueTypeOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            )}

            <select
              value={selectedSlot}
              onChange={(e) => setSelectedSlot(e.target.value)}
              className="flex-1 border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2"
              style={{ "--tw-ring-color": venue.theme_color }}
            >
              {slots.map((s) => (
                <option key={s.id} value={s.id}>{s.name} ({s.start_time} – {s.end_time})</option>
              ))}
            </select>
          </div>

          <input
            type="date"
            value={selectedDate}
            onChange={(e) => setSelectedDate(e.target.value)}
            min={new Date().toISOString().split("T")[0]}
            className="w-full border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 text-gray-900 dark:text-white rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 mb-6"
          />

          {formError && (
            <div className="mb-6 p-4 rounded-xl text-sm font-medium bg-amber-50 dark:bg-amber-900/20 text-amber-700 dark:text-amber-400 border border-amber-200 dark:border-amber-800 flex items-center justify-center gap-2">
              <AlertTriangle size={16} /> {formError}
            </div>
          )}

          <button
            onClick={checkAvailability}
            disabled={checking || !selectedDate}
            className="w-full py-3 rounded-xl text-white font-semibold text-sm flex items-center justify-center gap-2 transition-transform hover:scale-105 disabled:opacity-60 disabled:cursor-not-allowed"
            style={{ backgroundColor: venue.theme_color || "#7c3aed" }}
          >
            {checking ? <Loader2 size={16} className="animate-spin" /> : <CalendarCheck size={16} />}
            {checking ? "Checking..." : "Check Availability"}
          </button>

          {status !== null && (
            <div className={`mt-6 p-4 rounded-xl text-sm font-medium ${
              status
                ? "bg-green-50 dark:bg-green-900/20 text-green-700 dark:text-green-400 border border-green-200 dark:border-green-800"
                : "bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 border border-red-200 dark:border-red-800"
            }`}>
              {status ? (
                `✅ Available on ${formatDate(selectedDate)}! Book now before it fills up.`
              ) : (
                <div className="space-y-2">
                  <p>❌ Sorry, this slot is already booked on {formatDate(selectedDate)}.</p>
                  {nextAvailable && (
                    <p className="flex items-center justify-center gap-1 font-semibold">
                      Next available: <ArrowRight size={14} /> {formatDate(nextAvailable)}
                    </p>
                  )}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
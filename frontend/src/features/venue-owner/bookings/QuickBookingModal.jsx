import React, { useState, useEffect } from "react";
import { X } from "lucide-react";
import Input from "../../../components/common/Input";
import Select from "../../../components/common/Select";
import MultiSelect from "../../../components/common/MultiSelect";
import Button from "../../../components/common/Button";
import { bookingService } from "../../../services/bookingService";
import { showSuccess, showError } from "../../../components/common/Toast";
import { VENUE_TYPE_OPTIONS } from "../../../lib/venueTypes";
import dayjs from "dayjs";

const emptyForm = {
  client_name: "",
  client_phone: "",
  client_email: "",
  slot_id: "",
  venue_type: [],
  event_type: "",
  guest_count: "",
  total_amount: "",
  notes: ""
};

export default function QuickBookingModal({ isOpen, onClose, venue, slots, selectedDate, onCreated }) {
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);

  const venueTypeOptions = VENUE_TYPE_OPTIONS.filter(
    (opt) => opt.value && venue?.venue_type?.includes(opt.value)
  );

  useEffect(() => {
    if (isOpen) {
      setForm({ ...emptyForm, slot_id: slots?.[0]?.id || "" });
    }
  }, [isOpen, slots]);

  if (!isOpen) return null;

  const update = (field, value) => setForm((f) => ({ ...f, [field]: value }));

  const submit = async () => {
    if (!form.client_name.trim() || !form.client_phone.trim() || !form.slot_id) {
      return showError("Client name, phone and slot are required");
    }
    setSaving(true);
    try {
      await bookingService.create(venue.id, {
        client_name: form.client_name,
        client_phone: form.client_phone,
        client_email: form.client_email || null,
        slot_id: form.slot_id,
        venue_type: form.venue_type,
        event_date: dayjs(selectedDate).format("YYYY-MM-DD"),
        event_type: form.event_type,
        guest_count: form.guest_count ? Number(form.guest_count) : null,
        total_amount: form.total_amount ? Number(form.total_amount) : 0,
        notes: form.notes
      });
      showSuccess("Booking created");
      onCreated?.();
    } catch (err) {
      showError(err.response?.data?.message || "Failed to create booking");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-navy-900/40 sm:p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-t-3xl sm:rounded-2xl shadow-xl w-full sm:max-w-lg max-h-[92vh] sm:max-h-[90vh] overflow-y-auto pb-safe-b animate-slot-in flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Sticky header - stays visible while the form scrolls underneath */}
        <div className="sticky top-0 bg-white/95 backdrop-blur z-10">
          <div className="sm:hidden flex justify-center pt-2.5 pb-1">
            <div className="w-10 h-1 rounded-full bg-navy-200" />
          </div>
          <div className="flex items-center justify-between px-5 sm:px-6 py-3 sm:py-4 border-b border-navy-100/60">
            <div className="min-w-0">
              <h3 className="font-display font-semibold text-navy-900 text-base sm:text-lg">Mark as Booked</h3>
              <p className="text-xs sm:text-sm text-navy-400 truncate">{dayjs(selectedDate).format("dddd, MMMM D, YYYY")}</p>
            </div>
            <button
              onClick={onClose}
              className="tap-scale shrink-0 w-8 h-8 flex items-center justify-center rounded-lg text-navy-400 hover:text-navy-600 hover:bg-navy-50"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        <div className="p-5 sm:p-6 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input label="Client Name *" value={form.client_name} onChange={(e) => update("client_name", e.target.value)} />
            <Input label="Phone *" value={form.client_phone} onChange={(e) => update("client_phone", e.target.value)} />
          </div>

          <Input
            label="Email (optional)"
            type="email"
            value={form.client_email}
            onChange={(e) => update("client_email", e.target.value)}
          />

          <Select
            label="Slot *"
            value={form.slot_id}
            onChange={(e) => update("slot_id", e.target.value)}
            options={[{ value: "", label: "Select slot" }, ...(slots || []).map((s) => ({
              value: s.id,
              label: `${s.name} (${s.start_time} – ${s.end_time})`
            }))]}
          />

          {venueTypeOptions.length > 0 && (
            <MultiSelect
              label="Venue Type / Hall (select all that apply for this event)"
              options={venueTypeOptions}
              value={form.venue_type}
              onChange={(val) => update("venue_type", val)}
              placeholder="e.g. Marriage Hall, Banquet Hall..."
            />
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Input
              label="Event Type"
              placeholder="e.g. Wedding"
              value={form.event_type}
              onChange={(e) => update("event_type", e.target.value)}
            />
            <Input
              label="Guest Count"
              type="number"
              value={form.guest_count}
              onChange={(e) => update("guest_count", e.target.value)}
            />
          </div>

          <Input
            label="Total Amount (optional)"
            type="number"
            value={form.total_amount}
            onChange={(e) => update("total_amount", e.target.value)}
          />

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Notes (optional)</label>
            <textarea
              rows={2}
              value={form.notes}
              onChange={(e) => update("notes", e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
            />
          </div>
        </div>

        {/* Sticky footer, stacked on mobile so both buttons stay thumb-reachable */}
        <div className="sticky bottom-0 bg-white/95 backdrop-blur border-t border-navy-100/60 p-4 sm:p-5 flex flex-col-reverse sm:flex-row gap-3">
          <Button variant="outline" onClick={onClose} className="sm:w-auto">Cancel</Button>
          <Button onClick={submit} loading={saving} className="flex-1">Confirm Booking</Button>
        </div>
      </div>
    </div>
  );
}
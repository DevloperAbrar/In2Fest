import React from "react";
import { useForm } from "react-hook-form";
import { useTranslation } from "react-i18next";
import Input from "../../../components/common/Input";
import Button from "../../../components/common/Button";
import { useVenue } from "../../../context/VenueContext";
import { useFetch } from "../../../hooks/useFetch";
import { translateCategory } from "../../../lib/i18nLabels";

// What the vendor picked at registration lives in business_category +
// secondary_categories. venue_type may be empty on older venues, so fall back
// to those - keeps the slot form working even before the vendor re-saves Settings.
const getVenueTypeSlugs = (venue) => {
  if (Array.isArray(venue?.venue_type) && venue.venue_type.length > 0) {
    return venue.venue_type;
  }
  return Array.from(
    new Set([venue?.business_category, ...(venue?.secondary_categories || [])].filter(Boolean))
  );
};

export default function SlotForm({ existingSlot, existingSlots = [], onSubmit, onCancel, submitting }) {
  const { i18n } = useTranslation();
  const { venue } = useVenue();

  // Service Type options come from the same super-admin Category Manager
  // list used in Venue Profile > Venue Type (GET /meta/categories), filtered
  // down to just the categories this vendor picked for their own business.
  // The vendor SELECTS from this list — no free-text typing anywhere here.
  // Whichever service is picked also becomes the slot's name, so there is
  // no separate "Slot Name" field to fill in.
  const { data: categories, loading: categoriesLoading } = useFetch("/meta/categories");

  // When editing, always keep the slot's own service type selectable.
  const selectedSlugs = Array.from(
    new Set([...getVenueTypeSlugs(venue), ...(existingSlot?.service_type ? [existingSlot.service_type] : [])])
  );

  // A service type that already has a slot shouldn't be offered again —
  // one slot per service type. When editing a slot, its own current service
  // type stays available (so you don't lose your existing selection).
  const usedServiceTypes = existingSlots
    .filter((s) => !existingSlot || s.id !== existingSlot.id)
    .map((s) => s.service_type)
    .filter(Boolean);

  const matchedCategories = (categories || []).filter((c) => selectedSlugs.includes(c.slug));

  const serviceTypeOptions = matchedCategories
    .filter((c) => !usedServiceTypes.includes(c.slug))
    .map((c) => ({ value: c.slug, label: translateCategory(c, i18n.language) }));

  const { register, handleSubmit, watch, formState: { errors } } = useForm({
    defaultValues: existingSlot
      ? { service_type: existingSlot.service_type || "", total_units: existingSlot.total_units || 1 }
      : { service_type: "", total_units: 1 }
  });

  const selectedServiceType = watch("service_type");

  const handleFormSubmit = (values) => {
    const payload = { total_units: Number(values.total_units) || 1 };

    if (values.service_type) {
      const chosen = serviceTypeOptions.find((o) => o.value === values.service_type);
      payload.service_type = values.service_type;
      // Slot name = the human-readable label of the chosen service type,
      // so there's no separate name field for the vendor to fill in.
      payload.name = chosen?.label || existingSlot?.name || values.service_type;
    } else if (!existingSlot) {
      // Never send a new slot without a service type (backend would reject it).
      return;
    }

    onSubmit(payload);
  };

  // New slot needs a service type before it can be submitted.
  const submitDisabled = !existingSlot && !selectedServiceType;

  return (
    <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-5">
      {/* Service Type — doubles as the slot name */}
      <div>
        <label className="text-xs font-medium text-gray-500 mb-1 block">Service Type</label>
        {categoriesLoading ? (
          <div className="text-xs text-gray-400 border border-dashed border-gray-200 rounded-xl px-3 py-2.5 bg-gray-50 leading-snug">
            Loading your services…
          </div>
        ) : serviceTypeOptions.length > 0 ? (
          <select
            {...register("service_type", { required: "Please select a service type" })}
            className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-300 bg-white">
            <option value="">Select service</option>
            {serviceTypeOptions.map(o => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        ) : (
          <div className="text-xs text-gray-400 border border-dashed border-gray-200 rounded-xl px-3 py-2.5 bg-gray-50 leading-snug">
            {matchedCategories.length === 0
              ? "No venue type selected yet — pick one under Marketplace Profile / Settings first."
              : "All your venue's service types already have a slot. Delete one to reassign it, or add more venue types in Settings."}
          </div>
        )}
        {errors.service_type?.message && (
          <p className="text-xs text-red-500 mt-1">{errors.service_type.message}</p>
        )}
      </div>

      {/* Total Units */}
      <div>
        <Input label="Total Units / Teams" type="number" min="1"
          placeholder="e.g. 3"
          error={errors.total_units?.message}
          {...register("total_units", { required: "Required", min: { value: 1, message: "Must be at least 1" } })} />
        <p className="text-xs text-gray-400 mt-1.5">
          Units = how many can work simultaneously (e.g. 3 photography teams). Clients will choose their event date and time while booking.
        </p>
      </div>

      <div className="flex justify-end gap-3 pt-2 border-t border-gray-100">
        <Button variant="outline" type="button" onClick={onCancel}>Cancel</Button>
        <Button type="submit" loading={submitting} disabled={submitDisabled}>
          {existingSlot ? "Update Slot" : "Add Slot"}
        </Button>
      </div>
    </form>
  );
}
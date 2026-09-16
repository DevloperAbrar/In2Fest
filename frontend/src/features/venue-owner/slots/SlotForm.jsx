import React, { useState, useEffect } from "react";
import { useForm, Controller } from "react-hook-form";
import Input from "../../../components/common/Input";
import Button from "../../../components/common/Button";
import { useVenue } from "../../../context/VenueContext";
import { getSlotConfig, PRICING_TYPE_META } from "../../../config/slotCategories";
import { Clock, Sun, Timer } from "lucide-react";

const TYPE_ICON = { time_slot: Clock, full_day: Sun, hourly: Timer };
const DAYS = [
  { key: "mon", label: "Mon" }, { key: "tue", label: "Tue" },
  { key: "wed", label: "Wed" }, { key: "thu", label: "Thu" },
  { key: "fri", label: "Fri" }, { key: "sat", label: "Sat" },
  { key: "sun", label: "Sun" }
];
const ALL_DAYS = DAYS.map(d => d.key);

function DayPicker({ value = ALL_DAYS, onChange }) {
  const toggle = (key) => {
    const next = value.includes(key) ? value.filter(d => d !== key) : [...value, key];
    onChange(next);
  };
  return (
    <div>
      <label className="text-xs font-medium text-gray-500 mb-2 block">Operating Days</label>
      <div className="flex gap-1.5 flex-wrap">
        {DAYS.map(({ key, label }) => (
          <button key={key} type="button" onClick={() => toggle(key)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
              value.includes(key)
                ? "bg-primary-600 text-white border-primary-600"
                : "bg-white text-gray-500 border-gray-200 hover:border-primary-300"
            }`}>{label}</button>
        ))}
        <button type="button" onClick={() => onChange(value.length === 7 ? [] : ALL_DAYS)}
          className="px-3 py-1.5 rounded-lg text-xs font-medium border border-dashed border-gray-300 text-gray-400 hover:border-primary-300 transition-colors">
          {value.length === 7 ? "Clear all" : "All days"}
        </button>
      </div>
    </div>
  );
}

export default function SlotForm({ existingSlot, onSubmit, onCancel, submitting, venueServices = [] }) {
  const { venue } = useVenue();
  const categorySlug = venue?.business_category || "";
  const { allowedTypes, defaultType, suggestions } = getSlotConfig(categorySlug);

  // Remove "package" from slot types — packages are separate now
  const slotTypes = allowedTypes.filter(t => t !== "package");
  const [selectedType, setSelectedType] = useState(
    existingSlot?.pricing_type && existingSlot.pricing_type !== "package"
      ? existingSlot.pricing_type
      : (slotTypes[0] || "time_slot")
  );

  const { register, handleSubmit, control, setValue, formState: { errors } } = useForm({
    defaultValues: existingSlot
      ? { ...existingSlot, days_of_operation: existingSlot.days_of_operation || ALL_DAYS }
      : {
          name: "", start_time: "", end_time: "",
          base_price: "", weekend_price: "",
          price_per_hour: "", min_hours: "", max_hours: "",
          description: "", service_type: "", total_units: 1,
          days_of_operation: ALL_DAYS
        }
  });

  useEffect(() => { setValue("pricing_type", selectedType); }, [selectedType, setValue]);

  const handleFormSubmit = (values) => {
    onSubmit({ ...values, pricing_type: selectedType, total_units: Number(values.total_units) || 1 });
  };

  return (
    <div className="space-y-5">
      {/* Slot Type selector */}
      {slotTypes.length > 1 && (
        <div>
          <label className="text-xs font-medium text-gray-500 mb-2 block">Slot Type</label>
          <div className="grid gap-2" style={{ gridTemplateColumns: `repeat(${Math.min(slotTypes.length, 3)}, 1fr)` }}>
            {slotTypes.map((type) => {
              const Icon = TYPE_ICON[type] || Clock;
              const meta = PRICING_TYPE_META[type];
              const active = selectedType === type;
              return (
                <button key={type} type="button" onClick={() => setSelectedType(type)}
                  className={`flex flex-col items-center gap-1.5 p-3 rounded-xl border text-center transition-all ${
                    active ? "border-primary-500 bg-primary-50 text-primary-700" : "border-gray-200 bg-white text-gray-500 hover:border-primary-200"
                  }`}>
                  <Icon size={18} />
                  <span className="text-xs font-semibold">{meta?.label}</span>
                </button>
              );
            })}
          </div>
          <p className="text-xs text-gray-400 mt-1.5 px-1">{PRICING_TYPE_META[selectedType]?.description}</p>
        </div>
      )}

      <form onSubmit={handleSubmit(handleFormSubmit)} className="space-y-4">
        {/* Name */}
        <div>
          <Input label="Slot Name" placeholder="e.g. Morning Slot, Evening Shoot"
            error={errors.name?.message}
            {...register("name", { required: "Name is required" })} />
          {suggestions.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mt-2">
              {suggestions.map(s => (
                <button key={s} type="button" onClick={() => setValue("name", s)}
                  className="text-xs px-2.5 py-1 rounded-full border border-dashed border-primary-200 text-primary-600 hover:bg-primary-50 transition-colors">
                  {s}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Service Type + Units — always shown */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs font-medium text-gray-500 mb-1 block">Service Type</label>
            {venueServices.length > 0 ? (
              <select {...register("service_type")}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-300 bg-white">
                <option value="">Select service</option>
                {venueServices.map(s => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            ) : (
              <Input placeholder="e.g. Photography" {...register("service_type")} />
            )}
          </div>
          <Input label="Total Units / Teams" type="number" min="1"
            placeholder="e.g. 3"
            {...register("total_units", { min: 1 })} />
        </div>
        <p className="text-xs text-gray-400 -mt-2">Units = how many can work simultaneously (e.g. 3 photography teams)</p>

        {/* Time slot fields */}
        {selectedType === "time_slot" && (
          <>
            <div className="grid grid-cols-2 gap-3">
              <Input label="Start Time" type="time" error={errors.start_time?.message}
                {...register("start_time", { required: "Start time required" })} />
              <Input label="End Time" type="time" error={errors.end_time?.message}
                {...register("end_time", { required: "End time required" })} />
            </div>
            <Controller name="days_of_operation" control={control}
              render={({ field }) => <DayPicker value={field.value} onChange={field.onChange} />} />
          </>
        )}

        {/* Full day fields */}
        {selectedType === "full_day" && (
          <Controller name="days_of_operation" control={control}
            render={({ field }) => <DayPicker value={field.value} onChange={field.onChange} />} />
        )}

        {/* Hourly fields */}
        {selectedType === "hourly" && (
          <>
            <div className="grid grid-cols-2 gap-3">
              <Input label="Minimum Hours" type="number" min="1" placeholder="e.g. 2" {...register("min_hours")} />
              <Input label="Maximum Hours" type="number" min="1" placeholder="e.g. 8" {...register("max_hours")} />
            </div>
            <Controller name="days_of_operation" control={control}
              render={({ field }) => <DayPicker value={field.value} onChange={field.onChange} />} />
          </>
        )}

        <div className="flex justify-end gap-3 pt-2 border-t border-gray-100">
          <Button variant="outline" type="button" onClick={onCancel}>Cancel</Button>
          <Button type="submit" loading={submitting}>{existingSlot ? "Update Slot" : "Add Slot"}</Button>
        </div>
      </form>
    </div>
  );
}
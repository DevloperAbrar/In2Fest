import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import { planSchema } from "../../../components/forms/validationSchemas";
import Input from "../../../components/common/Input";
import Button from "../../../components/common/Button";
import { planService } from "../../../services/planService";
import { showSuccess, showError } from "../../../components/common/Toast";
import { PLAN_FEATURES } from "../../../lib/planFeatures";
import { OFFER_PRESETS } from "../../../lib/planPricing";
import { formatCurrency } from "../../../lib/formatters";

export default function PlanForm({ existingPlan, onSaved, onCancel }) {
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting }
  } = useForm({
    resolver: yupResolver(planSchema),
    defaultValues: {
      name: existingPlan?.name || "",
      description: existingPlan?.description || "",
      monthly_price: existingPlan?.monthly_price ?? "",
      yearly_price: existingPlan?.yearly_price ?? "",
      trial_days: existingPlan?.trial_days ?? 0,
      discount_percent: existingPlan?.discount_percent ?? 0,
      offer_name: existingPlan?.offer_name || "",
      offer_ends_at: existingPlan?.offer_ends_at ? String(existingPlan.offer_ends_at).slice(0, 10) : ""
    }
  });

  const [selectedFeatures, setSelectedFeatures] = useState(existingPlan?.features || []);
  const [isActive, setIsActive] = useState(existingPlan?.is_active ?? true);

  const monthly = Number(watch("monthly_price")) || 0;
  const yearlyInput = Number(watch("yearly_price")) || 0;
  const discount = Math.min(90, Math.max(0, Number(watch("discount_percent")) || 0));
  const offerName = watch("offer_name");

  // Live preview of what vendors will see and pay
  const yearlyBase = yearlyInput > 0 ? yearlyInput : monthly * 12;
  const after = (v) => Math.round(v - (v * discount) / 100);

  function toggleFeature(key) {
    setSelectedFeatures((prev) =>
      prev.includes(key) ? prev.filter((f) => f !== key) : [...prev, key]
    );
  }

  const onSubmit = async (values) => {
    try {
      const hasDiscount = Number(values.discount_percent) > 0;
      const payload = {
        ...values,
        yearly_price: values.yearly_price ? Number(values.yearly_price) : null,
        discount_percent: Number(values.discount_percent) || 0,
        offer_name: hasDiscount ? values.offer_name || null : null,
        offer_ends_at: hasDiscount ? values.offer_ends_at || null : null,
        features: selectedFeatures,
        is_active: isActive
      };
      if (existingPlan) {
        await planService.update(existingPlan.id, payload);
        showSuccess("Plan updated");
      } else {
        await planService.create(payload);
        showSuccess("Plan created");
      }
      onSaved();
    } catch (err) {
      showError(err.response?.data?.message || "Failed to save plan");
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <Input label="Plan Name" error={errors.name?.message} {...register("name")} />
      <Input label="Description" {...register("description")} />

      <div className="grid grid-cols-2 gap-3">
        <Input label="Monthly Price (₹)" type="number" error={errors.monthly_price?.message} {...register("monthly_price")} />
        <Input label="Yearly Price (₹)" type="number" error={errors.yearly_price?.message} {...register("yearly_price")} />
      </div>
      <p className="text-xs text-gray-400 -mt-2">
        Yearly price is what vendors pay for 12 months. Leave it blank to use monthly × 12.
      </p>

      <Input label="Trial Days" type="number" {...register("trial_days")} />

      {/* ── Discount / offer ── */}
      <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-4 space-y-3">
        <p className="text-sm font-semibold text-gray-800">Discount offer (optional)</p>

        <div className="grid grid-cols-2 gap-3">
          <Input label="Discount (%)" type="number" error={errors.discount_percent?.message} {...register("discount_percent")} />
          <Input label="Offer ends on" type="date" {...register("offer_ends_at")} />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Offer name</label>
          <input
            type="text"
            placeholder="e.g. Diwali Sale"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            {...register("offer_name")}
          />
          <div className="flex flex-wrap gap-2 mt-2">
            {OFFER_PRESETS.map((preset) => (
              <button
                key={preset.label}
                type="button"
                onClick={() => setValue("offer_name", preset.label, { shouldDirty: true })}
                className={`text-xs px-3 py-1.5 rounded-full border transition-colors ${
                  offerName === preset.label
                    ? "bg-primary-600 text-white border-primary-600"
                    : "bg-white text-gray-600 border-gray-200 hover:border-primary-300"
                }`}
              >
                {preset.emoji} {preset.label}
              </button>
            ))}
          </div>
        </div>

        {monthly > 0 && (
          <div className="rounded-lg bg-white border border-gray-200 p-3 text-sm space-y-1">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide">Vendors will see</p>
            <p className="text-gray-700">
              Monthly:{" "}
              {discount > 0 && <span className="line-through text-gray-400 mr-1">{formatCurrency(monthly)}</span>}
              <strong>{formatCurrency(after(monthly))}</strong>/mo
            </p>
            <p className="text-gray-700">
              Yearly:{" "}
              {discount > 0 && <span className="line-through text-gray-400 mr-1">{formatCurrency(yearlyBase)}</span>}
              <strong>{formatCurrency(after(yearlyBase))}</strong>/yr
              <span className="text-gray-400"> (≈ {formatCurrency(after(yearlyBase) / 12)}/mo)</span>
            </p>
            {discount > 0 && (
              <p className="text-xs text-emerald-600 font-medium">
                {discount}% OFF{offerName ? ` · ${offerName}` : ""}
              </p>
            )}
          </div>
        )}
      </div>

      <label className="flex items-center gap-2 text-sm text-gray-700">
        <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />
        Active (visible to new vendors during signup)
      </label>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Features included in this plan</label>
        <div className="grid grid-cols-2 gap-2">
          {PLAN_FEATURES.map((f) => (
            <label key={f.key} className="flex items-center gap-2 text-sm text-gray-700">
              <input
                type="checkbox"
                checked={selectedFeatures.includes(f.key)}
                onChange={() => toggleFeature(f.key)}
              />
              {f.label}
            </label>
          ))}
        </div>
      </div>

      <div className="flex justify-end gap-3 pt-2">
        <Button variant="outline" type="button" onClick={onCancel}>Cancel</Button>
        <Button type="submit" loading={isSubmitting}>{existingPlan ? "Update" : "Create"} Plan</Button>
      </div>
    </form>
  );
}
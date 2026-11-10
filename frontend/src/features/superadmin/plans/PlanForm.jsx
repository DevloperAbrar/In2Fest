import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import { planSchema } from "../../../components/forms/validationSchemas";
import Input from "../../../components/common/Input";
import Button from "../../../components/common/Button";
import { planService } from "../../../services/planService";
import { showSuccess, showError } from "../../../components/common/Toast";
import { PLAN_FEATURES, PLAN_PILLARS, PLAN_PRESETS } from "../../../lib/planFeatures";
import { OFFER_PRESETS } from "../../../lib/planPricing";
import { formatCurrency } from "../../../lib/formatters";

const GST_RATE = 18;

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
  const [gstInclusive, setGstInclusive] = useState(existingPlan?.gst_inclusive === true);

  const monthly = Number(watch("monthly_price")) || 0;
  const yearlyInput = Number(watch("yearly_price")) || 0;
  const discount = Math.min(90, Math.max(0, Number(watch("discount_percent")) || 0));
  const offerName = watch("offer_name");
  const trialDays = Number(watch("trial_days")) || 0;

  // Live preview of what vendors will see and pay
  const yearlyBase = yearlyInput > 0 ? yearlyInput : monthly * 12;
  const after = (v) => Math.round(v - (v * discount) / 100);
  const gstInside = (v) => Math.round((v - v / (1 + GST_RATE / 100)) * 100) / 100;
  const withGst = (v) => Math.round(v * (1 + GST_RATE / 100));

  function toggleFeature(key) {
    setSelectedFeatures((prev) =>
      prev.includes(key) ? prev.filter((f) => f !== key) : [...prev, key]
    );
  }

  function applyPreset(preset) {
    const v = preset.values;
    const opts = { shouldDirty: true, shouldValidate: false };
    setValue("name", v.name, opts);
    setValue("description", v.description, opts);
    setValue("monthly_price", v.monthly_price, opts);
    setValue("yearly_price", v.yearly_price, opts);
    setValue("trial_days", v.trial_days, opts);
    setValue("discount_percent", v.discount_percent, opts);
    setValue("offer_name", v.offer_name, opts);
    setValue("offer_ends_at", "", opts);
    setGstInclusive(v.gst_inclusive === true);
    setSelectedFeatures(v.features);
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
        gst_inclusive: gstInclusive,
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
      {existingPlan ? (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-3.5 py-3 text-xs text-amber-800 leading-relaxed">
          Careful: features you change here apply immediately to every vendor already on this plan.
          Price changes do not affect them. To sell different features, create a new plan and untick
          Active on this one.
        </div>
      ) : (
        <div className="rounded-xl border border-gray-200 bg-gray-50 p-3.5">
          <p className="text-xs font-semibold text-gray-600 mb-2">Quick fill</p>
          <div className="flex flex-wrap gap-2">
            {PLAN_PRESETS.map((preset) => (
              <button
                key={preset.key}
                type="button"
                onClick={() => applyPreset(preset)}
                className="text-xs px-3 py-1.5 rounded-full border border-gray-300 bg-white text-gray-700 hover:border-primary-400 hover:text-primary-600 transition-colors"
              >
                {preset.label}
              </button>
            ))}
          </div>
          <p className="text-[11px] text-gray-400 mt-2">
            Fills name, price, trial, offer, GST setting and features. You can still change anything before saving.
          </p>
        </div>
      )}

      <Input label="Plan Name" error={errors.name?.message} {...register("name")} />
      <Input label="Description" {...register("description")} />

      <div className="grid grid-cols-2 gap-3">
        <Input label="Monthly Price (₹)" type="number" error={errors.monthly_price?.message} {...register("monthly_price")} />
        <Input label="Yearly Price (₹)" type="number" error={errors.yearly_price?.message} {...register("yearly_price")} />
      </div>
      <p className="text-xs text-gray-400 -mt-2">
        These are the list prices before the discount. Yearly price is what vendors pay for 12
        months. Leave it blank to use monthly x 12.
      </p>

      {/* GST setting */}
      <label className="flex items-start gap-2.5 rounded-xl border border-emerald-200 bg-emerald-50/60 p-3.5 text-sm text-gray-700">
        <input
          type="checkbox"
          className="mt-1"
          checked={gstInclusive}
          disabled={!!existingPlan}
          onChange={(e) => setGstInclusive(e.target.checked)}
        />
        <span>
          <span className="font-semibold text-gray-800">Prices include GST ({GST_RATE}%)</span>
          <span className="block text-xs text-gray-500 mt-0.5 leading-relaxed">
            {gstInclusive
              ? "The vendor pays exactly the price shown. GST is taken out of that amount, nothing is added at checkout."
              : `Not ticked: ${GST_RATE}% GST is added on top of the price at checkout.`}
          </span>
          {existingPlan && (
            <span className="block text-[11px] text-gray-400 mt-1">
              This can't be changed after the plan is created. Create a new plan if you need the other setting.
            </span>
          )}
        </span>
      </label>

      <div>
        <Input label="Free trial (days)" type="number" {...register("trial_days")} />
        <p className="text-xs text-gray-400 mt-1">
          {trialDays > 0
            ? `New vendors start with ${trialDays} free days, no payment. After that the plan locks until they pay.`
            : "0 = no trial. The vendor pays before the plan starts. Free plans always use 0."}
        </p>
      </div>

      {/* Discount / offer */}
      <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-4 space-y-3">
        <p className="text-sm font-semibold text-gray-800">Discount offer (optional)</p>

        <div className="grid grid-cols-2 gap-3">
          <Input label="Discount (%)" type="number" error={errors.discount_percent?.message} {...register("discount_percent")} />
          <Input label="Offer ends on" type="date" {...register("offer_ends_at")} />
        </div>
        <p className="text-xs text-gray-400 -mt-1">Leave "Offer ends on" empty and the offer never expires.</p>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Offer name</label>
          <input
            type="text"
            placeholder="e.g. Launch Offer"
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
              <span className="text-gray-400"> (about {formatCurrency(after(yearlyBase) / 12)}/mo)</span>
            </p>
            {discount > 0 && (
              <p className="text-xs text-emerald-600 font-medium">
                {discount}% OFF{offerName ? ` · ${offerName}` : ""}
              </p>
            )}
            <div className="border-t border-gray-100 pt-1.5 mt-1.5 text-xs text-gray-500 space-y-0.5">
              {gstInclusive ? (
                <>
                  <p>Vendor pays exactly {formatCurrency(after(yearlyBase))} per year (GST included).</p>
                  <p>
                    GST inside it: {formatCurrency(gstInside(after(yearlyBase)))}. You keep{" "}
                    {formatCurrency(after(yearlyBase) - gstInside(after(yearlyBase)))}.
                  </p>
                </>
              ) : (
                <p>
                  At checkout vendor pays {formatCurrency(withGst(after(yearlyBase)))} per year ({formatCurrency(after(yearlyBase))} + {GST_RATE}% GST).
                </p>
              )}
            </div>
          </div>
        )}
      </div>

      <label className="flex items-center gap-2 text-sm text-gray-700">
        <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />
        Active (visible to new vendors during signup)
      </label>

      <div className="space-y-4">
        <label className="block text-sm font-medium text-gray-700">Features included in this plan</label>
        {PLAN_PILLARS.map((pillar) => (
          <div key={pillar.key} className="rounded-xl border border-gray-200 p-3.5">
            <p className="text-sm font-semibold text-gray-800">{pillar.title}</p>
            <p className="text-xs text-gray-400 mb-2.5">{pillar.hint}</p>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-2">
              {PLAN_FEATURES.filter((f) => f.pillar === pillar.key).map((f) => (
                <label key={f.key} className="flex items-start gap-2 text-sm text-gray-700">
                  <input
                    type="checkbox"
                    className="mt-1"
                    checked={selectedFeatures.includes(f.key)}
                    onChange={() => toggleFeature(f.key)}
                  />
                  <span>
                    {f.label}
                    {f.hint && <span className="block text-[11px] text-gray-400 leading-snug">{f.hint}</span>}
                  </span>
                </label>
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="flex justify-end gap-3 pt-2">
        <Button variant="outline" type="button" onClick={onCancel}>Cancel</Button>
        <Button type="submit" loading={isSubmitting}>{existingPlan ? "Update" : "Create"} Plan</Button>
      </div>
    </form>
  );
}
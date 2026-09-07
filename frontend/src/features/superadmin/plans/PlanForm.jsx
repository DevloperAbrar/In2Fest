import React, { useState } from "react";
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import { planSchema } from "../../../components/forms/validationSchemas";
import Input from "../../../components/common/Input";
import Button from "../../../components/common/Button";
import { planService } from "../../../services/planService";
import { showSuccess, showError } from "../../../components/common/Toast";
import { PLAN_FEATURES } from "../../../lib/planFeatures";

export default function PlanForm({ existingPlan, onSaved, onCancel }) {
  const { register, handleSubmit, formState: { errors, isSubmitting } } = useForm({
    resolver: yupResolver(planSchema),
    defaultValues: existingPlan || { name: "", monthly_price: "", trial_days: 0, description: "" }
  });

  const [selectedFeatures, setSelectedFeatures] = useState(existingPlan?.features || []);
  const [isActive, setIsActive] = useState(existingPlan?.is_active ?? true);

  function toggleFeature(key) {
    setSelectedFeatures((prev) =>
      prev.includes(key) ? prev.filter((f) => f !== key) : [...prev, key]
    );
  }

  const onSubmit = async (values) => {
    try {
      const payload = { ...values, features: selectedFeatures, is_active: isActive };
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
      <Input label="Monthly Price (₹)" type="number" error={errors.monthly_price?.message} {...register("monthly_price")} />
      <Input label="Trial Days" type="number" {...register("trial_days")} />

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
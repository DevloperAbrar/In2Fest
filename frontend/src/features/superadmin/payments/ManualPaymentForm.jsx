import React, { useState } from "react";
import { useForm } from "react-hook-form";
import Input from "../../../components/common/Input";
import Select from "../../../components/common/Select";
import Button from "../../../components/common/Button";
import { paymentService } from "../../../services/paymentService";
import { showSuccess, showError } from "../../../components/common/Toast";

export default function ManualPaymentForm({ onSaved, onCancel }) {
  const { register, handleSubmit, formState: { isSubmitting } } = useForm();

  const onSubmit = async (values) => {
    try {
      await paymentService.recordManual(values);
      showSuccess("Payment recorded");
      onSaved();
    } catch (err) {
      showError(err.response?.data?.message || "Failed to record payment");
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      <Input label="Venue ID" {...register("venueId", { required: true })} />
      <Input label="Amount (₹)" type="number" {...register("amount", { required: true })} />
      <Select
        label="Method"
        options={[
          { value: "upi_manual", label: "UPI" },
          { value: "cash_manual", label: "Cash" },
          { value: "bank_transfer", label: "Bank Transfer" }
        ]}
        {...register("method")}
      />
      <Input label="Notes" {...register("notes")} />
      <div className="flex justify-end gap-3">
        <Button variant="outline" type="button" onClick={onCancel}>Cancel</Button>
        <Button type="submit" loading={isSubmitting}>Record Payment</Button>
      </div>
    </form>
  );
}
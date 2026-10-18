import React from "react";
import Input from "../../../components/common/Input";
import Select from "../../../components/common/Select";
import { formatCurrency } from "../../../lib/formatters";

export const EMPTY_ASSIGN = {
  plan_id: "",
  billing_cycle: "yearly",
  payment_received: false,
  payment_method: "upi_manual",
  amount: "",
  notes: ""
};

export function isPaidPlan(plan) {
  return !!plan && Number(plan.monthly_price) > 0;
}

function defaultAmount(plan, cycle) {
  if (!isPaidPlan(plan)) return "";
  const value = plan.pricing?.[cycle]?.final;
  return value ? String(value) : "";
}

// Returns an error message string, or null when the plan section is fine.
export function validateAssign(value, plans) {
  const plan = (plans || []).find((p) => p.id === value.plan_id);
  if (isPaidPlan(plan) && value.payment_received && !(Number(value.amount) > 0)) {
    return "Enter the amount received from the vendor";
  }
  return null;
}

export default function PlanAssignFields({ value, onChange, plans, loading, placeholder, error }) {
  const list = plans || [];
  const selected = list.find((p) => p.id === value.plan_id);
  const paid = isPaidPlan(selected);

  const changePlan = (e) => {
    const plan = list.find((p) => p.id === e.target.value);
    onChange({
      plan_id: e.target.value,
      amount: defaultAmount(plan, value.billing_cycle),
      payment_received: false
    });
  };

  const changeCycle = (e) => {
    onChange({ billing_cycle: e.target.value, amount: defaultAmount(selected, e.target.value) });
  };

  const planOptions = [
    { value: "", label: loading ? "Loading plans..." : placeholder || "Select a plan" },
    ...list.map((p) => ({
      value: p.id,
      label: isPaidPlan(p)
        ? `${p.name} (${formatCurrency(p.pricing?.monthly?.final)}/mo)`
        : `${p.name} (Free)`
    }))
  ];

  return (
    <div className="space-y-4 rounded-xl border border-gray-200 bg-gray-50 p-4">
      <p className="text-sm font-semibold text-gray-800">Plan</p>

      <Select label="Plan" value={value.plan_id} onChange={changePlan} options={planOptions} />

      {paid && (
        <>
          <Select
            label="Billing cycle"
            value={value.billing_cycle}
            onChange={changeCycle}
            options={[
              { value: "yearly", label: "Yearly" },
              { value: "monthly", label: "Monthly" }
            ]}
          />

          <label className="flex items-center gap-2 text-sm text-gray-700">
            <input
              type="checkbox"
              checked={value.payment_received}
              onChange={(e) => onChange({ payment_received: e.target.checked })}
            />
            Vendor has already paid us directly
          </label>

          {value.payment_received && (
            <div className="space-y-4">
              <Select
                label="Payment method"
                value={value.payment_method}
                onChange={(e) => onChange({ payment_method: e.target.value })}
                options={[
                  { value: "upi_manual", label: "UPI" },
                  { value: "cash_manual", label: "Cash" },
                  { value: "bank_transfer", label: "Bank transfer" }
                ]}
              />
              <Input
                label="Amount received (Rs)"
                type="number"
                min="0"
                value={value.amount}
                onChange={(e) => onChange({ amount: e.target.value })}
                error={error}
              />
              <Input
                label="Note (optional)"
                placeholder="e.g. UPI ref number"
                value={value.notes}
                onChange={(e) => onChange({ notes: e.target.value })}
              />
            </div>
          )}

          <p className="text-xs text-gray-400">
            The plan starts today and runs for 1 {value.billing_cycle === "yearly" ? "year" : "month"}.
            {value.payment_received
              ? " A payment record will be added to Payments."
              : " No payment record will be added."}
          </p>
        </>
      )}
    </div>
  );
}
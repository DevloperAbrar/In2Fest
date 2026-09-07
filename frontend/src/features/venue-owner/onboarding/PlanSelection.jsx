import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useFetch } from "../../../hooks/useFetch";
import Loader from "../../../components/common/Loader";
import Button from "../../../components/common/Button";
import { formatCurrency } from "../../../lib/formatters";
import { Check } from "lucide-react";
import { showError } from "../../../components/common/Toast";

export default function PlanSelection() {
  const { data: plans, loading } = useFetch("/plans");
  const [selectedPlanId, setSelectedPlanId] = useState(null);
  const navigate = useNavigate();

  const handleContinue = () => {
    if (!selectedPlanId) {
      showError("Please select a plan to continue");
      return;
    }
    navigate("/dashboard/onboarding/details", { state: { planId: selectedPlanId } });
  };

  if (loading) return <Loader fullScreen />;

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <h2 className="text-2xl font-bold text-center mb-2">Choose Your Plan</h2>
        <p className="text-gray-500 text-center mb-10">Start with a free trial, upgrade anytime.</p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {plans.map((plan) => (
            <div
              key={plan.id}
              onClick={() => setSelectedPlanId(plan.id)}
              className={`bg-white rounded-2xl p-6 border-2 cursor-pointer transition-all ${
                selectedPlanId === plan.id ? "border-primary-600 shadow-lg" : "border-gray-100"
              }`}
            >
              <h3 className="font-semibold text-lg mb-1">{plan.name}</h3>
              <p className="text-3xl font-bold mb-1">
                {formatCurrency(plan.monthly_price)}<span className="text-sm text-gray-400">/mo</span>
              </p>
              <p className="text-xs text-gray-400 mb-4">{plan.trial_days} day free trial</p>
              <ul className="space-y-2">
                {(plan.features || []).map((f, i) => (
                  <li key={i} className="flex items-center gap-2 text-sm text-gray-600">
                    <Check size={14} className="text-primary-600" /> {f}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>

        <div className="flex justify-center mt-10">
          <Button onClick={handleContinue} className="px-10">Continue</Button>
        </div>
      </div>
    </div>
  );
}
import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useFetch } from "../../../hooks/useFetch";
import Loader from "../../../components/common/Loader";
import Button from "../../../components/common/Button";
import { formatCurrency } from "../../../lib/formatters";
import logo from "../../../assets/logo.png";
import {
  Check,
  Globe,
  Star,
  Inbox,
  Users,
  Receipt,
  CalendarClock,
  LayoutGrid,
  CalendarCheck,
} from "lucide-react";
import { showError } from "../../../components/common/Toast";

// Raw feature keys from the API mapped to plain-language labels + an icon.
// Add new keys here as the backend adds features, instead of falling back
// to the raw snake_case string.
const FEATURE_META = {
  website_builder: { label: "Free branded website", icon: Globe },
  reviews: { label: "Verified reviews", icon: Star },
  inquiries: { label: "Direct inquiries", icon: Inbox },
  clients: { label: "Client management", icon: Users },
  billing: { label: "Invoicing & billing", icon: Receipt },
  slots: { label: "Live booking calendar", icon: CalendarClock },
  marketplace_profile: { label: "Marketplace listing", icon: LayoutGrid },
  bookings: { label: "Booking management", icon: CalendarCheck },
};

function getFeatureMeta(key) {
  if (FEATURE_META[key]) return FEATURE_META[key];
  const label = key
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
  return { label, icon: Check };
}

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

  const planList = plans || [];

  return (
    <div className="min-h-screen bg-[#FBF7F1]">
      <div className="pt-14 pb-8 px-4 text-center">
        <img
          src={logo}
          alt="In2Fest"
          className="h-9 w-auto mx-auto mb-8"
        />

        <h2 className="text-3xl md:text-4xl font-bold text-[#151626] tracking-tight">
          Choose your plan
        </h2>
        <p className="text-[#6B6B76] mt-3 max-w-md mx-auto">
          Start with a free trial. Change or cancel anytime — no long-term contracts.
        </p>
      </div>

      <div className="max-w-5xl mx-auto px-4 pb-20">
        <div
          className={`grid gap-6 ${
            planList.length === 2 ? "md:grid-cols-2 max-w-3xl mx-auto" : "md:grid-cols-3"
          }`}
        >
          {planList.map((plan) => {
            const isSelected = selectedPlanId === plan.id;

            return (
              <button
                type="button"
                key={plan.id}
                onClick={() => setSelectedPlanId(plan.id)}
                className={`text-left rounded-2xl p-7 bg-white border transition-all duration-200
                  ${
                    isSelected
                      ? "border-[#C1352B] ring-2 ring-[#C1352B]/20 shadow-lg"
                      : "border-[#EBE5DA] hover:border-[#D8D2C6] hover:shadow-md"
                  }`}
              >
                <h3 className="font-semibold text-lg text-[#151626]">{plan.name}</h3>

                <div className="mt-3 flex items-baseline gap-1">
                  <span className="text-3xl font-bold text-[#151626]">
                    {formatCurrency(plan.monthly_price)}
                  </span>
                  <span className="text-sm text-[#9C978C]">/mo</span>
                </div>

                <p className="text-xs mt-1 mb-6 text-[#9C978C]">
                  {plan.trial_days} day free trial
                </p>

                <ul className="space-y-3 mb-6">
                  {(plan.features || []).map((f) => {
                    const { label, icon: Icon } = getFeatureMeta(f);
                    return (
                      <li key={f} className="flex items-center gap-2.5 text-sm">
                        <span className="flex items-center justify-center w-5 h-5 rounded-full shrink-0 bg-[#FBEAE7] text-[#C1352B]">
                          <Icon size={12} strokeWidth={2.5} />
                        </span>
                        <span className="text-[#4B4A55]">{label}</span>
                      </li>
                    );
                  })}
                </ul>

                <div
                  className={`w-4 h-4 rounded-full border-2 flex items-center justify-center ${
                    isSelected ? "border-[#C1352B] bg-[#C1352B]" : "border-[#D8D2C6]"
                  }`}
                >
                  {isSelected && <Check size={10} className="text-white" strokeWidth={3} />}
                </div>
              </button>
            );
          })}
        </div>

        <div className="flex justify-center mt-12">
          <Button
            onClick={handleContinue}
            className="!bg-[#C1352B] hover:!bg-[#A82E25] !rounded-full !px-12 !py-3 !text-base"
          >
            Continue
          </Button>
        </div>
      </div>
    </div>
  );
}
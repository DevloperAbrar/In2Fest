import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useFetch } from "../../../hooks/useFetch";
import Loader from "../../../components/common/Loader";
import Button from "../../../components/common/Button";
import BillingToggle from "../../../components/common/BillingToggle";
import OfferBanner from "../../../components/common/OfferBanner";
import { formatCurrency } from "../../../lib/formatters";
import { getCyclePricing, getBestOffer, getMaxYearlySavings } from "../../../lib/planPricing";
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
  const label = key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  return { label, icon: Check };
}

export default function PlanSelection() {
  const { data: plans, loading } = useFetch("/plans");
  const [selectedPlanId, setSelectedPlanId] = useState(null);
  const [cycle, setCycle] = useState("yearly");
  const navigate = useNavigate();

  const planList = plans || [];
  const bestOffer = getBestOffer(planList);
  const maxSavings = getMaxYearlySavings(planList);

  const handleContinue = () => {
    if (!selectedPlanId) {
      showError("Please select a plan to continue");
      return;
    }
    const selectedPlan = planList.find((p) => p.id === selectedPlanId);
    navigate("/dashboard/onboarding/details", { state: { plan: selectedPlan, billingCycle: cycle } });
  };

  if (loading) return <Loader fullScreen />;

  const gridClass =
    planList.length <= 2
      ? "md:grid-cols-2 max-w-3xl"
      : planList.length === 3
      ? "md:grid-cols-3 max-w-5xl"
      : "md:grid-cols-2 lg:grid-cols-4 max-w-6xl";

  return (
    <div className="min-h-screen bg-[#FBF7F1]">
      <div className="pt-14 pb-6 px-4 text-center">
        <img src={logo} alt="In2Fest" className="h-9 w-auto mx-auto mb-8" />

        <h2 className="text-3xl md:text-4xl font-bold text-[#151626] tracking-tight">
          Choose your plan
        </h2>
        <p className="text-[#6B6B76] mt-3 max-w-md mx-auto">
          Pick the plan that fits your business. Switch or upgrade anytime — no long-term contracts.
        </p>

        <div className="max-w-3xl mx-auto mt-8">
          <OfferBanner offer={bestOffer} />
        </div>

        <div className="mt-8">
          <BillingToggle
            value={cycle}
            onChange={setCycle}
            savePercent={maxSavings}
            activeClass="bg-[#C1352B] text-white"
          />
        </div>
      </div>

      <div className="px-4 pb-20">
        <div className={`grid gap-6 mx-auto ${gridClass}`}>
          {planList.map((plan) => {
            const isSelected = selectedPlanId === plan.id;
            const price = getCyclePricing(plan, cycle);
            const isFree = Number(plan.monthly_price) === 0;

            return (
              <div
                key={plan.id}
                onClick={() => setSelectedPlanId(plan.id)}
                className={`relative cursor-pointer rounded-2xl border-2 p-6 flex flex-col transition-all ${
                  isSelected
                    ? "border-[#C1352B] bg-white shadow-lg"
                    : "border-[#EBE5DA] bg-white hover:border-[#C1352B]/40 hover:shadow-md"
                }`}
              >
                {price.hasDiscount && (
                  <span className="absolute -top-3 right-4 bg-red-600 text-white text-[11px] font-bold px-3 py-1 rounded-full shadow">
                    {price.offer.percent}% OFF
                  </span>
                )}
                {isSelected && (
                  <span className="absolute top-3 right-3 w-5 h-5 rounded-full bg-[#C1352B] flex items-center justify-center">
                    <Check size={12} className="text-white" strokeWidth={3} />
                  </span>
                )}

                <h3 className="font-bold text-[#151626] text-lg mb-2">{plan.name}</h3>

                <div className="mb-1">
                  {price.hasDiscount && (
                    <p className="text-sm text-gray-400 line-through">{formatCurrency(price.original)}</p>
                  )}
                  <div className="flex items-baseline gap-1">
                    <span className="text-2xl font-bold text-[#151626]">{formatCurrency(price.final)}</span>
                    {!isFree && (
                      <span className="text-sm text-gray-500">{price.cycleLabel}</span>
                    )}
                  </div>
                  {!isFree && (
                    <p className="text-xs text-gray-400 mt-0.5">
                      + 18% GST applicable
                    </p>
                  )}
                  {isFree && <p className="text-xs text-gray-400 mt-0.5">Free forever</p>}
                </div>

                {plan.trial_days > 0 && (
                  <p className="text-xs text-sky-600 font-medium my-2">{plan.trial_days}-day free trial</p>
                )}

                <ul className="space-y-1.5 mt-3 flex-1">
                  {(plan.features || []).map((f, i) => {
                    const meta = getFeatureMeta(f);
                    const Icon = meta.icon;
                    return (
                      <li key={i} className="flex items-center gap-2 text-xs text-gray-600">
                        <Icon size={13} className="text-emerald-500 flex-shrink-0" />
                        <span>{meta.label}</span>
                      </li>
                    );
                  })}
                </ul>
              </div>
            );
          })}
        </div>
      </div>

      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-[#EBE5DA] px-4 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <p className="text-sm text-[#6B6B76]">
            {selectedPlanId
              ? `${planList.find((p) => p.id === selectedPlanId)?.name} plan selected`
              : "Select a plan to continue"}
          </p>
          <Button
            type="button"
            onClick={handleContinue}
            disabled={!selectedPlanId}
            className="!bg-[#C1352B] hover:!bg-[#A82E25] !rounded-full !px-8"
          >
            Continue
          </Button>
        </div>
      </div>
    </div>
  );
}
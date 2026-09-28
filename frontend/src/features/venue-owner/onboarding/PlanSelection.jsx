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

            return (
              <button
                type="button"
                key={plan.id}
                onClick={() => setSelectedPlanId(plan.id)}
                className={`relative text-left rounded-2xl p-7 bg-white border transition-all duration-200 flex flex-col
                  ${
                    isSelected
                      ? "border-[#C1352B] ring-2 ring-[#C1352B]/20 shadow-lg -translate-y-1"
                      : "border-[#EBE5DA] hover:border-[#D8D2C6] hover:shadow-md"
                  }`}
              >
                {price.hasDiscount && (
                  <span className="absolute -top-3 right-5 bg-[#C1352B] text-white text-[11px] font-bold px-3 py-1 rounded-full shadow">
                    {price.offer.percent}% OFF
                  </span>
                )}

                <h3 className="font-semibold text-lg text-[#151626]">{plan.name}</h3>
                {plan.description && (
                  <p className="text-xs text-[#9C978C] mt-1 line-clamp-2 min-h-[2rem]">{plan.description}</p>
                )}

                <div className="mt-4 min-h-[5.5rem]">
                  {price.hasDiscount && (
                    <p className="text-sm text-[#9C978C] line-through">{formatCurrency(price.original)}</p>
                  )}
                  <div className="flex items-baseline gap-1">
                    <span className="text-3xl font-bold text-[#151626]">{formatCurrency(price.final)}</span>
                    <span className="text-sm text-[#9C978C]">{price.isFree ? "" : price.cycleLabel}</span>
                  </div>

                  {price.isFree ? (
                    <p className="text-xs mt-1 text-[#9C978C]">Free forever</p>
                  ) : cycle === "yearly" ? (
                    <>
                      <p className="text-xs mt-1 text-[#6B6B76]">
                        Just {formatCurrency(price.perMonth)}/mo · billed yearly
                      </p>
                      {price.savingsPercent > 0 && (
                        <p className="text-xs mt-1 font-semibold text-emerald-600">
                          You save {price.savingsPercent}% vs monthly
                        </p>
                      )}
                    </>
                  ) : (
                    <p className="text-xs mt-1 text-[#9C978C]">Billed monthly</p>
                  )}
                </div>

                <ul className="space-y-3 my-6 flex-1">
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
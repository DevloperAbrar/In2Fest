import React, { useMemo, useState } from "react";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import {
  Check,
  Minus,
  Globe,
  Star,
  Inbox,
  Users,
  Receipt,
  CalendarClock,
  LayoutGrid,
  CalendarCheck,
  Dumbbell,
  Utensils,
  Crown,
  BookOpen,
  ShieldCheck,
  RefreshCw,
  MessageCircle,
  ChevronDown,
  ArrowLeft,
  ListChecks,
  ShoppingBag,
} from "lucide-react";
import { useFetch } from "../../../hooks/useFetch";
import Loader from "../../../components/common/Loader";
import Button from "../../../components/common/Button";
import BillingToggle from "../../../components/common/BillingToggle";
import OfferBanner from "../../../components/common/OfferBanner";
import { formatCurrency } from "../../../lib/formatters";
import { getCyclePricing, getBestOffer, getMaxYearlySavings } from "../../../lib/planPricing";
import { featuresForSegment, vendorFeatureLabel } from "../../../lib/planFeatures";
import { OnboardingHeader } from "./OnboardingKit";

// Business WhatsApp number used for "Need help choosing?"
const SUPPORT_WHATSAPP = "917770972867";

const TYPE_PAGE = "/dashboard/onboarding/type";

const GROUPS = [
  { key: "found", title: "Get found online" },
  { key: "run", title: "Run your business" },
  { key: "industry", title: "Tools for your industry" },
  { key: "more", title: "More" },
];

// Order inside this object = order shown on the cards.
const FEATURE_META = {
  marketplace_profile: { label: "Marketplace listing", icon: LayoutGrid, group: "found" },
  website_builder: { label: "Your own branded website", icon: Globe, group: "found" },
  reviews: { label: "Verified customer reviews", icon: Star, group: "found" },
  inquiries: { label: "Direct customer inquiries", icon: Inbox, group: "found" },
  clients: { label: "Client management", icon: Users, group: "run" },
  bookings: { label: "Booking management", icon: CalendarCheck, group: "run" },
  slots: { label: "Live booking calendar", icon: CalendarClock, group: "run" },
  billing: { label: "Invoicing & billing", icon: Receipt, group: "run" },
  gym: { label: "Members, plans & payments", tag: "Gym", icon: Dumbbell, group: "industry" },
  gym_pro: { label: "Payment links & member card", tag: "Pro", icon: Crown, group: "industry" },
  gym_workouts: { label: "Workout plans for members", tag: "Gym", icon: ListChecks, group: "industry" },
  gym_store: { label: "Supplement store, POS & stock", tag: "Gym", icon: ShoppingBag, group: "industry" },
  library: { label: "Seats, shifts & attendance", tag: "Library", icon: BookOpen, group: "industry" },
  food: { label: "Menu, orders & table QR", tag: "Restaurant", icon: Utensils, group: "industry" },
  food_pro: { label: "POS, stock, offers & reports", tag: "Restaurant Pro", icon: Crown, group: "industry" },
};

// The small tag next to "gym" and "library" follows the vendor's business type.
const SEGMENT_TAG = { gym: "Gym", academy: "Academy", studio: "Studio", library: "Library" };
const TAGGED_BY_SEGMENT = ["gym", "library"];

const META_ORDER = Object.keys(FEATURE_META);

function getFeatureMeta(key) {
  if (FEATURE_META[key]) return FEATURE_META[key];
  // A feature added later by Super Admin still shows up, with a readable name.
  const label = key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
  return { label, icon: Check, group: "more" };
}

function featureLabelFor(key, segmentKey) {
  return vendorFeatureLabel(key, segmentKey) || getFeatureMeta(key).label;
}

function featureTagFor(key, segmentKey) {
  const meta = getFeatureMeta(key);
  if (TAGGED_BY_SEGMENT.includes(key) && SEGMENT_TAG[segmentKey]) return SEGMENT_TAG[segmentKey];
  return meta.tag;
}

function sortFeatures(keys) {
  const groupIndex = (k) => GROUPS.findIndex((g) => g.key === getFeatureMeta(k).group);
  const metaIndex = (k) => {
    const i = META_ORDER.indexOf(k);
    return i === -1 ? 999 : i;
  };
  return [...keys].sort((a, b) => groupIndex(a) - groupIndex(b) || metaIndex(a) - metaIndex(b));
}

function FeatureRow({ featureKey, dark, segmentKey }) {
  const label = featureLabelFor(featureKey, segmentKey);
  const tag = featureTagFor(featureKey, segmentKey);
  return (
    <li className="flex items-start gap-2.5 text-[13px] leading-snug">
      <span
        className={`mt-0.5 w-4 h-4 rounded-full flex items-center justify-center flex-shrink-0 ${
          dark ? "bg-emerald-400/20 text-emerald-300" : "bg-emerald-50 text-emerald-600"
        }`}
      >
        <Check size={10} strokeWidth={3.5} />
      </span>
      <span className={dark ? "text-white/85" : "text-gray-600"}>
        {label}
        {tag && (
          <span
            className={`ml-1.5 align-middle text-[10px] font-bold px-1.5 py-0.5 rounded-md ${
              dark ? "bg-white/10 text-gold-400" : "bg-gold-500/15 text-gold-600"
            }`}
          >
            {tag}
          </span>
        )}
      </span>
    </li>
  );
}

function PlanCard({ plan, previous, cycle, recommended, onChoose, segmentKey }) {
  const price = getCyclePricing(plan, cycle);
  const isFree = Number(plan.monthly_price) === 0;
  const yearly = cycle === "yearly";
  const dark = recommended;

  const features = sortFeatures(plan.features || []);
  const prevFeatures = previous?.features || [];
  const inherits =
    previous &&
    Number(previous.monthly_price) > 0 &&
    prevFeatures.length > 0 &&
    prevFeatures.every((f) => features.includes(f)) &&
    features.length > prevFeatures.length;
  const shown = inherits ? features.filter((f) => !prevFeatures.includes(f)) : features;

  const ctaClass = dark
    ? "bg-primary-600 hover:bg-primary-500 text-white shadow-lg shadow-primary-600/30"
    : isFree
    ? "border border-navy-200 text-navy-800 hover:bg-navy-50"
    : "bg-navy-900 hover:bg-navy-800 text-white";

  return (
    <div
      className={`relative flex flex-col rounded-3xl p-6 md:p-7 ${
        dark
          ? "bg-navy-900 text-white shadow-[0_24px_60px_-20px_rgba(11,14,28,0.55)] lg:-translate-y-3"
          : "bg-white border border-gray-200 shadow-card"
      }`}
    >
      {recommended && (
        <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gradient-to-r from-gold-500 to-gold-400 text-navy-900 text-[11px] font-bold uppercase tracking-wide px-3.5 py-1 rounded-full shadow">
          Most popular
        </span>
      )}

      <div className="flex items-start justify-between gap-3">
        <h3 className="font-display font-bold text-lg capitalize">{plan.name}</h3>
        {price.hasDiscount && (
          <span className="text-[11px] font-bold px-2.5 py-1 rounded-full bg-primary-600 text-white whitespace-nowrap">
            {price.offer.percent}% OFF
          </span>
        )}
      </div>
      {plan.description && (
        <p className={`text-xs mt-1 leading-snug ${dark ? "text-white/60" : "text-gray-500"}`}>
          {plan.description}
        </p>
      )}

      <div className="mt-5">
        {price.hasDiscount && (
          <p className={`text-sm line-through ${dark ? "text-white/40" : "text-gray-400"}`}>
            {formatCurrency(price.original)}
          </p>
        )}
        <div className="flex items-baseline gap-1.5">
          <span className="font-display font-bold text-4xl tracking-tight">{formatCurrency(price.final)}</span>
          {!isFree && (
            <span className={`text-sm ${dark ? "text-white/60" : "text-gray-500"}`}>{price.cycleLabel}</span>
          )}
        </div>
        <p className={`text-xs mt-1.5 ${dark ? "text-white/60" : "text-gray-500"}`}>
          {isFree
            ? "Free forever. No payment needed."
            : yearly
            ? `About ${formatCurrency(Math.round(price.perMonth))}/month, billed yearly · ${price.gstLabel}`
            : `Billed monthly · ${price.gstLabel}`}
        </p>
        <div className="flex flex-wrap gap-1.5 mt-2.5 min-h-[22px]">
          {!isFree && yearly && price.savingsPercent > 0 && (
            <span
              className={`text-[11px] font-bold px-2 py-0.5 rounded-full ${
                dark ? "bg-emerald-400/15 text-emerald-300" : "bg-emerald-50 text-emerald-700"
              }`}
            >
              Save {price.savingsPercent}% vs monthly
            </span>
          )}
          {plan.trial_days > 0 && (
            <span
              className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                dark ? "bg-sky-400/15 text-sky-300" : "bg-sky-50 text-sky-700"
              }`}
            >
              {plan.trial_days}-day free trial
            </span>
          )}
        </div>
      </div>

      <button
        type="button"
        onClick={() => onChoose(plan)}
        className={`mt-5 w-full rounded-full py-3 text-sm font-bold transition-all active:scale-[0.99] ${ctaClass}`}
      >
        {isFree
          ? "Start with free listing"
          : plan.trial_days > 0
          ? `Start ${plan.trial_days}-day free trial`
          : `Choose ${plan.name}`}
      </button>
      {!isFree && plan.trial_days > 0 && (
        <p className={`mt-2 text-center text-[11px] ${dark ? "text-white/50" : "text-gray-400"}`}>
          No payment today. Pay after your trial to keep this plan.
        </p>
      )}

      <div className={`my-6 h-px ${dark ? "bg-white/10" : "bg-gray-100"}`} />

      {inherits && (
        <p className={`text-xs font-bold mb-3 ${dark ? "text-gold-400" : "text-navy-700"}`}>
          Everything in <span className="capitalize">{previous.name}</span>, plus:
        </p>
      )}
      <ul className="space-y-2.5 flex-1">
        {shown.map((f) => (
          <FeatureRow key={f} featureKey={f} dark={dark} segmentKey={segmentKey} />
        ))}
      </ul>
    </div>
  );
}

function CompareTable({ plans, keys, segmentKey }) {
  const rows = GROUPS.map((g) => ({
    ...g,
    items: keys.filter((k) => getFeatureMeta(k).group === g.key),
  })).filter((g) => g.items.length > 0);

  return (
    <div className="overflow-x-auto rounded-2xl border border-gray-200 bg-white shadow-card">
      <table className="w-full min-w-[560px] text-sm">
        <thead>
          <tr className="border-b border-gray-100">
            <th className="text-left font-semibold text-gray-400 text-xs uppercase tracking-wide p-4 w-[40%]">
              Features
            </th>
            {plans.map((p) => (
              <th key={p.id} className="p-4 text-center font-display font-bold text-navy-900 capitalize">
                {p.name}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((g) => (
            <React.Fragment key={g.key}>
              <tr className="bg-navy-50/60">
                <td colSpan={plans.length + 1} className="px-4 py-2 text-[11px] font-bold uppercase tracking-wide text-navy-500">
                  {g.title}
                </td>
              </tr>
              {g.items.map((k) => {
                const tag = featureTagFor(k, segmentKey);
                return (
                  <tr key={k} className="border-b border-gray-50 last:border-0">
                    <td className="px-4 py-3 text-gray-700">
                      {featureLabelFor(k, segmentKey)}
                      {tag && (
                        <span className="ml-1.5 text-[10px] font-bold px-1.5 py-0.5 rounded-md bg-gold-500/15 text-gold-600">
                          {tag}
                        </span>
                      )}
                    </td>
                    {plans.map((p) => (
                      <td key={p.id} className="px-4 py-3 text-center">
                        {(p.features || []).includes(k) ? (
                          <Check size={17} className="inline text-emerald-500" strokeWidth={2.5} />
                        ) : (
                          <Minus size={16} className="inline text-gray-300" />
                        )}
                      </td>
                    ))}
                  </tr>
                );
              })}
            </React.Fragment>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function PlanSelection() {
  const navigate = useNavigate();
  const location = useLocation();

  // The business type is chosen on the previous page and arrives here through the router state.
  const categorySlug = location.state?.category || null;
  const segmentKey = location.state?.segment || null;
  const categoryName = location.state?.categoryName || "";

  const { data: plans, loading, error, refetch } = useFetch(
    categorySlug ? `/plans?category=${encodeURIComponent(categorySlug)}` : null,
    { skip: !categorySlug }
  );
  const [cycle, setCycle] = useState("yearly");
  const [showCompare, setShowCompare] = useState(false);

  // Cards show only the features that apply to this business type (no Gym Store on an Academy card).
  const planList = useMemo(
    () =>
      [...(plans || [])]
        .sort((a, b) => Number(a.monthly_price) - Number(b.monthly_price))
        .map((p) => ({ ...p, features: featuresForSegment(p.features, segmentKey) })),
    [plans, segmentKey]
  );
  const allFeatureKeys = useMemo(
    () => sortFeatures(Array.from(new Set(planList.flatMap((p) => p.features || [])))),
    [planList]
  );

  // The cheapest paid plan is the one we recommend.
  const recommendedId = planList.find((p) => Number(p.monthly_price) > 0)?.id ?? null;
  const bestOffer = getBestOffer(planList);
  const maxSavings = getMaxYearlySavings(planList);

  // No business type yet (page opened directly): go to the first step.
  if (!categorySlug) return <Navigate to={TYPE_PAGE} replace />;

  const handleChoose = (plan) => {
    // Send the plan exactly as the server returned it (with all its features).
    const original = (plans || []).find((p) => p.id === plan.id) || plan;
    navigate("/dashboard/onboarding/details", {
      state: { plan: original, billingCycle: cycle, category: categorySlug, segment: segmentKey, categoryName }
    });
  };

  if (loading) return <Loader fullScreen />;

  const gridClass =
    planList.length <= 1
      ? "max-w-md"
      : planList.length === 2
      ? "md:grid-cols-2 max-w-3xl"
      : planList.length === 3
      ? "md:grid-cols-3 max-w-5xl"
      : "md:grid-cols-2 lg:grid-cols-4 max-w-6xl";

  const whatsappHref = `https://wa.me/${SUPPORT_WHATSAPP}?text=${encodeURIComponent(
    "Hi, I need help choosing an In2Fest plan."
  )}`;

  return (
    <div className="min-h-screen bg-[#FBF7F1]">
      <div className="max-w-6xl mx-auto px-4 pt-10 pb-16">
        <OnboardingHeader step={2} />

        <div className="text-center mt-10">
          <h1 className="font-display font-bold text-navy-900 text-3xl md:text-4xl tracking-tight">
            Choose your plan
          </h1>
          <p className="text-gray-500 mt-3 max-w-md mx-auto">
            {categoryName ? `Plans for ${categoryName}. ` : ""}Switch or upgrade anytime, no long-term contracts.
          </p>
          <button
            type="button"
            onClick={() => navigate(TYPE_PAGE, { state: { category: categorySlug } })}
            className="group mt-3 inline-flex items-center gap-1.5 text-sm text-gray-400 hover:text-primary-600 transition-colors"
          >
            <ArrowLeft size={14} className="transition-transform group-hover:-translate-x-0.5" />
            Change business type
          </button>
        </div>

        {bestOffer && (
          <div className="max-w-3xl mx-auto mt-8">
            <OfferBanner offer={bestOffer} />
          </div>
        )}

        <div className="text-center mt-8">
          <BillingToggle
            value={cycle}
            onChange={setCycle}
            savePercent={maxSavings}
            activeClass="bg-primary-600 text-white"
          />
        </div>

        {error ? (
          <div className="text-center mt-12">
            <p className="text-sm text-gray-500 mb-4">{error}</p>
            <Button type="button" variant="outline" onClick={refetch}>
              Try again
            </Button>
          </div>
        ) : planList.length === 0 ? (
          <div className="max-w-md mx-auto mt-12 text-center bg-white border border-dashed border-gray-200 rounded-2xl py-10 px-5">
            <p className="text-sm text-gray-600">No plans are open for {categoryName || "this business type"} yet.</p>
            <a href={whatsappHref} target="_blank" rel="noreferrer" className="mt-3 inline-block text-sm font-semibold text-primary-600 hover:text-primary-700">
              Chat with us on WhatsApp
            </a>
          </div>
        ) : (
          <div className={`grid gap-6 mx-auto mt-12 items-stretch ${gridClass}`}>
            {planList.map((plan, i) => (
              <PlanCard
                key={plan.id}
                plan={plan}
                previous={planList[i - 1]}
                cycle={cycle}
                recommended={plan.id === recommendedId}
                onChoose={handleChoose}
                segmentKey={segmentKey}
              />
            ))}
          </div>
        )}

        {planList.length > 1 && (
          <div className="max-w-5xl mx-auto mt-10">
            <button
              type="button"
              onClick={() => setShowCompare((v) => !v)}
              className="mx-auto flex items-center gap-1.5 text-sm font-semibold text-navy-700 hover:text-primary-600 transition-colors"
              aria-expanded={showCompare}
            >
              {showCompare ? "Hide full comparison" : "Compare all features"}
              <ChevronDown size={16} className={`transition-transform ${showCompare ? "rotate-180" : ""}`} />
            </button>
            {showCompare && (
              <div className="mt-5">
                <CompareTable plans={planList} keys={allFeatureKeys} segmentKey={segmentKey} />
              </div>
            )}
          </div>
        )}

        <div className="max-w-4xl mx-auto mt-12 grid sm:grid-cols-3 gap-4 text-center sm:text-left">
          <div className="flex items-center gap-3 justify-center sm:justify-start">
            <span className="w-9 h-9 rounded-xl bg-white border border-gray-200 flex items-center justify-center text-emerald-600">
              <ShieldCheck size={17} />
            </span>
            <p className="text-xs text-gray-500 leading-snug">
              <span className="block font-semibold text-navy-900 text-[13px]">Secure payments</span>
              Paid safely through Cashfree
            </p>
          </div>
          <div className="flex items-center gap-3 justify-center sm:justify-start">
            <span className="w-9 h-9 rounded-xl bg-white border border-gray-200 flex items-center justify-center text-sky-600">
              <RefreshCw size={17} />
            </span>
            <p className="text-xs text-gray-500 leading-snug">
              <span className="block font-semibold text-navy-900 text-[13px]">Switch anytime</span>
              Upgrade or change your plan later
            </p>
          </div>
          <a
            href={whatsappHref}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-3 justify-center sm:justify-start group"
          >
            <span className="w-9 h-9 rounded-xl bg-white border border-gray-200 flex items-center justify-center text-emerald-600">
              <MessageCircle size={17} />
            </span>
            <p className="text-xs text-gray-500 leading-snug">
              <span className="block font-semibold text-navy-900 text-[13px] group-hover:text-primary-600">
                Need help choosing?
              </span>
              Chat with us on WhatsApp
            </p>
          </a>
        </div>
      </div>
    </div>
  );
}
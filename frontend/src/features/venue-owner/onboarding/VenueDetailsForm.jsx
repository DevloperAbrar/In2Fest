import React, { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import { useNavigate, useLocation } from "react-router-dom";
import { getBusinessDetailsSchema } from "../../../components/forms/validationSchemas";
import Input from "../../../components/common/Input";
import Select from "../../../components/common/Select";
import { useFetch } from "../../../hooks/useFetch";
import Loader from "../../../components/common/Loader";
import Button from "../../../components/common/Button";
import { venueService } from "../../../services/venueService";
import { paymentService } from "../../../services/paymentService";
import { openCashfreeCheckout } from "../../../lib/cashfree";
import { showSuccess, showError } from "../../../components/common/Toast";
import { useVenue } from "../../../context/VenueContext.jsx";
import {
  CATEGORY_FIELD_CONFIG,
  COMMON_FIELDS,
  getGroupForCategories,
  getMaxSecondary
} from "../../../lib/vendorCategoryConfig";
import {
  Building2, Trees, Camera, Video, Palette, UtensilsCrossed,
  Music2, Sparkles, Tent, Printer, Flame, Car, ClipboardList,
  Mic2, Gem, Cake, Gift, Store, Search, X, ArrowLeft, Check, Plus
} from "lucide-react";

const ICON_RULES = [
  [/hall/, Building2], [/lawn|farmhouse/, Trees], [/photo/, Camera],
  [/video/, Video], [/decor/, Palette], [/cater/, UtensilsCrossed],
  [/\bdj\b|band|sound/, Music2], [/makeup|mehendi|bridal/, Sparkles],
  [/tent/, Tent], [/card|print/, Printer], [/pandit|ritual/, Flame],
  [/travel|transport|\bcar\b/, Car], [/planner|event manager/, ClipboardList],
  [/anchor|emcee|choreograph/, Mic2], [/jewellery/, Gem],
  [/cake|bakery/, Cake], [/gift/, Gift]
];

function getCategoryIcon(name = "") {
  const lower = name.toLowerCase();
  const match = ICON_RULES.find(([pattern]) => pattern.test(lower));
  return match ? match[1] : Store;
}

// `total` is 3 when the main category allows extra services, otherwise 2.
function StepProgress({ step, total = 3 }) {
  return (
    <div className="flex items-center gap-2 max-w-[160px] mx-auto mb-6">
      {Array.from({ length: total }).map((_, i) => (
        <span
          key={i}
          className={`h-1 flex-1 rounded-full ${step >= i + 1 ? "bg-[#C1352B]" : "bg-[#EBE5DA]"}`}
        />
      ))}
    </div>
  );
}

function CategoryTile({ cat, selected, disabled, onClick }) {
  const Icon = getCategoryIcon(cat.name);
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      aria-pressed={selected}
      className={`relative flex flex-col items-start gap-2.5 rounded-xl p-4 text-left transition-all duration-150 border ${
        selected
          ? "border-[#C1352B] bg-[#FFFBFA] shadow-sm"
          : disabled
            ? "border-[#EBE5DA] bg-[#FAF8F4] opacity-50 cursor-not-allowed"
            : "border-[#EBE5DA] bg-white hover:border-[#D8D2C6] hover:-translate-y-0.5"
      }`}
    >
      <span className={`flex items-center justify-center w-8 h-8 rounded-lg ${selected ? "bg-[#C1352B] text-white" : "bg-[#F5F1E9] text-[#6B6B76]"}`}>
        <Icon size={16} strokeWidth={2} />
      </span>
      <span className={`text-sm font-medium ${selected ? "text-[#C1352B]" : "text-[#151626]"}`}>
        {cat.name}
      </span>
      {selected && (
        <span className="absolute top-3 right-3 w-4 h-4 rounded-full bg-[#C1352B] flex items-center justify-center">
          <Check size={10} className="text-white" strokeWidth={3} />
        </span>
      )}
    </button>
  );
}

export default function VenueDetailsForm() {
  const navigate = useNavigate();
  const location = useLocation();
  const plan = location.state?.plan;
  const planId = plan?.id;
  const billingCycle = location.state?.billingCycle === "yearly" ? "yearly" : "monthly";
  const needsPayment = !!plan && Number(plan.monthly_price) > 0;
  const { refetchVenue } = useVenue();

  // 1 = main business, 2 = extra services (optional), 3 = business details
  const [step, setStep] = useState(1);
  const [primaryCategory, setPrimaryCategory] = useState(null);
  const [secondaryCategories, setSecondaryCategories] = useState([]);
  const [search, setSearch] = useState("");
  const [secondarySearch, setSecondarySearch] = useState("");
  const [payingNow, setPayingNow] = useState(false);

  // Referral code from URL or localStorage
  const [referralCode, setReferralCode] = useState("");
  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    const urlCode = params.get("ref");
    const storedCode = localStorage.getItem("in2fest_referral_code");
    const code = urlCode || storedCode || "";
    if (urlCode) localStorage.setItem("in2fest_referral_code", urlCode);
    setReferralCode(code);
  }, []);

  const { data: categories, loading: categoriesLoading } = useFetch("/meta/categories");

  // Main category first, then any extra services (in the order the vendor added them).
  const selectedCategories = primaryCategory ? [primaryCategory, ...secondaryCategories] : [];
  const primaryCategoryRow = (categories || []).find((c) => c.slug === primaryCategory);
  // How many extra services this main category allows (set by Super Admin, 0 = single only).
  const maxSecondary = getMaxSecondary(primaryCategoryRow);
  const hasExtrasStep = maxSecondary > 0;
  const totalSteps = hasExtrasStep ? 3 : 2;

  const group = getGroupForCategories(selectedCategories, categories || []);
  const groupConfig = CATEGORY_FIELD_CONFIG[group];

  const {
    register, handleSubmit, setValue, watch,
    formState: { errors, isSubmitting }
  } = useForm({ resolver: yupResolver(getBusinessDetailsSchema(group)) });

  const [selectedStateIso, setSelectedStateIso] = useState("");
  const { data: states, loading: statesLoading } = useFetch("/meta/states");
  const { data: cities, loading: citiesLoading } = useFetch(
    selectedStateIso ? `/meta/states/${selectedStateIso}/cities` : null
  );

  const stateOptions = [
    { value: "", label: statesLoading ? "Loading states..." : "Select a state" },
    ...(states || []).map((s) => ({ value: s.iso2, label: s.name }))
  ];
  const cityOptions = [
    {
      value: "",
      label: citiesLoading ? "Loading cities..." : selectedStateIso ? "Select a city" : "Pick a state first"
    },
    ...(cities || []).map((c) => ({ value: c.name, label: c.name }))
  ];

  function handleSelectPrimary(slug) {
    const row = (categories || []).find((c) => c.slug === slug);
    const limit = getMaxSecondary(row);
    setPrimaryCategory(slug);
    // New main category: drop it from extras and trim to the new limit.
    setSecondaryCategories((prev) => prev.filter((s) => s !== slug).slice(0, limit));
    setSecondarySearch("");
  }

  function handleToggleSecondary(slug) {
    if (secondaryCategories.includes(slug)) {
      setSecondaryCategories(secondaryCategories.filter((s) => s !== slug));
      return;
    }
    if (secondaryCategories.length >= maxSecondary) {
      showError(
        `You can add up to ${maxSecondary} additional service${maxSecondary === 1 ? "" : "s"}`
      );
      return;
    }
    setSecondaryCategories([...secondaryCategories, slug]);
  }

  // Screen 1 -> screen 2 (extras) if allowed, otherwise straight to details.
  function handleContinueFromPrimary() {
    if (!primaryCategory) {
      showError("Select your main business type to continue");
      return;
    }
    setStep(hasExtrasStep ? 2 : 3);
  }

  function startCashfreePayment(venue, quote) {
    setPayingNow(true);

    // If credit covers everything
    if (quote?.is_free) {
      paymentService.verifyPayment({
        venueId: venue.id,
        planId,
        billingCycle,
        creditOnly: true
      }).then(async () => {
        localStorage.removeItem("in2fest_referral_code");
        showSuccess("Payment successful! Your page is live.");
        await refetchVenue();
        navigate("/dashboard");
      }).catch((err) => {
        showError(err.response?.data?.message || "Activation failed");
      }).finally(() => setPayingNow(false));
      return;
    }

    paymentService
      .createOrder(venue.id, planId, "/dashboard", billingCycle)
      .then(({ data }) => {
        const { orderId, paymentSessionId, mode, creditOnly: isCreditOnly, quote: serverQuote } = data.data;

        if (isCreditOnly) {
          return paymentService.verifyPayment({ venueId: venue.id, planId, billingCycle, creditOnly: true });
        }

        return new Promise((resolve, reject) => {
          openCashfreeCheckout({
            paymentSessionId,
            mode,
            onSuccess: async () => {
              try {
                await paymentService.verifyPayment({ orderId, venueId: venue.id, planId });
                resolve();
              } catch (err) {
                reject(err);
              }
            },
            onFailure: (err) => reject(new Error(err.message || "Payment failed")),
            onDismiss: () => reject(new Error("Payment cancelled"))
          });
        });
      })
      .then(async () => {
        localStorage.removeItem("in2fest_referral_code");
        showSuccess("Payment successful! Your page is live.");
        await refetchVenue();
        navigate("/dashboard");
      })
      .catch((err) => {
        showError(err.response?.data?.message || err.message || "Could not start payment");
      })
      .finally(() => setPayingNow(false));
  }

  const onSubmit = async (values) => {
    try {
      const { data } = await venueService.create({
        ...values,
        business_category: primaryCategory,
        secondary_categories: secondaryCategories,
        plan_id: planId,
        referral_code: referralCode || undefined
      });
      const venue = data.data;

      if (needsPayment) {
        startCashfreePayment(venue, null);
      } else {
        showSuccess("You're live! Let's finish setting up your page.");
        await refetchVenue();
        navigate("/dashboard");
      }
    } catch (err) {
      showError(err.response?.data?.message || "Failed to create your business profile");
    }
  };

  const animationStyles = (
    <style>{`
      @keyframes stepIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
      .step-enter { animation: stepIn 0.35s ease-out; }
    `}</style>
  );

  // ───────────────────────── Screen 1: main business ─────────────────────────
  if (step === 1) {
    const filteredPrimary = (categories || []).filter((cat) =>
      cat.name.toLowerCase().includes(search.toLowerCase())
    );

    return (
      <div className="min-h-screen bg-[#FBF7F1]">
        {animationStyles}

        <div key="step-1" className="step-enter max-w-3xl mx-auto px-4 pt-14 pb-32">
          <StepProgress step={1} total={totalSteps} />

          <p className="text-xs font-semibold tracking-wide uppercase text-[#C1352B] text-center mb-2">
            Step 1 of {totalSteps}
          </p>
          <h2 className="text-2xl md:text-3xl font-bold text-[#151626] text-center tracking-tight">
            What is your main business?
          </h2>
          <p className="text-sm text-[#6B6B76] mt-2 mb-8 text-center max-w-lg mx-auto">
            Pick the one that describes you best. This decides what your dashboard and public
            page look like.
          </p>

          <div className="relative mb-5">
            <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#9C978C]" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search business types..."
              className="w-full pl-10 pr-4 py-3 rounded-xl border border-[#EBE5DA] bg-white text-sm text-[#151626] placeholder:text-[#B4AFA2] focus:outline-none focus:border-[#C1352B] focus:ring-2 focus:ring-[#C1352B]/10"
            />
          </div>

          {categoriesLoading ? (
            <Loader />
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {filteredPrimary.map((cat) => (
                <CategoryTile
                  key={cat.slug}
                  cat={cat}
                  selected={primaryCategory === cat.slug}
                  onClick={() => handleSelectPrimary(cat.slug)}
                />
              ))}
              {filteredPrimary.length === 0 && (
                <p className="col-span-full text-center text-sm text-[#9C978C] py-8">
                  No business type matches "{search}"
                </p>
              )}
            </div>
          )}
        </div>

        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-[#EBE5DA] px-4 py-4">
          <div className="max-w-3xl mx-auto flex items-center justify-between gap-4">
            <p className="text-sm text-[#6B6B76]">
              {!primaryCategory ? (
                "Select your main business type"
              ) : hasExtrasStep ? (
                <>
                  <span className="font-medium text-[#151626]">{primaryCategoryRow?.name}</span> selected.
                  Next: add other services you offer (optional).
                </>
              ) : (
                <>
                  <span className="font-medium text-[#151626]">{primaryCategoryRow?.name}</span> selected.
                </>
              )}
            </p>
            <Button
              type="button"
              onClick={handleContinueFromPrimary}
              disabled={!primaryCategory}
              className="!bg-[#C1352B] hover:!bg-[#A82E25] !rounded-full !px-8 shrink-0"
            >
              Continue
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // ─────────────────── Screen 2: other services (optional) ───────────────────
  if (step === 2 && hasExtrasStep) {
    const secondaryPool = (categories || []).filter(
      (cat) =>
        cat.slug !== primaryCategory &&
        cat.name.toLowerCase().includes(secondarySearch.toLowerCase())
    );
    const limitReached = secondaryCategories.length >= maxSecondary;
    const MainIcon = getCategoryIcon(primaryCategoryRow?.name || "");

    return (
      <div className="min-h-screen bg-[#FBF7F1]">
        {animationStyles}

        <div key="step-2-extras" className="step-enter max-w-3xl mx-auto px-4 pt-14 pb-32">
          <StepProgress step={2} total={totalSteps} />

          <p className="text-xs font-semibold tracking-wide uppercase text-[#C1352B] text-center mb-2">
            Step 2 of {totalSteps} · Optional
          </p>
          <h2 className="text-2xl md:text-3xl font-bold text-[#151626] text-center tracking-tight">
            Do you offer other services too?
          </h2>
          <p className="text-sm text-[#6B6B76] mt-2 mb-6 text-center max-w-lg mx-auto">
            For example, a banquet hall that also provides catering or DJ. Customers searching
            for these services can find you too. You can skip this and add them later.
          </p>

          {/* Main business recap */}
          <div className="flex items-center justify-between gap-3 rounded-xl border border-[#EBE5DA] bg-white px-4 py-3 mb-5">
            <div className="flex items-center gap-3 min-w-0">
              <span className="flex items-center justify-center w-9 h-9 rounded-lg bg-[#C1352B] text-white shrink-0">
                <MainIcon size={16} strokeWidth={2} />
              </span>
              <div className="min-w-0">
                <p className="text-[11px] uppercase tracking-wide text-[#9C978C]">Your main business</p>
                <p className="text-sm font-semibold text-[#151626] truncate">{primaryCategoryRow?.name}</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setStep(1)}
              className="text-xs font-medium text-[#C1352B] hover:underline shrink-0"
            >
              Change
            </button>
          </div>

          {/* Added services + counter */}
          <div className="rounded-xl border border-dashed border-[#D8D2C6] bg-white/60 px-4 py-3 mb-5">
            <div className="flex items-center justify-between mb-2">
              <p className="text-sm font-medium text-[#151626]">Additional services</p>
              <span
                className={`text-xs font-semibold px-2.5 py-1 rounded-full ${
                  limitReached ? "bg-[#C1352B] text-white" : "bg-[#F5F1E9] text-[#6B6B76]"
                }`}
              >
                {secondaryCategories.length} of {maxSecondary} added
              </span>
            </div>

            {secondaryCategories.length === 0 ? (
              <p className="text-xs text-[#9C978C]">
                Nothing added yet. Tap a service below to add it (up to {maxSecondary}).
              </p>
            ) : (
              <div className="flex flex-wrap gap-2">
                {secondaryCategories.map((slug) => {
                  const cat = (categories || []).find((c) => c.slug === slug);
                  if (!cat) return null;
                  return (
                    <button
                      key={slug}
                      type="button"
                      onClick={() => handleToggleSecondary(slug)}
                      className="flex items-center gap-1.5 pl-3 pr-2 py-1.5 rounded-full bg-[#FBEAE7] text-[#C1352B] text-xs font-medium hover:bg-[#F5D8D3] transition-colors"
                    >
                      {cat.name}
                      <X size={12} strokeWidth={2.5} />
                    </button>
                  );
                })}
              </div>
            )}

            {limitReached && (
              <p className="text-xs text-[#C1352B] mt-2">
                Limit reached. Remove one to pick a different service.
              </p>
            )}
          </div>

          <div className="relative mb-4">
            <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-[#9C978C]" />
            <input
              type="text"
              value={secondarySearch}
              onChange={(e) => setSecondarySearch(e.target.value)}
              placeholder="Search other services..."
              className="w-full pl-10 pr-4 py-3 rounded-xl border border-[#EBE5DA] bg-white text-sm text-[#151626] placeholder:text-[#B4AFA2] focus:outline-none focus:border-[#C1352B] focus:ring-2 focus:ring-[#C1352B]/10"
            />
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {secondaryPool.map((cat) => {
              const isSelected = secondaryCategories.includes(cat.slug);
              return (
                <CategoryTile
                  key={cat.slug}
                  cat={cat}
                  selected={isSelected}
                  disabled={limitReached && !isSelected}
                  onClick={() => handleToggleSecondary(cat.slug)}
                />
              );
            })}
            {secondaryPool.length === 0 && (
              <p className="col-span-full text-center text-sm text-[#9C978C] py-8">
                No service matches "{secondarySearch}"
              </p>
            )}
          </div>
        </div>

        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-[#EBE5DA] px-4 py-4">
          <div className="max-w-3xl mx-auto flex items-center justify-between gap-4">
            <button
              type="button"
              onClick={() => setStep(1)}
              className="group flex items-center gap-1.5 text-sm text-[#6B6B76] hover:text-[#C1352B] transition-colors"
            >
              <ArrowLeft size={14} className="transition-transform group-hover:-translate-x-0.5" />
              Back
            </button>
            <Button
              type="button"
              onClick={() => setStep(3)}
              className="!bg-[#C1352B] hover:!bg-[#A82E25] !rounded-full !px-8"
            >
              {secondaryCategories.length === 0 ? "Skip for now" : "Continue"}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  // ───────────────────────── Screen 3: business details ─────────────────────────
  return (
    <div className="min-h-screen bg-[#FBF7F1]">
      {animationStyles}

      <div key="step-details" className="step-enter max-w-lg mx-auto px-4 py-14">
        <StepProgress step={totalSteps} total={totalSteps} />

        <div className="bg-white p-8 rounded-2xl border border-[#EBE5DA]">
          <button
            type="button"
            onClick={() => setStep(hasExtrasStep ? 2 : 1)}
            className="group flex items-center gap-1.5 text-sm text-[#9C978C] hover:text-[#C1352B] mb-5 transition-colors"
          >
            <ArrowLeft size={14} className="transition-transform group-hover:-translate-x-0.5" />
            {hasExtrasStep ? "Back to services" : "Change business type"}
          </button>

          <h2 className="text-xl font-bold text-[#151626] mb-1">{groupConfig.label}</h2>
          <p className="text-xs text-[#9C978C] mb-6">
            Running as:{" "}
            {selectedCategories
              .map((slug) => (categories || []).find((c) => c.slug === slug)?.name)
              .filter(Boolean)
              .join(", ")}
          </p>

          {referralCode && (
            <div className="mb-4 px-3 py-2 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-700 font-medium">
              🎉 Referral code applied: <strong>{referralCode}</strong> — you'll get 12% off your first plan!
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
            <div className="grid sm:grid-cols-2 gap-4">
              {COMMON_FIELDS.filter((field) => field.name !== "city").map((field) => (
                <Input
                  key={field.name}
                  label={field.label}
                  type={field.type}
                  error={errors[field.name]?.message}
                  {...register(field.name)}
                />
              ))}
            </div>

            <div>
              <label className="block text-sm font-medium text-[#151626] mb-1.5">City</label>
              <div className="grid grid-cols-2 gap-3">
                <Select
                  options={stateOptions}
                  value={selectedStateIso}
                  onChange={(e) => {
                    setSelectedStateIso(e.target.value);
                    setValue("city", "", { shouldValidate: false });
                  }}
                />
                <Select
                  options={cityOptions}
                  value={watch("city") || ""}
                  onChange={(e) => setValue("city", e.target.value, { shouldValidate: true })}
                  error={errors.city?.message}
                />
              </div>
            </div>

            <div className="grid sm:grid-cols-2 gap-4">
              {groupConfig.fields.map((field) => (
                <Input
                  key={field.name}
                  label={field.label}
                  type={field.type}
                  error={errors[field.name]?.message}
                  {...register(field.name)}
                />
              ))}
            </div>

            <Button
              type="submit"
              className="w-full !bg-[#C1352B] hover:!bg-[#A82E25] !rounded-full !py-3"
              loading={isSubmitting || payingNow}
            >
              {needsPayment ? "Continue to Payment" : "Create My Page"}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
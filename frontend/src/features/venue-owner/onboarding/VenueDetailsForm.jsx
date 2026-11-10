import React, { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { yupResolver } from "@hookform/resolvers/yup";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowLeft, Check, Globe, Lock, ShieldCheck } from "lucide-react";
import { getBusinessDetailsSchema } from "../../../components/forms/validationSchemas";
import { useFetch } from "../../../hooks/useFetch";
import Button from "../../../components/common/Button";
import { venueService } from "../../../services/venueService";
import { paymentService } from "../../../services/paymentService";
import { openCashfreeCheckout } from "../../../lib/cashfree";
import { showSuccess, showError } from "../../../components/common/Toast";
import { useVenue } from "../../../context/VenueContext.jsx";
import { useAuth } from "../../../context/AuthContext";
import { CATEGORY_FIELD_CONFIG, getGroupForCategories } from "../../../lib/vendorCategoryConfig";
import { getCategoryIcon, getGroup, getGroupKey } from "../../../lib/onboardingGroups";
import { getCyclePricing } from "../../../lib/planPricing";
import { formatCurrency } from "../../../lib/formatters";
import { BASE_DOMAIN, DISCOVERY_URL } from "../../../lib/constants";
import BusinessTypePicker from "./BusinessTypePicker";
import { OnboardingHeader, Field, TextInput, SelectInput } from "./OnboardingKit";

const PLAN_PAGE = "/dashboard/onboarding/plan";

// Team size and starting price are not asked here any more. Owners add them later
// in Marketplace Profile, where each business type shows the right wording.
const HIDDEN_FIELDS = ["hall_name", "team_size", "starting_price"];

const NAME_UI = {
  fitness: { label: "Gym / fitness centre name", placeholder: "e.g. Fit Zone Gym" },
  library: { label: "Library / study room name", placeholder: "e.g. Knowledge Hub Library" },
  shop: { label: "Shop name", placeholder: "e.g. Sharma Garments" },
};

const FIELD_UI = {
  primary_locality: {
    label: "Area / locality",
    placeholder: "e.g. Vijay Nagar",
    hint: "Nearby customers find you by area.",
    wide: true,
  },
  address: { label: "Full address", placeholder: "Building, street, area, pincode", wide: true },
  capacity: { label: "Guest capacity", placeholder: "e.g. 500", type: "number", inputMode: "numeric" },
  google_maps_link: {
    label: "Google Maps link",
    placeholder: "Paste your Maps link",
    hint: "Shows a map on your page.",
  },
};

function slugify(text) {
  return String(text || "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)+/g, "");
}

export default function VenueDetailsForm() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user } = useAuth();
  const { refetchVenue } = useVenue();

  const plan = location.state?.plan;
  const planId = plan?.id;
  const billingCycle = location.state?.billingCycle === "yearly" ? "yearly" : "monthly";
  const needsPayment = !!plan && Number(plan.monthly_price) > 0;
  // Paid plan with trial days: vendor starts free now and pays later from Settings > Subscription.
  const trialDays = needsPayment ? Number(plan?.trial_days) || 0 : 0;
  const hasTrial = trialDays > 0;
  const paysNow = needsPayment && !hasTrial;
  const price = plan ? getCyclePricing(plan, billingCycle) : null;
  const hasWebsite = (plan?.features || []).includes("website_builder");

  // 1 = business type, 2 = business details
  const [step, setStep] = useState(1);
  const [primaryCategory, setPrimaryCategory] = useState(null);
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

  useEffect(() => {
    window.scrollTo({ top: 0 });
  }, [step]);

  const { data: categories, loading: categoriesLoading } = useFetch("/meta/categories");

  const primaryRow = (categories || []).find((c) => c.slug === primaryCategory);
  const group = getGroupForCategories(primaryCategory ? [primaryCategory] : [], categories || []);
  const groupConfig = CATEGORY_FIELD_CONFIG[group];
  const groupKey = primaryRow ? getGroupKey(primaryRow) : "other";
  const nameUi = group === "venue" ? null : NAME_UI[groupKey];

  const {
    register, handleSubmit, setValue, watch,
    formState: { errors, isSubmitting }
  } = useForm({
    resolver: yupResolver(getBusinessDetailsSchema(group)),
    defaultValues: { owner_name: user?.name || "" }
  });

  const [selectedStateIso, setSelectedStateIso] = useState("");
  const { data: states, loading: statesLoading } = useFetch("/meta/states");
  const { data: cities, loading: citiesLoading } = useFetch(
    selectedStateIso ? `/meta/states/${selectedStateIso}/cities` : null
  );

  const stateOptions = [
    { value: "", label: statesLoading ? "Loading states..." : "Select state" },
    ...(states || []).map((s) => ({ value: s.iso2, label: s.name }))
  ];
  const cityOptions = [
    {
      value: "",
      label: citiesLoading ? "Loading cities..." : selectedStateIso ? "Select city" : "Pick a state first"
    },
    ...(cities || []).map((c) => ({ value: c.name, label: c.name }))
  ];

  const phoneField = register("phone");
  const businessName = watch("hall_name");
  const siteSlug = slugify(businessName) || "your-business";

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
        const { orderId, paymentSessionId, mode, creditOnly: isCreditOnly } = data.data;

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
        secondary_categories: [],
        plan_id: planId,
        billing_cycle: billingCycle,
        referral_code: referralCode || undefined
      });
      const venue = data.data;

      if (paysNow) {
        startCashfreePayment(venue, null);
      } else {
        showSuccess(
          hasTrial
            ? `Your ${trialDays}-day free trial has started!`
            : "You're live! Let's finish setting up your page."
        );
        await refetchVenue();
        navigate("/dashboard");
      }
    } catch (err) {
      showError(err.response?.data?.message || "Failed to create your business profile");
    }
  };

  // Details need the plan chosen on the previous page. Without it, start again from plans.
  if (!plan) return <Navigate to={PLAN_PAGE} replace />;

  // ───────────────────────── Step 2 of 3: business type ─────────────────────────
  if (step === 1) {
    return (
      <BusinessTypePicker
        categories={categories}
        loading={categoriesLoading}
        selected={primaryCategory}
        onSelect={setPrimaryCategory}
        onBack={() => navigate(PLAN_PAGE)}
        onContinue={() => {
          if (!primaryCategory) {
            showError("Select your business type to continue");
            return;
          }
          setStep(2);
        }}
      />
    );
  }

  // ───────────────────────── Step 3 of 3: business details ─────────────────────────
  const TypeIcon = getCategoryIcon(primaryRow || {});
  const typeGroup = getGroup(groupKey);
  const extraFields = groupConfig.fields.filter((f) => !HIDDEN_FIELDS.includes(f.name));
  const hallField = groupConfig.fields.find((f) => f.name === "hall_name");

  return (
    <div className="min-h-screen bg-[#FBF7F1]">
      <div className="max-w-5xl mx-auto px-4 pt-10 pb-16">
        <OnboardingHeader step={3} />

        <motion.div
          key="details"
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
          className="grid lg:grid-cols-[minmax(0,1fr)_340px] gap-6 mt-10 items-start"
        >
          {/* ───────── Form ───────── */}
          <div className="bg-white rounded-3xl border border-gray-200 shadow-card p-6 md:p-8">
            <button
              type="button"
              onClick={() => setStep(1)}
              className="group flex items-center gap-1.5 text-sm text-gray-400 hover:text-primary-600 mb-5 transition-colors"
            >
              <ArrowLeft size={14} className="transition-transform group-hover:-translate-x-0.5" />
              Change business type
            </button>

            <h1 className="font-display font-bold text-navy-900 text-2xl tracking-tight">Business details</h1>
            <div className="flex items-center gap-2 mt-2">
              <span
                className="w-6 h-6 rounded-md flex items-center justify-center"
                style={{ background: typeGroup.tint, color: typeGroup.ink }}
              >
                <TypeIcon size={14} strokeWidth={2} />
              </span>
              <p className="text-sm text-gray-500">
                Setting up as <span className="font-semibold text-navy-900">{primaryRow?.name}</span>
              </p>
            </div>

            {referralCode && (
              <div className="mt-5 px-3.5 py-2.5 bg-emerald-50 border border-emerald-200 rounded-xl text-xs text-emerald-700 font-medium">
                Referral code applied: <strong>{referralCode}</strong>. You'll get 12% off your first plan!
              </div>
            )}

            <form onSubmit={handleSubmit(onSubmit)} className="mt-7 grid sm:grid-cols-2 gap-x-4 gap-y-5" noValidate>
              <div className="sm:col-span-2">
                <Field label={nameUi?.label || hallField?.label || "Business name"} error={errors.hall_name?.message}>
                  <TextInput
                    invalid={!!errors.hall_name}
                    placeholder={nameUi?.placeholder || "Your business name"}
                    autoComplete="organization"
                    {...register("hall_name")}
                  />
                </Field>
              </div>

              <Field label="Owner name" error={errors.owner_name?.message}>
                <TextInput
                  invalid={!!errors.owner_name}
                  placeholder="Your full name"
                  autoComplete="name"
                  {...register("owner_name")}
                />
              </Field>

              <Field
                label="Phone number"
                error={errors.phone?.message}
                hint="Customers and our team will contact you on this number."
              >
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[15px] text-gray-400 select-none">
                    +91
                  </span>
                  <TextInput
                    invalid={!!errors.phone}
                    className="!pl-12"
                    type="tel"
                    inputMode="numeric"
                    autoComplete="tel-national"
                    maxLength={10}
                    placeholder="10-digit mobile number"
                    {...phoneField}
                    onChange={(e) => {
                      e.target.value = e.target.value.replace(/\D/g, "").slice(0, 10);
                      phoneField.onChange(e);
                    }}
                  />
                </div>
              </Field>

              <div className="sm:col-span-2">
                <Field label="City" error={errors.city?.message}>
                  <div className="grid grid-cols-2 gap-3">
                    <SelectInput
                      options={stateOptions}
                      value={selectedStateIso}
                      onChange={(e) => {
                        setSelectedStateIso(e.target.value);
                        setValue("city", "", { shouldValidate: false });
                      }}
                    />
                    <SelectInput
                      invalid={!!errors.city}
                      options={cityOptions}
                      value={watch("city") || ""}
                      onChange={(e) => setValue("city", e.target.value, { shouldValidate: true })}
                    />
                  </div>
                </Field>
              </div>

              {extraFields.map((field) => {
                const ui = FIELD_UI[field.name] || {};
                return (
                  <div key={field.name} className={ui.wide ? "sm:col-span-2" : ""}>
                    <Field
                      label={ui.label || field.label}
                      hint={ui.hint}
                      optional={!field.required}
                      error={errors[field.name]?.message}
                    >
                      <TextInput
                        invalid={!!errors[field.name]}
                        type={ui.type || field.type}
                        inputMode={ui.inputMode}
                        placeholder={ui.placeholder}
                        {...register(field.name)}
                      />
                    </Field>
                  </div>
                );
              })}

              <div className="sm:col-span-2 mt-1">
                <Button
                  type="submit"
                  className="w-full !rounded-full !py-3.5 !text-[15px] !font-bold"
                  loading={isSubmitting || payingNow}
                >
                  {!(isSubmitting || payingNow) && paysNow && <Lock size={15} />}
                  {paysNow
                    ? "Continue to payment"
                    : hasTrial
                    ? `Start ${trialDays}-day free trial`
                    : "Create my page"}
                </Button>
                {hasTrial && (
                  <p className="text-center text-xs text-gray-500 mt-3">
                    No payment today. We remind you before the trial ends.
                  </p>
                )}
                <p className="text-center text-[11px] text-gray-400 mt-3 leading-relaxed">
                  By continuing you agree to our{" "}
                  <a href={`${DISCOVERY_URL}/terms`} target="_blank" rel="noreferrer" className="underline hover:text-primary-600">
                    Terms
                  </a>{" "}
                  and{" "}
                  <a href={`${DISCOVERY_URL}/privacy`} target="_blank" rel="noreferrer" className="underline hover:text-primary-600">
                    Privacy Policy
                  </a>
                  .
                </p>
              </div>
            </form>
          </div>

          {/* ───────── Summary ───────── */}
          <aside className="space-y-4 lg:sticky lg:top-6">
            <div className="rounded-3xl bg-navy-900 text-white p-6">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-[11px] uppercase tracking-wide font-semibold text-white/50">Your plan</p>
                  <h3 className="font-display font-bold text-xl capitalize mt-1">{plan.name}</h3>
                </div>
                <button
                  type="button"
                  onClick={() => navigate(PLAN_PAGE)}
                  className="text-xs font-semibold text-gold-400 hover:underline"
                >
                  Change
                </button>
              </div>

              {needsPayment ? (
                <div className="mt-4">
                  {hasTrial && (
                    <p className="inline-block text-[11px] font-bold px-2.5 py-1 rounded-full bg-emerald-400/15 text-emerald-300 mb-2">
                      {trialDays} days free
                    </p>
                  )}
                  <div className="flex items-baseline gap-1.5">
                    <span className="font-display font-bold text-3xl">{formatCurrency(price.final)}</span>
                    <span className="text-sm text-white/60">{price.cycleLabel}</span>
                  </div>
                  <p className="text-xs text-white/60 mt-1">
                    {hasTrial ? "after your free trial" : "billed " + billingCycle} · {price.gstLabel}
                  </p>
                </div>
              ) : (
                <p className="mt-4 text-sm text-white/70">Free forever. No payment needed.</p>
              )}

              {needsPayment && (
                <div className="flex items-center gap-2 mt-5 pt-4 border-t border-white/10 text-xs text-white/60">
                  <ShieldCheck size={14} className="text-emerald-400 flex-shrink-0" />
                  {hasTrial ? "No payment needed to start" : "Pay securely online in the next step"}
                </div>
              )}
            </div>

            {hasWebsite && (
              <div className="rounded-3xl bg-white border border-gray-200 p-5">
                <div className="flex items-center gap-2 text-navy-900">
                  <Globe size={16} className="text-primary-600" />
                  <p className="text-sm font-semibold">Your free website</p>
                </div>
                <p className="mt-2 text-[13px] font-mono text-navy-700 break-all">
                  {siteSlug}.{BASE_DOMAIN}
                </p>
                <p className="text-[11px] text-gray-400 mt-1.5">
                  Made from your business name. You can edit it later.
                </p>
              </div>
            )}

            <div className="rounded-3xl bg-white border border-gray-200 p-5">
              <p className="text-sm font-semibold text-navy-900 mb-3">What happens next</p>
              <ul className="space-y-2.5">
                {[
                  paysNow
                    ? "You complete the payment"
                    : hasTrial
                    ? `Your ${trialDays}-day free trial starts right away`
                    : "Your page goes live instantly",
                  "Your dashboard opens, ready to use",
                  hasTrial
                    ? "Pay from Settings → Subscription to keep your plan after the trial"
                    : "Add photos, timings and pricing at your pace",
                ].map((text) => (
                  <li key={text} className="flex items-start gap-2.5 text-[13px] text-gray-600 leading-snug">
                    <span className="mt-0.5 w-4 h-4 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center flex-shrink-0">
                      <Check size={10} strokeWidth={3.5} />
                    </span>
                    {text}
                  </li>
                ))}
              </ul>
            </div>
          </aside>
        </motion.div>
      </div>
    </div>
  );
}
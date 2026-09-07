import React, { useState } from "react";
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
import { showSuccess, showError } from "../../../components/common/Toast";
import { useVenue } from "../../../context/VenueContext.jsx";
import {
  CATEGORY_FIELD_CONFIG,
  COMMON_FIELDS,
  getGroupForCategories,
  getPrimaryCategory
} from "../../../lib/vendorCategoryConfig";
import {
  Building2,
  Trees,
  Camera,
  Video,
  Palette,
  UtensilsCrossed,
  Music2,
  Sparkles,
  Tent,
  Printer,
  Flame,
  Car,
  ClipboardList,
  Mic2,
  Gem,
  Cake,
  Gift,
  Store,
  Search,
  X,
  ArrowLeft,
  Check
} from "lucide-react";

// Keyword -> icon lookup so every category gets something more specific
// than a generic placeholder, without needing icon data from the backend.
const ICON_RULES = [
  [/hall/, Building2],
  [/lawn|farmhouse/, Trees],
  [/photo/, Camera],
  [/video/, Video],
  [/decor/, Palette],
  [/cater/, UtensilsCrossed],
  [/\bdj\b|band|sound/, Music2],
  [/makeup|mehendi|bridal/, Sparkles],
  [/tent/, Tent],
  [/card|print/, Printer],
  [/pandit|ritual/, Flame],
  [/travel|transport|\bcar\b/, Car],
  [/planner|event manager/, ClipboardList],
  [/anchor|emcee|choreograph/, Mic2],
  [/jewellery/, Gem],
  [/cake|bakery/, Cake],
  [/gift/, Gift]
];

function getCategoryIcon(name = "") {
  const lower = name.toLowerCase();
  const match = ICON_RULES.find(([pattern]) => pattern.test(lower));
  return match ? match[1] : Store;
}

function StepProgress({ step }) {
  return (
    <div className="flex items-center gap-2 max-w-[120px] mx-auto mb-6">
      <span className={`h-1 flex-1 rounded-full ${step >= 1 ? "bg-[#C1352B]" : "bg-[#EBE5DA]"}`} />
      <span className={`h-1 flex-1 rounded-full ${step >= 2 ? "bg-[#C1352B]" : "bg-[#EBE5DA]"}`} />
    </div>
  );
}

export default function VenueDetailsForm() {
  const navigate = useNavigate();
  const location = useLocation();
  const planId = location.state?.planId;
  const { refetchVenue } = useVenue();

  const [step, setStep] = useState(1);
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [search, setSearch] = useState("");

  // Live category list  - pulled from Category Manager via the DB, not
  // hardcoded. Any category an admin adds/edits/deletes shows up here
  // immediately without a frontend deploy.
  const { data: categories, loading: categoriesLoading } = useFetch("/meta/categories");

  const group = getGroupForCategories(selectedCategories, categories || []);
  const groupConfig = CATEGORY_FIELD_CONFIG[group];

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors, isSubmitting }
  } = useForm({
    resolver: yupResolver(getBusinessDetailsSchema(group))
  });

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

  function handleToggleCategory(slug) {
    setSelectedCategories((prev) =>
      prev.includes(slug) ? prev.filter((s) => s !== slug) : [...prev, slug]
    );
  }

  function handleContinue() {
    if (selectedCategories.length === 0) {
      showError("Select at least one business type to continue");
      return;
    }
    setStep(2);
  }

  const onSubmit = async (values) => {
    try {
      const primaryCategory = getPrimaryCategory(selectedCategories, categories || []);
      const secondaryCategories = selectedCategories.filter((slug) => slug !== primaryCategory);

      await venueService.create({
        ...values,
        business_category: primaryCategory,
        secondary_categories: secondaryCategories,
        plan_id: planId
      });
      showSuccess("You're live! Let's finish setting up your page.");
      await refetchVenue();
      navigate("/dashboard");
    } catch (err) {
      showError(err.response?.data?.message || "Failed to create your business profile");
    }
  };

  const filteredCategories = (categories || []).filter((cat) =>
    cat.name.toLowerCase().includes(search.toLowerCase())
  );

  if (step === 1) {
    return (
      <div className="min-h-screen bg-[#FBF7F1]">
        <style>{`
          @keyframes stepIn {
            from { opacity: 0; transform: translateY(10px); }
            to { opacity: 1; transform: translateY(0); }
          }
          .step-enter { animation: stepIn 0.35s ease-out; }
        `}</style>

        <div key="step-1" className="step-enter max-w-3xl mx-auto px-4 pt-14 pb-32">
          <StepProgress step={1} />

          <h2 className="text-2xl md:text-3xl font-bold text-[#151626] text-center tracking-tight">
            What kind of business do you run?
          </h2>
          <p className="text-sm text-[#6B6B76] mt-2 mb-8 text-center max-w-lg mx-auto">
            This decides what your dashboard and public page look like. You can pick more than
            one — e.g. Marriage Hall + Caterer.
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

          {selectedCategories.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-6">
              {selectedCategories.map((slug) => {
                const cat = (categories || []).find((c) => c.slug === slug);
                if (!cat) return null;
                return (
                  <button
                    key={slug}
                    type="button"
                    onClick={() => handleToggleCategory(slug)}
                    className="flex items-center gap-1.5 pl-3 pr-2 py-1.5 rounded-full bg-[#FBEAE7] text-[#C1352B] text-xs font-medium hover:bg-[#F5D8D3] transition-colors"
                  >
                    {cat.name}
                    <X size={12} strokeWidth={2.5} />
                  </button>
                );
              })}
            </div>
          )}

          {categoriesLoading ? (
            <Loader />
          ) : (
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              {filteredCategories.map((cat) => {
                const isSelected = selectedCategories.includes(cat.slug);
                const Icon = getCategoryIcon(cat.name);
                return (
                  <button
                    key={cat.slug}
                    type="button"
                    onClick={() => handleToggleCategory(cat.slug)}
                    aria-pressed={isSelected}
                    className={`relative flex flex-col items-start gap-2.5 rounded-xl p-4 text-left transition-all duration-150 border ${
                      isSelected
                        ? "border-[#C1352B] bg-[#FFFBFA] shadow-sm"
                        : "border-[#EBE5DA] bg-white hover:border-[#D8D2C6] hover:-translate-y-0.5"
                    }`}
                  >
                    <span
                      className={`flex items-center justify-center w-8 h-8 rounded-lg ${
                        isSelected ? "bg-[#C1352B] text-white" : "bg-[#F5F1E9] text-[#6B6B76]"
                      }`}
                    >
                      <Icon size={16} strokeWidth={2} />
                    </span>
                    <span
                      className={`text-sm font-medium ${
                        isSelected ? "text-[#C1352B]" : "text-[#151626]"
                      }`}
                    >
                      {cat.name}
                    </span>

                    {isSelected && (
                      <span className="absolute top-3 right-3 w-4 h-4 rounded-full bg-[#C1352B] flex items-center justify-center">
                        <Check size={10} className="text-white" strokeWidth={3} />
                      </span>
                    )}
                  </button>
                );
              })}

              {filteredCategories.length === 0 && (
                <p className="col-span-full text-center text-sm text-[#9C978C] py-8">
                  No business type matches "{search}"
                </p>
              )}
            </div>
          )}
        </div>

        <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-[#EBE5DA] px-4 py-4">
          <div className="max-w-3xl mx-auto flex items-center justify-between">
            <p className="text-sm text-[#6B6B76]">
              {selectedCategories.length === 0
                ? "Select at least one"
                : `${selectedCategories.length} selected`}
            </p>
            <Button
              type="button"
              onClick={handleContinue}
              disabled={selectedCategories.length === 0}
              className="!bg-[#C1352B] hover:!bg-[#A82E25] !rounded-full !px-8"
            >
              Continue
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FBF7F1]">
      <style>{`
        @keyframes stepIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .step-enter { animation: stepIn 0.35s ease-out; }
      `}</style>

      <div key="step-2" className="step-enter max-w-lg mx-auto px-4 py-14">
        <StepProgress step={2} />

        <div className="bg-white p-8 rounded-2xl border border-[#EBE5DA]">
          <button
            type="button"
            onClick={() => setStep(1)}
            className="group flex items-center gap-1.5 text-sm text-[#9C978C] hover:text-[#C1352B] mb-5 transition-colors"
          >
            <ArrowLeft size={14} className="transition-transform group-hover:-translate-x-0.5" />
            Change business type(s)
          </button>

          <h2 className="text-xl font-bold text-[#151626] mb-1">{groupConfig.label}</h2>
          <p className="text-xs text-[#9C978C] mb-6">
            Running as:{" "}
            {selectedCategories
              .map((slug) => (categories || []).find((c) => c.slug === slug)?.name)
              .filter(Boolean)
              .join(", ")}
          </p>

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
              loading={isSubmitting}
            >
              Create My Page
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
import React, { useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Check } from "lucide-react";
import { useFetch } from "../../../hooks/useFetch";
import Loader from "../../../components/common/Loader";
import Button from "../../../components/common/Button";
import { OnboardingHeader } from "./OnboardingKit";
import { ONBOARDING_SEGMENTS } from "../../../lib/onboardingSegments";
import { getCategoryIcon } from "../../../lib/onboardingGroups";

const PLAN_PAGE = "/dashboard/onboarding/plan";

function SegmentCard({ seg, active, onClick }) {
  const Icon = seg.icon;
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`relative text-left rounded-2xl border p-5 transition-all ${
        active
          ? "bg-white border-navy-900 shadow-card ring-4 ring-navy-900/5"
          : "bg-white border-gray-200 hover:border-gray-300 hover:-translate-y-0.5 hover:shadow-card"
      }`}
    >
      {active && (
        <span className="absolute top-3 right-3 w-5 h-5 rounded-full bg-primary-600 flex items-center justify-center">
          <Check size={12} className="text-white" strokeWidth={3} />
        </span>
      )}
      <span
        className="w-11 h-11 rounded-xl flex items-center justify-center"
        style={{ background: seg.tint, color: seg.ink }}
      >
        <Icon size={22} strokeWidth={1.9} />
      </span>
      <p className="mt-3 font-display font-bold text-navy-900 text-[15px] leading-tight">{seg.title}</p>
      <p className="text-xs text-gray-500 mt-1 leading-snug">{seg.blurb}</p>
      {Array.isArray(seg.examples) && seg.examples.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {seg.examples.map((name) => (
            <span
              key={name}
              className="text-[11px] font-medium px-2 py-0.5 rounded-full border border-gray-200 bg-gray-50 text-gray-600"
            >
              {name}
            </span>
          ))}
        </div>
      )}
    </button>
  );
}

export default function BusinessTypeSelection() {
  const navigate = useNavigate();
  const location = useLocation();
  const { data: categories, loading } = useFetch("/meta/categories");
  const [selectedSlug, setSelectedSlug] = useState(location.state?.category || null);
  const [activeKey, setActiveKey] = useState(null);

  // Live categories grouped by their segment. Only the segments listed in ONBOARDING_SEGMENTS are offered.
  const bySegment = useMemo(() => {
    const map = {};
    ONBOARDING_SEGMENTS.forEach((s) => {
      map[s.key] = [];
    });
    (categories || []).forEach((cat) => {
      const live = !cat.launch_status || cat.launch_status === "live";
      if (live && map[cat.segment_key]) map[cat.segment_key].push(cat);
    });
    return map;
  }, [categories]);

  const visibleSegments = ONBOARDING_SEGMENTS.filter((s) => bySegment[s.key].length > 0);
  const selectedCat = (categories || []).find(
    (c) => c.slug === selectedSlug && c.segment_key && bySegment[c.segment_key]
  );
  const currentKey = activeKey || selectedCat?.segment_key || null;
  const currentList = currentKey ? bySegment[currentKey] || [] : [];

  const handleSegment = (seg) => {
    setActiveKey(seg.key);
    const list = bySegment[seg.key];
    // One category in the group (the normal case): it is picked straight away.
    if (list.length === 1) setSelectedSlug(list[0].slug);
    else if (selectedCat?.segment_key !== seg.key) setSelectedSlug(null);
  };

  const handleContinue = () => {
    if (!selectedCat) return;
    navigate(PLAN_PAGE, {
      state: { category: selectedCat.slug, segment: selectedCat.segment_key, categoryName: selectedCat.name }
    });
  };

  return (
    <div className="min-h-screen bg-[#FBF7F1]">
      <div className="max-w-4xl mx-auto px-4 pt-10 pb-36">
        <OnboardingHeader step={1} />

        <div className="text-center mt-10">
          <h1 className="font-display font-bold text-navy-900 text-2xl md:text-4xl tracking-tight">
            What kind of business do you run?
          </h1>
          <p className="text-sm md:text-base text-gray-500 mt-3 max-w-xl mx-auto">
            Pick one. We show the plans and tools that fit your business.
          </p>
        </div>

        {loading ? (
          <div className="py-16">
            <Loader />
          </div>
        ) : visibleSegments.length === 0 ? (
          <div className="text-center bg-white border border-dashed border-gray-200 rounded-2xl py-10 px-4 mt-10">
            <p className="text-sm text-gray-500">No business types are open for sign-up right now. Please contact support.</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-8">
              {visibleSegments.map((seg) => (
                <SegmentCard key={seg.key} seg={seg} active={currentKey === seg.key} onClick={() => handleSegment(seg)} />
              ))}
            </div>

            {currentList.length > 1 && (
              <div className="mt-6">
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-3">Choose your exact type</p>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {currentList.map((cat) => {
                    const Icon = getCategoryIcon(cat);
                    const on = selectedCat?.slug === cat.slug;
                    return (
                      <button
                        key={cat.slug}
                        type="button"
                        onClick={() => setSelectedSlug(cat.slug)}
                        aria-pressed={on}
                        className={`flex items-center gap-3 rounded-2xl border p-3.5 text-left transition-all ${
                          on
                            ? "border-primary-600 bg-primary-50/40 ring-4 ring-primary-600/10"
                            : "border-gray-200 bg-white hover:border-gray-300"
                        }`}
                      >
                        <Icon size={20} strokeWidth={1.9} className={on ? "text-primary-600" : "text-gray-500"} />
                        <span className={`text-sm font-semibold ${on ? "text-primary-700" : "text-navy-900"}`}>{cat.name}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </>
        )}
      </div>

      <div className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur border-t border-gray-200 px-4 py-3.5 z-20">
        <div className="max-w-4xl mx-auto flex items-center justify-between gap-4">
          <p className="text-sm text-gray-500 truncate">
            {selectedCat ? (
              <>
                <span className="font-semibold text-navy-900">{selectedCat.name}</span> selected
              </>
            ) : (
              "Select your business type"
            )}
          </p>
          <Button
            type="button"
            onClick={handleContinue}
            disabled={!selectedCat}
            className="!rounded-full !px-8 !py-3 shrink-0"
          >
            Continue
          </Button>
        </div>
      </div>
    </div>
  );
}
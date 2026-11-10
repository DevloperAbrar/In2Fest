import React, { useMemo, useState } from "react";
import { ArrowLeft, Check, Search } from "lucide-react";
import Loader from "../../../components/common/Loader";
import Button from "../../../components/common/Button";
import { OnboardingHeader } from "./OnboardingKit";
import {
  BUSINESS_GROUPS,
  getCategoryIcon,
  getGroup,
  getGroupKey
} from "../../../lib/onboardingGroups";

function GroupCard({ group, count, active, onClick }) {
  const Icon = group.icon;
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`relative text-left rounded-2xl border p-4 transition-all ${
        active
          ? "bg-white border-navy-900 shadow-card ring-4 ring-navy-900/5"
          : "bg-white border-gray-200 hover:border-gray-300 hover:-translate-y-0.5 hover:shadow-card"
      }`}
    >
      {group.suite && (
        <span className="absolute top-3 right-3 text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full bg-gold-500/15 text-gold-600">
          Full software
        </span>
      )}
      <span
        className="w-11 h-11 rounded-xl flex items-center justify-center"
        style={{ background: group.tint, color: group.ink }}
      >
        <Icon size={22} strokeWidth={1.9} />
      </span>
      <p className="mt-3 font-display font-bold text-navy-900 text-[15px] leading-tight">{group.title}</p>
      <p className="text-xs text-gray-500 mt-1 leading-snug">{group.blurb}</p>
      <p className="text-[11px] text-gray-400 mt-2">{count} {count === 1 ? "type" : "types"}</p>
    </button>
  );
}

function TypeTile({ cat, selected, onClick, showGroup }) {
  const Icon = getCategoryIcon(cat);
  const group = getGroup(getGroupKey(cat));
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={selected}
      className={`relative flex items-center gap-3 rounded-2xl border p-3.5 text-left transition-all ${
        selected
          ? "border-primary-600 bg-primary-50/40 shadow-sm ring-4 ring-primary-600/10"
          : "border-gray-200 bg-white hover:border-gray-300 hover:-translate-y-0.5"
      }`}
    >
      <span
        className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
        style={
          selected
            ? { background: "#c81322", color: "#fff" }
            : { background: group.tint, color: group.ink }
        }
      >
        <Icon size={20} strokeWidth={1.9} />
      </span>
      <span className="min-w-0">
        <span className={`block text-sm font-semibold leading-tight ${selected ? "text-primary-700" : "text-navy-900"}`}>
          {cat.name}
        </span>
        {showGroup && <span className="block text-[11px] text-gray-400 mt-0.5">{group.title}</span>}
      </span>
      {selected && (
        <span className="absolute top-2.5 right-2.5 w-5 h-5 rounded-full bg-primary-600 flex items-center justify-center">
          <Check size={12} className="text-white" strokeWidth={3} />
        </span>
      )}
    </button>
  );
}

export default function BusinessTypePicker({ categories, loading, selected, onSelect, onBack, onContinue }) {
  const [activeKey, setActiveKey] = useState(null);
  const [query, setQuery] = useState("");

  const list = useMemo(() => categories || [], [categories]);

  const grouped = useMemo(() => {
    const map = {};
    BUSINESS_GROUPS.forEach((g) => {
      map[g.key] = [];
    });
    list.forEach((cat) => {
      map[getGroupKey(cat)].push(cat);
    });
    return map;
  }, [list]);

  const visibleGroups = BUSINESS_GROUPS.filter((g) => grouped[g.key].length > 0);
  const selectedCat = list.find((c) => c.slug === selected);
  const currentKey = activeKey || (selectedCat ? getGroupKey(selectedCat) : visibleGroups[0]?.key);
  const currentGroup = currentKey ? getGroup(currentKey) : null;

  const q = query.trim().toLowerCase();
  const searchResults = q ? list.filter((c) => c.name.toLowerCase().includes(q)) : [];
  const otherBusiness = list.find((c) => c.slug === "other-business");

  const handleGroup = (group) => {
    setActiveKey(group.key);
    setQuery("");
    // A group with a single type (e.g. Library) is picked straight away.
    if (grouped[group.key].length === 1) onSelect(grouped[group.key][0].slug);
  };

  return (
    <div className="min-h-screen bg-[#FBF7F1]">
      <div className="max-w-4xl mx-auto px-4 pt-10 pb-36">
        <OnboardingHeader step={2} />

        <div className="text-center mt-10">
          <h1 className="font-display font-bold text-navy-900 text-2xl md:text-4xl tracking-tight">
            What kind of business do you run?
          </h1>
          <p className="text-sm md:text-base text-gray-500 mt-3 max-w-xl mx-auto">
            Pick one. We set up your dashboard, website and public listing for it.
          </p>
        </div>

        {loading ? (
          <div className="py-16">
            <Loader />
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mt-8">
              {visibleGroups.map((g) => (
                <GroupCard
                  key={g.key}
                  group={g}
                  count={grouped[g.key].length}
                  active={!q && currentKey === g.key}
                  onClick={() => handleGroup(g)}
                />
              ))}
            </div>

            <div className="relative mt-8">
              <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search all business types, e.g. salon, coaching, pharmacy"
                className="w-full pl-10 pr-4 py-3 rounded-xl border border-gray-200 bg-white text-sm text-navy-900 placeholder:text-gray-400 focus:outline-none focus:border-navy-700 focus:ring-4 focus:ring-navy-700/10"
              />
            </div>

            {q ? (
              <div className="mt-6">
                <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-3">
                  {searchResults.length} result{searchResults.length === 1 ? "" : "s"}
                </p>
                {searchResults.length > 0 ? (
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {searchResults.map((cat) => (
                      <TypeTile
                        key={cat.slug}
                        cat={cat}
                        showGroup
                        selected={selected === cat.slug}
                        onClick={() => onSelect(cat.slug)}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="text-center bg-white border border-dashed border-gray-200 rounded-2xl py-8 px-4">
                    <p className="text-sm text-gray-500">No business type matches "{query}".</p>
                    {otherBusiness && (
                      <button
                        type="button"
                        onClick={() => onSelect(otherBusiness.slug)}
                        className="mt-2 text-sm font-semibold text-primary-600 hover:text-primary-700"
                      >
                        Choose "Other Business" instead
                      </button>
                    )}
                  </div>
                )}
              </div>
            ) : (
              currentGroup && (
                <div className="mt-6">
                  <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-3">
                    {currentGroup.title}: choose your exact type
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {grouped[currentKey].map((cat) => (
                      <TypeTile
                        key={cat.slug}
                        cat={cat}
                        selected={selected === cat.slug}
                        onClick={() => onSelect(cat.slug)}
                      />
                    ))}
                  </div>
                </div>
              )
            )}
          </>
        )}
      </div>

      <div className="fixed bottom-0 left-0 right-0 bg-white/95 backdrop-blur border-t border-gray-200 px-4 py-3.5 z-20">
        <div className="max-w-4xl mx-auto flex items-center justify-between gap-4">
          <button
            type="button"
            onClick={onBack}
            className="group flex items-center gap-1.5 text-sm font-medium text-gray-500 hover:text-navy-900 transition-colors"
          >
            <ArrowLeft size={15} className="transition-transform group-hover:-translate-x-0.5" />
            <span className="hidden sm:inline">Back to plans</span>
            <span className="sm:hidden">Back</span>
          </button>

          <p className="text-sm text-gray-500 truncate hidden md:block">
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
            onClick={onContinue}
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
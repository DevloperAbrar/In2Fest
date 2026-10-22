import React, { useState, useEffect, useMemo } from "react";
import { CheckCircle2, AlertCircle, Info } from "lucide-react";
import Input from "../../../../components/common/Input";
import Select from "../../../../components/common/Select";
import MultiSelect from "../../../../components/common/MultiSelect";
import Button from "../../../../components/common/Button";
import DynamicField from "../DynamicField.jsx";
import { LANGUAGE_OPTIONS } from "../../../../lib/marketplaceCategories";
import { getMaxSecondary } from "../../../../lib/vendorCategoryConfig";

const fromVenue = (venue) => ({
  business_category: venue.business_category || "",
  secondary_categories: venue.secondary_categories || [],
  business_types: Array.isArray(venue.profile_attributes?.business_types) ? venue.profile_attributes.business_types : [],
  long_description: venue.long_description || "",
  specialty_tagline: venue.specialty_tagline || "",
  year_established: venue.year_established || "",
  team_size: venue.team_size || "",
  languages_spoken: venue.languages_spoken || [],
  famous_events_handled: venue.famous_events_handled || "",
  awards_recognition: venue.awards_recognition || ""
});

// Business types in the order the backend defines them, then the admin's display order.
const compareCategories = (a, b) =>
  (a.business_type_order ?? 99) - (b.business_type_order ?? 99) ||
  (a.display_order ?? 0) - (b.display_order ?? 0) ||
  String(a.name).localeCompare(String(b.name));

const humanizeSlug = (slug) =>
  String(slug)
    .split("-")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");

export default function BusinessDetailsTab({ venue, categories, schema, onCategoryChange, onSave, saving, onNext, onBack }) {
  const [form, setForm] = useState(() => fromVenue(venue));
  const [triedNext, setTriedNext] = useState(false);

  useEffect(() => {
    setForm(fromVenue(venue));
  }, [venue]);

  const L = schema.labels;
  const minWords = schema.min_description_words;

  const sortedCategories = useMemo(
    () => [...(categories || [])].sort(compareCategories),
    [categories]
  );

  // The limit for extra categories comes from the selected PRIMARY category.
  const maxSecondary = useMemo(
    () => getMaxSecondary(sortedCategories.find((c) => c.slug === form.business_category)),
    [sortedCategories, form.business_category]
  );

  // Primary dropdown grouped by business type (Events, Education, Retail ...).
  const primaryGroups = useMemo(() => {
    const groups = new Map();
    sortedCategories.forEach((c) => {
      const key = c.business_type || "general";
      if (!groups.has(key)) {
        groups.set(key, { label: c.business_type_label || "Other", options: [] });
      }
      groups.get(key).options.push({ value: c.slug, label: c.name });
    });
    const list = [...groups.values()];

    // A saved category the admin has since deactivated must stay selectable,
    // otherwise the dropdown would silently show as empty.
    const current = form.business_category;
    if (current && !sortedCategories.some((c) => c.slug === current)) {
      list.push({ label: "Current (no longer listed)", options: [{ value: current, label: humanizeSlug(current) }] });
    }
    return list;
  }, [sortedCategories, form.business_category]);

  const placeholderOption = [{ value: "", label: "Select primary category" }];

  // Secondary multi-select: same ordering, with a heading per business type.
  const secondaryOptions = useMemo(
    () =>
      sortedCategories
        .filter((c) => c.slug !== form.business_category)
        .map((c) => ({ value: c.slug, label: c.name, group: c.business_type_label || "Other" })),
    [sortedCategories, form.business_category]
  );

  // Vendors listed under a General category (Other Business) are nudged to check for a better fit.
  const savedCategory = sortedCategories.find((c) => c.slug === venue.business_category);
  const savedIsGeneral = Boolean(venue.business_category) && savedCategory?.business_type === "general";
  const categoryChanged = Boolean(venue.business_category) && form.business_category !== venue.business_category;

  // General categories (Other Business): the vendor says what they do, from the list or in their own words.
  const typeAttr = (schema.attributes || []).find((a) => a.key === "business_types");
  const showTypeField = Boolean(schema.taxonomy && typeAttr);

  const wordCount = form.long_description.trim().split(/\s+/).filter(Boolean).length;
  const wordsRemaining = minWords - wordCount;
  const descriptionMet = wordCount >= minWords;

  const errors = [];
  if (!form.business_category) errors.push("Primary category is required");
  if (!descriptionMet) errors.push(`${L.description} needs ${wordsRemaining} more word${wordsRemaining === 1 ? "" : "s"}`);
  if (!form.specialty_tagline.trim()) errors.push(`${L.tagline} is required`);

  const canGoNext = errors.length === 0;

  const handleNext = () => {
    setTriedNext(true);
    if (canGoNext) onNext();
  };

  const handlePrimaryChange = (value) => {
    const nextLimit = getMaxSecondary(sortedCategories.find((c) => c.slug === value));
    const secondary = form.secondary_categories.filter((s) => s !== value).slice(0, nextLimit);
    setForm({ ...form, business_category: value, secondary_categories: secondary });
    if (onCategoryChange) onCategoryChange(value, secondary);
  };

  const handleSecondaryChange = (vals) => {
    const secondary = vals.slice(0, maxSecondary);
    setForm({ ...form, secondary_categories: secondary });
    if (onCategoryChange) onCategoryChange(form.business_category, secondary);
  };

  const buildPayload = () => {
    const { business_types, ...rest } = form;
    if (!showTypeField) return rest;
    // The server keeps only the detail keys it receives, so send ALL existing details
    // with the new business types merged in. Otherwise keywords, brands etc. would be lost.
    const attrs = { ...(venue.profile_attributes || {}) };
    if (business_types.length) attrs.business_types = business_types;
    else delete attrs.business_types;
    return { ...rest, profile_attributes: attrs };
  };

  const handleSave = () => {
    if (!form.business_category) {
      setTriedNext(true);
      return;
    }
    if (categoryChanged) {
      const ok = window.confirm(
        "You are changing your primary category.\n\n" +
          "- Your listing moves to the new category page and its old link will stop working.\n" +
          "- The new category has its own required details (Details tab). Until they are filled, your listing stays hidden from the marketplace.\n" +
          "- Your old details are kept and come back if you switch back.\n\nContinue?"
      );
      if (!ok) return;
    }
    onSave(buildPayload());
  };

  return (
    <div className="space-y-5">
      {savedIsGeneral && !categoryChanged && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 flex items-start gap-2">
          <Info size={16} className="text-blue-600 mt-0.5 flex-shrink-0" />
          <p className="text-sm text-blue-800">
            You are listed under a general category. If there is a category that matches your business better
            (for example Auto Garage or Electronics Store), choose it below so customers find you in the right place.
            If there is none, stay here and write what you do in "What kind of business is this?" below.
          </p>
        </div>
      )}

      <Select
        label="Primary category"
        options={placeholderOption}
        groups={primaryGroups}
        value={form.business_category}
        onChange={(e) => handlePrimaryChange(e.target.value)}
      />
      {form.business_category && (
        <p className="-mt-3 text-xs text-gray-400">
          This sets the questions and labels you see in the next tabs ({schema.business_type_label}).
        </p>
      )}
      {categoryChanged && (
        <div className="-mt-2 bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-800">
          Category changed. After you save, open the Details tab and fill the new required details, otherwise your
          listing stays hidden from the marketplace.
        </div>
      )}

      {showTypeField && (
        <div className="border border-primary-100 bg-primary-50/40 rounded-xl p-4">
          <DynamicField
            attr={{
              ...typeAttr,
              label: "What kind of business is this?",
              placeholder: "Type your own, e.g. Monitor Dealer, then press Enter",
              hint: "Pick from the list or type your own words (up to 3). Customers find you in search and on category pages by this."
            }}
            value={form.business_types}
            onChange={(v) => setForm({ ...form, business_types: Array.isArray(v) ? v : [] })}
          />
        </div>
      )}

      {maxSecondary > 0 || form.secondary_categories.length > 0 ? (
        <MultiSelect
          label={
            maxSecondary > 0
              ? `Additional services (optional, up to ${maxSecondary})`
              : "Additional services (not allowed for this category - remove them)"
          }
          options={secondaryOptions}
          value={form.secondary_categories}
          onChange={handleSecondaryChange}
          max={Math.max(maxSecondary, 0)}
          placeholder={`Select up to ${maxSecondary} additional categories`}
        />
      ) : (
        form.business_category && (
          <p className="text-xs text-gray-400">
            This category is listed on its own, so no additional services can be added.
          </p>
        )
      )}

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {L.description} <span className="text-gray-400">(write at least {minWords} words  - used for SEO too)</span>
        </label>
        <textarea
          rows={6}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
          value={form.long_description}
          onChange={(e) => setForm({ ...form, long_description: e.target.value })}
        />
        {descriptionMet ? (
          <p className="mt-1 text-xs text-green-600 flex items-center gap-1">
            <CheckCircle2 size={14} /> {wordCount} words  - minimum met, you're good to save
          </p>
        ) : (
          <p className="mt-1 text-xs text-amber-600">
            {wordCount} {wordCount === 1 ? "word" : "words"} so far  - write at least {wordsRemaining} more to meet the {minWords}-word minimum
          </p>
        )}
      </div>

      <Input
        label={L.tagline}
        placeholder={L.taglinePlaceholder}
        value={form.specialty_tagline}
        onChange={(e) => setForm({ ...form, specialty_tagline: e.target.value })}
      />

      <div className="grid grid-cols-2 gap-4">
        <Input
          label="Year established"
          type="number"
          value={form.year_established}
          onChange={(e) => setForm({ ...form, year_established: e.target.value })}
        />
        <Input
          label={L.team}
          type="number"
          value={form.team_size}
          onChange={(e) => setForm({ ...form, team_size: e.target.value })}
        />
      </div>

      <MultiSelect
        label="Languages spoken"
        options={LANGUAGE_OPTIONS}
        value={form.languages_spoken}
        onChange={(vals) => setForm({ ...form, languages_spoken: vals })}
      />

      {L.highlights && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">{L.highlights}</label>
          <textarea
            rows={3}
            placeholder={L.highlightsPlaceholder}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            value={form.famous_events_handled}
            onChange={(e) => setForm({ ...form, famous_events_handled: e.target.value })}
          />
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">{L.achievements}</label>
        <textarea
          rows={3}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
          value={form.awards_recognition}
          onChange={(e) => setForm({ ...form, awards_recognition: e.target.value })}
        />
      </div>

      {triedNext && !canGoNext && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-start gap-2">
          <AlertCircle size={16} className="text-red-500 mt-0.5 flex-shrink-0" />
          <div className="text-sm text-red-700">
            <p className="font-medium mb-1">Please fill in the required fields before continuing:</p>
            <ul className="list-disc list-inside space-y-0.5">
              {errors.map((e) => <li key={e}>{e}</li>)}
            </ul>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between pt-2">
        {onBack ? (
          <Button variant="outline" onClick={onBack}>Back</Button>
        ) : (
          <span />
        )}
        <div className="flex items-center gap-2">
          <Button loading={saving} onClick={handleSave}>Save Business Details</Button>
          {onNext && (
            <Button variant="outline" onClick={handleNext}>Next</Button>
          )}
        </div>
      </div>
    </div>
  );
}
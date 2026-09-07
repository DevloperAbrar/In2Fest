import React, { useState, useEffect } from "react";
import { CheckCircle2, AlertCircle } from "lucide-react";
import Input from "../../../../components/common/Input";
import Select from "../../../../components/common/Select";
import MultiSelect from "../../../../components/common/MultiSelect";
import Button from "../../../../components/common/Button";
import { LANGUAGE_OPTIONS } from "../../../../lib/marketplaceCategories";

const MIN_DESCRIPTION_WORDS = 150;

export default function BusinessDetailsTab({ venue, categories, onSave, saving, onNext, onBack }) {
  const [form, setForm] = useState({
    business_category: venue.business_category || "",
    secondary_categories: venue.secondary_categories || [],
    long_description: venue.long_description || "",
    specialty_tagline: venue.specialty_tagline || "",
    year_established: venue.year_established || "",
    team_size: venue.team_size || "",
    languages_spoken: venue.languages_spoken || [],
    famous_events_handled: venue.famous_events_handled || "",
    awards_recognition: venue.awards_recognition || ""
  });
  const [triedNext, setTriedNext] = useState(false);

  useEffect(() => {
    setForm({
      business_category: venue.business_category || "",
      secondary_categories: venue.secondary_categories || [],
      long_description: venue.long_description || "",
      specialty_tagline: venue.specialty_tagline || "",
      year_established: venue.year_established || "",
      team_size: venue.team_size || "",
      languages_spoken: venue.languages_spoken || [],
      famous_events_handled: venue.famous_events_handled || "",
      awards_recognition: venue.awards_recognition || ""
    });
  }, [venue]);

  const categoryOptions = [
    { value: "", label: "Select primary category" },
    ...categories.map((c) => ({ value: c.slug, label: c.name }))
  ];

  const secondaryOptions = categories
    .filter((c) => c.slug !== form.business_category)
    .map((c) => ({ value: c.slug, label: c.name }));

  const wordCount = form.long_description.trim().split(/\s+/).filter(Boolean).length;
  const wordsRemaining = MIN_DESCRIPTION_WORDS - wordCount;
  const descriptionMet = wordCount >= MIN_DESCRIPTION_WORDS;

  const errors = [];
  if (!form.business_category) errors.push("Primary category is required");
  if (!descriptionMet) errors.push(`Long description needs ${wordsRemaining} more word${wordsRemaining === 1 ? "" : "s"}`);
  if (!form.specialty_tagline.trim()) errors.push("Specialty tagline is required");

  const canGoNext = errors.length === 0;

  const handleNext = () => {
    setTriedNext(true);
    if (canGoNext) onNext();
  };

  return (
    <div className="space-y-5">
      <Select
        label="Primary category"
        options={categoryOptions}
        value={form.business_category}
        onChange={(e) => setForm({ ...form, business_category: e.target.value })}
      />

      <MultiSelect
        label="Secondary categories (up to 2)"
        options={secondaryOptions}
        value={form.secondary_categories}
        onChange={(vals) => setForm({ ...form, secondary_categories: vals.slice(0, 2) })}
        placeholder="Select up to 2 additional categories"
      />

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Long description <span className="text-gray-400">(write at least 150 words  - used for SEO too)</span>
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
            {wordCount} {wordCount === 1 ? "word" : "words"} so far  - write at least {wordsRemaining} more to meet the 150-word minimum
          </p>
        )}
      </div>

      <Input
        label="Specialty tagline"
        placeholder="e.g. Indore's most trusted wedding venue since 2008"
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
          label="Team size"
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

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Famous events handled</label>
        <textarea
          rows={3}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
          value={form.famous_events_handled}
          onChange={(e) => setForm({ ...form, famous_events_handled: e.target.value })}
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Awards & recognition</label>
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
          <Button loading={saving} onClick={() => onSave(form)}>Save Business Details</Button>
          {onNext && (
            <Button variant="outline" onClick={handleNext}>Next</Button>
          )}
        </div>
      </div>
    </div>
  );
}
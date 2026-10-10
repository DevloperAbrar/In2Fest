import React, { useState, useEffect } from "react";
import { AlertCircle } from "lucide-react";
import Button from "../../../../components/common/Button";
import DynamicField from "../DynamicField.jsx";

const WIDE_TYPES = ["multiselect", "tags", "keyvalue", "textarea"];

function isFilled(value) {
  if (value === undefined || value === null) return false;
  if (typeof value === "string") return value.trim() !== "";
  if (Array.isArray(value)) return value.length > 0;
  return true;
}

export default function DetailsTab({ venue, schema, onSave, saving, onNext, onBack }) {
  const [values, setValues] = useState(venue.profile_attributes || {});
  const [triedNext, setTriedNext] = useState(false);

  useEffect(() => {
    setValues(venue.profile_attributes || {});
  }, [venue.profile_attributes]);

  if (!venue.business_category) {
    return (
      <div className="space-y-5">
        <p className="text-sm text-gray-500">
          Select a primary category in the Business Details tab first. The questions here depend on it.
        </p>
        {onBack && <Button variant="outline" onClick={onBack}>Back</Button>}
      </div>
    );
  }

  if (!schema) return <p className="text-sm text-gray-400">Loading...</p>;

  const setValue = (key, val) => {
    setValues((prev) => {
      const next = { ...prev };
      const empty = val === undefined || val === "" || (Array.isArray(val) && val.length === 0);
      if (empty) delete next[key];
      else next[key] = val;
      return next;
    });
  };

  const missing = schema.attributes.filter((a) => a.required && !isFilled(values[a.key]));
  const canGoNext = missing.length === 0;

  const handleNext = () => {
    setTriedNext(true);
    if (canGoNext) onNext();
  };

  return (
    <div className="space-y-6">
      <div className="bg-primary-50 border border-primary-100 rounded-lg px-4 py-3">
        <p className="text-sm text-primary-800 font-medium">{schema.business_type_label}</p>
        <p className="text-xs text-primary-700 mt-0.5">
          These questions are picked for your category. Fill what applies, customers see it on your public profile.
          Fields marked * are required.
        </p>
      </div>

      {schema.groups.map((group) => {
        const attrs = schema.attributes.filter((a) => a.group === group);
        const fields = attrs.filter((a) => a.type !== "boolean");
        const toggles = attrs.filter((a) => a.type === "boolean");
        if (!attrs.length) return null;

        return (
          <div key={group} className="border border-gray-100 rounded-xl p-4">
            <h3 className="text-sm font-semibold text-gray-800 mb-3">{group}</h3>

            {fields.length > 0 && (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {fields.map((a) => (
                  <div key={a.key} className={WIDE_TYPES.includes(a.type) ? "sm:col-span-2" : ""}>
                    <DynamicField attr={a} value={values[a.key]} onChange={(v) => setValue(a.key, v)} />
                  </div>
                ))}
              </div>
            )}

            {toggles.length > 0 && (
              <div className={`grid grid-cols-1 sm:grid-cols-2 gap-2 ${fields.length ? "mt-4" : ""}`}>
                {toggles.map((a) => (
                  <DynamicField key={a.key} attr={a} value={values[a.key]} onChange={(v) => setValue(a.key, v)} />
                ))}
              </div>
            )}
          </div>
        );
      })}

      {triedNext && !canGoNext && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-start gap-2">
          <AlertCircle size={16} className="text-red-500 mt-0.5 flex-shrink-0" />
          <div className="text-sm text-red-700">
            <p className="font-medium mb-1">Please fill in the required fields before continuing:</p>
            <ul className="list-disc list-inside space-y-0.5">
              {missing.map((a) => <li key={a.key}>{a.label}</li>)}
            </ul>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between pt-2">
        {onBack ? <Button variant="outline" onClick={onBack}>Back</Button> : <span />}
        <div className="flex items-center gap-2">
          <Button loading={saving} onClick={() => onSave({ profile_attributes: values })}>Save Details</Button>
          {onNext && <Button variant="outline" onClick={handleNext}>Next</Button>}
        </div>
      </div>
    </div>
  );
}
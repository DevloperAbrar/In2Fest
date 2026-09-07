import React, { useState, useEffect } from "react";
import { AlertCircle } from "lucide-react";
import Button from "../../../../components/common/Button";
import Loader from "../../../../components/common/Loader";
import { metaService } from "../../../../services/metaService";
import { showError } from "../../../../components/common/Toast";

export default function ServicesChecklistTab({ venue, onSave, saving, onNext, onBack }) {
  const [checklist, setChecklist] = useState([]);
  const [selected, setSelected] = useState(venue.marketplace_services || []);
  const [loading, setLoading] = useState(true);
  const [triedNext, setTriedNext] = useState(false);

  useEffect(() => {
    setSelected(venue.marketplace_services || []);
  }, [venue.marketplace_services]);

  useEffect(() => {
    if (!venue.business_category) {
      setLoading(false);
      return;
    }
    setLoading(true);
    metaService
      .getServicesChecklist(venue.business_category)
      .then(({ data }) => setChecklist(data.data))
      .catch(() => showError("Could not load services checklist"))
      .finally(() => setLoading(false));
  }, [venue.business_category]);

  if (!venue.business_category) {
    return (
      <div className="space-y-5">
        <div className="text-sm text-gray-500">
          Select a primary category in the Business Details tab first  - the checklist here adapts to it.
        </div>
        <div className="flex items-center justify-between pt-2">
          {onBack ? <Button variant="outline" onClick={onBack}>Back</Button> : <span />}
        </div>
      </div>
    );
  }

  if (loading) return <Loader />;

  const toggle = (service) => {
    setSelected((prev) =>
      prev.includes(service) ? prev.filter((s) => s !== service) : [...prev, service]
    );
  };

  const canGoNext = selected.length > 0;

  const handleNext = () => {
    setTriedNext(true);
    if (canGoNext) onNext();
  };

  return (
    <div className="space-y-5">
      <div className="grid grid-cols-2 gap-3">
        {checklist.map((service) => (
          <label
            key={service}
            className="flex items-center gap-2 border border-gray-200 rounded-lg px-3 py-2 text-sm cursor-pointer hover:bg-gray-50"
          >
            <input
              type="checkbox"
              className="accent-primary-600"
              checked={selected.includes(service)}
              onChange={() => toggle(service)}
            />
            {service}
          </label>
        ))}
      </div>

      {triedNext && !canGoNext && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-start gap-2">
          <AlertCircle size={16} className="text-red-500 mt-0.5 flex-shrink-0" />
          <p className="text-sm text-red-700">Please select at least one service before continuing.</p>
        </div>
      )}

      <div className="flex items-center justify-between pt-2">
        {onBack ? <Button variant="outline" onClick={onBack}>Back</Button> : <span />}
        <div className="flex items-center gap-2">
          <Button loading={saving} onClick={() => onSave({ marketplace_services: selected })}>
            Save Services
          </Button>
          {onNext && (
            <Button variant="outline" onClick={handleNext}>Next</Button>
          )}
        </div>
      </div>
    </div>
  );
}
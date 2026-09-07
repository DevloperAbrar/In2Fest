import React, { useState, useEffect } from "react";
import { AlertCircle } from "lucide-react";
import Input from "../../../../components/common/Input";
import Button from "../../../../components/common/Button";

export default function PricingPoliciesTab({ venue, onSave, saving, onNext, onBack }) {
  const [pricingMode, setPricingMode] = useState(venue.pricing_mode || "single");
  const [form, setForm] = useState({
    starting_price: venue.starting_price || "",
    maximum_price: venue.maximum_price || "",
    pricing_note: venue.pricing_note || "",
    advance_payment_percentage: venue.advance_payment_percentage || "",
    cancellation_policy: venue.cancellation_policy || ""
  });
  const [servicePrices, setServicePrices] = useState(venue.service_prices || {});
  const [triedNext, setTriedNext] = useState(false);

  const services = venue.marketplace_services || [];

  useEffect(() => {
    setPricingMode(venue.pricing_mode || "single");
    setForm({
      starting_price: venue.starting_price || "",
      maximum_price: venue.maximum_price || "",
      pricing_note: venue.pricing_note || "",
      advance_payment_percentage: venue.advance_payment_percentage || "",
      cancellation_policy: venue.cancellation_policy || ""
    });
    setServicePrices(venue.service_prices || {});
  }, [venue]);

  const handleServicePrice = (service, value) => {
    setServicePrices((prev) => ({ ...prev, [service]: value }));
  };

  const errors = [];
  if (pricingMode === "single" && !form.starting_price) {
    errors.push("Starting price is required");
  }
  if (pricingMode === "per_service" && services.length === 0) {
    errors.push("Please select services in the Services tab first");
  }
  if (!form.cancellation_policy.trim()) {
    errors.push("Cancellation policy is required");
  }
  const canGoNext = errors.length === 0;

  const handleNext = () => {
    setTriedNext(true);
    if (canGoNext) onNext();
  };

  const handleSave = () => {
    let derivedStartingPrice = form.starting_price;
  
    if (pricingMode === "per_service") {
      const nonEmptyPrices = Object.values(servicePrices)
        .map((v) => parseFloat(v))
        .filter((v) => !isNaN(v) && v > 0);
  
      derivedStartingPrice = nonEmptyPrices.length > 0
        ? Math.min(...nonEmptyPrices).toString()
        : "";
    }
  
    onSave({
      ...form,
      pricing_mode: pricingMode,
      service_prices: pricingMode === "per_service" ? servicePrices : {},
      starting_price: derivedStartingPrice || null
    });
  };

  return (
    <div className="space-y-5">

      {/* Pricing mode toggle */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Pricing type</label>
        <div className="flex gap-3">
          <button
            type="button"
            onClick={() => setPricingMode("single")}
            className={`flex-1 py-2.5 px-4 rounded-lg border text-sm font-medium transition-colors ${
              pricingMode === "single"
                ? "bg-primary-600 text-white border-primary-600"
                : "bg-white text-gray-600 border-gray-300 hover:border-primary-400"
            }`}
          >
            Single package price
          </button>
          <button
            type="button"
            onClick={() => setPricingMode("per_service")}
            className={`flex-1 py-2.5 px-4 rounded-lg border text-sm font-medium transition-colors ${
              pricingMode === "per_service"
                ? "bg-primary-600 text-white border-primary-600"
                : "bg-white text-gray-600 border-gray-300 hover:border-primary-400"
            }`}
          >
            Price per service
          </button>
        </div>
      </div>

      {/* Single price mode */}
      {pricingMode === "single" && (
        <div className="grid grid-cols-2 gap-4">
          <Input
            label="Starting price (₹)"
            type="number"
            value={form.starting_price}
            onChange={(e) => setForm({ ...form, starting_price: e.target.value })}
          />
          <Input
            label="Maximum price (₹)"
            type="number"
            value={form.maximum_price}
            onChange={(e) => setForm({ ...form, maximum_price: e.target.value })}
          />
        </div>
      )}

      {/* Per-service price mode */}
      {pricingMode === "per_service" && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Price per service (₹)  - leave blank if not applicable
          </label>
          {services.length === 0 ? (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-sm text-amber-700">
              No services selected yet. Go to the Services tab and select your services first, then come back here to set prices.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {services.map((service) => (
                <div key={service} className="flex items-center gap-2 border border-gray-200 rounded-lg px-3 py-2">
                  <span className="text-sm text-gray-700 flex-1 min-w-0 truncate">{service}</span>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    <span className="text-sm text-gray-400">₹</span>
                    <input
                      type="number"
                      min="0"
                      placeholder="0"
                      value={servicePrices[service] || ""}
                      onChange={(e) => handleServicePrice(service, e.target.value)}
                      className="w-24 px-2 py-1 border border-gray-300 rounded text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 text-right"
                    />
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Pricing note</label>
        <textarea
          rows={2}
          placeholder="e.g. Price varies based on guest count and services selected"
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
          value={form.pricing_note}
          onChange={(e) => setForm({ ...form, pricing_note: e.target.value })}
        />
      </div>

      <Input
        label="Advance payment required (%)"
        type="number"
        min="0"
        max="100"
        value={form.advance_payment_percentage}
        onChange={(e) => setForm({ ...form, advance_payment_percentage: e.target.value })}
      />

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Cancellation policy</label>
        <textarea
          rows={3}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
          value={form.cancellation_policy}
          onChange={(e) => setForm({ ...form, cancellation_policy: e.target.value })}
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
        {onBack ? <Button variant="outline" onClick={onBack}>Back</Button> : <span />}
        <div className="flex items-center gap-2">
          <Button loading={saving} onClick={handleSave}>Save Pricing & Policies</Button>
          {onNext && (
            <Button variant="outline" onClick={handleNext}>Next</Button>
          )}
        </div>
      </div>
    </div>
  );
}
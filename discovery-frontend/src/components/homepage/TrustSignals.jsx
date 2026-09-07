import React from "react";
import { Sparkles } from "lucide-react";
import { BRAND_NAME } from "../../lib/constants";

const MIN_VENDORS_TO_SHOW_STATS = 25;

export default function TrustSignals({ stats }) {
  if (!stats) return null;

  const isEarlyStage = Number(stats.total_vendors || 0) < MIN_VENDORS_TO_SHOW_STATS;

  if (isEarlyStage) {
    return (
      <section className="max-w-3xl mx-auto px-4 py-10 text-center">
        <div className="inline-flex items-center gap-2 bg-primary-50 border border-primary-100 text-primary-700 text-sm px-4 py-2 rounded-full">
          <Sparkles size={15} />
          {BRAND_NAME} is live and growing, new vendors added every week
        </div>
      </section>
    );
  }

  const items = [
    { label: "Active Vendors", value: stats.total_vendors },
    { label: "Cities Covered", value: stats.cities_covered },
    { label: "Events Completed", value: stats.events_completed }
  ];

  return (
    <section className="max-w-6xl mx-auto px-4 py-12 grid grid-cols-3 gap-4 text-center">
      {items.map((item) => (
        <div key={item.label}>
          <p className="text-2xl md:text-3xl font-display font-bold text-primary-700">{item.value}+</p>
          <p className="text-sm text-gray-500">{item.label}</p>
        </div>
      ))}
    </section>
  );
}
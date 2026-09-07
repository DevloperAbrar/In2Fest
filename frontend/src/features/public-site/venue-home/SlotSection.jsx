import React from "react";
import { Clock, Sun, Timer, Package, CheckCircle2 } from "lucide-react";

const TYPE_ICON = { time_slot: Clock, full_day: Sun, hourly: Timer, package: Package };
const TYPE_LABEL = { time_slot: "Time Slot", full_day: "Full Day", hourly: "Hourly", package: "Package" };

function formatTime(t) {
  if (!t) return "";
  const [h, m] = t.split(":");
  const hour = parseInt(h, 10);
  return `${hour % 12 || 12}:${m} ${hour >= 12 ? "PM" : "AM"}`;
}

function formatINR(val) {
  if (!val) return null;
  return "₹" + Number(val).toLocaleString("en-IN");
}

function PublicSlotCard({ slot, themeColor }) {
  const pricingType = slot.pricing_type || "time_slot";
  const Icon = TYPE_ICON[pricingType] || Clock;

  return (
    <div className="bg-white dark:bg-gray-900 rounded-2xl border border-gray-100 dark:border-gray-800 p-5 shadow-sm flex flex-col gap-3 hover:shadow-md transition-shadow">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0"
          style={{ backgroundColor: themeColor + "18", color: themeColor }}>
          <Icon size={18} />
        </div>
        <div>
          <p className="font-semibold text-gray-900 dark:text-white text-sm leading-tight">{slot.name}</p>
          <span className="text-[10px] font-medium text-gray-400">{TYPE_LABEL[pricingType]}</span>
        </div>
      </div>

      {pricingType === "time_slot" && (
        <div className="space-y-1">
          {slot.start_time && slot.end_time && <p className="text-sm text-gray-500 dark:text-gray-400">{formatTime(slot.start_time)} – {formatTime(slot.end_time)}</p>}
          {slot.base_price && <p className="text-xl font-bold text-gray-900 dark:text-white">{formatINR(slot.base_price)}</p>}
          {slot.weekend_price && <p className="text-xs text-gray-400">Weekend: {formatINR(slot.weekend_price)}</p>}
        </div>
      )}

      {pricingType === "full_day" && (
        <div className="space-y-1">
          <p className="text-sm text-gray-500 dark:text-gray-400">All-day booking</p>
          {slot.base_price && <p className="text-xl font-bold text-gray-900 dark:text-white">{formatINR(slot.base_price)}</p>}
          {slot.weekend_price && <p className="text-xs text-gray-400">Weekend: {formatINR(slot.weekend_price)}</p>}
        </div>
      )}

      {pricingType === "hourly" && (
        <div className="space-y-1">
          {slot.price_per_hour && <p className="text-xl font-bold text-gray-900 dark:text-white">{formatINR(slot.price_per_hour)}<span className="text-xs font-normal text-gray-400"> / hr</span></p>}
          {(slot.min_hours || slot.max_hours) && (
            <p className="text-xs text-gray-400">
              {slot.min_hours ? `Min ${slot.min_hours} hr` : ""}{slot.min_hours && slot.max_hours ? " · " : ""}{slot.max_hours ? `Max ${slot.max_hours} hr` : ""}
            </p>
          )}
        </div>
      )}

      {pricingType === "package" && (
        <div className="space-y-2">
          <div className="flex items-baseline gap-2">
            {slot.base_price && <p className="text-xl font-bold text-gray-900 dark:text-white">{formatINR(slot.base_price)}</p>}
            {slot.duration_label && <span className="text-xs font-medium text-gray-400">{slot.duration_label}</span>}
          </div>
          {slot.description && <p className="text-xs text-gray-500 dark:text-gray-400 leading-snug">{slot.description}</p>}
          {slot.inclusions?.length > 0 && (
            <ul className="space-y-1 mt-1">
              {slot.inclusions.map((item, i) => (
                <li key={i} className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-300">
                  <CheckCircle2 size={12} className="flex-shrink-0" style={{ color: themeColor }} />{item}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}

export default function SlotSection({ venue, slots }) {
  const activeSlots = (slots || []).filter((s) => s.is_active !== false);
  if (!activeSlots.length) return null;
  const themeColor = venue?.theme_color || "#7c3aed";

  return (
    <section id="pricing" className="py-24 bg-gray-50 dark:bg-gray-950 transition-colors">
      <div className="max-w-6xl mx-auto px-6">
        <div className="text-center mb-12">
          <p className="text-sm font-semibold uppercase tracking-widest mb-3" style={{ color: themeColor }}>Our Offerings</p>
          <h2 className="text-3xl md:text-4xl font-bold text-gray-900 dark:text-white">Slots & Packages</h2>
          <p className="text-gray-500 dark:text-gray-400 mt-3 max-w-xl mx-auto text-sm">Choose the option that suits your event. Contact us for custom requirements.</p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
          {activeSlots.map((slot) => <PublicSlotCard key={slot.id} slot={slot} themeColor={themeColor} />)}
        </div>
      </div>
    </section>
  );
}
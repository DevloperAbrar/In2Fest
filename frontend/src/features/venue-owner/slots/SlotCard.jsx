import React from "react";
import { Edit2, Trash2, Clock, Sun, Timer, Package, CheckCircle2 } from "lucide-react";
import { formatCurrency } from "../../../lib/formatters";

const TYPE_ICON = { time_slot: Clock, full_day: Sun, hourly: Timer, package: Package };
const TYPE_BADGE = { time_slot: "bg-blue-50 text-blue-700", full_day: "bg-green-50 text-green-700", hourly: "bg-amber-50 text-amber-700", package: "bg-purple-50 text-purple-700" };
const TYPE_LABEL = { time_slot: "Time Slot", full_day: "Full Day", hourly: "Hourly", package: "Package" };

function formatTime(t) {
  if (!t) return null;
  const [h, m] = t.split(":");
  const hour = parseInt(h, 10);
  return `${hour % 12 || 12}:${m} ${hour >= 12 ? "PM" : "AM"}`;
}

export default function SlotCard({ slot, onEdit, onDelete }) {
  const pricingType = slot.pricing_type || "time_slot";
  const Icon = TYPE_ICON[pricingType] || Clock;
  const badgeClass = TYPE_BADGE[pricingType] || TYPE_BADGE.time_slot;

  return (
    <div className={`bg-white rounded-2xl border border-gray-100 p-5 shadow-sm hover:shadow-md transition-shadow flex flex-col gap-3 ${!slot.is_active ? "opacity-60" : ""}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${badgeClass}`}>
            <Icon size={15} />
          </div>
          <div className="min-w-0">
            <p className="font-semibold text-gray-800 text-sm leading-tight truncate">{slot.name}</p>
            <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full mt-0.5 inline-block ${badgeClass}`}>{TYPE_LABEL[pricingType]}</span>
          </div>
        </div>
        <div className="flex gap-1.5 flex-shrink-0">
          <button onClick={() => onEdit(slot)} className="p-1.5 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors"><Edit2 size={14} /></button>
          <button onClick={() => onDelete(slot)} className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"><Trash2 size={14} /></button>
        </div>
      </div>

      {pricingType === "time_slot" && (
        <div className="space-y-1">
          {slot.start_time && slot.end_time && <p className="text-sm text-gray-500 font-medium">{formatTime(slot.start_time)} – {formatTime(slot.end_time)}</p>}
          {slot.base_price && <p className="text-base font-bold text-gray-900">{formatCurrency(slot.base_price)}</p>}
          {slot.weekend_price && <p className="text-xs text-gray-400">Weekend: {formatCurrency(slot.weekend_price)}</p>}
        </div>
      )}

      {pricingType === "full_day" && (
        <div className="space-y-1">
          <p className="text-sm text-gray-500">All-day flat rate</p>
          {slot.base_price && <p className="text-base font-bold text-gray-900">{formatCurrency(slot.base_price)}</p>}
          {slot.weekend_price && <p className="text-xs text-gray-400">Weekend: {formatCurrency(slot.weekend_price)}</p>}
        </div>
      )}

      {pricingType === "hourly" && (
        <div className="space-y-1">
          {slot.price_per_hour && <p className="text-base font-bold text-gray-900">{formatCurrency(slot.price_per_hour)}<span className="text-xs font-normal text-gray-400">/hr</span></p>}
          {(slot.min_hours || slot.max_hours) && (
            <p className="text-xs text-gray-400">
              {slot.min_hours ? `Min ${slot.min_hours} hr` : ""}{slot.min_hours && slot.max_hours ? " · " : ""}{slot.max_hours ? `Max ${slot.max_hours} hr` : ""}
            </p>
          )}
        </div>
      )}

      {pricingType === "package" && (
        <div className="space-y-1.5">
          <div className="flex items-baseline gap-2">
            {slot.base_price && <p className="text-base font-bold text-gray-900">{formatCurrency(slot.base_price)}</p>}
            {slot.duration_label && <span className="text-xs text-gray-400">{slot.duration_label}</span>}
          </div>
          {slot.description && <p className="text-xs text-gray-500 leading-snug line-clamp-2">{slot.description}</p>}
          {slot.inclusions?.length > 0 && (
            <ul className="space-y-0.5 mt-1">
              {slot.inclusions.slice(0, 3).map((item, i) => (
                <li key={i} className="flex items-center gap-1.5 text-xs text-gray-500">
                  <CheckCircle2 size={11} className="text-green-500 flex-shrink-0" />{item}
                </li>
              ))}
              {slot.inclusions.length > 3 && <li className="text-xs text-gray-400 pl-4">+{slot.inclusions.length - 3} more</li>}
            </ul>
          )}
        </div>
      )}

      {["time_slot", "full_day", "hourly"].includes(pricingType) && slot.days_of_operation && slot.days_of_operation.length < 7 && (
        <p className="text-[10px] text-gray-400 capitalize">{slot.days_of_operation.join(", ")}</p>
      )}
    </div>
  );
}
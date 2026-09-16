import React from "react";
import { Edit2, Trash2, Clock, Sun, Timer, LayoutGrid, Power, Users } from "lucide-react";
import { formatSlugLabel } from "../../../lib/formatters";

const TYPE_ICON  = { time_slot: Clock, full_day: Sun, hourly: Timer };
const TYPE_BADGE = { time_slot: "bg-blue-50 text-blue-700", full_day: "bg-green-50 text-green-700", hourly: "bg-amber-50 text-amber-700" };
const TYPE_LABEL = { time_slot: "Time Slot", full_day: "Full Day", hourly: "Hourly" };

function fmt(t) {
  if (!t) return null;
  const [h, m] = t.split(":");
  const hour = parseInt(h, 10);
  return `${hour % 12 || 12}:${m} ${hour >= 12 ? "PM" : "AM"}`;
}

export default function SlotCard({ slot, onEdit, onDelete, onToggle }) {
  const type = slot.pricing_type || "time_slot";
  const hasTimeInfo = !!(slot.start_time && slot.end_time);
  // A slot created via the simplified form has no start/end time and sits on
  // the default "time_slot" type — don't label it, since there's no longer
  // a type distinction the owner chose. Legacy slots that do carry real time
  // data (or a non-default type) keep their badge exactly as before.
  const isSimpleSlot = type === "time_slot" && !hasTimeInfo;
  const Icon = isSimpleSlot ? LayoutGrid : (TYPE_ICON[type] || Clock);
  const badge = TYPE_BADGE[type] || TYPE_BADGE.time_slot;

  return (
    <div className={`bg-white rounded-2xl border p-5 shadow-sm hover:shadow-md transition-all flex flex-col gap-3 ${!slot.is_active ? "opacity-50 border-gray-100" : "border-gray-100"}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <div className={`w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 ${isSimpleSlot ? "bg-gray-50 text-gray-500" : badge}`}>
            <Icon size={15} />
          </div>
          <div className="min-w-0">
            <p className="font-semibold text-gray-800 text-sm leading-tight truncate">{slot.name}</p>
            {!isSimpleSlot && (
              <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full mt-0.5 inline-block ${badge}`}>
                {TYPE_LABEL[type]}
              </span>
            )}
            {!slot.is_active && (
              <span className="ml-1 text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-400">Inactive</span>
            )}
          </div>
        </div>
        <div className="flex gap-1 flex-shrink-0">
          <button onClick={() => onToggle(slot)} title={slot.is_active ? "Deactivate" : "Activate"}
            className={`p-1.5 rounded-lg transition-colors ${slot.is_active ? "text-green-500 hover:bg-green-50" : "text-gray-300 hover:bg-gray-50"}`}>
            <Power size={14} />
          </button>
          <button onClick={() => onEdit(slot)}
            className="p-1.5 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors">
            <Edit2 size={14} />
          </button>
          <button onClick={() => onDelete(slot)}
            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      {hasTimeInfo && (
        <p className="text-sm text-gray-500 font-medium">{fmt(slot.start_time)} – {fmt(slot.end_time)}</p>
      )}

      {/* Units display */}
      <div className="flex items-center gap-1.5 text-xs text-gray-500">
        <Users size={12} className="text-gray-400" />
        <span>{slot.total_units || 1} unit{(slot.total_units || 1) > 1 ? "s" : ""} available</span>
        {slot.service_type && (
          <span className="ml-auto text-[10px] px-2 py-0.5 rounded-full bg-gray-50 text-gray-500 border border-gray-100">
            {formatSlugLabel(slot.service_type)}
          </span>
        )}
      </div>

      {slot.days_of_operation && slot.days_of_operation.length < 7 && (
        <p className="text-[10px] text-gray-400 capitalize">{slot.days_of_operation.join(", ")}</p>
      )}
    </div>
  );
}
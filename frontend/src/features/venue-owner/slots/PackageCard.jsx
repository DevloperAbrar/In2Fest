import React from "react";
import { Edit2, Trash2, Package, Power, CheckCircle2 } from "lucide-react";
import { formatCurrency } from "../../../lib/formatters";

export default function PackageCard({ pkg, slots = [], onEdit, onDelete, onToggle }) {
  const pkgSlots = (pkg.slot_ids || [])
    .map(id => slots.find(s => s.id === id))
    .filter(Boolean);

  return (
    <div className={`bg-white rounded-2xl border p-5 shadow-sm hover:shadow-md transition-all flex flex-col gap-3 ${!pkg.is_active ? "opacity-50 border-gray-100" : "border-purple-100"}`}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 bg-purple-50 text-purple-700">
            <Package size={15} />
          </div>
          <div className="min-w-0">
            <p className="font-semibold text-gray-800 text-sm leading-tight truncate">{pkg.name}</p>
            <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full mt-0.5 inline-block bg-purple-50 text-purple-700">Package</span>
            {!pkg.is_active && (
              <span className="ml-1 text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-400">Inactive</span>
            )}
          </div>
        </div>
        <div className="flex gap-1 flex-shrink-0">
          <button onClick={() => onToggle(pkg)} title={pkg.is_active ? "Deactivate" : "Activate"}
            className={`p-1.5 rounded-lg transition-colors ${pkg.is_active ? "text-green-500 hover:bg-green-50" : "text-gray-300 hover:bg-gray-50"}`}>
            <Power size={14} />
          </button>
          <button onClick={() => onEdit(pkg)}
            className="p-1.5 text-gray-400 hover:text-primary-600 hover:bg-primary-50 rounded-lg transition-colors">
            <Edit2 size={14} />
          </button>
          <button onClick={() => onDelete(pkg)}
            className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors">
            <Trash2 size={14} />
          </button>
        </div>
      </div>

      {pkg.price && (
        <p className="text-base font-bold text-gray-900">{formatCurrency(pkg.price)}</p>
      )}

      {pkg.description && (
        <p className="text-xs text-gray-500 leading-snug">{pkg.description}</p>
      )}

      {/* Included slots */}
      {pkgSlots.length > 0 && (
        <div className="space-y-1">
          <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wide">Includes</p>
          {pkgSlots.map(s => (
            <div key={s.id} className="flex items-center gap-1.5 text-xs text-gray-600">
              <CheckCircle2 size={11} className="text-purple-400 flex-shrink-0" />
              {s.name}
              {s.service_type && <span className="text-gray-400">({s.service_type})</span>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
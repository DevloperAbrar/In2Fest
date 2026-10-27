import React from "react";
import { X } from "lucide-react";
import { SECTION_TYPES } from "../../../lib/sectionLibrary";

// Bottom sheet on phones, centered dialog on larger screens.
export default function SectionPickerModal({ types, onSelect, onClose }) {
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-black/40 sm:items-center sm:p-4" onClick={onClose}>
      <div
        className="max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-t-3xl bg-white px-4 pb-6 pt-3 sm:rounded-2xl sm:px-6 sm:pt-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-gray-200 sm:hidden" />
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h3 className="text-base font-semibold text-gray-900">Add a section</h3>
            <p className="text-xs text-gray-500">Tap one to add it to your page.</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="rounded-full bg-gray-100 p-2 text-gray-500 hover:bg-gray-200"
          >
            <X size={16} />
          </button>
        </div>

        {types.length === 0 ? (
          <p className="py-6 text-center text-sm text-gray-400">You've already added every available section.</p>
        ) : (
          <div className="space-y-2">
            {types.map((type) => {
              const def = SECTION_TYPES[type];
              const Icon = def.icon;
              return (
                <button
                  key={type}
                  type="button"
                  onClick={() => onSelect(type)}
                  className="flex w-full items-center gap-3 rounded-2xl border border-gray-100 p-3 text-left transition-all hover:border-primary-200 hover:bg-primary-50 active:scale-[0.99]"
                >
                  <div className={`flex-shrink-0 rounded-xl p-2.5 ${def.color}`}>
                    <Icon size={18} />
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900">{def.label}</p>
                    <p className="text-xs text-gray-500">{def.description}</p>
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
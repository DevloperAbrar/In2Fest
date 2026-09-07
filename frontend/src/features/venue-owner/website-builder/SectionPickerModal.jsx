import React from "react";
import { X } from "lucide-react";
import { SECTION_TYPES } from "../../../lib/sectionLibrary";

export default function SectionPickerModal({ types, onSelect, onClose }) {
  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div
        className="bg-white rounded-2xl max-w-lg w-full max-h-[80vh] overflow-y-auto p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-gray-800">Add a Section</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <X size={18} />
          </button>
        </div>

        {types.length === 0 ? (
          <p className="text-sm text-gray-400 text-center py-6">
            You've already added every available section type.
          </p>
        ) : (
          <div className="space-y-2">
            {types.map((type) => {
              const def = SECTION_TYPES[type];
              const Icon = def.icon;
              return (
                <button
                  key={type}
                  onClick={() => onSelect(type)}
                  className="w-full flex items-start gap-3 p-3 rounded-xl border border-gray-100 hover:border-primary-200 hover:bg-primary-50 transition-all text-left"
                >
                  <div className={`p-2 rounded-lg ${def.color}`}>
                    <Icon size={18} />
                  </div>
                  <div>
                    <p className="font-medium text-gray-800 text-sm">{def.label}</p>
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
import React from "react";
import { X } from "lucide-react";

export default function Modal({ isOpen, onClose, title, children, size = "md" }) {
  if (!isOpen) return null;

  const sizes = { sm: "sm:max-w-md", md: "sm:max-w-lg", lg: "sm:max-w-2xl", xl: "sm:max-w-4xl" };

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-navy-900/40 sm:p-4"
      onClick={onClose}
    >
      <div
        className={`bg-white rounded-t-3xl sm:rounded-2xl shadow-xl w-full ${sizes[size]} max-h-[92vh] sm:max-h-[90vh] overflow-y-auto pb-safe-b animate-slot-in`}
        onClick={(e) => e.stopPropagation()}
      >
        <div className="sticky top-0 bg-white/95 backdrop-blur z-10">
          {/* Drag handle - mobile only, native bottom-sheet feel */}
          <div className="sm:hidden flex justify-center pt-2.5 pb-1">
            <div className="w-10 h-1 rounded-full bg-navy-200" />
          </div>
          <div className="flex items-center justify-between px-5 sm:px-6 py-3 sm:py-4 border-b border-navy-100/60">
            <h3 className="font-display font-semibold text-navy-900 text-base sm:text-lg pr-3 truncate">{title}</h3>
            <button
              onClick={onClose}
              className="tap-scale shrink-0 w-8 h-8 flex items-center justify-center rounded-lg text-navy-400 hover:text-navy-600 hover:bg-navy-50"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>
        <div className="p-5 sm:p-6">{children}</div>
      </div>
    </div>
  );
}
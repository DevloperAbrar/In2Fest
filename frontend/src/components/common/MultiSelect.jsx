import React, { useState, useRef, useEffect } from "react";
import { ChevronDown, X, Check, Search } from "lucide-react";

export default function MultiSelect({
  label,
  error,
  options = [],
  value = [],
  onChange,
  placeholder = "Select options",
  searchable = false
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [openUpward, setOpenUpward] = useState(false);
  const ref = useRef(null);
  const triggerRef = useRef(null);

  const realOptions = options.filter((opt) => opt.value !== "");

  const filteredOptions =
    searchable && search.trim()
      ? realOptions.filter((opt) => opt.label.toLowerCase().includes(search.trim().toLowerCase()))
      : realOptions;

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (ref.current && !ref.current.contains(e.target)) {
        setOpen(false);
        setSearch("");
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Decide open-up vs open-down the same way a native <select> does:
  // if there isn't enough room below the field but there's more room above, flip it.
  const handleToggle = () => {
    if (!open && triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      const dropdownHeight = 300; // matches max-h-72 (288px) + a little breathing room
      const spaceBelow = window.innerHeight - rect.bottom;
      const spaceAbove = rect.top;
      setOpenUpward(spaceBelow < dropdownHeight && spaceAbove > spaceBelow);
    }
    setOpen(!open);
  };

  const toggleOption = (optValue) => {
    if (value.includes(optValue)) {
      onChange(value.filter((v) => v !== optValue));
    } else {
      onChange([...value, optValue]);
    }
  };

  const removeOption = (optValue, e) => {
    e.stopPropagation();
    onChange(value.filter((v) => v !== optValue));
  };

  const closeDropdown = () => {
    setOpen(false);
    setSearch("");
  };

  const selectedLabels = realOptions.filter((opt) => value.includes(opt.value));

  return (
    <div className="w-full relative" ref={ref}>
      {label && <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>}

      <div
        ref={triggerRef}
        onClick={handleToggle}
        className={`w-full min-h-[42px] px-3 py-2 border rounded-lg text-sm bg-white cursor-pointer flex items-center flex-wrap gap-1.5 focus:outline-none focus:ring-2 focus:ring-primary-500 ${
          error ? "border-red-400" : "border-gray-300"
        }`}
      >
        {selectedLabels.length === 0 && (
          <span className="text-gray-400">{placeholder}</span>
        )}

        {selectedLabels.map((opt) => (
          <span
            key={opt.value}
            className="inline-flex items-center gap-1 bg-primary-50 text-primary-700 text-xs font-medium px-2 py-1 rounded-full"
          >
            {opt.label}
            <button
              type="button"
              onClick={(e) => removeOption(opt.value, e)}
              className="hover:text-primary-900"
            >
              <X size={12} />
            </button>
          </span>
        ))}

        <ChevronDown size={16} className="ml-auto text-gray-400 flex-shrink-0" />
      </div>

      {open && (
        <div
          className={`absolute z-30 w-full max-h-72 bg-white border border-gray-200 rounded-lg shadow-lg flex flex-col ${
            openUpward ? "bottom-full mb-1" : "top-full mt-1"
          }`}
        >
          {searchable && (
            <div className="p-2 border-b border-gray-100 flex items-center gap-2 flex-shrink-0">
              <Search size={14} className="text-gray-400 flex-shrink-0" />
              <input
                autoFocus
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                onClick={(e) => e.stopPropagation()}
                placeholder="Search cities..."
                className="w-full text-sm focus:outline-none"
              />
            </div>
          )}

          <div className="overflow-y-auto flex-1">
            {filteredOptions.length === 0 && (
              <p className="px-3 py-2 text-sm text-gray-400">No matches</p>
            )}
            {filteredOptions.map((opt) => {
              const isSelected = value.includes(opt.value);
              return (
                <div
                  key={opt.value}
                  onClick={() => toggleOption(opt.value)}
                  className={`flex items-center justify-between px-3 py-2 text-sm cursor-pointer hover:bg-gray-50 ${
                    isSelected ? "text-primary-700 font-medium" : "text-gray-700"
                  }`}
                >
                  {opt.label}
                  {isSelected && <Check size={14} className="text-primary-600" />}
                </div>
              );
            })}
          </div>

          <div className="p-2 border-t border-gray-100 flex-shrink-0 bg-gray-50 rounded-b-lg">
            <button
              type="button"
              onClick={closeDropdown}
              className="w-full text-sm font-medium text-primary-700 hover:text-primary-800 py-1"
            >
              Done {selectedLabels.length > 0 && `(${selectedLabels.length} selected)`}
            </button>
          </div>
        </div>
      )}

      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
    </div>
  );
}
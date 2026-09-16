import React, { useState } from "react";
import Input from "../../../components/common/Input";
import Button from "../../../components/common/Button";
import { CheckSquare, Square } from "lucide-react";

export default function PackageForm({ existingPkg, slots = [], onSubmit, onCancel, submitting }) {
  const [form, setForm] = useState({
    name:        existingPkg?.name        || "",
    description: existingPkg?.description || "",
    price:       existingPkg?.price       || "",
    slot_ids:    existingPkg?.slot_ids    || []
  });

  const toggleSlot = (id) => {
    setForm(f => ({
      ...f,
      slot_ids: f.slot_ids.includes(id)
        ? f.slot_ids.filter(s => s !== id)
        : [...f.slot_ids, id]
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!form.name.trim()) return;
    onSubmit({ ...form, price: form.price ? Number(form.price) : null });
  };

  const activeSlots = slots.filter(s => s.is_active);

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="text-xs font-medium text-gray-500 mb-1 block">Package Name *</label>
        <input value={form.name} onChange={e => setForm(f => ({ ...f, name: e.target.value }))}
          placeholder="e.g. Full Wedding Package"
          required
          className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-300" />
      </div>

      <div>
        <label className="text-xs font-medium text-gray-500 mb-1 block">Description (optional)</label>
        <textarea rows={2} value={form.description}
          onChange={e => setForm(f => ({ ...f, description: e.target.value }))}
          placeholder="What's included in this package..."
          className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-300 resize-none" />
      </div>

      <div>
        <label className="text-xs font-medium text-gray-500 mb-1 block">Package Price (₹, optional)</label>
        <input type="number" min="0" value={form.price}
          onChange={e => setForm(f => ({ ...f, price: e.target.value }))}
          placeholder="Negotiable if left empty"
          className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-300" />
        <p className="text-xs text-gray-400 mt-1">Client can negotiate final price during booking</p>
      </div>

      {/* Slot selector */}
      <div>
        <label className="text-xs font-medium text-gray-500 mb-2 block">Include Slots *</label>
        {activeSlots.length === 0 ? (
          <p className="text-sm text-gray-400 bg-gray-50 rounded-xl p-4 text-center">No active slots yet. Create slots first.</p>
        ) : (
          <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
            {activeSlots.map(slot => {
              const selected = form.slot_ids.includes(slot.id);
              return (
                <button key={slot.id} type="button" onClick={() => toggleSlot(slot.id)}
                  className={`w-full flex items-center gap-3 p-3 rounded-xl border text-left transition-all ${
                    selected ? "border-primary-400 bg-primary-50" : "border-gray-200 hover:border-primary-200"
                  }`}>
                  {selected ? <CheckSquare size={16} className="text-primary-600 flex-shrink-0" /> : <Square size={16} className="text-gray-300 flex-shrink-0" />}
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-800 truncate">{slot.name}</p>
                    {slot.service_type && <p className="text-xs text-gray-400">{slot.service_type} · {slot.total_units} unit{slot.total_units > 1 ? "s" : ""}</p>}
                  </div>
                </button>
              );
            })}
          </div>
        )}
        {form.slot_ids.length === 0 && (
          <p className="text-xs text-red-500 mt-1">Select at least one slot</p>
        )}
      </div>

      <div className="flex justify-end gap-3 pt-2 border-t border-gray-100">
        <Button variant="outline" type="button" onClick={onCancel}>Cancel</Button>
        <Button type="submit" loading={submitting} disabled={form.slot_ids.length === 0}>
          {existingPkg ? "Update Package" : "Create Package"}
        </Button>
      </div>
    </form>
  );
}
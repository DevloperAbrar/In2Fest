import React, { useState, useEffect } from "react";
import { X, Plus, Trash2, Package, Clock } from "lucide-react";
import Button from "../../../components/common/Button";
import { bookingService } from "../../../services/bookingService";
import { showSuccess, showError } from "../../../components/common/Toast";
import { useFetch } from "../../../hooks/useFetch";
import dayjs from "dayjs";

const emptyForm = {
  client_name: "", phone: "", email: "",
  date_from: "", date_to: "",
  start_time: "", end_time: "",
  notes: "", total_amount: ""
};

function ItemRow({ item, slots, packages, onRemove, onAmountChange }) {
  const source = item.type === "slot"
    ? slots.find(s => s.id === item.id)
    : packages.find(p => p.id === item.id);

  return (
    <div className="flex items-center gap-3 bg-gray-50 rounded-xl p-3">
      <div className={`w-7 h-7 rounded-lg flex items-center justify-center flex-shrink-0 ${item.type === "package" ? "bg-purple-100 text-purple-700" : "bg-blue-100 text-blue-700"}`}>
        {item.type === "package" ? <Package size={13} /> : <Clock size={13} />}
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-gray-800 truncate">{source?.name || item.name}</p>
        <p className="text-xs text-gray-400">{item.type === "package" ? "Package" : "Slot"}</p>
      </div>
      <input type="number" min="0" placeholder="Amount ₹"
        value={item.amount || ""}
        onChange={e => onAmountChange(item.id, item.type, e.target.value)}
        className="w-28 border border-gray-200 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-300" />
      <button onClick={() => onRemove(item.id, item.type)}
        className="p-1 text-gray-400 hover:text-red-500 transition-colors">
        <Trash2 size={14} />
      </button>
    </div>
  );
}

export default function QuickBookingModal({ isOpen, onClose, venue, selectedDate, onCreated }) {
  const [form, setForm]               = useState(emptyForm);
  const [bookingItems, setBookingItems] = useState([]);
  const [addType, setAddType]         = useState("slot");
  const [addId, setAddId]             = useState("");
  const [saving, setSaving]           = useState(false);

  const { data: slots }    = useFetch(venue ? `/venues/${venue.id}/slots?activeOnly=true` : null, { skip: !venue });
  const { data: packages } = useFetch(venue ? `/venues/${venue.id}/packages?activeOnly=true` : null, { skip: !venue });

  useEffect(() => {
    if (isOpen && selectedDate) {
      const d = dayjs(selectedDate).format("YYYY-MM-DD");
      setForm({ ...emptyForm, date_from: d, date_to: d });
      setBookingItems([]);
      setAddId("");
    }
  }, [isOpen, selectedDate]);

  if (!isOpen) return null;

  const up = (field, val) => setForm(f => ({ ...f, [field]: val }));

  const addItem = () => {
    if (!addId) return;
    const already = bookingItems.find(i => i.id === addId && i.type === addType);
    if (already) return showError("Already added");

    const src = addType === "slot"
      ? slots?.find(s => s.id === addId)
      : packages?.find(p => p.id === addId);
    if (!src) return;

    setBookingItems(prev => [...prev, { type: addType, id: addId, name: src.name, amount: "" }]);
    setAddId("");
  };

  const removeItem = (id, type) => setBookingItems(prev => prev.filter(i => !(i.id === id && i.type === type)));

  const updateAmount = (id, type, val) => {
    setBookingItems(prev => prev.map(i => i.id === id && i.type === type ? { ...i, amount: val } : i));
  };

  const totalAuto = bookingItems.reduce((s, i) => s + (Number(i.amount) || 0), 0);

  const submit = async () => {
    if (!form.client_name.trim() || !form.phone.trim()) return showError("Client name and phone required");
    if (!/^\d{10}$/.test(form.phone.trim())) return showError("Enter a valid 10-digit phone number");
    if (!form.date_from) return showError("Date is required");
    if (!form.start_time || !form.end_time) return showError("Start and end time are required");
    if (bookingItems.length === 0) return showError("Add at least one slot or package");

    setSaving(true);
    try {
      await bookingService.create(venue.id, {
        client_name:   form.client_name,
        phone:         form.phone,
        email:         form.email || null,
        date_from:     form.date_from,
        date_to:       form.date_to || form.date_from,
        start_time:    form.start_time,
        end_time:      form.end_time,
        booking_items: bookingItems.map(i => ({ ...i, amount: Number(i.amount) || 0 })),
        total_amount:  form.total_amount ? Number(form.total_amount) : totalAuto,
        notes:         form.notes
      });
      showSuccess("Booking created");
      onCreated?.();
    } catch (err) {
      showError(err.response?.data?.message || "Failed to create booking");
    } finally { setSaving(false); }
  };

  const activeSlots    = (slots    || []).filter(s => s.is_active);
  const activePackages = (packages || []).filter(p => p.is_active);
  const addOptions     = addType === "slot" ? activeSlots : activePackages;

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center bg-black/40 sm:p-4" onClick={onClose}>
      <div className="bg-white rounded-t-3xl sm:rounded-2xl shadow-xl w-full sm:max-w-lg max-h-[95vh] overflow-y-auto flex flex-col"
        onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="sticky top-0 bg-white z-10 border-b border-gray-100">
          <div className="sm:hidden flex justify-center pt-2.5 pb-1">
            <div className="w-10 h-1 rounded-full bg-gray-200" />
          </div>
          <div className="flex items-center justify-between px-5 py-4">
            <div>
              <h3 className="font-semibold text-gray-900 text-lg">New Booking</h3>
              <p className="text-xs text-gray-400 mt-0.5">Fill details and confirm</p>
            </div>
            <button onClick={onClose} className="w-8 h-8 flex items-center justify-center rounded-lg text-gray-400 hover:bg-gray-100">
              <X size={18} />
            </button>
          </div>
        </div>

        <div className="p-5 space-y-5">
          {/* Client details */}
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Client Details</p>
            <div className="grid grid-cols-2 gap-3 mb-3">
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">Name *</label>
                <input value={form.client_name} onChange={e => up("client_name", e.target.value)}
                  placeholder="Client name"
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-300" />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">Phone *</label>
                <input value={form.phone} onChange={e => up("phone", e.target.value.replace(/\D/g, "").slice(0, 10))}
                  placeholder="10-digit number" inputMode="numeric"
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-300" />
              </div>
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">Email (optional)</label>
              <input type="email" value={form.email} onChange={e => up("email", e.target.value)}
                placeholder="client@email.com"
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-300" />
            </div>
          </div>

          {/* Date & Time */}
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Date & Time</p>
            <div className="grid grid-cols-2 gap-3 mb-3">
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">From Date *</label>
                <input type="date" value={form.date_from} onChange={e => up("date_from", e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-300" />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">To Date</label>
                <input type="date" value={form.date_to} min={form.date_from} onChange={e => up("date_to", e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-300" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">Start Time *</label>
                <input type="time" value={form.start_time} onChange={e => up("start_time", e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-300" />
              </div>
              <div>
                <label className="text-xs font-medium text-gray-500 mb-1 block">End Time *</label>
                <input type="time" value={form.end_time} onChange={e => up("end_time", e.target.value)}
                  className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-300" />
              </div>
            </div>
          </div>

          {/* Add Slots / Packages */}
          <div>
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wide mb-3">Slots & Packages</p>

            {/* Add row */}
            <div className="flex gap-2 mb-3">
              <div className="flex rounded-xl border border-gray-200 overflow-hidden text-sm">
                <button onClick={() => { setAddType("slot"); setAddId(""); }}
                  className={`px-3 py-2 font-medium transition-colors ${addType === "slot" ? "bg-primary-600 text-white" : "text-gray-500 hover:bg-gray-50"}`}>
                  Slot
                </button>
                <button onClick={() => { setAddType("package"); setAddId(""); }}
                  className={`px-3 py-2 font-medium transition-colors ${addType === "package" ? "bg-purple-600 text-white" : "text-gray-500 hover:bg-gray-50"}`}>
                  Package
                </button>
              </div>
              <select value={addId} onChange={e => setAddId(e.target.value)}
                className="flex-1 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-300 bg-white">
                <option value="">Select {addType}…</option>
                {addOptions.map(o => (
                  <option key={o.id} value={o.id}>{o.name}</option>
                ))}
              </select>
              <button onClick={addItem}
                className="w-10 h-10 flex items-center justify-center bg-primary-600 text-white rounded-xl hover:bg-primary-700 transition-colors">
                <Plus size={16} />
              </button>
            </div>

            {/* Item list */}
            {bookingItems.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-4 bg-gray-50 rounded-xl">No items added yet</p>
            ) : (
              <div className="space-y-2">
                {bookingItems.map(item => (
                  <ItemRow key={`${item.type}-${item.id}`} item={item}
                    slots={slots || []} packages={packages || []}
                    onRemove={removeItem} onAmountChange={updateAmount} />
                ))}
                {bookingItems.length > 1 && (
                  <div className="flex justify-between items-center px-3 py-2 bg-gray-50 rounded-xl">
                    <span className="text-xs text-gray-500 font-medium">Auto total</span>
                    <span className="text-sm font-bold text-gray-900">₹{totalAuto.toLocaleString("en-IN")}</span>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Final amount + notes */}
          <div className="space-y-3">
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">Final Amount (₹) — override if negotiated</label>
              <input type="number" min="0" value={form.total_amount} onChange={e => up("total_amount", e.target.value)}
                placeholder={`Auto: ₹${totalAuto.toLocaleString("en-IN")}`}
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-300" />
            </div>
            <div>
              <label className="text-xs font-medium text-gray-500 mb-1 block">Notes (optional)</label>
              <textarea rows={2} value={form.notes} onChange={e => up("notes", e.target.value)}
                placeholder="Any special requirements..."
                className="w-full border border-gray-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-300 resize-none" />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="sticky bottom-0 bg-white border-t border-gray-100 p-4 flex gap-3">
          <Button variant="outline" onClick={onClose} className="w-auto">Cancel</Button>
          <Button onClick={submit} loading={saving} className="flex-1">Confirm Booking</Button>
        </div>
      </div>
    </div>
  );
}
import React, { useState } from "react";
import DashboardLayout from "../../../components/layout/DashboardLayout.jsx";
import { ownerSidebarItems } from "../ownerSidebarItems.js";
import { useVenue } from "../../../context/VenueContext.jsx";
import { useFetch } from "../../../hooks/useFetch";
import { billingService } from "../../../services/billingService";
import Input from "../../../components/common/Input";
import Select from "../../../components/common/Select";
import Button from "../../../components/common/Button";
import InvoicePreview from "./InvoicePreview.jsx";
import { showSuccess, showError } from "../../../components/common/Toast";
import { Plus, Trash2 } from "lucide-react";

export default function QuotationForm() {
  const { venue } = useVenue();
  const { data: clients } = useFetch(venue ? `/venues/${venue.id}/clients` : null, { skip: !venue });
  const [clientId, setClientId] = useState("");
  const [lineItems, setLineItems] = useState([{ description: "", quantity: 1, rate: 0, amount: 0 }]);
  const [validityDate, setValidityDate] = useState("");
  const [terms, setTerms] = useState("");
  const [saving, setSaving] = useState(false);

  const updateItem = (idx, field, value) => {
    const updated = [...lineItems];
    updated[idx][field] = value;
    updated[idx].amount = Number(updated[idx].quantity) * Number(updated[idx].rate);
    setLineItems(updated);
  };

  const addItem = () => setLineItems([...lineItems, { description: "", quantity: 1, rate: 0, amount: 0 }]);
  const removeItem = (idx) => setLineItems(lineItems.filter((_, i) => i !== idx));

  const handleSubmit = async () => {
    if (!clientId) return showError("Select a client");
    setSaving(true);
    try {
      await billingService.createInvoice(venue.id, {
        type: "quotation",
        client_id: clientId,
        line_items: lineItems,
        validity_date: validityDate,
        terms
      });
      showSuccess("Quotation created");
      setLineItems([{ description: "", quantity: 1, rate: 0, amount: 0 }]);
    } catch (err) {
      showError(err.response?.data?.message || "Failed to create quotation");
    } finally {
      setSaving(false);
    }
  };

  return (
    <DashboardLayout sidebarItems={ownerSidebarItems} pageTitle="Create Quotation">
      <div className="max-w-2xl bg-white p-6 rounded-xl border border-gray-100 space-y-4">
        <Select
          label="Client"
          value={clientId}
          onChange={(e) => setClientId(e.target.value)}
          options={[{ value: "", label: "Select client" }, ...(clients || []).map((c) => ({ value: c.id, label: c.name }))]}
        />

        {lineItems.map((item, idx) => (
          <div key={idx} className="grid grid-cols-5 gap-2 items-end">
            <Input className="col-span-2" placeholder="Description" value={item.description} onChange={(e) => updateItem(idx, "description", e.target.value)} />
            <Input type="number" placeholder="Qty" value={item.quantity} onChange={(e) => updateItem(idx, "quantity", e.target.value)} />
            <Input type="number" placeholder="Rate" value={item.rate} onChange={(e) => updateItem(idx, "rate", e.target.value)} />
            <button onClick={() => removeItem(idx)} className="text-red-500"><Trash2 size={16} /></button>
          </div>
        ))}
        <Button variant="outline" onClick={addItem}><Plus size={14} /> Add Item</Button>

        <Input label="Validity Date" type="date" value={validityDate} onChange={(e) => setValidityDate(e.target.value)} />
        <Input label="Terms" value={terms} onChange={(e) => setTerms(e.target.value)} />

        <InvoicePreview lineItems={lineItems} gstEnabled={false} />

        <Button onClick={handleSubmit} loading={saving} className="w-full">Create Quotation</Button>
      </div>
    </DashboardLayout>
  );
}
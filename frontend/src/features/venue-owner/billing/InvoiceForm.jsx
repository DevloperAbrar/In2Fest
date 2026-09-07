import React, { useState, useMemo } from "react";
import DashboardLayout from "../../../components/layout/DashboardLayout.jsx";
import { ownerSidebarItems } from "../ownerSidebarItems.js";
import { useVenue } from "../../../context/VenueContext.jsx";
import { useFetch } from "../../../hooks/useFetch";
import { billingService } from "../../../services/billingService";
import Input from "../../../components/common/Input";
import Select from "../../../components/common/Select";
import Button from "../../../components/common/Button";
import Modal from "../../../components/common/Modal";
import InvoicePreview from "./InvoicePreview.jsx";
import { showSuccess, showError } from "../../../components/common/Toast";
import { formatCurrency } from "../../../lib/formatters";
import { Plus, Trash2, Send, FileText, Eye, Download, Pencil } from "lucide-react";

const DISCOUNT_OPTIONS = [
  { value: "none", label: "No discount" },
  { value: "percentage", label: "% Percentage" },
  { value: "flat", label: "₹ Flat amount" }
];

const GST_RATE_OPTIONS = [
  { value: "5", label: "5% (2.5% + 2.5%)" },
  { value: "12", label: "12% (6% + 6%)" },
  { value: "18", label: "18% (9% + 9%)" },
  { value: "28", label: "28% (14% + 14%)" },
  { value: "custom", label: "Custom rate…" }
];

const EMPTY_LINE_ITEM = { description: "", quantity: 1, rate: 0, discount_type: "none", discount_value: 0 };

const STATUS_STYLES = {
  draft: "bg-gray-100 text-gray-600",
  sent: "bg-blue-100 text-blue-700",
  paid: "bg-green-100 text-green-700"
};

// Matches GST_RATE_OPTIONS values, or falls back to "custom" for anything else.
const KNOWN_GST_RATES = ["5", "12", "18", "28"];

function calculateLineItemAmount(item) {
  const quantity = Number(item.quantity) || 0;
  const rate = Number(item.rate) || 0;
  const base = quantity * rate;

  const discountType = item.discount_type || "none";
  const discountValue = Number(item.discount_value) || 0;

  let lineDiscount = 0;
  if (discountType === "percentage") lineDiscount = base * (discountValue / 100);
  else if (discountType === "flat") lineDiscount = discountValue;

  lineDiscount = Math.min(Math.max(lineDiscount, 0), base);

  return +(base - lineDiscount).toFixed(2);
}

function calculateTotals(lineItems, { gstEnabled, gstRate, discountType, discountValue }) {
  const itemsWithAmount = lineItems.map((item) => ({
    ...item,
    amount: calculateLineItemAmount(item)
  }));

  const subtotal = itemsWithAmount.reduce((sum, item) => sum + item.amount, 0);

  let discountAmount = 0;
  if (discountType === "percentage") discountAmount = subtotal * (Number(discountValue || 0) / 100);
  else if (discountType === "flat") discountAmount = Number(discountValue || 0);
  discountAmount = Math.min(Math.max(discountAmount, 0), subtotal);

  const taxableAmount = +(subtotal - discountAmount).toFixed(2);

  const halfRate = (Number(gstRate) || 0) / 2;
  let cgst = 0, sgst = 0;
  if (gstEnabled) {
    cgst = +(taxableAmount * (halfRate / 100)).toFixed(2);
    sgst = +(taxableAmount * (halfRate / 100)).toFixed(2);
  }

  const total = +(taxableAmount + cgst + sgst).toFixed(2);

  return { itemsWithAmount, subtotal: +subtotal.toFixed(2), discountAmount: +discountAmount.toFixed(2), taxableAmount, cgst, sgst, total };
}

// Maps a saved invoice (backend snake_case shape) into the props InvoicePreview expects.
function mapSavedInvoiceToPreviewProps(invoice) {
  return {
    lineItems: invoice.line_items || [],
    gstEnabled: invoice.gst_enabled,
    gstRate: invoice.gst_rate,
    overallDiscountType: invoice.discount_type,
    overallDiscountValue: invoice.discount_value,
    totals: {
      subtotal: invoice.subtotal,
      discountAmount: invoice.discount_amount,
      taxableAmount: invoice.taxable_amount,
      cgst: invoice.cgst_amount,
      sgst: invoice.sgst_amount,
      total: invoice.total
    }
  };
}

export default function InvoiceForm() {
  const { venue } = useVenue();
  const { data: clients } = useFetch(venue ? `/venues/${venue.id}/clients` : null, { skip: !venue });
  const { data: serviceItems } = useFetch(venue ? `/venues/${venue.id}/billing/service-items` : null, { skip: !venue });
  const { data: invoices, loading: invoicesLoading, refetch: refetchInvoices } = useFetch(
    venue ? `/venues/${venue.id}/billing/invoices` : null,
    { skip: !venue }
  );

  const [modalOpen, setModalOpen] = useState(false);
  const [viewInvoice, setViewInvoice] = useState(null);
  const [sharingId, setSharingId] = useState(null);
  const [deletingId, setDeletingId] = useState(null);
  const [editingInvoiceId, setEditingInvoiceId] = useState(null); // null = creating new

  const [clientId, setClientId] = useState("");
  const [lineItems, setLineItems] = useState([{ ...EMPTY_LINE_ITEM }]);
  const [gstEnabled, setGstEnabled] = useState(!!venue?.gst_enabled);
  const [gstRateSelection, setGstRateSelection] = useState("18");
  const [customGstRate, setCustomGstRate] = useState(18);
  const [overallDiscountType, setOverallDiscountType] = useState("none");
  const [overallDiscountValue, setOverallDiscountValue] = useState(0);
  const [savedInvoice, setSavedInvoice] = useState(null);
  const [saving, setSaving] = useState(false);

  const effectiveGstRate = gstRateSelection === "custom" ? Number(customGstRate) || 0 : Number(gstRateSelection);

  const resetForm = () => {
    setClientId("");
    setLineItems([{ ...EMPTY_LINE_ITEM }]);
    setGstEnabled(!!venue?.gst_enabled);
    setGstRateSelection("18");
    setCustomGstRate(18);
    setOverallDiscountType("none");
    setOverallDiscountValue(0);
    setSavedInvoice(null);
    setEditingInvoiceId(null);
  };

  const openModal = () => {
    resetForm();
    setModalOpen(true);
  };

  const openEditModal = async (invoiceId) => {
    try {
      const { data } = await billingService.getInvoice(venue.id, invoiceId);
      const inv = data.data;

      if (inv.status !== "draft") {
        return showError("Only draft invoices can be edited.");
      }

      setEditingInvoiceId(inv.id);
      setClientId(inv.client_id || "");
      setLineItems(
        (inv.line_items || []).map((li) => ({
          description: li.description,
          quantity: li.quantity,
          rate: li.rate,
          discount_type: li.discount_type || "none",
          discount_value: li.discount_value || 0
        }))
      );
      setGstEnabled(!!inv.gst_enabled);
      const rateStr = String(inv.gst_rate ?? 18);
      if (KNOWN_GST_RATES.includes(rateStr)) {
        setGstRateSelection(rateStr);
      } else {
        setGstRateSelection("custom");
        setCustomGstRate(inv.gst_rate ?? 18);
      }
      setOverallDiscountType(inv.discount_type || "none");
      setOverallDiscountValue(inv.discount_value || 0);
      setSavedInvoice(null);
      setModalOpen(true);
    } catch {
      showError("Failed to load invoice for editing");
    }
  };

  const closeModal = () => {
    setModalOpen(false);
    resetForm();
    refetchInvoices();
  };

  const updateItem = (idx, field, value) => {
    const updated = [...lineItems];
    updated[idx][field] = value;
    setLineItems(updated);
  };

  const addItem = () => setLineItems([...lineItems, { ...EMPTY_LINE_ITEM }]);
  const removeItem = (idx) => setLineItems(lineItems.filter((_, i) => i !== idx));

  const addFromCatalog = (itemId) => {
    const item = (serviceItems || []).find((i) => i.id === itemId);
    if (!item) return;
    setLineItems([
      ...lineItems,
      { description: item.name, quantity: 1, rate: item.default_price, discount_type: "none", discount_value: 0 }
    ]);
  };

  const totals = useMemo(
    () =>
      calculateTotals(lineItems, {
        gstEnabled,
        gstRate: effectiveGstRate,
        discountType: overallDiscountType,
        discountValue: overallDiscountValue
      }),
    [lineItems, gstEnabled, effectiveGstRate, overallDiscountType, overallDiscountValue]
  );

  const handleSubmit = async () => {
    if (!clientId) return showError("Select a client");
    if (lineItems.length === 0 || lineItems.every((i) => !i.description.trim())) {
      return showError("Add at least one line item");
    }
    setSaving(true);
    try {
      const payload = {
        type: "invoice",
        client_id: clientId,
        line_items: lineItems,
        gst_enabled: gstEnabled,
        gst_rate: effectiveGstRate,
        discount_type: overallDiscountType,
        discount_value: overallDiscountValue
      };

      if (editingInvoiceId) {
        const { data } = await billingService.updateInvoice(venue.id, editingInvoiceId, payload);
        setSavedInvoice(data.data);
        showSuccess("Invoice updated");
      } else {
        const { data } = await billingService.createInvoice(venue.id, payload);
        setSavedInvoice(data.data);
        showSuccess("Invoice created");
      }
      refetchInvoices();
    } catch (err) {
      showError(err.response?.data?.message || "Failed to save invoice");
    } finally {
      setSaving(false);
    }
  };

  const handleShare = async () => {
    try {
      await billingService.shareInvoice(venue.id, savedInvoice.id);
      showSuccess("Invoice shared via WhatsApp");
      closeModal();
    } catch {
      showError("Failed to share invoice");
    }
  };

  const handleShareFromList = async (invoiceId) => {
    setSharingId(invoiceId);
    try {
      await billingService.shareInvoice(venue.id, invoiceId);
      showSuccess("Invoice shared via WhatsApp");
      refetchInvoices();
      setViewInvoice(null);
    } catch {
      showError("Failed to share invoice");
    } finally {
      setSharingId(null);
    }
  };

  const handleDelete = async (invoiceId, status) => {
    if (status !== "draft") {
      return showError("Only draft invoices can be deleted.");
    }
    const confirmed = window.confirm("Delete this invoice? This cannot be undone.");
    if (!confirmed) return;

    setDeletingId(invoiceId);
    try {
      await billingService.deleteInvoice(venue.id, invoiceId);
      showSuccess("Invoice deleted");
      refetchInvoices();
    } catch (err) {
      showError(err.response?.data?.message || "Failed to delete invoice");
    } finally {
      setDeletingId(null);
    }
  };

  const openInvoiceView = async (invoiceId) => {
    try {
      const { data } = await billingService.getInvoice(venue.id, invoiceId);
      setViewInvoice(data.data);
    } catch {
      showError("Failed to load invoice");
    }
  };

  const invoiceList = invoices || [];

  return (
    <DashboardLayout sidebarItems={ownerSidebarItems} pageTitle="Billing">
      <div className="flex justify-end mb-4">
        <Button onClick={openModal}>
          <Plus size={16} /> Create Invoice
        </Button>
      </div>

      {invoicesLoading ? (
        <div className="bg-white rounded-2xl shadow-card border border-navy-100/60 p-12 text-center text-navy-400 text-sm">
          Loading invoices…
        </div>
      ) : invoiceList.length === 0 ? (
        <div className="bg-white rounded-2xl shadow-card border border-navy-100/60 p-10 md:p-12 flex flex-col items-center justify-center text-center">
          <FileText size={40} className="text-navy-200 mb-3" />
          <h3 className="text-navy-700 font-medium mb-1">No invoice open</h3>
          <p className="text-sm text-navy-400 mb-4">Click "Create Invoice" to generate a new bill for a client.</p>
          <Button onClick={openModal} variant="outline">
            <Plus size={16} /> Create Invoice
          </Button>
        </div>
      ) : (
        <>
          {/* Mobile: cards */}
          <div className="md:hidden space-y-3">
            {invoiceList.map((inv) => {
              const isDraft = inv.status === "draft";
              return (
                <div key={inv.id} className="bg-white rounded-2xl shadow-card border border-navy-100/60 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-semibold text-navy-900 truncate">{inv.invoice_number}</p>
                      <p className="text-xs text-navy-400 mt-0.5 truncate">{inv.client?.name || "-"}</p>
                    </div>
                    <span className={`shrink-0 px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_STYLES[inv.status] || STATUS_STYLES.draft}`}>
                      {inv.status}
                    </span>
                  </div>

                  <div className="flex items-center justify-between mt-3 pt-3 border-t border-navy-100/60">
                    <p className="text-xs text-navy-400">
                      {inv.created_at ? new Date(inv.created_at).toLocaleDateString() : "-"}
                    </p>
                    <p className="font-semibold text-navy-900">{formatCurrency(inv.total)}</p>
                  </div>

                  <div className="flex items-center justify-end gap-1 mt-2">
                    <button onClick={() => openInvoiceView(inv.id)} className="tap-scale w-9 h-9 flex items-center justify-center rounded-lg text-navy-400" title="View">
                      <Eye size={16} />
                    </button>
                    {inv.pdf_url && (
                      <a href={inv.pdf_url} target="_blank" rel="noreferrer" className="tap-scale w-9 h-9 flex items-center justify-center rounded-lg text-navy-400" title="Download PDF">
                        <Download size={16} />
                      </a>
                    )}
                    {inv.status !== "sent" && (
                      <button
                        onClick={() => handleShareFromList(inv.id)}
                        disabled={sharingId === inv.id}
                        className="tap-scale w-9 h-9 flex items-center justify-center rounded-lg text-navy-400 disabled:opacity-50"
                        title="Share via WhatsApp"
                      >
                        <Send size={16} />
                      </button>
                    )}
                    <button
                      onClick={() => openEditModal(inv.id)}
                      disabled={!isDraft}
                      className={`tap-scale w-9 h-9 flex items-center justify-center rounded-lg ${isDraft ? "text-navy-400" : "text-navy-200 cursor-not-allowed"}`}
                      title={isDraft ? "Edit invoice" : "Only draft invoices can be edited"}
                    >
                      <Pencil size={16} />
                    </button>
                    <button
                      onClick={() => handleDelete(inv.id, inv.status)}
                      disabled={!isDraft || deletingId === inv.id}
                      className={`tap-scale w-9 h-9 flex items-center justify-center rounded-lg ${isDraft ? "text-navy-400" : "text-navy-200 cursor-not-allowed"} disabled:opacity-50`}
                      title={isDraft ? "Delete invoice" : "Only draft invoices can be deleted"}
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Desktop: table */}
          <div className="hidden md:block bg-white rounded-2xl shadow-card border border-navy-100/60 overflow-x-auto">
            <table className="w-full text-sm min-w-[720px]">
              <thead className="bg-paper text-navy-400 text-xs text-left">
                <tr>
                  <th className="px-4 py-3 font-medium">Invoice #</th>
                  <th className="px-4 py-3 font-medium">Client</th>
                  <th className="px-4 py-3 font-medium">Date</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium text-right">Total</th>
                  <th className="px-4 py-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-navy-100/60">
                {invoiceList.map((inv) => {
                  const isDraft = inv.status === "draft";
                  return (
                    <tr key={inv.id} className="hover:bg-paper">
                      <td className="px-4 py-3 font-medium text-navy-800">{inv.invoice_number}</td>
                      <td className="px-4 py-3 text-navy-600">{inv.client?.name || " -"}</td>
                      <td className="px-4 py-3 text-navy-400">
                        {inv.created_at ? new Date(inv.created_at).toLocaleDateString() : " -"}
                      </td>
                      <td className="px-4 py-3">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_STYLES[inv.status] || STATUS_STYLES.draft}`}>
                          {inv.status}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right font-medium text-navy-800">{formatCurrency(inv.total)}</td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-3">
                          <button onClick={() => openInvoiceView(inv.id)} className="text-navy-400 hover:text-primary-600" title="View">
                            <Eye size={16} />
                          </button>
                          {inv.pdf_url && (
                            <a href={inv.pdf_url} target="_blank" rel="noreferrer" className="text-navy-400 hover:text-primary-600" title="Download PDF">
                              <Download size={16} />
                            </a>
                          )}
                          {inv.status !== "sent" && (
                            <button
                              onClick={() => handleShareFromList(inv.id)}
                              disabled={sharingId === inv.id}
                              className="text-navy-400 hover:text-primary-600 disabled:opacity-50"
                              title="Share via WhatsApp"
                            >
                              <Send size={16} />
                            </button>
                          )}
                          <button
                            onClick={() => openEditModal(inv.id)}
                            disabled={!isDraft}
                            className={`${isDraft ? "text-navy-400 hover:text-primary-600" : "text-navy-200 cursor-not-allowed"}`}
                            title={isDraft ? "Edit invoice" : "Only draft invoices can be edited"}
                          >
                            <Pencil size={16} />
                          </button>
                          <button
                            onClick={() => handleDelete(inv.id, inv.status)}
                            disabled={!isDraft || deletingId === inv.id}
                            className={`${isDraft ? "text-navy-400 hover:text-primary-600" : "text-navy-200 cursor-not-allowed"} disabled:opacity-50`}
                            title={isDraft ? "Delete invoice" : "Only draft invoices can be deleted"}
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* Create / Edit invoice modal */}
      <Modal isOpen={modalOpen} onClose={closeModal} title={editingInvoiceId ? "Edit Invoice" : "Create Invoice"} size="lg">
        <div className="space-y-6">
          <Select
            label="Client"
            value={clientId}
            onChange={(e) => setClientId(e.target.value)}
            options={[{ value: "", label: "Select client" }, ...(clients || []).map((c) => ({ value: c.id, label: c.name }))]}
          />

          {serviceItems && serviceItems.length > 0 && (
            <Select
              label="Quick add from catalog"
              onChange={(e) => addFromCatalog(e.target.value)}
              options={[{ value: "", label: "Select an item to add" }, ...serviceItems.map((i) => ({ value: i.id, label: `${i.name} (₹${i.default_price})` }))]}
            />
          )}

          <div>
            <h4 className="text-sm font-semibold text-gray-800 mb-3">Items</h4>

            <div className="hidden md:grid grid-cols-12 gap-3 text-xs font-medium text-gray-400 px-1 mb-2">
              <div className="col-span-3">Description</div>
              <div className="col-span-2">Quantity</div>
              <div className="col-span-2">Rate (₹)</div>
              <div className="col-span-2">Discount Type</div>
              <div className="col-span-2">Discount Value</div>
              <div className="col-span-1 text-right">Amount</div>
            </div>

            <div className="space-y-3">
              {lineItems.map((item, idx) => {
                const amount = calculateLineItemAmount(item);
                return (
                  <div key={idx} className="grid grid-cols-12 gap-3 items-center bg-gray-50 rounded-lg p-3">
                    <div className="col-span-12 md:col-span-3">
                      <Input
                        placeholder="e.g. Marriage Hall Rental"
                        value={item.description}
                        onChange={(e) => updateItem(idx, "description", e.target.value)}
                      />
                    </div>
                    <div className="col-span-6 md:col-span-2">
                      <Input
                        type="number"
                        min="0"
                        placeholder="Qty"
                        value={item.quantity}
                        onChange={(e) => updateItem(idx, "quantity", e.target.value)}
                      />
                    </div>
                    <div className="col-span-6 md:col-span-2">
                      <Input
                        type="number"
                        min="0"
                        placeholder="Rate per unit"
                        value={item.rate}
                        onChange={(e) => updateItem(idx, "rate", e.target.value)}
                      />
                    </div>
                    <div className="col-span-6 md:col-span-2">
                      <Select
                        value={item.discount_type}
                        onChange={(e) => updateItem(idx, "discount_type", e.target.value)}
                        options={DISCOUNT_OPTIONS}
                      />
                    </div>
                    <div className="col-span-6 md:col-span-2">
                      <Input
                        type="number"
                        min="0"
                        disabled={item.discount_type === "none"}
                        placeholder={item.discount_type === "percentage" ? "e.g. 10" : "e.g. 500"}
                        value={item.discount_value}
                        onChange={(e) => updateItem(idx, "discount_value", e.target.value)}
                      />
                    </div>
                    <div className="col-span-9 md:col-span-1 text-right font-medium text-sm text-gray-700">
                      ₹{amount.toFixed(2)}
                    </div>
                    <div className="col-span-3 md:col-span-12 flex justify-end md:justify-start">
                      <button onClick={() => removeItem(idx)} className="text-red-500 hover:text-red-700" title="Remove item">
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            <Button variant="outline" onClick={addItem} className="mt-3">
              <Plus size={14} /> Add Item
            </Button>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 border-t pt-5">
            <div>
              <h4 className="text-sm font-semibold text-gray-800 mb-2">Overall Discount</h4>
              <div className="grid grid-cols-2 gap-2">
                <Select
                  value={overallDiscountType}
                  onChange={(e) => setOverallDiscountType(e.target.value)}
                  options={DISCOUNT_OPTIONS}
                />
                <Input
                  type="number"
                  min="0"
                  disabled={overallDiscountType === "none"}
                  placeholder={overallDiscountType === "percentage" ? "e.g. 5" : "e.g. 1000"}
                  value={overallDiscountValue}
                  onChange={(e) => setOverallDiscountValue(e.target.value)}
                />
              </div>
              <p className="text-xs text-gray-400 mt-1.5">Applied on top of the subtotal, after item-level discounts.</p>
            </div>

            <div>
              <h4 className="text-sm font-semibold text-gray-800 mb-2">GST</h4>
              <label className="flex items-center gap-2 text-sm text-gray-700 cursor-pointer mb-2">
                <input
                  type="checkbox"
                  checked={gstEnabled}
                  onChange={(e) => setGstEnabled(e.target.checked)}
                  className="w-4 h-4 accent-primary-600"
                />
                Apply GST to this invoice
              </label>

              {gstEnabled && (
                <div className="grid grid-cols-2 gap-2">
                  <Select
                    value={gstRateSelection}
                    onChange={(e) => setGstRateSelection(e.target.value)}
                    options={GST_RATE_OPTIONS}
                  />
                  {gstRateSelection === "custom" && (
                    <Input
                      type="number"
                      min="0"
                      max="100"
                      placeholder="Total GST %"
                      value={customGstRate}
                      onChange={(e) => setCustomGstRate(e.target.value)}
                    />
                  )}
                </div>
              )}

              {gstEnabled && (
                <p className="text-xs text-gray-400 mt-1.5">
                  Split evenly: {(effectiveGstRate / 2).toFixed(2)}% CGST + {(effectiveGstRate / 2).toFixed(2)}% SGST
                </p>
              )}

              {gstEnabled && !venue?.gst_number && (
                <p className="text-xs text-red-500 mt-1.5">
                  No GSTIN saved for this venue. Add one in Settings before generating a GST invoice.
                </p>
              )}
            </div>
          </div>

          <InvoicePreview
            lineItems={lineItems}
            gstEnabled={gstEnabled}
            gstRate={effectiveGstRate}
            overallDiscountType={overallDiscountType}
            overallDiscountValue={overallDiscountValue}
            totals={totals}
          />

          {!savedInvoice ? (
            <Button onClick={handleSubmit} loading={saving} className="w-full">
              {editingInvoiceId ? "Save Changes" : "Generate Invoice"}
            </Button>
          ) : (
            <Button onClick={handleShare} className="w-full"><Send size={14} /> Share via WhatsApp</Button>
          )}
        </div>
      </Modal>

      {/* View existing invoice modal */}
      <Modal
        isOpen={!!viewInvoice}
        onClose={() => setViewInvoice(null)}
        title={viewInvoice ? `Invoice ${viewInvoice.invoice_number}` : "Invoice"}
        size="lg"
      >
        {viewInvoice && (
          <div className="space-y-4">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-500">Client: <span className="text-gray-800 font-medium">{viewInvoice.client?.name}</span></span>
              <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${STATUS_STYLES[viewInvoice.status] || STATUS_STYLES.draft}`}>
                {viewInvoice.status}
              </span>
            </div>

            <InvoicePreview {...mapSavedInvoiceToPreviewProps(viewInvoice)} />

            <div className="flex gap-3">
              {viewInvoice.pdf_url && (
                <a href={viewInvoice.pdf_url} target="_blank" rel="noreferrer" className="flex-1">
                  <Button variant="outline" className="w-full"><Download size={14} /> Download PDF</Button>
                </a>
              )}
              {viewInvoice.status !== "sent" && (
                <Button
                  onClick={() => handleShareFromList(viewInvoice.id)}
                  loading={sharingId === viewInvoice.id}
                  className="flex-1"
                >
                  <Send size={14} /> Share via WhatsApp
                </Button>
              )}
            </div>
          </div>
        )}
      </Modal>
    </DashboardLayout>
  );
}
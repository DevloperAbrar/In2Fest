import React, { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import dayjs from "dayjs";
import { ArrowLeft, Plus, Trash2, Search, X, Package, Info } from "lucide-react";
import DashboardLayout from "../../../components/layout/DashboardLayout.jsx";
import Modal from "../../../components/common/Modal";
import Button from "../../../components/common/Button";
import { ownerSidebarItems } from "../ownerSidebarItems.js";
import { useVenue } from "../../../context/VenueContext.jsx";
import { useFetch } from "../../../hooks/useFetch";
import { useBusinessProfile } from "../../../hooks/useBusinessProfile";
import { billingService } from "../../../services/billingService";
import { showSuccess, showError } from "../../../components/common/Toast";
import {
  DEFAULT_BILLING, DEFAULT_LABELS, DOC_TYPES, GSTIN_RE, GST_RATES, INDIAN_STATES, PAYMENT_METHODS,
  calculateDocument, inr
} from "../../../lib/billingMath";
import { Card, Field, Toggle, inputCls } from "./billingShared.jsx";

const PAYMENT_TERMS = [
  { label: "Due on receipt", days: 0 },
  { label: "Net 7", days: 7 },
  { label: "Net 15", days: 15 },
  { label: "Net 30", days: 30 },
  { label: "Custom", days: null }
];

const GRID_TAX = "md:grid-cols-[minmax(0,1fr)_72px_84px_104px_124px_76px_104px_28px]";
const GRID_NO_TAX = "md:grid-cols-[minmax(0,1fr)_72px_84px_104px_124px_104px_28px]";

let lineSeq = 0;
const newLine = (over = {}) => ({
  _k: ++lineSeq,
  description: "",
  hsn_sac: "",
  quantity: "1",
  unit: "",
  rate: "",
  discount_type: "percentage",
  discount_value: "",
  tax_rate: "",
  ...over
});
const isBlank = (l) => !l.description.trim() && !Number(l.rate);

const blankForm = () => ({
  clientId: "",
  customer: { name: "", phone: "", email: "", address: "", gstin: "", state_code: "" },
  lines: [newLine()],
  gstEnabled: false,
  priceIncludesTax: false,
  roundOff: true,
  discountType: "none",
  discountValue: "",
  dueDate: "",
  validityDate: "",
  paymentTerms: "",
  terms: "",
  notes: "",
  custom: {}
});

/* ------------------------------------------------------------------ */

function ClientPicker({ clients, value, onSelect, onClear, noun }) {
  const [open, setOpen] = useState(false);
  const [q, setQ] = useState("");
  const ref = useRef(null);

  useEffect(() => {
    const h = (e) => { if (ref.current && !ref.current.contains(e.target)) setOpen(false); };
    document.addEventListener("mousedown", h);
    return () => document.removeEventListener("mousedown", h);
  }, []);

  const selected = clients.find((c) => c.id === value);
  const list = clients
    .filter((c) => (c.name || "").toLowerCase().includes(q.toLowerCase()) || String(c.phone || "").includes(q))
    .slice(0, 30);

  if (selected) {
    return (
      <div className="flex items-center justify-between gap-3 rounded-lg border border-navy-200 bg-paper px-3 h-10">
        <p className="text-sm text-navy-800 truncate">
          {selected.name}{selected.phone ? <span className="text-navy-400"> · {selected.phone}</span> : null}
        </p>
        <button type="button" onClick={onClear} className="text-navy-400 hover:text-navy-700" aria-label="Clear"><X size={15} /></button>
      </div>
    );
  }

  return (
    <div className="relative" ref={ref}>
      <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-navy-300" />
      <input
        className={`${inputCls} pl-9`}
        placeholder={`Search saved ${noun.toLowerCase()} or type a new name below`}
        value={q}
        onFocus={() => setOpen(true)}
        onChange={(e) => { setQ(e.target.value); setOpen(true); }}
      />
      {open && (
        <div className="absolute z-20 mt-1 w-full max-h-60 overflow-y-auto bg-white rounded-xl border border-navy-100 shadow-xl p-1">
          {list.length === 0 ? (
            <p className="px-3 py-3 text-sm text-navy-400">No match. Fill the details below to bill a new {noun.toLowerCase()}.</p>
          ) : (
            list.map((c) => (
              <button
                type="button"
                key={c.id}
                onClick={() => { onSelect(c); setOpen(false); setQ(""); }}
                className="w-full text-left px-3 py-2 rounded-lg hover:bg-navy-50"
              >
                <p className="text-sm text-navy-800">{c.name}</p>
                {c.phone && <p className="text-xs text-navy-400">{c.phone}</p>}
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}

function CatalogPicker({ items, onPick, onClose, cfg }) {
  const [q, setQ] = useState("");
  const list = items.filter((i) => i.name.toLowerCase().includes(q.toLowerCase()) || String(i.sku || "").toLowerCase().includes(q.toLowerCase()));
  return (
    <Modal isOpen onClose={onClose} title="Add from item catalog" size="md">
      <input autoFocus className={`${inputCls} mb-3`} placeholder="Search items" value={q} onChange={(e) => setQ(e.target.value)} />
      {list.length === 0 ? (
        <p className="text-sm text-navy-400 py-8 text-center">No items found. Add items in the catalog first.</p>
      ) : (
        <div className="divide-y divide-navy-100/70 rounded-xl border border-navy-100/70 max-h-80 overflow-y-auto">
          {list.map((i) => (
            <button type="button" key={i.id} onClick={() => onPick(i)} className="w-full flex items-center justify-between gap-3 px-4 py-3 text-left hover:bg-paper">
              <div className="min-w-0">
                <p className="text-sm font-medium text-navy-800 truncate">{i.name}</p>
                <p className="text-xs text-navy-400">{i.unit || cfg.defaultUnit}{i.hsn_sac ? ` · ${i.hsn_sac}` : ""}</p>
              </div>
              <p className="text-sm font-medium text-navy-900 tabular-nums shrink-0">{inr(i.default_price)}</p>
            </button>
          ))}
        </div>
      )}
    </Modal>
  );
}

/* ------------------------------------------------------------------ */

export default function DocumentEditor() {
  const { id: editId } = useParams();
  const [sp] = useSearchParams();
  const fromId = sp.get("from");
  const isEdit = Boolean(editId);
  const navigate = useNavigate();
  const { venue } = useVenue();
  const { profile, terms, loading: profileLoading } = useBusinessProfile();

  const cfg = useMemo(() => ({ ...DEFAULT_BILLING, ...(profile?.billing || {}) }), [profile]);
  const [docType, setDocType] = useState(DOC_TYPES.includes(sp.get("type")) ? sp.get("type") : "invoice");
  const docLabel = cfg.docLabels?.[docType] || DEFAULT_LABELS[docType];
  const isQuote = docType === "quotation";
  const taxLabel = cfg.taxCodeLabel || "SAC";

  const { data: clientsData } = useFetch(venue ? `/venues/${venue.id}/clients` : null, { skip: !venue });
  const { data: catalogData } = useFetch(venue ? `/venues/${venue.id}/billing/service-items` : null, { skip: !venue });
  const clients = clientsData || [];
  const catalog = (catalogData || []).filter((i) => i.is_active !== false);

  const [f, setF] = useState(blankForm);
  const [saving, setSaving] = useState(false);
  const [loadingDoc, setLoadingDoc] = useState(Boolean(editId || fromId));
  const [pickerOpen, setPickerOpen] = useState(false);
  const [recv, setRecv] = useState({ amount: null, method: "upi", reference: "" }); // amount null = auto
  const initRef = useRef(false);

  const set = (patch) => setF((p) => ({ ...p, ...patch }));
  const setCustomer = (patch) => setF((p) => ({ ...p, customer: { ...p.customer, ...patch } }));
  const updateLine = (k, patch) => setF((p) => ({ ...p, lines: p.lines.map((l) => (l._k === k ? { ...l, ...patch } : l)) }));
  const removeLine = (k) => setF((p) => ({ ...p, lines: p.lines.length > 1 ? p.lines.filter((l) => l._k !== k) : [newLine({ unit: cfg.defaultUnit })] }));
  const addLine = () => setF((p) => ({ ...p, lines: [...p.lines, newLine({ unit: cfg.defaultUnit })] }));

  const gstAvailable = Boolean(venue?.gst_number);

  // Defaults for a brand-new document, once venue + business profile are known.
  useEffect(() => {
    if (initRef.current || isEdit || fromId || !venue || profileLoading) return;
    initRef.current = true;
    const days = Number(cfg.dueDays) || 0;
    const preset = PAYMENT_TERMS.find((t) => t.days === days && days > 0);
    setF((p) => ({
      ...p,
      lines: [newLine({ unit: cfg.defaultUnit })],
      gstEnabled: Boolean(venue.gst_enabled && venue.gst_number),
      roundOff: cfg.roundOff !== false,
      terms: cfg.defaultTerms || "",
      paymentTerms: preset ? preset.label : "",
      dueDate: days > 0 ? dayjs().add(days, "day").format("YYYY-MM-DD") : ""
    }));
  }, [venue, profileLoading, cfg, isEdit, fromId]);

  // Load an existing document (edit) or a copy source (duplicate).
  useEffect(() => {
    const srcId = editId || fromId;
    if (!venue || !srcId) return undefined;
    let off = false;
    billingService
      .getInvoice(venue.id, srcId)
      .then(({ data }) => {
        if (off) return;
        const doc = data.data;
        if (isEdit && (doc.status !== "draft" || Number(doc.amount_paid) > 0)) {
          showError("This document is locked. Use Duplicate to make a corrected copy.");
          navigate("/dashboard/billing/invoice");
          return;
        }
        const snap = doc.customer_snapshot || {};
        const days = Number(cfg.dueDays) || 0;
        setDocType(doc.type);
        initRef.current = true;
        setF({
          clientId: doc.client_id || "",
          customer: {
            name: snap.name === "Walk-in Customer" ? "" : snap.name || "",
            phone: snap.phone || "",
            email: snap.email || "",
            address: snap.address || "",
            gstin: snap.gstin || "",
            state_code: snap.state_code || ""
          },
          lines: (doc.line_items || []).map((li) =>
            newLine({
              description: li.description || "",
              hsn_sac: li.hsn_sac || "",
              quantity: String(li.quantity ?? 1),
              unit: li.unit || "",
              rate: String(li.rate ?? ""),
              discount_type: li.discount_type === "flat" ? "flat" : "percentage",
              discount_value: Number(li.discount_value) > 0 ? String(li.discount_value) : "",
              tax_rate: li.tax_rate !== undefined && li.tax_rate !== null ? String(Number(li.tax_rate)) : ""
            })
          ),
          gstEnabled: Boolean(doc.gst_enabled),
          priceIncludesTax: Boolean(doc.price_includes_tax),
          roundOff: cfg.roundOff !== false,
          discountType: doc.discount_type || "none",
          discountValue: Number(doc.discount_value) > 0 ? String(doc.discount_value) : "",
          dueDate: isEdit ? doc.due_date || "" : days > 0 ? dayjs().add(days, "day").format("YYYY-MM-DD") : "",
          validityDate: isEdit ? doc.validity_date || "" : "",
          paymentTerms: doc.payment_terms || "",
          terms: doc.terms || "",
          notes: doc.notes || "",
          custom: doc.custom_fields || {}
        });
        setLoadingDoc(false);
      })
      .catch(() => {
        if (off) return;
        showError("Could not load the document");
        navigate("/dashboard/billing/invoice");
      });
    return () => { off = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [venue?.id, editId, fromId]);

  /* ---- tax context ---- */
  const defaultRate = Number(cfg.defaultGstRate) || 0;
  const supplierState = String(venue?.gst_number || "").slice(0, 2);
  const custGstin = f.customer.gstin.trim().toUpperCase();
  const customerState = /^\d{2}$/.test(f.customer.state_code)
    ? f.customer.state_code
    : /^\d{2}/.test(custGstin) ? custGstin.slice(0, 2) : "";
  const supplyType = f.gstEnabled && supplierState && customerState && supplierState !== customerState ? "inter" : "intra";

  const calc = useMemo(
    () =>
      calculateDocument(
        f.lines.map((l) => ({
          description: l.description,
          quantity: l.quantity,
          rate: l.rate,
          discount_type: Number(l.discount_value) > 0 ? l.discount_type : "none",
          discount_value: l.discount_value,
          tax_rate: l.tax_rate === "" ? defaultRate : l.tax_rate
        })),
        {
          gstEnabled: f.gstEnabled,
          defaultGstRate: defaultRate,
          supplyType,
          priceIncludesTax: f.priceIncludesTax,
          discountType: f.discountType,
          discountValue: f.discountValue,
          roundOff: f.roundOff
        }
      ),
    [f.lines, f.gstEnabled, f.priceIncludesTax, f.discountType, f.discountValue, f.roundOff, supplyType, defaultRate]
  );

  /* ---- payment received now + extra charges (driven by the business config) ---- */
  const canReceive = !isEdit && (docType === "invoice" || docType === "proforma");
  const receivedAmount = recv.amount !== null ? recv.amount : cfg.paymentMode === "now" ? String(calc.total) : "";
  const receivedTitle =
    cfg.paymentMode === "advance" ? "Advance received" : cfg.paymentMode === "now" ? "Payment received" : "Payment received (optional)";

  const addCharge = (name) => {
    const line = newLine({ description: name, unit: "nos", tax_rate: /deposit/i.test(name) ? "0" : "" });
    setF((p) => ({ ...p, lines: [...p.lines.filter((l) => !isBlank(l)), line] }));
  };

  /* ---- actions ---- */
  const pickClient = (c) =>
    setF((p) => ({
      ...p,
      clientId: c.id,
      customer: {
        ...p.customer,
        name: c.name || "",
        phone: c.phone || "",
        email: c.email || "",
        address: c.address || p.customer.address,
        gstin: c.gstin || p.customer.gstin
      }
    }));

  const clearClient = () => set({ clientId: "" });

  const addFromCatalog = (item) => {
    const line = newLine({
      description: item.name,
      rate: String(item.default_price ?? ""),
      unit: item.unit || cfg.defaultUnit,
      hsn_sac: item.hsn_sac || "",
      tax_rate: item.tax_rate !== null && item.tax_rate !== undefined ? String(Number(item.tax_rate)) : ""
    });
    setF((p) => ({ ...p, lines: [...p.lines.filter((l) => !isBlank(l)), line] }));
    setPickerOpen(false);
  };

  const onTermsChange = (label) => {
    const opt = PAYMENT_TERMS.find((t) => t.label === label);
    const patch = { paymentTerms: label };
    if (opt && opt.days !== null) patch.dueDate = dayjs().add(opt.days, "day").format("YYYY-MM-DD");
    set(patch);
  };

  const validate = () => {
    if (cfg.customerRequired && !f.clientId && !f.customer.name.trim()) return `Select or enter a ${terms.client.toLowerCase()}`;
    if (f.gstEnabled && !gstAvailable) return "Add your GSTIN in Settings before creating a GST document";
    if (custGstin && !GSTIN_RE.test(custGstin)) return "Customer GSTIN is not valid";
    const used = f.lines.filter((l) => !isBlank(l));
    if (used.length === 0) return "Add at least one item";
    for (let i = 0; i < used.length; i += 1) {
      const l = used[i];
      if (!l.description.trim()) return `Item ${i + 1} needs a name`;
      if (!(Number(l.quantity) > 0)) return `Item ${i + 1} needs a quantity greater than 0`;
      if (!(Number(l.rate) >= 0) || l.rate === "") return `Item ${i + 1} needs a rate`;
    }
    if (canReceive && Number(receivedAmount) > calc.total + 0.009) return "Amount received can't be more than the total";
    return null;
  };

  const save = async () => {
    const err = validate();
    if (err) return showError(err);

    const customer = {};
    Object.entries(f.customer).forEach(([k, v]) => {
      const val = String(v || "").trim();
      if (val || (!f.clientId && k !== "state_code")) customer[k] = val;
    });
    if (!f.clientId) customer.state_code = f.customer.state_code || "";

    const payload = {
      type: docType,
      client_id: f.clientId || null,
      customer,
      line_items: f.lines
        .filter((l) => !isBlank(l))
        .map((l) => ({
          description: l.description.trim(),
          quantity: Number(l.quantity),
          rate: Number(l.rate),
          unit: l.unit || undefined,
          hsn_sac: l.hsn_sac || undefined,
          discount_type: Number(l.discount_value) > 0 ? l.discount_type : "none",
          discount_value: Number(l.discount_value) || 0,
          tax_rate: l.tax_rate === "" ? defaultRate : Number(l.tax_rate)
        })),
      gst_enabled: f.gstEnabled,
      gst_rate: defaultRate,
      price_includes_tax: f.priceIncludesTax,
      round_off: f.roundOff,
      discount_type: f.discountType,
      discount_value: Number(f.discountValue) || 0,
      place_of_supply: f.gstEnabled && customerState ? customerState : undefined,
      due_date: !isQuote && f.dueDate ? f.dueDate : undefined,
      validity_date: isQuote && f.validityDate ? f.validityDate : undefined,
      payment_terms: f.paymentTerms || "",
      terms: f.terms,
      notes: f.notes,
      custom_fields: f.custom
    };

    setSaving(true);
    try {
      const res = isEdit
        ? await billingService.updateInvoice(venue.id, editId, payload)
        : await billingService.createInvoice(venue.id, payload);
      const doc = res.data.data;
      const recvAmt = canReceive ? Math.min(Number(receivedAmount) || 0, Number(doc.total)) : 0;
      if (recvAmt > 0) {
        try {
          await billingService.recordPayment(venue.id, doc.id, { amount: recvAmt, method: recv.method, reference: recv.reference });
        } catch (payErr) {
          showError(`${docLabel} created, but the payment could not be recorded. Record it from the bill.`);
        }
      }
      showSuccess(`${docLabel} ${isEdit ? "updated" : "created"}`);
      navigate(doc.type === "quotation" ? "/dashboard/billing/quotation" : "/dashboard/billing/invoice", { state: { openId: doc.id } });
    } catch (e) {
      showError(e.response?.data?.message || "Could not save the document");
    } finally {
      setSaving(false);
    }
  };

  const back = () => navigate(isQuote ? "/dashboard/billing/quotation" : "/dashboard/billing/invoice");
  const unitsFor = (l) => Array.from(new Set([...(cfg.units || []), l.unit].filter(Boolean)));
  const termsSelectValue = PAYMENT_TERMS.some((t) => t.label === f.paymentTerms) ? f.paymentTerms : f.paymentTerms ? "Custom" : "";

  if (loadingDoc) {
    return (
      <DashboardLayout sidebarItems={ownerSidebarItems} pageTitle="Billing">
        <div className="bg-white rounded-2xl border border-navy-100/70 shadow-card p-12 text-center text-sm text-navy-400">Loading…</div>
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout sidebarItems={ownerSidebarItems} pageTitle={`${isEdit ? "Edit" : "New"} ${docLabel}`}>
      <div className="max-w-6xl mx-auto pb-8">
        <div className="flex items-center justify-between gap-3 mb-5">
          <button onClick={back} className="inline-flex items-center gap-1.5 text-sm text-navy-500 hover:text-navy-800">
            <ArrowLeft size={16} /> Back to billing
          </button>
          <Button onClick={save} loading={saving} className="hidden lg:inline-flex">
            {isEdit ? "Save changes" : `Create ${docLabel}`}
          </Button>
        </div>

        <div className="grid lg:grid-cols-[minmax(0,1fr)_340px] gap-5 items-start">
          <div className="space-y-5 min-w-0">
            {/* customer */}
            <Card
              title={cfg.customerRequired ? terms.client : `${terms.client} (optional)`}
              subtitle={cfg.customerRequired ? `Who is this ${docLabel.toLowerCase()} for?` : `Leave empty for a walk-in ${terms.client.toLowerCase()}`}
            >
              <div className="space-y-3">
                <ClientPicker clients={clients} value={f.clientId} onSelect={pickClient} onClear={clearClient} noun={terms.clients} />
                <div className="grid sm:grid-cols-2 gap-3">
                  <Field label="Name">
                    <input className={inputCls} placeholder="Walk-in Customer" value={f.customer.name} onChange={(e) => setCustomer({ name: e.target.value })} />
                  </Field>
                  <Field label="Phone">
                    <input className={inputCls} inputMode="tel" value={f.customer.phone} onChange={(e) => setCustomer({ phone: e.target.value })} />
                  </Field>
                  <Field label="Email">
                    <input className={inputCls} type="email" value={f.customer.email} onChange={(e) => setCustomer({ email: e.target.value })} />
                  </Field>
                  <Field label="Address">
                    <input className={inputCls} value={f.customer.address} onChange={(e) => setCustomer({ address: e.target.value })} />
                  </Field>
                  {f.gstEnabled && (
                    <>
                      <Field label="Customer GSTIN (optional)" error={custGstin && !GSTIN_RE.test(custGstin) ? "Not a valid GSTIN" : ""}>
                        <input className={inputCls} maxLength={15} value={f.customer.gstin} onChange={(e) => setCustomer({ gstin: e.target.value.toUpperCase() })} />
                      </Field>
                      <Field label="Place of supply" hint={supplyType === "inter" ? "Inter-state: IGST applies" : "Same state: CGST + SGST apply"}>
                        <select className={inputCls} value={customerState} onChange={(e) => setCustomer({ state_code: e.target.value })}>
                          <option value="">Same as my business state</option>
                          {INDIAN_STATES.map((s) => <option key={s.code} value={s.code}>{s.name}</option>)}
                        </select>
                      </Field>
                    </>
                  )}
                </div>
              </div>
            </Card>

            {/* details */}
            <Card
              title={`${docLabel} details`}
              className={!isQuote && cfg.showDueDate === false && !(cfg.customFields || []).length ? "hidden" : ""}
            >
              <div className="grid sm:grid-cols-2 gap-3">
                {isQuote ? (
                  <Field label="Valid until">
                    <input type="date" className={inputCls} value={f.validityDate} min={dayjs().format("YYYY-MM-DD")} onChange={(e) => set({ validityDate: e.target.value })} />
                  </Field>
                ) : cfg.showDueDate !== false ? (
                  <>
                    <Field label="Payment terms">
                      <select className={inputCls} value={termsSelectValue} onChange={(e) => onTermsChange(e.target.value)}>
                        <option value="">Not specified</option>
                        {PAYMENT_TERMS.map((t) => <option key={t.label} value={t.label}>{t.label}</option>)}
                      </select>
                    </Field>
                    <Field label="Due date">
                      <input type="date" className={inputCls} value={f.dueDate} onChange={(e) => set({ dueDate: e.target.value, paymentTerms: f.paymentTerms ? "Custom" : "" })} />
                    </Field>
                  </>
                ) : null}
                {(cfg.customFields || []).map((cf) => (
                  <Field key={cf.key} label={cf.label}>
                    <input
                      type={cf.type === "date" ? "date" : "text"}
                      className={inputCls}
                      value={f.custom[cf.key] || ""}
                      onChange={(e) => set({ custom: { ...f.custom, [cf.key]: e.target.value } })}
                    />
                  </Field>
                ))}
              </div>
            </Card>

            {/* items */}
            <Card
              title="Items"
              action={
                <Button variant="outline" onClick={() => setPickerOpen(true)} className="!py-1.5 !px-3 text-xs">
                  <Package size={14} /> From catalog
                </Button>
              }
            >
              {catalog.length > 0 && (
                <div className="flex gap-2 overflow-x-auto pb-3 mb-3 border-b border-navy-100/60">
                  {catalog.slice(0, 8).map((i) => (
                    <button
                      type="button"
                      key={i.id}
                      onClick={() => addFromCatalog(i)}
                      className="shrink-0 inline-flex items-center gap-1.5 px-3 h-8 rounded-full border border-navy-200 text-xs text-navy-600 hover:bg-navy-50"
                    >
                      <Plus size={12} /> {i.name} <span className="text-navy-300">{inr(i.default_price, 0)}</span>
                    </button>
                  ))}
                </div>
              )}

              {(cfg.extraCharges || []).length > 0 && (
                <div className="flex flex-wrap items-center gap-2 mb-3">
                  <span className="text-xs text-navy-400">Add charge:</span>
                  {cfg.extraCharges.map((name) => (
                    <button
                      type="button"
                      key={name}
                      onClick={() => addCharge(name)}
                      className="px-2.5 h-7 rounded-full border border-dashed border-navy-300 text-xs text-navy-500 hover:bg-navy-50"
                    >
                      + {name}
                    </button>
                  ))}
                </div>
              )}

              <div className={`hidden md:grid gap-2 mb-2 text-[11px] font-medium text-navy-400 ${f.gstEnabled ? GRID_TAX : GRID_NO_TAX}`}>
                <span>Item</span><span>Qty</span><span>Unit</span><span>Rate (₹)</span><span>Discount</span>
                {f.gstEnabled && <span>GST %</span>}
                <span className="text-right">Amount</span><span />
              </div>

              <div className="space-y-4 md:space-y-3">
                {f.lines.map((l, idx) => (
                  <div key={l._k} className={`grid grid-cols-2 gap-2 items-start rounded-xl border border-navy-100/70 p-3 md:border-0 md:p-0 ${f.gstEnabled ? GRID_TAX : GRID_NO_TAX}`}>
                    <div className="col-span-2 md:col-span-1 space-y-1.5">
                      <input className={inputCls} placeholder={cfg.itemPlaceholder || "Item or service name"} value={l.description} onChange={(e) => updateLine(l._k, { description: e.target.value })} />
                      {f.gstEnabled && cfg.showTaxCode !== false && (
                        <input className={`${inputCls} !h-8 text-xs`} placeholder={`${taxLabel} code (optional)`} maxLength={10} value={l.hsn_sac} onChange={(e) => updateLine(l._k, { hsn_sac: e.target.value })} />
                      )}
                    </div>
                    <div>
                      <span className="md:hidden text-[11px] text-navy-400">Qty</span>
                      <input className={inputCls} type="number" min="0" inputMode="decimal" value={l.quantity} onChange={(e) => updateLine(l._k, { quantity: e.target.value })} />
                    </div>
                    <div>
                      <span className="md:hidden text-[11px] text-navy-400">Unit</span>
                      <select className={inputCls} value={l.unit || cfg.defaultUnit} onChange={(e) => updateLine(l._k, { unit: e.target.value })}>
                        {unitsFor({ unit: l.unit || cfg.defaultUnit }).map((u) => <option key={u} value={u}>{u}</option>)}
                      </select>
                    </div>
                    <div>
                      <span className="md:hidden text-[11px] text-navy-400">Rate (₹)</span>
                      <input className={inputCls} type="number" min="0" inputMode="decimal" value={l.rate} onChange={(e) => updateLine(l._k, { rate: e.target.value })} />
                    </div>
                    <div>
                      <span className="md:hidden text-[11px] text-navy-400">Discount</span>
                      <div className="flex gap-1">
                        <input className={`${inputCls} min-w-0`} type="number" min="0" inputMode="decimal" value={l.discount_value} onChange={(e) => updateLine(l._k, { discount_value: e.target.value })} />
                        <select className={`${inputCls} !w-14 !px-1.5`} value={l.discount_type} onChange={(e) => updateLine(l._k, { discount_type: e.target.value })}>
                          <option value="percentage">%</option>
                          <option value="flat">₹</option>
                        </select>
                      </div>
                    </div>
                    {f.gstEnabled && (
                      <div>
                        <span className="md:hidden text-[11px] text-navy-400">GST %</span>
                        <select className={inputCls} value={l.tax_rate === "" ? String(defaultRate) : l.tax_rate} onChange={(e) => updateLine(l._k, { tax_rate: e.target.value })}>
                          {Array.from(new Set([...GST_RATES, defaultRate, Number(l.tax_rate) || 0])).sort((a, b) => a - b).map((r) => <option key={r} value={String(r)}>{r}%</option>)}
                        </select>
                      </div>
                    )}
                    <div className="md:text-right md:pt-2.5">
                      <span className="md:hidden text-[11px] text-navy-400 block">Amount</span>
                      <p className="text-sm font-medium text-navy-900 tabular-nums h-10 flex items-center md:block md:h-auto md:justify-end">{inr(calc.lineItems[idx]?.amount)}</p>
                    </div>
                    <button type="button" onClick={() => removeLine(l._k)} className="col-span-2 md:col-span-1 justify-self-end md:justify-self-auto h-10 w-8 flex items-center justify-center text-navy-300 hover:text-red-600" aria-label="Remove item">
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
              </div>

              <button type="button" onClick={addLine} className="mt-4 inline-flex items-center gap-1.5 text-sm font-medium text-primary-600 hover:text-primary-700">
                <Plus size={15} /> Add another item
              </button>
            </Card>

            {canReceive && (
              <Card title={receivedTitle} subtitle={cfg.paymentMode === "later" ? "Leave empty if nothing is received yet" : undefined}>
                <div className="grid sm:grid-cols-3 gap-3">
                  <Field
                    label="Amount (₹)"
                    hint={calc.total > 0 ? `Balance after this: ${inr(Math.max(calc.total - (Number(receivedAmount) || 0), 0))}` : undefined}
                  >
                    <input
                      className={inputCls}
                      type="number"
                      min="0"
                      inputMode="decimal"
                      value={receivedAmount}
                      onChange={(e) => setRecv((r) => ({ ...r, amount: e.target.value }))}
                    />
                  </Field>
                  <Field label="Method">
                    <select className={inputCls} value={recv.method} onChange={(e) => setRecv((r) => ({ ...r, method: e.target.value }))}>
                      {PAYMENT_METHODS.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
                    </select>
                  </Field>
                  <Field label="Reference (optional)">
                    <input className={inputCls} maxLength={100} value={recv.reference} onChange={(e) => setRecv((r) => ({ ...r, reference: e.target.value }))} />
                  </Field>
                </div>
              </Card>
            )}

            {/* notes */}
            <Card title="Notes & terms">
              <div className="space-y-3">
                <Field label="Note to customer (optional)">
                  <textarea rows={2} className={`${inputCls} !h-auto py-2`} value={f.notes} onChange={(e) => set({ notes: e.target.value })} />
                </Field>
                <Field label="Terms & conditions">
                  <textarea rows={3} className={`${inputCls} !h-auto py-2`} value={f.terms} onChange={(e) => set({ terms: e.target.value })} />
                </Field>
              </div>
            </Card>
          </div>

          {/* summary */}
          <aside className="lg:sticky lg:top-4 space-y-4">
            <Card title="Summary">
              <div className="space-y-2 text-sm">
                <SumRow label="Subtotal" value={inr(calc.subtotal)} />

                <div className="flex items-center gap-2 py-1">
                  <span className="text-navy-600 shrink-0">Discount</span>
                  <select className={`${inputCls} !h-8 !w-16 !px-1.5 text-xs ml-auto`} value={f.discountType} onChange={(e) => set({ discountType: e.target.value })}>
                    <option value="none">None</option>
                    <option value="percentage">%</option>
                    <option value="flat">₹</option>
                  </select>
                  <input
                    className={`${inputCls} !h-8 !w-20 text-xs`}
                    type="number"
                    min="0"
                    disabled={f.discountType === "none"}
                    value={f.discountValue}
                    onChange={(e) => set({ discountValue: e.target.value })}
                  />
                </div>
                {calc.discountAmount > 0 && <SumRow label="Discount applied" value={`− ${inr(calc.discountAmount)}`} muted />}

                {f.gstEnabled && (
                  <>
                    <SumRow label="Taxable amount" value={inr(calc.taxableAmount)} muted />
                    {calc.taxBreakup.map((t) =>
                      supplyType === "inter" ? (
                        <SumRow key={t.rate} label={`IGST ${t.rate}%`} value={inr(t.igst)} muted />
                      ) : (
                        <React.Fragment key={t.rate}>
                          <SumRow label={`CGST ${t.rate / 2}%`} value={inr(t.cgst)} muted />
                          <SumRow label={`SGST ${t.rate / 2}%`} value={inr(t.sgst)} muted />
                        </React.Fragment>
                      )
                    )}
                  </>
                )}
                {calc.roundOff !== 0 && <SumRow label="Round off" value={inr(calc.roundOff)} muted />}

                <div className="flex items-center justify-between pt-3 mt-2 border-t border-navy-100">
                  <span className="font-semibold text-navy-900">Total</span>
                  <span className="font-display text-xl font-semibold text-navy-900 tabular-nums">{inr(calc.total)}</span>
                </div>
              </div>

              <div className="mt-4 pt-3 border-t border-navy-100/70">
                <Toggle
                  label="Charge GST"
                  checked={f.gstEnabled}
                  disabled={!gstAvailable}
                  onChange={(v) => set({ gstEnabled: v })}
                  hint={gstAvailable ? undefined : "Add your GSTIN in Settings → GST to enable"}
                />
                {f.gstEnabled && (
                  <Toggle label="Prices include GST" checked={f.priceIncludesTax} onChange={(v) => set({ priceIncludesTax: v })} hint="Rates you enter already contain tax" />
                )}
                <Toggle label="Round off total" checked={f.roundOff} onChange={(v) => set({ roundOff: v })} />
              </div>

              <Button onClick={save} loading={saving} className="w-full mt-4">
                {isEdit ? "Save changes" : `Create ${docLabel}`}
              </Button>
              <p className="flex gap-1.5 text-[11px] text-navy-400 mt-3">
                <Info size={13} className="shrink-0 mt-px" />
                A PDF with QR is generated automatically. Once shared or paid, a document is locked.
              </p>
            </Card>
          </aside>
        </div>
      </div>

      {pickerOpen && <CatalogPicker items={catalog} cfg={cfg} onPick={addFromCatalog} onClose={() => setPickerOpen(false)} />}
    </DashboardLayout>
  );
}

function SumRow({ label, value, muted = false }) {
  return (
    <div className={`flex justify-between ${muted ? "text-navy-400" : "text-navy-700"}`}>
      <span>{label}</span>
      <span className="tabular-nums">{value}</span>
    </div>
  );
}
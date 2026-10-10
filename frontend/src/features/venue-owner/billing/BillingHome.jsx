import React, { useEffect, useMemo, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import dayjs from "dayjs";
import {
  Plus, Search, Download, Copy, Pencil, Trash2, X, ArrowRight,
  ChevronDown, ChevronLeft, ChevronRight, FileText, Wallet, Clock, AlertCircle, IndianRupee, Package
} from "lucide-react";
import DashboardLayout from "../../../components/layout/DashboardLayout.jsx";
import Modal from "../../../components/common/Modal";
import Button from "../../../components/common/Button";
import { ownerSidebarItems } from "../ownerSidebarItems.js";
import { useVenue } from "../../../context/VenueContext.jsx";
import { useFetch } from "../../../hooks/useFetch";
import { useBusinessProfile } from "../../../hooks/useBusinessProfile";
import { billingService } from "../../../services/billingService";
import { showSuccess, showError } from "../../../components/common/Toast";
import { formatDate } from "../../../lib/formatters";
import { DEFAULT_BILLING, DEFAULT_LABELS, DOC_TYPES, PAYMENT_METHODS, deriveStatus, inr, todayStr } from "../../../lib/billingMath";
import { StatusPill, inputCls, labelCls, Field } from "./billingShared.jsx";

const PAGE_SIZE = 15;

const PERIODS = [
  { value: "all", label: "All time" },
  { value: "month", label: "This month" },
  { value: "30d", label: "Last 30 days" },
  { value: "fy", label: "This financial year" }
];

const STATUS_FILTERS = {
  invoice: ["all", "draft", "unpaid", "partial", "paid", "overdue"],
  proforma: ["all", "draft", "unpaid", "partial", "paid", "overdue"],
  quotation: ["all", "draft", "sent", "converted", "expired"],
  credit_note: ["all", "draft", "issued"]
};

function inPeriod(doc, period) {
  if (period === "all") return true;
  const d = dayjs(createdOf(doc));
  const now = dayjs();
  if (period === "month") return !d.isBefore(now.startOf("month"));
  if (period === "30d") return !d.isBefore(now.subtract(30, "day"));
  if (period === "fy") {
    const y = now.month() >= 3 ? now.year() : now.year() - 1;
    return !d.isBefore(dayjs(`${y}-04-01`));
  }
  return true;
}

const customerOf = (d) => d.client?.name || d.customer_snapshot?.name || "Walk-in Customer";
const createdOf = (d) => d.createdAt || d.created_at;
const phoneOf = (d) => d.client?.phone || d.customer_snapshot?.phone || "";

/* ------------------------------------------------------------------ */

function Kpi({ icon: Icon, tone, label, value, sub }) {
  return (
    <div className="bg-white rounded-2xl border border-navy-100/70 shadow-card p-4">
      <div className="flex items-center gap-2 mb-2">
        <span className={`w-7 h-7 rounded-lg flex items-center justify-center ${tone}`}>
          <Icon size={15} />
        </span>
        <p className="text-xs font-medium text-navy-400">{label}</p>
      </div>
      <p className="font-display text-xl font-semibold text-navy-900 tabular-nums">{value}</p>
      <p className="text-xs text-navy-400 mt-0.5">{sub}</p>
    </div>
  );
}

function PaymentModal({ doc, venueId, onClose, onSaved }) {
  const balance = Number(doc?.balance_due) || 0;
  const [amount, setAmount] = useState(String(balance));
  const [method, setMethod] = useState("upi");
  const [paidOn, setPaidOn] = useState(todayStr());
  const [reference, setReference] = useState("");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  const submit = async () => {
    const amt = Number(amount);
    if (!(amt > 0)) return showError("Enter an amount greater than 0");
    if (amt > balance + 0.009) return showError(`Amount is more than the balance due (${inr(balance)})`);
    setSaving(true);
    try {
      await billingService.recordPayment(venueId, doc.id, {
        amount: amt,
        method,
        reference,
        note,
        paid_at: new Date(`${paidOn}T12:00:00`).toISOString()
      });
      showSuccess("Payment recorded");
      onSaved();
    } catch (err) {
      showError(err.response?.data?.message || "Could not record the payment");
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal isOpen onClose={onClose} title={`Record payment · ${doc.invoice_number}`} size="sm">
      <div className="space-y-4">
        <div className="flex items-center justify-between rounded-xl bg-paper px-4 py-3 text-sm">
          <span className="text-navy-400">Balance due</span>
          <span className="font-semibold text-navy-900 tabular-nums">{inr(balance)}</span>
        </div>
        <Field label="Amount received (₹)">
          <div className="flex gap-2">
            <input type="number" min="0" className={inputCls} value={amount} onChange={(e) => setAmount(e.target.value)} />
            <button type="button" onClick={() => setAmount(String(balance))} className="shrink-0 px-3 h-10 rounded-lg border border-navy-200 text-xs font-medium text-navy-600 hover:bg-navy-50">
              Full
            </button>
          </div>
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Method">
            <select className={inputCls} value={method} onChange={(e) => setMethod(e.target.value)}>
              {PAYMENT_METHODS.map((m) => <option key={m.value} value={m.value}>{m.label}</option>)}
            </select>
          </Field>
          <Field label="Date">
            <input type="date" className={inputCls} value={paidOn} max={todayStr()} onChange={(e) => setPaidOn(e.target.value)} />
          </Field>
        </div>
        <Field label="Reference / UTR (optional)">
          <input className={inputCls} value={reference} maxLength={100} onChange={(e) => setReference(e.target.value)} />
        </Field>
        <Field label="Note (optional)">
          <input className={inputCls} value={note} maxLength={300} onChange={(e) => setNote(e.target.value)} />
        </Field>
        <Button onClick={submit} loading={saving} className="w-full">Save payment</Button>
      </div>
    </Modal>
  );
}

function DocDrawer({ doc, typeLabel, busy, onClose, onEdit, onDuplicate, onDelete, onPay, onConvert }) {
  const status = deriveStatus(doc);
  const editable = doc.status === "draft" && Number(doc.amount_paid) <= 0;
  const canPay = (doc.type === "invoice" || doc.type === "proforma") && Number(doc.balance_due) > 0.009;
  const canConvert = (doc.type === "quotation" || doc.type === "proforma") && !doc.converted_to;
  const snap = doc.customer_snapshot || {};
  const isInvoiceLike = doc.type === "invoice" || doc.type === "proforma";
  const customFields = Object.entries(doc.custom_fields || {});

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-navy-900/40" onClick={onClose}>
      <div className="bg-white w-full sm:max-w-xl h-full flex flex-col shadow-xl animate-slot-in" onClick={(e) => e.stopPropagation()}>
        <header className="flex items-start justify-between gap-3 px-5 py-4 border-b border-navy-100/70">
          <div className="min-w-0">
            <p className="text-xs text-navy-400">{typeLabel}</p>
            <h3 className="font-display font-semibold text-navy-900 text-lg truncate">{doc.invoice_number}</h3>
            <div className="mt-1.5"><StatusPill status={status} /></div>
          </div>
          <button onClick={onClose} className="w-9 h-9 flex items-center justify-center rounded-lg text-navy-400 hover:bg-navy-50" aria-label="Close">
            <X size={18} />
          </button>
        </header>

        <div className="flex-1 overflow-y-auto px-5 py-5 space-y-6">
          <section className="grid grid-cols-2 gap-4 text-sm">
            <div className="col-span-2 sm:col-span-1">
              <p className={labelCls}>Billed to</p>
              <p className="font-medium text-navy-900">{customerOf(doc)}</p>
              {phoneOf(doc) && <p className="text-navy-500">{phoneOf(doc)}</p>}
              {snap.email && <p className="text-navy-500 break-all">{snap.email}</p>}
              {snap.gstin && <p className="text-navy-500">GSTIN {snap.gstin}</p>}
              {snap.address && <p className="text-navy-400 text-xs mt-1">{snap.address}</p>}
            </div>
            <div className="col-span-2 sm:col-span-1 space-y-2">
              <div><p className={labelCls}>Created</p><p className="text-navy-800">{formatDate(doc.created_at)}</p></div>
              {doc.due_date && isInvoiceLike && <div><p className={labelCls}>Due date</p><p className="text-navy-800">{formatDate(doc.due_date)}</p></div>}
              {doc.validity_date && doc.type === "quotation" && <div><p className={labelCls}>Valid until</p><p className="text-navy-800">{formatDate(doc.validity_date)}</p></div>}
              {customFields.map(([k, v]) => (
                <div key={k}><p className={labelCls}>{k.replace(/_/g, " ")}</p><p className="text-navy-800">{v}</p></div>
              ))}
            </div>
          </section>

          <section>
            <p className={labelCls}>Items</p>
            <div className="rounded-xl border border-navy-100/70 divide-y divide-navy-100/70">
              {(doc.line_items || []).map((li, i) => (
                <div key={i} className="flex items-start justify-between gap-3 px-4 py-3 text-sm">
                  <div className="min-w-0">
                    <p className="font-medium text-navy-800">{li.description}</p>
                    <p className="text-xs text-navy-400 mt-0.5">
                      {Number(li.quantity)} {li.unit || ""} × {inr(li.rate)}
                      {Number(li.line_discount_amount) > 0 && <> · {inr(li.line_discount_amount)} off</>}
                      {doc.gst_enabled && Number(li.tax_rate) > 0 && <> · GST {Number(li.tax_rate)}%</>}
                      {li.hsn_sac && <> · {li.hsn_sac}</>}
                    </p>
                  </div>
                  <p className="font-medium text-navy-900 tabular-nums shrink-0">{inr(li.amount)}</p>
                </div>
              ))}
            </div>
          </section>

          <section className="rounded-xl bg-paper px-4 py-4 text-sm space-y-1.5">
            <Row label="Subtotal" value={inr(doc.subtotal)} />
            {Number(doc.discount_amount) > 0 && <Row label="Discount" value={`− ${inr(doc.discount_amount)}`} />}
            {doc.gst_enabled && (doc.tax_breakup || []).map((t) =>
              Number(t.igst) > 0 ? (
                <Row key={t.rate} label={`IGST ${t.rate}%`} value={inr(t.igst)} muted />
              ) : (
                <React.Fragment key={t.rate}>
                  <Row label={`CGST ${t.rate / 2}%`} value={inr(t.cgst)} muted />
                  <Row label={`SGST ${t.rate / 2}%`} value={inr(t.sgst)} muted />
                </React.Fragment>
              )
            )}
            {Number(doc.round_off) !== 0 && <Row label="Round off" value={inr(doc.round_off)} muted />}
            <div className="flex justify-between pt-2 mt-1 border-t border-navy-100 font-semibold text-navy-900 text-base">
              <span>Total</span><span className="tabular-nums">{inr(doc.total)}</span>
            </div>
            {isInvoiceLike && (
              <>
                <Row label="Paid" value={inr(doc.amount_paid)} />
                <div className="flex justify-between font-semibold text-navy-900">
                  <span>Balance due</span><span className="tabular-nums">{inr(doc.balance_due)}</span>
                </div>
              </>
            )}
          </section>

          {(doc.payments || []).length > 0 && (
            <section>
              <p className={labelCls}>Payments</p>
              <div className="rounded-xl border border-navy-100/70 divide-y divide-navy-100/70">
                {doc.payments.map((p) => (
                  <div key={p.id} className="flex items-center justify-between gap-3 px-4 py-2.5 text-sm">
                    <div className="min-w-0">
                      <p className="font-medium text-navy-800 capitalize">{String(p.method).replace("_", " ")}</p>
                      <p className="text-xs text-navy-400 truncate">{formatDate(p.paid_at)}{p.reference ? ` · ${p.reference}` : ""}</p>
                    </div>
                    <p className="font-medium text-emerald-700 tabular-nums">{inr(p.amount)}</p>
                  </div>
                ))}
              </div>
            </section>
          )}

          {(doc.notes || doc.terms) && (
            <section className="text-xs text-navy-500 space-y-3">
              {doc.notes && <div><p className={labelCls}>Notes</p><p className="whitespace-pre-line">{doc.notes}</p></div>}
              {doc.terms && <div><p className={labelCls}>Terms</p><p className="whitespace-pre-line">{doc.terms}</p></div>}
            </section>
          )}
        </div>

        <footer className="border-t border-navy-100/70 px-5 py-4 space-y-3 pb-safe-b">
          <div className="flex flex-wrap gap-2">
            {canPay && <Button onClick={onPay} className="flex-1 min-w-[140px]"><Wallet size={15} /> Record payment</Button>}
            {canConvert && <Button onClick={onConvert} loading={busy === "convert"} className="flex-1 min-w-[140px]"><ArrowRight size={15} /> Convert to invoice</Button>}
          </div>
          <div className="flex items-center gap-1 text-navy-500">
            {doc.pdf_url && (
              <a href={doc.pdf_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 px-3 h-9 rounded-lg text-sm hover:bg-navy-50">
                <Download size={15} /> PDF
              </a>
            )}
            <button onClick={onDuplicate} className="inline-flex items-center gap-1.5 px-3 h-9 rounded-lg text-sm hover:bg-navy-50"><Copy size={15} /> Duplicate</button>
            {editable && <button onClick={onEdit} className="inline-flex items-center gap-1.5 px-3 h-9 rounded-lg text-sm hover:bg-navy-50"><Pencil size={15} /> Edit</button>}
            {editable && <button onClick={onDelete} className="inline-flex items-center gap-1.5 px-3 h-9 rounded-lg text-sm text-red-600 hover:bg-red-50 ml-auto"><Trash2 size={15} /> Delete</button>}
          </div>
          {!editable && <p className="text-[11px] text-navy-400">Shared or paid documents are locked. Use Duplicate to make a corrected copy.</p>}
        </footer>
      </div>
    </div>
  );
}

function Row({ label, value, muted = false }) {
  return (
    <div className={`flex justify-between ${muted ? "text-navy-400" : "text-navy-600"}`}>
      <span>{label}</span><span className="tabular-nums">{value}</span>
    </div>
  );
}

/* ------------------------------------------------------------------ */

export default function BillingHome({ initialTab = "invoice" }) {
  const { venue } = useVenue();
  const { profile, terms } = useBusinessProfile();
  const navigate = useNavigate();
  const location = useLocation();

  const cfg = useMemo(() => ({ ...DEFAULT_BILLING, ...(profile?.billing || {}) }), [profile]);
  const labelOf = (t) => cfg.docLabels?.[t] || DEFAULT_LABELS[t];
  const tabs = DOC_TYPES.filter((t) => cfg.docTypes.includes(t));

  const { data, loading, error, refetch } = useFetch(venue ? `/venues/${venue.id}/billing/invoices` : null, { skip: !venue });
  const docs = data || [];

  const [tab, setTab] = useState(initialTab);
  const [status, setStatus] = useState("all");
  const [query, setQuery] = useState("");
  const [period, setPeriod] = useState("all");
  const [page, setPage] = useState(1);
  const [viewId, setViewId] = useState(null);
  const [payDoc, setPayDoc] = useState(null);
  const [delDoc, setDelDoc] = useState(null);
  const [menuOpen, setMenuOpen] = useState(false);
  const [busy, setBusy] = useState("");

  const activeTab = tabs.includes(tab) ? tab : tabs[0];

  useEffect(() => { setTab(initialTab); }, [initialTab]);
  useEffect(() => { setPage(1); }, [activeTab, status, query, period]);
  useEffect(() => { setStatus("all"); }, [activeTab]);

  // Opens the document the editor just saved.
  useEffect(() => {
    const id = location.state?.openId;
    if (!id || docs.length === 0) return;
    const d = docs.find((x) => x.id === id);
    if (d) {
      setTab(d.type);
      setViewId(id);
      navigate(location.pathname, { replace: true, state: null });
    }
  }, [location.state, docs, location.pathname, navigate]);

  const kpis = useMemo(() => {
    const invs = docs.filter((d) => d.type === "invoice" && inPeriod(d, period) && deriveStatus(d) !== "draft");
    const sum = (arr, k) => arr.reduce((s, d) => s + (Number(d[k]) || 0), 0);
    const overdue = invs.filter((d) => deriveStatus(d) === "overdue");
    const open = invs.filter((d) => Number(d.balance_due) > 0.009);
    return {
      billed: sum(invs, "total"),
      count: invs.length,
      collected: sum(invs, "amount_paid"),
      outstanding: sum(invs, "balance_due"),
      openCount: open.length,
      overdue: sum(overdue, "balance_due"),
      overdueCount: overdue.length
    };
  }, [docs, period]);

  const counts = useMemo(() => {
    const c = {};
    docs.forEach((d) => { c[d.type] = (c[d.type] || 0) + 1; });
    return c;
  }, [docs]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return docs.filter((d) => {
      if (d.type !== activeTab || !inPeriod(d, period)) return false;
      if (status !== "all" && deriveStatus(d) !== status) return false;
      if (!q) return true;
      return (
        String(d.invoice_number || "").toLowerCase().includes(q) ||
        customerOf(d).toLowerCase().includes(q) ||
        phoneOf(d).includes(q)
      );
    });
  }, [docs, activeTab, status, query, period]);

  const pageCount = Math.max(Math.ceil(filtered.length / PAGE_SIZE), 1);
  const rows = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  const viewDoc = docs.find((d) => d.id === viewId) || null;

  const goNew = (type) => { setMenuOpen(false); navigate(`/dashboard/billing/new?type=${type}`); };

  const run = async (key, fn, okMsg) => {
    setBusy(key);
    try {
      const result = await fn();
      if (okMsg) showSuccess(okMsg);
      await refetch();
      return result;
    } catch (err) {
      showError(err.response?.data?.message || "Something went wrong");
      return null;
    } finally {
      setBusy("");
    }
  };

 

  const convert = async (d) => {
    const res = await run("convert", () => billingService.convertQuotation(venue.id, d.id, {}), "Converted to invoice");
    const created = res?.data?.data;
    if (created) { setTab("invoice"); setViewId(created.id); }
  };

  const confirmDelete = async () => {
    const d = delDoc;
    setDelDoc(null);
    const res = await run("delete", () => billingService.deleteInvoice(venue.id, d.id), "Deleted");
    if (res) setViewId(null);
  };

  const filterOptions = STATUS_FILTERS[activeTab] || ["all"];
  const statusLabel = (s) => (s === "all" ? "All" : s === "partial" ? "Partial" : s.charAt(0).toUpperCase() + s.slice(1));

  return (
    <DashboardLayout sidebarItems={ownerSidebarItems} pageTitle="Billing">
      {/* actions */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-5">
        <p className="text-sm text-navy-400">Quotations, invoices and payments in one place.</p>
        <div className="flex items-center gap-2">
          <Link to="/dashboard/billing/services" className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl border border-navy-200 text-sm font-medium text-navy-700 hover:bg-navy-50">
            <Package size={15} /> Items
          </Link>
          <div className="relative">
            {tabs.length > 1 ? (
              <>
                <Button onClick={() => setMenuOpen((v) => !v)}><Plus size={16} /> Create <ChevronDown size={14} /></Button>
                {menuOpen && (
                  <>
                    <button className="fixed inset-0 z-10 cursor-default" onClick={() => setMenuOpen(false)} aria-label="Close menu" />
                    <div className="absolute right-0 mt-2 w-52 z-20 bg-white rounded-xl border border-navy-100 shadow-xl p-1.5">
                      {tabs.map((t) => (
                        <button key={t} onClick={() => goNew(t)} className="w-full text-left px-3 py-2 rounded-lg text-sm text-navy-700 hover:bg-navy-50">
                          New {labelOf(t)}
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </>
            ) : (
              <Button onClick={() => goNew(tabs[0])}><Plus size={16} /> New {labelOf(tabs[0])}</Button>
            )}
          </div>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <Kpi icon={IndianRupee} tone="bg-primary-50 text-primary-600" label="Billed" value={inr(kpis.billed, 0)} sub={`${kpis.count} ${labelOf("invoice").toLowerCase()}${kpis.count === 1 ? "" : "s"}`} />
        <Kpi icon={Wallet} tone="bg-emerald-50 text-emerald-600" label="Collected" value={inr(kpis.collected, 0)} sub="Payments received" />
        <Kpi icon={Clock} tone="bg-amber-50 text-amber-600" label="Outstanding" value={inr(kpis.outstanding, 0)} sub={`${kpis.openCount} awaiting payment`} />
        <Kpi icon={AlertCircle} tone="bg-red-50 text-red-600" label="Overdue" value={inr(kpis.overdue, 0)} sub={`${kpis.overdueCount} past due date`} />
      </div>

      {/* tabs */}
      <div className="flex gap-1 overflow-x-auto border-b border-navy-100 mb-4">
        {tabs.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`shrink-0 px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${
              activeTab === t ? "border-primary-600 text-primary-700" : "border-transparent text-navy-400 hover:text-navy-700"
            }`}
          >
            {labelOf(t)}s <span className="ml-1 text-xs text-navy-300">{counts[t] || 0}</span>
          </button>
        ))}
      </div>

      {/* filters */}
      <div className="flex flex-col lg:flex-row gap-3 mb-4">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-navy-300" />
          <input
            className={`${inputCls} pl-9`}
            placeholder={`Search by number, ${terms.client.toLowerCase()} or phone`}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <select className={`${inputCls} lg:w-48`} value={period} onChange={(e) => setPeriod(e.target.value)}>
          {PERIODS.map((p) => <option key={p.value} value={p.value}>{p.label}</option>)}
        </select>
      </div>
      <div className="flex gap-2 overflow-x-auto mb-4 pb-1">
        {filterOptions.map((s) => (
          <button
            key={s}
            onClick={() => setStatus(s)}
            className={`shrink-0 px-3 h-8 rounded-full text-xs font-medium border transition-colors ${
              status === s ? "bg-navy-800 text-white border-navy-800" : "bg-white text-navy-500 border-navy-200 hover:bg-navy-50"
            }`}
          >
            {statusLabel(s)}
          </button>
        ))}
      </div>

      {/* list */}
      {loading && !data ? (
        <div className="bg-white rounded-2xl border border-navy-100/70 shadow-card p-12 text-center text-sm text-navy-400">Loading…</div>
      ) : error && !data ? (
        <div className="bg-white rounded-2xl border border-red-100 p-10 text-center text-sm text-red-600">
          {error} <button onClick={refetch} className="underline ml-1">Retry</button>
        </div>
      ) : rows.length === 0 ? (
        <div className="bg-white rounded-2xl border border-navy-100/70 shadow-card py-14 px-6 flex flex-col items-center text-center">
          <FileText size={36} className="text-navy-200 mb-3" />
          <h3 className="font-medium text-navy-800">
            {docs.some((d) => d.type === activeTab) ? "No documents match these filters" : `No ${labelOf(activeTab).toLowerCase()}s yet`}
          </h3>
          <p className="text-sm text-navy-400 mt-1 mb-4 max-w-sm">
            Create your first {labelOf(activeTab).toLowerCase()} in under a minute and share it on WhatsApp.
          </p>
          <Button onClick={() => goNew(activeTab)}><Plus size={16} /> New {labelOf(activeTab)}</Button>
        </div>
      ) : (
        <>
          <div className="md:hidden space-y-3">
            {rows.map((d) => (
              <button key={d.id} onClick={() => setViewId(d.id)} className="w-full text-left bg-white rounded-2xl border border-navy-100/70 shadow-card p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-semibold text-navy-900 truncate">{d.invoice_number}</p>
                    <p className="text-xs text-navy-400 truncate">{customerOf(d)}</p>
                  </div>
                  <StatusPill status={deriveStatus(d)} />
                </div>
                <div className="flex items-end justify-between mt-3 pt-3 border-t border-navy-100/60">
                  <p className="text-xs text-navy-400">{formatDate(d.created_at)}</p>
                  <div className="text-right">
                    <p className="font-semibold text-navy-900 tabular-nums">{inr(d.total)}</p>
                    {(d.type === "invoice" || d.type === "proforma") && Number(d.balance_due) > 0.009 && (
                      <p className="text-xs text-amber-600 tabular-nums">Due {inr(d.balance_due)}</p>
                    )}
                  </div>
                </div>
              </button>
            ))}
          </div>

          <div className="hidden md:block bg-white rounded-2xl border border-navy-100/70 shadow-card overflow-x-auto">
            <table className="w-full text-sm min-w-[760px]">
              <thead className="text-xs text-navy-400 text-left border-b border-navy-100/70">
                <tr>
                  <th className="px-5 py-3 font-medium">Number</th>
                  <th className="px-3 py-3 font-medium">{terms.client}</th>
                  <th className="px-3 py-3 font-medium">Date</th>
                  <th className="px-3 py-3 font-medium">Status</th>
                  <th className="px-3 py-3 font-medium text-right">Total</th>
                  <th className="px-5 py-3 font-medium text-right">Balance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-navy-100/60">
                {rows.map((d) => {
                  const showBal = d.type === "invoice" || d.type === "proforma";
                  return (
                    <tr key={d.id} onClick={() => setViewId(d.id)} className="cursor-pointer hover:bg-paper">
                      <td className="px-5 py-3.5 font-medium text-navy-900">{d.invoice_number}</td>
                      <td className="px-3 py-3.5">
                        <p className="text-navy-800">{customerOf(d)}</p>
                        {phoneOf(d) && <p className="text-xs text-navy-400">{phoneOf(d)}</p>}
                      </td>
                      <td className="px-3 py-3.5 text-navy-500">{formatDate(d.created_at)}</td>
                      <td className="px-3 py-3.5"><StatusPill status={deriveStatus(d)} /></td>
                      <td className="px-3 py-3.5 text-right font-medium text-navy-900 tabular-nums">{inr(d.total)}</td>
                      <td className="px-5 py-3.5 text-right tabular-nums text-navy-500">{showBal ? inr(d.balance_due) : "—"}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {pageCount > 1 && (
            <div className="flex items-center justify-between mt-4 text-sm text-navy-500">
              <span>{filtered.length} documents</span>
              <div className="flex items-center gap-1">
                <button disabled={page === 1} onClick={() => setPage((p) => p - 1)} className="w-9 h-9 flex items-center justify-center rounded-lg border border-navy-200 disabled:opacity-40"><ChevronLeft size={16} /></button>
                <span className="px-3 tabular-nums">{page} / {pageCount}</span>
                <button disabled={page === pageCount} onClick={() => setPage((p) => p + 1)} className="w-9 h-9 flex items-center justify-center rounded-lg border border-navy-200 disabled:opacity-40"><ChevronRight size={16} /></button>
              </div>
            </div>
          )}
        </>
      )}

      {viewDoc && (
        <DocDrawer
          doc={viewDoc}
          typeLabel={labelOf(viewDoc.type)}
          busy={busy}
          onClose={() => setViewId(null)}
          onEdit={() => navigate(`/dashboard/billing/${viewDoc.id}/edit`)}
          onDuplicate={() => navigate(`/dashboard/billing/new?type=${viewDoc.type}&from=${viewDoc.id}`)}
          onDelete={() => setDelDoc(viewDoc)}
 
          onPay={() => setPayDoc(viewDoc)}
          onConvert={() => convert(viewDoc)}
        />
      )}

      {payDoc && (
        <PaymentModal
          doc={payDoc}
          venueId={venue.id}
          onClose={() => setPayDoc(null)}
          onSaved={() => { setPayDoc(null); refetch(); }}
        />
      )}

      <Modal isOpen={Boolean(delDoc)} onClose={() => setDelDoc(null)} title="Delete this document?" size="sm">
        <p className="text-sm text-navy-500 mb-5">
          {delDoc?.invoice_number} will be permanently deleted. This can't be undone.
        </p>
        <div className="flex gap-3">
          <Button variant="outline" onClick={() => setDelDoc(null)} className="flex-1">Cancel</Button>
          <Button variant="danger" onClick={confirmDelete} loading={busy === "delete"} className="flex-1">Delete</Button>
        </div>
      </Modal>
    </DashboardLayout>
  );
}
import React, { useCallback, useEffect, useState } from "react";
import { useVenue } from "../../../context/VenueContext.jsx";
import { addonService } from "../../../services/addonService";
import { openCashfreeCheckout } from "../../../lib/cashfree";
import { formatCurrency, formatDate } from "../../../lib/formatters";
import Button from "../../../components/common/Button";
import { showSuccess, showError } from "../../../components/common/Toast";
import { Puzzle, CheckCircle2, CalendarDays } from "lucide-react";

const errText = (e, fallback) => e?.response?.data?.message || e?.message || fallback;

function PriceLine({ item, cycle }) {
  const yearly = cycle === "yearly";
  const d = yearly ? item.pricing.yearly : item.pricing.monthly;
  const hasDiscount = item.pricing.offer.active && d.final < d.original;
  return (
    <span>
      {hasDiscount && <span className="line-through text-navy-300 mr-1">{formatCurrency(d.original)}</span>}
      <span className="font-semibold text-navy-900">{formatCurrency(d.final)}</span>
      <span className="text-navy-400">{yearly ? "/yr" : "/mo"}</span>
      <span className="text-navy-400"> {item.gst_inclusive ? "(GST included)" : "+ GST"}</span>
    </span>
  );
}

function QuoteBox({ quote }) {
  if (!quote) return null;
  return (
    <div className="mt-3 bg-navy-50 rounded-xl p-3 text-sm space-y-1">
      {quote.discount_amount > 0 && (
        <div className="flex justify-between text-navy-700"><span>Discount</span><span>- {formatCurrency(quote.discount_amount)}</span></div>
      )}
      {!quote.gst_inclusive && (
        <>
          <div className="flex justify-between text-navy-700"><span>Price</span><span>{formatCurrency(quote.taxable_amount)}</span></div>
          <div className="flex justify-between text-navy-700"><span>GST ({quote.gst_rate}%)</span><span>{formatCurrency(quote.gst_amount)}</span></div>
        </>
      )}
      <div className="flex justify-between font-semibold text-navy-900 border-t border-navy-100 pt-1">
        <span>Total payable{quote.gst_inclusive ? " (GST included)" : ""}</span>
        <span>{formatCurrency(quote.total_payable)}</span>
      </div>
    </div>
  );
}

// Add-ons the vendor can buy or renew. Renders nothing when no add-on applies to this business type.
export default function AddonsSection() {
  const { venue, refetchVenue } = useVenue();
  const venueId = venue?.id;
  const [items, setItems] = useState(null);
  const [cycles, setCycles] = useState({});
  const [openKey, setOpenKey] = useState(null);
  const [quote, setQuote] = useState(null);
  const [busy, setBusy] = useState("");
  const [pending, setPending] = useState(null); // paid but not yet confirmed: { key, orderId }

  const load = useCallback(async () => {
    if (!venueId) return;
    try {
      const r = await addonService.list(venueId);
      setItems(r.data.data || []);
    } catch {
      setItems([]);
    }
  }, [venueId]);

  useEffect(() => { load(); }, [load]);

  const cycleOf = (key) => cycles[key] || "monthly";

  const openBuy = async (item, cycle) => {
    setOpenKey(item.key);
    setQuote(null);
    setBusy(`quote:${item.key}`);
    try {
      const r = await addonService.quote(venueId, item.key, cycle);
      setQuote(r.data.data.quote);
    } catch (e) {
      showError(errText(e, "Could not get the price"));
      setOpenKey(null);
    } finally {
      setBusy("");
    }
  };

  const changeCycle = (item, cycle) => {
    setCycles((p) => ({ ...p, [item.key]: cycle }));
    if (openKey === item.key) openBuy(item, cycle);
  };

  const confirmVerify = async (key, orderId) => {
    setBusy(`pay:${key}`);
    try {
      await addonService.verify(venueId, key, { orderId });
      setPending(null);
      setOpenKey(null);
      setQuote(null);
      showSuccess("Add-on activated");
      await load();
      refetchVenue?.();
    } catch (e) {
      setPending({ key, orderId });
      showError(errText(e, "Could not confirm the payment. If money was deducted, press 'Confirm payment'."));
    } finally {
      setBusy("");
    }
  };

  const pay = async (item) => {
    const cycle = cycleOf(item.key);
    setBusy(`pay:${item.key}`);
    try {
      const r = await addonService.order(venueId, item.key, { billingCycle: cycle, returnPath: "/dashboard/settings/subscription" });
      const { orderId, paymentSessionId, mode } = r.data.data;
      openCashfreeCheckout({
        paymentSessionId,
        mode,
        onSuccess: () => confirmVerify(item.key, orderId),
        onFailure: (err) => { showError(err.message || "Payment failed"); setBusy(""); },
        onDismiss: () => { showError("Payment cancelled"); setBusy(""); }
      });
    } catch (e) {
      showError(errText(e, "Could not start the payment"));
      setBusy("");
    }
  };

  if (!items || items.length === 0) return null;

  return (
    <div className="mb-6">
      <h3 className="font-display font-semibold text-navy-900 text-base mb-1">Add-ons</h3>
      <p className="text-sm text-navy-500 mb-3">Extra tools for your business. They renew separately from your plan.</p>
      <div className="grid gap-3 md:grid-cols-2">
        {items.map((item) => {
          const ent = item.entitlement;
          const live = ent?.live === true;
          const cycle = cycleOf(item.key);
          const expanded = openKey === item.key;
          return (
            <div key={item.key} className="bg-white rounded-2xl shadow-card border border-navy-100/60 p-4">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-600 flex items-center justify-center shrink-0"><Puzzle size={18} /></div>
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="font-semibold text-navy-900">{item.label}</p>
                    {item.included_in_plan && <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 inline-flex items-center gap-1"><CheckCircle2 size={11} /> Included in your plan</span>}
                    {!item.included_in_plan && live && <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700">Active</span>}
                    {!item.included_in_plan && !live && ent && <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-red-50 text-red-600">Expired</span>}
                  </div>
                  <p className="text-sm text-navy-500 mt-0.5">{item.description}</p>
                  {!item.included_in_plan && ent && (
                    <p className="text-xs text-navy-400 mt-1 inline-flex items-center gap-1">
                      <CalendarDays size={12} /> {live ? `Active until ${formatDate(ent.ends_at)} (${ent.days_left} days left)` : `Ended ${formatDate(ent.ends_at)}. Your data is safe.`}
                    </p>
                  )}
                </div>
              </div>

              {item.can_buy && (
                <div className="mt-3">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="inline-flex rounded-lg border border-navy-200 overflow-hidden text-xs font-semibold" role="group" aria-label="Billing cycle">
                      {["monthly", "yearly"].map((c) => (
                        <button key={c} type="button" onClick={() => changeCycle(item, c)} className={`px-3 py-1.5 ${cycle === c ? "bg-navy-900 text-white" : "bg-white text-navy-700"}`}>
                          {c === "yearly" ? "Yearly" : "Monthly"}
                        </button>
                      ))}
                    </div>
                    <div className="text-sm"><PriceLine item={item} cycle={cycle} /></div>
                  </div>

                  {!expanded ? (
                    <Button className="mt-3 w-full" onClick={() => openBuy(item, cycle)} loading={busy === `quote:${item.key}`}>
                      {live ? "Renew add-on" : "Activate add-on"}
                    </Button>
                  ) : (
                    <>
                      <QuoteBox quote={quote} />
                      <div className="mt-3 flex gap-2">
                        <Button className="flex-1" onClick={() => pay(item)} loading={busy === `pay:${item.key}`} disabled={!quote}>Pay now</Button>
                        <Button variant="outline" onClick={() => { setOpenKey(null); setQuote(null); }} disabled={busy === `pay:${item.key}`}>Cancel</Button>
                      </div>
                    </>
                  )}

                  {pending && pending.key === item.key && (
                    <Button variant="outline" className="mt-2 w-full" onClick={() => confirmVerify(pending.key, pending.orderId)} loading={busy === `pay:${item.key}`}>
                      Confirm payment
                    </Button>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
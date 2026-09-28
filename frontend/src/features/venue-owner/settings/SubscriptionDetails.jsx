import React, { useState, useEffect } from "react";
import { useTranslation } from "react-i18next";
import DashboardLayout from "../../../components/layout/DashboardLayout.jsx";
import { ownerSidebarItems } from "../ownerSidebarItems.js";
import { useVenue } from "../../../context/VenueContext.jsx";
import { useFetch } from "../../../hooks/useFetch";
import Badge from "../../../components/common/Badge";
import Loader from "../../../components/common/Loader";
import Button from "../../../components/common/Button";
import ConfirmDialog from "../../../components/common/ConfirmDialog";
import BillingToggle from "../../../components/common/BillingToggle";
import OfferBanner from "../../../components/common/OfferBanner";
import { showSuccess, showError } from "../../../components/common/Toast";
import { formatCurrency, formatDate } from "../../../lib/formatters";
import { translatePlanName } from "../../../lib/i18nLabels";
import { PLAN_FEATURES } from "../../../lib/planFeatures";
import { getCyclePricing, getBestOffer, getMaxYearlySavings } from "../../../lib/planPricing";
import { paymentService } from "../../../services/paymentService";
import { openCashfreeCheckout } from "../../../lib/cashfree";
import api from "../../../services/api";
import {
  Check, Zap, Star, Crown, Rocket, CalendarDays, CreditCard, ArrowRight, CheckCircle2, RefreshCw
} from "lucide-react";

const PLAN_STYLE = {
  Free:    { icon: Zap,    color: "text-navy-400",    ring: "border-navy-200",    badge: "bg-navy-50 text-navy-600" },
  Basic:   { icon: Star,   color: "text-sky-500",     ring: "border-sky-200",     badge: "bg-sky-50 text-sky-700" },
  Starter: { icon: Rocket, color: "text-primary-500", ring: "border-primary-200", badge: "bg-primary-50 text-primary-700" },
  Growth:  { icon: Crown,  color: "text-gold-600",    ring: "border-gold-400",    badge: "bg-gold-50 text-gold-600" },
  Pro:     { icon: Crown,  color: "text-emerald-500", ring: "border-emerald-400", badge: "bg-emerald-50 text-emerald-700" },
};

function getPlanStyle(name) { return PLAN_STYLE[name] || PLAN_STYLE.Basic; }

function featureLabel(key) {
  const found = PLAN_FEATURES.find((f) => f.key === key);
  if (found) return found.label;
  return String(key).replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function daysLeft(dateStr) {
  if (!dateStr) return null;
  const diff = Math.ceil((new Date(dateStr) - Date.now()) / 86400000);
  return diff > 0 ? diff : 0;
}

// GST Breakdown box shown in confirm dialog
function GstBreakdown({ quote }) {
  if (!quote) return null;
  return (
    <div className="mt-3 bg-navy-50 rounded-xl p-3 text-sm space-y-1">
      <div className="flex justify-between text-navy-700">
        <span>Plan price</span>
        <span>{formatCurrency(quote.plan_price)}</span>
      </div>
      {quote.discount_amount > 0 && (
        <div className="flex justify-between text-red-600">
          <span>— Discount ({quote.offer_percent}%)</span>
          <span>− {formatCurrency(quote.discount_amount)}</span>
        </div>
      )}
      {quote.credit_used > 0 && (
        <div className="flex justify-between text-emerald-600">
          <span>— Referral credit</span>
          <span>− {formatCurrency(quote.credit_used)}</span>
        </div>
      )}
      <div className="flex justify-between text-navy-700 border-t border-navy-200 pt-1 mt-1">
        <span>= Taxable amount</span>
        <span>{formatCurrency(quote.taxable_amount)}</span>
      </div>
      <div className="flex justify-between text-navy-500">
        <span>+ GST {quote.gst_rate}%</span>
        <span>+ {formatCurrency(quote.gst_amount)}</span>
      </div>
      <div className="flex justify-between font-bold text-navy-900 border-t border-navy-200 pt-1 mt-1">
        <span>= Total payable</span>
        <span>{formatCurrency(quote.total_payable)}</span>
      </div>
    </div>
  );
}

export default function SubscriptionDetails() {
  const { t, i18n } = useTranslation();
  const { venue, refetchVenue } = useVenue();
  const { data: subscription, loading, refetch: refetchSub } = useFetch(
    venue ? `/subscriptions/${venue.id}` : null,
    { skip: !venue }
  );
  const { data: plans, loading: plansLoading } = useFetch("/plans");
  const { data: payments, loading: paymentsLoading, refetch: refetchPayments } = useFetch(
    venue ? `/payments?venueId=${venue.id}` : null,
    { skip: !venue }
  );

  const [upgradeTarget, setUpgradeTarget] = useState(null);
  const [switching, setSwitching] = useState(false);
  const [cycleChoice, setCycleChoice] = useState(null);
  const [quote, setQuote] = useState(null);
  const [quoteLoading, setQuoteLoading] = useState(false);

  // Renewal state
  const [renewConfirmOpen, setRenewConfirmOpen] = useState(false);
  const [renewQuote, setRenewQuote] = useState(null);
  const [renewQuoteLoading, setRenewQuoteLoading] = useState(false);
  const [renewing, setRenewing] = useState(false);
  const [renewUseCredit, setRenewUseCredit] = useState(true);

  if (loading || plansLoading) return <Loader fullScreen />;

  const planList = plans || [];
  const currentPlanId = subscription?.plan?.id;
  const currentCycle = subscription?.billing_cycle === "yearly" ? "yearly" : "monthly";
  const cycle = cycleChoice || currentCycle;
  const trialDays = daysLeft(subscription?.trial_ends_at);
  const isTrial = subscription?.status === "trial";
  const bestOffer = getBestOffer(planList);
  const maxSavings = getMaxYearlySavings(planList);
  const isFree = Number(subscription?.plan?.monthly_price) === 0;

  const isFreeTarget = (plan) => Number(plan?.monthly_price) === 0;
  const isDowngrade = (plan) => Number(plan.monthly_price) < Number(subscription?.plan?.monthly_price ?? 0);

  // ---------- Renewal handlers ----------
  const loadRenewQuote = async (useCredit) => {
    if (!venue || !subscription?.plan) return;
    setRenewQuoteLoading(true);
    try {
      const { data } = await paymentService.getQuote(
        venue.id,
        subscription.plan.id,
        currentCycle,
        useCredit
      );
      setRenewQuote(data.data);
    } catch (_) {
      setRenewQuote(null);
    } finally {
      setRenewQuoteLoading(false);
    }
  };

  const handleOpenRenew = async () => {
    if (!venue || !subscription?.plan) return;
    setRenewUseCredit(true);
    setRenewConfirmOpen(true);
    await loadRenewQuote(true);
  };

  const handleToggleRenewCredit = async (checked) => {
    setRenewUseCredit(checked);
    await loadRenewQuote(checked);
  };

  const finishRenew = () => {
    showSuccess("Subscription renewed! Your new expiry date has been extended.");
    setRenewConfirmOpen(false);
    setRenewQuote(null);
    setRenewUseCredit(true);
    refetchSub();
    refetchPayments?.();
    refetchVenue?.();
    setRenewing(false);
  };

  const handleConfirmRenew = async () => {
    if (!venue || !subscription?.plan) return;
    setRenewing(true);

    try {
      const { data } = await paymentService.createOrder(
        venue.id,
        subscription.plan.id,
        "/dashboard/settings/subscription",
        currentCycle,
        "renewal",
        renewUseCredit
      );
      const { orderId, paymentSessionId, mode, creditOnly: isCreditOnly } = data.data;

      if (isCreditOnly) {
        await paymentService.verifyPayment({
          venueId: venue.id,
          planId: subscription.plan.id,
          billingCycle: currentCycle,
          creditOnly: true,
          type: "renewal",
          useCredit: renewUseCredit
        });
        finishRenew();
        return;
      }

      openCashfreeCheckout({
        paymentSessionId,
        mode,
        onSuccess: async () => {
          try {
            await paymentService.verifyPayment({
              orderId,
              venueId: venue.id,
              planId: subscription.plan.id,
              billingCycle: currentCycle,
              type: "renewal",
              useCredit: renewUseCredit
            });
            finishRenew();
          } catch (err) {
            showError("Renewal payment failed. Please try again.");
            setRenewing(false);
          }
        },
        onFailure: (err) => {
          showError(err.message || "Renewal payment failed.");
          setRenewing(false);
        },
        onDismiss: () => {
          showError("Renewal cancelled.");
          setRenewing(false);
        }
      });
    } catch (err) {
      showError(err.response?.data?.message || "Could not initiate renewal.");
      setRenewing(false);
    }
  };

  // ---------- Plan switch handlers ----------
  const handleSelectPlan = async (plan) => {
    setUpgradeTarget(plan);
    if (!isFreeTarget(plan) && venue) {
      setQuoteLoading(true);
      try {
        const { data } = await paymentService.getQuote(venue.id, plan.id, cycle);
        setQuote(data.data);
      } catch (_) {
        setQuote(null);
      } finally {
        setQuoteLoading(false);
      }
    } else {
      setQuote(null);
    }
  };

  const finishSwitch = (planName) => {
    showSuccess(t("settings.subscription.switchedTo", { name: translatePlanName(planName, i18n.language) }));
    setUpgradeTarget(null);
    setQuote(null);
    refetchSub();
    refetchPayments?.();
    refetchVenue?.();
    setSwitching(false);
  };

  const handleChangePlan = async () => {
    if (!upgradeTarget || !venue) return;
    setSwitching(true);

    if (isFreeTarget(upgradeTarget)) {
      try {
        await api.patch(`/subscriptions/${venue.id}/change-plan`, { planId: upgradeTarget.id });
        finishSwitch(upgradeTarget.name);
      } catch (err) {
        showError(err.response?.data?.message || t("settings.subscription.changeError"));
        setSwitching(false);
      }
      return;
    }

    try {
      const { data } = await paymentService.createOrder(
        venue.id,
        upgradeTarget.id,
        "/dashboard/settings/subscription",
        cycle
      );
      const { orderId, paymentSessionId, mode, creditOnly: isCreditOnly } = data.data;

      if (isCreditOnly) {
        await paymentService.verifyPayment({ venueId: venue.id, planId: upgradeTarget.id, billingCycle: cycle, creditOnly: true });
        finishSwitch(upgradeTarget.name);
        return;
      }

      openCashfreeCheckout({
        paymentSessionId,
        mode,
        onSuccess: async () => {
          try {
            await paymentService.verifyPayment({ orderId, venueId: venue.id, planId: upgradeTarget.id });
            finishSwitch(upgradeTarget.name);
          } catch (err) {
            showError(t("settings.subscription.changeError"));
            setSwitching(false);
          }
        },
        onFailure: (err) => {
          showError(err.message || t("settings.subscription.changeError"));
          setSwitching(false);
        },
        onDismiss: () => {
          showError(t("settings.subscription.changeError"));
          setSwitching(false);
        }
      });
    } catch (err) {
      showError(err.response?.data?.message || t("settings.subscription.changeError"));
      setSwitching(false);
    }
  };

  const targetPrice = upgradeTarget ? getCyclePricing(upgradeTarget, cycle) : null;

  // Compute new expiry after renewal (for display in confirm dialog)
  const currentEnd = subscription?.current_period_end ? new Date(subscription.current_period_end) : null;
  const renewedEnd = currentEnd
    ? new Date(currentCycle === "yearly"
        ? new Date(currentEnd).setFullYear(currentEnd.getFullYear() + 1)
        : new Date(currentEnd).setMonth(currentEnd.getMonth() + 1))
    : null;

  return (
    <DashboardLayout sidebarItems={ownerSidebarItems} pageTitle={t("settings.subscription.pageTitle")}>

      <CurrentPlanBanner
        subscription={subscription}
        trialDays={trialDays}
        isTrial={isTrial}
        isFree={isFree}
        onRenew={handleOpenRenew}
      />

      <OfferBanner offer={bestOffer} className="mb-6" />

      <div className="mb-8">
        <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4 mb-6">
          <div>
            <h2 className="text-base font-display font-semibold text-navy-800 mb-1">{t("settings.subscription.allPlans")}</h2>
            <p className="text-sm text-navy-400">
              {isTrial ? t("settings.subscription.trialHint") : t("settings.subscription.switchHint")}
            </p>
          </div>
          <BillingToggle value={cycle} onChange={setCycleChoice} savePercent={maxSavings} />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {planList.map((plan) => {
            const style = getPlanStyle(plan.name);
            const Icon = style.icon;
            const price = getCyclePricing(plan, cycle);
            const isCurrent = plan.id === currentPlanId;
            const sameCycle = currentCycle === cycle;
            const isCurrentExact = isCurrent && (price.isFree || sameCycle);
            const down = isDowngrade(plan);
            const paidSwitch = !price.isFree;

            return (
              <div
                key={plan.id}
                className={`relative bg-white rounded-2xl p-5 border-2 flex flex-col transition-all ${
                  isCurrent ? `${style.ring} shadow-card` : "border-navy-100 hover:border-navy-200 hover:shadow-card"
                }`}
              >
                {isCurrent && (
                  <span className={`absolute -top-3 left-1/2 -translate-x-1/2 text-xs font-semibold px-3 py-1 rounded-full ${style.badge}`}>
                    {t("settings.subscription.currentPlan")}
                  </span>
                )}
                {price.hasDiscount && !isCurrent && (
                  <span className="absolute -top-3 right-4 bg-red-600 text-white text-[11px] font-bold px-3 py-1 rounded-full shadow">
                    {price.offer.percent}% OFF
                  </span>
                )}

                <div className="flex items-center gap-2 mb-3">
                  <Icon size={18} className={style.color} />
                  <span className="font-display font-semibold text-navy-800">{translatePlanName(plan.name, i18n.language)}</span>
                </div>

                <div className="mb-1 min-h-[4.5rem]">
                  {price.hasDiscount && (
                    <p className="text-sm text-navy-300 line-through">{formatCurrency(price.original)}</p>
                  )}
                  <div>
                    <span className="text-2xl font-display font-bold text-navy-900">{formatCurrency(price.final)}</span>
                    {!price.isFree && <span className="text-sm text-navy-400">{price.cycleLabel}</span>}
                  </div>
                  {paidSwitch && (
                    <p className="text-xs text-navy-400 mt-0.5">+ 18% GST</p>
                  )}
                  {paidSwitch && cycle === "yearly" && (
                    <p className="text-xs text-navy-500 mt-0.5">≈ {formatCurrency(price.perMonth)}/mo</p>
                  )}
                  {paidSwitch && cycle === "yearly" && price.savingsPercent > 0 && (
                    <p className="text-xs font-semibold text-emerald-600 mt-0.5">Save {price.savingsPercent}% vs monthly</p>
                  )}
                  {price.isFree && <p className="text-xs text-navy-400 mt-0.5">Free forever</p>}
                </div>

                {plan.trial_days > 0 && (
                  <p className="text-xs text-sky-600 font-medium mb-3">{t("settings.subscription.trialDaysBadge", { days: plan.trial_days })}</p>
                )}
                {plan.trial_days === 0 && !price.isFree && (
                  <p className="text-xs text-navy-400 mb-3">{t("settings.subscription.noTrial")}</p>
                )}

                <ul className="space-y-1.5 mb-5 mt-2 flex-1">
                  {(plan.features || []).map((f, i) => (
                    <li key={i} className="flex items-start gap-2 text-xs text-navy-600">
                      <Check size={13} className="text-emerald-500 mt-0.5 flex-shrink-0" />
                      <span>{featureLabel(f)}</span>
                    </li>
                  ))}
                </ul>

                {isCurrentExact ? (
                  <div className="flex items-center gap-1.5 text-xs text-emerald-600 font-medium justify-center py-2">
                    <CheckCircle2 size={14} /> {t("settings.subscription.active")}
                  </div>
                ) : isCurrent ? (
                  <Button variant="outline" className="w-full text-sm" onClick={() => handleSelectPlan(plan)}>
                    {cycle === "yearly" ? "Switch to yearly" : "Switch to monthly"}
                    <span className="ml-1 text-[10px] opacity-80">· {formatCurrency(price.final)}</span>
                  </Button>
                ) : (
                  <Button
                    variant={down ? "outline" : "primary"}
                    className="w-full text-sm"
                    onClick={() => handleSelectPlan(plan)}
                  >
                    {down ? t("settings.subscription.switch") : t("settings.subscription.upgrade")} <ArrowRight size={13} className="ml-1" />
                    {paidSwitch && (
                      <span className="ml-1 text-[10px] opacity-80">
                        · {t("settings.subscription.payNow", "Pay")} {formatCurrency(price.final)}
                      </span>
                    )}
                  </Button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Payment history */}
      <div className="bg-white rounded-2xl shadow-card border border-navy-100/60 p-4 md:p-5">
        <div className="flex items-center gap-2 mb-4">
          <CreditCard size={16} className="text-navy-400" />
          <h2 className="font-display font-semibold text-navy-800">{t("settings.subscription.paymentHistory")}</h2>
        </div>
        {paymentsLoading ? (
          <Loader />
        ) : (payments || []).length === 0 ? (
          <p className="text-sm text-navy-400 py-4 text-center">{t("settings.subscription.noPayments")}</p>
        ) : (
          <>
            <div className="md:hidden divide-y divide-navy-100/60">
              {payments.map((p) => (
                <div key={p.id} className="flex items-center justify-between py-3">
                  <div>
                    <p className="font-medium text-navy-800 text-sm">{formatCurrency(p.total_amount ?? p.amount)}</p>
                    {p.gst_amount > 0 && (
                      <p className="text-xs text-navy-400 mt-0.5">incl. GST ₹{Number(p.gst_amount).toFixed(2)}</p>
                    )}
                    <p className="text-xs text-navy-400 mt-0.5">{formatDate(p.created_at)}</p>
                  </div>
                  <Badge status={p.status || "paid"} />
                </div>
              ))}
            </div>

            <table className="hidden md:table w-full text-sm">
              <thead>
                <tr className="text-left text-navy-400 text-xs border-b border-navy-100/60">
                  <th className="pb-2 font-medium">{t("settings.subscription.colDate")}</th>
                  <th className="pb-2 font-medium">Plan</th>
                  <th className="pb-2 font-medium">Amount (excl. GST)</th>
                  <th className="pb-2 font-medium">GST</th>
                  <th className="pb-2 font-medium">{t("settings.subscription.colAmount")}</th>
                  <th className="pb-2 font-medium">{t("settings.subscription.colStatus")}</th>
                </tr>
              </thead>
              <tbody>
                {payments.map((p) => (
                  <tr key={p.id} className="border-b border-navy-100/60 last:border-0">
                    <td className="py-2.5 text-navy-600">{formatDate(p.created_at)}</td>
                    <td className="py-2.5 text-navy-600">{p.plan_name_snapshot || "—"}</td>
                    <td className="py-2.5 text-navy-600">
                      {p.base_amount ? formatCurrency(Number(p.base_amount) - Number(p.discount_amount || 0)) : "—"}
                    </td>
                    <td className="py-2.5 text-navy-600">
                      {p.gst_amount ? formatCurrency(p.gst_amount) : "—"}
                    </td>
                    <td className="py-2.5 font-medium text-navy-900">{formatCurrency(p.total_amount ?? p.amount)}</td>
                    <td className="py-2.5"><Badge status={p.status || "paid"} /></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </>
        )}
      </div>

      {/* Plan switch confirm */}
      <ConfirmDialog
        isOpen={!!upgradeTarget}
        onClose={() => { setUpgradeTarget(null); setQuote(null); }}
        onConfirm={handleChangePlan}
        loading={switching || quoteLoading}
        title={t("settings.subscription.confirmSwitchTitle", { name: upgradeTarget ? translatePlanName(upgradeTarget.name, i18n.language) : "" })}
        message={
          upgradeTarget
            ? !isFreeTarget(upgradeTarget)
              ? (
                <div>
                  <p className="text-sm text-navy-600">
                    {t("settings.subscription.confirmPayCycleMsg", {
                      defaultValue: "Switching to {{name}} plan ({{cycle}}).",
                      name: translatePlanName(upgradeTarget.name, i18n.language),
                      cycle: cycle === "yearly" ? "billed yearly" : "billed monthly"
                    })}
                  </p>
                  {quoteLoading ? (
                    <p className="text-xs text-navy-400 mt-2">Loading price breakdown...</p>
                  ) : (
                    <GstBreakdown quote={quote} />
                  )}
                </div>
              )
              : t("settings.subscription.confirmDowngradeMsg", {
                  fromName: translatePlanName(subscription?.plan?.name, i18n.language),
                  fromPrice: formatCurrency(subscription?.plan?.monthly_price),
                  toName: translatePlanName(upgradeTarget.name, i18n.language),
                  toPrice: formatCurrency(upgradeTarget.monthly_price),
                })
            : ""
        }
        confirmText={
          upgradeTarget && !isFreeTarget(upgradeTarget)
            ? t("settings.subscription.confirmPayBtn", "Pay & Switch")
            : t("settings.subscription.confirmSwitchBtn")
        }
      />

      {/* Renewal confirm dialog */}
      <ConfirmDialog
        isOpen={renewConfirmOpen}
        onClose={() => { setRenewConfirmOpen(false); setRenewQuote(null); setRenewUseCredit(true); }}
        onConfirm={handleConfirmRenew}
        loading={renewing || renewQuoteLoading}
        title={`Renew ${translatePlanName(subscription?.plan?.name, i18n.language)} Plan`}
        message={
          <div>
            <p className="text-sm text-navy-600">
              Your subscription will be extended by one {currentCycle === "yearly" ? "year" : "month"} from your
              current expiry date.
            </p>
            {renewedEnd && (
              <p className="text-sm font-semibold text-navy-800 mt-1">
                New expiry: {formatDate(renewedEnd.toISOString())}
              </p>
            )}

            {/* Referral credit option */}
            {renewQuote && Number(renewQuote.credit_available) > 0 ? (
              <label className="mt-3 flex items-start gap-2 rounded-xl border border-emerald-200 bg-emerald-50 p-3 cursor-pointer">
                <input
                  type="checkbox"
                  className="mt-0.5 accent-emerald-600"
                  checked={renewUseCredit}
                  disabled={renewing || renewQuoteLoading}
                  onChange={(e) => handleToggleRenewCredit(e.target.checked)}
                />
                <span className="text-sm text-emerald-800">
                  Use referral credit{" "}
                  <span className="font-semibold">
                    ({formatCurrency(renewQuote.credit_available)} available)
                  </span>
                  {renewUseCredit && Number(renewQuote.credit_used) > 0 && (
                    <span className="block text-xs text-emerald-700 mt-0.5">
                      {formatCurrency(renewQuote.credit_used)} will be deducted from this renewal.
                    </span>
                  )}
                </span>
              </label>
            ) : (
              renewQuote && (
                <p className="mt-3 text-xs text-navy-400">
                  No referral credit available right now. Credit becomes usable after the 14-day hold.
                </p>
              )
            )}

            {renewQuoteLoading ? (
              <p className="text-xs text-navy-400 mt-2">Loading price breakdown...</p>
            ) : (
              <GstBreakdown quote={renewQuote} />
            )}
          </div>
        }
        confirmText={renewQuote?.is_free ? "Renew with Credit" : "Pay & Renew"}
      />
    </DashboardLayout>
  );
}

function CurrentPlanBanner({ subscription, trialDays, isTrial, isFree, onRenew }) {
  const { t, i18n } = useTranslation();
  if (!subscription) return null;
  const plan = subscription.plan;
  const style = getPlanStyle(plan?.name);
  const Icon = style.icon;
  const isYearly = subscription.billing_cycle === "yearly";
  const isExpired = subscription.status === "expired";
  const isExpiringSoon = subscription.status === "expiring_soon";
  const canRenew = !isFree && !isTrial && (isExpired || isExpiringSoon || subscription.status === "active");

  return (
    <div className="bg-white rounded-2xl shadow-card border border-navy-100/60 p-4 md:p-5 mb-6 flex flex-col sm:flex-row sm:items-center gap-4">
      <div className={`w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0 ${style.badge}`}>
        <Icon size={22} />
      </div>
      <div className="flex-1">
        <div className="flex items-center gap-2 mb-0.5 flex-wrap">
          <span className="font-display font-semibold text-navy-900 text-base">
            {translatePlanName(plan?.name, i18n.language)} {t("settings.subscription.planLabel", "Plan")}
          </span>
          <Badge status={subscription.status} />
          {Number(subscription.locked_price) > 0 && (
            <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-navy-50 text-navy-600">
              {isYearly ? "Yearly" : "Monthly"}
            </span>
          )}
        </div>
        <p className="text-sm text-navy-500">
          {formatCurrency(subscription.locked_price)}
          {isYearly ? "/yr" : t("settings.subscription.perMonth")}
          {" + 18% GST"}
          {isTrial && trialDays !== null && (
            <span className="ml-2 text-gold-600 font-medium">
              {trialDays === 1
                ? t("settings.subscription.trialLeftOne", { days: trialDays })
                : t("settings.subscription.trialLeftMany", { days: trialDays })}
            </span>
          )}
        </p>
      </div>
      <div className="flex flex-col items-end gap-2 flex-shrink-0">
        <div className="flex items-center gap-1.5 text-xs text-navy-400">
          <CalendarDays size={13} />
          <span>
            {isExpired ? "Expired" : isTrial ? t("settings.subscription.trialEnds") : t("settings.subscription.renews")}{" "}
            {formatDate(subscription.current_period_end)}
          </span>
        </div>
        {canRenew && (
          <Button
            variant="outline"
            size="sm"
            className="text-xs gap-1.5 border-emerald-300 text-emerald-700 hover:bg-emerald-50"
            onClick={onRenew}
          >
            <RefreshCw size={12} />
            {isExpired ? "Renew Now" : "Renew Early"}
          </Button>
        )}
      </div>
    </div>
  );
}
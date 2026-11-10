import React from "react";
import Card from "../../../components/common/Card";
import Badge from "../../../components/common/Badge";
import { formatCurrency } from "../../../lib/formatters";
import { PLAN_FEATURES } from "../../../lib/planFeatures";
import { getCyclePricing, getDaysLeft } from "../../../lib/planPricing";
import { Check, Edit2, Trash2, Tag, Eye, EyeOff, Users } from "lucide-react";

export default function PlanCard({ plan, onEdit, onDelete, onToggleVisibility, busy = false }) {
  const monthly = getCyclePricing(plan, "monthly");
  const yearly = getCyclePricing(plan, "yearly");
  const offer = monthly.offer;
  const daysLeft = getDaysLeft(offer.ends_at);
  const isFree = monthly.isFree;
  const isHidden = plan.is_active === false;
  const subscribers = Number(plan.subscriber_count) || 0;

  return (
    <div className={isHidden ? "opacity-75" : ""}>
      <Card>
        <div className="flex justify-between items-start mb-2">
          <h3 className="font-semibold text-lg">{plan.name}</h3>
          <div className="flex items-center gap-2">
            <button onClick={() => onEdit(plan)} className="text-gray-400 hover:text-primary-600" title="Edit plan">
              <Edit2 size={16} />
            </button>
            <button
              onClick={() => onDelete(plan)}
              className="text-gray-400 hover:text-red-600"
              title={subscribers > 0 ? "Plans with vendors can't be deleted. Hide it instead." : "Delete plan"}
            >
              <Trash2 size={16} />
            </button>
          </div>
        </div>

        {offer.active && (
          <div className="inline-flex items-center gap-1.5 text-xs font-semibold text-amber-700 bg-amber-100 rounded-full px-2.5 py-1 mb-2">
            <Tag size={12} />
            {offer.name || "Offer"} · {offer.percent}% OFF
            {daysLeft !== null && ` · ${daysLeft}d left`}
          </div>
        )}

        <p className="text-2xl font-bold mb-0.5">
          {monthly.hasDiscount && (
            <span className="text-sm font-normal text-gray-400 line-through mr-2">{formatCurrency(monthly.original)}</span>
          )}
          {formatCurrency(monthly.final)}
          <span className="text-sm text-gray-400">/mo</span>
        </p>

        {!isFree && (
          <p className="text-sm text-gray-600 mb-1">
            {yearly.hasDiscount && (
              <span className="text-gray-400 line-through mr-1.5">{formatCurrency(yearly.original)}</span>
            )}
            <span className="font-semibold">{formatCurrency(yearly.final)}</span>
            <span className="text-gray-400">/yr</span>
          </p>
        )}

        <p className="text-xs text-gray-400 mb-3">
          {plan.trial_days} day trial{!isFree && ` · ${monthly.gstLabel}`}
        </p>

        <div className="flex flex-wrap items-center gap-2">
          {isHidden ? (
            <span className="inline-flex items-center gap-1 text-xs font-semibold text-gray-600 bg-gray-100 border border-gray-200 rounded-full px-2.5 py-1">
              <EyeOff size={12} /> Hidden from new vendors
            </span>
          ) : (
            <Badge status="active">Visible</Badge>
          )}
          <span className="inline-flex items-center gap-1 text-xs text-gray-500">
            <Users size={12} /> {subscribers} {subscribers === 1 ? "vendor" : "vendors"} on this plan
          </span>
        </div>

        <button
          type="button"
          disabled={busy}
          onClick={() => onToggleVisibility(plan)}
          className="mt-3 w-full inline-flex items-center justify-center gap-2 rounded-lg border border-gray-300 bg-white px-3 py-2 text-sm font-medium text-gray-700 hover:border-primary-400 hover:text-primary-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isHidden ? <Eye size={15} /> : <EyeOff size={15} />}
          {busy ? "Please wait..." : isHidden ? "Unhide (show to new vendors)" : "Hide from new vendors"}
        </button>

        <ul className="mt-4 space-y-2">
          {(plan.features || []).map((f, i) => (
            <li key={i} className="flex items-center gap-2 text-sm text-gray-600">
              <Check size={14} className="text-primary-600" /> {PLAN_FEATURES.find((pf) => pf.key === f)?.label || f}
            </li>
          ))}
        </ul>
      </Card>
    </div>
  );
}
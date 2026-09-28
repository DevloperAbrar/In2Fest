import React from "react";
import Card from "../../../components/common/Card";
import Badge from "../../../components/common/Badge";
import { formatCurrency } from "../../../lib/formatters";
import { PLAN_FEATURES } from "../../../lib/planFeatures";
import { getCyclePricing, getDaysLeft } from "../../../lib/planPricing";
import { Check, Edit2, Trash2, Tag } from "lucide-react";

export default function PlanCard({ plan, onEdit, onDelete }) {
  const monthly = getCyclePricing(plan, "monthly");
  const yearly = getCyclePricing(plan, "yearly");
  const offer = monthly.offer;
  const daysLeft = getDaysLeft(offer.ends_at);
  const isFree = monthly.isFree;

  return (
    <Card>
      <div className="flex justify-between items-start mb-2">
        <h3 className="font-semibold text-lg">{plan.name}</h3>
        <div className="flex items-center gap-2">
          <button onClick={() => onEdit(plan)} className="text-gray-400 hover:text-primary-600">
            <Edit2 size={16} />
          </button>
          <button onClick={() => onDelete(plan)} className="text-gray-400 hover:text-red-600">
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

      <p className="text-xs text-gray-400 mb-3">{plan.trial_days} day trial</p>
      <Badge status={plan.is_active ? "active" : "expired"}>{plan.is_active ? "Active" : "Inactive"}</Badge>
      <ul className="mt-4 space-y-2">
        {(plan.features || []).map((f, i) => (
          <li key={i} className="flex items-center gap-2 text-sm text-gray-600">
            <Check size={14} className="text-primary-600" /> {PLAN_FEATURES.find((pf) => pf.key === f)?.label || f}
          </li>
        ))}
      </ul>
    </Card>
  );
}
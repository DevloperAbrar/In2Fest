import React from "react";
import Card from "../../../components/common/Card";
import Badge from "../../../components/common/Badge";
import { formatCurrency } from "../../../lib/formatters";
import { PLAN_FEATURES } from "../../../lib/planFeatures";
import { Check, Edit2, Trash2 } from "lucide-react";

export default function PlanCard({ plan, onEdit, onDelete }) {
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
      <p className="text-2xl font-bold mb-1">{formatCurrency(plan.monthly_price)}<span className="text-sm text-gray-400">/mo</span></p>
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
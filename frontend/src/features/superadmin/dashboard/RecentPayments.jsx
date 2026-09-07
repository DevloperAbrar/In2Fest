import React from "react";
import { Link } from "react-router-dom";
import Card from "../../../components/common/Card";
import EmptyState from "../../../components/common/EmptyState";
import { formatCurrency, formatDateTime } from "../../../lib/formatters";
import { CreditCard } from "lucide-react";

export default function RecentPayments({ payments = [] }) {
  return (
    <Card
      title="Recent Payments"
      action={<Link to="/admin/payments" className="text-xs font-medium text-primary-600 hover:underline">View all</Link>}
    >
      {payments.length === 0 ? (
        <EmptyState icon={CreditCard} title="No payments yet" />
      ) : (
        <div className="space-y-3">
          {payments.map((p) => (
            <div key={p.id} className="flex items-center justify-between gap-3 p-2.5 rounded-lg">
              <div className="min-w-0">
                <p className="text-sm font-medium text-gray-800 truncate">{p.hallName}</p>
                <p className="text-xs text-gray-400 mt-0.5 capitalize">
                  {p.method?.replace(/_/g, " ")} · {formatDateTime(p.createdAt)}
                </p>
              </div>
              <p className="text-sm font-semibold text-gray-900 flex-shrink-0">{formatCurrency(p.amount)}</p>
            </div>
          ))}
        </div>
      )}
    </Card>
  );
}
import React from "react";
import { formatCurrency, formatDate } from "../../../lib/formatters";

export default function PaymentLedger({ bookings = [] }) {
  const allEntries = bookings.flatMap((b) => (b.ledger || []).map((entry) => ({ ...entry, eventDate: b.event_date })));

  if (allEntries.length === 0) {
    return <p className="text-sm text-navy-400">No payment history yet.</p>;
  }

  return (
    <>
      {/* Mobile: compact list rows */}
      <div className="md:hidden divide-y divide-navy-100/60">
        {allEntries.map((entry) => (
          <div key={entry.id} className="flex items-center justify-between py-3">
            <div>
              <p className="text-sm font-medium text-navy-800 capitalize">{entry.type}</p>
              <p className="text-xs text-navy-400 mt-0.5">
                {formatDate(entry.paid_at)} &middot; <span className="capitalize">{entry.method}</span>
              </p>
            </div>
            <p className="font-semibold text-navy-900 text-sm">{formatCurrency(entry.amount)}</p>
          </div>
        ))}
      </div>

      {/* Desktop: table */}
      <table className="hidden md:table w-full text-sm">
        <thead className="text-navy-400 text-left">
          <tr>
            <th className="py-2 font-medium">Date</th>
            <th className="py-2 font-medium">Type</th>
            <th className="py-2 font-medium">Method</th>
            <th className="py-2 font-medium">Amount</th>
          </tr>
        </thead>
        <tbody>
          {allEntries.map((entry) => (
            <tr key={entry.id} className="border-t border-navy-100/60">
              <td className="py-2 text-navy-600">{formatDate(entry.paid_at)}</td>
              <td className="py-2 capitalize text-navy-600">{entry.type}</td>
              <td className="py-2 capitalize text-navy-600">{entry.method}</td>
              <td className="py-2 font-medium text-navy-900">{formatCurrency(entry.amount)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </>
  );
}
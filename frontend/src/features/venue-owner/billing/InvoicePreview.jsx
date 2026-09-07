import React from "react";
import { formatCurrency } from "../../../lib/formatters";

function formatDiscountLabel(discountType, discountValue) {
  if (!discountType || discountType === "none" || Number(discountValue) <= 0) return "-";
  if (discountType === "percentage") return `${discountValue}%`;
  return formatCurrency(discountValue);
}

export default function InvoicePreview({
  lineItems = [],
  gstEnabled,
  gstRate = 18,
  overallDiscountType = "none",
  overallDiscountValue = 0,
  totals
}) {
  const computed =
    totals ||
    (() => {
      const subtotal = lineItems.reduce((sum, item) => sum + Number(item.amount || 0), 0);
      const half = gstEnabled ? gstRate / 2 : 0;
      const cgst = subtotal * (half / 100);
      const sgst = subtotal * (half / 100);
      return { subtotal, discountAmount: 0, taxableAmount: subtotal, cgst, sgst, total: subtotal + cgst + sgst };
    })();

  const { subtotal, discountAmount, taxableAmount, cgst, sgst, total } = computed;
  const hasOverallDiscount = overallDiscountType !== "none" && Number(overallDiscountValue) > 0;
  const halfRate = (Number(gstRate) || 0) / 2;

  return (
    <div className="bg-paper rounded-xl p-4 text-sm">
      {/* Mobile: stacked line items */}
      <div className="md:hidden space-y-2 mb-3">
        {lineItems.map((item, i) => (
          <div key={i} className="bg-white rounded-xl border border-navy-100/60 p-3">
            <div className="flex items-start justify-between gap-2">
              <p className="font-medium text-navy-800 text-sm">
                {item.description || <span className="text-navy-300">-</span>}
              </p>
              <p className="font-semibold text-navy-900 text-sm shrink-0">{formatCurrency(item.amount)}</p>
            </div>
            <p className="text-xs text-navy-400 mt-1">
              {item.quantity} &times; {formatCurrency(item.rate)}
              {formatDiscountLabel(item.discount_type, item.discount_value) !== "-" && (
                <> &middot; {formatDiscountLabel(item.discount_type, item.discount_value)} off</>
              )}
            </p>
          </div>
        ))}
      </div>

      {/* Desktop: table */}
      <table className="hidden md:table w-full mb-3">
        <thead className="text-navy-400 text-left text-xs">
          <tr>
            <th className="pb-1 font-medium">Item</th>
            <th className="pb-1 font-medium">Qty</th>
            <th className="pb-1 font-medium">Rate</th>
            <th className="pb-1 font-medium">Discount</th>
            <th className="pb-1 font-medium text-right">Amount</th>
          </tr>
        </thead>
        <tbody>
          {lineItems.map((item, i) => (
            <tr key={i}>
              <td className="py-1 text-navy-700">{item.description || <span className="text-navy-300">-</span>}</td>
              <td className="py-1 text-navy-600">{item.quantity}</td>
              <td className="py-1 text-navy-600">{formatCurrency(item.rate)}</td>
              <td className="py-1 text-navy-600">{formatDiscountLabel(item.discount_type, item.discount_value)}</td>
              <td className="py-1 text-right text-navy-800 font-medium">{formatCurrency(item.amount)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="text-right space-y-1">
        <p className="text-navy-600">Subtotal: {formatCurrency(subtotal)}</p>

        {hasOverallDiscount && (
          <>
            <p className="text-primary-600">
              Discount {overallDiscountType === "percentage" ? `(${overallDiscountValue}%)` : "(flat)"}:{" "}
              -{formatCurrency(discountAmount)}
            </p>
            <p className="text-navy-600">Taxable Amount: {formatCurrency(taxableAmount)}</p>
          </>
        )}

        {gstEnabled && (
          <>
            <p className="text-navy-600">CGST ({halfRate}%): {formatCurrency(cgst)}</p>
            <p className="text-navy-600">SGST ({halfRate}%): {formatCurrency(sgst)}</p>
          </>
        )}

        <p className="font-bold text-base text-navy-900">Total: {formatCurrency(total)}</p>
      </div>
    </div>
  );
}
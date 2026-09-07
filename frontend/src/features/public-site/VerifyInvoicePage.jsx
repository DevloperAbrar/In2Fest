import React from "react";
import { useParams } from "react-router-dom";
import { useFetch } from "../../hooks/useFetch";
import { CheckCircle2, XCircle, Loader2 } from "lucide-react";
import { formatCurrency } from "../../lib/formatters";

export default function VerifyInvoicePage() {
  const { invoiceId } = useParams();
  const { data, loading, error } = useFetch(
    invoiceId ? `/public/invoices/${invoiceId}/verify` : null,
    { skip: !invoiceId }
  );

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-md">
        {loading && (
          <div className="bg-white rounded-2xl border border-gray-100 p-10 flex flex-col items-center text-center">
            <Loader2 size={36} className="text-primary-600 animate-spin mb-3" />
            <p className="text-sm text-gray-500">Verifying invoice…</p>
          </div>
        )}

        {!loading && (error || !data) && (
          <div className="bg-white rounded-2xl border border-red-100 p-10 flex flex-col items-center text-center">
            <XCircle size={48} className="text-red-500 mb-4" />
            <h2 className="text-lg font-semibold text-gray-800 mb-1">Invoice Not Found</h2>
            <p className="text-sm text-gray-500">
              We couldn't verify this document. It may be invalid or no longer exists.
            </p>
          </div>
        )}

        {!loading && data && (
          <div className="bg-white rounded-2xl border border-green-100 overflow-hidden">
            <div className="bg-green-50 p-8 flex flex-col items-center text-center border-b border-green-100">
              <CheckCircle2 size={48} className="text-green-600 mb-3" />
              <h2 className="text-lg font-semibold text-green-800">Verified Authentic Document</h2>
              <p className="text-xs text-green-600 mt-1">
                This {data.type === "quotation" ? "quotation" : "invoice"} was issued through In2Fest
              </p>
            </div>

            <div className="p-6 space-y-3 text-sm">
              <Row label="Invoice #" value={data.invoice_number} />
              <Row label="Venue" value={data.venue_name} />
              {data.venue_city && <Row label="City" value={data.venue_city} />}
              {data.client_first_name && <Row label="Billed To" value={`${data.client_first_name}…`} />}
              <Row label="Amount" value={formatCurrency(data.total)} bold />
              <Row
                label="Status"
                value={<span className="capitalize">{data.status}</span>}
              />
              <Row
                label="Issued On"
                value={data.created_at ? new Date(data.created_at).toLocaleDateString("en-IN") : " -"}
              />
              {data.gst_enabled && (
                <p className="text-xs text-gray-400 pt-2 border-t border-gray-100 mt-2">
                  GST-compliant tax invoice
                </p>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

function Row({ label, value, bold }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-gray-400">{label}</span>
      <span className={bold ? "font-semibold text-gray-800" : "text-gray-700"}>{value}</span>
    </div>
  );
}
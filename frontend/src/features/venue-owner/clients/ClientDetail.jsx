import React from "react";
import { useParams } from "react-router-dom";
import DashboardLayout from "../../../components/layout/DashboardLayout.jsx";
import { ownerSidebarItems } from "../ownerSidebarItems.js";
import { useVenue } from "../../../context/VenueContext.jsx";
import { useFetch } from "../../../hooks/useFetch";
import Card from "../../../components/common/Card";
import Loader from "../../../components/common/Loader";
import PaymentLedger from "./PaymentLedger.jsx";
import { formatCurrency, formatDate } from "../../../lib/formatters";
import Badge from "../../../components/common/Badge";

export default function ClientDetail() {
  const { id } = useParams();
  const { venue } = useVenue();
  const { data: client, loading } = useFetch(venue ? `/venues/${venue.id}/clients/${id}` : null, { skip: !venue });

  if (loading || !client) return <Loader fullScreen />;

  return (
    <DashboardLayout sidebarItems={ownerSidebarItems} pageTitle={client.name}>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card title="Client Info">
          <p className="text-sm mb-1">Phone: {client.phone}</p>
          <p className="text-sm mb-1">Email: {client.email || "-"}</p>
          <p className="text-sm mb-1">Total Business: {formatCurrency(client.total_business_value)}</p>
          <p className="text-sm text-red-600">Pending Balance: {formatCurrency(client.pending_balance)}</p>
        </Card>

        <Card className="lg:col-span-2" title="Event History">
          {(client.bookings || []).length === 0 ? (
            <p className="text-sm text-gray-400">No bookings yet.</p>
          ) : (
            <ul className="space-y-2">
              {client.bookings.map((b) => (
                <li key={b.id} className="flex justify-between text-sm border-b border-gray-50 pb-2">
                  <span>{formatDate(b.event_date)}  - {b.event_type}</span>
                  <Badge status={b.status} />
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card className="lg:col-span-3" title="Payment Ledger">
          <PaymentLedger bookings={client.bookings || []} />
        </Card>
      </div>
    </DashboardLayout>
  );
}
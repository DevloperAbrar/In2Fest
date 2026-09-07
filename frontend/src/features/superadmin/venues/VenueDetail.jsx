import React from "react";
import { useParams } from "react-router-dom";
import DashboardLayout from "../../../components/layout/DashboardLayout.jsx";
import { adminSidebarItems } from "../adminSidebarItems.js";
import { useFetch } from "../../../hooks/useFetch";
import Card from "../../../components/common/Card";
import Badge from "../../../components/common/Badge";
import Loader from "../../../components/common/Loader";
import VenueActions from "./VenueActions.jsx";
import { formatDate, formatCurrency } from "../../../lib/formatters";
import { BASE_DOMAIN } from "../../../lib/constants";

const FIELD_LABELS = {
  business_category: "Business category",
  long_description: "About (150+ words)",
  specialty_tagline: "Specialty tagline",
  primary_locality: "Primary locality",
  whatsapp_number: "WhatsApp number",
  starting_price: "Starting price",
  cancellation_policy: "Cancellation policy",
  marketplace_services: "Services list",
  video_intro_url: "Video introduction link"
};

export default function VenueDetail() {
  const { id } = useParams();
  const { data: venue, loading, refetch } = useFetch(`/venues/${id}`);

  if (loading) return <Loader fullScreen />;
  if (!venue) return null;

  const completion = venue.marketplace_completion;

  return (
    <DashboardLayout sidebarItems={adminSidebarItems} pageTitle={venue.hall_name}>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="lg:col-span-2" title="Venue Details">
          <dl className="grid grid-cols-2 gap-4 text-sm">
            <div><dt className="text-gray-400">Owner</dt><dd>{venue.owner_name}</dd></div>
            <div><dt className="text-gray-400">Phone</dt><dd>{venue.phone}</dd></div>
            <div><dt className="text-gray-400">Email</dt><dd>{venue.owner?.email || "-"}</dd></div>
            <div><dt className="text-gray-400">City</dt><dd>{venue.city}</dd></div>
            <div><dt className="text-gray-400">Capacity</dt><dd>{venue.capacity}</dd></div>
            <div><dt className="text-gray-400">Subdomain</dt><dd>{venue.subdomain}.{BASE_DOMAIN}</dd></div>
            <div><dt className="text-gray-400">Live</dt><dd>{venue.is_live ? "Yes" : "No"}</dd></div>
          </dl>
        </Card>

        <Card title="Subscription">
          <p className="text-sm mb-1">Plan: <strong>{venue.subscription?.plan?.name || "-"}</strong></p>
          <p className="text-sm mb-1">Locked Price: {formatCurrency(venue.subscription?.locked_price)}</p>
          <p className="text-sm mb-2">Status: <Badge status={venue.subscription?.status} /></p>
          <p className="text-xs text-gray-400">Renews: {formatDate(venue.subscription?.current_period_end)}</p>
        </Card>
      </div>

      <div className="mt-6">
        <Card title="Marketplace Listing">
          <div className="flex items-center gap-3 mb-3">
            <Badge status={venue.marketplace_listed ? "listed" : "not_listed"}>
              {venue.marketplace_listed ? "Listed on Marketplace" : "Not Listed on Marketplace"}
            </Badge>
            {completion && (
              <span className="text-sm text-gray-500">{completion.percentage}% profile complete</span>
            )}
          </div>

          {completion && completion.missing_fields.length > 0 && (
            <div>
              <p className="text-sm text-gray-500 mb-2">Missing before this venue can go live:</p>
              <ul className="flex flex-wrap gap-2">
                {completion.missing_fields.map((field) => (
                  <li key={field} className="text-xs bg-red-50 text-red-600 px-2.5 py-1 rounded-full">
                    {FIELD_LABELS[field] || field}
                  </li>
                ))}
              </ul>
            </div>
          )}

          {completion && completion.missing_fields.length === 0 && !venue.marketplace_listed && (
            <p className="text-sm text-gray-500">
              Profile is complete but not yet marked listed  - ask the owner to re-save any field on the
              Marketplace Profile page to trigger the listing flag.
            </p>
          )}
        </Card>
      </div>

      <div className="mt-6">
        <VenueActions venue={venue} onUpdated={refetch} />
      </div>
    </DashboardLayout>
  );
}
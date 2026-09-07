import React from "react";
import DashboardLayout from "../../../components/layout/DashboardLayout.jsx";
import { ownerSidebarItems } from "../ownerSidebarItems.js";
import { useVenue } from "../../../context/VenueContext.jsx";
import Card from "../../../components/common/Card";

export default function ContactEditor() {
  const { venue } = useVenue();

  return (
    <DashboardLayout sidebarItems={ownerSidebarItems} pageTitle="Contact Section">
      <Card title="Contact info (auto-filled from venue details)">
        <p className="text-sm text-gray-600 mb-2">Phone: {venue?.phone}</p>
        <p className="text-sm text-gray-600 mb-2">Address: {venue?.address}</p>
        <p className="text-sm text-gray-600 mb-4">
          Google Maps: {venue?.google_maps_link ? <a href={venue.google_maps_link} className="text-primary-600 underline" target="_blank" rel="noreferrer">View Map</a> : "Not set"}
        </p>
        <p className="text-xs text-gray-400">
          To update these, edit your venue profile under Settings → Venue Profile.
        </p>
      </Card>
    </DashboardLayout>
  );
}
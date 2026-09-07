import React, { useState } from "react";
import DashboardLayout from "../../../components/layout/DashboardLayout.jsx";
import { ownerSidebarItems } from "../ownerSidebarItems.js";
import { useVenue } from "../../../context/VenueContext.jsx";
import { useFetch } from "../../../hooks/useFetch";
import Select from "../../../components/common/Select";
import Badge from "../../../components/common/Badge";
import Loader from "../../../components/common/Loader";
import EmptyState from "../../../components/common/EmptyState";
import { formatDate } from "../../../lib/formatters";
import { INQUIRY_STATUSES } from "../../../lib/constants";
import InquiryDetailModal from "./InquiryDetailModal.jsx";
import { Eye, Phone, CalendarDays, PartyPopper } from "lucide-react";

export default function InquiryList() {
  const { venue } = useVenue();
  const [statusFilter, setStatusFilter] = useState("");
  const [selectedInquiryId, setSelectedInquiryId] = useState(null);

  const url = venue ? `/venues/${venue.id}/inquiries${statusFilter ? `?status=${statusFilter}` : ""}` : null;
  const { data: inquiries, loading, refetch } = useFetch(url, { skip: !venue, deps: [statusFilter] });

  return (
    <DashboardLayout sidebarItems={ownerSidebarItems} pageTitle="Inquiries">
      <div className="mb-4 max-w-xs">
        <Select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          options={[{ value: "", label: "All Statuses" }, ...INQUIRY_STATUSES.map((s) => ({ value: s, label: s.replace(/_/g, " ") }))]}
        />
      </div>

      {loading ? (
        <Loader />
      ) : !inquiries || inquiries.length === 0 ? (
        <EmptyState title="No inquiries yet" description="New inquiries from your public website will appear here." />
      ) : (
        <>
          {/* Mobile: tappable cards */}
          <div className="md:hidden space-y-3">
            {inquiries.map((inq) => (
              <button
                key={inq.id}
                onClick={() => setSelectedInquiryId(inq.id)}
                className="tap-scale w-full text-left bg-white rounded-2xl shadow-card border border-navy-100/60 p-4"
              >
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-semibold text-navy-900 truncate">{inq.customer_name}</p>
                    <p className="flex items-center gap-1 text-xs text-navy-400 mt-0.5">
                      <Phone size={11} /> {inq.phone}
                    </p>
                  </div>
                  <Badge status={inq.status} />
                </div>

                <div className="flex flex-wrap gap-2 mt-3">
                  <span className="flex items-center gap-1.5 text-xs text-navy-500 bg-paper rounded-lg px-2.5 py-1.5">
                    <CalendarDays size={13} /> {formatDate(inq.event_date)}
                  </span>
                  {inq.event_type && (
                    <span className="flex items-center gap-1.5 text-xs text-navy-500 bg-paper rounded-lg px-2.5 py-1.5">
                      <PartyPopper size={13} /> {inq.event_type}
                    </span>
                  )}
                </div>

                <p className="text-[11px] text-navy-400 mt-3 pt-3 border-t border-navy-100/60">
                  Received {formatDate(inq.created_at)}
                </p>
              </button>
            ))}
          </div>

          {/* Desktop: table */}
          <div className="hidden md:block bg-white rounded-2xl shadow-card border border-navy-100/60 overflow-x-auto">
            <table className="w-full text-sm min-w-[680px]">
              <thead className="bg-paper text-navy-400 text-left">
                <tr>
                  <th className="px-4 py-3 font-medium">Customer</th>
                  <th className="px-4 py-3 font-medium">Event Date</th>
                  <th className="px-4 py-3 font-medium">Event Type</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium">Received</th>
                  <th className="px-4 py-3 font-medium text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {inquiries.map((inq) => (
                  <tr key={inq.id} className="border-t border-navy-100/60 hover:bg-paper">
                    <td className="px-4 py-3">
                      <button
                        onClick={() => setSelectedInquiryId(inq.id)}
                        className="font-medium text-primary-600 hover:underline text-left"
                      >
                        {inq.customer_name}
                      </button>
                      <p className="text-xs text-navy-400">{inq.phone}</p>
                    </td>
                    <td className="px-4 py-3 text-navy-600">{formatDate(inq.event_date)}</td>
                    <td className="px-4 py-3 text-navy-600">{inq.event_type}</td>
                    <td className="px-4 py-3"><Badge status={inq.status} /></td>
                    <td className="px-4 py-3 text-navy-400">{formatDate(inq.created_at)}</td>
                    <td className="px-4 py-3 text-right">
                      <button
                        onClick={() => setSelectedInquiryId(inq.id)}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-navy-200 text-navy-600 hover:bg-paper hover:text-primary-600 text-xs font-medium"
                      >
                        <Eye size={14} /> View
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      <InquiryDetailModal
        inquiryId={selectedInquiryId}
        isOpen={!!selectedInquiryId}
        onClose={() => setSelectedInquiryId(null)}
        onUpdated={refetch}
      />
    </DashboardLayout>
  );
}
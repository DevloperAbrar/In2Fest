import React, { useState } from "react";
import { Link } from "react-router-dom";
import DashboardLayout from "../../../components/layout/DashboardLayout.jsx";
import { ownerSidebarItems } from "../ownerSidebarItems.js";
import { useVenue } from "../../../context/VenueContext.jsx";
import { useFetch } from "../../../hooks/useFetch";
import { bookingService } from "../../../services/bookingService";
import Badge from "../../../components/common/Badge";
import Loader from "../../../components/common/Loader";
import EmptyState from "../../../components/common/EmptyState";
import ConfirmDialog from "../../../components/common/ConfirmDialog";
import BookingDetail from "./BookingDetail.jsx";
import { formatCurrency, formatDate } from "../../../lib/formatters";
import { showSuccess, showError } from "../../../components/common/Toast";
import { CalendarDays, Trash2, CalendarClock } from "lucide-react";

export default function BookingListView() {
  const { venue } = useVenue();
  const { data: bookings, loading, refetch } = useFetch(venue ? `/venues/${venue.id}/bookings` : null, { skip: !venue });
  const { data: slots } = useFetch(venue ? `/venues/${venue.id}/slots` : null, { skip: !venue });
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [deletingBooking, setDeletingBooking] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const confirmDelete = async () => {
    setDeleting(true);
    try {
      await bookingService.delete(venue.id, deletingBooking.id);
      showSuccess("Booking deleted");
      setDeletingBooking(null);
      refetch();
    } catch (err) {
      showError(err.response?.data?.message || "Failed to delete booking");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <DashboardLayout sidebarItems={ownerSidebarItems} pageTitle="Bookings">
      <div className="flex justify-between md:justify-end items-center mb-4">
        <h2 className="font-display font-semibold text-navy-800 text-[15px] md:hidden">
          {bookings?.length || 0} booking{bookings?.length === 1 ? "" : "s"}
        </h2>
        <Link
          to="/dashboard/bookings/calendar"
          className="tap-scale flex items-center gap-1.5 text-sm font-medium text-primary-600 bg-primary-50 sm:bg-transparent px-3 py-2 sm:p-0 rounded-lg"
        >
          <CalendarDays size={16} /> Calendar View
        </Link>
      </div>

      {loading ? (
        <Loader />
      ) : !bookings || bookings.length === 0 ? (
        <EmptyState title="No bookings yet" />
      ) : (
        <>
          {/* Mobile: cards */}
          <div className="md:hidden space-y-3">
            {bookings.map((b) => (
              <div key={b.id} className="bg-white rounded-2xl shadow-card border border-navy-100/60 p-4">
                <button onClick={() => setSelectedBooking(b)} className="tap-scale w-full text-left">
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="font-semibold text-navy-900 truncate">{b.client?.name}</p>
                      <p className="flex items-center gap-1 text-xs text-navy-400 mt-0.5">
                        <CalendarClock size={11} /> {formatDate(b.event_date)} &middot; {b.slot?.name}
                      </p>
                    </div>
                    <Badge status={b.status} />
                  </div>

                  <div className="grid grid-cols-2 gap-3 mt-3 pt-3 border-t border-navy-100/60">
                    <div>
                      <p className="text-[11px] text-navy-400">Total</p>
                      <p className="font-semibold text-navy-900 text-sm">{formatCurrency(b.total_amount)}</p>
                    </div>
                    <div>
                      <p className="text-[11px] text-navy-400">Balance</p>
                      <p className="font-semibold text-primary-600 text-sm">{formatCurrency(b.balance_pending)}</p>
                    </div>
                  </div>
                </button>

                <div className="flex justify-end mt-2">
                  <button
                    onClick={() => setDeletingBooking(b)}
                    className="tap-scale w-9 h-9 flex items-center justify-center rounded-lg text-navy-400"
                    title="Delete booking"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              </div>
            ))}
          </div>

          {/* Desktop: table */}
          <div className="hidden md:block bg-white rounded-2xl shadow-card border border-navy-100/60 overflow-x-auto">
            <table className="w-full text-sm min-w-[760px]">
              <thead className="bg-paper text-navy-400 text-left">
                <tr>
                  <th className="px-4 py-3 font-medium">Client</th>
                  <th className="px-4 py-3 font-medium">Event Date</th>
                  <th className="px-4 py-3 font-medium">Slot</th>
                  <th className="px-4 py-3 font-medium">Total</th>
                  <th className="px-4 py-3 font-medium">Balance</th>
                  <th className="px-4 py-3 font-medium">Status</th>
                  <th className="px-4 py-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {bookings.map((b) => (
                  <tr key={b.id} className="border-t border-navy-100/60 hover:bg-paper">
                    <td className="px-4 py-3 font-medium text-navy-800 cursor-pointer" onClick={() => setSelectedBooking(b)}>
                      {b.client?.name}
                    </td>
                    <td className="px-4 py-3 text-navy-600 cursor-pointer" onClick={() => setSelectedBooking(b)}>
                      {formatDate(b.event_date)}
                    </td>
                    <td className="px-4 py-3 text-navy-600 cursor-pointer" onClick={() => setSelectedBooking(b)}>
                      {b.slot?.name}
                    </td>
                    <td className="px-4 py-3 text-navy-700 cursor-pointer" onClick={() => setSelectedBooking(b)}>
                      {formatCurrency(b.total_amount)}
                    </td>
                    <td className="px-4 py-3 text-primary-600 font-medium cursor-pointer" onClick={() => setSelectedBooking(b)}>
                      {formatCurrency(b.balance_pending)}
                    </td>
                    <td className="px-4 py-3 cursor-pointer" onClick={() => setSelectedBooking(b)}>
                      <Badge status={b.status} />
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end">
                        <button
                          onClick={() => setDeletingBooking(b)}
                          className="text-navy-400 hover:text-primary-600"
                          title="Delete booking"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      <BookingDetail
        booking={selectedBooking}
        venue={venue}
        slots={slots}
        venueId={venue?.id}
        isOpen={!!selectedBooking}
        onClose={() => setSelectedBooking(null)}
        onUpdated={() => { refetch(); setSelectedBooking(null); }}
      />

      <ConfirmDialog
        isOpen={!!deletingBooking}
        onClose={() => setDeletingBooking(null)}
        onConfirm={confirmDelete}
        loading={deleting}
        title="Delete Booking"
        message={`Delete the booking for "${deletingBooking?.client?.name}" on ${deletingBooking ? formatDate(deletingBooking.event_date) : ""}? This cannot be undone and will remove any recorded payments for this booking.`}
        confirmText="Delete"
      />
    </DashboardLayout>
  );
}
import React, { useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import DashboardLayout from "../../../components/layout/DashboardLayout.jsx";
import { ownerSidebarItems } from "../ownerSidebarItems.js";
import { useVenue } from "../../../context/VenueContext.jsx";
import { useFetch } from "../../../hooks/useFetch";
import { clientService } from "../../../services/clientService";
import Button from "../../../components/common/Button";
import Modal from "../../../components/common/Modal";
import Badge from "../../../components/common/Badge";
import Loader from "../../../components/common/Loader";
import EmptyState from "../../../components/common/EmptyState";
import ConfirmDialog from "../../../components/common/ConfirmDialog";
import BookingDetail from "../bookings/BookingDetail.jsx";
import { formatCurrency, formatDateRange, formatTimeRange } from "../../../lib/formatters";
import { showSuccess, showError } from "../../../components/common/Toast";
import { Plus, Pencil, Trash2, Phone, CalendarDays, Package } from "lucide-react";

const pad = (n) => String(n).padStart(2, "0");

function todayYMD() {
  const d = new Date();
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

const dateOf = (b) => b.date_from || b.event_date || "";
const serviceNames = (b) => (b?.booking_items || []).map((i) => i.name).filter(Boolean);

export default function ClientList() {
  const navigate = useNavigate();
  const { venue } = useVenue();
  const { data: clients, loading, refetch } = useFetch(
    venue ? `/venues/${venue.id}/clients` : null,
    { skip: !venue }
  );
  const { data: bookings, loading: bookingsLoading, refetch: refetchBookings } = useFetch(
    venue ? `/venues/${venue.id}/bookings` : null,
    { skip: !venue }
  );

  const [pickClient, setPickClient] = useState(null); // client whose bookings we are choosing from
  const [editBooking, setEditBooking] = useState(null); // booking opened in edit mode
  const [deletingClient, setDeletingClient] = useState(null);
  const [deleting, setDeleting] = useState(false);

  // Booking-based summary for every client:
  // next upcoming booking (else the latest one), plus totals.
  const summaries = useMemo(() => {
    const today = todayYMD();
    const byClient = {};
    (bookings || []).forEach((b) => {
      if (!byClient[b.client_id]) byClient[b.client_id] = [];
      byClient[b.client_id].push(b);
    });

    const result = {};
    Object.entries(byClient).forEach(([clientId, list]) => {
      const active = list.filter((b) => b.status !== "cancelled");
      const source = active.length ? active : list;

      const upcoming = source
        .filter((b) => dateOf(b) >= today)
        .sort((a, b) => dateOf(a).localeCompare(dateOf(b)));
      const past = source
        .filter((b) => dateOf(b) < today)
        .sort((a, b) => dateOf(b).localeCompare(dateOf(a)));
      const focus = upcoming[0] || past[0] || null;

      const total = active.reduce((sum, b) => sum + Number(b.total_amount || 0), 0);
      const received = active.reduce((sum, b) => sum + Number(b.amount_received || 0), 0);

      result[clientId] = {
        bookings: list,
        count: list.length,
        focus,
        services: serviceNames(focus),
        total,
        pending: Math.max(0, total - received),
      };
    });
    return result;
  }, [bookings]);

  // A client is created automatically when a booking is made, so "Add Client"
  // takes the owner straight to the new-booking form.
  const goToNewBooking = () => navigate("/dashboard/bookings/calendar?new=1");

  // Editing a client = editing their booking (same form as the booking edit).
  const openEdit = (client) => {
    const list = summaries[client.id]?.bookings || [];
    if (list.length === 0) return showError("No booking found for this client");
    if (list.length === 1) return setEditBooking(list[0]);
    setPickClient(client);
  };

  const confirmDelete = async () => {
    setDeleting(true);
    try {
      await clientService.delete(venue.id, deletingClient.id);
      showSuccess("Client deleted");
      setDeletingClient(null);
      refetch();
      refetchBookings();
    } catch (err) {
      showError(err.response?.data?.message || "Failed to delete client");
    } finally {
      setDeleting(false);
    }
  };

  return (
    <DashboardLayout sidebarItems={ownerSidebarItems} pageTitle="Clients">
      <div className="flex justify-between md:justify-end items-center mb-4">
        <h2 className="font-display font-semibold text-navy-800 text-[15px] md:hidden">
          {clients?.length || 0} client{clients?.length === 1 ? "" : "s"}
        </h2>
        <Button onClick={goToNewBooking}><Plus size={16} /> Add Client</Button>
      </div>

      {loading || bookingsLoading ? (
        <Loader />
      ) : !clients || clients.length === 0 ? (
        <EmptyState
          title="No clients yet"
          description="Clients are added automatically when you create a booking."
          action={<Button onClick={goToNewBooking}><Plus size={16} /> Create Booking</Button>}
        />
      ) : (
        <>
          {/* Mobile: cards */}
          <div className="md:hidden space-y-3">
            {clients.map((c) => {
              const s = summaries[c.id];
              return (
                <div key={c.id} className="bg-white rounded-2xl shadow-card border border-navy-100/60 p-4">
                  <div className="flex items-start justify-between gap-3">
                    <Link to={`/dashboard/clients/${c.id}`} className="min-w-0">
                      <p className="font-semibold text-navy-900 truncate">{c.name}</p>
                      <p className="flex items-center gap-1 text-xs text-navy-400 mt-0.5">
                        <Phone size={11} /> {c.phone}
                      </p>
                    </Link>
                    <div className="flex items-center gap-1 shrink-0">
                      <button onClick={() => openEdit(c)} className="tap-scale w-8 h-8 flex items-center justify-center rounded-lg text-navy-400" title="Edit booking">
                        <Pencil size={15} />
                      </button>
                      <button onClick={() => setDeletingClient(c)} className="tap-scale w-8 h-8 flex items-center justify-center rounded-lg text-navy-400" title="Delete client">
                        <Trash2 size={15} />
                      </button>
                    </div>
                  </div>

                  {s?.focus && (
                    <div className="mt-3 space-y-1.5 text-xs text-navy-500">
                      <p className="flex items-center gap-1.5">
                        <CalendarDays size={12} className="shrink-0" />
                        {formatDateRange(dateOf(s.focus), s.focus.date_to)} · {formatTimeRange(s.focus.start_time, s.focus.end_time)}
                      </p>
                      {s.services.length > 0 && (
                        <p className="flex items-center gap-1.5">
                          <Package size={12} className="shrink-0" /> {s.services.join(", ")}
                        </p>
                      )}
                    </div>
                  )}

                  <div className="grid grid-cols-3 gap-3 mt-3 pt-3 border-t border-navy-100/60">
                    <div>
                      <p className="text-[11px] text-navy-400">Bookings</p>
                      <p className="font-semibold text-navy-900 text-sm">{s?.count || 0}</p>
                    </div>
                    <div>
                      <p className="text-[11px] text-navy-400">Total Business</p>
                      <p className="font-semibold text-navy-900 text-sm">{formatCurrency(s?.total)}</p>
                    </div>
                    <div>
                      <p className="text-[11px] text-navy-400">Pending</p>
                      <p className="font-semibold text-primary-600 text-sm">{formatCurrency(s?.pending)}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Desktop: full table */}
          <div className="hidden md:block bg-white rounded-2xl shadow-card border border-navy-100/60 overflow-x-auto">
            <table className="w-full text-sm min-w-[1000px]">
              <thead className="bg-paper text-navy-400 text-left">
                <tr>
                  <th className="px-4 py-3 font-medium">Name</th>
                  <th className="px-4 py-3 font-medium">Phone</th>
                  <th className="px-4 py-3 font-medium">Email</th>
                  <th className="px-4 py-3 font-medium">Event Date</th>
                  <th className="px-4 py-3 font-medium">Time</th>
                  <th className="px-4 py-3 font-medium">Slots / Packages</th>
                  <th className="px-4 py-3 font-medium">Bookings</th>
                  <th className="px-4 py-3 font-medium">Total Business</th>
                  <th className="px-4 py-3 font-medium">Pending Balance</th>
                  <th className="px-4 py-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {clients.map((c) => {
                  const s = summaries[c.id];
                  return (
                    <tr key={c.id} className="border-t border-navy-100/60 hover:bg-paper">
                      <td className="px-4 py-3">
                        <Link to={`/dashboard/clients/${c.id}`} className="font-medium text-primary-600">{c.name}</Link>
                      </td>
                      <td className="px-4 py-3 text-navy-600">{c.phone}</td>
                      <td className="px-4 py-3 text-navy-400">{c.email || "-"}</td>
                      <td className="px-4 py-3 text-navy-600">
                        {s?.focus ? formatDateRange(dateOf(s.focus), s.focus.date_to) : "-"}
                      </td>
                      <td className="px-4 py-3 text-navy-400 whitespace-nowrap">
                        {s?.focus ? formatTimeRange(s.focus.start_time, s.focus.end_time) : "-"}
                      </td>
                      <td className="px-4 py-3 text-navy-600 max-w-[220px]">
                        {s?.services.length ? (
                          <span className="block truncate" title={s.services.join(", ")}>
                            {s.services.join(", ")}
                          </span>
                        ) : (
                          "-"
                        )}
                      </td>
                      <td className="px-4 py-3 text-navy-600">{s?.count || 0}</td>
                      <td className="px-4 py-3 text-navy-700">{formatCurrency(s?.total)}</td>
                      <td className="px-4 py-3 text-primary-600 font-medium">{formatCurrency(s?.pending)}</td>
                      <td className="px-4 py-3">
                        <div className="flex justify-end gap-3">
                          <button
                            onClick={() => openEdit(c)}
                            className="text-navy-400 hover:text-primary-600"
                            title="Edit booking"
                          >
                            <Pencil size={16} />
                          </button>
                          <button
                            onClick={() => setDeletingClient(c)}
                            className="text-navy-400 hover:text-primary-600"
                            title="Delete client"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* Client has several bookings: choose which one to edit */}
      <Modal
        isOpen={!!pickClient}
        onClose={() => setPickClient(null)}
        title={`Bookings - ${pickClient?.name || ""}`}
        size="lg"
      >
        <p className="text-sm text-navy-400 mb-3">Select the booking you want to edit.</p>
        <div className="space-y-2">
          {(summaries[pickClient?.id]?.bookings || []).map((b) => (
            <button
              key={b.id}
              type="button"
              onClick={() => {
                setEditBooking(b);
                setPickClient(null);
              }}
              className="w-full text-left flex items-center justify-between gap-3 rounded-xl border border-navy-100/60 hover:border-primary-200 hover:bg-paper px-4 py-3 transition-colors"
            >
              <div className="min-w-0">
                <p className="text-sm font-medium text-navy-800">
                  {formatDateRange(dateOf(b), b.date_to)} · {formatTimeRange(b.start_time, b.end_time)}
                </p>
                <p className="text-xs text-navy-400 truncate">
                  {serviceNames(b).join(", ") || "-"} · {formatCurrency(b.total_amount)}
                </p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <Badge status={b.status} />
                <Pencil size={14} className="text-navy-400" />
              </div>
            </button>
          ))}
        </div>
      </Modal>

      {/* Same booking edit form used on the Bookings page */}
      <BookingDetail
        booking={editBooking}
        venue={venue}
        venueId={venue?.id}
        startEditing
        isOpen={!!editBooking}
        onClose={() => setEditBooking(null)}
        onUpdated={() => {
          refetch();
          refetchBookings();
          setEditBooking(null);
        }}
      />

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={!!deletingClient}
        onClose={() => setDeletingClient(null)}
        onConfirm={confirmDelete}
        loading={deleting}
        title="Delete Client"
        message={`Are you sure you want to delete "${deletingClient?.name}"? This cannot be undone. Clients with existing bookings cannot be deleted.`}
        confirmLabel="Delete"
      />
    </DashboardLayout>
  );
}
import React, { useState, useMemo, useEffect } from "react";
import { useSearchParams } from "react-router-dom";
import { Calendar, dayjsLocalizer, Views } from "react-big-calendar";
import dayjs from "dayjs";
import "react-big-calendar/lib/css/react-big-calendar.css";
import DashboardLayout from "../../../components/layout/DashboardLayout.jsx";
import { ownerSidebarItems } from "../ownerSidebarItems.js";
import { useVenue } from "../../../context/VenueContext.jsx";
import { useFetch } from "../../../hooks/useFetch";
import Loader from "../../../components/common/Loader";
import BookingDetail from "./BookingDetail.jsx";
import QuickBookingModal from "./QuickBookingModal.jsx";
import { Plus } from "lucide-react";

const localizer = dayjsLocalizer(dayjs);

const STATUS_COLORS = {
  confirmed:   "#c81322",
  in_progress: "#f59e0b",
  completed:   "#10b981",
  cancelled:   "#94a3b8"
};

export default function BookingCalendarView() {
  const { venue } = useVenue();
  const { data: bookings, loading, refetch } = useFetch(
    venue ? `/venues/${venue.id}/bookings` : null, { skip: !venue }
  );

  const [selectedBooking, setSelectedBooking] = useState(null);
  const [quickBookDate, setQuickBookDate]     = useState(null);
  const [currentView, setCurrentView]         = useState(Views.MONTH);
  const [currentDate, setCurrentDate]         = useState(new Date());
    // Opened from Clients -> "Add Client": jump straight into the new-booking form
    const [searchParams, setSearchParams] = useSearchParams();
    useEffect(() => {
      if (searchParams.get("new") === "1") {
        setQuickBookDate(new Date());
        setSearchParams({}, { replace: true });
      }
    }, [searchParams, setSearchParams]);

  const events = useMemo(() => (bookings || []).map(b => {
    const dateStr = b.date_from || b.event_date;
    const start = dateStr && b.start_time
      ? dayjs(`${dateStr}T${b.start_time}`).toDate()
      : new Date(dateStr || Date.now());
    const end = dateStr && b.end_time
      ? dayjs(`${dateStr}T${b.end_time}`).toDate()
      : new Date(dateStr || Date.now());

    // Build title from booking_items or fallback
    const itemNames = (b.booking_items || []).map(i => i.name).join(" + ");
    const title = `${b.client?.name || "?"} — ${itemNames || b.slot?.name || "Booking"}`;

    return {
      id: b.id, title, start, end,
      allDay: !b.start_time,
      resource: b,
      status: b.status
    };
  }), [bookings]);

  const openBookingForm = (date) => setQuickBookDate(date);

  if (loading) return <Loader fullScreen />;

  return (
    <DashboardLayout sidebarItems={ownerSidebarItems} pageTitle="Booking Calendar">
      <div className="flex items-center justify-between mb-4">
        <p className="text-sm text-gray-500">Tap any date to create a booking, or tap an event to view details.</p>
        <button onClick={() => openBookingForm(new Date())}
          className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white text-sm font-medium rounded-xl hover:bg-primary-700 transition-colors">
          <Plus size={15} /> New Booking
        </button>
      </div>

      {/* Legend */}
      <div className="flex gap-4 mb-4 flex-wrap">
        {Object.entries(STATUS_COLORS).map(([status, color]) => (
          <div key={status} className="flex items-center gap-1.5">
            <span style={{ backgroundColor: color }} className="w-3 h-3 rounded-full inline-block" />
            <span className="text-xs text-gray-500 capitalize">{status.replace("_", " ")}</span>
          </div>
        ))}
      </div>

      <div className="venue-calendar bg-white rounded-2xl shadow-sm border border-gray-100 p-3 sm:p-4">
        <Calendar
          localizer={localizer}
          events={events}
          startAccessor="start"
          endAccessor="end"
          selectable
          views={[Views.MONTH, Views.WEEK, Views.DAY, Views.AGENDA]}
          view={currentView}
          onView={setCurrentView}
          date={currentDate}
          onNavigate={setCurrentDate}
          onSelectEvent={event => setSelectedBooking(event.resource)}
          onSelectSlot={slotInfo => openBookingForm(slotInfo.start)}
          onDrillDown={date => { setCurrentDate(date); setCurrentView(Views.DAY); }}
          eventPropGetter={event => ({
            style: {
              backgroundColor: STATUS_COLORS[event.status] || STATUS_COLORS.confirmed,
              borderColor: STATUS_COLORS[event.status] || STATUS_COLORS.confirmed,
              borderRadius: "8px",
              fontSize: "12px",
              padding: "2px 6px"
            }
          })}
          scrollToTime={dayjs().hour(6).minute(0).toDate()}
        />
      </div>

      <style>{`
        .venue-calendar .rbc-calendar { height: 62vh; min-height: 420px; }
        @media (min-width: 640px) { .venue-calendar .rbc-calendar { height: 650px; } }
        .venue-calendar .rbc-toolbar { flex-wrap: wrap; gap: 8px; margin-bottom: 12px; }
        .venue-calendar .rbc-toolbar-label { font-weight: 600; color: #12172a; order: -1; flex-basis: 100%; text-align: center; }
        .venue-calendar .rbc-btn-group { flex: 1; display: flex; }
        .venue-calendar .rbc-btn-group button { flex: 1; font-size: 12.5px; padding: 7px 8px; border-color: #e3e5ec; color: #454d6c; }
        .venue-calendar .rbc-btn-group button.rbc-active { background-color: #c81322; border-color: #c81322; color: #fff; }
        .venue-calendar .rbc-today { background-color: #fdecec; }
        .venue-calendar .rbc-off-range-bg { background-color: #faf9fc; }
        .venue-calendar .rbc-event { line-height: 1.25; }
        .venue-calendar .rbc-event-content { overflow: hidden; text-overflow: ellipsis; }
        .venue-calendar .rbc-show-more {
          color: #c81322; font-weight: 700; font-size: 11px;
          background: #fdecec; border-radius: 6px; padding: 1px 6px; margin-top: 2px;
        }
        .venue-calendar .rbc-show-more:hover { background: #fbdadb; text-decoration: none; }
      `}</style>

      <BookingDetail
        booking={selectedBooking} venue={venue} venueId={venue?.id}
        isOpen={!!selectedBooking}
        onClose={() => setSelectedBooking(null)}
        onUpdated={() => { refetch(); setSelectedBooking(null); }}
      />

      <QuickBookingModal
        isOpen={!!quickBookDate} onClose={() => setQuickBookDate(null)}
        venue={venue} selectedDate={quickBookDate}
        onCreated={() => { refetch(); setQuickBookDate(null); }}
      />
    </DashboardLayout>
  );
}
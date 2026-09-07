import React, { useState, useMemo } from "react";
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

const localizer = dayjsLocalizer(dayjs);

function combineDateAndTime(dateStr, timeStr) {
  if (!dateStr || !timeStr) return null;
  const [h, m, s] = timeStr.split(":").map(Number);
  return dayjs(dateStr)
    .hour(h || 0)
    .minute(m || 0)
    .second(s || 0)
    .toDate();
}

export default function BookingCalendarView() {
  const { venue } = useVenue();
  const { data: bookings, loading, refetch } = useFetch(venue ? `/venues/${venue.id}/bookings` : null, { skip: !venue });
  const { data: slots } = useFetch(venue ? `/venues/${venue.id}/slots` : null, { skip: !venue });
  const [selectedBooking, setSelectedBooking] = useState(null);
  const [quickBookDate, setQuickBookDate] = useState(null);

  const [currentView, setCurrentView] = useState(Views.MONTH);
  const [currentDate, setCurrentDate] = useState(new Date());

  const events = useMemo(
    () =>
      (bookings || []).map((b) => {
        const start = combineDateAndTime(b.event_date, b.slot?.start_time) || new Date(b.event_date);
        const end = combineDateAndTime(b.event_date, b.slot?.end_time) || new Date(b.event_date);

        return {
          id: b.id,
          title: `${b.client?.name}  - ${b.slot?.name}`,
          start,
          end,
          allDay: !b.slot?.start_time || !b.slot?.end_time,
          resource: b
        };
      }),
    [bookings]
  );

  // Opens the "Mark as Booked" form for a date. Wired to BOTH onSelectSlot
  // (drag/empty-area select) and onDrillDown (a plain tap on the date number),
  // because on touch screens almost every tap on a Month-view cell lands on
  // the date number - which by default just navigates into an empty Day view
  // with no way to book. Routing both here fixes that dead-end.
  const openBookingForm = (date) => setQuickBookDate(date);

  if (loading) return <Loader fullScreen />;

  return (
    <DashboardLayout sidebarItems={ownerSidebarItems} pageTitle="Booking Calendar">
      <p className="text-sm text-navy-400 mb-3">
        Tap any date to mark it as booked, or tap an existing booking to view details.
      </p>

      <div className="venue-calendar bg-white rounded-2xl shadow-card border border-navy-100/60 p-2.5 sm:p-4">
        <Calendar
          localizer={localizer}
          events={events}
          startAccessor="start"
          endAccessor="end"
          selectable
          views={[Views.MONTH, Views.WEEK, Views.DAY, Views.AGENDA]}
          view={currentView}
          onView={(view) => setCurrentView(view)}
          date={currentDate}
          onNavigate={(date) => setCurrentDate(date)}
          onSelectEvent={(event) => setSelectedBooking(event.resource)}
          onSelectSlot={(slotInfo) => openBookingForm(slotInfo.start)}
          onDrillDown={(date) => openBookingForm(date)}
          eventPropGetter={() => ({ className: "venue-calendar-event" })}
          scrollToTime={dayjs().hour(6).minute(0).toDate()}
        />
      </div>

      {/* Scoped overrides: brand colors + bigger tap targets + a toolbar that
          wraps instead of overflowing on narrow phones. */}
      <style>{`
        .venue-calendar .rbc-calendar { height: 62vh; min-height: 420px; }
        @media (min-width: 640px) {
          .venue-calendar .rbc-calendar { height: 650px; }
        }
        .venue-calendar .rbc-toolbar {
          flex-wrap: wrap;
          gap: 8px;
          margin-bottom: 12px;
        }
        .venue-calendar .rbc-toolbar-label {
          font-family: 'Sora', 'Inter', sans-serif;
          font-weight: 600;
          color: #12172a;
          order: -1;
          flex-basis: 100%;
          text-align: center;
          margin-bottom: 4px;
        }
        .venue-calendar .rbc-btn-group { flex: 1; display: flex; }
        .venue-calendar .rbc-btn-group button {
          flex: 1;
          font-size: 12.5px;
          padding: 7px 8px;
          border-color: #e3e5ec;
          color: #454d6c;
        }
        .venue-calendar .rbc-btn-group button.rbc-active,
        .venue-calendar .rbc-btn-group button:active {
          background-color: #c81322;
          border-color: #c81322;
          color: #fff;
        }
        .venue-calendar .rbc-today { background-color: #fdecec; }
        .venue-calendar .rbc-off-range-bg { background-color: #faf9fc; }
        .venue-calendar .venue-calendar-event {
          background-color: #c81322;
          border-color: #9e0f1b;
        }
        @media (max-width: 640px) {
          .venue-calendar .rbc-toolbar-label { font-size: 14px; }
          .venue-calendar .rbc-header { padding: 4px 2px; font-size: 11px; }
          .venue-calendar .rbc-date-cell { font-size: 11px; padding: 2px 4px; }
          .venue-calendar .rbc-agenda-view table.rbc-agenda-table { font-size: 12px; }
        }
      `}</style>

      <BookingDetail
        booking={selectedBooking}
        venue={venue}
        slots={slots}
        venueId={venue?.id}
        isOpen={!!selectedBooking}
        onClose={() => setSelectedBooking(null)}
        onUpdated={() => { refetch(); setSelectedBooking(null); }}
      />

      <QuickBookingModal
        isOpen={!!quickBookDate}
        onClose={() => setQuickBookDate(null)}
        venue={venue}
        slots={slots}
        selectedDate={quickBookDate}
        onCreated={() => { refetch(); setQuickBookDate(null); }}
      />
    </DashboardLayout>
  );
}
import { useEffect } from "react";

const INQUIRY_DATE_EVENT = "venue:inquiry-date";

// Called by the availability calendar's "Send Inquiry for this date" button.
// Tells the enquiry form which date was picked, then scrolls to it.
export function requestInquiryForDate(date) {
  if (date) {
    window.dispatchEvent(new CustomEvent(INQUIRY_DATE_EVENT, { detail: { date } }));
  }
  const target = document.getElementById("contact");
  if (target) target.scrollIntoView({ behavior: "smooth", block: "start" });
}

// Used inside every ContactSection: fills the event_date field when the
// calendar sends a date.
export function useInquiryDatePrefill(setValue) {
  useEffect(() => {
    const handler = (e) => {
      const date = e.detail?.date;
      if (date) setValue("event_date", date, { shouldValidate: true });
    };
    window.addEventListener(INQUIRY_DATE_EVENT, handler);
    return () => window.removeEventListener(INQUIRY_DATE_EVENT, handler);
  }, [setValue]);
}
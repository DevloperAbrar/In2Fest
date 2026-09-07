import React from "react";
import Badge from "../../../components/common/Badge";
import Button from "../../../components/common/Button";

const NEXT_STATUS = {
  new: "contacted",
  contacted: "negotiating",
  negotiating: "advance_received",
  advance_received: "confirmed"
};

const NEXT_LABEL = {
  new: "Mark as Contacted",
  contacted: "Mark as Negotiating",
  negotiating: "Mark as Advance Received",
  advance_received: "Convert to Booking"
};

export default function InquiryStatusFlow({ inquiry, onAdvance, onMarkLost, onConvert }) {
  const nextStatus = NEXT_STATUS[inquiry.status];

  return (
    <div className="flex items-center gap-3">
      <Badge status={inquiry.status} />
      {nextStatus && (
        <Button
          variant="primary"
          onClick={() => (inquiry.status === "advance_received" ? onConvert() : onAdvance(nextStatus))}
        >
          {NEXT_LABEL[inquiry.status]}
        </Button>
      )}
      {!["confirmed", "completed", "cancelled", "lost"].includes(inquiry.status) && (
        <Button variant="outline" onClick={onMarkLost}>Mark Lost</Button>
      )}
    </div>
  );
}
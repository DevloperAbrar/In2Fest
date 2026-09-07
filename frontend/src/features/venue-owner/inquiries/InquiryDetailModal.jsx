import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useVenue } from "../../../context/VenueContext.jsx";
import { useFetch } from "../../../hooks/useFetch";
import { inquiryService } from "../../../services/inquiryService";
import { bookingService } from "../../../services/bookingService";
import Loader from "../../../components/common/Loader";
import Modal from "../../../components/common/Modal";
import Input from "../../../components/common/Input";
import Button from "../../../components/common/Button";
import InquiryStatusFlow from "./InquiryStatusFlow.jsx";
import { showSuccess, showError } from "../../../components/common/Toast";
import { formatDate, formatDateTime } from "../../../lib/formatters";
import { MessageCircle } from "lucide-react";

export default function InquiryDetailModal({ inquiryId, isOpen, onClose, onUpdated }) {
  const { venue } = useVenue();
  const navigate = useNavigate();

  const { data: inquiry, loading, refetch } = useFetch(
    venue && isOpen && inquiryId ? `/venues/${venue.id}/inquiries/${inquiryId}` : null,
    { skip: !venue || !isOpen || !inquiryId, deps: [inquiryId, isOpen] }
  );

  const [notes, setNotes] = useState("");
  const [convertModal, setConvertModal] = useState(false);
  const [totalAmount, setTotalAmount] = useState("");
  const [converting, setConverting] = useState(false);

  const refreshBoth = async () => {
    await refetch();
    onUpdated && onUpdated();
  };

  const handleAdvance = async (newStatus) => {
    try {
      await inquiryService.updateStatus(venue.id, inquiryId, newStatus);
      showSuccess("Status updated");
      refreshBoth();
    } catch {
      showError("Failed to update status");
    }
  };

  const handleMarkLost = async () => {
    try {
      await inquiryService.updateStatus(venue.id, inquiryId, "lost");
      showSuccess("Marked as lost");
      refreshBoth();
    } catch {
      showError("Failed to update status");
    }
  };

  const handleSaveNotes = async () => {
    try {
      await inquiryService.updateNotes(venue.id, inquiryId, notes);
      showSuccess("Notes saved");
    } catch {
      showError("Failed to save notes");
    }
  };

  const handleConvert = async () => {
    setConverting(true);
    try {
      await bookingService.convertFromInquiry(venue.id, inquiryId, { total_amount: totalAmount });
      showSuccess("Booking created!");
      setConvertModal(false);
      onClose();
      navigate("/dashboard/bookings");
    } catch (err) {
      showError(err.response?.data?.message || "Failed to convert to booking");
    } finally {
      setConverting(false);
    }
  };

  const whatsappLink = inquiry
    ? `https://wa.me/91${inquiry.phone}?text=${encodeURIComponent(`Hi ${inquiry.customer_name}, thank you for your inquiry regarding ${inquiry.event_type} on ${formatDate(inquiry.event_date)}.`)}`
    : "#";

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={inquiry ? `Inquiry  - ${inquiry.customer_name}` : "Inquiry"}
      size="lg"
    >
      {loading || !inquiry ? (
        <Loader />
      ) : (
        <>
          <dl className="grid grid-cols-2 gap-4 text-sm mb-4">
            <div><dt className="text-gray-400">Phone</dt><dd>{inquiry.phone}</dd></div>
            <div><dt className="text-gray-400">Email</dt><dd>{inquiry.email || "-"}</dd></div>
            <div><dt className="text-gray-400">Event Date</dt><dd>{formatDate(inquiry.event_date)}</dd></div>
            <div><dt className="text-gray-400">Guests</dt><dd>{inquiry.guest_count}</dd></div>
            <div><dt className="text-gray-400">Event Type</dt><dd>{inquiry.event_type}</dd></div>
            <div><dt className="text-gray-400">Received</dt><dd>{formatDateTime(inquiry.created_at)}</dd></div>
          </dl>

          {inquiry.message && <p className="text-sm text-gray-600 mb-4">{inquiry.message}</p>}

          
         <a   href={whatsappLink}
            target="_blank"
            rel="noreferrer"
            className="inline-flex items-center gap-2 text-sm text-green-600 hover:underline mb-5"
          >
            <MessageCircle size={16} /> Reply via WhatsApp
          </a>

          <div className="border-t border-gray-100 pt-4 mb-5">
            <label className="text-xs text-gray-400 mb-2 block">Internal Notes</label>
            <textarea
              rows={3}
              defaultValue={inquiry.internal_notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm mb-3"
            />
            <Button onClick={handleSaveNotes} variant="outline" className="w-full">Save Notes</Button>
          </div>

          <div className="border-t border-gray-100 pt-4">
            <InquiryStatusFlow
              inquiry={inquiry}
              onAdvance={handleAdvance}
              onMarkLost={handleMarkLost}
              onConvert={() => setConvertModal(true)}
            />
          </div>
        </>
      )}

      <Modal isOpen={convertModal} onClose={() => setConvertModal(false)} title="Convert to Booking" size="sm">
        <Input
          label="Total Amount (₹)"
          type="number"
          value={totalAmount}
          onChange={(e) => setTotalAmount(e.target.value)}
        />
        <div className="flex justify-end gap-3 mt-4">
          <Button variant="outline" onClick={() => setConvertModal(false)}>Cancel</Button>
          <Button onClick={handleConvert} loading={converting}>Create Booking</Button>
        </div>
      </Modal>
    </Modal>
  );
}
import React from "react";
import { Phone, MessageCircle, Send, Bookmark } from "lucide-react";

export default function ContactButtons({ venue, onSendInquiry }) {
  return (
    <div className="flex flex-wrap gap-2.5">
      
      <a  href={`tel:${venue.phone}`}
        className="flex items-center gap-2 bg-navy-50 text-navy-700 text-sm font-medium px-4 py-2.5 rounded-xl hover:bg-navy-100 transition-colors"
      >
        <Phone size={15} /> Call Now
      </a>

      
      <a  href={`https://wa.me/${(venue.whatsapp_number || venue.phone || "").replace(/\D/g, "")}`}
        target="_blank" rel="noreferrer"
        className="flex items-center gap-2 bg-green-50 text-green-700 text-sm font-medium px-4 py-2.5 rounded-xl hover:bg-green-100 transition-colors"
      >
        <MessageCircle size={15} /> WhatsApp
      </a>

      <button
        onClick={onSendInquiry}
        className="flex items-center gap-2 text-white text-sm font-semibold px-5 py-2.5 rounded-xl shadow-sm hover:opacity-90 transition-opacity bg-gradient-to-r from-accent-500 to-accent-600"
      >
        <Send size={15} /> Send Inquiry
      </button>

      <button className="flex items-center gap-2 border border-gray-200 text-gray-600 text-sm font-medium px-4 py-2.5 rounded-xl hover:bg-gray-50 transition-colors">
        <Bookmark size={15} /> Save
      </button>
    </div>
  );
}
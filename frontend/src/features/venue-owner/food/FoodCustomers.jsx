import React, { useState } from "react";
import { MessageCircle } from "lucide-react";
import { useVenue } from "../../../context/VenueContext.jsx";
import { useFetch } from "../../../hooks/useFetch";
import { foodService } from "../../../services/foodService";
import Button from "../../../components/common/Button";
import Modal from "../../../components/common/Modal";
import EmptyState from "../../../components/common/EmptyState";
import Loader from "../../../components/common/Loader";
import { showError } from "../../../components/common/Toast";
import { FoodPage, TextArea, inr, errMsg, fmtDateShort } from "./foodShared.jsx";

const SEGMENTS = [["", "All"], ["regular", "Regulars"], ["lapsed", "Not seen in 30+ days"], ["new", "New"], ["returning", "Returning"]];
const TAG = { regular: "bg-green-100 text-green-700", lapsed: "bg-red-100 text-red-700", new: "bg-sky-100 text-sky-700", returning: "bg-gray-100 text-gray-600" };

export default function FoodCustomers() {
  const { venue } = useVenue();
  const vid = venue?.id;
  const [segment, setSegment] = useState("");
  const [q, setQ] = useState("");
  const url = vid ? `/venues/${vid}/food/customers?segment=${segment}&q=${encodeURIComponent(q)}` : null;
  const { data: rows, loading } = useFetch(url, { skip: !vid });
  const [msg, setMsg] = useState(null); // { customer, type, text }
  const [busy, setBusy] = useState(false);

  const open = async (customer, type) => {
    setBusy(true);
    try {
      const r = (await foodService.customerMessage(vid, customer.id, type)).data.data;
      setMsg({ customer, type, text: r.text });
    } catch (e) { showError(errMsg(e)); } finally { setBusy(false); }
  };
  const switchType = (type) => open(msg.customer, type);
  const waUrl = msg ? `https://wa.me/91${msg.customer.phone}?text=${encodeURIComponent(msg.text)}` : "#";

  return (
    <FoodPage title="Customers" subtitle="Everyone who ordered from you. Bring the lapsed ones back with one tap.">
      <div className="flex flex-wrap gap-2 mb-3 items-center">
        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search name or phone" className="flex-1 min-w-[180px] px-3 py-2 border border-gray-300 rounded-lg text-sm" />
      </div>
      <div className="flex gap-1.5 overflow-x-auto pb-2 mb-3">
        {SEGMENTS.map(([k, l]) => (
          <button key={k} onClick={() => setSegment(k)} className={`px-3 py-1 rounded-full text-xs whitespace-nowrap border ${segment === k ? "bg-primary-600 text-white border-primary-600" : "text-gray-600"}`}>{l}</button>
        ))}
      </div>

      {loading ? <Loader /> : !rows?.length ? (
        <EmptyState title="No customers yet" description="Customers are added automatically when an order has a phone number. Ask for it at the counter." />
      ) : (
        <div className="bg-white rounded-2xl border border-navy-100/60 divide-y">
          {rows.map((c) => (
            <div key={c.id} className="px-4 py-3 flex flex-wrap items-center gap-3">
              <div className="flex-1 min-w-[170px]">
                <p className="text-sm font-medium text-gray-900">{c.name} <span className="text-gray-400 font-normal">{c.phone}</span></p>
                <p className="text-xs text-gray-500">{c.orders_count} orders · {inr(c.total_spent)} · last {c.last_order_on ? fmtDateShort(c.last_order_on) : "-"}{c.days_since != null ? ` (${c.days_since}d ago)` : ""}</p>
              </div>
              <span className={`text-[11px] px-2 py-0.5 rounded-full font-medium capitalize ${TAG[c.segment]}`}>{c.segment}</span>
              <Button variant="outline" className="!py-1.5 !px-3" loading={busy} onClick={() => open(c, c.segment === "lapsed" ? "winback" : "thanks")}><MessageCircle size={14} /> Message</Button>
            </div>
          ))}
        </div>
      )}

      <Modal isOpen={!!msg} onClose={() => setMsg(null)} title={`Message ${msg?.customer.name || ""}`} size="md">
        {msg && (
          <div className="space-y-3">
            <div className="flex gap-1.5">
              {[["winback", "Win-back"], ["thanks", "Thank you"]].map(([k, l]) => (
                <button key={k} onClick={() => switchType(k)} className={`px-3 py-1 rounded-full text-xs border ${msg.type === k ? "bg-primary-600 text-white border-primary-600" : "text-gray-600"}`}>{l}</button>
              ))}
            </div>
            <TextArea rows={6} value={msg.text} onChange={(e) => setMsg({ ...msg, text: e.target.value })} />
            <p className="text-xs text-gray-500">You can edit the text. WhatsApp opens on your own phone and you press send. Nothing is sent from here.</p>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setMsg(null)}>Close</Button>
              <a href={waUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center justify-center px-4 py-2.5 rounded-xl font-medium text-sm bg-green-600 text-white">Open WhatsApp</a>
            </div>
          </div>
        )}
      </Modal>
    </FoodPage>
  );
}
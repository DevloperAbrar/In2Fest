import React, { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Phone, MessageCircle, Check } from "lucide-react";
import { publicOrders } from "../../services/ordersService";

const inr = (n) => `₹${Number(n || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
const clock = (d) => (d ? new Date(d).toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" }) : "");
const STEPS = [
  { k: "pending", l: "Order placed" },
  { k: "accepted", l: "Being prepared" },
  { k: "ready", l: "Ready for pickup" },
  { k: "completed", l: "Picked up" }
];
const TERMINAL = {
  cancelled: "This order was cancelled",
  no_show: "This order was not collected",
  fake: "This order was cancelled by the shop"
};

export default function OrderTrackPage() {
  const { token } = useParams();
  const [o, setO] = useState(null);
  const [error, setError] = useState("");
  const [now, setNow] = useState(Date.now());
  const [cancelling, setCancelling] = useState(false);

  useEffect(() => {
    let stop = false;
    const load = async () => {
      try {
        const r = await publicOrders.track(token);
        if (!stop) { setO(r.data.data); setError(""); }
      } catch (e) {
        if (!stop) setError(e.response?.data?.message || "We couldn't find this order.");
      }
    };
    load();
    const id = setInterval(load, 10000);
    const tick = setInterval(() => setNow(Date.now()), 30000);
    return () => { stop = true; clearInterval(id); clearInterval(tick); };
  }, [token]);

  useEffect(() => { if (o) document.title = `Order #${o.order_no} · ${o.business.name}`; }, [o]);

  const cancel = async () => {
    if (!window.confirm("Cancel this order?")) return;
    setCancelling(true);
    try { setO((await publicOrders.cancel(token)).data.data); } catch (e) { alert(e.response?.data?.message || "Could not cancel"); }
    finally { setCancelling(false); }
  };

  if (error) {
    return <div className="min-h-screen flex items-center justify-center bg-stone-50 p-6 text-center"><div><p className="text-lg font-bold text-stone-900">Order not found</p><p className="text-sm text-stone-500 mt-1">{error}</p><a href="/" className="inline-block mt-4 text-sm font-semibold text-emerald-700">Back to the shop</a></div></div>;
  }
  if (!o) return <div className="min-h-screen flex items-center justify-center bg-stone-50 text-stone-400 text-sm">Loading your order…</div>;

  const idx = STEPS.findIndex((s) => s.k === o.status);
  const terminal = TERMINAL[o.status];
  const minsLeft = o.promised_at ? Math.round((new Date(o.promised_at).getTime() - now) / 60000) : null;
  const wa = String(o.business.whatsapp || "").replace(/\D/g, "");

  return (
    <div className="min-h-screen bg-stone-50 py-8 px-4">
      <div className="max-w-md mx-auto space-y-4">
        <div className="text-center">
          <a href="/" className="text-sm font-semibold text-stone-500">{o.business.name}</a>
          <h1 className="text-2xl font-extrabold text-stone-900 mt-1">Order #{o.order_no}</h1>
        </div>

        {terminal ? (
          <div className="rounded-2xl bg-red-50 border border-red-100 p-4 text-center">
            <p className="font-semibold text-red-700">{terminal}</p>
            {o.cancel_reason && <p className="text-sm text-red-600 mt-1">{o.cancel_reason}</p>}
          </div>
        ) : (
          <div className="rounded-2xl bg-white border border-stone-100 shadow-sm p-5">
            <ol className="space-y-3">
              {STEPS.map((s, i) => {
                const done = i < idx || o.status === "completed";
                const current = i === idx && o.status !== "completed";
                return (
                  <li key={s.k} className="flex items-center gap-3">
                    <span className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${done ? "bg-emerald-600 text-white" : current ? "bg-emerald-100 text-emerald-700 ring-2 ring-emerald-500" : "bg-stone-100 text-stone-400"}`}>
                      {done ? <Check size={14} /> : i + 1}
                    </span>
                    <span className={`text-sm ${current ? "font-bold text-stone-900" : done ? "text-stone-700" : "text-stone-400"}`}>
                      {s.k === "pending" && current ? "Waiting for the shop to accept" : s.l}
                    </span>
                  </li>
                );
              })}
            </ol>
            {o.status === "accepted" && o.promised_at && (
              <p className="mt-4 text-sm text-stone-600">Ready by <b>{clock(o.promised_at)}</b>{minsLeft !== null && minsLeft > 0 ? ` (about ${minsLeft} min)` : minsLeft !== null ? " (should be ready any moment)" : ""}</p>
            )}
            {o.status === "ready" && <p className="mt-4 text-sm font-semibold text-emerald-700">Your order is ready. Please collect it at the counter.</p>}
          </div>
        )}

        {o.pickup_code && !terminal && o.status !== "completed" && (
          <div className="rounded-2xl bg-white border-2 border-emerald-500 p-5 text-center">
            <p className="text-xs uppercase tracking-widest text-stone-500">Your pickup code</p>
            <p className="font-mono text-5xl font-black tracking-[0.3em] text-emerald-700 mt-2">{o.pickup_code}</p>
            <p className="text-xs text-stone-500 mt-3">Show this code at the counter. Don't share it with anyone else.</p>
          </div>
        )}

        <div className="rounded-2xl bg-white border border-stone-100 shadow-sm p-5">
          {o.edited && <p className="mb-3 text-xs rounded-lg bg-amber-50 text-amber-800 px-3 py-2">The shop updated your order. Please check the items and total below.</p>}
          <ul className="space-y-1.5 text-sm text-stone-700">
            {o.items.map((i, k) => (
              <li key={k} className="flex justify-between gap-3"><span>{i.qty} × {i.name}{i.variant ? ` (${i.variant})` : ""}</span><span className="text-stone-500">{inr(i.line_total)}</span></li>
            ))}
          </ul>
          <div className="mt-3 pt-3 border-t border-stone-100 flex justify-between font-extrabold text-stone-900"><span>Total (pay at pickup)</span><span>{inr(o.total)}</span></div>
          {o.instructions && <p className="mt-3 text-xs text-stone-500">{o.instructions}</p>}
          {o.business.address && <p className="mt-2 text-xs text-stone-500">Pickup from: {o.business.address}</p>}
        </div>

        <div className="flex gap-3">
          {o.business.phone && <a href={`tel:${o.business.phone}`} className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl border border-stone-300 text-sm font-semibold text-stone-800"><Phone size={15} /> Call shop</a>}
          {wa && <a href={`https://wa.me/${wa.length === 10 ? `91${wa}` : wa}`} target="_blank" rel="noopener noreferrer" className="flex-1 flex items-center justify-center gap-2 py-3 rounded-xl bg-green-600 text-white text-sm font-semibold"><MessageCircle size={15} /> WhatsApp</a>}
        </div>
        {o.can_cancel && <button type="button" onClick={cancel} disabled={cancelling} className="w-full py-2.5 text-sm font-medium text-red-600">Cancel this order</button>}
        <p className="text-center text-[11px] text-stone-400">This page updates automatically.</p>
      </div>
    </div>
  );
}
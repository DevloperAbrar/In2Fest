// One order as the customer sees it: token, status, live countdown, items and payment.
import React, { useEffect, useState } from "react";
import api from "../../../../services/api";
import { onAccent } from "../../../../lib/verticals";

const money = (n) => `₹${Number(n || 0).toLocaleString("en-IN", { maximumFractionDigits: 2 })}`;
const STEPS = [["new", "Received"], ["preparing", "Preparing"], ["ready", "Ready"], ["completed", "Done"]];
const TYPE_LABEL = { takeaway: "Pickup", dine_in: "Dine-in", delivery: "Delivery" };
const clock = (iso) => (iso ? new Date(iso).toLocaleTimeString("en-IN", { hour: "numeric", minute: "2-digit" }) : "");

export const isActiveOrder = (o) => ["new", "preparing", "ready"].includes(o.status);

// Re-renders every second while a countdown is running.
function useTick(on) {
  const [, setN] = useState(0);
  useEffect(() => {
    if (!on) return undefined;
    const t = setInterval(() => setN((n) => n + 1), 1000);
    return () => clearInterval(t);
  }, [on]);
}

export function FoodOrderCard({ o, theme, skew = 0, onChanged }) {
  useTick(o.status === "preparing" && !!o.eta_at);
  const idx = STEPS.findIndex(([k]) => k === o.status);
  const cancelled = o.status === "cancelled";

  let headline;
  let sub = "";
  if (cancelled) { headline = "Order cancelled"; sub = o.cancel_reason || "The restaurant could not take this order."; }
  else if (o.status === "completed") { headline = "Order complete. Enjoy your meal!"; sub = o.completed_at ? `Collected at ${clock(o.completed_at)}` : ""; }
  else if (o.status === "ready") { headline = "Ready for pickup!"; sub = `Show token ${o.token_no} at the counter`; }
  else if (o.status === "preparing") { headline = "Your food is being prepared"; sub = o.eta_at ? `Expected ready by ${clock(o.eta_at)}` : `Usually ready in about ${o.eta_min} minutes`; }
  else { headline = "Waiting for the restaurant to accept"; sub = "The pickup time will appear here as soon as they accept."; }

  let countdown = null;
  if (o.status === "preparing" && o.eta_at) {
    const ms = Date.parse(o.eta_at) - (Date.now() + skew);
    const m = Math.floor(Math.max(ms, 0) / 60000);
    const s = Math.floor((Math.max(ms, 0) % 60000) / 1000);
    countdown = ms <= 0
      ? <p className="text-xl font-extrabold" style={{ color: theme }}>Almost ready…</p>
      : <p className="text-4xl font-extrabold tabular-nums" style={{ color: theme }}>{m}:{String(s).padStart(2, "0")}</p>;
  }

  const claim = async () => {
    try { await api.post(`/public/food/order/${o.tracking_token}/claimed`); onChanged && onChanged(); } catch { /* ignore */ }
  };
  const wa = o.restaurant.whatsapp
    ? `https://wa.me/${o.restaurant.whatsapp}?text=${encodeURIComponent(`Hi, this is about my order #${o.order_no} (token ${o.token_no}).`)}` : null;

  return (
    <div className="rounded-2xl border border-stone-200 dark:border-stone-700 bg-white dark:bg-stone-800 p-4 mb-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-bold text-stone-900 dark:text-white">Order #{o.order_no}</p>
          <p className="text-xs text-stone-500">{TYPE_LABEL[o.order_type]}{o.table_name ? ` · Table ${o.table_name}` : ""} · {new Date(o.created_at).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit" })}</p>
        </div>
        <div className="text-right">
          <p className="text-[10px] uppercase tracking-wide text-stone-500">Token</p>
          <p className="text-3xl font-extrabold leading-none" style={{ color: theme }}>{o.token_no}</p>
        </div>
      </div>

      <div className="text-center my-4">
        <p className="font-semibold text-stone-900 dark:text-white">{headline}</p>
        {sub && <p className="text-xs text-stone-500 mt-0.5">{sub}</p>}
        {countdown && <div className="mt-2"><p className="text-[10px] uppercase tracking-wide text-stone-500">Time left</p>{countdown}</div>}
      </div>

      {!cancelled && (
        <div className="flex items-center justify-between mb-4">
          {STEPS.map(([k, l], i) => (
            <div key={k} className="flex-1 text-center">
              <div className="mx-auto w-3 h-3 rounded-full" style={{ backgroundColor: i <= idx ? theme : "#d6d3d1" }} />
              <p className={`text-[11px] mt-1 ${i <= idx ? "font-semibold text-stone-800 dark:text-stone-100" : "text-stone-400"}`}>{l}</p>
            </div>
          ))}
        </div>
      )}

      <div className="border-t border-stone-200 dark:border-stone-700 pt-3 text-sm space-y-1">
        {o.items.map((l, i) => <div key={i} className="flex justify-between text-stone-700 dark:text-stone-300"><span>{l.quantity} × {l.name}</span><span>{money(l.amount)}</span></div>)}
        {o.charges.map((c, i) => <div key={i} className="flex justify-between text-stone-500"><span>{c.name}</span><span>{money(c.amount)}</span></div>)}
        {o.tax > 0 && <div className="flex justify-between text-stone-500"><span>GST</span><span>{money(o.tax)}</span></div>}
        <div className="flex justify-between font-bold text-stone-900 dark:text-white pt-1"><span>Total</span><span>{money(o.total)}</span></div>
      </div>

      {o.payment_status === "paid" ? (
        <p className="mt-3 text-center text-sm font-semibold text-green-600">Payment received. Thank you!</p>
      ) : !cancelled && (
        <div className="mt-3 space-y-2">
          {o.upi_link && <a href={o.upi_link} className="block text-center py-2.5 rounded-xl font-bold" style={{ backgroundColor: theme, color: onAccent(theme) }}>Pay {money(o.total)} with UPI</a>}
          {o.upi_link && !o.claimed && <button onClick={claim} className="w-full text-sm py-1 text-stone-600 dark:text-stone-300 underline">I have paid</button>}
          {o.claimed && <p className="text-center text-xs text-stone-500">Thanks! The restaurant will confirm your payment.</p>}
          {!o.upi_link && <p className="text-center text-xs text-stone-500">Pay at the counter when you collect.</p>}
        </div>
      )}

      <div className="flex gap-4 mt-3 justify-center text-sm">
        {o.restaurant.phone && <a href={`tel:${o.restaurant.phone}`} className="underline text-stone-600 dark:text-stone-300">Call restaurant</a>}
        {wa && <a href={wa} target="_blank" rel="noopener noreferrer" className="underline text-stone-600 dark:text-stone-300">WhatsApp</a>}
      </div>
    </div>
  );
}
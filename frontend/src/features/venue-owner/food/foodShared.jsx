import React from "react";
import { NavLink } from "react-router-dom";
import DashboardLayout from "../../../components/layout/DashboardLayout.jsx";
import { ownerSidebarItems } from "../ownerSidebarItems.js";
import { useAuth } from "../../../context/AuthContext";
import { useFetch } from "../../../hooks/useFetch";
import { BASE_DOMAIN } from "../../../lib/constants";

// Small helpers are shared with the gym pages on purpose.
export { Field, TextArea, errMsg, downloadBlob, copyText, shareContent } from "../gym/gymShared.jsx";

export const inr = (n) => `₹${Number(n || 0).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;
export const inr2 = (n) => `₹${Number(n || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

export const TYPE_LABEL = { dine_in: "Dine-in", takeaway: "Takeaway", delivery: "Delivery" };
export const SOURCE_LABEL = { pos: "Counter", website: "Website", qr: "Table QR", zomato: "Zomato", swiggy: "Swiggy", other_app: "Other app" };
export const PAY_MODES = [{ value: "cash", label: "Cash" }, { value: "upi", label: "UPI" }, { value: "card", label: "Card" }, { value: "other", label: "Other" }];

// Same link the Subdomain tab shows, so QR codes open the vendor's real website.
export function siteBase(venue) {
  const isDev = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1";
  return isDev ? `${window.location.protocol}//${venue.subdomain}.${window.location.host}` : `https://${venue.subdomain}.${BASE_DOMAIN}`;
}

export const useFoodContext = (vid) => useFetch(vid ? `/venues/${vid}/food/context` : null, { skip: !vid });

export function FoodDot({ type }) {
  const color = type === "nonveg" ? "#dc2626" : type === "egg" ? "#d97706" : "#16a34a";
  if (!type) return null;
  return (
    <span className="inline-flex items-center justify-center w-4 h-4 border-2 rounded-sm flex-shrink-0" style={{ borderColor: color }}>
      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: color }} />
    </span>
  );
}

const STATUS = {
  new: ["New", "bg-red-100 text-red-700"], preparing: ["Preparing", "bg-amber-100 text-amber-700"],
  ready: ["Ready", "bg-green-100 text-green-700"], completed: ["Completed", "bg-gray-100 text-gray-600"],
  cancelled: ["Cancelled", "bg-gray-100 text-gray-500"]
};
export function StatusBadge({ status }) {
  const [label, cls] = STATUS[status] || STATUS.new;
  return <span className={`inline-block px-2.5 py-1 rounded-full text-xs font-medium whitespace-nowrap ${cls}`}>{label}</span>;
}

export function Toggle({ checked, onChange, label, hint }) {
  return (
    <label className="flex items-start justify-between gap-3 py-2 cursor-pointer">
      <span>
        <span className="block text-sm font-medium text-gray-800">{label}</span>
        {hint && <span className="block text-xs text-gray-500">{hint}</span>}
      </span>
      <button type="button" onClick={() => onChange(!checked)}
        className={`relative flex-shrink-0 w-11 h-6 rounded-full transition-colors ${checked ? "bg-green-500" : "bg-gray-300"}`}>
        <span className={`absolute top-0.5 w-5 h-5 bg-white rounded-full transition-all ${checked ? "left-[22px]" : "left-0.5"}`} />
      </button>
    </label>
  );
}

export function FoodTabs() {
  const { user } = useAuth();
  const tabs = [
    ["/dashboard/food", "Overview", true], ["/dashboard/food/orders", "Live Orders"], ["/dashboard/food/pos", "POS"],
    ["/dashboard/food/menu", "Menu"], ["/dashboard/food/offers", "Offers"], ["/dashboard/food/stock", "Stock"], ["/dashboard/food/customers", "Customers"]
  ];
  if (user?.role !== "team_member") tabs.push(["/dashboard/food/setup", "Setup"]);
  return (
    <div className="flex gap-1 mb-5 bg-gray-100 p-1 rounded-xl overflow-x-auto">
      {tabs.map(([to, label, end]) => (
        <NavLink key={to} to={to} end={!!end}
          className={({ isActive }) => `px-4 py-1.5 rounded-lg text-sm font-medium whitespace-nowrap ${isActive ? "bg-white shadow text-gray-900" : "text-gray-500"}`}>
          {label}
        </NavLink>
      ))}
    </div>
  );
}

export function FoodPage({ title, subtitle, actions, children }) {
  return (
    <DashboardLayout sidebarItems={ownerSidebarItems} pageTitle="Restaurant">
      <div className="flex items-start justify-between gap-3 mb-4">
        <div>
          <h1 className="text-lg font-semibold text-gray-900">{title}</h1>
          {subtitle && <p className="text-sm text-gray-500 mt-0.5">{subtitle}</p>}
        </div>
        <div className="flex gap-2 flex-shrink-0">{actions}</div>
      </div>
      <FoodTabs />
      {children}
    </DashboardLayout>
  );
}

// Prints a kitchen ticket (kind "kot") or a customer bill (kind "bill") from any browser / thermal printer.
export function printTicket(order, ctx, kind = "bill") {
  const v = ctx?.venue || {};
  const s = ctx?.settings || {};
  const esc = (x) => String(x ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const f2 = (x) => Number(x || 0).toFixed(2);
  const all = order.items || [];
  const lines = all.filter((l) => l.kind !== "charge");
  const charges = all.filter((l) => l.kind === "charge");
  const when = new Date(order.createdAt || Date.now()).toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
  const hasTax = Number(order.cgst) + Number(order.sgst) > 0;
  const title = kind === "kot" ? "KITCHEN ORDER" : s.gst_scheme === "composition" ? "BILL OF SUPPLY" : hasTax ? "TAX INVOICE" : "BILL";

  const itemRows = lines.map((l) => (kind === "kot"
    ? `<tr><td class="q">${l.quantity} ×</td><td>${esc(l.description)}${l.note ? `<br><small>↳ ${esc(l.note)}</small>` : ""}</td></tr>`
    : `<tr><td>${esc(l.description)}<br><small>${l.quantity} × ${f2(l.rate)}</small></td><td class="r">${f2(l.amount)}</td></tr>`)).join("");

  const billRows = kind === "kot" ? "" : `
    ${charges.map((c) => `<tr><td>${esc(c.description)}</td><td class="r">${f2(c.amount)}</td></tr>`).join("")}
    <tr><td colspan="2"><hr></td></tr>
    <tr><td>Subtotal</td><td class="r">${f2(order.subtotal)}</td></tr>
    ${Number(order.discount_amount) > 0 ? `<tr><td>Discount</td><td class="r">-${f2(order.discount_amount)}</td></tr>` : ""}
    ${hasTax ? `<tr><td>CGST</td><td class="r">${f2(order.cgst)}</td></tr><tr><td>SGST</td><td class="r">${f2(order.sgst)}</td></tr>` : ""}
    ${Number(order.round_off) !== 0 ? `<tr><td>Round off</td><td class="r">${f2(order.round_off)}</td></tr>` : ""}
    <tr class="tot"><td>TOTAL</td><td class="r">₹${f2(order.total)}</td></tr>`;

  const html = `<!doctype html><html><head><meta charset="utf-8"><title>${esc(title)} #${esc(order.order_no)}</title>
<style>@page{size:80mm auto;margin:2mm}body{font-family:ui-monospace,Menlo,Consolas,monospace;font-size:12px;width:72mm;margin:0 auto;color:#000}
h1{font-size:15px;text-align:center;margin:4px 0}.c{text-align:center}table{width:100%;border-collapse:collapse}td{padding:2px 0;vertical-align:top}
.r{text-align:right}.q{width:34px;font-weight:700;font-size:14px}small{color:#444}.tot td{font-size:15px;font-weight:700;border-top:1px dashed #000;padding-top:5px}
hr{border:0;border-top:1px dashed #000;margin:4px 0}.big{font-size:26px;font-weight:800}</style></head><body>
<h1>${esc(v.hall_name || "")}</h1>
${kind === "bill" && v.address ? `<div class="c">${esc(v.address)}</div>` : ""}
${kind === "bill" && v.phone ? `<div class="c">Ph: ${esc(v.phone)}</div>` : ""}
${kind === "bill" && ctx?.tax_on && v.gst_number ? `<div class="c">GSTIN: ${esc(v.gst_number)}</div>` : ""}
${kind === "bill" && s.fssai_no ? `<div class="c">FSSAI: ${esc(s.fssai_no)}</div>` : ""}
<hr><div class="c"><b>${esc(title)}</b></div>
<div class="c big">TOKEN ${esc(order.token_no)}</div>
<table><tr><td>${kind === "kot" ? "KOT" : "Bill"} #${esc(order.order_no)}</td><td class="r">${esc(when)}</td></tr>
<tr><td>${esc(TYPE_LABEL[order.order_type] || order.order_type)}${order.table_name ? ` · Table ${esc(order.table_name)}` : ""}${order.room_no ? ` · Room ${esc(order.room_no)}` : ""}</td><td class="r">${esc(SOURCE_LABEL[order.source] || "")}</td></tr></table>
${order.customer_name || order.customer_phone ? `<div>${esc(order.customer_name || "")} ${esc(order.customer_phone || "")}</div>` : ""}
${order.order_type === "delivery" && order.address ? `<div>${esc(order.address)}</div>` : ""}
<hr><table>${itemRows}${billRows}</table>
${order.notes ? `<hr><div>Note: ${esc(order.notes)}</div>` : ""}
${kind === "bill" ? `<hr><div class="c">${order.payment_status === "paid" ? `Paid · ${esc((order.payment_mode || "").toUpperCase())}` : order.payment_mode === "room" ? `Charged to room ${esc(order.room_no)}` : "Payment pending"}</div><div class="c">${esc(s.bill_footer || "Thank you! Visit again.")}</div>` : ""}
</body></html>`;

  const w = window.open("", "_blank", "width=380,height=640");
  if (!w) return false;
  w.document.write(html);
  w.document.close();
  w.focus();
  setTimeout(() => w.print(), 300);
  return true;
}

export const fmtDateShort = (d) => (d ? new Date(`${d}T00:00:00`).toLocaleDateString("en-IN", { day: "2-digit", month: "short" }) : "-");
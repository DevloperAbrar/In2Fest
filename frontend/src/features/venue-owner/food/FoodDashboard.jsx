import React, { useState } from "react";
import { Link } from "react-router-dom";
import { IndianRupee, ShoppingBag, TrendingUp, Wallet, Download, BellRing, PackageMinus, PiggyBank } from "lucide-react";
import { ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip } from "recharts";
import { useVenue } from "../../../context/VenueContext.jsx";
import { useFetch } from "../../../hooks/useFetch";
import { foodService } from "../../../services/foodService";
import KpiCard from "../../../components/common/KpiCard";
import Card from "../../../components/common/Card";
import Button from "../../../components/common/Button";
import Select from "../../../components/common/Select";
import Loader from "../../../components/common/Loader";
import { showError } from "../../../components/common/Toast";
import { FoodPage, inr, downloadBlob, SOURCE_LABEL, TYPE_LABEL, useFoodContext } from "./foodShared.jsx";

const RANGES = [{ value: "7", label: "Last 7 days" }, { value: "30", label: "Last 30 days" }, { value: "90", label: "Last 90 days" }];
const ymd = (offset) => new Date(Date.now() + 330 * 60000 - offset * 86400000).toISOString().slice(0, 10);
const hourLabel = (h) => `${h % 12 || 12} ${h < 12 ? "AM" : "PM"}`;

function Reports({ vid, unit }) {
  const [days, setDays] = useState("7");
  const params = { from: ymd(Number(days) - 1), to: ymd(0) };
  const { data: r, loading } = useFetch(`/venues/${vid}/food/reports?from=${params.from}&to=${params.to}`, { deps: [days] });

  const download = async () => {
    try { downloadBlob((await foodService.exportReport(vid, params)).data, `sales-${params.from}-to-${params.to}.csv`); }
    catch { showError("Could not download the report"); }
  };

  return (
    <Card title="Sales report" action={
      <div className="flex items-center gap-2">
        <div className="w-36"><Select value={days} onChange={(e) => setDays(e.target.value)} options={RANGES} /></div>
        <Button variant="outline" onClick={download}><Download size={14} /> CSV</Button>
      </div>
    }>
      {loading || !r ? <Loader /> : (
        <div className="space-y-5">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
            {[["Orders", r.summary.orders], ["Sales", inr(r.summary.sales)], ["Tax collected", inr(r.summary.tax)], ["Discounts", inr(r.summary.discount)],
              ["Average order", inr(r.summary.avg_order)], ["Cancelled", `${r.summary.cancelled} (${inr(r.summary.cancelled_amount)})`],
              ["Aggregator commission", inr(r.summary.commission_paid)], ["Unpaid", inr(r.summary.unpaid)]].map(([k, v]) => (
              <div key={k} className="bg-gray-50 rounded-xl px-3 py-2"><p className="text-xs text-gray-500">{k}</p><p className="font-semibold text-gray-900">{v}</p></div>
            ))}
          </div>

          <div className="grid md:grid-cols-2 gap-5">
            <div>
              <p className="text-sm font-medium text-gray-700 mb-2">By channel</p>
              {r.by_source.map((s) => (
                <div key={s.source} className="flex justify-between text-sm py-1 border-b last:border-0"><span>{SOURCE_LABEL[s.source] || s.source} · {s.orders}</span><span className="font-medium">{inr(s.sales)}</span></div>
              ))}
              <p className="text-sm font-medium text-gray-700 mt-4 mb-2">By order type</p>
              {r.by_type.map((s) => (
                <div key={s.type} className="flex justify-between text-sm py-1 border-b last:border-0"><span>{TYPE_LABEL[s.type] || s.type} · {s.orders}</span><span className="font-medium">{inr(s.sales)}</span></div>
              ))}
              <p className="text-sm font-medium text-gray-700 mt-4 mb-2">Money received by</p>
              {r.by_payment.length === 0 ? <p className="text-xs text-gray-400">No paid orders in this period.</p> : r.by_payment.map((s) => (
                <div key={s.mode} className="flex justify-between text-sm py-1 border-b last:border-0"><span className="uppercase">{s.mode} · {s.orders}</span><span className="font-medium">{inr(s.amount)}</span></div>
              ))}
            </div>
            <div>
              <p className="text-sm font-medium text-gray-700 mb-2">GST summary (for your CA)</p>
              {r.gst.length === 0 ? <p className="text-xs text-gray-400">No GST was charged in this period.</p> : (
                <table className="w-full text-sm">
                  <thead><tr className="text-xs text-gray-500 text-left"><th>Rate</th><th className="text-right">Taxable</th><th className="text-right">CGST</th><th className="text-right">SGST</th></tr></thead>
                  <tbody>{r.gst.map((g) => (
                    <tr key={g.rate} className="border-t"><td className="py-1">{g.rate}%</td><td className="text-right">{inr(g.taxable)}</td><td className="text-right">{inr(g.cgst)}</td><td className="text-right">{inr(g.sgst)}</td></tr>
                  ))}</tbody>
                </table>
              )}
              <p className="text-sm font-medium text-gray-700 mt-4 mb-2">Top dishes</p>
              {r.top_items.slice(0, 8).map((i) => (
                <div key={i.name} className="flex justify-between text-sm py-1 border-b last:border-0"><span className="truncate pr-2">{i.name}</span><span className="text-gray-500 whitespace-nowrap">{i.qty} · {inr(i.revenue)}</span></div>
              ))}
            </div>
          </div>

          {unit && r.units.length > 0 && (
            <div>
              <p className="text-sm font-medium text-gray-700 mb-1">{unit.one} settlement</p>
              <p className="text-xs text-gray-500 mb-2">{unit.shareHint}</p>
              <div className="overflow-x-auto">
                <table className="w-full text-sm min-w-[480px]">
                  <thead><tr className="text-xs text-gray-500 text-left"><th>{unit.one}</th><th className="text-right">Orders</th><th className="text-right">Sales (excl. tax)</th><th className="text-right">Share %</th><th className="text-right">Share amount</th></tr></thead>
                  <tbody>{r.units.map((u) => (
                    <tr key={u.unit_id} className="border-t"><td className="py-1.5">{u.name}</td><td className="text-right">{u.orders}</td><td className="text-right">{inr(u.taxable)}</td><td className="text-right">{u.share_percent}%</td><td className="text-right font-semibold">{inr(u.share_amount)}</td></tr>
                  ))}</tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}
    </Card>
  );
}

export default function FoodDashboard() {
  const { venue } = useVenue();
  const vid = venue?.id;
  const { data: ctx } = useFoodContext(vid);
  const { data: d, loading } = useFetch(vid ? `/venues/${vid}/food/dashboard` : null, { skip: !vid });

  if (loading || !d) return <FoodPage title="Restaurant overview"><Loader /></FoodPage>;
  const a = d.aggregator;

  return (
    <FoodPage title="Restaurant overview" subtitle="Today's sales, live orders and what your own channel is saving you">
      {d.live.new > 0 && (
        <Link to="/dashboard/food/orders" className="flex items-center gap-2 mb-4 px-4 py-3 rounded-xl bg-red-50 border border-red-200 text-red-700 text-sm font-medium">
          <BellRing size={16} /> {d.live.new} new order{d.live.new > 1 ? "s" : ""} waiting for you. Tap to open →
        </Link>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
        <KpiCard icon={IndianRupee} label="Today's sales" value={inr(d.today.sales)} sublabel={`${d.today.orders} orders`} accent="#16a34a" />
        <KpiCard icon={ShoppingBag} label="In the kitchen" value={d.live.preparing + d.live.new} sublabel={`${d.live.ready} ready to serve`} accent="#ea580c" />
        <KpiCard icon={TrendingUp} label="Average order" value={inr(d.today.avg_order)} sublabel={d.peak_hour ? `Busiest: ${hourLabel(d.peak_hour.hour)}` : "Last 7 days"} accent="#2563eb" />
        <KpiCard icon={Wallet} label="Unpaid today" value={inr(d.today.unpaid)} accent="#dc2626" />
      </div>

      <div className="rounded-2xl p-5 mb-4 text-white" style={{ background: "linear-gradient(135deg,#ea580c,#c2410c)" }}>
        <div className="flex items-start gap-3">
          <PiggyBank size={28} className="flex-shrink-0 mt-0.5" />
          <div className="min-w-0">
            <p className="text-sm opacity-90">Saved on your own website and QR orders (last 30 days)</p>
            <p className="text-3xl font-extrabold mt-1">{inr(a.saved_30d)}</p>
            <p className="text-sm opacity-90 mt-1">{a.direct_orders_30d} direct orders worth {inr(a.direct_sales_30d)}. At {a.percent}% app commission that is what you kept.</p>
            {a.aggregator_orders_30d > 0 && (
              <p className="text-sm opacity-90 mt-1">Zomato/Swiggy/other apps: {a.aggregator_orders_30d} orders, about {inr(a.commission_paid_30d)} paid as commission. Move repeat customers to your own link.</p>
            )}
          </div>
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-3 mb-4">
        <Card title="Last 7 days" className="md:col-span-2">
          <div className="h-52">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={d.series}>
                <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} width={48} />
                <Tooltip formatter={(v, n) => (n === "sales" ? inr(v) : v)} />
                <Bar dataKey="sales" name="sales" fill="#ea580c" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
        <Card title="Top dishes (7 days)">
          {d.top_items.length === 0 ? <p className="text-sm text-gray-400">Sell something to see your best dishes.</p> : d.top_items.map((i) => (
            <div key={i.name} className="flex justify-between text-sm py-1.5 border-b last:border-0"><span className="truncate pr-2">{i.name}</span><span className="text-gray-500">{i.qty}×</span></div>
          ))}
        </Card>
      </div>

      <div className="grid md:grid-cols-3 gap-3 mb-4">
        <Card title="Where orders come from (7 days)">
          {d.sources.length === 0 ? <p className="text-sm text-gray-400">No orders yet.</p> : d.sources.map((s) => (
            <div key={s.source} className="flex justify-between text-sm py-1.5 border-b last:border-0"><span>{SOURCE_LABEL[s.source] || s.source} · {s.orders}</span><span className="font-medium">{inr(s.sales)}</span></div>
          ))}
        </Card>
        <Card title="Customers">
          <p className="text-2xl font-bold text-gray-900">{d.customers.total}</p>
          <p className="text-xs text-gray-500 mt-1">{d.customers.repeat_percent}% ordered more than once · {d.customers.new_7d} new this week</p>
          <Link to="/dashboard/food/customers" className="text-xs text-primary-600 font-medium">Send win-back messages →</Link>
        </Card>
        <Card title="Low stock">
          {d.low_stock.length === 0 ? <p className="text-sm text-gray-400">Nothing running low.</p> : (
            <>
              {d.low_stock.slice(0, 5).map((i) => (
                <div key={i.id} className="flex items-center justify-between text-sm py-1"><span className="flex items-center gap-1.5"><PackageMinus size={14} className="text-red-500" />{i.name}</span><span className="text-red-600 font-medium">{i.stock_qty} {i.unit}</span></div>
              ))}
              <Link to="/dashboard/food/stock" className="text-xs text-primary-600 font-medium">Open stock →</Link>
            </>
          )}
        </Card>
      </div>

      <Reports vid={vid} unit={ctx?.subtype?.unit} />
    </FoodPage>
  );
}
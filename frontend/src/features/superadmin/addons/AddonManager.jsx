import React, { useCallback, useEffect, useState } from "react";
import DashboardLayout from "../../../components/layout/DashboardLayout.jsx";
import { adminSidebarItems } from "../adminSidebarItems.js";
import Button from "../../../components/common/Button";
import Loader from "../../../components/common/Loader";
import { showSuccess, showError } from "../../../components/common/Toast";
import { formatCurrency, formatDate } from "../../../lib/formatters";
import { addonService } from "../../../services/addonService";
import { venueService } from "../../../services/venueService";

const errText = (e, fallback) => e?.response?.data?.message || e?.message || fallback;
const FIELD = "w-full px-2.5 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500";
const LABEL = "block text-xs font-medium text-navy-600 mb-1";
const SOURCE_LABEL = { paid: "Paid online", manual: "Paid (recorded)", trial: "Free trial", complimentary: "Complimentary" };

/* ---------------------------------- price + availability ---------------------------------- */

function toForm(addon) {
  const p = addon.price;
  return {
    monthly: String(p.monthly_price || ""),
    yearly: p.yearly_price ? String(p.yearly_price) : "",
    discount: String(p.discount_percent || 0),
    offerName: p.offer_name || "",
    offerEnd: p.offer_ends_at ? String(p.offer_ends_at).slice(0, 10) : "",
    gstInclusive: p.gst_inclusive === true,
    active: p.is_active === true
  };
}

function PriceEditor({ addon, onSaved }) {
  const [f, setF] = useState(() => toForm(addon));
  const [saving, setSaving] = useState(false);
  useEffect(() => { setF(toForm(addon)); }, [addon]);
  const set = (k, v) => setF((p) => ({ ...p, [k]: v }));

  const save = async () => {
    setSaving(true);
    try {
      const r = await addonService.adminPricing(addon.key, {
        monthly_price: Number(f.monthly || 0),
        yearly_price: f.yearly === "" ? null : Number(f.yearly),
        discount_percent: Number(f.discount || 0),
        offer_name: f.offerName,
        offer_ends_at: f.offerEnd || null,
        gst_inclusive: f.gstInclusive,
        is_active: f.active
      });
      showSuccess("Add-on saved");
      onSaved(r.data.data);
    } catch (e) {
      showError(errText(e, "Could not save"));
    } finally {
      setSaving(false);
    }
  };

  const m = addon.pricing.monthly;
  const y = addon.pricing.yearly;

  return (
    <div className="bg-white rounded-2xl shadow-card border border-navy-100/60 p-4 md:p-5">
      <div className="flex flex-wrap items-start justify-between gap-2 mb-3">
        <div>
          <h3 className="font-semibold text-navy-900">{addon.label}</h3>
          <p className="text-sm text-navy-500 max-w-xl">{addon.description}</p>
          <p className="text-xs text-navy-400 mt-1">Key: {addon.key} · For: {addon.segments.join(", ")}</p>
        </div>
        <div className="text-right text-sm">
          <p className="font-semibold text-emerald-700">{addon.live_count} live</p>
          <p className="text-xs text-navy-400">{addon.total_count} ever given</p>
        </div>
      </div>

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
        <div><label className={LABEL}>Monthly price (Rs)</label><input className={FIELD} type="number" min="0" step="any" value={f.monthly} onChange={(e) => set("monthly", e.target.value)} /></div>
        <div><label className={LABEL}>Yearly price (Rs, optional)</label><input className={FIELD} type="number" min="0" step="any" value={f.yearly} onChange={(e) => set("yearly", e.target.value)} placeholder="Empty = monthly x 12" /></div>
        <div><label className={LABEL}>Offer discount (%)</label><input className={FIELD} type="number" min="0" max="90" value={f.discount} onChange={(e) => set("discount", e.target.value)} /></div>
        <div><label className={LABEL}>Offer ends on</label><input className={FIELD} type="date" value={f.offerEnd} onChange={(e) => set("offerEnd", e.target.value)} /></div>
        <div className="sm:col-span-2"><label className={LABEL}>Offer name</label><input className={FIELD} maxLength={80} value={f.offerName} onChange={(e) => set("offerName", e.target.value)} placeholder="e.g. Launch Offer" /></div>
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-x-6 gap-y-2">
        <label className="inline-flex items-center gap-2 text-sm text-navy-700">
          <input type="checkbox" checked={f.gstInclusive} onChange={(e) => set("gstInclusive", e.target.checked)} />
          Price already includes GST
        </label>
        <label className="inline-flex items-center gap-2 text-sm font-medium text-navy-900">
          <input type="checkbox" checked={f.active} onChange={(e) => set("active", e.target.checked)} />
          Available for vendors to buy
        </label>
      </div>
      {!f.active && <p className="mt-1 text-xs text-amber-700">Switched off: vendors cannot see or buy it. You can still give it from the list below.</p>}

      <p className="mt-3 text-xs text-navy-500">
        Vendors will pay: {formatCurrency(m.final)}/mo · {formatCurrency(y.final)}/yr {addon.price.gst_inclusive ? "(GST included)" : "+ GST"}. A new price applies to every NEW purchase and renewal. Time a vendor has already paid for does not change.
      </p>
      <Button className="mt-3" onClick={save} loading={saving}>Save price & availability</Button>
    </div>
  );
}

/* ---------------------------------- give an add-on ---------------------------------- */

function GrantPanel({ addon, onDone, onClose }) {
  const [q, setQ] = useState("");
  const [results, setResults] = useState([]);
  const [venue, setVenue] = useState(null);
  const [mode, setMode] = useState("complimentary");
  const [cycle, setCycle] = useState("monthly");
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState("upi_manual");
  const [days, setDays] = useState("30");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (venue || q.trim().length < 2) { setResults([]); return undefined; }
    let off = false;
    const t = setTimeout(async () => {
      try {
        const r = await venueService.listAll({ search: q.trim(), limit: 8 });
        if (!off) setResults(r.data.data.venues || []);
      } catch { if (!off) setResults([]); }
    }, 300);
    return () => { off = true; clearTimeout(t); };
  }, [q, venue]);

  const submit = async () => {
    if (!venue) { showError("Choose a vendor first"); return; }
    setSaving(true);
    try {
      const r = await addonService.adminGrant({
        venue_id: venue.id, addon_key: addon.key, mode, note,
        ...(mode === "paid" ? { cycle, amount: Number(amount), method } : { days: Number(days) })
      });
      showSuccess(`${addon.label} given to ${venue.hall_name}`);
      if (r.data.data.warning) showError(r.data.data.warning);
      onDone();
    } catch (e) {
      showError(errText(e, "Could not give the add-on"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-card border border-navy-100/60 p-4 md:p-5">
      <div className="flex items-center justify-between mb-3">
        <h3 className="font-semibold text-navy-900">Give {addon.label} to a vendor</h3>
        <button type="button" onClick={onClose} className="text-sm text-navy-500">Close</button>
      </div>

      <label className={LABEL}>Vendor</label>
      {venue ? (
        <div className="flex items-center justify-between rounded-lg border border-navy-200 px-3 py-2 text-sm">
          <span><b>{venue.hall_name}</b> · {venue.city} · {venue.business_category}</span>
          <button type="button" className="text-primary-600 font-semibold" onClick={() => { setVenue(null); setQ(""); }}>Change</button>
        </div>
      ) : (
        <>
          <input className={FIELD} placeholder="Type vendor name, city or subdomain" value={q} onChange={(e) => setQ(e.target.value)} />
          {results.length > 0 && (
            <div className="mt-1 border border-navy-100 rounded-lg divide-y divide-navy-100 max-h-56 overflow-y-auto">
              {results.map((v) => (
                <button key={v.id} type="button" onClick={() => setVenue(v)} className="w-full text-left px-3 py-2 text-sm hover:bg-navy-50">
                  <b>{v.hall_name}</b> <span className="text-navy-400">· {v.city} · {v.business_category}</span>
                </button>
              ))}
            </div>
          )}
        </>
      )}

      <div className="grid sm:grid-cols-3 gap-3 mt-3">
        <div className="sm:col-span-3">
          <label className={LABEL}>How is it given?</label>
          <div className="inline-flex rounded-lg border border-navy-200 overflow-hidden text-xs font-semibold">
            {[["complimentary", "Free (complimentary)"], ["trial", "Free trial"], ["paid", "Vendor paid me"]].map(([k, l]) => (
              <button key={k} type="button" onClick={() => setMode(k)} className={`px-3 py-1.5 ${mode === k ? "bg-navy-900 text-white" : "bg-white text-navy-700"}`}>{l}</button>
            ))}
          </div>
        </div>

        {mode === "paid" ? (
          <>
            <div><label className={LABEL}>Period</label>
              <select className={FIELD} value={cycle} onChange={(e) => setCycle(e.target.value)}><option value="monthly">1 month</option><option value="yearly">1 year</option></select></div>
            <div><label className={LABEL}>Amount received (with GST)</label><input className={FIELD} type="number" min="1" step="any" value={amount} onChange={(e) => setAmount(e.target.value)} /></div>
            <div><label className={LABEL}>Received by</label>
              <select className={FIELD} value={method} onChange={(e) => setMethod(e.target.value)}><option value="upi_manual">UPI</option><option value="cash_manual">Cash</option><option value="bank_transfer">Bank transfer</option></select></div>
          </>
        ) : (
          <div><label className={LABEL}>Days</label><input className={FIELD} type="number" min="1" max="3650" value={days} onChange={(e) => setDays(e.target.value)} /></div>
        )}
        <div className="sm:col-span-3"><label className={LABEL}>Note (optional)</label><input className={FIELD} maxLength={300} value={note} onChange={(e) => setNote(e.target.value)} placeholder="e.g. Existing vendor, using it since launch" /></div>
      </div>

      <p className="mt-2 text-xs text-navy-500">If the vendor already has this add-on, the new time is added after the current end date.</p>
      <div className="mt-3 flex gap-2">
        <Button onClick={submit} loading={saving}>Give add-on</Button>
        <Button variant="outline" onClick={onClose} disabled={saving}>Cancel</Button>
      </div>
    </div>
  );
}

/* ---------------------------------- who has it ---------------------------------- */

function Holders({ addon, reloadKey, onChanged }) {
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("all");
  const [page, setPage] = useState(1);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => { setPage(1); }, [search, status, addon.key]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const r = await addonService.adminHolders(addon.key, { search: search.trim(), status, page, limit: 15 });
      setData(r.data.data);
    } catch (e) {
      showError(errText(e, "Could not load the list"));
    } finally {
      setLoading(false);
    }
  }, [addon.key, search, status, page]);

  useEffect(() => {
    const t = setTimeout(load, 250);
    return () => clearTimeout(t);
  }, [load, reloadKey]);

  const revoke = async (h) => {
    if (!window.confirm(`Stop ${addon.label} for ${h.hall_name} now? Their data is kept.`)) return;
    try {
      await addonService.adminRevoke({ venue_id: h.venue_id, addon_key: addon.key });
      showSuccess("Add-on stopped");
      onChanged();
    } catch (e) {
      showError(errText(e, "Could not stop the add-on"));
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow-card border border-navy-100/60 p-4 md:p-5">
      <div className="flex flex-wrap items-center gap-2 mb-3">
        <h3 className="font-semibold text-navy-900 mr-auto">Vendors with {addon.label}</h3>
        <input className={`${FIELD} !w-52`} placeholder="Search vendor" value={search} onChange={(e) => setSearch(e.target.value)} />
        <select className={`${FIELD} !w-32`} value={status} onChange={(e) => setStatus(e.target.value)}>
          <option value="all">All</option><option value="live">Live</option><option value="ended">Ended</option>
        </select>
      </div>

      {loading && !data ? <Loader /> : !data || data.holders.length === 0 ? (
        <p className="text-sm text-navy-400 py-6 text-center">No vendor has this add-on yet.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-xs uppercase tracking-wide text-navy-400">
                <th className="py-2 pr-3">Vendor</th><th className="pr-3">Type</th><th className="pr-3">Status</th><th className="pr-3">Ends</th><th className="pr-3">Last price</th><th />
              </tr>
            </thead>
            <tbody className="divide-y divide-navy-100">
              {data.holders.map((h) => (
                <tr key={h.id}>
                  <td className="py-2 pr-3"><p className="font-medium text-navy-900">{h.hall_name}</p><p className="text-xs text-navy-400">{h.city}{h.note ? ` · ${h.note}` : ""}</p></td>
                  <td className="pr-3 text-navy-600">{SOURCE_LABEL[h.source] || h.source}{h.billing_cycle ? ` (${h.billing_cycle})` : ""}</td>
                  <td className="pr-3"><span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${h.live ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-600"}`}>{h.live ? "Live" : h.status === "cancelled" ? "Stopped" : "Expired"}</span></td>
                  <td className="pr-3 text-navy-600">{formatDate(h.ends_at)}</td>
                  <td className="pr-3 text-navy-600">{h.locked_price ? formatCurrency(h.locked_price) : "-"}</td>
                  <td className="text-right">{h.live && <button type="button" onClick={() => revoke(h)} className="text-xs font-semibold text-red-600">Stop</button>}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {data && data.pagination.pages > 1 && (
        <div className="mt-3 flex items-center justify-between text-sm">
          <Button variant="outline" size="sm" disabled={page <= 1} onClick={() => setPage((p) => p - 1)}>Previous</Button>
          <span className="text-navy-500">Page {data.pagination.page} of {data.pagination.pages}</span>
          <Button variant="outline" size="sm" disabled={page >= data.pagination.pages} onClick={() => setPage((p) => p + 1)}>Next</Button>
        </div>
      )}
    </div>
  );
}

/* ---------------------------------- page ---------------------------------- */

export default function AddonManager() {
  const [list, setList] = useState(null);
  const [selected, setSelected] = useState(null);
  const [granting, setGranting] = useState(false);
  const [reloadKey, setReloadKey] = useState(0);

  const load = useCallback(async () => {
    try {
      const r = await addonService.adminList();
      setList(r.data.data || []);
      setSelected((cur) => cur || (r.data.data && r.data.data[0] ? r.data.data[0].key : null));
    } catch (e) {
      showError(errText(e, "Could not load add-ons"));
      setList([]);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const addon = (list || []).find((a) => a.key === selected) || null;
  const refreshAll = () => { setReloadKey((k) => k + 1); load(); };

  return (
    <DashboardLayout sidebarItems={adminSidebarItems} title="Add-ons">
      <div className="max-w-5xl space-y-4">
        <p className="text-sm text-navy-500">
          Add-ons are extra features sold on top of a plan. Set the price here: it applies to every new purchase and renewal. Vendors of other business types never see an add-on that is not meant for them.
        </p>

        {!list ? <Loader /> : list.length === 0 ? (
          <p className="text-sm text-navy-400">No add-ons are defined yet.</p>
        ) : (
          <>
            <div className="flex flex-wrap items-center gap-2">
              {list.map((a) => (
                <button key={a.key} type="button" onClick={() => { setSelected(a.key); setGranting(false); }}
                  className={`px-3 py-1.5 rounded-lg border text-sm font-semibold ${selected === a.key ? "bg-navy-900 text-white border-navy-900" : "bg-white text-navy-700 border-navy-200"}`}>
                  {a.label}
                </button>
              ))}
              {addon && !granting && <Button className="ml-auto" onClick={() => setGranting(true)}>Give to a vendor</Button>}
            </div>

            {addon && (
              <>
                {granting && <GrantPanel addon={addon} onClose={() => setGranting(false)} onDone={() => { setGranting(false); refreshAll(); }} />}
                <PriceEditor addon={addon} onSaved={(updated) => setList((cur) => cur.map((a) => (a.key === updated.key ? updated : a)))} />
                <Holders addon={addon} reloadKey={reloadKey} onChanged={refreshAll} />
              </>
            )}
          </>
        )}
      </div>
    </DashboardLayout>
  );
}
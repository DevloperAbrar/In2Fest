import React, { useCallback, useEffect, useState } from "react";
import { Copy, Download, Printer, Trash2, Plus } from "lucide-react";
import { useVenue } from "../../../context/VenueContext.jsx";
import { foodService } from "../../../services/foodService";
import Card from "../../../components/common/Card";
import Button from "../../../components/common/Button";
import Input from "../../../components/common/Input";
import Select from "../../../components/common/Select";
import Modal from "../../../components/common/Modal";
import Loader from "../../../components/common/Loader";
import { showSuccess, showError } from "../../../components/common/Toast";
import { FoodPage, Field, Toggle, errMsg, copyText, downloadBlob, siteBase, useFoodContext } from "./foodShared.jsx";

const blobToDataUrl = (blob) => new Promise((resolve, reject) => {
  const r = new FileReader();
  r.onload = () => resolve(r.result);
  r.onerror = reject;
  r.readAsDataURL(blob);
});

export default function FoodSetup() {
  const { venue } = useVenue();
  const vid = venue?.id;
  const { data: ctx, refetch } = useFoodContext(vid);
  const unitInfo = ctx?.subtype?.unit;

  const [form, setForm] = useState(null);
  const [saving, setSaving] = useState(false);
  const [tables, setTables] = useState([]);
  const [units, setUnits] = useState([]);
  const [tableForm, setTableForm] = useState({ count: "", name: "", section: "" });
  const [unit, setUnit] = useState(null);

  useEffect(() => { if (ctx && !form) setForm({ ...ctx.settings }); }, [ctx, form]);

  const loadLists = useCallback(async () => {
    if (!vid) return;
    try {
      const [t, u] = await Promise.all([foodService.tables(vid), foodService.units(vid)]);
      setTables(t.data.data); setUnits(u.data.data);
    } catch (e) { showError(errMsg(e)); }
  }, [vid]);
  useEffect(() => { loadLists(); }, [loadLists]);

  const run = async (fn, ok) => { try { await fn(); if (ok) showSuccess(ok); loadLists(); } catch (e) { showError(errMsg(e)); } };

  if (!ctx || !form) return <FoodPage title="Setup"><Loader /></FoodPage>;
  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));
  const flag = (k) => (v) => setForm((f) => ({ ...f, [k]: v }));
  const link = siteBase(venue);

  const save = async () => {
    setSaving(true);
    try { await foodService.saveSettings(vid, form); showSuccess("Settings saved"); refetch(); }
    catch (e) { showError(errMsg(e)); } finally { setSaving(false); }
  };

  const qr = async (t) => {
    try { downloadBlob((await foodService.tableQr(vid, t.id, link)).data, `table-${t.name}.png`); }
    catch (e) { showError(errMsg(e)); }
  };

  const printSheet = async () => {
    try {
      const cards = [];
      for (const t of tables) {
        const blob = (await foodService.tableQr(vid, t.id, link)).data;
        cards.push({ name: t.name, src: await blobToDataUrl(blob) });
      }
      const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
      const w = window.open("", "_blank");
      if (!w) return showError("Allow pop-ups to print");
      w.document.write(`<!doctype html><html><head><title>Table QR codes</title><style>body{font-family:system-ui,sans-serif;margin:16px}
.g{display:grid;grid-template-columns:repeat(3,1fr);gap:16px}.c{border:2px solid #111;border-radius:14px;padding:12px;text-align:center;break-inside:avoid}
.c img{width:100%}h2{margin:6px 0 0;font-size:22px}p{margin:2px 0;font-size:12px}</style></head><body>
<div class="g">${cards.map((c) => `<div class="c"><p><b>${esc(venue.hall_name)}</b></p><img src="${c.src}"/><h2>Table ${esc(c.name)}</h2><p>Scan to see the menu and order</p></div>`).join("")}</div></body></html>`);
      w.document.close();
      setTimeout(() => w.print(), 500);
    } catch (e) { showError(errMsg(e, "Could not prepare the QR sheet")); }
  };

  return (
    <FoodPage title="Setup" subtitle="Ordering rules, tax, tables and more" actions={<Button loading={saving} onClick={save}>Save settings</Button>}>
      <Card title="Your ordering link" className="mb-4">
        <p className="text-sm text-gray-600 mb-2">Put this link on Instagram, Google Business Profile and your WhatsApp status. Orders from it have no commission.</p>
        <div className="flex gap-2">
          <input readOnly value={link} className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm bg-gray-50" />
          <Button variant="outline" onClick={async () => ((await copyText(link)) ? showSuccess("Copied") : showError("Could not copy"))}><Copy size={14} /> Copy</Button>
        </div>
      </Card>

      <div className="grid md:grid-cols-2 gap-4 mb-4">
        <Card title="Online ordering">
          <Toggle label="Accepting online orders" hint="Turn off when the kitchen is closed or too busy" checked={form.accepting_orders} onChange={flag("accepting_orders")} />
          <Toggle label="Home delivery" checked={form.allow_delivery} onChange={flag("allow_delivery")} />
          <Toggle label="Takeaway / pickup" checked={form.allow_pickup} onChange={flag("allow_pickup")} />
          <Toggle label="Dine-in by table QR" checked={form.allow_dine_in} onChange={flag("allow_dine_in")} />
          <div className="grid grid-cols-2 gap-3 mt-3">
            <Input label="Minimum order (₹)" type="number" value={form.min_order} onChange={set("min_order")} />
            <Input label="Prep time (minutes)" type="number" value={form.prep_time_min} onChange={set("prep_time_min")} />
            <Input label="Delivery charge (₹)" type="number" value={form.delivery_fee} onChange={set("delivery_fee")} />
            <Input label="Free delivery above (₹)" type="number" value={form.free_delivery_above} onChange={set("free_delivery_above")} />
            <Input label="Packing charge (₹)" type="number" value={form.packing_fee} onChange={set("packing_fee")} />
          </div>
          <div className="mt-3"><Input label="Delivery note shown to customers" value={form.delivery_note || ""} onChange={set("delivery_note")} placeholder="e.g. Delivery within 5 km" /></div>
        </Card>
        <Card title="Online ordering">
          <Toggle label="Accepting online orders" hint="Turn off when the kitchen is closed or too busy" checked={form.accepting_orders} onChange={flag("accepting_orders")} />
          <Toggle label="Takeaway / pickup" checked={form.allow_pickup} onChange={flag("allow_pickup")} />
          <Toggle label="Dine-in by table QR" checked={form.allow_dine_in} onChange={flag("allow_dine_in")} />
          <div className="grid grid-cols-2 gap-3 mt-3">
            <Input label="Minimum order (₹)" type="number" value={form.min_order} onChange={set("min_order")} />
            <Input label="Default prep time (minutes)" type="number" value={form.prep_time_min} onChange={set("prep_time_min")} />
            <Input label="Packing charge (₹)" type="number" value={form.packing_fee} onChange={set("packing_fee")} />
          </div>
        </Card>
        <Card title="Tax and bill">
          {!ctx.tax_on && form.gst_scheme === "regular" && (
            <p className="text-xs bg-amber-50 text-amber-800 rounded-lg px-3 py-2 mb-3">GST is not being added to bills. Turn on GST and add your GSTIN in Settings → GST.</p>
          )}
          <Select label="GST scheme" value={form.gst_scheme} onChange={set("gst_scheme")}
            options={[{ value: "regular", label: "Regular (GST shown on bill)" }, { value: "composition", label: "Composition (Bill of Supply, no GST charged)" }]} />
          <div className="grid grid-cols-2 gap-3 mt-3">
            <Input label="Default GST on food (%)" type="number" value={form.default_tax_rate} onChange={set("default_tax_rate")} />
            <Input label="Service charge (%)" type="number" value={form.service_charge_percent} onChange={set("service_charge_percent")} />
          </div>
          <Toggle label="My menu prices already include GST" checked={form.prices_include_tax} onChange={flag("prices_include_tax")} />
          <p className="text-[11px] text-gray-400 mb-3">Confirm the right rate for your type of business with your CA. Standalone restaurants and hotel restaurants can be taxed differently.</p>
          <Input label="FSSAI licence number (14 digits)" value={form.fssai_no || ""} onChange={set("fssai_no")} />
          <div className="mt-3"><Input label="Bill footer" value={form.bill_footer || ""} onChange={set("bill_footer")} placeholder="Thank you! Visit again." /></div>
          <div className="mt-3"><Input label="Zomato / Swiggy commission (%)" type="number" value={form.aggregator_commission} onChange={set("aggregator_commission")} /></div>
          <p className="text-[11px] text-gray-400 mt-1">Used to show how much your own website saves you.</p>
        </Card>
      </div>

      {ctx.subtype.tables && (
        <Card title="Tables and QR menus" className="mb-4"
          action={tables.length > 0 && <Button variant="outline" onClick={printSheet}><Printer size={14} /> Print QR sheet</Button>}>
          <div className="flex flex-wrap items-end gap-2 mb-4">
            <div className="w-32"><Input label="Add tables 1 to" type="number" value={tableForm.count} onChange={(e) => setTableForm({ ...tableForm, count: e.target.value })} placeholder="e.g. 12" /></div>
            <Button variant="outline" onClick={() => run(async () => { await foodService.createTables(vid, { count: tableForm.count }); setTableForm({ ...tableForm, count: "" }); }, "Tables added")}>Add</Button>
            <div className="w-32 ml-3"><Input label="Or one table" value={tableForm.name} onChange={(e) => setTableForm({ ...tableForm, name: e.target.value })} placeholder="e.g. Garden 1" /></div>
            <Button variant="outline" onClick={() => run(async () => { await foodService.createTables(vid, { name: tableForm.name }); setTableForm({ ...tableForm, name: "" }); }, "Table added")}>Add</Button>
          </div>
          {tables.length === 0 ? <p className="text-sm text-gray-400">No tables yet. Customers scan the QR on their table, order from their phone and the order reaches your kitchen screen.</p> : (
            <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-6 gap-2">
              {tables.map((t) => (
                <div key={t.id} className="border rounded-xl p-2 text-center">
                  <p className="font-semibold text-sm">{t.name}</p>
                  <div className="flex justify-center gap-3 mt-1.5">
                    <button title="Download QR" onClick={() => qr(t)} className="text-primary-600"><Download size={15} /></button>
                    <button title="Delete" onClick={() => { if (window.confirm(`Delete table ${t.name}?`)) run(() => foodService.deleteTable(vid, t.id), "Deleted"); }} className="text-red-500"><Trash2 size={15} /></button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {unitInfo && (
        <Card title={unitInfo.many} className="mb-4" action={<Button variant="outline" onClick={() => setUnit({ name: "", contact_name: "", phone: "", share_percent: "" })}><Plus size={14} /> Add {unitInfo.one.toLowerCase()}</Button>}>
          <p className="text-xs text-gray-500 mb-3">{unitInfo.shareHint} Assign dishes to a {unitInfo.one.toLowerCase()} in the Menu tab. The settlement shows in Overview → Sales report.</p>
          {units.length === 0 ? <p className="text-sm text-gray-400">No {unitInfo.many.toLowerCase()} yet.</p> : (
            <div className="divide-y">
              {units.map((u) => (
                <div key={u.id} className="py-2.5 flex items-center justify-between gap-3">
                  <div><p className="text-sm font-medium">{u.name}</p><p className="text-xs text-gray-500">{u.contact_name || "-"} {u.phone || ""} · share {Number(u.share_percent)}%</p></div>
                  <div className="flex gap-3 text-xs">
                    <button className="underline text-gray-600" onClick={() => setUnit({ ...u, contact_name: u.contact_name || "", phone: u.phone || "" })}>Edit</button>
                    <button className="underline text-red-600" onClick={() => { if (window.confirm(`Remove ${u.name}?`)) run(() => foodService.deleteUnit(vid, u.id), "Removed"); }}>Remove</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      <Modal isOpen={!!unit} onClose={() => setUnit(null)} title={unit?.id ? `Edit ${unitInfo?.one || ""}` : `Add ${unitInfo?.one || ""}`} size="sm">
        {unit && (
          <div className="space-y-3">
            <Input label="Name" value={unit.name} onChange={(e) => setUnit({ ...unit, name: e.target.value })} />
            <Input label="Contact person" value={unit.contact_name} onChange={(e) => setUnit({ ...unit, contact_name: e.target.value })} />
            <Input label="Phone" value={unit.phone} maxLength={10} onChange={(e) => setUnit({ ...unit, phone: e.target.value })} />
            <Field label={unitInfo?.shareLabel || "Share (%)"}>
              <input type="number" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm" value={unit.share_percent} onChange={(e) => setUnit({ ...unit, share_percent: e.target.value })} />
            </Field>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => setUnit(null)}>Cancel</Button>
              <Button onClick={() => run(async () => {
                const body = { name: unit.name, contact_name: unit.contact_name, phone: unit.phone, share_percent: unit.share_percent || 0 };
                if (unit.id) await foodService.updateUnit(vid, unit.id, body); else await foodService.createUnit(vid, body);
                setUnit(null);
              }, "Saved")}>Save</Button>
            </div>
          </div>
        )}
      </Modal>
    </FoodPage>
  );
}
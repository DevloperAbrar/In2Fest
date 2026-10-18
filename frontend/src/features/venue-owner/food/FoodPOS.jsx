import React, { useEffect, useMemo, useState } from "react";
import { Plus, Minus, Search, X } from "lucide-react";
import { useVenue } from "../../../context/VenueContext.jsx";
import { foodService } from "../../../services/foodService";
import Button from "../../../components/common/Button";
import Input from "../../../components/common/Input";
import Select from "../../../components/common/Select";
import Modal from "../../../components/common/Modal";
import Loader from "../../../components/common/Loader";
import { showSuccess, showError } from "../../../components/common/Toast";
import { FoodPage, FoodDot, inr, inr2, errMsg, useFoodContext, printTicket, PAY_MODES } from "./foodShared.jsx";

const TYPES = [["dine_in", "Dine-in"], ["takeaway", "Takeaway"]];
const SOURCES = [{ value: "pos", label: "Counter / phone" }, { value: "zomato", label: "Zomato" }, { value: "swiggy", label: "Swiggy" }, { value: "other_app", label: "Other app" }];

export default function FoodPOS() {
  const { venue } = useVenue();
  const vid = venue?.id;
  const { data: ctx } = useFoodContext(vid);
  const unitInfo = ctx?.subtype?.unit;
  const roomTabsOn = Boolean(ctx?.subtype?.room_tabs);

  const [cats, setCats] = useState([]);
  const [items, setItems] = useState([]);
  const [tables, setTables] = useState([]);
  const [units, setUnits] = useState([]);
  const [ready, setReady] = useState(false);

  const [cat, setCat] = useState("all");
  const [q, setQ] = useState("");
  const [vegOnly, setVegOnly] = useState(false);
  const [pick, setPick] = useState(null);

  const [cart, setCart] = useState([]);
  const [type, setType] = useState("dine_in");
  const [source, setSource] = useState("pos");
  const [table, setTable] = useState("");
  const [unitId, setUnitId] = useState("");
  const [cust, setCust] = useState({ name: "", phone: "", address: "" });
  const [service, setService] = useState(false);
  const [disc, setDisc] = useState({ type: "none", value: "" });
  const [payMode, setPayMode] = useState("cash");
  const [roomNo, setRoomNo] = useState("");
  const [custom, setCustom] = useState({ name: "", price: "" });
  const [bill, setBill] = useState(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!vid) return;
    Promise.all([foodService.categories(vid), foodService.items(vid), foodService.tables(vid), foodService.units(vid)])
      .then(([c, i, t, u]) => { setCats(c.data.data); setItems(i.data.data); setTables(t.data.data); setUnits(u.data.data); setReady(true); })
      .catch(() => showError("Could not load the menu"));
  }, [vid]);

  const payload = (extra = {}) => ({
    order_type: type, source, table: type === "dine_in" ? table : undefined, unit_id: unitId || undefined,
    customer: cust, service_charge: service, discount_type: disc.type, discount_value: disc.value === "" ? 0 : disc.value,
    items: cart.map((l) => (l.item_id ? { item_id: l.item_id, variant: l.variant, qty: l.qty } : { name: l.name, price: l.price, qty: l.qty })),
    ...extra
  });

  // The server prices the bill, so what you see is exactly what gets billed.
  useEffect(() => {
    if (!vid || cart.length === 0) { setBill(null); return undefined; }
    const t = setTimeout(() => {
      foodService.preview(vid, payload()).then((r) => setBill(r.data.data)).catch(() => setBill(null));
    }, 300);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [vid, cart, type, service, disc.type, disc.value]);

  const shown = useMemo(() => items.filter((i) =>
    (cat === "all" || (cat === "none" ? !i.category_id : i.category_id === cat)) &&
    (!vegOnly || i.food_type === "veg") && (!q || i.name.toLowerCase().includes(q.toLowerCase()))), [items, cat, vegOnly, q]);

  const add = (item, variant) => {
    const price = variant ? variant.price : item.price;
    const key = `${item.id}|${variant?.name || ""}`;
    setCart((c) => (c.some((l) => l.key === key) ? c.map((l) => (l.key === key ? { ...l, qty: l.qty + 1 } : l)) : [...c, { key, item_id: item.id, name: item.name, variant: variant?.name || "", price, qty: 1, food_type: item.food_type }]));
  };
  const clickItem = (item) => {
    if (!item.is_available) return showError(`${item.name} is marked sold out`);
    if (item.variants?.length) setPick(item); else add(item);
  };
  const change = (key, d) => setCart((c) => c.map((l) => (l.key === key ? { ...l, qty: l.qty + d } : l)).filter((l) => l.qty > 0));
  const addCustom = () => {
    if (!custom.name.trim() || custom.price === "") return;
    setCart((c) => [...c, { key: `c${Date.now()}`, name: custom.name.trim(), price: Number(custom.price), qty: 1 }]);
    setCustom({ name: "", price: "" });
  };

  const reset = () => { setCart([]); setCust({ name: "", phone: "", address: "" }); setDisc({ type: "none", value: "" }); setService(false); setTable(""); setRoomNo(""); setBill(null); };

  const submit = async (settle) => {
    if (cart.length === 0) return showError("Add items first");
    if (type === "dine_in" && tables.length > 0 && !table && source === "pos") { /* table is optional at the counter */ }
    if (settle && payMode === "room" && !roomNo.trim()) return showError("Enter the room number");
    setBusy(true);
    try {
      const body = payload(settle ? { status: "completed", pay: { mode: payMode, room_no: roomNo } } : { status: "preparing" });
      const order = (await foodService.createOrder(vid, body)).data.data;
      showSuccess(`Order #${order.order_no} saved`);
      if (!printTicket(order, ctx, settle ? "bill" : "kot")) showError("Allow pop-ups to print");
      reset();
    } catch (e) { showError(errMsg(e)); } finally { setBusy(false); }
  };

  if (!ready) return <FoodPage title="POS billing"><Loader /></FoodPage>;

  return (
    <FoodPage title="POS billing" subtitle="Counter, phone and delivery-app orders. Everything lands in one report.">
      <div className="grid lg:grid-cols-[1fr_390px] gap-4">
        <div>
          <div className="flex flex-wrap gap-2 mb-3 items-center">
            <div className="relative flex-1 min-w-[160px]"><Search size={14} className="absolute left-3 top-3 text-gray-400" /><input value={q} onChange={(e) => setQ(e.target.value)} placeholder="Search dish" className="w-full pl-8 pr-3 py-2 border border-gray-300 rounded-lg text-sm" /></div>
            <button onClick={() => setVegOnly(!vegOnly)} className={`px-3 py-2 rounded-lg text-sm border ${vegOnly ? "bg-green-600 text-white border-green-600" : "text-gray-600"}`}>Veg only</button>
          </div>
          <div className="flex gap-1.5 overflow-x-auto pb-2 mb-2">
            {[["all", "All"], ...cats.map((c) => [c.id, c.name]), ["none", "Others"]].map(([id, name]) => (
              <button key={id} onClick={() => setCat(id)} className={`px-3 py-1 rounded-full text-xs whitespace-nowrap border ${cat === id ? "bg-primary-600 text-white border-primary-600" : "text-gray-600"}`}>{name}</button>
            ))}
          </div>
          {items.length === 0 ? <p className="text-sm text-gray-500 py-10 text-center">Your menu is empty. Add dishes in the Menu tab first.</p> : (
            <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 gap-2">
              {shown.map((i) => (
                <button key={i.id} onClick={() => clickItem(i)} className={`text-left bg-white border rounded-xl p-3 active:scale-95 transition ${i.is_available ? "" : "opacity-40"}`}>
                  <div className="flex items-center gap-1.5"><FoodDot type={i.food_type} /><span className="text-sm font-medium text-gray-900 leading-tight">{i.name}</span></div>
                  <p className="text-xs text-gray-500 mt-1">{i.variants?.length ? `from ${inr(i.price)}` : inr(i.price)}</p>
                </button>
              ))}
            </div>
          )}
          <div className="mt-4 flex gap-2 items-end">
            <div className="flex-1"><Input label="Open item (not on menu)" value={custom.name} onChange={(e) => setCustom({ ...custom, name: e.target.value })} placeholder="Item name" /></div>
            <div className="w-24"><Input label="Price" type="number" value={custom.price} onChange={(e) => setCustom({ ...custom, price: e.target.value })} /></div>
            <Button variant="outline" onClick={addCustom}>Add</Button>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-navy-100/60 p-4 h-fit lg:sticky lg:top-4">
          <div className="flex gap-1 mb-3 bg-gray-100 p-1 rounded-xl">
            {TYPES.map(([k, l]) => <button key={k} onClick={() => setType(k)} className={`flex-1 py-1.5 rounded-lg text-sm font-medium ${type === k ? "bg-white shadow text-gray-900" : "text-gray-500"}`}>{l}</button>)}
          </div>
          <div className="grid grid-cols-2 gap-2 mb-3">
            <Select value={source} onChange={(e) => setSource(e.target.value)} options={SOURCES} />
            {type === "dine_in" && <Select value={table} onChange={(e) => setTable(e.target.value)} options={[{ value: "", label: "Table (optional)" }, ...tables.map((t) => ({ value: t.name, label: t.name }))]} />}
            {unitInfo && <Select value={unitId} onChange={(e) => setUnitId(e.target.value)} options={[{ value: "", label: `${unitInfo.one}` }, ...units.map((u) => ({ value: u.id, label: u.name }))]} />}
          </div>

          <div className="max-h-56 overflow-y-auto divide-y">
            {cart.length === 0 && <p className="text-sm text-gray-400 py-6 text-center">Tap dishes to add them</p>}
            {cart.map((l) => (
              <div key={l.key} className="py-2 flex items-center gap-2">
                <FoodDot type={l.food_type} />
                <div className="flex-1 min-w-0"><p className="text-sm truncate">{l.name}{l.variant && ` (${l.variant})`}</p><p className="text-xs text-gray-500">{inr(l.price)}</p></div>
                <button onClick={() => change(l.key, -1)} className="w-7 h-7 rounded-full border flex items-center justify-center"><Minus size={13} /></button>
                <span className="w-5 text-center text-sm font-semibold">{l.qty}</span>
                <button onClick={() => change(l.key, 1)} className="w-7 h-7 rounded-full border flex items-center justify-center"><Plus size={13} /></button>
              </div>
            ))}
          </div>

          {cart.length > 0 && (
            <div className="mt-3 space-y-2">
              <div className="grid grid-cols-2 gap-2">
                <Input placeholder="Customer phone" inputMode="numeric" maxLength={10} value={cust.phone} onChange={(e) => setCust({ ...cust, phone: e.target.value })} />
                <Input placeholder="Name" value={cust.name} onChange={(e) => setCust({ ...cust, name: e.target.value })} />
              </div>
              {type === "delivery" && <Input placeholder="Delivery address" value={cust.address} onChange={(e) => setCust({ ...cust, address: e.target.value })} />}
              <div className="flex gap-2 items-center">
                <select value={disc.type} onChange={(e) => setDisc({ ...disc, type: e.target.value })} className="px-2 py-2 border border-gray-300 rounded-lg text-sm">
                  <option value="none">No discount</option><option value="flat">Discount ₹</option><option value="percentage">Discount %</option>
                </select>
                {disc.type !== "none" && <input type="number" value={disc.value} onChange={(e) => setDisc({ ...disc, value: e.target.value })} className="w-20 px-2 py-2 border border-gray-300 rounded-lg text-sm" />}
                {Number(ctx?.settings?.service_charge_percent) > 0 && (
                  <label className="flex items-center gap-1 text-xs text-gray-600 ml-auto"><input type="checkbox" checked={service} onChange={(e) => setService(e.target.checked)} /> Service {ctx.settings.service_charge_percent}%</label>
                )}
              </div>
            </div>
          )}

          {bill && (
            <div className="mt-3 text-sm space-y-1 border-t pt-3">
              {bill.lines.filter((l) => l.kind === "charge").map((l, i) => <div key={i} className="flex justify-between text-gray-600"><span>{l.name}</span><span>{inr2(l.amount)}</span></div>)}
              <div className="flex justify-between text-gray-600"><span>Subtotal</span><span>{inr2(bill.subtotal)}</span></div>
              {bill.discount_amount > 0 && <div className="flex justify-between text-gray-600"><span>Discount</span><span>-{inr2(bill.discount_amount)}</span></div>}
              {bill.cgst + bill.sgst > 0 && <div className="flex justify-between text-gray-600"><span>GST</span><span>{inr2(bill.cgst + bill.sgst)}</span></div>}
              <div className="flex justify-between text-lg font-bold text-gray-900"><span>Total</span><span>{inr2(bill.total)}</span></div>
              {!bill.gst_on && <p className="text-[11px] text-gray-400">No GST is added. Turn on GST and add your GSTIN in Settings to bill with tax.</p>}
            </div>
          )}

          {cart.length > 0 && (
            <div className="mt-3 space-y-2">
              <div className="flex gap-2">
                <Select value={payMode} onChange={(e) => setPayMode(e.target.value)} options={[...PAY_MODES, ...(roomTabsOn ? [{ value: "room", label: "Charge to room" }] : [])]} />
                {payMode === "room" && <Input placeholder="Room no." value={roomNo} onChange={(e) => setRoomNo(e.target.value)} />}
              </div>
              <div className="grid grid-cols-2 gap-2">
                <Button variant="outline" loading={busy} onClick={() => submit(false)}>Send to kitchen</Button>
                <Button loading={busy} onClick={() => submit(true)}>Settle &amp; bill</Button>
              </div>
              <button onClick={reset} className="w-full text-xs text-gray-400 flex items-center justify-center gap-1"><X size={12} /> Clear bill</button>
            </div>
          )}
        </div>
      </div>

      <Modal isOpen={!!pick} onClose={() => setPick(null)} title={pick?.name || ""} size="sm">
        <div className="space-y-2">
          {(pick?.variants || []).map((v) => (
            <button key={v.name} onClick={() => { add(pick, v); setPick(null); }} className="w-full flex justify-between items-center px-4 py-3 border rounded-xl hover:bg-gray-50"><span className="font-medium">{v.name}</span><span>{inr(v.price)}</span></button>
          ))}
        </div>
      </Modal>
    </FoodPage>
  );
}
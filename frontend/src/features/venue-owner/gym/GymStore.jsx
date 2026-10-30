import React, { useEffect, useMemo, useRef, useState } from "react";
import { Plus, Search, Pencil, Trash2, PackagePlus, Upload, X, MessageCircle, FileText, Minus, Loader2 } from "lucide-react";
import { useVenue } from "../../../context/VenueContext.jsx";
import { useFetch } from "../../../hooks/useFetch";
import { gymService } from "../../../services/gymService";
import Button from "../../../components/common/Button";
import Card from "../../../components/common/Card";
import Input from "../../../components/common/Input";
import Select from "../../../components/common/Select";
import Modal from "../../../components/common/Modal";
import Loader from "../../../components/common/Loader";
import EmptyState from "../../../components/common/EmptyState";
import KpiCard from "../../../components/common/KpiCard";
import { showSuccess, showError } from "../../../components/common/Toast";
import { GymPage, Field, TextArea, MODES, inr, fmtDate, errMsg, todayISO, downloadBlob, waUrl } from "./gymShared.jsx";

const num = (v) => (v === "" || v == null ? 0 : Number(v));
const STATUS_CLS = { ok: "bg-green-100 text-green-700", low: "bg-amber-100 text-amber-700", out: "bg-red-100 text-red-700" };
const STATUS_TXT = { ok: "In stock", low: "Low stock", out: "Out of stock" };
const chip = (on) => `px-3 py-1.5 rounded-full text-sm font-medium border whitespace-nowrap ${on ? "bg-primary-600 text-white border-primary-600" : "bg-white text-gray-600 border-gray-200"}`;
const Pill = ({ s }) => <span className={`inline-block px-2 py-0.5 rounded-full text-[11px] font-medium ${STATUS_CLS[s]}`}>{STATUS_TXT[s]}</span>;

/* ---------- image upload ---------- */
function ImageBox({ vid, value, onChange }) {
  const ref = useRef(null);
  const [busy, setBusy] = useState(false);
  const pick = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    setBusy(true);
    try { onChange((await gymService.storeUpload(vid, file)).data.data.url); } catch (er) { showError(errMsg(er, "Upload failed. Use JPG, PNG or WEBP.")); } finally { setBusy(false); }
  };
  return (
    <div className="relative w-24 h-24 flex-shrink-0">
      {value ? (
        <>
          <img src={value} alt="" className="w-24 h-24 rounded-xl object-cover border" />
          <button type="button" onClick={() => onChange("")} className="absolute -top-2 -right-2 bg-white border rounded-full p-1"><X size={12} /></button>
        </>
      ) : (
        <button type="button" onClick={() => ref.current?.click()} className="w-24 h-24 rounded-xl border-2 border-dashed text-gray-400 flex flex-col items-center justify-center text-xs gap-1">
          {busy ? <Loader2 size={18} className="animate-spin" /> : <Upload size={18} />}{busy ? "Uploading" : "Photo"}
        </button>
      )}
      <input ref={ref} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={pick} />
    </div>
  );
}

/* ---------- overview ---------- */
function Overview({ vid, go }) {
  const { data: d, loading } = useFetch(`/venues/${vid}/gym/store/overview`);
  if (loading || !d) return <Loader />;
  return (
    <>
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-4">
        <KpiCard label="Sales today" value={inr(d.today.total)} sublabel={`${d.today.bills} bills`} accent="#16a34a" />
        <KpiCard label="Sales this month" value={inr(d.month.total)} sublabel={`${d.month.bills} bills · profit ${inr(d.month.profit)}`} accent="#2563eb" />
        <KpiCard label="Stock value (cost)" value={inr(d.stock.cost_value)} sublabel={`${d.stock.units} units · sells for ${inr(d.stock.retail_value)}`} accent="#7c3aed" />
        <KpiCard label="Store dues" value={inr(d.dues.total)} sublabel={`${d.dues.bills} bills`} accent="#dc2626" />
      </div>
      <div className="grid md:grid-cols-3 gap-3">
        <Card title={`Low / out of stock (${d.stock.low + d.stock.out})`}>
          {d.low_list.length === 0 ? <p className="text-sm text-gray-400">Everything is well stocked.</p> : d.low_list.map((r) => (
            <div key={r.variant_id} className="py-2 flex justify-between gap-2 border-b last:border-0 text-sm">
              <span className="truncate">{r.name} <span className="text-gray-400">{r.label}</span></span>
              <span className={r.status === "out" ? "text-red-600 font-semibold" : "text-amber-600 font-semibold"}>{r.stock_qty}</span>
            </div>
          ))}
          {d.low_list.length > 0 && <button onClick={() => go("products", "low")} className="text-xs text-primary-600 font-medium mt-2">View products →</button>}
        </Card>
        <Card title="Expiring soon (60 days)">
          {d.expiring.length === 0 ? <p className="text-sm text-gray-400">Nothing close to expiry.</p> : d.expiring.map((r) => (
            <div key={r.variant_id} className="py-2 flex justify-between gap-2 border-b last:border-0 text-sm">
              <span className="truncate">{r.name} <span className="text-gray-400">{r.label}</span></span>
              <span className={r.state === "expired" ? "text-red-600 font-semibold" : "text-amber-600"}>{fmtDate(r.expiry_date)}</span>
            </div>
          ))}
        </Card>
        <Card title="Best sellers (30 days)">
          {d.top_sellers.length === 0 ? <p className="text-sm text-gray-400">No sales yet.</p> : d.top_sellers.map((r, i) => (
            <div key={i} className="py-2 flex justify-between gap-2 border-b last:border-0 text-sm">
              <span className="truncate">{r.name} <span className="text-gray-400">{r.label}</span></span>
              <span className="font-semibold">{r.qty} sold</span>
            </div>
          ))}
        </Card>
      </div>
    </>
  );
}

/* ---------- categories ---------- */
function CategoryModal({ vid, onClose, onDone }) {
  const { data, refetch } = useFetch(`/venues/${vid}/gym/store/categories`);
  const [name, setName] = useState("");
  const run = async (fn) => { try { await fn(); refetch(); onDone(); } catch (e) { showError(errMsg(e)); } };
  return (
    <Modal isOpen onClose={onClose} title="Categories" size="md">
      <div className="flex gap-2 mb-3">
        <Input placeholder="New category, e.g. Protein Bars" value={name} onChange={(e) => setName(e.target.value)} />
        <Button disabled={name.trim().length < 2} onClick={() => run(async () => { await gymService.storePost(vid, "/categories", { name }); setName(""); })}>Add</Button>
      </div>
      {!data ? <Loader /> : data.map((c) => (
        <div key={c.id} className="flex items-center gap-2 py-2 border-b last:border-0">
          <input defaultValue={c.name} onBlur={(e) => e.target.value.trim() && e.target.value !== c.name && run(() => gymService.storePatch(vid, `/categories/${c.id}`, { name: e.target.value }))}
            className="flex-1 px-2 py-1 border border-transparent hover:border-gray-300 rounded text-sm" />
          <span className="text-xs text-gray-400">{c.product_count} items</span>
          <label className="text-xs text-gray-500 flex items-center gap-1">
            <input type="checkbox" checked={c.is_active} onChange={(e) => run(() => gymService.storePatch(vid, `/categories/${c.id}`, { is_active: e.target.checked }))} /> Show
          </label>
          <button onClick={() => window.confirm("Delete this category?") && run(() => gymService.storeDelete(vid, `/categories/${c.id}`))} className="p-1 text-gray-400 hover:text-red-600"><Trash2 size={15} /></button>
        </div>
      ))}
    </Modal>
  );
}

/* ---------- add / edit product ---------- */
const blankVariant = () => ({ label: "", sku: "", mrp: "", price: "", cost_price: "", stock_qty: "", low_stock_threshold: "", expiry_date: "", is_active: true });

function ProductModal({ vid, product, cats, onClose, onDone }) {
  const [f, setF] = useState(() => product ? {
    name: product.name, brand: product.brand || "", category_id: product.category_id || "", description: product.description || "",
    highlights: (product.highlights || []).join("\n"), image_url: product.image_url || "", gallery: product.gallery || [],
    offer_label: product.offer_label || "", offer_ends_on: product.offer_ends_on || "", tax_rate: product.tax_rate, hsn: product.hsn || "",
    is_featured: product.is_featured, is_active: product.is_active, show_on_website: product.show_on_website
  } : {
    name: "", brand: "", category_id: "", description: "", highlights: "", image_url: "", gallery: [], offer_label: "", offer_ends_on: "",
    tax_rate: 18, hsn: "", is_featured: false, is_active: true, show_on_website: true
  });
  const [vars, setVars] = useState(() => product ? product.variants.map((v) => ({ ...v, mrp: v.mrp ?? "", expiry_date: v.expiry_date || "", low_stock_threshold: v.low_stock_threshold ?? "", stock_orig: v.stock_qty })) : [blankVariant()]);
  const [busy, setBusy] = useState(false);
  const set = (k) => (e) => setF((s) => ({ ...s, [k]: e.target.type === "checkbox" ? e.target.checked : e.target.value }));
  const setV = (i, k, val) => setVars((l) => l.map((v, x) => (x === i ? { ...v, [k]: val } : v)));

  const save = async () => {
    setBusy(true);
    try {
      // For existing options, send the stock only when the owner changed it, so nothing sold meanwhile is overwritten.
      const variants = vars.map(({ stock_orig, ...v }) => {
        if (v.id && String(v.stock_qty) === String(stock_orig)) { const { stock_qty, ...rest } = v; return rest; }
        return v;
      });
      const body = { ...f, highlights: f.highlights.split("\n").map((s) => s.trim()).filter(Boolean), category_id: f.category_id || null, variants };
      if (product) await gymService.storePatch(vid, `/products/${product.id}`, body);
      else await gymService.storePost(vid, "/products", body);
      showSuccess("Product saved");
      onDone();
    } catch (e) { showError(errMsg(e)); } finally { setBusy(false); }
  };

  return (
    <Modal isOpen onClose={onClose} title={product ? "Edit product" : "Add product"} size="xl">
      <div className="space-y-4">
        <div className="flex gap-3">
          <ImageBox vid={vid} value={f.image_url} onChange={(u) => setF((s) => ({ ...s, image_url: u }))} />
          <div className="flex-1 grid sm:grid-cols-2 gap-3">
            <Input label="Product name *" placeholder="Whey Protein, Creatine Monohydrate..." value={f.name} onChange={set("name")} />
            <Input label="Brand" placeholder="Atom, MuscleBlaze..." value={f.brand} onChange={set("brand")} />
            <Select label="Category" value={f.category_id} onChange={set("category_id")} options={[{ value: "", label: "No category" }, ...cats.map((c) => ({ value: c.id, label: c.name }))]} />
            <Input label="Offer badge" placeholder="Buy 2 get 1, Member special" maxLength={40} value={f.offer_label} onChange={set("offer_label")} />
          </div>
        </div>

        <div className="flex gap-2 flex-wrap">
          {f.gallery.map((u, i) => <ImageBox key={u} vid={vid} value={u} onChange={(n) => setF((s) => ({ ...s, gallery: n ? s.gallery.map((x, k) => (k === i ? n : x)) : s.gallery.filter((_, k) => k !== i) }))} />)}
          {f.gallery.length < 4 && <ImageBox vid={vid} value="" onChange={(u) => u && setF((s) => ({ ...s, gallery: [...s.gallery, u] }))} />}
          <p className="text-xs text-gray-400 self-center">More photos (optional)</p>
        </div>

        <div className="grid sm:grid-cols-2 gap-3">
          <Field label="Description"><TextArea rows={3} value={f.description} onChange={set("description")} /></Field>
          <Field label="Key points (one per line)"><TextArea rows={3} placeholder={"24 g protein per scoop\nLab tested"} value={f.highlights} onChange={set("highlights")} /></Field>
        </div>

        <div>
          <p className="text-sm font-medium text-gray-700 mb-1">Options (size / flavour) with price and stock *</p>
          <div className="space-y-2">
            {vars.map((v, i) => (
              <div key={v.id || `n${i}`} className="border rounded-xl p-2.5 grid grid-cols-2 sm:grid-cols-6 gap-2 items-end">
                <div className="col-span-2"><Input label="Option name *" placeholder="1 kg Chocolate" value={v.label} onChange={(e) => setV(i, "label", e.target.value)} /></div>
                <Input label="MRP" inputMode="decimal" value={v.mrp} onChange={(e) => setV(i, "mrp", e.target.value)} />
                <Input label="Selling price *" inputMode="decimal" value={v.price} onChange={(e) => setV(i, "price", e.target.value)} />
                <Input label="Your cost" inputMode="decimal" value={v.cost_price} onChange={(e) => setV(i, "cost_price", e.target.value)} />
                <Input label={v.id ? "In stock" : "Opening stock"} inputMode="numeric" value={v.stock_qty} onChange={(e) => setV(i, "stock_qty", e.target.value.replace(/\D/g, ""))} />
                <Input label="SKU / barcode" value={v.sku || ""} onChange={(e) => setV(i, "sku", e.target.value)} />
                <Input label="Low stock alert" inputMode="numeric" placeholder="3" value={v.low_stock_threshold} onChange={(e) => setV(i, "low_stock_threshold", e.target.value)} />
                <Input label="Expiry date" type="date" value={v.expiry_date} onChange={(e) => setV(i, "expiry_date", e.target.value)} />
                <div className="col-span-2 flex items-center justify-end gap-3">
                  {v.id
                    ? <label className="text-xs text-gray-600 flex items-center gap-1"><input type="checkbox" checked={v.is_active} onChange={(e) => setV(i, "is_active", e.target.checked)} /> Active</label>
                    : vars.length > 1 && <button type="button" onClick={() => setVars((l) => l.filter((_, x) => x !== i))} className="text-gray-400 hover:text-red-600"><Trash2 size={16} /></button>}
                </div>
              </div>
            ))}
          </div>
          <Button variant="outline" className="mt-2" onClick={() => setVars((l) => [...l, blankVariant()])}><Plus size={14} /> Add option</Button>
          {product && <p className="text-xs text-gray-400 mt-1">You can correct the In stock number here. Every change is recorded in the stock history. For new purchases or returns, use the Stock button on the product list.</p>}
        </div>

        <div className="grid sm:grid-cols-3 gap-3">
          <Select label="GST rate" value={f.tax_rate} onChange={set("tax_rate")} options={[0, 5, 12, 18, 28].map((r) => ({ value: r, label: `${r}%` }))} />
          <Input label="HSN code" value={f.hsn} onChange={set("hsn")} />
          <Input label="Offer ends on" type="date" value={f.offer_ends_on} onChange={set("offer_ends_on")} />
        </div>
        <div className="flex flex-wrap gap-5 text-sm">
          <label className="flex items-center gap-2"><input type="checkbox" checked={f.show_on_website} onChange={set("show_on_website")} /> Show on website</label>
          <label className="flex items-center gap-2"><input type="checkbox" checked={f.is_featured} onChange={set("is_featured")} /> Best seller (show first)</label>
          <label className="flex items-center gap-2"><input type="checkbox" checked={f.is_active} onChange={set("is_active")} /> Active for sale</label>
        </div>
        <div className="flex justify-end gap-2">
          <Button variant="outline" onClick={onClose}>Cancel</Button>
          <Button onClick={save} loading={busy} disabled={!f.name.trim() || vars.some((v) => !v.label.trim() || v.price === "" || (v.id && v.stock_qty === ""))}>Save product</Button>
        </div>
      </div>
    </Modal>
  );
}

/* ---------- add / remove stock ---------- */
const REASONS = { add: [["purchase", "New stock bought"], ["return", "Customer return"], ["other", "Other"]], remove: [["damaged", "Damaged"], ["expired", "Expired"], ["lost", "Lost / missing"], ["own_use", "Own use / sample"], ["other", "Other"]], set: [["recount", "Recount"]] };

function StockModal({ vid, product, onClose, onDone }) {
  const [vi, setVi] = useState(product.variants[0]?.id);
  const v = product.variants.find((x) => x.id === vi);
  const [f, setF] = useState({ mode: "add", qty: "", reason: "purchase", unit_cost: "", expiry_date: "", note: "" });
  const [busy, setBusy] = useState(false);
  const { data: moves, refetch } = useFetch(vi ? `/venues/${vid}/gym/store/variants/${vi}/movements` : null, { skip: !vi });
  const set = (k) => (e) => setF((s) => ({ ...s, [k]: e.target.value }));
  const mode = (m) => setF((s) => ({ ...s, mode: m, reason: REASONS[m][0][0] }));

  const save = async () => {
    setBusy(true);
    try {
      await gymService.storePost(vid, `/variants/${vi}/stock`, f);
      showSuccess("Stock updated");
      setF((s) => ({ ...s, qty: "", note: "" }));
      refetch();
      onDone();
    } catch (e) { showError(errMsg(e)); } finally { setBusy(false); }
  };

  return (
    <Modal isOpen onClose={onClose} title={`Stock: ${product.name}`} size="md">
      <div className="space-y-3">
        <Select label="Option" value={vi} onChange={(e) => setVi(e.target.value)} options={product.variants.map((x) => ({ value: x.id, label: `${x.label} (${x.stock_qty} in stock)` }))} />
        <div className="flex gap-1.5">
          {[["add", "Add stock"], ["remove", "Remove"], ["set", "Set exact"]].map(([k, l]) => <button key={k} onClick={() => mode(k)} className={chip(f.mode === k)}>{l}</button>)}
        </div>
        <div className="grid grid-cols-2 gap-3">
          <Input label={f.mode === "set" ? "Counted quantity" : "Quantity"} inputMode="numeric" value={f.qty} onChange={set("qty")} />
          <Select label="Reason" value={f.reason} onChange={set("reason")} options={REASONS[f.mode].map(([value, label]) => ({ value, label }))} />
          {f.mode === "add" && <Input label="Cost per unit" inputMode="decimal" placeholder={v ? String(v.cost_price) : ""} value={f.unit_cost} onChange={set("unit_cost")} />}
          {f.mode === "add" && <Input label="Expiry of this batch" type="date" value={f.expiry_date} onChange={set("expiry_date")} />}
        </div>
        <Input label="Note (supplier, bill no.)" value={f.note} onChange={set("note")} />
        <div className="flex justify-end"><Button onClick={save} loading={busy} disabled={f.qty === ""}>Update stock</Button></div>
        {moves?.length > 0 && (
          <div className="pt-2 border-t max-h-44 overflow-y-auto">
            <p className="text-xs text-gray-500 mb-1">Recent changes</p>
            {moves.map((m) => (
              <div key={m.id} className="flex justify-between text-xs py-1 border-b last:border-0">
                <span className="text-gray-600 truncate">{new Date(m.createdAt).toLocaleDateString("en-IN")} · {m.type.replace(/_/g, " ")}{m.note ? ` · ${m.note}` : ""}</span>
                <span className={m.qty_change > 0 ? "text-green-600" : "text-red-600"}>{m.qty_change > 0 ? "+" : ""}{m.qty_change} → {m.balance_after}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </Modal>
  );
}

/* ---------- products ---------- */
function Products({ vid, initialStatus }) {
  const [status, setStatus] = useState(initialStatus || "all");
  const [cat, setCat] = useState("");
  const [q, setQ] = useState("");
  const [dq, setDq] = useState("");
  const [page, setPage] = useState(1);
  const [modal, setModal] = useState(null); // { type, product }
  useEffect(() => { const t = setTimeout(() => { setDq(q.trim()); setPage(1); }, 350); return () => clearTimeout(t); }, [q]);

  const { data: cats, refetch: refetchCats } = useFetch(`/venues/${vid}/gym/store/categories`);
  const url = `/venues/${vid}/gym/store/products?status=${status}&category_id=${cat}&q=${encodeURIComponent(dq)}&page=${page}&limit=20`;
  const { data, loading, refetch } = useFetch(url);
  const done = () => { setModal(null); refetch(); refetchCats(); };
  const remove = async (p) => {
    if (!window.confirm(`Remove ${p.name}? Items that were sold before are archived, not lost.`)) return;
    try { await gymService.storeDelete(vid, `/products/${p.id}`); showSuccess("Removed"); refetch(); } catch (e) { showError(errMsg(e)); }
  };

  return (
    <>
      <div className="flex flex-wrap gap-2 mb-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <Input className="pl-9" placeholder="Search name, brand or SKU" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <div className="w-44"><Select value={cat} onChange={(e) => { setCat(e.target.value); setPage(1); }} options={[{ value: "", label: "All categories" }, ...(cats || []).map((c) => ({ value: c.id, label: c.name }))]} /></div>
        <Button variant="outline" onClick={() => setModal({ type: "cats" })}>Categories</Button>
        <Button onClick={() => setModal({ type: "edit" })}><Plus size={15} /> Add product</Button>
      </div>
      <div className="flex gap-1.5 mb-3 overflow-x-auto">
        {[["all", "All"], ["active", "Active"], ["low", "Low stock"], ["out", "Out of stock"], ["expiring", "Expiring"], ["inactive", "Hidden"]].map(([k, l]) => (
          <button key={k} onClick={() => { setStatus(k); setPage(1); }} className={chip(status === k)}>{l}</button>
        ))}
      </div>

      {loading ? <Loader /> : !data?.items.length ? (
        <EmptyState title="No products yet" description="Add your protein, creatine and other supplements. They show on your website automatically." />
      ) : (
        <div className="bg-white rounded-2xl border border-navy-100/60 divide-y">
          {data.items.map((p) => (
            <div key={p.id} className="p-3 flex gap-3">
              {p.image_url ? <img src={p.image_url} alt="" className="w-16 h-16 rounded-xl object-cover flex-shrink-0" /> : <div className="w-16 h-16 rounded-xl bg-gray-100 flex-shrink-0" />}
              <div className="flex-1 min-w-0">
                <p className="text-sm font-semibold text-gray-900 truncate">{p.name}{p.is_featured && <span className="ml-2 text-[10px] bg-amber-100 text-amber-700 px-1.5 py-0.5 rounded-full">Best seller</span>}{!p.is_active && <span className="ml-2 text-[10px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded-full">Hidden</span>}</p>
                <p className="text-xs text-gray-500">{[p.brand, p.category_name].filter(Boolean).join(" · ") || "No category"} · from {inr(p.min_price)}</p>
                <div className="flex flex-wrap gap-1.5 mt-1.5">
                  <Pill s={p.stock_status} />
                  <span className="text-[11px] text-gray-500">{p.total_stock} units · {p.variants.filter((v) => v.is_active).length} options</span>
                  {p.expiry_alert && <span className="text-[11px] text-red-600 font-medium">{p.expiry_alert === "expired" ? "Expired stock" : "Expiring soon"}</span>}
                </div>
              </div>
              <div className="flex flex-col sm:flex-row gap-1.5 items-end sm:items-start">
                <Button variant="outline" onClick={() => setModal({ type: "stock", product: p })}><PackagePlus size={14} /> Stock</Button>
                <Button variant="outline" onClick={() => setModal({ type: "edit", product: p })}><Pencil size={14} /></Button>
                <button onClick={() => remove(p)} className="p-2 text-gray-400 hover:text-red-600"><Trash2 size={15} /></button>
              </div>
            </div>
          ))}
        </div>
      )}
      {data && data.pages > 1 && (
        <div className="flex items-center justify-between mt-4 text-sm">
          <Button variant="outline" disabled={page <= 1} onClick={() => setPage(page - 1)}>Previous</Button>
          <span className="text-gray-500">Page {data.page} of {data.pages} · {data.total} products</span>
          <Button variant="outline" disabled={page >= data.pages} onClick={() => setPage(page + 1)}>Next</Button>
        </div>
      )}
      {modal?.type === "edit" && <ProductModal vid={vid} product={modal.product} cats={(cats || []).filter((c) => c.is_active || c.id === modal.product?.category_id)} onClose={() => setModal(null)} onDone={done} />}
      {modal?.type === "stock" && <StockModal vid={vid} product={modal.product} onClose={() => setModal(null)} onDone={refetch} />}
      {modal?.type === "cats" && <CategoryModal vid={vid} onClose={() => setModal(null)} onDone={refetchCats} />}
    </>
  );
}

/* ---------- invoice actions (download + WhatsApp) ---------- */
function InvoiceActions({ vid, sale, gymName }) {
  const pdf = async () => {
    try { downloadBlob((await gymService.storeInvoice(vid, sale.id)).data, `${sale.invoice_no}.pdf`); } catch { showError("Could not download the bill"); }
  };
  const link = `${(import.meta.env.VITE_API_URL || "").replace(/\/$/, "")}/public/gym/invoice/${sale.share_token}/pdf`;
  const text = `Hi ${sale.customer_name.split(" ")[0]}, thank you for shopping at ${gymName}.\nBill ${sale.invoice_no}: Rs. ${inr(sale.total).replace("₹", "")}${sale.balance > 0 ? ` (balance Rs. ${inr(sale.balance).replace("₹", "")})` : ""}\nView your bill: ${link}`;
  return (
    <div className="flex gap-2">
      <Button variant="outline" onClick={pdf}><FileText size={14} /> Bill PDF</Button>
      {sale.customer_phone && <Button variant="outline" onClick={() => window.open(waUrl(`91${sale.customer_phone}`, text), "_blank", "noopener")}><MessageCircle size={14} /> WhatsApp</Button>}
    </div>
  );
}

/* ---------- counter billing ---------- */
function Billing({ vid, gymName, onSaved }) {
  const [q, setQ] = useState("");
  const [results, setResults] = useState([]);
  const [cart, setCart] = useState([]);
  const [cust, setCust] = useState({ member_id: "", name: "", phone: "" });
  const [mq, setMq] = useState("");
  const [pay, setPay] = useState({ discount: "", amount: "", mode: "cash", reference: "" });
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(null);
  const searchRef = useRef(null);

  const { data: members } = useFetch(mq.trim().length >= 2 ? `/venues/${vid}/gym/members?q=${encodeURIComponent(mq.trim())}&limit=5` : null, { skip: mq.trim().length < 2 });

  useEffect(() => {
    if (!q.trim()) { setResults([]); return undefined; }
    const t = setTimeout(() => gymService.storeGet(vid, "/pos/search", { q: q.trim() }).then((r) => setResults(r.data.data)).catch(() => {}), 250);
    return () => clearTimeout(t);
  }, [q, vid]);

  const add = (r) => {
    setCart((c) => {
      const i = c.findIndex((x) => x.variant_id === r.variant_id);
      if (i >= 0) return c.map((x, k) => (k === i ? { ...x, qty: Math.min(x.qty + 1, x.stock_qty) } : x));
      return [...c, { ...r, qty: 1, line_discount: "" }];
    });
    setQ("");
    setResults([]);
    searchRef.current?.focus();
  };
  // Barcode scanners type the code and press Enter: add the exact match straight away.
  const onEnter = (e) => { if (e.key === "Enter") { const hit = results.find((r) => r.exact) || (results.length === 1 ? results[0] : null); if (hit && hit.stock_qty > 0) { e.preventDefault(); add(hit); } } };
  const setLine = (i, patch) => setCart((c) => c.map((x, k) => (k === i ? { ...x, ...patch } : x)));

  const lines = cart.map((l) => ({ ...l, amount: Math.max(l.price * l.qty - num(l.line_discount), 0) }));
  const subtotal = lines.reduce((n, l) => n + l.amount, 0);
  const total = Math.max(subtotal - num(pay.discount), 0);
  const paying = pay.amount === "" ? total : num(pay.amount);

  const submit = async () => {
    setBusy(true);
    try {
      const res = await gymService.storePost(vid, "/sales", {
        items: cart.map((l) => ({ variant_id: l.variant_id, qty: l.qty, line_discount: num(l.line_discount) })),
        member_id: cust.member_id || undefined, customer_name: cust.name, customer_phone: cust.phone,
        discount: num(pay.discount), pay_amount: pay.amount === "" ? undefined : num(pay.amount), pay_mode: pay.mode, reference: pay.reference
      });
      setSaved(res.data.data);
      setCart([]);
      setCust({ member_id: "", name: "", phone: "" });
      setPay({ discount: "", amount: "", mode: "cash", reference: "" });
      onSaved();
    } catch (e) { showError(errMsg(e)); } finally { setBusy(false); }
  };

  return (
    <div className="grid lg:grid-cols-5 gap-4">
      <div className="lg:col-span-3 space-y-3">
        <Card title="Add products">
          <div className="relative">
            <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input ref={searchRef} autoFocus value={q} onChange={(e) => setQ(e.target.value)} onKeyDown={onEnter} placeholder="Type product name, or scan barcode / SKU"
              className="w-full pl-9 pr-3 py-2.5 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500" />
          </div>
          {results.length > 0 && (
            <div className="mt-2 border rounded-xl divide-y max-h-60 overflow-y-auto">
              {results.map((r) => (
                <button key={r.variant_id} disabled={r.stock_qty <= 0} onClick={() => add(r)} className="w-full text-left px-3 py-2 flex justify-between gap-2 text-sm hover:bg-gray-50 disabled:opacity-40">
                  <span className="truncate">{r.name} <span className="text-gray-400">{r.label}</span></span>
                  <span className="whitespace-nowrap">{inr(r.price)} <span className={`text-xs ${r.stock_qty <= 0 ? "text-red-600" : "text-gray-400"}`}>({r.stock_qty <= 0 ? "out" : `${r.stock_qty} left`})</span></span>
                </button>
              ))}
            </div>
          )}
        </Card>
        <Card title={`Bill items (${cart.length})`}>
          {cart.length === 0 ? <p className="text-sm text-gray-400">Search a product above to start the bill.</p> : (
            <div className="divide-y">
              {lines.map((l, i) => (
                <div key={l.variant_id} className="py-2.5 flex flex-wrap items-center gap-2">
                  <div className="flex-1 min-w-[160px]"><p className="text-sm font-medium truncate">{l.name}</p><p className="text-xs text-gray-500">{l.label} · {inr(l.price)}</p></div>
                  <div className="flex items-center border rounded-lg">
                    <button className="p-2" onClick={() => setLine(i, { qty: Math.max(l.qty - 1, 1) })}><Minus size={13} /></button>
                    <span className="w-8 text-center text-sm">{l.qty}</span>
                    <button className="p-2" disabled={l.qty >= l.stock_qty} onClick={() => setLine(i, { qty: l.qty + 1 })}><Plus size={13} /></button>
                  </div>
                  <input inputMode="decimal" placeholder="Disc ₹" value={l.line_discount} onChange={(e) => setLine(i, { line_discount: e.target.value })} className="w-20 px-2 py-1.5 border rounded-lg text-sm" />
                  <span className="w-20 text-right text-sm font-semibold">{inr(l.amount)}</span>
                  <button onClick={() => setCart((c) => c.filter((_, k) => k !== i))} className="p-1 text-gray-400 hover:text-red-600"><Trash2 size={15} /></button>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      <div className="lg:col-span-2 space-y-3">
        <Card title="Customer (optional)">
          {cust.member_id ? (
            <div className="flex items-center justify-between text-sm"><span>{cust.name} <span className="text-gray-400">{cust.phone}</span></span><button className="text-xs text-primary-600" onClick={() => setCust({ member_id: "", name: "", phone: "" })}>Change</button></div>
          ) : (
            <>
              <Input placeholder="Search gym member by name or mobile" value={mq} onChange={(e) => setMq(e.target.value)} />
              {members?.items?.map((m) => (
                <button key={m.id} onClick={() => { setCust({ member_id: m.id, name: m.name, phone: m.phone }); setMq(""); }} className="w-full text-left text-sm py-1.5 px-1 hover:bg-gray-50">{m.name} <span className="text-gray-400">{m.phone}</span></button>
              ))}
              <div className="grid grid-cols-2 gap-2 mt-2">
                <Input placeholder="Walk-in name" value={cust.name} onChange={(e) => setCust({ ...cust, name: e.target.value })} />
                <Input placeholder="Mobile" inputMode="numeric" maxLength={10} value={cust.phone} onChange={(e) => setCust({ ...cust, phone: e.target.value })} />
              </div>
            </>
          )}
        </Card>
        <Card title="Payment">
          <div className="space-y-2 text-sm">
            <div className="flex justify-between"><span className="text-gray-500">Items total</span><span>{inr(subtotal)}</span></div>
            <Input label="Extra discount (₹)" inputMode="decimal" value={pay.discount} onChange={(e) => setPay({ ...pay, discount: e.target.value })} />
            <div className="flex justify-between text-lg font-bold pt-1"><span>Total</span><span>{inr(total)}</span></div>
            <div className="grid grid-cols-2 gap-2">
              <Input label="Received now (₹)" inputMode="decimal" placeholder={String(total)} value={pay.amount} onChange={(e) => setPay({ ...pay, amount: e.target.value })} />
              <Select label="Mode" value={pay.mode} onChange={(e) => setPay({ ...pay, mode: e.target.value })} options={MODES} />
            </div>
            {paying < total && <p className="text-xs text-red-600">Balance due: {inr(total - paying)} (shows in Bills)</p>}
            <Button className="w-full" onClick={submit} loading={busy} disabled={!cart.length}>Generate bill</Button>
          </div>
        </Card>
      </div>

      {saved && (
        <Modal isOpen onClose={() => setSaved(null)} title="Bill created" size="sm">
          <p className="text-sm text-gray-700 mb-1"><b>{saved.invoice_no}</b> · {inr(saved.total)}</p>
          <p className="text-xs text-gray-500 mb-4">Stock has been reduced. {saved.balance > 0 ? `Balance due ${inr(saved.balance)}.` : "Fully paid."}</p>
          <InvoiceActions vid={vid} sale={saved} gymName={gymName} />
          <Button className="w-full mt-4" onClick={() => setSaved(null)}>New bill</Button>
        </Modal>
      )}
    </div>
  );
}

/* ---------- bills ---------- */
function SaleModal({ vid, sale, gymName, isOwner, onClose, onDone }) {
  const [amount, setAmount] = useState("");
  const [mode, setMode] = useState("cash");
  const run = async (fn, ok) => { try { await fn(); showSuccess(ok); onDone(); } catch (e) { showError(errMsg(e)); } };
  return (
    <Modal isOpen onClose={onClose} title={`${sale.invoice_no}${sale.status === "cancelled" ? " (cancelled)" : ""}`} size="md">
      <p className="text-sm text-gray-600">{sale.customer_name}{sale.customer_phone ? ` · ${sale.customer_phone}` : ""} · {fmtDate(sale.sold_on)}</p>
      <div className="my-3 divide-y border rounded-xl">
        {sale.items.map((l, i) => (
          <div key={i} className="px-3 py-2 flex justify-between gap-2 text-sm"><span>{l.name} <span className="text-gray-400">{l.variant_label} x {l.qty}</span></span><span>{inr(l.amount)}</span></div>
        ))}
      </div>
      <div className="text-sm space-y-1 mb-3">
        <div className="flex justify-between font-semibold"><span>Total</span><span>{inr(sale.total)}</span></div>
        <div className="flex justify-between text-green-700"><span>Paid</span><span>{inr(sale.amount_paid)}</span></div>
        {sale.balance > 0 && sale.status !== "cancelled" && <div className="flex justify-between text-red-600"><span>Balance</span><span>{inr(sale.balance)}</span></div>}
      </div>
      <InvoiceActions vid={vid} sale={sale} gymName={gymName} />
      {sale.status !== "cancelled" && sale.balance > 0 && (
        <div className="mt-4 pt-3 border-t grid grid-cols-5 gap-2 items-end">
          <div className="col-span-2"><Input label="Collect (₹)" inputMode="decimal" placeholder={String(sale.balance)} value={amount} onChange={(e) => setAmount(e.target.value)} /></div>
          <div className="col-span-2"><Select label="Mode" value={mode} onChange={(e) => setMode(e.target.value)} options={MODES} /></div>
          <Button onClick={() => run(() => gymService.storePost(vid, `/sales/${sale.id}/payments`, { amount: amount || sale.balance, mode }), "Payment recorded")}>Add</Button>
        </div>
      )}
      {isOwner && sale.status !== "cancelled" && (
        <button className="mt-4 text-xs text-red-600" onClick={() => window.confirm("Cancel this bill? Stock is put back. Refund the customer yourself if needed.") && run(() => gymService.storePost(vid, `/sales/${sale.id}/cancel`, {}), "Bill cancelled")}>Cancel this bill</button>
      )}
    </Modal>
  );
}

function Sales({ vid, gymName, isOwner }) {
  const [status, setStatus] = useState("all");
  const [q, setQ] = useState("");
  const [dq, setDq] = useState("");
  const [page, setPage] = useState(1);
  const [open, setOpen] = useState(null);
  useEffect(() => { const t = setTimeout(() => { setDq(q.trim()); setPage(1); }, 350); return () => clearTimeout(t); }, [q]);
  const { data, loading, refetch } = useFetch(`/venues/${vid}/gym/store/sales?status=${status}&q=${encodeURIComponent(dq)}&page=${page}&limit=20`);
  return (
    <>
      <div className="flex flex-wrap gap-2 mb-3">
        <div className="relative flex-1 min-w-[200px]"><Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" /><Input className="pl-9" placeholder="Search bill no, customer or mobile" value={q} onChange={(e) => setQ(e.target.value)} /></div>
      </div>
      <div className="flex gap-1.5 mb-3 overflow-x-auto">
        {[["all", "All"], ["paid", "Paid"], ["dues", "With dues"], ["cancelled", "Cancelled"]].map(([k, l]) => <button key={k} onClick={() => { setStatus(k); setPage(1); }} className={chip(status === k)}>{l}</button>)}
      </div>
      {data && <p className="text-xs text-gray-500 mb-2">{data.summary.bills} bills · {inr(data.summary.total)} billed · {inr(data.summary.paid)} received · {inr(data.summary.due)} due</p>}
      {loading ? <Loader /> : !data?.items.length ? <EmptyState title="No bills found" /> : (
        <div className="bg-white rounded-2xl border border-navy-100/60 divide-y">
          {data.items.map((s) => (
            <button key={s.id} onClick={() => setOpen(s)} className="w-full text-left px-4 py-3 flex items-center gap-3 hover:bg-gray-50">
              <div className="flex-1 min-w-0"><p className="text-sm font-medium text-gray-900">{s.invoice_no} <span className="text-gray-400 font-normal">{s.customer_name}</span></p><p className="text-xs text-gray-500">{fmtDate(s.sold_on)} · {s.items.length} items</p></div>
              <div className="text-right"><p className="text-sm font-semibold">{inr(s.total)}</p>{s.status === "cancelled" ? <span className="text-xs text-gray-400">Cancelled</span> : s.balance > 0 ? <span className="text-xs text-red-600">Due {inr(s.balance)}</span> : <span className="text-xs text-green-600">Paid</span>}</div>
            </button>
          ))}
        </div>
      )}
      {data && data.pages > 1 && (
        <div className="flex items-center justify-between mt-4 text-sm">
          <Button variant="outline" disabled={page <= 1} onClick={() => setPage(page - 1)}>Previous</Button>
          <span className="text-gray-500">Page {data.page} of {data.pages}</span>
          <Button variant="outline" disabled={page >= data.pages} onClick={() => setPage(page + 1)}>Next</Button>
        </div>
      )}
      {open && <SaleModal vid={vid} sale={open} gymName={gymName} isOwner={isOwner} onClose={() => setOpen(null)} onDone={() => { setOpen(null); refetch(); }} />}
    </>
  );
}

/* ---------- settings ---------- */
function StoreSettings({ vid }) {
  const { data, loading, refetch } = useFetch(`/venues/${vid}/gym/store/settings`);
  const [f, setF] = useState(null);
  const [busy, setBusy] = useState(false);
  useEffect(() => { if (data) setF({ show_on_website: data.show_on_website, show_out_of_stock: data.show_out_of_stock, tagline: data.tagline || "", invoice_prefix: data.invoice_prefix, invoice_terms: data.invoice_terms || "", low_stock_default: data.low_stock_default }); }, [data]);
  if (loading || !f) return <Loader />;
  const set = (k) => (e) => setF((s) => ({ ...s, [k]: e.target.type === "checkbox" ? e.target.checked : e.target.value }));
  const save = async () => {
    setBusy(true);
    try { await gymService.storePut(vid, "/settings", f); showSuccess("Settings saved"); refetch(); } catch (e) { showError(errMsg(e)); } finally { setBusy(false); }
  };
  return (
    <div className="max-w-2xl space-y-4">
      <Card title="Website">
        <label className="flex items-center gap-2 text-sm mb-2"><input type="checkbox" checked={f.show_on_website} onChange={set("show_on_website")} /> Show my supplement store on the website</label>
        <label className="flex items-center gap-2 text-sm mb-3"><input type="checkbox" checked={f.show_out_of_stock} onChange={set("show_out_of_stock")} /> Also show out-of-stock products (marked "Out of stock")</label>
        <Input label="Store tagline" placeholder="100% genuine supplements, lab tested" maxLength={160} value={f.tagline} onChange={set("tagline")} />
      </Card>
      <Card title="Billing and stock">
        <div className="grid sm:grid-cols-2 gap-3">
          <Input label="Bill number prefix" maxLength={8} value={f.invoice_prefix} onChange={set("invoice_prefix")} />
          <Input label="Default low-stock alert (units)" inputMode="numeric" value={f.low_stock_default} onChange={set("low_stock_default")} />
        </div>
        <div className="mt-3"><Field label="Terms printed on the bill"><TextArea rows={3} maxLength={500} placeholder="No return on opened products." value={f.invoice_terms} onChange={set("invoice_terms")} /></Field></div>
        <p className="text-xs text-gray-500 mt-2">GST details on the bill come from your business GST settings.</p>
      </Card>
      <Button onClick={save} loading={busy}>Save settings</Button>
    </div>
  );
}

/* ---------- page ---------- */
export default function GymStore() {
  const { venue } = useVenue();
  const vid = venue?.id;
  const [tab, setTab] = useState("overview");
  const [productFilter, setProductFilter] = useState("all");
  const [tick, setTick] = useState(0);
  const isOwner = useMemo(() => !venue?.is_team_view, [venue]);
  const go = (t, filter) => { if (filter) setProductFilter(filter); setTab(t); };
  if (!vid) return <GymPage title="Supplement store"><Loader /></GymPage>;

  const tabs = [["overview", "Overview"], ["products", "Products & stock"], ["bill", "New bill"], ["sales", "Bills"], ["settings", "Settings"]];
  return (
    <GymPage title="Supplement store" subtitle="Sell protein, creatine and more. Stock, billing and your website in one place">
      <div className="flex gap-1.5 mb-4 overflow-x-auto">{tabs.map(([k, l]) => <button key={k} onClick={() => go(k)} className={chip(tab === k)}>{l}</button>)}</div>
      {tab === "overview" && <Overview key={tick} vid={vid} go={go} />}
      {tab === "products" && <Products key={productFilter} vid={vid} initialStatus={productFilter} />}
      {tab === "bill" && <Billing vid={vid} gymName={venue.hall_name} onSaved={() => setTick((n) => n + 1)} />}
      {tab === "sales" && <Sales key={tick} vid={vid} gymName={venue.hall_name} isOwner={isOwner} />}
      {tab === "settings" && <StoreSettings vid={vid} />}
    </GymPage>
  );
}
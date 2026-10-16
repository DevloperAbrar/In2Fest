import React, { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { ArrowLeft, Plus, Search, Pencil, Trash2, Phone, Users } from "lucide-react";
import DashboardLayout from "../../../components/layout/DashboardLayout.jsx";
import Modal from "../../../components/common/Modal";
import Button from "../../../components/common/Button";
import { ownerSidebarItems } from "../ownerSidebarItems.js";
import { useVenue } from "../../../context/VenueContext.jsx";
import { useFetch } from "../../../hooks/useFetch";
import { clientService } from "../../../services/clientService";
import { showSuccess, showError } from "../../../components/common/Toast";
import { inr } from "../../../lib/billingMath";
import { Field, inputCls } from "./billingShared.jsx";

const errMsg = (e, fallback) => e.response?.data?.message || fallback;

function CustomerModal({ venueId, customer, onClose, onDone }) {
  const [f, setF] = useState({
    name: customer?.name || "",
    phone: customer?.phone || "",
    email: customer?.email || ""
  });
  const [saving, setSaving] = useState(false);
  const set = (p) => setF((s) => ({ ...s, ...p }));

  const save = async () => {
    const name = f.name.trim();
    const phone = f.phone.trim();
    if (!name) return showError("Customer name is required");
    if (phone.replace(/\D/g, "").length < 10) return showError("Enter a valid 10 digit phone number");
    setSaving(true);
    try {
      const payload = { name, phone, email: f.email.trim() || null };
      if (customer) await clientService.update(venueId, customer.id, payload);
      else await clientService.create(venueId, payload);
      showSuccess("Customer saved");
      onDone();
    } catch (e) {
      showError(errMsg(e, "Could not save the customer"));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal isOpen onClose={onClose} title={customer ? "Edit customer" : "Add customer"} size="sm">
      <div className="space-y-4">
        <Field label="Name"><input className={inputCls} value={f.name} onChange={(e) => set({ name: e.target.value })} autoFocus /></Field>
        <Field label="Phone"><input className={inputCls} inputMode="tel" maxLength={20} value={f.phone} onChange={(e) => set({ phone: e.target.value })} /></Field>
        <Field label="Email (optional)"><input className={inputCls} type="email" value={f.email} onChange={(e) => set({ email: e.target.value })} /></Field>
        <Button onClick={save} loading={saving} className="w-full">Save</Button>
      </div>
    </Modal>
  );
}

export default function BillingCustomers() {
  const { venue } = useVenue();
  const vid = venue?.id;
  const customersReq = useFetch(vid ? `/venues/${vid}/clients` : null, { skip: !vid });
  const invoicesReq = useFetch(vid ? `/venues/${vid}/billing/invoices` : null, { skip: !vid });

  const [q, setQ] = useState("");
  const [editing, setEditing] = useState(null); // null | "new" | customer

  // Per customer: number of bills, total billed and what is still due (drafts are not counted).
  const stats = useMemo(() => {
    const m = {};
    (invoicesReq.data || []).forEach((d) => {
      const cid = d.client_id || d.client?.id;
      if (!cid || d.type !== "invoice" || d.status === "draft") return;
      const s = m[cid] || { count: 0, billed: 0, due: 0 };
      s.count += 1;
      s.billed += Number(d.total) || 0;
      s.due += Number(d.balance_due) || 0;
      m[cid] = s;
    });
    return m;
  }, [invoicesReq.data]);

  const rows = useMemo(() => {
    const s = q.trim().toLowerCase();
    return (customersReq.data || [])
      .filter((c) => !s || String(c.name || "").toLowerCase().includes(s) || String(c.phone || "").includes(s))
      .sort((a, b) => String(a.name || "").localeCompare(String(b.name || "")));
  }, [customersReq.data, q]);

  const totalDue = rows.reduce((sum, c) => sum + (stats[c.id]?.due || 0), 0);

  const refresh = () => { customersReq.refetch(); invoicesReq.refetch(); };

  const remove = async (c) => {
    if (!window.confirm(`Remove ${c.name}? Their old bills stay as they are.`)) return;
    try {
      await clientService.delete(vid, c.id);
      showSuccess("Customer removed");
      refresh();
    } catch (e) {
      showError(errMsg(e, "Could not remove the customer"));
    }
  };

  const loading = (customersReq.loading && !customersReq.data) || (invoicesReq.loading && !invoicesReq.data);

  return (
    <DashboardLayout sidebarItems={ownerSidebarItems} pageTitle="Customers">
      <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
        <Link to="/dashboard/billing/invoice" className="inline-flex items-center gap-2 text-sm text-navy-500 hover:text-navy-800">
          <ArrowLeft size={16} /> Back to billing
        </Link>
        <Button onClick={() => setEditing("new")}><Plus size={16} /> Add customer</Button>
      </div>

      <p className="text-sm text-navy-400 mb-4">
        Customers are saved automatically when you bill someone with a name and phone number.
        {totalDue > 0 && <> Total due from customers: <b className="text-red-600">{inr(totalDue, 0)}</b></>}
      </p>

      <div className="relative mb-4">
        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-navy-300" />
        <input className={`${inputCls} pl-9`} placeholder="Search by name or phone" value={q} onChange={(e) => setQ(e.target.value)} />
      </div>

      {loading ? (
        <div className="bg-white rounded-2xl border border-navy-100/70 shadow-card p-12 text-center text-sm text-navy-400">Loading…</div>
      ) : rows.length === 0 ? (
        <div className="bg-white rounded-2xl border border-navy-100/70 shadow-card py-14 px-6 flex flex-col items-center text-center">
          <Users size={36} className="text-navy-200 mb-3" />
          <h3 className="font-medium text-navy-800">{q ? "No customer matches" : "No customers yet"}</h3>
          <p className="text-sm text-navy-400 mt-1 max-w-sm">
            Add a name and phone number while creating a bill, and the customer will appear here.
          </p>
        </div>
      ) : (
        <div className="bg-white rounded-2xl border border-navy-100/70 shadow-card divide-y divide-navy-100/70">
          {rows.map((c) => {
            const s = stats[c.id] || { count: 0, billed: 0, due: 0 };
            return (
              <div key={c.id} className="flex items-center gap-3 px-4 py-3">
                <div className="min-w-0 flex-1">
                  <p className="text-sm font-medium text-navy-800 truncate">{c.name}</p>
                  <p className="flex items-center gap-1 text-xs text-navy-400 truncate">
                    <Phone size={11} /> {c.phone}{c.email ? ` · ${c.email}` : ""}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm font-semibold tabular-nums text-navy-900">{inr(s.billed, 0)}</p>
                  <p className="text-[11px] text-navy-400">{s.count} bill{s.count === 1 ? "" : "s"}</p>
                </div>
                {s.due > 0.009 && (
                  <p className="text-xs font-medium text-red-600 shrink-0 tabular-nums">Due {inr(s.due, 0)}</p>
                )}
                <button type="button" onClick={() => setEditing(c)} title="Edit" className="h-8 w-8 grid place-items-center rounded-lg text-navy-400 hover:bg-navy-50 shrink-0">
                  <Pencil size={15} />
                </button>
                <button type="button" onClick={() => remove(c)} title="Remove" className="h-8 w-8 grid place-items-center rounded-lg text-red-400 hover:bg-red-50 shrink-0">
                  <Trash2 size={15} />
                </button>
              </div>
            );
          })}
        </div>
      )}

      {editing && (
        <CustomerModal
          venueId={vid}
          customer={editing === "new" ? null : editing}
          onClose={() => setEditing(null)}
          onDone={() => { setEditing(null); refresh(); }}
        />
      )}
    </DashboardLayout>
  );
}
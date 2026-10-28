import React, { useState } from "react";
import DashboardLayout from "../../../components/layout/DashboardLayout.jsx";
import { adminSidebarItems } from "../adminSidebarItems.js";
import { useFetch } from "../../../hooks/useFetch";
import Badge from "../../../components/common/Badge";
import Input from "../../../components/common/Input";
import Button from "../../../components/common/Button";
import Modal from "../../../components/common/Modal";
import Loader from "../../../components/common/Loader";
import EmptyState from "../../../components/common/EmptyState";
import ConfirmDialog from "../../../components/common/ConfirmDialog";
import { showSuccess, showError } from "../../../components/common/Toast";
import { demoService } from "../../../services/demoService";
import { Plus, Copy, PlayCircle } from "lucide-react";

const dt = (v) => (v ? new Date(v).toLocaleString("en-IN", { dateStyle: "medium", timeStyle: "short" }) : "-");

function shareText(c) {
  return [
    "In2Fest - Gym Management Demo",
    `Login: ${c.login_url}`,
    `Email: ${c.email}`,
    `Password: ${c.password}`,
    `Valid till: ${new Date(c.valid_till).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}`
  ].join("\n");
}

const copy = async (text) => {
  try {
    await navigator.clipboard.writeText(text);
    showSuccess("Copied");
  } catch {
    showError("Could not copy");
  }
};

const EMPTY = { prospect_name: "", prospect_phone: "", gym_name: "", city: "", days: 7, notes: "", password: "" };

export default function DemoAccounts() {
  const { data, loading, refetch } = useFetch("/admin/demo");
  const rows = data || [];
  const [form, setForm] = useState(EMPTY);
  const [showForm, setShowForm] = useState(false);
  const [creating, setCreating] = useState(false);
  const [creds, setCreds] = useState(null);
  const [confirm, setConfirm] = useState(null); // { type, row }
  const [busy, setBusy] = useState(false);

  const set = (k) => (e) => setForm((f) => ({ ...f, [k]: e.target.value }));

  const create = async () => {
    if (!form.prospect_name.trim()) return showError("Enter the prospect's name");
    setCreating(true);
    try {
      const res = await demoService.create(form);
      setShowForm(false);
      setForm(EMPTY);
      setCreds(res.credentials);
      if (res.seed_error) showError("Demo created, but sample data had a problem. Try Reset data.");
      refetch();
    } catch (err) {
      showError(err.response?.data?.message || "Could not create demo");
    } finally {
      setCreating(false);
    }
  };

  const run = async () => {
    if (!confirm) return;
    const { type, row } = confirm;
    setBusy(true);
    try {
      if (type === "reset") { await demoService.reset(row.id); showSuccess("Sample data restored"); }
      if (type === "revoke") { await demoService.revoke(row.id); showSuccess("Demo switched off"); }
      if (type === "delete") { await demoService.remove(row.id); showSuccess("Demo deleted"); }
      if (type === "extend") { await demoService.extend(row.id, 7); showSuccess("Extended by 7 days"); }
      if (type === "password") { const res = await demoService.password(row.id); setCreds(res.credentials); }
      setConfirm(null);
      refetch();
    } catch (err) {
      showError(err.response?.data?.message || "Action failed");
    } finally {
      setBusy(false);
    }
  };

  const CONFIRM_TEXT = {
    reset: ["Reset sample data?", "All changes made by the prospect are erased and fresh sample data is loaded.", "Reset", "danger"],
    revoke: ["Switch off this demo?", "The prospect can no longer sign in. You can extend it later.", "Switch off", "danger"],
    delete: ["Delete this demo?", "The demo gym and all its data are permanently deleted.", "Delete", "danger"],
    extend: ["Extend by 7 days?", "The demo is switched on again and runs 7 more days.", "Extend", "primary"],
    password: ["Generate a new password?", "The old password stops working immediately.", "Generate", "primary"]
  };
  const ct = confirm ? CONFIRM_TEXT[confirm.type] : null;

  return (
    <DashboardLayout sidebarItems={adminSidebarItems} pageTitle="Demo Accounts">
      <div className="mb-4 flex items-center justify-between gap-3 flex-wrap">
        <p className="text-sm text-gray-500 max-w-xl">
          Give a prospect a safe Gym demo login. They only see Gym tools with sample data; WhatsApp, uploads and payments are switched off.
        </p>
        <Button onClick={() => setShowForm(true)}><Plus size={16} /> New demo</Button>
      </div>

      {loading ? (
        <Loader />
      ) : rows.length === 0 ? (
        <EmptyState icon={PlayCircle} title="No demo accounts yet" description="Create one before your next sales call." />
      ) : (
        <div className="bg-white rounded-xl border border-gray-100 overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500 text-left">
              <tr>
                <th className="px-4 py-3">Prospect</th>
                <th className="px-4 py-3">Login email</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Expires</th>
                <th className="px-4 py-3">Logins</th>
                <th className="px-4 py-3">Last active</th>
                <th className="px-4 py-3">Actions</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((r) => (
                <tr key={r.id} className="border-t border-gray-50 align-top">
                  <td className="px-4 py-3">
                    <div className="font-medium text-gray-800">{r.prospect_name}</div>
                    <div className="text-xs text-gray-500">{r.gym_name}{r.prospect_phone ? ` · ${r.prospect_phone}` : ""}</div>
                    <div className="text-xs text-gray-400">{r.members} sample members</div>
                  </td>
                  <td className="px-4 py-3 text-gray-600 break-all">{r.login_email}</td>
                  <td className="px-4 py-3"><Badge status={r.state} /></td>
                  <td className="px-4 py-3 text-gray-600">{dt(r.expires_at)}</td>
                  <td className="px-4 py-3 text-gray-600">{r.login_count}</td>
                  <td className="px-4 py-3 text-gray-600">{dt(r.last_active_at || r.last_login_at)}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap gap-2">
                      <Button variant="outline" onClick={() => setConfirm({ type: "password", row: r })}>New password</Button>
                      <Button variant="outline" onClick={() => setConfirm({ type: "extend", row: r })}>+7 days</Button>
                      <Button variant="outline" onClick={() => setConfirm({ type: "reset", row: r })}>Reset data</Button>
                      {r.state === "active" && <Button variant="outline" onClick={() => setConfirm({ type: "revoke", row: r })}>Switch off</Button>}
                      <Button variant="danger" onClick={() => setConfirm({ type: "delete", row: r })}>Delete</Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal isOpen={showForm} onClose={() => setShowForm(false)} title="New gym demo">
        <div className="space-y-3">
          <Input label="Prospect name *" value={form.prospect_name} onChange={set("prospect_name")} placeholder="e.g. Rohit Sharma" />
          <Input label="Gym name (shown in the demo)" value={form.gym_name} onChange={set("gym_name")} placeholder="e.g. Iron Paradise Gym" />
          <div className="grid grid-cols-2 gap-3">
            <Input label="Phone" value={form.prospect_phone} onChange={set("prospect_phone")} placeholder="10-digit mobile" />
            <Input label="City" value={form.city} onChange={set("city")} placeholder="Bhopal" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input label="Valid for (days, 1-30)" type="number" value={form.days} onChange={set("days")} />
            <Input label="Password (optional)" value={form.password} onChange={set("password")} placeholder="Auto-generated" />
          </div>
          <Input label="Notes (only you see this)" value={form.notes} onChange={set("notes")} />
          <div className="flex justify-end gap-3 pt-2">
            <Button variant="outline" onClick={() => setShowForm(false)}>Cancel</Button>
            <Button onClick={create} loading={creating}>Create demo</Button>
          </div>
        </div>
      </Modal>

      <Modal isOpen={!!creds} onClose={() => setCreds(null)} title="Demo login details">
        {creds && (
          <div className="space-y-3">
            <pre className="bg-gray-50 border border-gray-100 rounded-lg p-3 text-sm whitespace-pre-wrap break-all">{shareText(creds)}</pre>
            <p className="text-xs text-gray-500">The password is shown only now. Use "New password" later if you need to resend it.</p>
            <div className="flex justify-end gap-3">
              <Button variant="outline" onClick={() => setCreds(null)}>Close</Button>
              <Button onClick={() => copy(shareText(creds))}><Copy size={14} /> Copy all</Button>
            </div>
          </div>
        )}
      </Modal>

      <ConfirmDialog
        isOpen={!!confirm}
        onClose={() => setConfirm(null)}
        onConfirm={run}
        title={ct?.[0]}
        message={ct?.[1]}
        confirmText={ct?.[2]}
        variant={ct?.[3]}
        loading={busy}
      />
    </DashboardLayout>
  );
}
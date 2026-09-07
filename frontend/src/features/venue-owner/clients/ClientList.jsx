import React, { useState } from "react";
import { Link } from "react-router-dom";
import DashboardLayout from "../../../components/layout/DashboardLayout.jsx";
import { ownerSidebarItems } from "../ownerSidebarItems.js";
import { useVenue } from "../../../context/VenueContext.jsx";
import { useFetch } from "../../../hooks/useFetch";
import { clientService } from "../../../services/clientService";
import Button from "../../../components/common/Button";
import Modal from "../../../components/common/Modal";
import Input from "../../../components/common/Input";
import Select from "../../../components/common/Select";
import MultiSelect from "../../../components/common/MultiSelect";
import Loader from "../../../components/common/Loader";
import EmptyState from "../../../components/common/EmptyState";
import ConfirmDialog from "../../../components/common/ConfirmDialog";
import { formatCurrency, formatDate } from "../../../lib/formatters";
import { showSuccess, showError } from "../../../components/common/Toast";
import { VENUE_TYPE_OPTIONS } from "../../../lib/venueTypes";
import { Plus, Pencil, Trash2, Phone, Mail, Users2 } from "lucide-react";

const emptyForm = {
  name: "",
  phone: "",
  email: "",
  slot_id: "",
  venue_type: [],
  event_type: "",
  guest_count: "",
  notes: ""
};

export default function ClientList() {
  const { venue } = useVenue();
  const { data: clients, loading, refetch } = useFetch(venue ? `/venues/${venue.id}/clients` : null, { skip: !venue });
  const { data: slots } = useFetch(venue ? `/venues/${venue.id}/slots` : null, { skip: !venue });

  const [modalOpen, setModalOpen] = useState(false);
  const [addForm, setAddForm] = useState(emptyForm);
  const [adding, setAdding] = useState(false);

  const [editingClient, setEditingClient] = useState(null);
  const [editForm, setEditForm] = useState(emptyForm);
  const [editing, setEditing] = useState(false);

  const [deletingClient, setDeletingClient] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const venueTypeOptions = VENUE_TYPE_OPTIONS.filter(
    (opt) => opt.value && venue?.venue_type?.includes(opt.value)
  );

  const updateAdd = (field, value) => setAddForm((f) => ({ ...f, [field]: value }));
  const updateEdit = (field, value) => setEditForm((f) => ({ ...f, [field]: value }));

  const openAdd = () => {
    setAddForm(emptyForm);
    setModalOpen(true);
  };

  const buildPayload = (form) => ({
    name: form.name,
    phone: form.phone,
    email: form.email || null,
    slot_id: form.slot_id || null,
    venue_type: form.venue_type,
    event_type: form.event_type || null,
    guest_count: form.guest_count ? Number(form.guest_count) : null,
    notes: form.notes || null
  });

  const onAddSubmit = async (e) => {
    e.preventDefault();
    if (!addForm.name.trim() || !addForm.phone.trim()) {
      return showError("Name and phone are required");
    }
    setAdding(true);
    try {
      await clientService.create(venue.id, buildPayload(addForm));
      showSuccess("Client added");
      setModalOpen(false);
      refetch();
    } catch (err) {
      showError(err.response?.data?.message || "Failed to add client");
    } finally {
      setAdding(false);
    }
  };

  const openEdit = (client) => {
    setEditingClient(client);
    setEditForm({
      name: client.name || "",
      phone: client.phone || "",
      email: client.email || "",
      slot_id: client.slot_id || "",
      venue_type: client.venue_type || [],
      event_type: client.event_type || "",
      guest_count: client.guest_count ?? "",
      notes: client.notes || ""
    });
  };

  const onEditSubmit = async (e) => {
    e.preventDefault();
    if (!editForm.name.trim() || !editForm.phone.trim()) {
      return showError("Name and phone are required");
    }
    setEditing(true);
    try {
      await clientService.update(venue.id, editingClient.id, buildPayload(editForm));
      showSuccess("Client updated");
      setEditingClient(null);
      refetch();
    } catch (err) {
      showError(err.response?.data?.message || "Failed to update client");
    } finally {
      setEditing(false);
    }
  };

  const confirmDelete = async () => {
    setDeleting(true);
    try {
      await clientService.delete(venue.id, deletingClient.id);
      showSuccess("Client deleted");
      setDeletingClient(null);
      refetch();
    } catch (err) {
      showError(err.response?.data?.message || "Failed to delete client");
    } finally {
      setDeleting(false);
    }
  };

  const venueTypeLabels = (values) =>
    (values || [])
      .map((v) => VENUE_TYPE_OPTIONS.find((opt) => opt.value === v)?.label || v)
      .join(", ");

  const clientForm = (form, update, onSubmit, submitting, submitLabel) => (
    <form onSubmit={onSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <Input label="Name *" value={form.name} onChange={(e) => update("name", e.target.value)} />
        <Input label="Phone *" value={form.phone} onChange={(e) => update("phone", e.target.value)} />
      </div>

      <Input
        label="Email (optional)"
        type="email"
        value={form.email}
        onChange={(e) => update("email", e.target.value)}
      />

      <Select
        label="Slot (optional)"
        value={form.slot_id}
        onChange={(e) => update("slot_id", e.target.value)}
        options={[{ value: "", label: "Select slot" }, ...(slots || []).map((s) => ({
          value: s.id,
          label: `${s.name} (${s.start_time} – ${s.end_time})`
        }))]}
      />

      {venueTypeOptions.length > 0 && (
        <MultiSelect
          label="Venue Type / Hall (optional)"
          options={venueTypeOptions}
          value={form.venue_type}
          onChange={(val) => update("venue_type", val)}
          placeholder="e.g. Marriage Hall, Banquet Hall..."
        />
      )}

      <div className="grid grid-cols-2 gap-3">
        <Input
          label="Event Type (optional)"
          placeholder="e.g. Wedding"
          value={form.event_type}
          onChange={(e) => update("event_type", e.target.value)}
        />
        <Input
          label="Guest Count (optional)"
          type="number"
          value={form.guest_count}
          onChange={(e) => update("guest_count", e.target.value)}
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">Notes (optional)</label>
        <textarea
          rows={2}
          value={form.notes}
          onChange={(e) => update("notes", e.target.value)}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500 resize-none"
        />
      </div>

      <Button type="submit" loading={submitting} className="w-full">{submitLabel}</Button>
    </form>
  );

  return (
    <DashboardLayout sidebarItems={ownerSidebarItems} pageTitle="Clients">
      <div className="flex justify-between md:justify-end items-center mb-4">
        <h2 className="font-display font-semibold text-navy-800 text-[15px] md:hidden">
          {clients?.length || 0} client{clients?.length === 1 ? "" : "s"}
        </h2>
        <Button onClick={openAdd}><Plus size={16} /> Add Client</Button>
      </div>

      {loading ? (
        <Loader />
      ) : !clients || clients.length === 0 ? (
        <EmptyState title="No clients yet" />
      ) : (
        <>
          {/* Mobile: cards - name/contact up top, money stats front and center, rest tucked below */}
          <div className="md:hidden space-y-3">
            {clients.map((c) => (
              <div key={c.id} className="bg-white rounded-2xl shadow-card border border-navy-100/60 p-4">
                <div className="flex items-start justify-between gap-3">
                  <Link to={`/dashboard/clients/${c.id}`} className="min-w-0">
                    <p className="font-semibold text-navy-900 truncate">{c.name}</p>
                    <p className="flex items-center gap-1 text-xs text-navy-400 mt-0.5">
                      <Phone size={11} /> {c.phone}
                    </p>
                  </Link>
                  <div className="flex items-center gap-1 shrink-0">
                    <button onClick={() => openEdit(c)} className="tap-scale w-8 h-8 flex items-center justify-center rounded-lg text-navy-400" title="Edit client">
                      <Pencil size={15} />
                    </button>
                    <button onClick={() => setDeletingClient(c)} className="tap-scale w-8 h-8 flex items-center justify-center rounded-lg text-navy-400" title="Delete client">
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 mt-3 pt-3 border-t border-navy-100/60">
                  <div>
                    <p className="text-[11px] text-navy-400">Total Business</p>
                    <p className="font-semibold text-navy-900 text-sm">{formatCurrency(c.total_business_value)}</p>
                  </div>
                  <div>
                    <p className="text-[11px] text-navy-400">Pending Balance</p>
                    <p className="font-semibold text-primary-600 text-sm">{formatCurrency(c.pending_balance)}</p>
                  </div>
                </div>

                {(c.event_type || c.guest_count || c.slot) && (
                  <div className="flex flex-wrap gap-2 mt-3">
                    {c.event_type && (
                      <span className="text-xs text-navy-500 bg-paper rounded-lg px-2.5 py-1.5">{c.event_type}</span>
                    )}
                    {c.slot && (
                      <span className="text-xs text-navy-500 bg-paper rounded-lg px-2.5 py-1.5">{c.slot.name}</span>
                    )}
                    {c.guest_count ? (
                      <span className="flex items-center gap-1 text-xs text-navy-500 bg-paper rounded-lg px-2.5 py-1.5">
                        <Users2 size={12} /> {c.guest_count} guests
                      </span>
                    ) : null}
                  </div>
                )}

                <p className="text-[11px] text-navy-400 mt-3">Added {formatDate(c.createdAt)}</p>
              </div>
            ))}
          </div>

          {/* Desktop: full table */}
          <div className="hidden md:block bg-white rounded-2xl shadow-card border border-navy-100/60 overflow-x-auto">
            <table className="w-full text-sm min-w-[980px]">
              <thead className="bg-paper text-navy-400 text-left">
                <tr>
                  <th className="px-4 py-3 font-medium">Name</th>
                  <th className="px-4 py-3 font-medium">Phone</th>
                  <th className="px-4 py-3 font-medium">Email</th>
                  <th className="px-4 py-3 font-medium">Slot</th>
                  <th className="px-4 py-3 font-medium">Venue Type</th>
                  <th className="px-4 py-3 font-medium">Event Type</th>
                  <th className="px-4 py-3 font-medium">Guests</th>
                  <th className="px-4 py-3 font-medium">Total Business</th>
                  <th className="px-4 py-3 font-medium">Pending Balance</th>
                  <th className="px-4 py-3 font-medium">Added On</th>
                  <th className="px-4 py-3 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {clients.map((c) => (
                  <tr key={c.id} className="border-t border-navy-100/60 hover:bg-paper">
                    <td className="px-4 py-3">
                      <Link to={`/dashboard/clients/${c.id}`} className="font-medium text-primary-600">{c.name}</Link>
                    </td>
                    <td className="px-4 py-3 text-navy-600">{c.phone}</td>
                    <td className="px-4 py-3 text-navy-400">{c.email || "-"}</td>
                    <td className="px-4 py-3 text-navy-400">{c.slot ? `${c.slot.name}` : "-"}</td>
                    <td className="px-4 py-3 text-navy-400">{venueTypeLabels(c.venue_type) || "-"}</td>
                    <td className="px-4 py-3 text-navy-400">{c.event_type || "-"}</td>
                    <td className="px-4 py-3 text-navy-400">{c.guest_count ?? "-"}</td>
                    <td className="px-4 py-3 text-navy-700">{formatCurrency(c.total_business_value)}</td>
                    <td className="px-4 py-3 text-primary-600 font-medium">{formatCurrency(c.pending_balance)}</td>
                    <td className="px-4 py-3 text-navy-400">{formatDate(c.createdAt)}</td>
                    <td className="px-4 py-3">
                      <div className="flex justify-end gap-3">
                        <button
                          onClick={() => openEdit(c)}
                          className="text-navy-400 hover:text-primary-600"
                          title="Edit client"
                        >
                          <Pencil size={16} />
                        </button>
                        <button
                          onClick={() => setDeletingClient(c)}
                          className="text-navy-400 hover:text-primary-600"
                          title="Delete client"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {/* Add Client Modal */}
      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title="Add Client" size="lg">
        {clientForm(addForm, updateAdd, onAddSubmit, adding, "Add Client")}
      </Modal>

      {/* Edit Client Modal */}
      <Modal isOpen={!!editingClient} onClose={() => setEditingClient(null)} title="Edit Client" size="lg">
        {clientForm(editForm, updateEdit, onEditSubmit, editing, "Save Changes")}
      </Modal>

      {/* Delete Confirmation */}
      <ConfirmDialog
        isOpen={!!deletingClient}
        onClose={() => setDeletingClient(null)}
        onConfirm={confirmDelete}
        loading={deleting}
        title="Delete Client"
        message={`Are you sure you want to delete "${deletingClient?.name}"? This cannot be undone. Clients with existing bookings cannot be deleted.`}
        confirmLabel="Delete"
      />
    </DashboardLayout>
  );
}
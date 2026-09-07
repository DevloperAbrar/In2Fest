import React, { useState } from "react";
import DashboardLayout from "../../../components/layout/DashboardLayout.jsx";
import { adminSidebarItems } from "../adminSidebarItems.js";
import { useFetch } from "../../../hooks/useFetch";
import Button from "../../../components/common/Button";
import Modal from "../../../components/common/Modal";
import Loader from "../../../components/common/Loader";
import EmptyState from "../../../components/common/EmptyState";
import ManualPaymentForm from "./ManualPaymentForm.jsx";
import { formatCurrency, formatDate } from "../../../lib/formatters";
import { Plus } from "lucide-react";

export default function PaymentList() {
  const { data: payments, loading, refetch } = useFetch("/payments");
  const [modalOpen, setModalOpen] = useState(false);

  return (
    <DashboardLayout sidebarItems={adminSidebarItems} pageTitle="Payments & Subscriptions">
      <div className="flex justify-end mb-4">
        <Button onClick={() => setModalOpen(true)}><Plus size={16} /> Log Manual Payment</Button>
      </div>

      {loading ? (
        <Loader />
      ) : payments.length === 0 ? (
        <EmptyState title="No payments recorded yet" />
      ) : (
        <div className="bg-white rounded-xl border border-gray-100 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-gray-500 text-left">
              <tr>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Venue</th>
                <th className="px-4 py-3">Amount</th>
                <th className="px-4 py-3">Method</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {payments.map((p) => (
                <tr key={p.id} className="border-t border-gray-50">
                  <td className="px-4 py-3">{formatDate(p.created_at)}</td>
                  <td className="px-4 py-3">{p.venue_id}</td>
                  <td className="px-4 py-3">{formatCurrency(p.amount)}</td>
                  <td className="px-4 py-3 capitalize">{p.method?.replace("_", " ")}</td>
                  <td className="px-4 py-3 capitalize">{p.status}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <Modal isOpen={modalOpen} onClose={() => setModalOpen(false)} title="Log Manual Payment">
        <ManualPaymentForm onSaved={() => { setModalOpen(false); refetch(); }} onCancel={() => setModalOpen(false)} />
      </Modal>
    </DashboardLayout>
  );
}
import React, { useState } from "react";
import DashboardLayout from "../../../components/layout/DashboardLayout.jsx";
import { ownerSidebarItems } from "../ownerSidebarItems.js";
import { useVenue } from "../../../context/VenueContext.jsx";
import { useFetch } from "../../../hooks/useFetch";
import { billingService } from "../../../services/billingService";
import Input from "../../../components/common/Input";
import Button from "../../../components/common/Button";
import Loader from "../../../components/common/Loader";
import EmptyState from "../../../components/common/EmptyState";
import { showSuccess, showError } from "../../../components/common/Toast";
import { formatCurrency } from "../../../lib/formatters";
import { Plus, Trash2 } from "lucide-react";
import { useForm } from "react-hook-form";

export default function ServiceCatalog() {
  const { venue } = useVenue();
  const { data: items, loading, refetch } = useFetch(venue ? `/venues/${venue.id}/billing/service-items` : null, { skip: !venue });
  const { register, handleSubmit, reset, formState: { isSubmitting } } = useForm();

  const onSubmit = async (values) => {
    try {
      await billingService.createServiceItem(venue.id, values);
      showSuccess("Service item added");
      reset();
      refetch();
    } catch {
      showError("Failed to add item");
    }
  };

  const remove = async (itemId) => {
    try {
      await billingService.deleteServiceItem(venue.id, itemId);
      showSuccess("Item removed");
      refetch();
    } catch {
      showError("Failed to remove item");
    }
  };

  return (
    <DashboardLayout sidebarItems={ownerSidebarItems} pageTitle="Service Item Catalog">
      <div className="max-w-xl bg-white p-6 rounded-xl border border-gray-100 space-y-6">
        <form onSubmit={handleSubmit(onSubmit)} className="grid grid-cols-3 gap-3">
          <Input placeholder="Item name" {...register("name", { required: true })} />
          <Input placeholder="Price (₹)" type="number" {...register("default_price", { required: true })} />
          <Button type="submit" loading={isSubmitting}><Plus size={16} /> Add</Button>
        </form>

        {loading ? (
          <Loader />
        ) : !items || items.length === 0 ? (
          <EmptyState title="No service items yet" description="Add reusable items like 'Generator Backup' or 'Extra Chairs' to speed up billing." />
        ) : (
          <ul className="space-y-2">
            {items.map((item) => (
              <li key={item.id} className="flex justify-between items-center bg-gray-50 px-3 py-2 rounded-lg">
                <span className="text-sm">{item.name}  - {formatCurrency(item.default_price)}</span>
                <button onClick={() => remove(item.id)} className="text-red-500 hover:text-red-700">
                  <Trash2 size={14} />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>
    </DashboardLayout>
  );
}
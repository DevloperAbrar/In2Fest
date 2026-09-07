import React, { useEffect } from "react";
import { useForm } from "react-hook-form";
import { useNavigate } from "react-router-dom";
import DashboardLayout from "../../../components/layout/DashboardLayout.jsx";
import { ownerSidebarItems } from "../ownerSidebarItems.js";
import { useVenue } from "../../../context/VenueContext.jsx";
import Button from "../../../components/common/Button";
import { venueService } from "../../../services/venueService";
import { showSuccess, showError } from "../../../components/common/Toast";

export default function AboutEditor() {
  const { venue, refetchVenue } = useVenue();
  const navigate = useNavigate();

  const { register, handleSubmit, reset, formState: { isSubmitting } } = useForm({
    defaultValues: { about_text: "" }
  });

  // FIX: reset form once venue data loads
  useEffect(() => {
    if (venue) {
      reset({ about_text: venue.about_text || "" });
    }
  }, [venue, reset]);

  const onSubmit = async (values) => {
    try {
      await venueService.update(venue.id, values);
      await refetchVenue();
      showSuccess("About section updated");
      navigate("/dashboard");
    } catch {
      showError("Failed to update");
    }
  };

  return (
    <DashboardLayout sidebarItems={ownerSidebarItems} pageTitle="About Section">
      <form onSubmit={handleSubmit(onSubmit)} className="max-w-xl bg-white p-6 rounded-xl border border-gray-100 space-y-4">
        <label className="block text-sm font-medium text-gray-700">Description</label>
        <textarea
          rows={6}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
          {...register("about_text")}
        />
        <div className="flex gap-3">
          <Button type="submit" loading={isSubmitting}>Save</Button>
          <Button type="button" variant="outline" onClick={() => navigate("/dashboard/website")}>
            Back to Website Builder
          </Button>
        </div>
      </form>
    </DashboardLayout>
  );
}
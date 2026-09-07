import React, { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import { useNavigate } from "react-router-dom";
import DashboardLayout from "../../../components/layout/DashboardLayout.jsx";
import { ownerSidebarItems } from "../ownerSidebarItems.js";
import { useVenue } from "../../../context/VenueContext.jsx";
import Input from "../../../components/common/Input";
import Button from "../../../components/common/Button";
import { venueService } from "../../../services/venueService";
import { showSuccess, showError } from "../../../components/common/Toast";
import { BACKEND_URL } from "../../../lib/constants"; // ADD

export default function HeroEditor() {
  const { venue, refetchVenue } = useVenue();
  const navigate = useNavigate();
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);

  const { register, handleSubmit, reset, formState: { isSubmitting } } = useForm({
    defaultValues: { hero_heading: "", hero_subheading: "", hero_button_text: "Enquire Now" }
  });

  useEffect(() => {
    if (venue) {
      reset({
        hero_heading: venue.hero_heading || "",
        hero_subheading: venue.hero_subheading || "",
        hero_button_text: venue.hero_button_text || "Enquire Now"
      });
    }
  }, [venue, reset]);

  const onSubmit = async (values) => {
    try {
      await venueService.update(venue.id, values);
      await refetchVenue();
      showSuccess("Hero section updated");
      navigate("/dashboard");
    } catch {
      showError("Failed to update");
    }
  };

  const handleImageUpload = async () => {
    if (!file) return showError("Please select an image first");
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append("heroImage", file);
      await venueService.uploadHeroImage(venue.id, formData);
      await refetchVenue();
      showSuccess("Hero image uploaded");
    } catch {
      showError("Failed to upload image");
    } finally {
      setUploading(false);
    }
  };

  return (
    <DashboardLayout sidebarItems={ownerSidebarItems} pageTitle="Hero Section">
      <div className="max-w-xl bg-white p-6 rounded-xl border border-gray-100 space-y-6">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Hero Image</label>
          {venue?.hero_image_url && (
            <img
            src={venue.hero_image_url}
              alt="hero"
              className="w-full h-40 object-cover rounded-lg mb-3"
            />
          )}
          <input type="file" accept="image/*" onChange={(e) => setFile(e.target.files[0])} className="mb-2 text-sm" />
          <Button onClick={handleImageUpload} loading={uploading} variant="outline">Upload Image</Button>
        </div>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <Input label="Heading" {...register("hero_heading")} />
          <Input label="Subheading" {...register("hero_subheading")} />
          <Input label="Button Text" {...register("hero_button_text")} />
          <div className="flex gap-3">
            <Button type="submit" loading={isSubmitting}>Save</Button>
            <Button type="button" variant="outline" onClick={() => navigate("/dashboard/website")}>Back to Website Builder</Button>
          </div>
        </form>
      </div>
    </DashboardLayout>
  );
}
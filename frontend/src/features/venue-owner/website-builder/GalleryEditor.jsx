import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import DashboardLayout from "../../../components/layout/DashboardLayout.jsx";
import { ownerSidebarItems } from "../ownerSidebarItems.js";
import { useVenue } from "../../../context/VenueContext.jsx";
import Button from "../../../components/common/Button";
import { venueService } from "../../../services/venueService";
import { showSuccess, showError } from "../../../components/common/Toast";
import { Trash2 } from "lucide-react";

export default function GalleryEditor() {
  const { venue, refetchVenue } = useVenue();
  const navigate = useNavigate();
  const [files, setFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  const handleUpload = async () => {
    if (files.length === 0) return showError("Select images first");
    setUploading(true);
    try {
      const formData = new FormData();
      files.forEach((f) => formData.append("galleryImages", f));
      await venueService.addGalleryImages(venue.id, formData);
      await refetchVenue();
      showSuccess("Gallery updated");
      setFiles([]);
    } catch (err) {
      showError(err.response?.data?.message || "Failed to upload images");
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (imageId) => {
    if (!window.confirm("Delete this photo?")) return;
    setDeletingId(imageId);
    try {
      await venueService.deleteGalleryImage(venue.id, imageId);
      await refetchVenue();
      showSuccess("Photo deleted");
    } catch (err) {
      showError(err.response?.data?.message || "Failed to delete photo");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <DashboardLayout sidebarItems={ownerSidebarItems} pageTitle="Gallery">
      <div className="max-w-3xl bg-white p-6 rounded-xl border border-gray-100 space-y-4">
        <div className="grid grid-cols-4 gap-3">
          {(venue?.gallery || []).map((img) => (
            <div key={img.id} className="relative group">
              <img
                src={img.url}
                alt=""
                className="w-full h-24 object-cover rounded-lg"
              />
              {/* Delete button  - shows on hover */}
              <button
                onClick={() => handleDelete(img.id)}
                disabled={deletingId === img.id}
                className="absolute top-1 right-1 bg-red-500 text-white rounded-full p-1 
                           opacity-0 group-hover:opacity-100 transition-opacity
                           hover:bg-red-600 disabled:opacity-50"
              >
                <Trash2 size={12} />
              </button>
              {deletingId === img.id && (
                <div className="absolute inset-0 bg-black/40 rounded-lg flex items-center justify-center">
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                </div>
              )}
            </div>
          ))}
        </div>

        <input
          type="file"
          accept="image/*"
          multiple
          onChange={(e) => setFiles(Array.from(e.target.files))}
          className="text-sm"
        />
        <p className="text-xs text-gray-400">{(venue?.gallery || []).length}/20 photos used</p>
        {(venue?.gallery || []).length === 0 && (
          <p className="text-xs text-amber-600">Upload at least one photo to continue</p>
        )}
        <div className="flex gap-3">
          <Button onClick={handleUpload} loading={uploading}>Upload Photos</Button>
          <Button variant="outline" onClick={() => navigate("/dashboard/website")}>Back to Website Builder</Button>
          <Button
            onClick={() => navigate("/dashboard")}
            disabled={(venue?.gallery || []).length === 0}
          >
            Next
          </Button>
        </div>
      </div>
    </DashboardLayout>
  );
}
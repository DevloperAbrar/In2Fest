import React, { useRef, useState } from "react";
import { ImagePlus, Trash2, Info, Loader2 } from "lucide-react";
import Button from "../../../../components/common/Button";
import { showSuccess, showError } from "../../../../components/common/Toast";
import { marketplaceProfileService } from "../../../../services/marketplaceProfileService";
import { BACKEND_URL } from "../../../../lib/constants";
import GymLogoUploader from "../../gym/GymLogoUploader.jsx";

const MAX_MB = 5;
const ALLOWED_TYPES = ["image/jpeg", "image/png", "image/webp"];

const imgSrc = (path) => {
  if (!path) return "";
  if (/^https?:\/\//i.test(path)) return path;
  return `${BACKEND_URL}${path.startsWith("/") ? "" : "/"}${path}`;
};

function checkFiles(files) {
  for (const file of files) {
    if (!ALLOWED_TYPES.includes(file.type)) return "Only JPG, PNG or WEBP images are allowed";
    if (file.size > MAX_MB * 1024 * 1024) return `Each image must be under ${MAX_MB} MB`;
  }
  return null;
}

export default function PhotosTab({ venue, photoUpload, onChanged, onNext, onBack }) {
  const heroInput = useRef(null);
  const galleryInput = useRef(null);
  const [uploadingHero, setUploadingHero] = useState(false);
  const [uploadingGallery, setUploadingGallery] = useState(false);
  const [deletingId, setDeletingId] = useState(null);
  const isGym = [venue.business_category, ...(venue.secondary_categories || [])].includes("gym-fitness");
  const maxGallery = photoUpload?.max_gallery || 4;
  const gallery = Array.isArray(venue.gallery) ? venue.gallery : [];
  const emptySlots = Math.max(0, maxGallery - gallery.length);

  const handleHero = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;

    const problem = checkFiles([file]);
    if (problem) return showError(problem);

    setUploadingHero(true);
    try {
      const formData = new FormData();
      formData.append("heroImage", file);
      await marketplaceProfileService.uploadHeroPhoto(venue.id, formData);
      showSuccess("Hero image updated");
      await onChanged();
    } catch (err) {
      showError(err.response?.data?.message || "Could not upload the hero image");
    } finally {
      setUploadingHero(false);
    }
  };

  const handleGallery = async (e) => {
    const files = Array.from(e.target.files || []);
    e.target.value = "";
    if (!files.length) return;

    if (files.length > emptySlots) {
      return showError(
        emptySlots === 0
          ? `You already have ${maxGallery} photos. Remove one to add another.`
          : `You can add only ${emptySlots} more photo${emptySlots > 1 ? "s" : ""}`
      );
    }
    const problem = checkFiles(files);
    if (problem) return showError(problem);

    setUploadingGallery(true);
    try {
      const formData = new FormData();
      files.forEach((file) => formData.append("galleryImages", file));
      await marketplaceProfileService.uploadGalleryPhotos(venue.id, formData);
      showSuccess(files.length > 1 ? "Photos added" : "Photo added");
      await onChanged();
    } catch (err) {
      showError(err.response?.data?.message || "Could not upload the photos");
    } finally {
      setUploadingGallery(false);
    }
  };

  const handleDelete = async (imageId) => {
    if (!window.confirm("Remove this photo from your marketplace profile?")) return;
    setDeletingId(imageId);
    try {
      await marketplaceProfileService.deleteGalleryPhoto(venue.id, imageId);
      showSuccess("Photo removed");
      await onChanged();
    } catch (err) {
      showError(err.response?.data?.message || "Could not remove the photo");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="bg-blue-50 border border-blue-100 rounded-lg p-3 flex items-start gap-2">
        <Info size={16} className="text-blue-600 mt-0.5 flex-shrink-0" />
        <p className="text-sm text-blue-800">
          Your free listing can show 1 hero image and up to {maxGallery} photos. Businesses with a good hero image
          and photos get more enquiries. Want more photos and your own website? Upgrade your plan and manage
          images from the Website Builder.
        </p>
      </div>

      {/* Hero image */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">Hero image</label>
        <p className="text-xs text-gray-500 mb-2">
          The large banner at the top of your marketplace page and the picture on your search card.
          Use a wide photo (around 1600 x 900). JPG, PNG or WEBP, up to {MAX_MB} MB.
        </p>
        <div className="relative w-full h-48 md:h-64 rounded-xl overflow-hidden bg-gray-100 border border-gray-200">
          {venue.hero_image_url ? (
            <img src={imgSrc(venue.hero_image_url)} alt="Hero" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-sm text-gray-400">
              No hero image yet
            </div>
          )}
          {uploadingHero && (
            <div className="absolute inset-0 bg-white/70 flex items-center justify-center">
              <Loader2 className="w-6 h-6 animate-spin text-primary-600" />
            </div>
          )}
        </div>
        <input
          ref={heroInput}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          className="hidden"
          onChange={handleHero}
        />
        <Button
          variant="outline"
          className="mt-3"
          loading={uploadingHero}
          onClick={() => heroInput.current?.click()}
        >
          <ImagePlus size={16} />
          {venue.hero_image_url ? "Change hero image" : "Upload hero image"}
        </Button>
      </div>

      {/* Gym logo: printed on member cards, receipts and workout PDFs */}
      {isGym && (
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">Gym logo</label>
          <GymLogoUploader venueId={venue.id} logoUrl={venue.logo_url} onChanged={onChanged} />
        </div>
      )}

      {/* Gallery */}
      <div>
        <div className="flex items-center justify-between mb-2">
          <label className="block text-sm font-medium text-gray-700">Photos</label>
          <span className="text-xs text-gray-500">
            {gallery.length} / {maxGallery} added
          </span>
        </div>

        <input
          ref={galleryInput}
          type="file"
          accept="image/jpeg,image/png,image/webp"
          multiple
          className="hidden"
          onChange={handleGallery}
        />

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {gallery.map((img) => (
            <div key={img.id} className="relative group rounded-xl overflow-hidden border border-gray-200 bg-gray-100">
              <img src={imgSrc(img.url)} alt="" className="w-full h-32 object-cover" />
              <button
                type="button"
                onClick={() => handleDelete(img.id)}
                disabled={deletingId === img.id}
                aria-label="Remove photo"
                className="absolute top-2 right-2 bg-white/90 hover:bg-white text-red-600 rounded-full p-1.5 shadow disabled:opacity-60"
              >
                {deletingId === img.id ? <Loader2 size={14} className="animate-spin" /> : <Trash2 size={14} />}
              </button>
            </div>
          ))}

          {Array.from({ length: emptySlots }).map((_, i) => (
            <button
              key={`empty-${i}`}
              type="button"
              disabled={uploadingGallery}
              onClick={() => galleryInput.current?.click()}
              className="h-32 rounded-xl border-2 border-dashed border-gray-300 hover:border-primary-400 hover:bg-primary-50/40 flex flex-col items-center justify-center gap-1 text-gray-400 hover:text-primary-600 transition-colors disabled:opacity-60"
            >
              {uploadingGallery && i === 0 ? (
                <Loader2 size={20} className="animate-spin" />
              ) : (
                <ImagePlus size={20} />
              )}
              <span className="text-xs font-medium">Add photo</span>
            </button>
          ))}
        </div>

        {gallery.length > maxGallery && (
          <p className="text-xs text-amber-700 mt-2">
            You have more than {maxGallery} photos from an earlier plan. Remove some if you want to add new ones.
          </p>
        )}
      </div>

      <div className="flex items-center justify-between pt-2">
        {onBack ? <Button variant="outline" onClick={onBack}>Back</Button> : <span />}
        {onNext && <Button variant="outline" onClick={onNext}>Next</Button>}
      </div>
    </div>
  );
}
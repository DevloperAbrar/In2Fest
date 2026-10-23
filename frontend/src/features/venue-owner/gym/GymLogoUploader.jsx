import React, { useEffect, useRef, useState } from "react";
import { ImagePlus, Trash2 } from "lucide-react";
import Button from "../../../components/common/Button";
import { showSuccess, showError } from "../../../components/common/Toast";
import { gymService } from "../../../services/gymService";

const MAX_MB = 5;
const ALLOWED = ["image/jpeg", "image/png", "image/webp"];

// Gym logo picker. The logo is printed on the membership card, receipts and workout PDFs.
// Used next to the hero image (Marketplace Profile > Hero & Photos, Website Builder > Hero) and in Gym settings.
export default function GymLogoUploader({ venueId, logoUrl, onChanged }) {
  const inputRef = useRef(null);
  const [url, setUrl] = useState(logoUrl || "");
  const [busy, setBusy] = useState(false);

  useEffect(() => { setUrl(logoUrl || ""); }, [logoUrl]);

  const pick = async (e) => {
    const file = e.target.files && e.target.files[0];
    e.target.value = "";
    if (!file) return;
    if (!ALLOWED.includes(file.type)) return showError("Only JPG, PNG or WEBP images are allowed");
    if (file.size > MAX_MB * 1024 * 1024) return showError(`Logo must be under ${MAX_MB} MB`);
    setBusy(true);
    try {
      const res = await gymService.uploadLogo(venueId, file);
      setUrl(res?.data?.data?.logo_url || "");
      showSuccess("Logo saved");
      if (onChanged) await onChanged();
    } catch (err) {
      showError(err.response?.data?.message || "Could not upload the logo");
    } finally {
      setBusy(false);
    }
  };

  const remove = async () => {
    if (!window.confirm("Remove your gym logo from the card, receipts and PDFs?")) return;
    setBusy(true);
    try {
      await gymService.removeLogo(venueId);
      setUrl("");
      showSuccess("Logo removed");
      if (onChanged) await onChanged();
    } catch (err) {
      showError(err.response?.data?.message || "Could not remove the logo");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex items-center gap-4">
      <div className="w-24 h-24 rounded-2xl border border-gray-200 bg-white flex items-center justify-center overflow-hidden flex-shrink-0">
        {url ? (
          <img src={url} alt="Gym logo" className="max-w-full max-h-full object-contain p-2" />
        ) : (
          <span className="text-xs text-gray-400 text-center px-2">No logo yet</span>
        )}
      </div>
      <div className="space-y-2">
        <div className="flex flex-wrap gap-2">
          <Button variant="outline" loading={busy} onClick={() => inputRef.current && inputRef.current.click()}>
            <ImagePlus size={16} /> {url ? "Change logo" : "Upload logo"}
          </Button>
          {url && (
            <button type="button" disabled={busy} onClick={remove}
              className="px-3 py-2 text-sm text-red-600 hover:underline flex items-center gap-1.5 disabled:opacity-40">
              <Trash2 size={14} /> Remove
            </button>
          )}
        </div>
        <p className="text-xs text-gray-500">
          Shown on your member cards, receipts and workout PDFs. Use a square PNG with a transparent background. Up to {MAX_MB} MB.
        </p>
      </div>
      <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={pick} />
    </div>
  );
}
import React, { useState, useEffect } from "react";
import { AlertCircle } from "lucide-react";
import Input from "../../../../components/common/Input";
import Button from "../../../../components/common/Button";

export default function SocialMediaTab({ venue, onSave, saving, onNext, onBack }) {
  const [form, setForm] = useState({
    whatsapp_number: venue.whatsapp_number || "",
    instagram_handle: venue.instagram_handle || "",
    youtube_channel_link: venue.youtube_channel_link || "",
    external_website: venue.external_website || "",
    video_intro_url: venue.video_intro_url || ""
  });
  const [triedNext, setTriedNext] = useState(false);

  useEffect(() => {
    setForm({
      whatsapp_number: venue.whatsapp_number || "",
      instagram_handle: venue.instagram_handle || "",
      youtube_channel_link: venue.youtube_channel_link || "",
      external_website: venue.external_website || "",
      video_intro_url: venue.video_intro_url || ""
    });
  }, [venue]);

  const errors = [];
  if (!form.whatsapp_number.trim()) errors.push("WhatsApp number is required");
  if (!form.video_intro_url.trim()) errors.push("Video introduction link is required");
  const canGoNext = errors.length === 0;

  const handleNext = () => {
    setTriedNext(true);
    if (canGoNext) onNext();
  };

  return (
    <div className="space-y-5">
      <Input
        label="WhatsApp number (the number customers will message)"
        value={form.whatsapp_number}
        onChange={(e) => setForm({ ...form, whatsapp_number: e.target.value })}
      />
      <Input
        label="Instagram handle"
        placeholder="@yourbusiness"
        value={form.instagram_handle}
        onChange={(e) => setForm({ ...form, instagram_handle: e.target.value })}
      />
      <Input
        label="YouTube channel link"
        value={form.youtube_channel_link}
        onChange={(e) => setForm({ ...form, youtube_channel_link: e.target.value })}
      />
      <Input
        label="Your own website (if any)"
        value={form.external_website}
        onChange={(e) => setForm({ ...form, external_website: e.target.value })}
      />
      <Input
        label="Video introduction link (YouTube / Instagram reel URL)"
        value={form.video_intro_url}
        onChange={(e) => setForm({ ...form, video_intro_url: e.target.value })}
      />

      {triedNext && !canGoNext && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-start gap-2">
          <AlertCircle size={16} className="text-red-500 mt-0.5 flex-shrink-0" />
          <div className="text-sm text-red-700">
            <p className="font-medium mb-1">Please fill in the required fields before continuing:</p>
            <ul className="list-disc list-inside space-y-0.5">
              {errors.map((e) => <li key={e}>{e}</li>)}
            </ul>
          </div>
        </div>
      )}

      <div className="flex items-center justify-between pt-2">
        {onBack ? <Button variant="outline" onClick={onBack}>Back</Button> : <span />}
        <div className="flex items-center gap-2">
          <Button loading={saving} onClick={() => onSave(form)}>Save Social & Media</Button>
          {onNext && (
            <Button variant="outline" onClick={handleNext}>Next</Button>
          )}
        </div>
      </div>
    </div>
  );
}
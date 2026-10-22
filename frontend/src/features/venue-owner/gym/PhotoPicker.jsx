import React, { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { Camera, ImagePlus, RefreshCw, X } from "lucide-react";
import { showError } from "../../../components/common/Toast";

const MAX_SIDE = 800;
const TARGET_BYTES = 150 * 1024;

function toBlob(canvas, quality) {
  return new Promise((resolve, reject) => {
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error("Could not process the photo"))), "image/jpeg", quality);
  });
}

// JPEG that starts at high quality and steps down only until it is small enough.
async function encode(canvas) {
  let q = 0.86;
  let blob = await toBlob(canvas, q);
  while (blob.size > TARGET_BYTES && q > 0.62) {
    q -= 0.06;
    blob = await toBlob(canvas, q);
  }
  return blob;
}

async function loadBitmap(file) {
  if (window.createImageBitmap) {
    try {
      return await createImageBitmap(file, { imageOrientation: "from-image" });
    } catch {
      /* fall back to <img> below */
    }
  }
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => { URL.revokeObjectURL(url); resolve(img); };
    img.onerror = () => { URL.revokeObjectURL(url); reject(new Error("This file is not a valid image")); };
    img.src = url;
  });
}

// Gallery photo -> small, high quality JPEG File (max 800px on the long side).
export async function compressImage(file) {
  if (!file || !String(file.type).startsWith("image/")) throw new Error("Please choose an image file");
  const src = await loadBitmap(file);
  const sw = src.width || src.naturalWidth;
  const sh = src.height || src.naturalHeight;
  const scale = Math.min(1, MAX_SIDE / Math.max(sw, sh));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(sw * scale));
  canvas.height = Math.max(1, Math.round(sh * scale));
  const ctx = canvas.getContext("2d");
  ctx.fillStyle = "#fff"; // PNG transparency becomes white instead of black
  ctx.fillRect(0, 0, canvas.width, canvas.height);
  ctx.drawImage(src, 0, 0, canvas.width, canvas.height);
  if (typeof src.close === "function") src.close();
  const blob = await encode(canvas);
  return new File([blob], "member-photo.jpg", { type: "image/jpeg" });
}

// Live camera frame -> centre square, same crop the preview shows.
async function captureFromVideo(video) {
  const vw = video.videoWidth;
  const vh = video.videoHeight;
  if (!vw || !vh) throw new Error("Camera is not ready yet");
  const side = Math.min(vw, vh);
  const out = Math.min(side, MAX_SIDE);
  const canvas = document.createElement("canvas");
  canvas.width = out;
  canvas.height = out;
  canvas.getContext("2d").drawImage(video, (vw - side) / 2, (vh - side) / 2, side, side, 0, 0, out, out);
  const blob = await encode(canvas);
  return new File([blob], "member-photo.jpg", { type: "image/jpeg" });
}

function CameraCapture({ onCapture, onClose }) {
  const videoRef = useRef(null);
  const streamRef = useRef(null);
  const [facing, setFacing] = useState("user");
  const [error, setError] = useState("");
  const [ready, setReady] = useState(false);
  const [busy, setBusy] = useState(false);
  const [shot, setShot] = useState(null); // { file, url }

  useEffect(() => {
    let cancelled = false;
    setReady(false);
    setError("");
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setError("Camera is not supported in this browser. Please use Upload from gallery.");
      return undefined;
    }
    navigator.mediaDevices
      .getUserMedia({ video: { facingMode: facing, width: { ideal: 1280 }, height: { ideal: 1280 } }, audio: false })
      .then((stream) => {
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        const v = videoRef.current;
        if (v) {
          v.srcObject = stream;
          v.play().catch(() => {});
        }
      })
      .catch((err) => {
        if (cancelled) return;
        if (err && err.name === "NotAllowedError") setError("Camera permission was denied. Allow camera access in your browser and try again.");
        else if (err && err.name === "NotFoundError") setError("No camera was found on this device.");
        else setError("Could not start the camera. Please use Upload from gallery.");
      });
    return () => {
      cancelled = true;
      if (streamRef.current) streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    };
  }, [facing]);

  useEffect(() => () => { if (shot) URL.revokeObjectURL(shot.url); }, [shot]);

  const snap = async () => {
    if (!videoRef.current) return;
    setBusy(true);
    try {
      const file = await captureFromVideo(videoRef.current);
      setShot({ file, url: URL.createObjectURL(file) });
    } catch (e) {
      showError(e.message || "Could not take the photo");
    } finally {
      setBusy(false);
    }
  };

  return createPortal(
    <div className="fixed inset-0 z-[70] bg-black/80 flex items-center justify-center p-4" onClick={(e) => e.stopPropagation()}>
      <div className="bg-white rounded-2xl w-full max-w-sm p-4 space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-gray-900">Take photo</h3>
          <button type="button" onClick={onClose} aria-label="Close camera" className="p-1 text-gray-500 hover:text-gray-800"><X size={18} /></button>
        </div>

        {error ? (
          <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg p-3">{error}</p>
        ) : (
          <div className="relative aspect-square bg-black rounded-xl overflow-hidden">
            {shot ? (
              <img src={shot.url} alt="Captured" className="w-full h-full object-cover" />
            ) : (
              <video
                ref={videoRef}
                playsInline
                muted
                autoPlay
                onLoadedMetadata={() => setReady(true)}
                className="w-full h-full object-cover"
                style={facing === "user" ? { transform: "scaleX(-1)" } : undefined}
              />
            )}
          </div>
        )}

        <div className="flex items-center justify-between gap-2">
          {shot ? (
            <>
              <button type="button" onClick={() => setShot(null)} className="px-4 py-2 rounded-lg border border-gray-300 text-sm text-gray-700">Retake</button>
              <button type="button" onClick={() => onCapture(shot.file)} className="px-4 py-2 rounded-lg bg-primary-600 text-white text-sm font-medium">
                Use photo ({Math.max(1, Math.round(shot.file.size / 1024))} KB)
              </button>
            </>
          ) : (
            <>
              <button type="button" onClick={() => setFacing((f) => (f === "user" ? "environment" : "user"))} disabled={!!error}
                className="px-3 py-2 rounded-lg border border-gray-300 text-sm text-gray-700 flex items-center gap-1.5 disabled:opacity-40">
                <RefreshCw size={14} /> Switch camera
              </button>
              <button type="button" onClick={snap} disabled={!ready || busy || !!error}
                className="px-5 py-2 rounded-lg bg-primary-600 text-white text-sm font-medium flex items-center gap-1.5 disabled:opacity-40">
                <Camera size={15} /> {busy ? "Saving..." : "Capture"}
              </button>
            </>
          )}
        </div>
      </div>
    </div>,
    document.body
  );
}

// Photo chooser: live camera or gallery. Gives the parent a compressed File through onChange.
// `file` is the new photo that is waiting to be saved; `currentUrl` is the photo already saved.
export default function PhotoPicker({ currentUrl, name, file, onChange, disabled }) {
  const inputRef = useRef(null);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [preview, setPreview] = useState(null);

  useEffect(() => {
    if (!file) {
      setPreview(null);
      return undefined;
    }
    const url = URL.createObjectURL(file);
    setPreview(url);
    return () => URL.revokeObjectURL(url);
  }, [file]);

  const onGallery = async (e) => {
    const picked = e.target.files && e.target.files[0];
    e.target.value = "";
    if (!picked) return;
    setBusy(true);
    try {
      onChange(await compressImage(picked));
    } catch (err) {
      showError(err.message || "Could not use this photo");
    } finally {
      setBusy(false);
    }
  };

  const shown = preview || currentUrl;
  const initial = String(name || "?").trim().charAt(0).toUpperCase() || "?";

  return (
    <div className="flex items-center gap-4">
      {shown ? (
        <img src={shown} alt="" className="w-20 h-20 rounded-full object-cover border border-gray-200" />
      ) : (
        <div className="w-20 h-20 rounded-full bg-primary-100 text-primary-700 flex items-center justify-center text-2xl font-semibold">{initial}</div>
      )}
      <div className="space-y-2">
        <div className="flex flex-wrap gap-2">
          <button type="button" disabled={disabled || busy} onClick={() => setCameraOpen(true)}
            className="px-3 py-2 rounded-lg border border-gray-300 text-sm text-gray-700 flex items-center gap-1.5 hover:bg-gray-50 disabled:opacity-40">
            <Camera size={15} /> Take photo
          </button>
          <button type="button" disabled={disabled || busy} onClick={() => inputRef.current && inputRef.current.click()}
            className="px-3 py-2 rounded-lg border border-gray-300 text-sm text-gray-700 flex items-center gap-1.5 hover:bg-gray-50 disabled:opacity-40">
            <ImagePlus size={15} /> {busy ? "Processing..." : "Upload from gallery"}
          </button>
          {file && (
            <button type="button" onClick={() => onChange(null)} className="px-3 py-2 text-sm text-red-600 hover:underline">Remove</button>
          )}
        </div>
        <p className="text-xs text-gray-400">
          {file ? `New photo ready (${Math.max(1, Math.round(file.size / 1024))} KB, compressed)` : "Photos are compressed automatically."}
        </p>
      </div>
      <input ref={inputRef} type="file" accept="image/*" className="hidden" onChange={onGallery} />
      {cameraOpen && (
        <CameraCapture
          onClose={() => setCameraOpen(false)}
          onCapture={(f) => { setCameraOpen(false); onChange(f); }}
        />
      )}
    </div>
  );
}
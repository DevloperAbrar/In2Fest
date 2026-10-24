import { createRoot } from "react-dom/client";
import { initPwa } from "./pwa";
import InstallPrompt from "./InstallPrompt";
import UpdatePrompt from "../components/common/UpdatePrompt";

// 64px = mobile BottomNav height, so the card/toast never sit on top of it.
const CSS = `
.pwa-install-card{position:fixed;right:16px;bottom:calc(16px + env(safe-area-inset-bottom,0px));z-index:9999;max-width:340px}
.pwa-update-toast{position:fixed;left:50%;transform:translateX(-50%);bottom:calc(16px + env(safe-area-inset-bottom,0px));z-index:10002;width:calc(100% - 32px);max-width:440px}
@media (max-width:767px){
  .pwa-install-card{left:16px;right:16px;max-width:none;bottom:calc(80px + env(safe-area-inset-bottom,0px))}
  .pwa-update-toast{bottom:calc(80px + env(safe-area-inset-bottom,0px))}
}`;

// Runs only on the app host (and localhost). Vendor subdomains are untouched.
if (initPwa()) {
  const mount = document.createElement("div");
  mount.id = "pwa-root";
  document.body.appendChild(mount);
  createRoot(mount).render(
    <>
      <style>{CSS}</style>
      <InstallPrompt />
      <UpdatePrompt />
    </>
  );
}
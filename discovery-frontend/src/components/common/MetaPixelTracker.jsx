import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";

export default function MetaPixelTracker() {
  const location = useLocation();
  const first = useRef(true);

  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    if (window.fbq) window.fbq("track", "PageView");
  }, [location.pathname]);

  return null;
}
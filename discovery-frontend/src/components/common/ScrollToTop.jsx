import { useEffect } from "react";
import { useLocation, useNavigationType } from "react-router-dom";

// Scrolls to the top whenever the user navigates to a new page.
// - Back/forward (POP) keeps the browser's own scroll restoration.
// - Hash links (#section) are left alone so in-page anchors still work.
// - Only the pathname is watched, so changing search filters (?q=...) does not jump to the top.
export default function ScrollToTop() {
  const { pathname, hash } = useLocation();
  const navigationType = useNavigationType();

  useEffect(() => {
    if (hash || navigationType === "POP") return;
    window.scrollTo({ top: 0, left: 0, behavior: "instant" });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  return null;
}
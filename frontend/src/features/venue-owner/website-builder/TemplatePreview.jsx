import React, { useEffect, useState } from "react";
import { TEMPLATES } from "../../public-site/templates/index.jsx";
import HeroSection from "../../public-site/venue-home/HeroSection.jsx";
import VerticalHero from "../../public-site/venue-home/verticals/VerticalHero.jsx";
import FoodHero from "../../public-site/venue-home/verticals/FoodHero.jsx";
import { getVertical, resolveAccent, waDigits } from "../../../lib/verticals";
import { useScrollReveal } from "../../../hooks/useScrollReveal";

const DESIGN_WIDTH = 1280; // the preview is a real 1280px-wide page, scaled down to fit the card

class PreviewBoundary extends React.Component {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  componentDidCatch() { /* fall back to the static preview */ }
  render() { return this.state.failed ? this.props.fallback : this.props.children; }
}

// Same decision the public website makes: a chosen template keeps its own hero,
// Classic shows the category experience (gym / shop / food) or the default hero.
function PreviewHero({ venue, templateId }) {
  const v = { ...venue, template_id: templateId, __preview: true };

  if (templateId && TEMPLATES[templateId]) {
    const T = TEMPLATES[templateId];
    return <T.HeroSection venue={v} />;
  }

  const vertical = getVertical(venue);
  if (vertical.key !== "venue") {
    const vv = { ...v, theme_color: resolveAccent(venue, vertical) };
    return vertical.key === "food" ? (
      <FoodHero venue={vv} stats={[]} />
    ) : (
      <VerticalHero venue={vv} vertical={vertical} stats={[]} actions={{ openTrial() {} }} hasWhatsApp={!!waDigits(vv)} />
    );
  }
  return <HeroSection venue={v} />;
}

export default function TemplatePreview({ venue, templateId, themeColor, fallbackImage, height = 224 }) {
  const [ref, visible] = useScrollReveal({ threshold: 0.05 });
  const [scale, setScale] = useState(0.26);

  useEffect(() => {
    const el = ref.current;
    if (!el || typeof ResizeObserver === "undefined") return undefined;
    const ro = new ResizeObserver(([entry]) => setScale(entry.contentRect.width / DESIGN_WIDTH));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const innerHeight = Math.round(height / scale);
  const fallback = fallbackImage ? (
    <img src={fallbackImage} alt="Template preview" className="w-full h-full object-cover object-top" />
  ) : (
    <div className="w-full h-full" style={{ background: `linear-gradient(135deg, #0a0a0a, ${themeColor || "#facc15"}66)` }} />
  );

  return (
    <div ref={ref} data-tpl-preview className="relative w-full overflow-hidden bg-neutral-900" style={{ height }}>
      {visible && (
        <PreviewBoundary fallback={fallback}>
          <div
            aria-hidden
            style={{
              width: DESIGN_WIDTH,
              height: innerHeight,
              overflow: "hidden",
              transform: `scale(${scale})`,
              transformOrigin: "top left",
              pointerEvents: "none"
            }}
          >
            <style>{`[data-tpl-preview] .min-h-screen, [data-tpl-preview] .min-h-\\[100svh\\] { min-height: ${innerHeight}px !important; }`}</style>
            <PreviewHero venue={{ ...venue, theme_color: themeColor || venue?.theme_color }} templateId={templateId} />
          </div>
        </PreviewBoundary>
      )}
    </div>
  );
}
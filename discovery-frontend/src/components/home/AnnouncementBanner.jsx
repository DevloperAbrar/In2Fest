import React, { useState, useEffect, useCallback, useRef } from "react";
import axios from "axios";
import { getImageUrl } from "../../lib/constants";
import { X, ChevronLeft, ChevronRight } from "lucide-react";

const SESSION_KEY = "in2fest_ann_seen";
const API_BASE_URL = import.meta.env.VITE_API_URL || "http://localhost:5000/api";

export default function AnnouncementBanner() {
  const [announcements, setAnnouncements] = useState([]);
  const [visible, setVisible] = useState(false);
  const [current, setCurrent] = useState(0);
  const [slideDir, setSlideDir] = useState(null);
  const [animating, setAnimating] = useState(false);
  const [closing, setClosing] = useState(false);
  const timeoutRef = useRef(null);

  useEffect(() => {
    if (sessionStorage.getItem(SESSION_KEY)) return;
    axios
      .get(`${API_BASE_URL}/announcements/public`)
      .then(({ data }) => {
        const items = data.data || [];
        if (items.length > 0) {
          setAnnouncements(items);
          setVisible(true);
        }
      })
      .catch(() => {});
  }, []);

  const close = useCallback(() => {
    setClosing(true);
    setTimeout(() => {
      sessionStorage.setItem(SESSION_KEY, "1");
      setVisible(false);
      setClosing(false);
    }, 450);
  }, []);

  const goTo = useCallback(
    (index, dir) => {
      if (animating) return;
      setAnimating(true);
      setSlideDir(dir);
      clearTimeout(timeoutRef.current);
      timeoutRef.current = setTimeout(() => {
        setCurrent(index);
        setSlideDir(null);
        setAnimating(false);
      }, 380);
    },
    [animating]
  );

  const prev = useCallback(() => {
    const idx = current === 0 ? announcements.length - 1 : current - 1;
    goTo(idx, "right");
  }, [current, announcements.length, goTo]);

  const next = useCallback(() => {
    const idx = current === announcements.length - 1 ? 0 : current + 1;
    goTo(idx, "left");
  }, [current, announcements.length, goTo]);

  useEffect(() => {
    if (!visible || announcements.length <= 1) return;
    const id = setInterval(() => next(), 5000);
    return () => clearInterval(id);
  }, [visible, announcements.length, next]);

  useEffect(() => {
    if (!visible) return;
    const handler = (e) => { if (e.key === "Escape") close(); };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, [visible, close]);

  if (!visible || announcements.length === 0) return null;

  const ann = announcements[current];
  const imageUrl = ann.image_url ? getImageUrl(ann.image_url) : null;
  const hasMultiple = announcements.length > 1;

  return (
    <>
      <style>{`
        @keyframes backdropIn {
          from { opacity: 0; }
          to   { opacity: 1; }
        }
        @keyframes backdropOut {
          from { opacity: 1; }
          to   { opacity: 0; }
        }
        @keyframes cardIn {
          0%   { opacity: 0; transform: scale(0.82) translateY(60px); }
          55%  { opacity: 1; transform: scale(1.02) translateY(-8px); }
          100% { opacity: 1; transform: scale(1) translateY(0); }
        }
        @keyframes cardOut {
          0%   { opacity: 1; transform: scale(1) translateY(0); }
          100% { opacity: 0; transform: scale(0.88) translateY(50px); }
        }
        @keyframes slideInFromRight {
          from { opacity: 0; transform: translateX(80px); }
          to   { opacity: 1; transform: translateX(0); }
        }
        @keyframes slideInFromLeft {
          from { opacity: 0; transform: translateX(-80px); }
          to   { opacity: 1; transform: translateX(0); }
        }
        @keyframes slideOutToLeft {
          from { opacity: 1; transform: translateX(0); }
          to   { opacity: 0; transform: translateX(-80px); }
        }
        @keyframes slideOutToRight {
          from { opacity: 1; transform: translateX(0); }
          to   { opacity: 0; transform: translateX(80px); }
        }
        @keyframes shimmerSweep {
          0%   { transform: translateX(-100%); }
          100% { transform: translateX(100%); }
        }
        @keyframes progressBar {
          from { width: 0%; }
          to   { width: 100%; }
        }
        @keyframes pulseRing {
          0%   { transform: scale(1); opacity: 0.7; }
          70%  { transform: scale(1.6); opacity: 0; }
          100% { transform: scale(1.6); opacity: 0; }
        }
        @keyframes borderGlow {
          0%,100% { box-shadow: 0 0 20px rgba(232,25,44,0.6), 0 0 60px rgba(232,25,44,0.2), 0 40px 100px rgba(0,0,0,0.5); }
          50%      { box-shadow: 0 0 30px rgba(255,107,53,0.7), 0 0 80px rgba(255,107,53,0.25), 0 40px 100px rgba(0,0,0,0.5); }
        }
        @keyframes floatSparkle {
          0%   { opacity: 0; transform: translateY(0px) scale(0.5) rotate(0deg); }
          20%  { opacity: 1; }
          100% { opacity: 0; transform: translateY(-120px) scale(1.3) rotate(180deg); }
        }
        @keyframes titleReveal {
          from { opacity: 0; transform: translateY(20px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes gradBorderSpin {
          0%   { background-position: 0% 50%; }
          50%  { background-position: 100% 50%; }
          100% { background-position: 0% 50%; }
        }
        @keyframes cornerPulse {
          0%,100% { opacity: 0.7; transform: scale(1); }
          50%      { opacity: 1;   transform: scale(1.08); }
        }
        @keyframes navPop {
          0%   { transform: scale(1); }
          40%  { transform: scale(0.88); }
          100% { transform: scale(1); }
        }

        .ann-backdrop {
          animation: ${closing ? "backdropOut 0.45s ease forwards" : "backdropIn 0.3s ease forwards"};
        }
        .ann-card {
          animation: ${closing ? "cardOut 0.45s cubic-bezier(0.4,0,1,1) forwards" : "cardIn 0.55s cubic-bezier(0.34,1.4,0.64,1) forwards"};
        }
        .ann-border-glow {
          animation: borderGlow 2.5s ease-in-out infinite;
        }
        .slide-enter-right {
          animation: slideInFromRight 0.38s cubic-bezier(0.25,0.46,0.45,0.94) forwards;
        }
        .slide-enter-left {
          animation: slideInFromLeft 0.38s cubic-bezier(0.25,0.46,0.45,0.94) forwards;
        }
        .slide-exit-left {
          animation: slideOutToLeft 0.38s cubic-bezier(0.55,0,1,0.45) forwards;
        }
        .slide-exit-right {
          animation: slideOutToRight 0.38s cubic-bezier(0.55,0,1,0.45) forwards;
        }
        .shimmer-overlay {
          position: absolute;
          inset: 0;
          overflow: hidden;
          pointer-events: none;
        }
        .shimmer-overlay::after {
          content: "";
          position: absolute;
          top: 0; left: 0;
          width: 60%;
          height: 100%;
          background: linear-gradient(90deg, transparent, rgba(255,255,255,0.15), transparent);
          animation: shimmerSweep 2.5s ease-in-out infinite;
        }
        .ann-title-text {
          animation: titleReveal 0.5s 0.2s ease both;
        }
        .sparkle-float {
          position: absolute;
          pointer-events: none;
          animation: floatSparkle 3s ease-out infinite;
        }
        .close-pulse::after {
          content: "";
          position: absolute;
          inset: 0;
          border-radius: 50%;
          border: 2px solid rgba(255,255,255,0.6);
          animation: pulseRing 2s ease-out infinite;
        }
        .nav-btn-press:active {
          animation: navPop 0.2s ease forwards;
        }
        .dot-pill {
          transition: all 0.4s cubic-bezier(0.34,1.56,0.64,1);
        }
      `}</style>

      {/* Backdrop */}
      <div
        className="ann-backdrop fixed inset-0 z-[9999] flex items-center justify-center"
        style={{
          background: "radial-gradient(ellipse at 50% 40%, rgba(0,0,0,0.82) 0%, rgba(0,0,0,0.65) 100%)",
          backdropFilter: "blur(8px)",
          WebkitBackdropFilter: "blur(8px)",
          padding: "16px",
        }}
        onClick={close}
      >
        {/* Outer glow wrapper */}
        <div
          className="ann-card ann-border-glow relative w-full rounded-2xl overflow-hidden"
          style={{
            maxWidth: "780px",
            background: "linear-gradient(145deg, #0f0f1a, #1a0a10)",
            border: "1.5px solid rgba(232,25,44,0.35)",
          }}
          onClick={(e) => e.stopPropagation()}
        >
          {/* Animated corner accents */}
          <div style={{
            position: "absolute", top: 0, left: 0, width: 60, height: 60,
            borderTop: "3px solid #e8192c", borderLeft: "3px solid #e8192c",
            borderRadius: "16px 0 0 0", zIndex: 10,
            animation: "cornerPulse 2s ease-in-out infinite",
          }} />
          <div style={{
            position: "absolute", top: 0, right: 0, width: 60, height: 60,
            borderTop: "3px solid #ff6b35", borderRight: "3px solid #ff6b35",
            borderRadius: "0 16px 0 0", zIndex: 10,
            animation: "cornerPulse 2s ease-in-out infinite 0.5s",
          }} />
          <div style={{
            position: "absolute", bottom: 0, left: 0, width: 60, height: 60,
            borderBottom: "3px solid #ff6b35", borderLeft: "3px solid #ff6b35",
            borderRadius: "0 0 0 16px", zIndex: 10,
            animation: "cornerPulse 2s ease-in-out infinite 1s",
          }} />
          <div style={{
            position: "absolute", bottom: 0, right: 0, width: 60, height: 60,
            borderBottom: "3px solid #e8192c", borderRight: "3px solid #e8192c",
            borderRadius: "0 0 16px 0", zIndex: 10,
            animation: "cornerPulse 2s ease-in-out infinite 1.5s",
          }} />

          {/* Floating sparkles */}
          <span className="sparkle-float" style={{ left: "8%",  bottom: "25%", fontSize: 16, animationDelay: "0s" }}>✨</span>
          <span className="sparkle-float" style={{ left: "20%", bottom: "15%", fontSize: 12, animationDelay: "0.8s" }}>⭐</span>
          <span className="sparkle-float" style={{ right: "10%",bottom: "30%", fontSize: 18, animationDelay: "1.4s" }}>💫</span>
          <span className="sparkle-float" style={{ right: "25%",bottom: "10%", fontSize: 11, animationDelay: "2.1s" }}>✨</span>

          {/* Close button */}
          <button
            onClick={close}
            className="close-pulse absolute top-4 right-4 z-20 flex items-center justify-center rounded-full text-white transition-transform hover:scale-110 active:scale-90"
            style={{
              width: 40, height: 40,
              background: "linear-gradient(135deg, rgba(232,25,44,0.8), rgba(180,0,20,0.9))",
              border: "1.5px solid rgba(255,255,255,0.2)",
              backdropFilter: "blur(6px)",
              boxShadow: "0 4px 20px rgba(232,25,44,0.5)",
            }}
            aria-label="Close"
          >
            <X style={{ width: 18, height: 18, strokeWidth: 2.5 }} />
          </button>

          {/* Slide counter top-left */}
          {hasMultiple && (
            <div
              className="absolute top-4 left-4 z-20 flex items-center gap-1.5 px-3 py-1.5 rounded-full text-white text-xs font-bold"
              style={{
                background: "rgba(0,0,0,0.55)",
                backdropFilter: "blur(8px)",
                border: "1px solid rgba(255,255,255,0.15)",
                letterSpacing: "0.05em",
              }}
            >
              <span style={{ color: "#e8192c" }}>{current + 1}</span>
              <span style={{ opacity: 0.5 }}>/</span>
              <span>{announcements.length}</span>
            </div>
          )}

          {/* === SLIDE CONTENT === */}
          <div
            key={current}
            className={
              slideDir === "left"
                ? "slide-exit-left"
                : slideDir === "right"
                ? "slide-exit-right"
                : current % 2 === 0
                ? "slide-enter-right"
                : "slide-enter-left"
            }
          >
            {/* Big image */}
            <div className="relative overflow-hidden" style={{ background: "#0a0a14" }}>
              {imageUrl ? (
                ann.link_url ? (
                  <a href={ann.link_url} target="_blank" rel="noopener noreferrer" onClick={close}>
                    <img
                      src={imageUrl}
                      alt={ann.title}
                      style={{
                        width: "100%",
                        maxHeight: "460px",
                        objectFit: "cover",
                        display: "block",
                      }}
                    />
                  </a>
                ) : (
                  <img
                    src={imageUrl}
                    alt={ann.title}
                    style={{
                      width: "100%",
                      maxHeight: "460px",
                      objectFit: "cover",
                      display: "block",
                    }}
                  />
                )
              ) : (
                <div
                  style={{
                    minHeight: "320px",
                    background: "linear-gradient(135deg, #0f0f1a 0%, #2d0a14 40%, #e8192c 100%)",
                    display: "flex",
                    flexDirection: "column",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 16,
                  }}
                >
                  <span style={{ fontSize: 72, filter: "drop-shadow(0 8px 24px rgba(232,25,44,0.6))" }}>📢</span>
                  <p style={{ color: "rgba(255,255,255,0.6)", fontSize: 14, letterSpacing: "0.1em", textTransform: "uppercase" }}>
                    Announcement
                  </p>
                </div>
              )}

              {/* Shimmer sweep */}
              <div className="shimmer-overlay" />

              {/* Bottom gradient overlay so title reads well */}
              <div style={{
                position: "absolute",
                bottom: 0, left: 0, right: 0,
                height: "120px",
                background: "linear-gradient(to top, rgba(0,0,0,0.85) 0%, transparent 100%)",
                pointerEvents: "none",
              }} />

              {/* Title overlaid on image bottom */}
              <div className="ann-title-text absolute bottom-0 left-0 right-0 px-6 pb-5">
                {ann.link_url ? (
                  
                <a    href={ann.link_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    onClick={close}
                    style={{ textDecoration: "none", display: "block" }}
                  >
                    <h2 style={{
                      color: "#fff",
                      fontSize: "clamp(16px, 2.5vw, 22px)",
                      fontWeight: 800,
                      lineHeight: 1.3,
                      textShadow: "0 2px 12px rgba(0,0,0,0.8)",
                      margin: 0,
                    }}>
                      {ann.title}
                      <span style={{
                        display: "inline-block",
                        marginLeft: 10,
                        fontSize: 11,
                        fontWeight: 700,
                        padding: "2px 10px",
                        borderRadius: 20,
                        background: "linear-gradient(90deg, #e8192c, #ff6b35)",
                        verticalAlign: "middle",
                        letterSpacing: "0.05em",
                      }}>
                        EXPLORE →
                      </span>
                    </h2>
                  </a>
                ) : (
                  <h2 style={{
                    color: "#fff",
                    fontSize: "clamp(16px, 2.5vw, 22px)",
                    fontWeight: 800,
                    lineHeight: 1.3,
                    textShadow: "0 2px 12px rgba(0,0,0,0.8)",
                    margin: 0,
                  }}>
                    {ann.title}
                  </h2>
                )}
              </div>
            </div>
          </div>

          {/* Bottom controls bar */}
          {hasMultiple && (
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "14px 20px",
                background: "rgba(0,0,0,0.6)",
                borderTop: "1px solid rgba(255,255,255,0.07)",
              }}
            >
              {/* Pill dots */}
              <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                {announcements.map((_, i) => (
                  <button
                    key={i}
                    className="dot-pill"
                    onClick={() => goTo(i, i > current ? "left" : "right")}
                    style={{
                      width: i === current ? 28 : 8,
                      height: 8,
                      borderRadius: 4,
                      border: "none",
                      cursor: "pointer",
                      background:
                        i === current
                          ? "linear-gradient(90deg, #e8192c, #ff6b35)"
                          : "rgba(255,255,255,0.2)",
                      boxShadow: i === current ? "0 0 10px rgba(232,25,44,0.7)" : "none",
                      padding: 0,
                    }}
                  />
                ))}
              </div>

              {/* Nav buttons */}
              <div style={{ display: "flex", gap: 10 }}>
                <button
                  onClick={prev}
                  className="nav-btn-press"
                  style={{
                    width: 40, height: 40,
                    borderRadius: "50%",
                    border: "1.5px solid rgba(255,255,255,0.15)",
                    background: "rgba(255,255,255,0.08)",
                    color: "#fff",
                    cursor: "pointer",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    transition: "all 0.2s ease",
                    backdropFilter: "blur(6px)",
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = "rgba(255,255,255,0.18)"}
                  onMouseLeave={e => e.currentTarget.style.background = "rgba(255,255,255,0.08)"}
                >
                  <ChevronLeft style={{ width: 18, height: 18 }} />
                </button>
                <button
                  onClick={next}
                  className="nav-btn-press"
                  style={{
                    width: 40, height: 40,
                    borderRadius: "50%",
                    border: "none",
                    background: "linear-gradient(135deg, #e8192c, #ff6b35)",
                    color: "#fff",
                    cursor: "pointer",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    boxShadow: "0 4px 18px rgba(232,25,44,0.55)",
                    transition: "all 0.2s ease",
                  }}
                  onMouseEnter={e => e.currentTarget.style.transform = "scale(1.1)"}
                  onMouseLeave={e => e.currentTarget.style.transform = "scale(1)"}
                >
                  <ChevronRight style={{ width: 18, height: 18 }} />
                </button>
              </div>
            </div>
          )}

          {/* Auto-progress bar */}
          {hasMultiple && (
            <div style={{ height: 3, background: "rgba(255,255,255,0.07)", overflow: "hidden" }}>
              <div
                key={`pb-${current}`}
                style={{
                  height: "100%",
                  background: "linear-gradient(90deg, #e8192c, #ff6b35)",
                  animation: "progressBar 5s linear forwards",
                  boxShadow: "0 0 8px rgba(232,25,44,0.8)",
                }}
              />
            </div>
          )}
        </div>
      </div>
    </>
  );
}
// Validation for the "Social Media Links" website section.
// A link is accepted as a full URL, a domain/path, or just a handle (e.g. @nextgen).
// Only http/https links are ever stored, so javascript: and similar can't get in.

const PLATFORM_KEYS = [
    "instagram", "youtube", "facebook", "x", "linkedin", "whatsapp",
    "telegram", "threads", "google_business", "website", "other"
  ];
  
  // Used when the vendor types only a handle.
  const HANDLE_BASE = {
    instagram: "https://www.instagram.com/",
    youtube: "https://www.youtube.com/@",
    facebook: "https://www.facebook.com/",
    x: "https://x.com/",
    linkedin: "https://www.linkedin.com/company/",
    telegram: "https://t.me/",
    threads: "https://www.threads.net/@"
  };
  
  const HANDLE_RE = /^[A-Za-z0-9._-]{1,60}$/;
  const MAX_LINKS = 12;
  
  function normalizeSocialUrl(platform, input) {
    const raw = String(input === undefined || input === null ? "" : input).trim();
    if (!raw || raw.length > 300) return null;
  
    // WhatsApp: a phone number becomes a wa.me link (10 digit numbers get +91).
    if (platform === "whatsapp" && /^[+\d][\d\s-]{8,}$/.test(raw)) {
      let digits = raw.replace(/\D/g, "");
      if (digits.length === 10) digits = `91${digits}`;
      if (digits.length < 11 || digits.length > 15) return null;
      return `https://wa.me/${digits}`;
    }
  
    let candidate = raw;
    const hasScheme = /^[a-z][a-z0-9+.-]*:/i.test(candidate);
  
    if (!hasScheme) {
      const looksLikeUrl = candidate.includes("/") || /^www\./i.test(candidate) || !HANDLE_BASE[platform];
      if (looksLikeUrl) {
        candidate = `https://${candidate}`;
      } else {
        const handle = candidate.replace(/^@/, "");
        if (!HANDLE_RE.test(handle)) return null;
        return `${HANDLE_BASE[platform]}${handle}`;
      }
    }
  
    try {
      const url = new URL(candidate);
      if (url.protocol !== "https:" && url.protocol !== "http:") return null;
      if (!url.hostname.includes(".")) return null;
      return url.toString();
    } catch {
      return null;
    }
  }
  
  // Cleans the config of a social_links section. Invalid links are dropped.
  function sanitizeSocialConfig(config) {
    const src = config && typeof config === "object" ? config : {};
  
    const title = String(src.title || "").trim().slice(0, 60) || "Follow Us";
    const subtitle = String(src.subtitle || "").trim().slice(0, 100);
    const style = src.style === "icons" ? "icons" : "cards";
  
    const seen = new Set();
    const items = [];
    (Array.isArray(src.items) ? src.items : []).forEach((item, index) => {
      if (!item || typeof item !== "object" || items.length >= MAX_LINKS) return;
  
      const platform = PLATFORM_KEYS.includes(item.platform) ? item.platform : "other";
      const url = normalizeSocialUrl(platform, item.url);
      if (!url || seen.has(url)) return;
      seen.add(url);
  
      items.push({
        id: String(item.id || `soc-${Date.now()}-${index}`).slice(0, 40),
        platform,
        url,
        label: String(item.label || "").trim().slice(0, 40)
      });
    });
  
    return { title, subtitle, style, items };
  }
  
  module.exports = { PLATFORM_KEYS, normalizeSocialUrl, sanitizeSocialConfig };
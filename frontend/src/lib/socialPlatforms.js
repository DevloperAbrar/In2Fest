// Social platforms supported by the "Social Media Links" section.
// The link rules mirror backend/src/utils/socialLinks.js, which is what finally
// decides what gets saved.

export const PLATFORMS = {
    instagram: {
      label: "Instagram",
      cta: "Follow on Instagram",
      color: "#E1306C",
      bg: "linear-gradient(135deg,#f58529,#dd2a7b 50%,#8134af)",
      placeholder: "@yourhandle or instagram.com/yourhandle",
      base: "https://www.instagram.com/"
    },
    youtube: {
      label: "YouTube",
      cta: "Subscribe on YouTube",
      color: "#FF0000",
      bg: "linear-gradient(135deg,#ff2a2a,#b30000)",
      placeholder: "@yourchannel or youtube.com/@yourchannel",
      base: "https://www.youtube.com/@"
    },
    facebook: {
      label: "Facebook",
      cta: "Like us on Facebook",
      color: "#1877F2",
      bg: "linear-gradient(135deg,#2b8cff,#0b4fb3)",
      placeholder: "yourpage or facebook.com/yourpage",
      base: "https://www.facebook.com/"
    },
    x: {
      label: "X (Twitter)",
      cta: "Follow on X",
      color: "#111111",
      bg: "linear-gradient(135deg,#2a2a2a,#000000)",
      invert: true,
      placeholder: "@yourhandle or x.com/yourhandle",
      base: "https://x.com/"
    },
    linkedin: {
      label: "LinkedIn",
      cta: "Connect on LinkedIn",
      color: "#0A66C2",
      bg: "linear-gradient(135deg,#1585e0,#064a8c)",
      placeholder: "Company page link or name",
      base: "https://www.linkedin.com/company/"
    },
    whatsapp: {
      label: "WhatsApp",
      cta: "Chat on WhatsApp",
      color: "#25D366",
      bg: "linear-gradient(135deg,#2fe074,#128c7e)",
      placeholder: "Phone number (e.g. 9876543210) or wa.me link",
      base: null
    },
    telegram: {
      label: "Telegram",
      cta: "Join on Telegram",
      color: "#229ED9",
      bg: "linear-gradient(135deg,#2aabee,#1d7fb3)",
      placeholder: "@yourchannel or t.me/yourchannel",
      base: "https://t.me/"
    },
    threads: {
      label: "Threads",
      cta: "Follow on Threads",
      color: "#111111",
      bg: "linear-gradient(135deg,#2a2a2a,#000000)",
      invert: true,
      placeholder: "@yourhandle or threads.net/@yourhandle",
      base: "https://www.threads.net/@"
    },
    google_business: {
      label: "Google Business",
      cta: "Find us on Google",
      color: "#4285F4",
      bg: "linear-gradient(135deg,#4285f4,#34a853)",
      placeholder: "Google Maps / Business Profile link",
      base: null
    },
    website: {
      label: "Website",
      cta: "Visit our website",
      color: "#475569",
      bg: "linear-gradient(135deg,#64748b,#1e293b)",
      placeholder: "yourwebsite.com",
      base: null
    },
    other: {
      label: "Other link",
      cta: "Open link",
      color: "#7c3aed",
      bg: "linear-gradient(135deg,#8b5cf6,#5b21b6)",
      placeholder: "Paste any link",
      base: null
    }
  };
  
  export const PLATFORM_KEYS = Object.keys(PLATFORMS);
  export const MAX_SOCIAL_LINKS = 12;
  
  export function getPlatform(key) {
    return PLATFORMS[key] || PLATFORMS.other;
  }
  
  const HANDLE_RE = /^[A-Za-z0-9._-]{1,60}$/;
  
  // Turns what the vendor typed into a full https link, or null if it isn't valid.
  export function normalizeSocialUrl(platform, input) {
    const raw = String(input === undefined || input === null ? "" : input).trim();
    if (!raw || raw.length > 300) return null;
  
    if (platform === "whatsapp" && /^[+\d][\d\s-]{8,}$/.test(raw)) {
      let digits = raw.replace(/\D/g, "");
      if (digits.length === 10) digits = `91${digits}`;
      if (digits.length < 11 || digits.length > 15) return null;
      return `https://wa.me/${digits}`;
    }
  
    let candidate = raw;
    const hasScheme = /^[a-z][a-z0-9+.-]*:/i.test(candidate);
  
    if (!hasScheme) {
      const base = getPlatform(platform).base;
      const looksLikeUrl = candidate.includes("/") || /^www\./i.test(candidate) || !base;
      if (looksLikeUrl) {
        candidate = `https://${candidate}`;
      } else {
        const handle = candidate.replace(/^@/, "");
        if (!HANDLE_RE.test(handle)) return null;
        return `${base}${handle}`;
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
  
  // Last safety net before a link is rendered as an <a href>.
  export function safeHref(url) {
    try {
      const u = new URL(String(url));
      return u.protocol === "https:" || u.protocol === "http:" ? u.toString() : null;
    } catch {
      return null;
    }
  }
  
  // Short text shown under the platform name, e.g. "@nextgenacademy".
  export function getDisplayHandle(item) {
    if (item.label) return item.label;
    try {
      const u = new URL(item.url);
      const host = u.hostname.replace(/^www\./, "");
      const parts = u.pathname.split("/").filter(Boolean);
  
      if (item.platform === "whatsapp") return parts[0] ? `+${parts[0]}` : host;
      if (["instagram", "x", "threads", "telegram", "youtube"].includes(item.platform) && parts[0]) {
        return `@${parts[parts.length - 1].replace(/^@/, "")}`;
      }
      if (["facebook", "linkedin"].includes(item.platform) && parts.length) {
        return parts[parts.length - 1];
      }
      return host;
    } catch {
      return "";
    }
  }
  
  // Valid links of the social_links section on a venue (used by the website footer).
  export function getSocialLinks(venue) {
    const section = (venue?.page_sections || []).find((s) => s?.type === "social_links");
    if (!section || section.visible === false) return [];
    return (section.config?.items || [])
      .map((it) => ({ ...it, href: safeHref(it.url) }))
      .filter((it) => it.href);
  }
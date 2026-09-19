// Converts a vendor's intro-video link into something we can play inside the page.
// Returns { type: "iframe" | "video", src, ratio: "video" | "portrait" } or null
// when the platform isn't supported (caller then falls back to opening a new tab).

function parseUrl(raw) {
    try {
      const text = raw.trim();
      const url = new URL(/^https?:\/\//i.test(text) ? text : `https://${text}`);
      return url.protocol === "http:" || url.protocol === "https:" ? url : null;
    } catch {
      return null;
    }
  }
  
  export function getVideoEmbed(rawUrl) {
    if (!rawUrl || typeof rawUrl !== "string") return null;
  
    const url = parseUrl(rawUrl);
    if (!url) return null;
  
    const host = url.hostname.replace(/^(www\.|m\.)/i, "").toLowerCase();
    const path = url.pathname;
  
    // ---------- YouTube ----------
    if (host === "youtu.be") {
      const id = path.slice(1).split("/")[0];
      if (/^[\w-]{11}$/.test(id)) {
        return { type: "iframe", ratio: "video", src: `https://www.youtube.com/embed/${id}?autoplay=1&rel=0` };
      }
    }
  
    if (host === "youtube.com" || host === "youtube-nocookie.com") {
      if (path === "/playlist" && url.searchParams.get("list")) {
        return {
          type: "iframe",
          ratio: "video",
          src: `https://www.youtube.com/embed/videoseries?list=${encodeURIComponent(url.searchParams.get("list"))}&autoplay=1`,
        };
      }
  
      const idFromQuery = path === "/watch" ? url.searchParams.get("v") : null;
      const idFromPath = path.match(/^\/(?:shorts|embed|live|v)\/([\w-]{11})/);
      const id = idFromQuery || (idFromPath && idFromPath[1]);
  
      if (id && /^[\w-]{11}$/.test(id)) {
        return { type: "iframe", ratio: "video", src: `https://www.youtube.com/embed/${id}?autoplay=1&rel=0` };
      }
    }
  
    // ---------- Vimeo ----------
    if (host === "vimeo.com" || host === "player.vimeo.com") {
      const m = path.match(/(?:\/video)?\/(?:channels\/[^/]+\/|groups\/[^/]+\/videos\/)?(\d+)(?:\/([a-z0-9]+))?/i);
      if (m) {
        const hash = url.searchParams.get("h") || m[2];
        return {
          type: "iframe",
          ratio: "video",
          src: `https://player.vimeo.com/video/${m[1]}?autoplay=1${hash ? `&h=${hash}` : ""}`,
        };
      }
    }
  
    // ---------- Google Drive ----------
    if (host === "drive.google.com") {
      const m = path.match(/\/file\/d\/([\w-]+)/);
      const id = (m && m[1]) || url.searchParams.get("id");
      if (id) {
        return { type: "iframe", ratio: "video", src: `https://drive.google.com/file/d/${id}/preview` };
      }
    }
  
    // ---------- Facebook ----------
    if (host === "facebook.com" || host === "fb.watch") {
      return {
        type: "iframe",
        ratio: "video",
        src: `https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(url.href)}&show_text=false&autoplay=true`,
      };
    }
  
    // ---------- Instagram ----------
    if (host === "instagram.com") {
      const m = path.match(/^\/(?:[\w.]+\/)?(reel|reels|p|tv)\/([\w-]+)/);
      if (m) {
        const kind = m[1] === "reels" ? "reel" : m[1];
        return { type: "iframe", ratio: "portrait", src: `https://www.instagram.com/${kind}/${m[2]}/embed` };
      }
    }
  
    // ---------- Direct video file ----------
    if (/\.(mp4|webm|ogg|mov|m4v)$/i.test(path)) {
      return { type: "video", ratio: "video", src: url.href };
    }
  
    return null;
  }
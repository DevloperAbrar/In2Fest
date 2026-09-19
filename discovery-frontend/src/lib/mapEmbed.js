// Extracts coordinates or a search query from a Google Maps share link.
// Used by MapView (search results map) to pin vendors on Leaflet,
// and by VendorProfilePage to show an embedded map in the sidebar.

const buildEmbedUrl = (query) =>
    `https://www.google.com/maps?q=${encodeURIComponent(query)}&z=16&output=embed`;
  
  const fallbackQuery = (vendor) =>
    [vendor.hall_name, vendor.address, vendor.city].filter(Boolean).join(", ");
  
  /**
   * Extracts [lat, lng] from a Google Maps share/short link, or null.
   * Order of attempts:
   *   1. !3d...!4d...  pin coords (most precise)
   *   2. @lat,lng      viewport center
   *   3. ?q=lat,lng    query coords
   */
  export function extractCoordsFromLink(link = "") {
    const pin = link.match(/!3d(-?\d+\.?\d*)!4d(-?\d+\.?\d*)/);
    if (pin) return [parseFloat(pin[1]), parseFloat(pin[2])];
  
    const at = link.match(/@(-?\d+\.?\d+),(-?\d+\.?\d+)/);
    if (at) return [parseFloat(at[1]), parseFloat(at[2])];
  
    const q = link.match(/[?&](?:q|query|ll)=(-?\d+\.?\d+),\s*(-?\d+\.?\d+)/);
    if (q) return [parseFloat(q[1]), parseFloat(q[2])];
  
    return null;
  }
  
  /**
   * Returns an embeddable Google Maps iframe src for a venue/vendor object.
   * Falls back to hall name + address + city search if no coords found.
   */
  export function getMapEmbedUrl(venue = {}) {
    const link = (venue.google_maps_link || "").trim();
  
    if (link) {
      // Already an embed URL — use as-is
      if (/^https:\/\/(www\.)?google\.(com|co\.in)\/maps\/embed/i.test(link)) return link;
  
      // Try extracting pin coords
      const coords = extractCoordsFromLink(link);
      if (coords) return buildEmbedUrl(`${coords[0]},${coords[1]}`);
  
      // Try place name in URL
      const place = link.match(/\/maps\/(?:place|search)\/([^/@?]+)/);
      if (place) {
        try {
          const name = decodeURIComponent(place[1].replace(/\+/g, " ")).trim();
          if (name) return buildEmbedUrl(name);
        } catch { /* fall through */ }
      }
    }
  
    // Fallback: search by name + address + city
    const query = fallbackQuery(venue);
    return query ? buildEmbedUrl(query) : null;
  }
  
  /** URL for the "Open in Google Maps" button. */
  export function getMapOpenUrl(venue = {}) {
    const link = (venue.google_maps_link || "").trim();
    if (/^https?:\/\//i.test(link) && !/\/maps\/embed/i.test(link)) return link;
    const query = fallbackQuery(venue);
    return query
      ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`
      : null;
  }
// Builds a Google Maps embed URL (no API key needed) from whatever the vendor saved.
// Vendors normally paste a plain share link, which Google will not allow inside an iframe,
// so we convert it: coordinates -> place name -> hall name + address + city.

const EMBED_HOST_REGEX = /^https:\/\/(www\.)?google\.(com|co\.in)\/maps\/embed/i;

const buildEmbed = (query) =>
  `https://www.google.com/maps?q=${encodeURIComponent(query)}&z=16&output=embed`;

const fallbackQuery = (venue) =>
  [venue.hall_name, venue.address, venue.city].filter(Boolean).join(", ");

export function getMapEmbedUrl(venue = {}) {
  const link = (venue.google_maps_link || "").trim();

  if (link) {
    // 1) Already an embed URL
    if (EMBED_HOST_REGEX.test(link)) return link;

    // 2) Coordinates inside the link (pin coords first, then viewport center, then ?q=lat,lng)
    const pin = link.match(/!3d(-?\d+\.\d+)!4d(-?\d+\.\d+)/);
    const at = link.match(/@(-?\d+\.\d+),(-?\d+\.\d+)/);
    const qCoords = link.match(/[?&](?:q|query|ll)=(-?\d+\.\d+),\s*(-?\d+\.\d+)/);
    const coords = pin || at || qCoords;
    if (coords) return buildEmbed(`${coords[1]},${coords[2]}`);

    // 3) Place name inside the link
    const place = link.match(/\/maps\/(?:place|search)\/([^/@?]+)/);
    if (place) {
      try {
        const name = decodeURIComponent(place[1].replace(/\+/g, " ")).trim();
        if (name) return buildEmbed(name);
      } catch {
        /* malformed encoding, fall through to address */
      }
    }
  }

  // 4) Fallback: hall name + address + city
  const query = fallbackQuery(venue);
  return query ? buildEmbed(query) : null;
}

// Link for the "Open in Google Maps" button under the map.
export function getMapOpenUrl(venue = {}) {
  const link = (venue.google_maps_link || "").trim();
  if (/^https?:\/\//i.test(link) && !/\/maps\/embed/i.test(link)) return link;

  const query = fallbackQuery(venue);
  return query
    ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(query)}`
    : null;
}
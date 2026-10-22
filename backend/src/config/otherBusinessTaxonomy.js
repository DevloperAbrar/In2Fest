// Central taxonomy for the "Other Business" (general) category.
//
// Problem this solves: every vendor under "other-business" looked the same
// ("OTHER BUSINESS") in search, cards, SEO and profile pages. A CCTV dealer, a
// tent supplier and a printing press were impossible to tell apart or filter.
//
// How it works (no database migration needed):
//   1. The vendor picks what they do (profile_attributes.business_types, up to 3),
//      from the list below OR by typing their own.
//   2. Everything else (search synonyms, filters, card tags, page titles, sitemap
//      landing pages) is derived from that choice, and from the vendor's keywords
//      and services for vendors who never picked a type.
//   3. Types that vendors type themselves become real filters automatically
//      (see getBusinessTypeFacets in discovery/search.service.js).
//
// To support a new kind of business, add one entry to TYPES. Nothing else changes.

const ROLES = ["Dealer / Retailer", "Wholesaler / Distributor", "Manufacturer", "Installer / Service provider", "Contractor", "Consultant / Agency", "Rental"];

// slug is permanent once indexed (it is used in URLs), never rename it.
const TYPES = [
  { slug: "cctv-security", label: "CCTV & Security Systems", group: "Security",
    synonyms: ["cctv", "security camera", "surveillance", "ip camera", "dvr", "nvr", "biometric", "access control", "alarm system"],
    services: ["CCTV installation", "Camera dealer", "AMC / maintenance", "Biometric attendance", "Video door phone", "Alarm systems"] },
  { slug: "security-guard", label: "Security Guard Services", group: "Security",
    synonyms: ["security guard", "bouncer", "security agency", "watchman"],
    services: ["Security guards", "Event security", "Bouncers", "Night patrol"] },
  { slug: "computer-it", label: "Computers, Laptops & IT", group: "IT & Electronics",
    synonyms: ["computer", "laptop", "it services", "networking", "printer", "software", "web development", "website"],
    services: ["Laptop sales", "Computer repair", "Networking & cabling", "Printer & toner", "Software development", "Website design"] },
  { slug: "solar-energy", label: "Solar & Energy", group: "Construction & Home",
    synonyms: ["solar", "inverter", "inverter battery", "ups", "solar panel", "rooftop solar"],
    services: ["Rooftop solar", "Solar water heater", "Inverter & battery", "Solar street light", "AMC"] },
  { slug: "furniture-interiors", label: "Furniture & Interiors", group: "Construction & Home",
    synonyms: ["furniture", "interior", "modular kitchen", "wardrobe", "sofa", "false ceiling", "carpenter"],
    services: ["Modular kitchen", "Wardrobes", "Office furniture", "Sofa & beds", "False ceiling", "Full home interiors"] },
  { slug: "building-material", label: "Building Material & Hardware", group: "Construction & Home",
    synonyms: ["cement", "tiles", "marble", "sanitary", "hardware", "paint", "steel", "bricks", "plywood", "building material"],
    services: ["Cement & steel", "Tiles & marble", "Sanitaryware", "Paint", "Plywood & laminates", "Hardware & tools"] },
  { slug: "construction-contractor", label: "Construction & Contractors", group: "Construction & Home",
    synonyms: ["contractor", "civil", "builder", "construction", "renovation", "architect", "waterproofing"],
    services: ["Civil construction", "Renovation", "Waterproofing", "Architect & design", "Government contracts"] },
  { slug: "electrical-lighting", label: "Electricals & Lighting", group: "Construction & Home",
    synonyms: ["electrical", "led", "lighting", "wiring", "fan", "switch", "cable"],
    services: ["LED lights", "Wiring & cables", "Fans & appliances", "Industrial electricals", "Decorative lighting"] },
  { slug: "ac-appliances", label: "AC & Home Appliances", group: "Construction & Home",
    synonyms: ["ac", "air conditioner", "refrigerator", "washing machine", "water purifier", "ro", "cooler", "appliance"],
    services: ["AC sales", "AC installation", "Appliance sales", "Water purifier", "AMC & repair"] },
  { slug: "printing-packaging", label: "Printing, Flex & Packaging", group: "Print & Marketing",
    synonyms: ["printing", "flex", "banner", "packaging", "sticker", "visiting card", "offset", "signage", "hoarding", "digital printing"],
    services: ["Flex & banners", "Visiting cards", "Stickers & labels", "Packaging boxes", "Signage boards", "T-shirt printing"] },
  { slug: "advertising-marketing", label: "Advertising & Marketing", group: "Print & Marketing",
    synonyms: ["advertising", "marketing", "seo", "social media", "branding", "digital marketing", "ad agency"],
    services: ["Social media marketing", "SEO", "Branding & logo", "Hoarding & outdoor ads", "Video ads"] },
  { slug: "gifts-novelty", label: "Gifts & Novelty", group: "Print & Marketing",
    synonyms: ["gift", "trophy", "memento", "custom gift", "corporate gift", "hamper"],
    services: ["Corporate gifts", "Trophies & mementos", "Personalised gifts", "Gift hampers"] },
  { slug: "automobile-dealer", label: "Automobile Sales & Accessories", group: "Automobile",
    synonyms: ["car", "bike", "two wheeler", "showroom", "used car", "car accessories", "tyre", "car battery"],
    services: ["New vehicle sales", "Used vehicles", "Car accessories", "Tyres & batteries", "Insurance & finance help"] },
  { slug: "driving-school", label: "Driving School", group: "Automobile",
    synonyms: ["driving school", "driving licence", "car training", "learner licence"],
    services: ["Car driving classes", "Two-wheeler classes", "Licence assistance"] },
  { slug: "travel-agency", label: "Travel, Tours & Ticketing", group: "Travel",
    synonyms: ["travel", "tour", "ticket", "visa", "passport", "taxi", "cab", "holiday package"],
    services: ["Tour packages", "Flight & train tickets", "Visa & passport help", "Taxi & cab booking", "Hotel booking"] },
  { slug: "courier-logistics", label: "Courier, Packers & Logistics", group: "Travel",
    synonyms: ["courier", "packers", "movers", "logistics", "transport", "cargo", "shifting", "warehouse"],
    services: ["Courier & parcel", "Home shifting", "Truck / tempo booking", "Warehousing", "Cargo"] },
  { slug: "real-estate", label: "Real Estate & Property", group: "Property & Finance",
    synonyms: ["real estate", "property", "flat", "plot", "broker", "rent", "land", "builder"],
    services: ["Buy / sell property", "Rentals", "Plots & land", "Commercial property", "Property management"] },
  { slug: "finance-insurance", label: "Loans, Insurance & Finance", group: "Property & Finance",
    synonyms: ["loan", "insurance", "mutual fund", "finance", "emi", "credit card", "investment"],
    services: ["Home loan", "Business loan", "Life insurance", "Vehicle insurance", "Mutual funds"] },
  { slug: "agriculture", label: "Agriculture & Farm Supplies", group: "Agriculture & Industry",
    synonyms: ["seeds", "fertilizer", "pesticide", "tractor", "farm", "irrigation", "agro", "nursery"],
    services: ["Seeds", "Fertilizers", "Farm equipment", "Irrigation", "Plants & nursery"] },
  { slug: "industrial-supplies", label: "Industrial & Machinery", group: "Agriculture & Industry",
    synonyms: ["industrial", "machinery", "fabrication", "welding", "pump", "motor", "bearing"],
    services: ["Machinery", "Fabrication & welding", "Pumps & motors", "Industrial tools", "Spare parts"] },
  { slug: "medical-supplies", label: "Medical & Surgical Supplies", group: "Health",
    synonyms: ["medical equipment", "surgical", "oxygen", "wheelchair", "hospital bed", "diagnostic", "pathology", "lab"],
    services: ["Medical equipment", "Surgical items", "Oxygen concentrator rental", "Diagnostic tests", "Home care"] },
  { slug: "pet-services", label: "Pets & Pet Care", group: "Lifestyle",
    synonyms: ["pet", "dog", "cat", "veterinary", "vet", "aquarium", "pet shop", "grooming"],
    services: ["Pet food & supplies", "Pet grooming", "Veterinary care", "Aquarium"] },
  { slug: "laundry-dry-clean", label: "Laundry & Dry Cleaning", group: "Lifestyle",
    synonyms: ["laundry", "dry clean", "dry cleaning", "ironing"],
    services: ["Dry cleaning", "Laundry", "Ironing", "Pickup & delivery"] },
  { slug: "tailor-boutique", label: "Tailoring & Boutique", group: "Lifestyle",
    synonyms: ["tailor", "boutique", "stitching", "alteration", "embroidery"],
    services: ["Ladies tailoring", "Gents tailoring", "Alterations", "Designer blouse", "Embroidery"] },
  { slug: "jewellery", label: "Jewellery & Watches", group: "Lifestyle",
    synonyms: ["jewellery", "jewelry", "gold", "silver", "diamond", "watch", "ornament"],
    services: ["Gold jewellery", "Silver jewellery", "Diamond jewellery", "Watches", "Repair & polishing"] },
  { slug: "photo-studio-frames", label: "Photo Frames & Albums", group: "Lifestyle",
    synonyms: ["photo frame", "frame", "album", "lamination", "passport photo"],
    services: ["Photo frames", "Albums", "Lamination", "Passport photos"] },
  { slug: "cleaning-pest", label: "Pest Control & Cleaning", group: "Home Services",
    synonyms: ["pest control", "termite", "cockroach", "fumigation", "sanitization", "housekeeping"],
    services: ["Pest control", "Termite treatment", "Sanitisation", "Housekeeping staff"] },
  { slug: "manpower-hr", label: "Manpower & Placement", group: "Business Services",
    synonyms: ["manpower", "placement", "recruitment", "staffing", "labour contractor"],
    services: ["Staffing", "Placement", "Payroll", "Domestic staff", "Contract labour"] },
  { slug: "legal-documentation", label: "Notary & Documentation", group: "Business Services",
    synonyms: ["notary", "stamp paper", "registration", "gst registration", "msme", "affidavit", "documentation", "trademark"],
    services: ["Notary & affidavit", "GST / MSME registration", "Trademark", "Stamp paper", "Passport & PAN help"] },
  { slug: "event-rental-supplies", label: "Event Rentals & Supplies", group: "Business Services",
    synonyms: ["rental", "party supplies", "balloon", "stage", "chairs", "generator rental", "crockery", "equipment rental"],
    services: ["Chairs & tables", "Stage & truss", "Balloon decoration", "Crockery & utensils", "Generator rental"] }
];

const BY_SLUG = new Map(TYPES.map((t) => [t.slug, t]));

/* ------------------------------------------------------------------ */
/* Small helpers                                                        */
/* ------------------------------------------------------------------ */
const norm = (s) => String(s || "").toLowerCase().replace(/[^\p{L}\p{M}\p{N}\s]/gu, " ").replace(/\s+/g, " ").trim();

function slugifyLabel(s) {
  return norm(s).replace(/\s/g, "-").slice(0, 50);
}

const getType = (slug) => BY_SLUG.get(slug) || null;

// Resolves one label a vendor typed or picked to { slug, label, known }.
// Known types match by label, slug or one of their synonyms. Anything else is a
// vendor-defined type: it still works (gets a slug) and becomes a filter once used.
function resolveTypeLabel(input) {
  const label = String(input || "").trim().slice(0, 30);
  const n = norm(label);
  if (n.length < 2) return null;
  const exact = TYPES.find((t) => norm(t.label) === n || t.slug === n.replace(/\s/g, "-") || t.synonyms.some((s) => norm(s) === n));
  if (exact) return { slug: exact.slug, label: exact.label, known: true };
  const slug = slugifyLabel(label);
  return slug ? { slug, label, known: false } : null;
}

// Clean list of up to 3 { slug, label } from what the vendor saved.
function resolveTypeList(labels) {
  const out = [];
  const seen = new Set();
  (Array.isArray(labels) ? labels : []).forEach((l) => {
    const r = resolveTypeLabel(l);
    if (!r || seen.has(r.slug) || out.length >= 3) return;
    seen.add(r.slug);
    out.push({ slug: r.slug, label: r.label });
  });
  return out;
}

// Words that should also match when a visitor types `term`. "cctv" finds listings that say
// "security camera" and the other way round. Only whole-word synonym hits expand, to keep results relevant.
function expandTerm(term) {
  const n = norm(term);
  if (!n) return [];
  const out = new Set([n]);
  TYPES.forEach((t) => {
    if (t.synonyms.some((s) => norm(s) === n)) t.synonyms.slice(0, 6).forEach((s) => out.add(norm(s)));
  });
  return [...out].slice(0, 8);
}

// Works out the types of one venue: what the vendor picked, else a best guess from keywords/services.
// Returns [{ slug, label, source: "declared" | "inferred" }].
function classifyVenue(venue) {
  const attrs = (venue && venue.profile_attributes) || {};
  const declared = resolveTypeList(attrs.business_types).map((t) => ({ ...t, source: "declared" }));
  if (declared.length) return declared;

  const haystack = norm([
    ...(Array.isArray(attrs.keywords) ? attrs.keywords : []),
    ...(Array.isArray(venue && venue.marketplace_services) ? venue.marketplace_services : []),
    venue && venue.specialty_tagline,
    venue && venue.hall_name
  ].join(" "));
  if (!haystack) return [];

  const padded = ` ${haystack} `;
  const scored = TYPES.map((t) => ({
    t,
    score: t.synonyms.reduce((n, s) => n + (padded.includes(` ${norm(s)} `) || padded.includes(` ${norm(s)}s `) ? 1 : 0), 0)
  })).filter((x) => x.score > 0).sort((a, b) => b.score - a.score);

  if (!scored.length) return [];
  const top = scored[0].score;
  return scored.filter((x) => x.score === top).slice(0, 2).map(({ t }) => ({ slug: t.slug, label: t.label, source: "inferred" }));
}

// True when the venue's primary category is a General one. `typeKeyOf` is getBusinessTypeKey from businessTypes.js.
const isGeneralVenue = (venue, typeKeyOf) => !!(venue && venue.business_category) && typeKeyOf(venue.business_category) === "general";

// Website "Our Services" cards built from the marketplace services, so a vendor enters services once.
// Used only when the vendor has not added website services of their own.
function deriveWebsiteServices(venue) {
  const detail = Array.isArray(venue && venue.marketplace_services_detail) ? venue.marketplace_services_detail : [];
  const flat = Array.isArray(venue && venue.marketplace_services) ? venue.marketplace_services : [];
  const rows = detail.length ? detail : flat.map((name) => ({ name, options: [] }));
  return rows
    .filter((r) => r && String(r.name || "").trim())
    .slice(0, 12)
    .map((r, i) => ({
      id: `mkt_${i}`,
      name: String(r.name).trim().slice(0, 80),
      description: (Array.isArray(r.options) ? r.options.filter(Boolean).slice(0, 6).join(", ") : "").slice(0, 300),
      icon: "sparkles",
      visible: true
    }));
}

module.exports = {
  ROLES, TYPES, isGeneralVenue, getType, resolveTypeList, expandTerm, classifyVenue, deriveWebsiteServices, slugifyLabel
};
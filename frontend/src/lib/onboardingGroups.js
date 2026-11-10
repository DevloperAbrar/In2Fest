import {
    Dumbbell, Flower2, BookOpen, GraduationCap, School, Baby, Laptop,
    ShoppingBasket, Shirt, Footprints, Plug, Smartphone, Pill, Pencil,
    UtensilsCrossed, Utensils, Cake, ChefHat, Store, Building2, Hotel, Scissors,
    Stethoscope, Calculator, Scale, Briefcase, Wrench, Sparkles, Zap, Car, Camera,
    Video, Palette, Speaker, Mail, Flame, ClipboardList, Landmark, Trees,
    Home, Tent, Disc3, Hand, PartyPopper, Crown, Building, Library
  } from "lucide-react";
  
  /**
   * Groups shown on the "What kind of business do you run?" step.
   * Order = priority. Groups that have a full management suite come first.
   * `suite: true` shows the "Full software" badge.
   */
  export const BUSINESS_GROUPS = [
    {
      key: "fitness",
      title: "Gym & Fitness",
      blurb: "Members, plans, fees, attendance",
      suite: true,
      icon: Dumbbell,
      tint: "#FFE3D6",
      ink: "#C81322"
    },
    {
      key: "library",
      title: "Library & Study Room",
      blurb: "Seats, shifts, fees, attendance",
      suite: true,
      icon: Library,
      tint: "#D9F2E6",
      ink: "#0F8F5F"
    },
    {
      key: "shop",
      title: "Shops & Retail",
      blurb: "Catalog, stock, orders, billing",
      suite: false,
      icon: Store,
      tint: "#FFDDE2",
      ink: "#C81322"
    },
    {
      key: "events",
      title: "Events & Weddings",
      blurb: "Bookings, calendar, clients",
      suite: false,
      icon: PartyPopper,
      tint: "#E7E3FF",
      ink: "#5B4FD6"
    },
    {
      key: "food",
      title: "Food & Restaurants",
      blurb: "Menu, orders, POS, table QR",
      suite: true,
      icon: UtensilsCrossed,
      tint: "#FCEFC0",
      ink: "#D38A10"
    },
    {
      key: "other",
      title: "Other Business",
      blurb: "Website, listing, enquiries",
      suite: false,
      icon: Building2,
      tint: "#DDE6FB",
      ink: "#2A3151"
    }
  ];
  
  const FITNESS_WORDS = /gym|fitness|yoga|dance|zumba|crossfit|martial|aerobic|swim|pilates/;
  
  /**
   * Decides which group a category belongs to.
   * Uses the business_type set by Super Admin, so a category added later in
   * Category Manager lands in the right group without a code change.
   */
  export function getGroupKey(cat) {
    const slug = String(cat?.slug || "");
    const type = cat?.business_type;
  
    if (type === "library" || /library|study/.test(slug)) return "library";
    if (slug === "gym-fitness") return "fitness";
    if ((type === "health_wellness" || type === "education") && FITNESS_WORDS.test(slug)) return "fitness";
    if (type === "retail") return "shop";
    if (type === "events") return "events";
    if (type === "food") return "food";
    return "other";
  }
  
  export function getGroup(key) {
    return BUSINESS_GROUPS.find((g) => g.key === key) || BUSINESS_GROUPS[BUSINESS_GROUPS.length - 1];
  }
  
  const ICONS_BY_SLUG = {
    // events
    "marriage-hall": Building2,
    "banquet-hall": Landmark,
    "party-lawn": Trees,
    farmhouse: Home,
    photographer: Camera,
    videographer: Video,
    decorator: Palette,
    caterer: Utensils,
    dj: Disc3,
    "makeup-artist": Sparkles,
    "mehendi-artist": Hand,
    "tent-house": Tent,
    "sound-lighting": Speaker,
    "card-printing": Mail,
    "horse-buggy": Crown,
    "pandit-services": Flame,
    "travel-transport": Car,
    "event-manager": ClipboardList,
    // education
    "coaching-institute": GraduationCap,
    school: School,
    "tuition-teacher": BookOpen,
    "play-school": Baby,
    "skill-training": Laptop,
    // retail
    "kirana-store": ShoppingBasket,
    "clothing-store": Shirt,
    "footwear-store": Footprints,
    "electronics-store": Plug,
    "mobile-shop": Smartphone,
    pharmacy: Pill,
    "stationery-store": Pencil,
    // food
    restaurant: UtensilsCrossed,
    "bakery-sweets": Cake,
    "cloud-kitchen": ChefHat,
    "food-court": Store,
    "restaurant-franchise": Utensils,
    "small-hotel": Hotel,
    // health, fitness, library
    "gym-fitness": Dumbbell,
    "yoga-center": Flower2,
    "salon-spa": Scissors,
    clinic: Stethoscope,
    "study-library": Library,
    // professional + home services
    "ca-accountant": Calculator,
    lawyer: Scale,
    consultant: Briefcase,
    "repair-services": Wrench,
    "home-cleaning": Sparkles,
    "electrician-plumber": Zap,
    "auto-garage": Car,
    "other-business": Building
  };
  
  export function getCategoryIcon(cat) {
    const bySlug = ICONS_BY_SLUG[cat?.slug];
    if (bySlug) return bySlug;
    // New category added by Super Admin: fall back to its group icon.
    return getGroup(getGroupKey(cat)).icon;
  }
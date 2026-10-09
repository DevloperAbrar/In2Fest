import {
    GraduationCap, BookOpen, School, Backpack, Pencil, PenTool, Calculator, FlaskConical, Atom, Languages,
    Laptop, Library, NotebookPen, Award, Trophy, Brain, Microscope, Palette, Music, Baby,
    ShoppingBasket, ShoppingCart, ShoppingBag, Store, Package, Boxes, Gift, Tag, Percent, Apple, Carrot, Milk,
    Wheat, Cookie, Shirt, Smartphone, Monitor, Pill, Gem, Barcode, Truck, Wallet,
    Utensils, UtensilsCrossed, Coffee, Pizza, Cake, IceCreamCone, ChefHat, Soup, Wine, Sandwich, Salad, Beef, Fish, Croissant,
    Dumbbell, Heart, HeartPulse, Stethoscope, Syringe, Activity, Scissors, Flower2, Smile, Eye, Bandage, Hospital, Bath, Glasses,
    Wrench, Hammer, Zap, Droplets, Plug, Paintbrush, Sofa, Fan, Car, Bike, Home, Key, Lock, Shield, Ruler, Cpu,
    Wifi, Printer, Sun, Snowflake, Leaf, TreePine, Lamp, Warehouse, Sprout,
    Briefcase, Scale, FileText, Landmark, Receipt, Banknote, CreditCard, Users, Phone, Mail, Globe, Code, Search,
    BarChart3, Building2, Handshake, Megaphone, Newspaper, Presentation, IndianRupee,
    PartyPopper, Camera, Video, Mic, Music2, Lightbulb, Speaker, Tent, Flower, Crown, Armchair, Plane, MapPin,
    Clapperboard, ConciergeBell, Drama, Ticket,
    Star, ThumbsUp, BadgeCheck, Clock, Calendar, Layers, Box, Bell, Sparkles
  } from "lucide-react";
  
  export const ICON_GROUPS = [
    { key: "education", label: "Education" },
    { key: "retail", label: "Shop & Grocery" },
    { key: "food", label: "Food" },
    { key: "health", label: "Health & Beauty" },
    { key: "home", label: "Home & Repair" },
    { key: "professional", label: "Professional" },
    { key: "events", label: "Events" },
    { key: "general", label: "General" }
  ];
  
  const I = (key, label, group, Icon, keywords = "") => ({ key, label, group, Icon, keywords });
  
  // Keys are stored in the database. NEVER rename an existing key.
  export const SERVICE_ICONS = [
    // Education
    I("graduation-cap", "Courses", "education", GraduationCap, "class degree college coaching batch"),
    I("book-open", "Study", "education", BookOpen, "books reading syllabus"),
    I("school", "School", "education", School, "classroom building"),
    I("backpack", "Students", "education", Backpack, "kids bag"),
    I("pencil", "Writing", "education", Pencil, "pen notes exam"),
    I("pen-tool", "Drawing", "education", PenTool, "design sketch"),
    I("calculator", "Maths", "education", Calculator, "mathematics accounts"),
    I("flask", "Chemistry", "education", FlaskConical, "lab science experiment"),
    I("science", "Physics", "education", Atom, "science atom"),
    I("languages", "Languages", "education", Languages, "english hindi speaking"),
    I("laptop", "Computer", "education", Laptop, "coding it online class"),
    I("library", "Library", "education", Library, "books"),
    I("notebook", "Tests & Notes", "education", NotebookPen, "exam test practice"),
    I("award", "Certificate", "education", Award, "medal achievement"),
    I("trophy", "Toppers", "education", Trophy, "results winner rank"),
    I("brain", "Aptitude", "education", Brain, "reasoning mental ability"),
    I("microscope", "Biology", "education", Microscope, "science lab"),
    I("palette", "Art & Craft", "education", Palette, "painting drawing"),
    I("music-class", "Music Class", "education", Music, "singing instruments"),
    I("baby", "Kids", "education", Baby, "play school nursery"),
  
    // Shop & Grocery
    I("basket", "Grocery", "retail", ShoppingBasket, "kirana store daily needs"),
    I("cart", "Shopping", "retail", ShoppingCart, "supermarket buy"),
    I("bag", "Bags & Retail", "retail", ShoppingBag, "shop purchase"),
    I("store", "Store", "retail", Store, "shop outlet"),
    I("package", "Packaging", "retail", Package, "parcel box"),
    I("boxes", "Wholesale", "retail", Boxes, "stock bulk"),
    I("gift", "Gifts", "retail", Gift, "present hamper"),
    I("tag", "Offers", "retail", Tag, "discount price"),
    I("percent", "Discounts", "retail", Percent, "sale offer"),
    I("apple", "Fruits", "retail", Apple, "fresh"),
    I("carrot", "Vegetables", "retail", Carrot, "fresh sabzi"),
    I("milk", "Dairy", "retail", Milk, "milk paneer"),
    I("wheat", "Grains", "retail", Wheat, "atta rice dal"),
    I("cookie", "Snacks", "retail", Cookie, "biscuits namkeen"),
    I("shirt", "Clothing", "retail", Shirt, "garments apparel"),
    I("smartphone", "Mobiles", "retail", Smartphone, "phone repair accessories"),
    I("monitor", "Electronics", "retail", Monitor, "computer tv appliances"),
    I("pill", "Medicines", "retail", Pill, "pharmacy medical"),
    I("gem", "Jewellery", "retail", Gem, "gold silver diamond"),
    I("barcode", "Barcode / Billing", "retail", Barcode, "pos scan"),
    I("truck", "Home Delivery", "retail", Truck, "delivery transport"),
    I("wallet", "Easy Payment", "retail", Wallet, "upi pay"),
  
    // Food
    I("utensils", "Dining", "food", Utensils, "restaurant meals catering"),
    I("utensils-crossed", "Restaurant", "food", UtensilsCrossed, "food menu"),
    I("coffee", "Cafe", "food", Coffee, "tea chai coffee"),
    I("pizza", "Pizza & Fast Food", "food", Pizza, "burger"),
    I("cake", "Bakery", "food", Cake, "cake pastry birthday"),
    I("ice-cream", "Desserts", "food", IceCreamCone, "ice cream sweet"),
    I("chef-hat", "Chef", "food", ChefHat, "kitchen cooking"),
    I("soup", "Hot Meals", "food", Soup, "thali dal"),
    I("wine", "Beverages", "food", Wine, "juice drinks"),
    I("sandwich", "Sandwich", "food", Sandwich, "snacks"),
    I("salad", "Healthy Food", "food", Salad, "diet"),
    I("beef", "Non-Veg", "food", Beef, "meat chicken"),
    I("fish", "Seafood", "food", Fish, "fish"),
    I("croissant", "Bakes", "food", Croissant, "bread bakery"),
  
    // Health & Beauty
    I("dumbbell", "Gym", "health", Dumbbell, "fitness workout training"),
    I("heart", "Wellness", "health", Heart, "care"),
    I("heart-pulse", "Health Check", "health", HeartPulse, "cardio doctor"),
    I("stethoscope", "Doctor", "health", Stethoscope, "clinic consultation"),
    I("syringe", "Vaccination", "health", Syringe, "injection"),
    I("activity", "Physiotherapy", "health", Activity, "exercise recovery"),
    I("scissors", "Salon", "health", Scissors, "haircut barber hair"),
    I("flower", "Spa", "health", Flower2, "massage relax beauty"),
    I("smile", "Dental", "health", Smile, "teeth"),
    I("eye", "Eye Care", "health", Eye, "optical vision"),
    I("bandage", "First Aid", "health", Bandage, "injury"),
    I("hospital", "Hospital", "health", Hospital, "emergency"),
    I("bath", "Bath & Grooming", "health", Bath, "spa pet"),
    I("glasses", "Eyewear", "health", Glasses, "spectacles optical"),
  
    // Home & Repair
    I("wrench", "Repair", "home", Wrench, "service mechanic fix"),
    I("hammer", "Carpentry", "home", Hammer, "construction work"),
    I("zap", "Electrician", "home", Zap, "electric wiring power"),
    I("droplets", "Plumbing", "home", Droplets, "water tap pipe"),
    I("plug", "Appliances", "home", Plug, "electronics repair"),
    I("paintbrush", "Painting", "home", Paintbrush, "colour wall"),
    I("sofa", "Furniture", "home", Sofa, "interior"),
    I("fan", "Cooling", "home", Fan, "ac fan"),
    I("car", "Car Service", "home", Car, "garage auto wash"),
    I("bike", "Bike Service", "home", Bike, "two wheeler"),
    I("home", "Home Services", "home", Home, "house cleaning"),
    I("key", "Locksmith", "home", Key, "keys"),
    I("lock", "Security", "home", Lock, "safe"),
    I("shield", "Warranty", "home", Shield, "protection insurance"),
    I("ruler", "Measurement", "home", Ruler, "tailor interior"),
    I("cpu", "Computer Repair", "home", Cpu, "laptop hardware"),
    I("wifi", "Internet", "home", Wifi, "broadband network"),
    I("printer", "Printing", "home", Printer, "xerox photocopy"),
    I("sun", "Solar", "home", Sun, "energy"),
    I("snowflake", "AC Service", "home", Snowflake, "cooling refrigerator"),
    I("leaf", "Gardening", "home", Leaf, "plants nursery"),
    I("tree", "Landscaping", "home", TreePine, "garden outdoor"),
    I("lamp", "Lighting", "home", Lamp, "lights decor"),
    I("warehouse", "Storage", "home", Warehouse, "godown packers movers"),
    I("sprout", "Agriculture", "home", Sprout, "farm seeds"),
  
    // Professional
    I("briefcase", "Business", "professional", Briefcase, "consulting office"),
    I("scale", "Legal", "professional", Scale, "lawyer advocate court"),
    I("file-text", "Documents", "professional", FileText, "paperwork filing"),
    I("landmark", "Banking", "professional", Landmark, "loan finance tax"),
    I("receipt", "Billing & GST", "professional", Receipt, "invoice tax return"),
    I("banknote", "Finance", "professional", Banknote, "money loan"),
    I("credit-card", "Payments", "professional", CreditCard, "card"),
    I("users", "Team", "professional", Users, "group staff hr"),
    I("phone", "Support", "professional", Phone, "call helpline"),
    I("mail", "Email", "professional", Mail, "contact"),
    I("globe", "Web", "professional", Globe, "website online"),
    I("code", "Development", "professional", Code, "software app"),
    I("search", "Research", "professional", Search, "seo analysis"),
    I("bar-chart", "Analytics", "professional", BarChart3, "reports growth"),
    I("building", "Corporate", "professional", Building2, "company office"),
    I("handshake", "Partnership", "professional", Handshake, "deal agency"),
    I("megaphone", "Marketing", "professional", Megaphone, "ads promotion"),
    I("newspaper", "Media", "professional", Newspaper, "news"),
    I("presentation", "Training", "professional", Presentation, "workshop seminar"),
    I("rupee", "Pricing", "professional", IndianRupee, "fees cost"),
  
    // Events
    I("party", "Celebration", "events", PartyPopper, "party birthday event"),
    I("camera", "Photography", "events", Camera, "photo shoot"),
    I("video", "Videography", "events", Video, "film cinematic"),
    I("mic", "Mic / Anchor", "events", Mic, "dj anchor singing"),
    I("music-note", "Music & DJ", "events", Music2, "songs band"),
    I("lightbulb", "Lighting Setup", "events", Lightbulb, "light idea"),
    I("speaker", "Sound System", "events", Speaker, "audio speakers"),
    I("tent", "Tent & Pandal", "events", Tent, "shamiyana marquee"),
    I("bouquet", "Flowers & Decor", "events", Flower, "decoration florist"),
    I("crown", "Premium", "events", Crown, "royal vip"),
    I("chair", "Seating", "events", Armchair, "furniture chairs"),
    I("plane", "Travel", "events", Plane, "tour trip"),
    I("map-pin", "Location", "events", MapPin, "venue address"),
    I("clapperboard", "Film & Shoot", "events", Clapperboard, "movie"),
    I("concierge", "Hospitality", "events", ConciergeBell, "reception service"),
    I("theatre", "Entertainment", "events", Drama, "show performance"),
    I("ticket", "Tickets", "events", Ticket, "entry pass"),
  
    // General
    I("sparkles", "Special", "general", Sparkles, "premium highlight new"),
    I("star", "Top Rated", "general", Star, "best favourite"),
    I("thumbs-up", "Trusted", "general", ThumbsUp, "recommended"),
    I("badge-check", "Verified", "general", BadgeCheck, "certified quality"),
    I("clock", "On Time", "general", Clock, "timing hours 24x7"),
    I("calendar", "Appointment", "general", Calendar, "booking schedule"),
    I("layers", "Packages", "general", Layers, "plans"),
    I("box", "Products", "general", Box, "items"),
    I("bell", "Alerts", "general", Bell, "notification")
  ];
  
  const BY_KEY = new Map(SERVICE_ICONS.map((i) => [i.key, i]));
  
  // Old emoji-based services keep working: each emoji maps to the closest SVG.
  export const LEGACY_EMOJI_MAP = {
    "🎪": "tent", "🍽": "utensils", "🎵": "music-note", "💡": "lightbulb", "🪑": "chair",
    "🎨": "palette", "📸": "camera", "🚗": "car", "🌸": "flower", "🎤": "mic",
    "🏟": "building", "❄": "snowflake", "🔊": "speaker", "🎭": "theatre", "🌿": "leaf",
    "🛎": "concierge", "💐": "bouquet", "🎂": "cake", "🎬": "clapperboard", "✨": "sparkles"
  };
  
  export function resolveServiceIcon(value) {
    if (!value) return null;
    const raw = String(value).trim();
    if (BY_KEY.has(raw)) return BY_KEY.get(raw);
    const legacyKey = LEGACY_EMOJI_MAP[raw.replace(/\uFE0F/g, "")];
    return legacyKey ? BY_KEY.get(legacyKey) || null : null;
  }
  
  export function normalizeIconKey(value, fallback = "sparkles") {
    return resolveServiceIcon(value)?.key || fallback;
  }
  
  export const DEFAULT_ICON_GROUP_BY_BUSINESS_TYPE = {
    events: "events",
    education: "education",
    retail: "retail",
    food: "food",
    health_wellness: "health",
    professional: "professional",
    home_services: "home",
    general: "general"
  };
// Category-driven Marketplace Profile.
//
// getProfileSchema(categorySlug, secondarySlugs) returns everything the vendor
// dashboard and the public profile page need to render a profile for that kind
// of business: labels, required fields, price units and the extra "attributes".
//
// To support a new kind of business, add an entry to TYPE_PROFILES (labels) and
// CATEGORY_ATTRIBUTES (fields). No database change is needed: attribute values
// live in venues.profile_attributes (JSONB).

const { BUSINESS_TYPES, getBusinessTypeKey } = require("./businessTypes");
const { AppError } = require("../middleware/error.middleware");

/* ------------------------------------------------------------------ */
/* Field helpers                                                        */
/* ------------------------------------------------------------------ */
const text = (key, label, extra = {}) => ({ key, label, type: "text", ...extra });
const num = (key, label, extra = {}) => ({ key, label, type: "number", ...extra });
const sel = (key, label, options, extra = {}) => ({ key, label, type: "select", options, ...extra });
const multi = (key, label, options, extra = {}) => ({ key, label, type: "multiselect", options, ...extra });
const bool = (key, label, extra = {}) => ({ key, label, type: "boolean", ...extra });
const tags = (key, label, extra = {}) => ({ key, label, type: "tags", ...extra });
const units = (list) => list.map((u) => ({ value: u, label: u }));

/* ------------------------------------------------------------------ */
/* Shared option lists                                                  */
/* ------------------------------------------------------------------ */
const MODES = ["Offline (at centre)", "Online", "Hybrid"];
const CLASS_BANDS = [
  "Pre-primary", "Class 1-5", "Class 6-8", "Class 9-10", "Class 11-12",
  "College / Graduate", "Working professionals"
];
const CUISINES = [
  "North Indian", "South Indian", "Chinese", "Fast food", "Street food", "Continental",
  "Italian", "Mughlai", "Rajasthani", "Gujarati", "Biryani", "Desserts & ice cream", "Beverages"
];
const FOOD_TYPES = ["Pure vegetarian", "Vegetarian & non-vegetarian", "Egg", "Jain options"];
const PAYMENT_MODES = ["Cash", "UPI", "Debit / Credit card", "Net banking", "Cheque", "EMI / Finance"];

/* ------------------------------------------------------------------ */
/* Attributes every business gets                                       */
/* ------------------------------------------------------------------ */
const UNIVERSAL_ATTRIBUTES = [
  tags("highlights", "Key highlights", {
    group: "Highlights",
    max: 6,
    placeholder: "e.g. 10+ years of experience",
    hint: "Short points shown as chips at the top of your profile (up to 6)."
  }),
  multi("payment_modes", "Payment modes accepted", PAYMENT_MODES, { group: "Payments", filterable: true }),
  {
    key: "custom_details",
    label: "Extra details",
    type: "keyvalue",
    group: "Extra details",
    max: 8,
    hint: "Anything else customers should know, for example \"Warranty\" and \"1 year\"."
  }
];

/* ------------------------------------------------------------------ */
/* Reusable attribute blocks                                            */
/* ------------------------------------------------------------------ */
const DELIVERY = [
  bool("home_delivery", "Home delivery available", { group: "Delivery & orders", filterable: true }),
  num("delivery_radius_km", "Delivery radius", { group: "Delivery & orders", unit: "km", min: 0, max: 200 }),
  num("min_order", "Minimum order value", { group: "Delivery & orders", unit: "₹", min: 0, max: 1000000 }),
  bool("whatsapp_orders", "Orders accepted on WhatsApp", { group: "Delivery & orders" })
];

const SERVICE_VISIT = [
  sel("response_time", "Typical response time", ["Within 1 hour", "Same day", "Next day", "Scheduled"], {
    group: "Service details", filterable: true
  }),
  bool("emergency", "24x7 / emergency service", { group: "Service details", filterable: true }),
  num("visit_charge", "Visit / inspection charge", { group: "Service details", unit: "₹", min: 0, max: 100000 }),
  num("warranty_days", "Warranty on service", { group: "Service details", unit: "days", min: 0, max: 3650 })
];

const VENUE_ATTRIBUTES = [
  sel("indoor_outdoor", "Type of space", ["Indoor", "Outdoor / lawn", "Both"], { group: "Venue details" }),
  sel("catering_policy", "Catering", ["In-house only", "Outside caterers allowed", "Both"], {
    group: "Venue details", filterable: true
  }),
  sel("decor_policy", "Decoration", ["In-house only", "Outside decorators allowed", "Both"], { group: "Venue details" }),
  num("parking_capacity", "Parking capacity", { group: "Venue details", unit: "vehicles", min: 0, max: 5000 }),
  num("rooms_available", "Guest rooms available", { group: "Venue details", min: 0, max: 500 }),
  bool("ac_hall", "Air conditioned hall", { group: "Facilities", filterable: true }),
  bool("generator", "Power backup / generator", { group: "Facilities" }),
  bool("dj_allowed", "DJ allowed", { group: "Facilities" }),
  bool("alcohol_allowed", "Alcohol allowed", { group: "Facilities" })
];

const PHOTO_ATTRIBUTES = [
  multi("styles", "Styles", ["Candid", "Traditional", "Cinematic", "Pre-wedding", "Drone", "Documentary"], {
    group: "Work details", filterable: true
  }),
  multi("deliverables", "Deliverables", [
    "Photo album", "Highlight video", "Full-length video", "Raw files", "Online gallery", "Reels"
  ], { group: "Work details" }),
  sel("delivery_time", "Delivery time", ["Within 1 week", "2-3 weeks", "4-6 weeks", "6+ weeks"], { group: "Work details" }),
  bool("travel_available", "Outstation travel available", { group: "Work details" })
];

/* ------------------------------------------------------------------ */
/* Category specific attributes                                         */
/* ------------------------------------------------------------------ */
const CATEGORY_ATTRIBUTES = {
  /* ---- events ---- */
  "marriage-hall": VENUE_ATTRIBUTES,
  "banquet-hall": VENUE_ATTRIBUTES,
  "party-lawn": VENUE_ATTRIBUTES,
  farmhouse: VENUE_ATTRIBUTES,
  photographer: PHOTO_ATTRIBUTES,
  videographer: PHOTO_ATTRIBUTES,
  caterer: [
    multi("cuisines", "Cuisines", CUISINES, { group: "Catering details", filterable: true }),
    multi("food_type", "Food type", FOOD_TYPES, { group: "Catering details", filterable: true }),
    num("min_guests", "Minimum guests", { group: "Catering details", min: 1, max: 100000 }),
    num("max_guests", "Maximum guests", { group: "Catering details", min: 1, max: 100000 }),
    bool("live_counters", "Live counters", { group: "Catering details" }),
    bool("serving_staff", "Serving staff provided", { group: "Catering details" }),
    bool("crockery", "Crockery & equipment provided", { group: "Catering details" })
  ],
  decorator: [
    multi("decor_styles", "Styles", [
      "Floral", "Theme-based", "LED & lighting", "Traditional / mandap", "Balloon", "Minimal / modern"
    ], { group: "Decor details", filterable: true }),
    bool("stage_setup", "Stage setup", { group: "Decor details" }),
    bool("outstation_setup", "Outstation setup available", { group: "Decor details" })
  ],
  dj: [
    bool("sound_system", "Own sound system", { group: "Equipment" }),
    bool("led_wall", "LED wall", { group: "Equipment" }),
    bool("anchor", "Anchor / MC available", { group: "Equipment" }),
    bool("generator", "Generator backup", { group: "Equipment" })
  ],
  "sound-lighting": [
    bool("sound_system", "Sound system", { group: "Equipment" }),
    bool("led_wall", "LED wall", { group: "Equipment" }),
    bool("stage_lighting", "Stage lighting", { group: "Equipment" }),
    bool("generator", "Generator backup", { group: "Equipment" })
  ],

  /* ---- education ---- */
  "coaching-institute": [
    multi("mode", "Mode of teaching", MODES, { group: "Course details", required: true, filterable: true }),
    multi("exams", "Exams / courses covered", [
      "JEE Main & Advanced", "NEET", "UPSC / State PSC", "SSC", "Banking", "Railways",
      "CA / CS / CMA", "CUET / CLAT", "Board exams", "Olympiads", "Foundation"
    ], { group: "Course details", filterable: true }),
    multi("classes", "Classes / levels", CLASS_BANDS, { group: "Course details", filterable: true }),
    num("batch_size", "Average batch size", { group: "Course details", unit: "students", min: 1, max: 500 }),
    num("faculty_count", "Number of faculty", { group: "Course details", min: 1, max: 500 }),
    bool("demo_class", "Free demo class", { group: "Facilities & support", filterable: true }),
    bool("study_material", "Study material provided", { group: "Facilities & support" }),
    bool("test_series", "Regular test series", { group: "Facilities & support" }),
    bool("doubt_sessions", "Doubt-clearing sessions", { group: "Facilities & support" }),
    bool("scholarship", "Scholarships available", { group: "Facilities & support", filterable: true }),
    bool("ac_classrooms", "AC classrooms", { group: "Facilities & support" }),
    bool("library", "Library / self-study room", { group: "Facilities & support" })
  ],
  school: [
    multi("boards", "Board / curriculum", [
      "CBSE", "ICSE / ISC", "State Board", "IB", "Cambridge / IGCSE", "NIOS"
    ], { group: "School details", required: true, filterable: true }),
    multi("classes", "Classes offered", ["Nursery / KG", "Class 1-5", "Class 6-8", "Class 9-10", "Class 11-12"], {
      group: "School details"
    }),
    multi("medium", "Medium of instruction", ["English", "Hindi", "Regional language"], { group: "School details" }),
    sel("school_type", "School type", ["Co-educational", "Boys only", "Girls only"], { group: "School details" }),
    sel("admission_status", "Admissions", ["Open", "Closed", "Waitlist"], { group: "School details", filterable: true }),
    num("student_count", "Total students", { group: "School details", min: 1, max: 100000 }),
    bool("transport", "School transport / bus", { group: "Facilities" }),
    bool("hostel", "Hostel facility", { group: "Facilities" }),
    bool("smart_classes", "Smart classes", { group: "Facilities" }),
    bool("computer_lab", "Computer lab", { group: "Facilities" }),
    bool("playground", "Playground / sports ground", { group: "Facilities" }),
    bool("cctv", "CCTV surveillance", { group: "Facilities" }),
    bool("canteen", "Canteen", { group: "Facilities" })
  ],
  "tuition-teacher": [
    tags("subjects", "Subjects taught", { group: "Teaching details", required: true, max: 10, placeholder: "e.g. Maths" }),
    multi("mode", "Mode of teaching", ["Offline (at my place)", "Home tuition", "Online"], {
      group: "Teaching details", required: true, filterable: true
    }),
    multi("classes", "Classes / levels taught", CLASS_BANDS, { group: "Teaching details", filterable: true }),
    sel("batch_type", "Batch type", ["Individual", "Small group", "Both"], { group: "Teaching details" }),
    num("experience_years", "Years of teaching experience", { group: "Teaching details", min: 0, max: 70 }),
    bool("demo_class", "Free demo class", { group: "Teaching details", filterable: true })
  ],
  "play-school": [
    multi("age_groups", "Age groups", ["1.5-2.5 yrs", "2.5-3.5 yrs", "3.5-4.5 yrs", "4.5-6 yrs"], {
      group: "School details", required: true, filterable: true
    }),
    text("child_teacher_ratio", "Child to teacher ratio", { group: "School details", placeholder: "e.g. 10:1" }),
    bool("daycare", "Daycare available", { group: "Facilities" }),
    bool("transport", "Transport available", { group: "Facilities" }),
    bool("meals_provided", "Meals / snacks provided", { group: "Facilities" }),
    bool("cctv", "CCTV surveillance", { group: "Facilities" }),
    bool("play_area", "Indoor / outdoor play area", { group: "Facilities" }),
    bool("activity_based", "Activity-based learning", { group: "Facilities" })
  ],
  "skill-training": [
    multi("mode", "Mode of teaching", MODES, { group: "Course details", required: true, filterable: true }),
    tags("skills", "Skills / courses taught", { group: "Course details", required: true, max: 10 }),
    text("duration", "Typical course duration", { group: "Course details", placeholder: "e.g. 3 months" }),
    bool("certification", "Certificate on completion", { group: "Facilities & support", filterable: true }),
    bool("placement_support", "Placement assistance", { group: "Facilities & support", filterable: true }),
    bool("demo_class", "Free demo class", { group: "Facilities & support" }),
    bool("weekend_batches", "Weekend batches", { group: "Facilities & support" })
  ],

  /* ---- retail ---- */
  "kirana-store": [
    ...DELIVERY,
    bool("open_sunday", "Open on Sundays", { group: "Store details" }),
    bool("wholesale", "Wholesale / bulk available", { group: "Store details" }),
    bool("credit_account", "Monthly credit accounts", { group: "Store details" })
  ],
  "clothing-store": [
    multi("clothing_for", "Clothing for", [
      "Men", "Women", "Kids", "Ethnic wear", "Western wear", "Wedding / bridal", "Sarees", "Uniforms"
    ], { group: "Store details", required: true, filterable: true }),
    tags("brands", "Brands available", { group: "Store details", max: 10 }),
    bool("trial_rooms", "Trial rooms", { group: "Store details" }),
    bool("alterations", "Alteration / tailoring service", { group: "Store details" }),
    ...DELIVERY
  ],
  "electronics-store": [
    tags("brands", "Brands available", { group: "Store details", max: 10 }),
    bool("warranty", "Manufacturer warranty", { group: "Store details" }),
    bool("emi_available", "EMI available", { group: "Store details", filterable: true }),
    bool("installation", "Free installation", { group: "Store details" }),
    bool("repair_service", "Repair service", { group: "Store details" }),
    bool("exchange_offer", "Exchange offers", { group: "Store details" }),
    ...DELIVERY
  ],
  "mobile-shop": [
    tags("brands", "Brands available", { group: "Store details", max: 10 }),
    bool("new_phones", "New phones", { group: "Store details" }),
    bool("second_hand", "Second-hand phones", { group: "Store details" }),
    bool("repair_service", "Repair service", { group: "Store details" }),
    bool("emi_available", "EMI available", { group: "Store details", filterable: true }),
    bool("exchange_offer", "Exchange offers", { group: "Store details" }),
    ...DELIVERY
  ],
  pharmacy: [
    bool("open_24x7", "Open 24x7", { group: "Store details", filterable: true }),
    bool("generic_medicines", "Generic medicines available", { group: "Store details" }),
    bool("cold_storage", "Cold storage (insulin, vaccines)", { group: "Store details" }),
    text("drug_licence_no", "Drug licence number", { group: "Store details", max: 40 }),
    ...DELIVERY
  ],
  "stationery-store": [
    bool("school_supplies", "School & office supplies", { group: "Store details" }),
    bool("printing_xerox", "Printing / photocopy", { group: "Store details" }),
    bool("bulk_orders", "Bulk / institutional orders", { group: "Store details" }),
    ...DELIVERY
  ],

  /* ---- food ---- */
  restaurant: [
    multi("cuisines", "Cuisines", CUISINES, { group: "Restaurant details", required: true, filterable: true }),
    multi("food_type", "Food type", FOOD_TYPES, { group: "Restaurant details", required: true, filterable: true }),
    multi("dining_options", "Dining options", ["Dine-in", "Takeaway", "Home delivery", "Catering", "Party hall"], {
      group: "Restaurant details", filterable: true
    }),
    num("seating_capacity", "Seating capacity", { group: "Restaurant details", min: 1, max: 5000 }),
    tags("delivery_partners", "Also available on", { group: "Restaurant details", max: 5, placeholder: "e.g. Zomato" }),
    bool("ac", "Air conditioned", { group: "Facilities" }),
    bool("parking", "Parking available", { group: "Facilities" }),
    bool("outdoor_seating", "Outdoor seating", { group: "Facilities" }),
    bool("family_friendly", "Family friendly", { group: "Facilities" }),
    bool("table_reservation", "Table reservation", { group: "Facilities" }),
    bool("live_music", "Live music", { group: "Facilities" }),
    bool("wifi", "Free Wi-Fi", { group: "Facilities" })
  ],
  "bakery-sweets": [
    tags("specialities", "Specialities", { group: "Shop details", max: 8 }),
    bool("custom_cakes", "Custom cakes", { group: "Shop details" }),
    bool("eggless_options", "Eggless options", { group: "Shop details", filterable: true }),
    bool("sugar_free", "Sugar-free options", { group: "Shop details" }),
    bool("bulk_orders", "Bulk / festival orders", { group: "Shop details" }),
    num("advance_order_days", "Advance notice for custom orders", { group: "Shop details", unit: "days", min: 0, max: 60 }),
    ...DELIVERY
  ],
  "cloud-kitchen": [
    multi("cuisines", "Cuisines", CUISINES, { group: "Kitchen details", required: true, filterable: true }),
    multi("food_type", "Food type", FOOD_TYPES, { group: "Kitchen details", required: true, filterable: true }),
    tags("delivery_partners", "Also available on", { group: "Kitchen details", max: 5 }),
    bool("meal_plans", "Daily / monthly meal plans", { group: "Kitchen details" }),
    bool("bulk_orders", "Bulk / party orders", { group: "Kitchen details" }),
    ...DELIVERY
  ],

  /* ---- health & wellness ---- */
  "gym-fitness": [
    sel("gym_type", "Gym type", ["Co-ed", "Men only", "Women only"], {
      group: "Gym details", required: true, filterable: true
    }),
    multi("facilities", "Facilities", [
      "Cardio zone", "Weight training", "Group classes", "Personal training", "Zumba / aerobics",
      "Yoga", "Steam / sauna", "Locker room", "Shower", "Parking", "AC"
    ], { group: "Gym details", filterable: true }),
    multi("membership_plans", "Membership plans", ["Monthly", "Quarterly", "Half-yearly", "Yearly", "Pay per visit"], {
      group: "Gym details"
    }),
    num("trainers_count", "Number of trainers", { group: "Gym details", min: 0, max: 200 }),
    bool("trial_session", "Free trial session", { group: "Gym details", filterable: true }),
    bool("diet_plans", "Diet plans offered", { group: "Gym details" })
  ],
  "salon-spa": [
    multi("salon_for", "Services for", ["Men", "Women", "Kids", "Unisex"], {
      group: "Salon details", required: true, filterable: true
    }),
    tags("brands_used", "Brands / products used", { group: "Salon details", max: 8 }),
    bool("home_service", "Home service available", { group: "Salon details", filterable: true }),
    bool("bridal_services", "Bridal services", { group: "Salon details" }),
    bool("appointment_required", "Appointment required", { group: "Salon details" }),
    bool("ac", "Air conditioned", { group: "Facilities" }),
    bool("parking", "Parking available", { group: "Facilities" })
  ],
  clinic: [
    tags("specialization", "Specialization", { group: "Clinic details", required: true, max: 6, placeholder: "e.g. Dentist" }),
    text("doctor_name", "Doctor / clinic head", { group: "Clinic details" }),
    text("qualifications", "Qualifications", { group: "Clinic details" }),
    num("experience_years", "Years of experience", { group: "Clinic details", min: 0, max: 70 }),
    text("registration_no", "Medical registration number", { group: "Clinic details", max: 40 }),
    bool("online_consultation", "Online consultation", { group: "Services", filterable: true }),
    bool("appointment_required", "Appointment required", { group: "Services" }),
    bool("emergency", "Emergency / walk-in", { group: "Services" }),
    bool("pathology_lab", "In-house lab / diagnostics", { group: "Services" }),
    bool("insurance_accepted", "Health insurance accepted", { group: "Services" })
  ],
  "yoga-center": [
    multi("yoga_styles", "Styles taught", [
      "Hatha", "Ashtanga", "Power yoga", "Pranayama & meditation", "Therapeutic yoga", "Prenatal yoga"
    ], { group: "Class details", required: true, filterable: true }),
    multi("batches", "Batches", ["Early morning", "Morning", "Evening", "Weekend"], { group: "Class details" }),
    bool("online_classes", "Online classes", { group: "Class details", filterable: true }),
    bool("trial_class", "Free trial class", { group: "Class details", filterable: true }),
    bool("women_only_batch", "Women-only batch", { group: "Class details" }),
    bool("certified_instructor", "Certified instructors", { group: "Class details" })
  ],

  /* ---- professional ---- */
  "ca-accountant": [
    multi("client_types", "Clients served", [
      "Individuals", "Small businesses", "Companies", "Startups", "NRIs", "Trusts / NGOs"
    ], { group: "Practice details", filterable: true }),
    text("membership_no", "Professional membership number", { group: "Practice details", max: 40 }),
    num("experience_years", "Years of experience", { group: "Practice details", min: 0, max: 70 }),
    bool("online_consultation", "Online consultation", { group: "Practice details", filterable: true }),
    bool("free_first_call", "Free first consultation", { group: "Practice details" })
  ],
  lawyer: [
    multi("practice_areas", "Practice areas", [
      "Criminal", "Civil", "Family & divorce", "Property", "Corporate", "Consumer",
      "Labour", "Cheque bounce", "Tax", "Intellectual property"
    ], { group: "Practice details", required: true, filterable: true }),
    multi("courts", "Courts", ["District court", "High Court", "Supreme Court", "Tribunals / consumer forums"], {
      group: "Practice details"
    }),
    text("bar_council_no", "Bar council enrolment number", { group: "Practice details", max: 40 }),
    num("experience_years", "Years of experience", { group: "Practice details", min: 0, max: 70 }),
    bool("online_consultation", "Online consultation", { group: "Practice details", filterable: true }),
    bool("free_first_call", "Free first consultation", { group: "Practice details" })
  ],
  consultant: [
    tags("domains", "Areas of expertise", { group: "Practice details", required: true, max: 8 }),
    tags("industries", "Industries served", { group: "Practice details", max: 8 }),
    multi("engagement", "Engagement types", ["Hourly", "Project-based", "Monthly retainer"], { group: "Practice details" }),
    num("experience_years", "Years of experience", { group: "Practice details", min: 0, max: 70 }),
    bool("online_consultation", "Online consultation", { group: "Practice details", filterable: true }),
    bool("free_first_call", "Free first consultation", { group: "Practice details" })
  ],

  /* ---- home services ---- */
  "repair-services": [
    tags("brands_serviced", "Brands serviced", { group: "Service details", max: 10 }),
    bool("pickup_drop", "Pickup & drop", { group: "Service details" }),
    bool("genuine_parts", "Genuine spare parts", { group: "Service details" }),
    ...SERVICE_VISIT
  ],
  "home-cleaning": [
    bool("equipment_provided", "Cleaning equipment provided", { group: "Service details" }),
    bool("eco_friendly", "Eco-friendly products", { group: "Service details" }),
    num("team_per_visit", "Team members per visit", { group: "Service details", min: 1, max: 50 }),
    ...SERVICE_VISIT
  ],
  "electrician-plumber": [
    multi("trades", "Trades", [
      "Electrician", "Plumber", "Carpenter", "Painter", "AC technician", "RO / water purifier"
    ], { group: "Service details", required: true, filterable: true }),
    bool("licensed", "Licensed / certified", { group: "Service details" }),
    ...SERVICE_VISIT
  ],
  "auto-garage": [
    multi("vehicle_types", "Vehicles serviced", ["Two-wheelers", "Cars", "Commercial vehicles", "EVs"], {
      group: "Garage details", required: true, filterable: true
    }),
    tags("brands_serviced", "Brands serviced", { group: "Garage details", max: 10 }),
    bool("authorized_centre", "Authorised service centre", { group: "Garage details" }),
    bool("pickup_drop", "Pickup & drop", { group: "Garage details" }),
    bool("insurance_claims", "Insurance claim support", { group: "Garage details" }),
    bool("towing", "Towing / roadside assistance", { group: "Garage details" }),
    num("warranty_days", "Warranty on service", { group: "Garage details", unit: "days", min: 0, max: 3650 })
  ],

  /* ---- general ---- */
  "other-business": [
    multi("service_mode", "How you serve customers", [
      "At our location", "At customer's location", "Online", "Delivery"
    ], { group: "Business details", required: true, filterable: true }),
    num("experience_years", "Years of experience", { group: "Business details", min: 0, max: 100 }),
    bool("free_estimate", "Free estimate / quote", { group: "Business details" })
  ]
};

// Used when a category has no list of its own above.
const TYPE_ATTRIBUTES = {
  events: [],
  education: [
    multi("mode", "Mode of teaching", MODES, { group: "Course details", filterable: true }),
    bool("demo_class", "Free demo class", { group: "Course details" }),
    bool("certification", "Certificate on completion", { group: "Course details" })
  ],
  retail: [...DELIVERY],
  food: [
    multi("cuisines", "Cuisines", CUISINES, { group: "Food details", filterable: true }),
    multi("food_type", "Food type", FOOD_TYPES, { group: "Food details", filterable: true }),
    ...DELIVERY
  ],
  health_wellness: [
    bool("trial_session", "Free trial session", { group: "Service details" }),
    bool("home_service", "Home service available", { group: "Service details" })
  ],
  professional: [
    num("experience_years", "Years of experience", { group: "Practice details", min: 0, max: 70 }),
    bool("online_consultation", "Online consultation", { group: "Practice details" }),
    bool("free_first_call", "Free first consultation", { group: "Practice details" })
  ],
  home_services: [...SERVICE_VISIT],
  general: CATEGORY_ATTRIBUTES["other-business"]
};

/* ------------------------------------------------------------------ */
/* Quick-add service suggestions per category                           */
/* ------------------------------------------------------------------ */
const CATEGORY_SUGGESTIONS = {
  "coaching-institute": ["JEE / NEET", "Board exams (Class 9-12)", "Foundation (Class 6-10)", "Olympiad preparation"],
  school: ["Pre-primary", "Primary school", "Middle school", "Senior secondary"],
  "tuition-teacher": ["Maths", "Science", "English", "Home tuition"],
  "skill-training": ["Spoken English", "Computer basics", "Digital marketing", "Tally & accounting"],
  restaurant: ["Starters", "Main course", "Breads", "Desserts", "Beverages"],
  "bakery-sweets": ["Cakes", "Pastries", "Cookies", "Indian sweets", "Namkeen"],
  "kirana-store": ["Groceries", "Dairy & bakery", "Snacks & beverages", "Personal care", "Household items"],
  "clothing-store": ["Men's wear", "Women's wear", "Kids wear", "Ethnic wear"],
  pharmacy: ["Prescription medicines", "OTC medicines", "Baby care", "Health supplements"],
  "gym-fitness": ["Weight training", "Cardio", "Personal training", "Zumba", "CrossFit"],
  "salon-spa": ["Haircut & styling", "Facial", "Hair colour", "Waxing", "Bridal makeup", "Spa & massage"],
  clinic: ["General physician", "Dental care", "Child specialist", "Skin care", "Physiotherapy"],
  "yoga-center": ["Hatha yoga", "Meditation", "Weight loss yoga", "Therapy yoga"],
  "ca-accountant": ["GST filing", "Income tax return", "Audit", "Company registration", "Bookkeeping"],
  lawyer: ["Property disputes", "Family matters", "Criminal cases", "Documentation"],
  consultant: ["Business strategy", "Process improvement", "Training"],
  "repair-services": ["AC repair", "Washing machine repair", "Refrigerator repair", "Mobile repair"],
  "home-cleaning": ["Full home deep cleaning", "Kitchen cleaning", "Bathroom cleaning", "Sofa & carpet cleaning"],
  "electrician-plumber": ["Wiring & fittings", "Switchboard repair", "Tap & pipe repair", "Water tank cleaning"],
  "auto-garage": ["General service", "Oil change", "Denting & painting", "Wheel alignment", "Battery replacement"]
};

/* ------------------------------------------------------------------ */
/* Labels and rules per kind of business                                */
/* ------------------------------------------------------------------ */
const BASE_PROFILE = {
  detailsTitle: "More Details",
  minDescriptionWords: 60,
  showAdvance: false,
  priceUnits: [],
  servicesSuggestions: [],
  required: [
    "business_category", "long_description", "specialty_tagline",
    "primary_locality", "whatsapp_number", "marketplace_services"
  ],
  stats: ["starting_price", "team_size", "year_established", "languages_spoken"],
  labels: {
    tagline: "Specialty tagline",
    taglinePlaceholder: "e.g. Trusted by 500+ customers since 2010",
    description: "Long description",
    achievements: "Awards & recognition",
    highlights: null, // label for the "famous events handled" column; null hides it
    highlightsPlaceholder: "",
    services: "Services offered",
    servicesHint: "Add what you offer. Break each into sub-services if it helps customers.",
    servicesPlaceholder: "Add a service",
    price: "Starting price",
    priceMax: "Maximum price",
    advance: "Advance payment required (%)",
    policy: "Cancellation policy",
    policyHint: "",
    inquiry: "Send Inquiry",
    team: "Team size"
  }
};

const TYPE_PROFILES = {
  events: {
    detailsTitle: "Service Details",
    minDescriptionWords: 150,
    showAdvance: true,
    priceUnits: ["per event", "per day", "per plate", "per hour", "per piece"],
    // Unchanged from the original Marketplace Profile so existing event vendors stay complete.
    required: [
      "business_category", "long_description", "specialty_tagline", "primary_locality",
      "whatsapp_number", "starting_price", "cancellation_policy", "marketplace_services", "video_intro_url"
    ],
    labels: {
      taglinePlaceholder: "e.g. Indore's most trusted wedding venue since 2008",
      highlights: "Famous events handled",
      highlightsPlaceholder: "Weddings, corporate events or celebrity events you have handled",
      services: "Services & amenities",
      servicesHint: "Pick from the categories you registered under and break each one into sub-services if it helps customers.",
      servicesPlaceholder: "Add a service"
    }
  },

  education: {
    detailsTitle: "Course & Institute Details",
    priceUnits: ["per month", "per term", "per year", "per course", "per session"],
    stats: ["starting_price", "attr:mode", "year_established", "team_size"],
    labels: {
      taglinePlaceholder: "e.g. Best JEE & NEET coaching in Indore, 120+ selections in 2025",
      description: "About your institute",
      achievements: "Awards & accreditations",
      highlights: "Results & achievements",
      highlightsPlaceholder: "Toppers, selections, board results, year-wise performance",
      services: "Courses & programs",
      servicesHint: "Add each course or program. Break it into batches or classes if it helps, for example JEE with a Class 11 batch and a Dropper batch.",
      servicesPlaceholder: "Add a course (e.g. JEE Main & Advanced)",
      price: "Fees from",
      priceMax: "Fees up to",
      policy: "Refund & fee policy",
      policyHint: "Explain refunds, fee instalments and late fees.",
      inquiry: "Enquire Now",
      team: "Faculty size"
    }
  },

  retail: {
    detailsTitle: "Shop Details",
    priceUnits: [],
    stats: ["starting_price", "attr:home_delivery", "year_established", "team_size"],
    labels: {
      taglinePlaceholder: "e.g. Your neighbourhood store for daily needs since 1998",
      description: "About your shop",
      services: "Product categories",
      servicesHint: "List what you sell. Add brands or items under each category if you like.",
      servicesPlaceholder: "Add a category (e.g. Groceries)",
      price: "Prices from",
      policy: "Return & exchange policy",
      policyHint: "Say what can be returned or exchanged, and for how many days.",
      inquiry: "Enquire / Order",
      team: "Staff size"
    },
    minDescriptionWords: 40
  },

  food: {
    detailsTitle: "Restaurant Details",
    priceUnits: ["for two", "per plate", "per person", "per kg"],
    stats: ["starting_price", "attr:cuisines", "year_established", "attr:food_type"],
    labels: {
      taglinePlaceholder: "e.g. Authentic Rajasthani thali since 1995",
      description: "About your restaurant",
      services: "Menu highlights",
      servicesHint: "Add your signature dishes or menu sections, for example Starters with Paneer Tikka under it.",
      servicesPlaceholder: "Add a dish or menu section",
      price: "Average cost",
      priceMax: "Highest price",
      policy: "Order & cancellation policy",
      policyHint: "Mention advance booking, party orders and cancellations.",
      inquiry: "Enquire / Reserve",
      team: "Staff size"
    },
    minDescriptionWords: 40
  },

  health_wellness: {
    detailsTitle: "Facility Details",
    priceUnits: ["per session", "per visit", "per month", "per quarter", "per year"],
    labels: {
      taglinePlaceholder: "e.g. Women-friendly gym with certified trainers",
      description: "About your centre",
      achievements: "Certifications & awards",
      services: "Services & treatments",
      servicesHint: "Add each service or treatment you offer. Break it into packages if it helps.",
      servicesPlaceholder: "Add a service (e.g. Facial)",
      price: "Fees from",
      priceMax: "Fees up to",
      policy: "Cancellation & refund policy",
      policyHint: "Explain how membership, session and package cancellations work.",
      inquiry: "Book Appointment",
      team: "Team size"
    }
  },

  professional: {
    detailsTitle: "Practice Details",
    showAdvance: true,
    priceUnits: ["per consultation", "per hour", "per project", "per month"],
    stats: ["starting_price", "attr:experience_years", "year_established", "languages_spoken"],
    labels: {
      taglinePlaceholder: "e.g. GST & income tax experts for small businesses",
      description: "About your practice",
      achievements: "Credentials & recognition",
      highlights: "Notable cases & projects",
      highlightsPlaceholder: "Notable clients, cases or projects you can talk about",
      services: "Services & practice areas",
      servicesHint: "Add each service or practice area. Break it into sub-services if it helps.",
      servicesPlaceholder: "Add a service (e.g. GST filing)",
      price: "Consultation fee from",
      priceMax: "Consultation fee up to",
      policy: "Fees & cancellation terms",
      policyHint: "Explain how you charge, advance payment and rescheduling.",
      inquiry: "Request Consultation",
      team: "Team size"
    }
  },

  home_services: {
    detailsTitle: "Service Details",
    priceUnits: ["per visit", "per job", "per hour", "per sq ft"],
    stats: ["starting_price", "attr:response_time", "year_established", "attr:warranty_days"],
    labels: {
      taglinePlaceholder: "e.g. Same-day AC repair with 30-day service warranty",
      description: "About your service",
      achievements: "Licences & certifications",
      services: "Services offered",
      servicesHint: "Add each service you provide. Break it into specific jobs if it helps.",
      servicesPlaceholder: "Add a service (e.g. AC repair)",
      price: "Service charge from",
      priceMax: "Service charge up to",
      policy: "Warranty & cancellation policy",
      policyHint: "Explain warranty on work and cancellation or visit charges.",
      inquiry: "Request Service",
      team: "Team size"
    }
  },

  general: {
    detailsTitle: "More Details",
    labels: {
      services: "Products & services",
      servicesHint: "Add what you sell or offer. Break each into sub-items if it helps customers.",
      servicesPlaceholder: "Add a product or service",
      inquiry: "Send Inquiry"
    }
  }
};

/* ------------------------------------------------------------------ */
/* Schema builder                                                       */
/* ------------------------------------------------------------------ */
function getProfileSchema(categorySlug, secondarySlugs = []) {
  const slug = typeof categorySlug === "string" && categorySlug ? categorySlug : null;
  const secondary = (Array.isArray(secondarySlugs) ? secondarySlugs : [])
    .filter((s) => typeof s === "string" && s && s !== slug)
    .slice(0, 2);

  const typeKey = getBusinessTypeKey(slug);
  const type = BUSINESS_TYPES[typeKey] || BUSINESS_TYPES.general;
  const override = TYPE_PROFILES[typeKey] || {};

  const labels = { ...BASE_PROFILE.labels, ...(override.labels || {}) };

  // Attributes: primary category first, then secondary categories, then universal ones.
  // Only the primary category's attributes can be "required".
  const seen = new Set();
  const attributes = [];
  const addAll = (list, isPrimary) => {
    (list || []).forEach((a) => {
      if (!a || seen.has(a.key)) return;
      seen.add(a.key);
      attributes.push({ group: "Details", ...a, required: Boolean(a.required && isPrimary) });
    });
  };
  const forSlug = (s) => CATEGORY_ATTRIBUTES[s] || TYPE_ATTRIBUTES[getBusinessTypeKey(s)] || [];

  addAll(forSlug(slug), true);
  secondary.forEach((s) => addAll(forSlug(s), false));
  addAll(UNIVERSAL_ATTRIBUTES, false);

  const requiredColumns = override.required || BASE_PROFILE.required;

  return {
    category: slug,
    business_type: typeKey,
    business_type_label: type.label,
    details_title: override.detailsTitle || BASE_PROFILE.detailsTitle,
    min_description_words: override.minDescriptionWords || BASE_PROFILE.minDescriptionWords,
    show_advance: override.showAdvance !== undefined ? override.showAdvance : BASE_PROFILE.showAdvance,
    required: requiredColumns,
    labels,
    price_units: units(override.priceUnits || BASE_PROFILE.priceUnits),
    services_suggestions: CATEGORY_SUGGESTIONS[slug] || override.servicesSuggestions || BASE_PROFILE.servicesSuggestions,
    stats: override.stats || BASE_PROFILE.stats,
    features: { availability: Array.isArray(type.modules) && type.modules.includes("slots") },
    attributes,
    groups: [...new Set(attributes.map((a) => a.group))]
  };
}

/* ------------------------------------------------------------------ */
/* Validation of vendor-submitted attribute values                      */
/* ------------------------------------------------------------------ */
function cleanValue(attr, value) {
  switch (attr.type) {
    case "text": {
      const v = String(value ?? "").trim().slice(0, attr.max || 120);
      return v || undefined;
    }
    case "textarea": {
      const v = String(value ?? "").trim().slice(0, attr.max || 500);
      return v || undefined;
    }
    case "number": {
      if (value === "" || value === null || value === undefined) return undefined;
      const n = Number(value);
      if (!Number.isFinite(n)) throw new AppError(`${attr.label} must be a number`, 400);
      const min = attr.min !== undefined ? attr.min : 0;
      const max = attr.max !== undefined ? attr.max : 10000000;
      if (n < min || n > max) throw new AppError(`${attr.label} must be between ${min} and ${max}`, 400);
      return n;
    }
    case "boolean": {
      if (typeof value === "boolean") return value;
      if (value === "true") return true;
      if (value === "false") return false;
      return undefined;
    }
    case "select": {
      return typeof value === "string" && (attr.options || []).includes(value) ? value : undefined;
    }
    case "multiselect": {
      if (!Array.isArray(value)) return undefined;
      const allowed = new Set(attr.options || []);
      const picked = [...new Set(value.filter((v) => typeof v === "string" && allowed.has(v)))];
      return picked.length ? picked : undefined;
    }
    case "tags": {
      if (!Array.isArray(value)) return undefined;
      const max = attr.max || 10;
      const seen = new Set();
      const out = [];
      value.forEach((v) => {
        const t = String(v ?? "").trim().slice(0, 30);
        const k = t.toLowerCase();
        if (!t || seen.has(k) || out.length >= max) return;
        seen.add(k);
        out.push(t);
      });
      return out.length ? out : undefined;
    }
    case "keyvalue": {
      if (!Array.isArray(value)) return undefined;
      const max = attr.max || 8;
      const out = [];
      value.forEach((row) => {
        if (!row || typeof row !== "object" || out.length >= max) return;
        const label = String(row.label ?? "").trim().slice(0, 30);
        const val = String(row.value ?? "").trim().slice(0, 100);
        if (label && val) out.push({ label, value: val });
      });
      return out.length ? out : undefined;
    }
    default:
      return undefined;
  }
}

// Returns a clean { key: value } object that only contains keys defined in the schema.
function sanitizeProfileAttributes(input, schema) {
  if (input === null || input === undefined) return {};
  if (typeof input !== "object" || Array.isArray(input)) {
    throw new AppError("Category details format is invalid", 400);
  }
  const out = {};
  schema.attributes.forEach((attr) => {
    if (!Object.prototype.hasOwnProperty.call(input, attr.key)) return;
    const clean = cleanValue(attr, input[attr.key]);
    if (clean !== undefined) out[attr.key] = clean;
  });
  return out;
}

function isAttributeFilled(value) {
  if (value === undefined || value === null) return false;
  if (typeof value === "string") return value.trim() !== "";
  if (Array.isArray(value)) return value.length > 0;
  return true;
}

module.exports = { getProfileSchema, sanitizeProfileAttributes, isAttributeFilled };
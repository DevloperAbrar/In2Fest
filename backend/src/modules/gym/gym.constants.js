const GYM_CATEGORY_SLUGS = ["gym-fitness"];
const EXPIRING_DAYS = 7;
const GOALS = ["fat_loss", "muscle_gain", "strength", "flexibility", "endurance", "general_fitness", "rehab", "other"];
const GENDERS = ["male", "female", "other"];

/* "arms" and "legs" are kept as LEGACY values so old workout plans and old custom exercises
   keep working. New exercises use the specific muscle (biceps, triceps, quads ...). */
const BODY_PART_GROUPS = [
  { key: "chest", label: "Chest", parts: ["chest"] },
  { key: "back", label: "Back", parts: ["back", "lower_back", "traps"] },
  { key: "shoulders", label: "Shoulders", parts: ["shoulders", "neck"] },
  { key: "arms", label: "Arms", parts: ["biceps", "triceps", "forearms", "arms"] },
  { key: "legs", label: "Legs", parts: ["quads", "hamstrings", "glutes", "calves", "hips", "legs"] },
  { key: "core", label: "Core", parts: ["core", "obliques"] },
  { key: "cardio", label: "Cardio", parts: ["cardio"] },
  { key: "full_body", label: "Full body", parts: ["full_body"] }
];
const BODY_PARTS = BODY_PART_GROUPS.flatMap((g) => g.parts);

const LEVELS = ["beginner", "intermediate", "advanced"];
const PAYMENT_MODES = ["cash", "upi", "card", "bank_transfer", "razorpay", "other"];
const LEAD_STATUSES = ["new", "contacted", "trial_booked", "trial_done", "converted", "lost"];

/* ---------- WhatsApp message templates ---------- */
const DEFAULT_MESSAGES = {
  welcome: "Namaste {{name}} 💪\n{{gym}} mein aapka swagat hai!\nPlan: {{plan}}\nValid till: {{expiry}}\nKoi bhi sawal ho to isi number par message karein.",
  receipt: "✅ ₹{{amount}} mil gaye - {{gym}}\nReceipt: {{receipt}}\nBaaki: ₹{{balance}}\nShukriya {{name}}!",
  expiry_reminder: "Hi {{name}} 🏋️\n{{gym}} mein aapka {{plan}} membership {{when}} ({{expiry}}) khatam ho raha hai.\nRenew karne ke liye yahan click karein: {{link}}",
  winback: "Hi {{name}}, {{gym}} mein aapki yaad aa rahi hai 💪\nAapka membership {{expiry}} ko khatam hua tha. Wapas aayiye, renew karein: {{link}}",
  payment_due: "Hi {{name}}, {{gym}} mein aapka ₹{{balance}} baaki hai. Payment ke liye: {{link}}",
  workout_plan: "Hi {{name}}, {{gym}} ne aapke liye workout plan \"{{plan}}\" taiyaar kiya hai 💪\nDekhein / download karein: {{link}}",
  birthday: "Happy Birthday {{name}} 🎂🎉\nTeam {{gym}} ki taraf se dher saari shubhkamnayein! Aaj ka workout special banayein 💪",
  festival: "Hi {{name}}, {{gym}} ki taraf se aapko aur aapke parivar ko tyohaar ki hardik shubhkamnayein 🎊\nFit rahiye, khush rahiye!",
  offer: "Hi {{name}} 🔥\n{{gym}} par special offer chal raha hai! Details ke liye isi number par reply karein ya aaj hi gym visit karein.",
  holiday_notice: "Hi {{name}}, {{gym}} kal band rahega. Kripya is baat ka dhyan rakhein. Dhanyavaad 🙏",
  feedback: "Hi {{name}}, {{gym}} mein aapka experience kaisa raha? Aapka feedback hamare liye bahut zaroori hai. Reply karke bataiye 🙏",
  referral: "Hi {{name}}, apne dost ko {{gym}} laayein aur dono ko special benefit paayein 💪\nDetails ke liye reply karein.",
  new_stock: "Hi {{name}}, {{gym}} mein supplements ka naya stock aa gaya hai 💪\nProtein, creatine aur bahut kuch. Aakar dekhein ya yahan check karein: {{website}}",
  trial_invite: "Hi {{name}}, {{gym}} mein aapka swagat hai 💪\nAap kis din aur kis time gym visit karna chahenge? Reply karein, hum aapke liye time fix kar denge.",
  trial_followup: "Hi {{name}}, {{gym}} se baat kar rahe hain. Aapne membership mein interest dikhaya tha. Kya hum aapki gym visit schedule kar dein?",
  trial_reminder: "Hi {{name}}, yaad dilane ke liye: {{gym}} mein aapki visit {{trial_date}} ko hai. Milte hain! 💪"
};

// bulk:false = needs one specific payment / plan, so it is only used from the member page
const SYSTEM_TEMPLATES = [
  { key: "expiry_reminder", title: "Renewal reminder", category: "renewals", for: "member", bulk: true },
  { key: "winback", title: "Win-back (after expiry)", category: "renewals", for: "member", bulk: true },
  { key: "payment_due", title: "Dues reminder", category: "renewals", for: "member", bulk: true },
  { key: "welcome", title: "Welcome message", category: "engage", for: "member", bulk: true },
  { key: "birthday", title: "Birthday wish", category: "engage", for: "member", bulk: true },
  { key: "feedback", title: "Feedback request", category: "engage", for: "member", bulk: true },
  { key: "referral", title: "Refer a friend", category: "engage", for: "member", bulk: true },
  { key: "trial_invite", title: "Visit invite", category: "leads", for: "lead", bulk: true },
  { key: "trial_followup", title: "Visit follow-up", category: "leads", for: "lead", bulk: true },
  { key: "trial_reminder", title: "Visit reminder", category: "leads", for: "lead", bulk: true },
  { key: "offer", title: "Offer / promotion", category: "promo", for: "both", bulk: true },
  { key: "new_stock", title: "New supplement stock", category: "promo", for: "both", bulk: true },
  { key: "festival", title: "Festival wishes", category: "notice", for: "both", bulk: true },
  { key: "holiday_notice", title: "Holiday / closed notice", category: "notice", for: "both", bulk: true },
  { key: "receipt", title: "Payment receipt text", category: "renewals", for: "member", bulk: false },
  { key: "workout_plan", title: "Workout plan message", category: "engage", for: "member", bulk: false }
];
const MESSAGE_KEYS = SYSTEM_TEMPLATES.map((t) => t.key);
const MESSAGE_CATEGORIES = [
  ["renewals", "Renewals & dues"], ["engage", "Engagement"], ["leads", "Leads & trials"],
  ["promo", "Offers & promotions"], ["notice", "Notices"], ["custom", "My templates"]
];
const MESSAGE_VARIABLES = [
  ["name", "First name"], ["full_name", "Full name"], ["gym", "Gym name"], ["plan", "Plan"], ["expiry", "Expiry date"],
  ["days_left", "Days left"], ["when", "When (aaj / kal / 5 din baad)"], ["balance", "Balance due"], ["link", "Renew link"],
  ["member_id", "Member ID"], ["trainer", "Trainer"], ["goal", "Goal"], ["trial_date", "Trial date"],
  ["gym_phone", "Gym phone"], ["website", "Website"], ["date", "Today's date"]
];

/* ---------- built-in exercise library (venue_id NULL) ----------
   part -> equipment -> names. Names must stay unique. */
const LIB = {
  chest: {
    Barbell: ["Barbell Bench Press", "Incline Barbell Bench Press", "Decline Bench Press", "Wide-grip Bench Press", "Floor Press"],
    Dumbbell: ["Dumbbell Bench Press", "Incline Dumbbell Press", "Decline Dumbbell Press", "Dumbbell Fly", "Incline Dumbbell Fly", "Dumbbell Pullover", "Dumbbell Squeeze Press"],
    Cable: ["Cable Crossover", "Low Cable Crossover", "Incline Cable Fly", "Single-arm Cable Press"],
    Machine: ["Chest Press Machine", "Incline Chest Press Machine", "Pec Deck", "Smith Machine Bench Press", "Smith Machine Incline Press"],
    Bodyweight: ["Push-ups", "Incline Push-ups", "Decline Push-ups", "Wide Push-ups", "Archer Push-ups", "Plyometric Push-ups", "Chest Dips"]
  },
  back: {
    Cable: ["Lat Pulldown", "Close-grip Lat Pulldown", "Reverse-grip Lat Pulldown", "Single-arm Lat Pulldown", "Seated Cable Row", "Single-arm Cable Row", "Straight-arm Pulldown"],
    Bodyweight: ["Pull-ups", "Chin-ups", "Wide-grip Pull-ups", "Neutral-grip Pull-ups", "Inverted Row"],
    Barbell: ["Barbell Row", "Pendlay Row", "Yates Row", "T-Bar Row", "Deadlift", "Sumo Deadlift", "Rack Pull"],
    Dumbbell: ["One-arm Dumbbell Row", "Chest-supported Dumbbell Row", "Dumbbell Deadlift", "Seal Row"],
    Machine: ["Machine Row", "Chest-supported Row Machine", "Hammer Strength Row", "Assisted Pull-up Machine"]
  },
  lower_back: {
    Bench: ["Back Extension"],
    Barbell: ["Good Morning"],
    Machine: ["Reverse Hyperextension"],
    Bodyweight: ["Superman", "Bird Dog"]
  },
  traps: {
    Dumbbell: ["Shrugs", "Incline Dumbbell Y Raise"],
    Barbell: ["Barbell Shrug"],
    Cable: ["Cable Shrug"],
    Machine: ["Smith Machine Shrug"],
    "Trap Bar": ["Trap Bar Shrug"]
  },
  shoulders: {
    Barbell: ["Overhead Press", "Push Press", "Behind-the-neck Press", "Upright Row"],
    Dumbbell: ["Dumbbell Shoulder Press", "Seated Dumbbell Press", "Arnold Press", "Lateral Raise", "Leaning Lateral Raise", "Front Raise", "Rear Delt Fly"],
    Cable: ["Face Pull", "Cable Lateral Raise", "Cable Rear Delt Fly", "Cable Front Raise"],
    Machine: ["Shoulder Press Machine", "Reverse Pec Deck", "Lateral Raise Machine", "Smith Machine Shoulder Press"],
    Bodyweight: ["Pike Push-ups", "Wall Handstand Push-ups"],
    Plate: ["Plate Front Raise"]
  },
  neck: { Bodyweight: ["Neck Flexion", "Neck Extension", "Neck Side Flexion"] },
  biceps: {
    Barbell: ["Barbell Curl", "EZ-bar Curl", "Drag Curl", "21s Barbell Curl"],
    Dumbbell: ["Dumbbell Curl", "Alternating Dumbbell Curl", "Hammer Curl", "Cross-body Hammer Curl", "Incline Dumbbell Curl", "Concentration Curl", "Zottman Curl", "Spider Curl"],
    Cable: ["Cable Curl", "Rope Hammer Curl", "High Cable Curl", "Single-arm Cable Curl", "Bayesian Cable Curl"],
    Machine: ["Preacher Curl", "Machine Bicep Curl", "EZ-bar Preacher Curl"],
    Bodyweight: ["Close-grip Chin-ups"]
  },
  triceps: {
    Cable: ["Tricep Pushdown", "Rope Pushdown", "Reverse-grip Pushdown", "Single-arm Cable Pushdown", "Overhead Cable Extension"],
    Barbell: ["Skull Crushers", "Close-grip Bench Press", "JM Press", "EZ-bar Overhead Extension"],
    Dumbbell: ["Overhead Tricep Extension", "Single-arm Overhead Extension", "Dumbbell Skull Crushers", "Tricep Kickback"],
    Bodyweight: ["Dips", "Bench Dips", "Diamond Push-ups", "Close-grip Push-ups"],
    Machine: ["Tricep Dip Machine", "Tricep Extension Machine"]
  },
  forearms: {
    Barbell: ["Wrist Curl", "Reverse Wrist Curl", "Reverse Barbell Curl", "Behind-the-back Wrist Curl"],
    Dumbbell: ["Dumbbell Wrist Curl", "Reverse Dumbbell Wrist Curl"],
    Bodyweight: ["Dead Hang"],
    Plate: ["Plate Pinch"],
    Other: ["Wrist Roller"]
  },
  core: {
    Bodyweight: ["Plank", "Crunches", "Bicycle Crunch", "Reverse Crunch", "Sit-ups", "Decline Sit-ups", "V-ups", "Lying Leg Raise", "Flutter Kicks", "Dead Bug", "Hollow Body Hold", "Hanging Leg Raise", "Hanging Knee Raise", "Toes to Bar", "Mountain Climbers", "Ab Wheel Rollout", "Dragon Flag"],
    Cable: ["Cable Crunch"],
    Machine: ["Ab Crunch Machine", "Captain's Chair Leg Raise"],
    "Stability Ball": ["Stability Ball Crunch"],
    Plate: ["Weighted Crunch"]
  },
  obliques: {
    Bodyweight: ["Russian Twist", "Side Plank", "Oblique Crunch", "Heel Touches", "Hanging Windshield Wipers"],
    Cable: ["Cable Woodchopper", "Pallof Press"],
    Dumbbell: ["Dumbbell Side Bend", "Suitcase Carry"],
    Barbell: ["Landmine Twist"]
  },
  quads: {
    Barbell: ["Barbell Squat", "Front Squat", "Box Squat", "Zercher Squat"],
    Machine: ["Leg Press", "Leg Extension", "Hack Squat", "Smith Machine Squat", "Belt Squat"],
    Dumbbell: ["Goblet Squat", "Bulgarian Split Squat", "Walking Lunges", "Reverse Lunges", "Dumbbell Lunges", "Step-ups", "Lateral Lunge", "Cossack Squat"],
    Bodyweight: ["Sissy Squat", "Wall Sit", "Jump Squats", "Pistol Squat", "Bodyweight Squat"]
  },
  hamstrings: {
    Barbell: ["Romanian Deadlift", "Stiff-leg Deadlift"],
    Dumbbell: ["Dumbbell Romanian Deadlift", "Single-leg Romanian Deadlift"],
    Machine: ["Leg Curl", "Seated Leg Curl", "Standing Leg Curl", "Glute-Ham Raise"],
    Bodyweight: ["Nordic Hamstring Curl"],
    "Stability Ball": ["Swiss Ball Leg Curl"]
  },
  glutes: {
    Barbell: ["Hip Thrust", "Smith Machine Hip Thrust"],
    Bodyweight: ["Glute Bridge", "Single-leg Hip Thrust", "Donkey Kicks", "Fire Hydrants", "Frog Pumps", "Sumo Squat"],
    Cable: ["Cable Kickback", "Cable Pull-through"],
    Machine: ["Glute Kickback Machine"],
    Dumbbell: ["Curtsy Lunge"]
  },
  calves: {
    Machine: ["Calf Raise", "Standing Calf Raise", "Seated Calf Raise", "Donkey Calf Raise", "Leg Press Calf Raise", "Smith Machine Calf Raise"],
    Dumbbell: ["Dumbbell Calf Raise"],
    Bodyweight: ["Single-leg Calf Raise", "Tibialis Raise"]
  },
  hips: {
    Machine: ["Hip Abduction Machine", "Hip Adduction Machine"],
    Cable: ["Cable Hip Abduction", "Cable Hip Adduction"],
    Bodyweight: ["Copenhagen Plank", "Side-lying Leg Raise"],
    Band: ["Banded Lateral Walk"]
  },
  cardio: {
    Treadmill: ["Treadmill Run", "HIIT Sprints", "Brisk Walk", "Incline Treadmill Walk"],
    Bike: ["Cycling", "Stationary Bike", "Spin Bike Intervals", "Assault Bike"],
    Machine: ["Rowing Machine", "Elliptical", "Stair Climber", "Ski Erg"],
    Rope: ["Jump Rope", "Battle Ropes"],
    Bodyweight: ["Burpees", "Box Jumps", "Jumping Jacks", "High Knees", "Shadow Boxing", "Swimming Laps"],
    Sled: ["Sled Push", "Sled Pull"]
  },
  full_body: {
    Kettlebell: ["Kettlebell Swing", "Kettlebell Snatch", "Turkish Get-up"],
    Barbell: ["Barbell Clean", "Power Clean", "Clean and Press", "Barbell Complex", "Thruster"],
    Dumbbell: ["Dumbbell Snatch", "Renegade Row", "Man Makers", "Farmer's Walk"],
    Other: ["Medicine Ball Slam", "Wall Ball", "Sandbag Carry"],
    Bodyweight: ["Bear Crawl"]
  }
};

// [name, body_part, equipment]
const EXERCISE_SEED = Object.entries(LIB).flatMap(([part, byEquipment]) =>
  Object.entries(byEquipment).flatMap(([equipment, names]) => names.map((name) => [name, part, equipment]))
);

// exercises: [name, sets, reps, rest_sec]
const STARTER_TEMPLATES = [
  {
    name: "Beginner Fat Loss (3 Days)", goal: "fat_loss", level: "beginner", duration_weeks: 8,
    days: [
      { title: "Full Body A + Cardio", focus: ["full_body", "cardio"], exercises: [["Goblet Squat", 3, "12", 60], ["Push-ups", 3, "10", 60], ["Seated Cable Row", 3, "12", 60], ["Plank", 3, "30 sec", 45], ["Treadmill Run", 1, "15 min", 0]] },
      { title: "Full Body B + Cardio", focus: ["full_body", "cardio"], exercises: [["Leg Press", 3, "12", 60], ["Dumbbell Shoulder Press", 3, "12", 60], ["Lat Pulldown", 3, "12", 60], ["Bicycle Crunch", 3, "15", 45], ["Cycling", 1, "20 min", 0]] },
      { title: "Full Body C + HIIT", focus: ["full_body", "cardio"], exercises: [["Romanian Deadlift", 3, "10", 75], ["Chest Press Machine", 3, "12", 60], ["One-arm Dumbbell Row", 3, "12", 60], ["Mountain Climbers", 3, "30 sec", 45], ["HIIT Sprints", 6, "30 sec", 30]] }
    ]
  },
  {
    name: "Muscle Gain - Push / Pull / Legs", goal: "muscle_gain", level: "intermediate", duration_weeks: 12,
    days: [
      { title: "Push (Chest, Shoulders, Triceps)", focus: ["chest", "shoulders", "arms"], exercises: [["Barbell Bench Press", 4, "8", 90], ["Incline Dumbbell Press", 3, "10", 75], ["Overhead Press", 3, "8", 90], ["Lateral Raise", 3, "15", 45], ["Tricep Pushdown", 3, "12", 60]] },
      { title: "Pull (Back, Biceps)", focus: ["back", "arms"], exercises: [["Deadlift", 3, "6", 120], ["Lat Pulldown", 4, "10", 75], ["Barbell Row", 3, "10", 90], ["Face Pull", 3, "15", 45], ["Barbell Curl", 3, "10", 60]] },
      { title: "Legs", focus: ["legs"], exercises: [["Barbell Squat", 4, "8", 120], ["Romanian Deadlift", 3, "10", 90], ["Leg Press", 3, "12", 90], ["Leg Curl", 3, "12", 60], ["Calf Raise", 4, "15", 45]] }
    ]
  },
  {
    name: "Strength - Upper / Lower (4 Days)", goal: "strength", level: "intermediate", duration_weeks: 10,
    days: [
      { title: "Upper A", focus: ["chest", "back", "shoulders"], exercises: [["Barbell Bench Press", 5, "5", 120], ["Barbell Row", 5, "5", 120], ["Overhead Press", 3, "8", 90], ["Pull-ups", 3, "8", 90]] },
      { title: "Lower A", focus: ["legs", "core"], exercises: [["Barbell Squat", 5, "5", 150], ["Romanian Deadlift", 3, "8", 120], ["Hip Thrust", 3, "10", 90], ["Hanging Leg Raise", 3, "12", 60]] },
      { title: "Upper B", focus: ["chest", "back", "arms"], exercises: [["Incline Dumbbell Press", 4, "8", 90], ["Seated Cable Row", 4, "10", 75], ["Dips", 3, "10", 75], ["Dumbbell Curl", 3, "12", 60]] },
      { title: "Lower B", focus: ["legs", "core"], exercises: [["Deadlift", 4, "5", 150], ["Leg Press", 3, "10", 90], ["Bulgarian Split Squat", 3, "10", 75], ["Plank", 3, "45 sec", 45]] }
    ]
  }
];

module.exports = {
  GYM_CATEGORY_SLUGS, EXPIRING_DAYS, GOALS, GENDERS, BODY_PART_GROUPS, BODY_PARTS, LEVELS, PAYMENT_MODES, LEAD_STATUSES,
  MESSAGE_KEYS, MESSAGE_CATEGORIES, MESSAGE_VARIABLES, SYSTEM_TEMPLATES, DEFAULT_MESSAGES,
  EXERCISE_SEED, STARTER_TEMPLATES
};
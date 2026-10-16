const GYM_CATEGORY_SLUGS = ["gym-fitness"];
const EXPIRING_DAYS = 7;
const GOALS = ["fat_loss", "muscle_gain", "strength", "flexibility", "endurance", "general_fitness", "rehab", "other"];
const GENDERS = ["male", "female", "other"];
const BODY_PARTS = ["chest", "back", "legs", "shoulders", "arms", "core", "cardio", "full_body"];
const LEVELS = ["beginner", "intermediate", "advanced"];
const PAYMENT_MODES = ["cash", "upi", "card", "bank_transfer", "razorpay", "other"];
const LEAD_STATUSES = ["new", "contacted", "trial_booked", "trial_done", "converted", "lost"];
const MESSAGE_KEYS = ["welcome", "receipt", "expiry_reminder", "winback", "payment_due", "workout_plan"];

const DEFAULT_MESSAGES = {
  welcome: "Namaste {{name}} 💪\n{{gym}} mein aapka swagat hai!\nPlan: {{plan}}\nValid till: {{expiry}}\nKoi bhi sawal ho to isi number par message karein.",
  receipt: "✅ ₹{{amount}} mil gaye - {{gym}}\nReceipt: {{receipt}}\nBaaki: ₹{{balance}}\nShukriya {{name}}!",
  expiry_reminder: "Hi {{name}} 🏋️\n{{gym}} mein aapka {{plan}} membership {{when}} ({{expiry}}) khatam ho raha hai.\nRenew karne ke liye yahan click karein: {{link}}",
  winback: "Hi {{name}}, {{gym}} mein aapki yaad aa rahi hai 💪\nAapka membership {{expiry}} ko khatam hua tha. Wapas aayiye, renew karein: {{link}}",
  payment_due: "Hi {{name}}, {{gym}} mein aapka ₹{{balance}} baaki hai. Payment ke liye: {{link}}",
  workout_plan: "Hi {{name}}, {{gym}} ne aapke liye workout plan \"{{plan}}\" taiyaar kiya hai 💪\nDekhein / download karein: {{link}}"
  // owner-facing, not editable
  
};

// [name, body_part, equipment]
const EXERCISE_SEED = [
  ["Barbell Bench Press", "chest", "Barbell"], ["Incline Dumbbell Press", "chest", "Dumbbell"],
  ["Decline Bench Press", "chest", "Barbell"], ["Dumbbell Fly", "chest", "Dumbbell"],
  ["Cable Crossover", "chest", "Cable"], ["Push-ups", "chest", "Bodyweight"],
  ["Chest Press Machine", "chest", "Machine"], ["Pec Deck", "chest", "Machine"],
  ["Lat Pulldown", "back", "Cable"], ["Pull-ups", "back", "Bodyweight"],
  ["Barbell Row", "back", "Barbell"], ["Seated Cable Row", "back", "Cable"],
  ["One-arm Dumbbell Row", "back", "Dumbbell"], ["Deadlift", "back", "Barbell"],
  ["T-Bar Row", "back", "Barbell"], ["Straight-arm Pulldown", "back", "Cable"],
  ["Barbell Squat", "legs", "Barbell"], ["Leg Press", "legs", "Machine"],
  ["Romanian Deadlift", "legs", "Barbell"], ["Walking Lunges", "legs", "Dumbbell"],
  ["Leg Extension", "legs", "Machine"], ["Leg Curl", "legs", "Machine"],
  ["Calf Raise", "legs", "Machine"], ["Goblet Squat", "legs", "Dumbbell"],
  ["Hip Thrust", "legs", "Barbell"], ["Bulgarian Split Squat", "legs", "Dumbbell"],
  ["Overhead Press", "shoulders", "Barbell"], ["Dumbbell Shoulder Press", "shoulders", "Dumbbell"],
  ["Lateral Raise", "shoulders", "Dumbbell"], ["Front Raise", "shoulders", "Dumbbell"],
  ["Rear Delt Fly", "shoulders", "Dumbbell"], ["Face Pull", "shoulders", "Cable"],
  ["Arnold Press", "shoulders", "Dumbbell"], ["Upright Row", "shoulders", "Barbell"],
  ["Shrugs", "shoulders", "Dumbbell"],
  ["Barbell Curl", "arms", "Barbell"], ["Dumbbell Curl", "arms", "Dumbbell"],
  ["Hammer Curl", "arms", "Dumbbell"], ["Preacher Curl", "arms", "Machine"],
  ["Tricep Pushdown", "arms", "Cable"], ["Skull Crushers", "arms", "Barbell"],
  ["Overhead Tricep Extension", "arms", "Dumbbell"], ["Close-grip Bench Press", "arms", "Barbell"],
  ["Dips", "arms", "Bodyweight"],
  ["Plank", "core", "Bodyweight"], ["Crunches", "core", "Bodyweight"],
  ["Hanging Leg Raise", "core", "Bodyweight"], ["Russian Twist", "core", "Bodyweight"],
  ["Cable Crunch", "core", "Cable"], ["Ab Wheel Rollout", "core", "Ab wheel"],
  ["Mountain Climbers", "core", "Bodyweight"], ["Bicycle Crunch", "core", "Bodyweight"],
  ["Treadmill Run", "cardio", "Treadmill"], ["Cycling", "cardio", "Bike"],
  ["Rowing Machine", "cardio", "Rower"], ["Jump Rope", "cardio", "Rope"],
  ["Elliptical", "cardio", "Machine"], ["Stair Climber", "cardio", "Machine"],
  ["Burpees", "cardio", "Bodyweight"], ["HIIT Sprints", "cardio", "Treadmill"]
];

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
  GYM_CATEGORY_SLUGS, EXPIRING_DAYS, GOALS, GENDERS, BODY_PARTS, LEVELS, PAYMENT_MODES,
  LEAD_STATUSES, MESSAGE_KEYS, DEFAULT_MESSAGES, EXERCISE_SEED, STARTER_TEMPLATES
};
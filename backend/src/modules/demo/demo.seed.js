const { GymLead } = require("../../database/models");
const U = require("../gym/gym.utils");
const members = require("../gym/gym.members.service");
const insights = require("../gym/gym.insights.service");
const workout = require("../gym/gym.workout.service");

const PLANS = [
  { key: "m1", name: "Monthly", months: 1, price: 1500, joining: 500, pt: 3000, sort: 1 },
  { key: "q3", name: "Quarterly", months: 3, price: 3900, joining: 500, pt: 3000, sort: 2, popular: true },
  { key: "h6", name: "Half-Yearly", months: 6, price: 6500, joining: 0, pt: 3000, sort: 3 },
  { key: "y12", name: "Annual", months: 12, price: 10500, joining: 0, pt: 3000, sort: 4 }
];

// ago = days since the membership started. Dates are relative to "today", so every reset looks fresh.
const M = (name, g, goal, plan, ago, paid, x = {}) => ({ name, g, goal, plan, ago, paid, ...x });
const MEMBERS = [
  // running
  M("Rahul Sharma", "male", "muscle_gain", "q3", 20, "full", { trainer: "Coach Ravi", source: "walk_in", bd: 2 }),
  M("Priya Verma", "female", "fat_loss", "y12", 45, "full", { trainer: "Coach Meera", source: "instagram" }),
  M("Amit Patel", "male", "strength", "m1", 8, "full", { trainer: "Coach Ravi", source: "referral" }),
  M("Neha Singh", "female", "fat_loss", "h6", 60, "full", { pt: true, trainer: "Coach Meera", source: "website", bd: 1 }),
  M("Vikram Rathore", "male", "muscle_gain", "q3", 35, "partial", { trainer: "Coach Sameer", source: "walk_in" }),
  M("Sneha Joshi", "female", "flexibility", "m1", 12, "full", { trainer: "Coach Meera", source: "instagram" }),
  M("Karan Malhotra", "male", "general_fitness", "y12", 120, "full", { trainer: "Coach Sameer", source: "referral" }),
  M("Pooja Yadav", "female", "endurance", "q3", 50, "full", { trainer: "Coach Meera", source: "walk_in" }),
  M("Arjun Mishra", "male", "muscle_gain", "h6", 90, "partial", { trainer: "Coach Ravi", source: "website" }),
  M("Ritu Agarwal", "female", "fat_loss", "m1", 5, "full", { trainer: "Coach Meera", source: "instagram", bd: 3 }),
  M("Sandeep Chauhan", "male", "strength", "q3", 15, "full", { pt: true, trainer: "Coach Sameer", source: "walk_in" }),
  M("Anjali Gupta", "female", "general_fitness", "y12", 200, "full", { trainer: "Coach Meera", source: "referral" }),
  // expiring within a week
  M("Deepak Kumar", "male", "muscle_gain", "m1", 26, "full", { trainer: "Coach Ravi", source: "walk_in" }),
  M("Meena Thakur", "female", "fat_loss", "m1", 27, "full", { trainer: "Coach Meera", source: "instagram" }),
  M("Rohit Saxena", "male", "strength", "m1", 25, "partial", { trainer: "Coach Sameer", source: "walk_in" }),
  M("Kavita Pandey", "female", "flexibility", "m1", 28, "full", { trainer: "Coach Meera", source: "referral" }),
  // expired
  M("Manish Jain", "male", "muscle_gain", "m1", 62, "full", { source: "walk_in" }),
  M("Suresh Dubey", "male", "general_fitness", "m1", 75, "full", { source: "walk_in" }),
  M("Divya Nair", "female", "fat_loss", "q3", 135, "full", { source: "instagram" }),
  M("Harsh Vardhan", "male", "strength", "m1", 50, "full", { source: "website" }),
  // new this week
  M("Ayesha Khan", "female", "fat_loss", "m1", 2, "full", { trainer: "Coach Meera", source: "instagram" }),
  M("Tarun Bansal", "male", "muscle_gain", "q3", 1, "partial", { trainer: "Coach Ravi", source: "walk_in" }),
  M("Isha Kapoor", "female", "general_fitness", "m1", 0, "full", { trainer: "Coach Meera", source: "referral" }),
  // frozen
  M("Nitin Tiwari", "male", "strength", "q3", 30, "full", { freeze: 10, source: "walk_in" }),
  M("Shruti Rao", "female", "flexibility", "h6", 40, "full", { freeze: 7, source: "website" }),
  // joined, nothing paid yet
  M("Gaurav Soni", "male", "muscle_gain", "m1", 10, "none", { trainer: "Coach Sameer", source: "walk_in" })
];

const MODES = ["upi", "cash", "card", "upi"];

const LEADS = [
  { name: "Aditya Rane", goal: "muscle_gain", preferred_time: "Evening", source: "instagram", status: "new" },
  { name: "Simran Kaur", goal: "fat_loss", preferred_time: "Morning", source: "website", status: "new" },
  { name: "Mohit Bhatt", goal: "general_fitness", preferred_time: "Evening", source: "walk_in", status: "contacted" },
  { name: "Palak Shah", goal: "flexibility", preferred_time: "Morning", source: "referral", status: "trial_booked", trial: 1 },
  { name: "Yash Dixit", goal: "strength", preferred_time: "Evening", source: "website", status: "trial_done" },
  { name: "Komal Jha", goal: "fat_loss", preferred_time: "Morning", source: "instagram", status: "converted" },
  { name: "Rakesh Pal", goal: "muscle_gain", preferred_time: "Afternoon", source: "walk_in", status: "lost" }
];

async function seedGymData(venue) {
  const settings = await insights.getSettings(venue.id);
  const ctx = { venue, settings, user: { name: "Demo Manager" } };
  const today = U.todayIST();
  const out = { plans: 0, members: 0, leads: 0, failed: 0 };

  const plans = {};
  for (const p of PLANS) {
    const row = await members.createPlan(venue.id, {
      name: p.name,
      description: `${p.name} membership`,
      duration_unit: "months",
      duration_value: p.months,
      price: p.price,
      joining_fee: p.joining,
      pt_addon_price: p.pt,
      discount_percent: 0,
      tax_rate: 0,
      freeze_allowed: true,
      max_freeze_days: 15,
      is_popular: !!p.popular,
      sort_order: p.sort
    });
    plans[p.key] = { row, p };
    out.plans += 1;
  }

  for (let i = 0; i < MEMBERS.length; i += 1) {
    const m = MEMBERS[i];
    const { row, p } = plans[m.plan];
    const total = p.price + p.joining + (m.pt ? p.pt : 0);
    const pay = m.paid === "full" ? total : m.paid === "partial" ? Math.round(total * 0.6) : 0;
    const start = U.addDays(today, -m.ago);
    const body = {
      name: m.name,
      phone: `98${String(10000001 + i)}`,
      gender: m.g,
      goal: m.goal,
      trainer_name: m.trainer || null,
      source: m.source || null,
      plan_id: row.id,
      start_date: start,
      include_pt: !!m.pt
    };
    if (m.bd !== undefined) body.dob = `${1990 + (i % 12)}-${U.addDays(today, m.bd).slice(5)}`;
    if (pay > 0) body.payment = { amount: pay, mode: MODES[i % MODES.length], paid_on: start };

    try {
      const r = await members.enroll(ctx, body);
      if (m.freeze) await members.freeze(venue.id, r.member.id, { days: m.freeze });
      out.members += 1;
    } catch (e) {
      out.failed += 1;
      console.error("[DEMO SEED] member failed:", m.name, e.message);
    }
  }

  try {
    await GymLead.bulkCreate(
      LEADS.map((l, i) => ({
        venue_id: venue.id,
        name: l.name,
        phone: `97${String(20000001 + i)}`,
        goal: l.goal,
        preferred_time: l.preferred_time,
        source: l.source,
        status: l.status,
        trial_date: l.trial ? U.addDays(today, l.trial) : null
      }))
    );
    out.leads = LEADS.length;
  } catch (e) {
    console.error("[DEMO SEED] leads failed:", e.message);
  }

  try {
    await workout.installStarters(venue.id);
  } catch (e) {
    console.error("[DEMO SEED] workout templates failed:", e.message);
  }

  return out;
}

module.exports = { seedGymData };
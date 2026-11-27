import { Dumbbell, Trophy, Music, Library } from "lucide-react";

/**
 * The business types a NEW vendor can choose on the first onboarding page.
 * key = the category's segment_key (see /meta/categories).
 * examples = the sports / class types shown as small chips on the card. Display only.
 * To open another business type later (for example food), add one entry here.
 */
export const ONBOARDING_SEGMENTS = [
  {
    key: "gym",
    title: "Gym & Fitness",
    blurb: "Members, plans, fees, attendance",
    examples: ["Gym", "Fitness centre", "CrossFit", "Zumba", "Aerobics", "Weight training"],
    icon: Dumbbell, tint: "#FFE3D6", ink: "#C81322"
  },
  {
    key: "academy",
    title: "Sports Academy",
    blurb: "Students, batches, fees, attendance, progress",
    examples: ["Cricket", "Football", "Badminton", "Swimming", "Basketball", "Tennis", "Athletics", "Skating"],
    icon: Trophy, tint: "#E7E3FF", ink: "#5B4FD6"
  },
  {
    key: "studio",
    title: "Studio",
    blurb: "Members, classes, packages, attendance",
    examples: ["Dance", "Music", "Art", "Yoga", "Karate & martial arts"],
    icon: Music, tint: "#FCEFC0", ink: "#D38A10"
  },
  {
    key: "library",
    title: "Library & Study Room",
    blurb: "Seats, shifts, fees, attendance",
    examples: ["Study library", "Reading room", "Self-study hall"],
    icon: Library, tint: "#D9F2E6", ink: "#0F8F5F"
  }
];

export function getOnboardingSegment(key) {
  return ONBOARDING_SEGMENTS.find((s) => s.key === key) || null;
}
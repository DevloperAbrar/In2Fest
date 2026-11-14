import Hero from "./Hero.jsx";
import { makeTemplate } from "../shared/themed.jsx";

const ui = {
  accent: "#3b82f6", dark: true, glass: true,
  bgs: ["#0a0f2c", "#0d1438"], card: "rgba(255,255,255,0.06)", border: "rgba(255,255,255,0.12)",
  text: "#ffffff", muted: "rgba(255,255,255,0.62)",
  radius: "24px", btn: "999px", head: "'Sora', sans-serif", body: "'Inter', sans-serif",
  fonts: "https://fonts.googleapis.com/css2?family=Sora:wght@600;700;800&family=Inter:wght@300;400;500;600&display=swap",
  hw: 700, upper: false, align: "left", input: "box"
};

const T = makeTemplate({ Hero, ui, about: "split", services: "cards", gallery: "grid", testimonials: "cards" });

export const HeroSection = T.HeroSection;
export const AboutSection = T.AboutSection;
export const ServicesSection = T.ServicesSection;
export const GallerySection = T.GallerySection;
export const TestimonialsSection = T.TestimonialsSection;
export const ContactSection = T.ContactSection;
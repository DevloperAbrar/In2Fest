import Hero from "./Hero.jsx";
import { makeTemplate } from "../shared/themed.jsx";

const ui = {
  accent: "#22d3ee", dark: true,
  bgs: ["#05070d", "#080b14"], card: "rgba(255,255,255,0.035)", border: "rgba(255,255,255,0.09)",
  text: "#e8ecf5", muted: "rgba(232,236,245,0.55)",
  radius: "20px", btn: "12px", head: "'Manrope', sans-serif", body: "'Inter', sans-serif",
  fonts: "https://fonts.googleapis.com/css2?family=Manrope:wght@600;700;800&family=JetBrains+Mono:wght@400;500&family=Inter:wght@300;400;500;600&display=swap",
  hw: 800, upper: false, align: "left", input: "box"
};

const T = makeTemplate({ Hero, ui, about: "card", services: "bento", gallery: "grid", testimonials: "quote" });

export const HeroSection = T.HeroSection;
export const AboutSection = T.AboutSection;
export const ServicesSection = T.ServicesSection;
export const GallerySection = T.GallerySection;
export const TestimonialsSection = T.TestimonialsSection;
export const ContactSection = T.ContactSection;
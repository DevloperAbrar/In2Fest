import Hero from "./Hero.jsx";
import { makeTemplate } from "../shared/themed.jsx";

const ui = {
  accent: "#10b981", dark: false, shadow: "0 10px 40px rgba(0,0,0,0.06)",
  bgs: ["#ffffff", "#fff8ee"], card: "#ffffff", border: "rgba(0,0,0,0.07)",
  text: "#1c1917", muted: "#6b625c",
  radius: "28px", btn: "999px", head: "'Poppins', sans-serif", body: "'Poppins', sans-serif",
  fonts: "https://fonts.googleapis.com/css2?family=Poppins:wght@400;500;600;700&display=swap",
  hw: 700, upper: false, align: "center", input: "box"
};

const T = makeTemplate({ Hero, ui, about: "stack", services: "cards", gallery: "masonry", testimonials: "cards" });

export const HeroSection = T.HeroSection;
export const AboutSection = T.AboutSection;
export const ServicesSection = T.ServicesSection;
export const GallerySection = T.GallerySection;
export const TestimonialsSection = T.TestimonialsSection;
export const ContactSection = T.ContactSection;
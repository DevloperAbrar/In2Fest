import Hero from "./Hero.jsx";
import { makeTemplate } from "../shared/themed.jsx";

const ui = {
  accent: "#ef4444", dark: true,
  bgs: ["#0a0a0a", "#141414"], card: "#161616", border: "rgba(255,255,255,0.1)",
  text: "#ffffff", muted: "rgba(255,255,255,0.6)",
  radius: "0px", btn: "0px", head: "'Oswald', sans-serif", body: "'Inter', sans-serif",
  fonts: "https://fonts.googleapis.com/css2?family=Oswald:wght@500;600;700&family=Inter:wght@300;400;500;600&display=swap",
  hw: 700, upper: true, align: "left", input: "box"
};

const T = makeTemplate({ Hero, ui, about: "card", services: "blocks", gallery: "masonry", testimonials: "cards" });

export const HeroSection = T.HeroSection;
export const AboutSection = T.AboutSection;
export const ServicesSection = T.ServicesSection;
export const GallerySection = T.GallerySection;
export const TestimonialsSection = T.TestimonialsSection;
export const ContactSection = T.ContactSection;
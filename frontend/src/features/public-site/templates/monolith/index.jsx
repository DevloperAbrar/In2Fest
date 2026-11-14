import Hero from "./Hero.jsx";
import { makeTemplate } from "../shared/themed.jsx";

const ui = {
  accent: "#e8590c", dark: false, italic: true,
  bgs: ["#f4f1ea", "#ebe7de"], card: "transparent", border: "rgba(0,0,0,0.18)",
  text: "#111111", muted: "#5b574f",
  radius: "0px", btn: "0px", head: "'Instrument Serif', serif", body: "'Inter', sans-serif",
  fonts: "https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Inter:wght@300;400;500;600&display=swap",
  hw: 400, upper: false, align: "left", input: "underline"
};

const T = makeTemplate({ Hero, ui, about: "split", services: "rows", gallery: "strip", testimonials: "quote" });

export const HeroSection = T.HeroSection;
export const AboutSection = T.AboutSection;
export const ServicesSection = T.ServicesSection;
export const GallerySection = T.GallerySection;
export const TestimonialsSection = T.TestimonialsSection;
export const ContactSection = T.ContactSection;
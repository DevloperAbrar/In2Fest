import {
    Image, Info, Wrench, Images, Star, Phone,
    LayoutGrid, Package, ListChecks, HelpCircle,
    ShoppingBag, Users, PartyPopper
  } from "lucide-react";
  
  export const SECTION_TYPES = {
    hero: {
      label: "Hero Banner",
      description: "Main banner image, heading, subheading and call-to-action",
      icon: Image,
      color: "bg-purple-50 text-purple-600",
      removable: false,
      toggleable: false,
      editorRoute: "/dashboard/website/hero"
    },
    about: {
      label: "About",
      description: "Your business story and highlights",
      icon: Info,
      color: "bg-blue-50 text-blue-600",
      removable: false,
      toggleable: true,
      editorRoute: "/dashboard/website/about"
    },
    services: {
      label: "Services / Offerings",
      description: "A simple list of services or amenities with icons",
      icon: Wrench,
      color: "bg-green-50 text-green-600",
      removable: false,
      toggleable: true,
      editorRoute: "/dashboard/website/services"
    },
    gallery: {
      label: "Gallery",
      description: "Photo gallery of your work or venue",
      icon: Images,
      color: "bg-yellow-50 text-yellow-600",
      removable: false,
      toggleable: true,
      editorRoute: "/dashboard/website/gallery"
    },
    testimonials: {
      label: "Testimonials",
      description: "Client reviews and testimonials",
      icon: Star,
      color: "bg-orange-50 text-orange-600",
      removable: false,
      toggleable: true,
      editorRoute: "/dashboard/website/testimonials"
    },
    contact: {
      label: "Contact",
      description: "Contact details, address and enquiry form",
      icon: Phone,
      color: "bg-red-50 text-red-600",
      removable: false,
      toggleable: false,
      editorRoute: "/dashboard/website/contact"
    },
  
    portfolio: {
      label: "Portfolio",
      description: "Showcase your best work with style or category tags",
      icon: LayoutGrid,
      color: "bg-pink-50 text-pink-600",
      removable: true,
      toggleable: true,
      itemFields: ["image_url", "title", "tag"],
      defaultConfig: { title: "Our Portfolio", items: [] }
    },
    packages: {
      label: "Packages",
      description: "Tiered pricing packages with what's included",
      icon: Package,
      color: "bg-indigo-50 text-indigo-600",
      removable: true,
      toggleable: true,
      itemFields: ["title", "price", "description", "tag"],
      defaultConfig: { title: "Our Packages", items: [] }
    },
    process: {
      label: "How It Works",
      description: "A numbered, step-by-step walkthrough of your process",
      icon: ListChecks,
      color: "bg-teal-50 text-teal-600",
      removable: true,
      toggleable: true,
      itemFields: ["title", "description"],
      defaultConfig: { title: "How It Works", items: [] }
    },
    faq: {
      label: "FAQs",
      description: "Frequently asked questions from your clients",
      icon: HelpCircle,
      color: "bg-cyan-50 text-cyan-600",
      removable: true,
      toggleable: true,
      itemFields: ["title", "description"],
      defaultConfig: { title: "Frequently Asked Questions", items: [] }
    },
    product_catalog: {
      label: "Product Catalog",
      description: "Product cards with image, name and price",
      icon: ShoppingBag,
      color: "bg-lime-50 text-lime-600",
      removable: true,
      toggleable: true,
      itemFields: ["image_url", "title", "price", "description"],
      defaultConfig: { title: "Our Products", items: [] }
    },
    team: {
      label: "Team",
      description: "Team member cards with role and photo",
      icon: Users,
      color: "bg-violet-50 text-violet-600",
      removable: true,
      toggleable: true,
      itemFields: ["image_url", "title", "subtitle", "description"],
      defaultConfig: { title: "Meet the Team", items: [] }
    },
    occasions: {
      label: "Occasions We Cover",
      description: "Occasion type chips  - Wedding, Sangeet, Birthday...",
      icon: PartyPopper,
      color: "bg-rose-50 text-rose-600",
      removable: true,
      toggleable: true,
      itemFields: ["title"],
      defaultConfig: { title: "Occasions We Cover", items: [] }
    }
  };
  
  export const FIELD_LABELS = {
    image_url: "Image URL",
    title: "Title",
    subtitle: "Subtitle",
    description: "Description",
    price: "Price",
    tag: "Tag / Badge"
  };
  
  export function isCoreType(type) {
    return SECTION_TYPES[type] ? SECTION_TYPES[type].removable === false : false;
  }
  
  export function emptyItem() {
    return {
      id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      image_url: "",
      title: "",
      subtitle: "",
      description: "",
      price: "",
      tag: ""
    };
  }
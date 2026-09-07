import React from "react";
import { Search, GitCompare, MessageCircle } from "lucide-react";

const STEPS = [
  { number: "01", icon: Search, title: "Search your city", desc: "Tell us your city and what you're looking for." },
  { number: "02", icon: GitCompare, title: "Compare vendors", desc: "Browse verified profiles, prices and reviews." },
  { number: "03", icon: MessageCircle, title: "Contact and book directly", desc: "Reach out to vendors directly, no middleman." }
];

export default function HowItWorks() {
  return (
    <section className="bg-navy-900 py-16">
      <div className="max-w-6xl mx-auto px-4">
        <div className="text-center mb-10">
          <p className="text-xs font-semibold text-gold-400 tracking-wide uppercase mb-1">How it works</p>
          <h2 className="text-2xl font-display font-bold text-white">Three steps to your perfect vendor</h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {STEPS.map((s) => {
            const Icon = s.icon;
            return (
              <div key={s.title} className="relative bg-white/5 border border-white/10 rounded-2xl p-6 text-center">
                <span className="absolute -top-3 -left-3 text-3xl font-display font-bold text-white/10">{s.number}</span>
                <div className="w-12 h-12 rounded-full bg-primary-600 text-white flex items-center justify-center mx-auto mb-4">
                  <Icon size={22} />
                </div>
                <p className="font-semibold text-white">{s.title}</p>
                <p className="text-sm text-navy-100 mt-1.5">{s.desc}</p>
              </div>
            );
          })}
        </div>
      </div>
    </section>
  );
}
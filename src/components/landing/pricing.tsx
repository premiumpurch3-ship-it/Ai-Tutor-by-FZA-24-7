"use client";

import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Check } from "lucide-react";

const plans = [
  {
    name: "Free",
    price: "$0",
    tagline: "Try the core experience",
    features: ["30 AI messages / month", "3 documents", "5 quiz generations", "5 flashcard generations"],
  },
  {
    name: "Student",
    price: "$9.99",
    tagline: "For regular study",
    highlight: true,
    features: ["300 AI messages / month", "20 documents", "40 quiz generations", "Audio explanations"],
  },
  {
    name: "Pro",
    price: "$19.99",
    tagline: "For serious exam prep",
    features: ["1000 AI messages / month", "100 documents", "150 quiz + flashcard gens", "Advanced analytics"],
  },
];

export function PricingSection() {
  return (
    <section id="pricing" className="mx-auto max-w-6xl px-6 py-28">
      <motion.h2
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-100px" }}
        transition={{ duration: 0.5 }}
        className="text-center text-3xl font-semibold text-white sm:text-4xl"
      >
        Simple, transparent pricing
      </motion.h2>
      <p className="mx-auto mt-3 max-w-lg text-center text-white/50">Start free. Upgrade anytime as your usage grows.</p>

      <div className="mt-14 grid grid-cols-1 gap-6 md:grid-cols-3">
        {plans.map((plan, i) => (
          <motion.div
            key={plan.name}
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ duration: 0.4, delay: i * 0.08 }}
            className={`glass relative rounded-2xl p-7 ${plan.highlight ? "border-[var(--primary)]/50 glow" : ""}`}
          >
            {plan.highlight && (
              <span className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full bg-gradient-to-r from-[var(--primary)] to-[var(--primary-2)] px-3 py-1 text-xs font-medium text-white">
                Most popular
              </span>
            )}
            <h3 className="text-lg font-semibold text-white">{plan.name}</h3>
            <p className="text-sm text-white/50">{plan.tagline}</p>
            <div className="mt-4 text-4xl font-semibold text-white">
              {plan.price}
              <span className="text-base font-normal text-white/40">/mo</span>
            </div>
            <ul className="mt-6 space-y-3">
              {plan.features.map((f) => (
                <li key={f} className="flex items-center gap-2 text-sm text-white/70">
                  <Check size={16} className="text-[var(--accent)]" /> {f}
                </li>
              ))}
            </ul>
            <Button href="/signup" variant={plan.highlight ? "primary" : "secondary"} className="mt-7 w-full">
              Get started
            </Button>
          </motion.div>
        ))}
      </div>
    </section>
  );
}

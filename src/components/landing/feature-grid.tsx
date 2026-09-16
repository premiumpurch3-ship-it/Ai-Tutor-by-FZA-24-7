"use client";

import { motion } from "framer-motion";
import { Bot, FileText, Trophy, Shield, Gauge, Sparkles } from "lucide-react";

const features = [
  { icon: Bot, title: "RAG-grounded AI Tutor", desc: "Answers are retrieved from your own uploaded material first, so you get accurate, relevant explanations." },
  { icon: FileText, title: "Any document format", desc: "PDF, DOCX, or plain text — upload once, use it across lessons, quizzes, and flashcards." },
  { icon: Trophy, title: "Mock tests & scoring", desc: "Timed mock exams with server-verified scoring you can trust." },
  { icon: Gauge, title: "Real usage limits", desc: "Transparent AI usage tracking per plan, enforced server-side." },
  { icon: Shield, title: "Private by design", desc: "Row-level security means your documents and progress are visible to you alone." },
  { icon: Sparkles, title: "Adaptive study plans", desc: "AI builds a day-by-day plan around your exam date and available hours." },
];

export function FeatureGrid() {
  return (
    <section id="features" className="mx-auto max-w-7xl px-6 py-28">
      <motion.h2
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-100px" }}
        transition={{ duration: 0.5 }}
        className="text-center text-3xl font-semibold text-white sm:text-4xl"
      >
        Everything you need to actually learn
      </motion.h2>

      <div className="mt-14 grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {features.map((f, i) => (
          <motion.div
            key={f.title}
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-60px" }}
            transition={{ duration: 0.4, delay: (i % 3) * 0.08 }}
            whileHover={{ y: -6 }}
            className="glass group rounded-2xl p-6 transition-colors hover:border-[var(--primary)]/40"
          >
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/5 text-[var(--accent)] transition-colors group-hover:bg-[var(--primary)]/20">
              <f.icon size={20} />
            </div>
            <h3 className="mt-4 font-semibold text-white">{f.title}</h3>
            <p className="mt-1.5 text-sm text-white/55">{f.desc}</p>
          </motion.div>
        ))}
      </div>
    </section>
  );
}

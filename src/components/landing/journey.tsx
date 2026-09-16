"use client";

import { motion } from "framer-motion";
import { Upload, BrainCircuit, MessageCircleQuestion, BookOpen, ListChecks, Layers, CalendarClock, LineChart } from "lucide-react";

const steps = [
  { icon: Upload, title: "Upload study material", desc: "PDF, DOCX, or plain text — your notes, textbook chapters, or slides." },
  { icon: BrainCircuit, title: "AI understands it", desc: "Your material is processed and indexed so the tutor can reason over it." },
  { icon: MessageCircleQuestion, title: "Ask the AI Tutor", desc: "Chat with a tutor that answers using your own material, not generic guesses." },
  { icon: BookOpen, title: "Personalized lessons", desc: "Clear explanations, key concepts, and examples generated on demand." },
  { icon: ListChecks, title: "Quizzes", desc: "Auto-generated multiple choice quizzes with instant, explained scoring." },
  { icon: Layers, title: "Flashcards", desc: "Flip-card review with known/unknown tracking for spaced revision." },
  { icon: CalendarClock, title: "Study plan", desc: "A day-by-day plan built around your exam date and available time." },
  { icon: LineChart, title: "Progress analytics", desc: "Streaks, scores, and study time — all tracked automatically." },
];

export function JourneySection() {
  return (
    <section id="journey" className="mx-auto max-w-5xl px-6 py-28">
      <motion.h2
        initial={{ opacity: 0, y: 20 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-100px" }}
        transition={{ duration: 0.5 }}
        className="text-center text-3xl font-semibold text-white sm:text-4xl"
      >
        Your learning journey
      </motion.h2>
      <p className="mx-auto mt-3 max-w-xl text-center text-white/50">From raw material to mastery, in eight steps.</p>

      <div className="relative mt-16">
        <div className="absolute left-6 top-0 hidden h-full w-px bg-gradient-to-b from-[var(--primary)]/60 via-white/10 to-transparent sm:block" />
        <div className="space-y-10">
          {steps.map((step, i) => (
            <motion.div
              key={step.title}
              initial={{ opacity: 0, x: -24 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true, margin: "-80px" }}
              transition={{ duration: 0.45, delay: (i % 4) * 0.05 }}
              className="relative flex items-start gap-5 pl-0 sm:pl-16"
            >
              <div className="absolute left-0 hidden h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-[var(--primary)] to-[var(--primary-2)] text-white sm:flex">
                <step.icon size={20} />
              </div>
              <div className="glass w-full rounded-2xl p-5 sm:ml-2">
                <div className="mb-1 flex items-center gap-2 text-xs font-medium text-white/40">
                  Step {i + 1}
                </div>
                <h3 className="text-lg font-semibold text-white">{step.title}</h3>
                <p className="mt-1 text-sm text-white/55">{step.desc}</p>
              </div>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

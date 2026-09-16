"use client";

import { motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { ArrowRight } from "lucide-react";

export function FinalCta() {
  return (
    <section className="mx-auto max-w-5xl px-6 pb-28">
      <motion.div
        initial={{ opacity: 0, y: 24 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: "-100px" }}
        transition={{ duration: 0.5 }}
        className="glass glow relative overflow-hidden rounded-3xl px-8 py-16 text-center"
      >
        <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-[var(--primary)]/15 to-transparent" />
        <h2 className="relative text-3xl font-semibold text-white sm:text-4xl">
          Ready to study smarter?
        </h2>
        <p className="relative mx-auto mt-3 max-w-lg text-white/55">
          Upload your first document and get a personalized AI tutor in under a minute.
        </p>
        <div className="relative mt-8 flex justify-center">
          <Button href="/signup" size="lg">
            Start learning free <ArrowRight size={18} />
          </Button>
        </div>
      </motion.div>
    </section>
  );
}

"use client";

import { Button } from "@/components/ui/button";
import { GraduationCap } from "lucide-react";
import { motion } from "framer-motion";

export function LandingNav() {
  return (
    <motion.header
      initial={{ y: -40, opacity: 0 }}
      animate={{ y: 0, opacity: 1 }}
      transition={{ duration: 0.5 }}
      className="sticky top-0 z-50 border-b border-white/5 bg-[var(--background)]/70 backdrop-blur-xl"
    >
      <nav className="mx-auto flex max-w-7xl items-center justify-between px-6 py-4">
        <div className="flex items-center gap-2 font-semibold text-white">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-[var(--primary)] to-[var(--primary-2)]">
            <GraduationCap size={18} />
          </div>
          AI Tutor
        </div>
        <div className="hidden items-center gap-8 text-sm text-white/60 md:flex">
          <a href="#journey" className="hover:text-white transition-colors">How it works</a>
          <a href="#features" className="hover:text-white transition-colors">Features</a>
          <a href="#pricing" className="hover:text-white transition-colors">Pricing</a>
        </div>
        <div className="flex items-center gap-3">
          <Button href="/login" variant="ghost" size="sm">Log in</Button>
          <Button href="/signup" size="sm">Get started free</Button>
        </div>
      </nav>
    </motion.header>
  );
}

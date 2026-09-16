"use client";

import { Button } from "@/components/ui/button";
import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import { Sparkles, ArrowRight } from "lucide-react";
import { useEffect, useState, type MouseEvent } from "react";

function AnimatedCounter({ to, suffix = "" }: { to: number; suffix?: string }) {
  const [value, setValue] = useState(0);
  useEffect(() => {
    const duration = 1200;
    const start = performance.now();
    let raf: number;
    const tick = (now: number) => {
      const progress = Math.min((now - start) / duration, 1);
      setValue(Math.floor(progress * to));
      if (progress < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [to]);
  return (
    <span>
      {value.toLocaleString()}
      {suffix}
    </span>
  );
}

export function Hero() {
  const mx = useMotionValue(0);
  const my = useMotionValue(0);
  const rx = useSpring(useTransform(my, [-0.5, 0.5], [6, -6]), { stiffness: 120, damping: 20 });
  const ry = useSpring(useTransform(mx, [-0.5, 0.5], [-6, 6]), { stiffness: 120, damping: 20 });

  function onMouseMove(e: MouseEvent<HTMLDivElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    mx.set((e.clientX - rect.left) / rect.width - 0.5);
    my.set((e.clientY - rect.top) / rect.height - 0.5);
  }

  return (
    <section className="relative mx-auto flex max-w-7xl flex-col items-center px-6 pt-24 pb-32 text-center">
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="glass mb-6 inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-xs font-medium text-white/70"
      >
        <Sparkles size={14} className="text-[var(--accent)]" />
        Your study material, understood by AI
      </motion.div>

      <motion.h1
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.1 }}
        className="max-w-4xl text-5xl font-semibold leading-[1.08] tracking-tight text-white sm:text-7xl"
      >
        Turn any material into a <span className="gradient-text">personal AI tutor</span>
      </motion.h1>

      <motion.p
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.2 }}
        className="mt-6 max-w-2xl text-lg text-white/55"
      >
        Upload your notes, textbooks, or slides. AI Tutor builds lessons, quizzes, flashcards, and a
        study plan around exactly what you need to learn — and answers questions grounded in your own material.
      </motion.p>

      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.3 }}
        className="mt-9 flex flex-col gap-3 sm:flex-row"
      >
        <Button href="/signup" size="lg">
          Start learning free <ArrowRight size={18} />
        </Button>
        <Button href="#journey" variant="secondary" size="lg">
          See how it works
        </Button>
      </motion.div>

      <motion.div
        onMouseMove={onMouseMove}
        onMouseLeave={() => { mx.set(0); my.set(0); }}
        style={{ rotateX: rx, rotateY: ry, transformPerspective: 1000 }}
        initial={{ opacity: 0, y: 40 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.7, delay: 0.4 }}
        className="glass glow mt-20 w-full max-w-4xl rounded-3xl p-6"
      >
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
          {[
            { label: "Questions answered", value: 128400, suffix: "+" },
            { label: "Flashcards reviewed", value: 940200, suffix: "+" },
            { label: "Avg. quiz score lift", value: 34, suffix: "%" },
          ].map((stat) => (
            <div key={stat.label} className="rounded-2xl bg-white/5 p-5 text-left">
              <div className="text-3xl font-semibold text-white">
                <AnimatedCounter to={stat.value} suffix={stat.suffix} />
              </div>
              <div className="mt-1 text-xs text-white/50">{stat.label}</div>
            </div>
          ))}
        </div>
      </motion.div>
    </section>
  );
}

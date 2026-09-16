"use client";

import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Card, EmptyState } from "@/components/ui/primitives";
import { Button } from "@/components/ui/button";
import { Loader2, ThumbsUp, ThumbsDown, RotateCcw } from "lucide-react";
import { toast } from "sonner";
import type { Flashcard } from "@/types/database";

export function FlashcardReviewer({ deckId }: { deckId: string }) {
  const [loading, setLoading] = useState(true);
  const [deckTitle, setDeckTitle] = useState("");
  const [cards, setCards] = useState<Flashcard[]>([]);
  const [index, setIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [known, setKnown] = useState(0);
  const [unknown, setUnknown] = useState(0);
  const [finished, setFinished] = useState(false);

  useEffect(() => {
    (async () => {
      const res = await fetch(`/api/flashcards/deck/${deckId}`);
      const json = await res.json();
      if (!res.ok) {
        toast.error(json.error ?? "Could not load deck.");
        return;
      }
      setDeckTitle(json.deck.title);
      setCards(json.cards);
      setLoading(false);
    })();
  }, [deckId]);

  async function mark(result: "known" | "unknown") {
    const card = cards[index];
    if (result === "known") setKnown((k) => k + 1);
    else setUnknown((u) => u + 1);

    fetch("/api/flashcards/review", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ flashcardId: card.id, result }),
    }).catch(() => {});

    if (index + 1 >= cards.length) {
      setFinished(true);
    } else {
      setFlipped(false);
      setIndex((i) => i + 1);
    }
  }

  function restart() {
    setIndex(0);
    setFlipped(false);
    setKnown(0);
    setUnknown(0);
    setFinished(false);
  }

  if (loading) return <div className="flex h-64 items-center justify-center"><Loader2 className="animate-spin text-white/30" /></div>;
  if (cards.length === 0) return <Card><EmptyState title="This deck has no cards" /></Card>;

  if (finished) {
    return (
      <Card className="mx-auto max-w-md text-center">
        <h1 className="text-xl font-semibold text-white">{deckTitle} — Review complete</h1>
        <div className="mt-4 flex justify-center gap-6">
          <div>
            <p className="text-2xl font-semibold text-emerald-400">{known}</p>
            <p className="text-xs text-white/40">Known</p>
          </div>
          <div>
            <p className="text-2xl font-semibold text-red-400">{unknown}</p>
            <p className="text-xs text-white/40">Unknown</p>
          </div>
        </div>
        <Button className="mt-6" onClick={restart}><RotateCcw size={16} /> Review again</Button>
      </Card>
    );
  }

  const card = cards[index];

  return (
    <div className="mx-auto max-w-lg space-y-6">
      <div className="flex items-center justify-between text-sm text-white/50">
        <span>{deckTitle}</span>
        <span>{index + 1} / {cards.length}</span>
      </div>

      <div className="relative h-72 [perspective:1200px]" onClick={() => setFlipped((f) => !f)}>
        <AnimatePresence mode="wait">
          <motion.div
            key={card.id}
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.25 }}
            className="absolute inset-0 cursor-pointer [transform-style:preserve-3d]"
            style={{ transform: flipped ? "rotateY(180deg)" : "rotateY(0deg)", transition: "transform 0.5s" }}
          >
            <div className="glass glow absolute inset-0 flex items-center justify-center rounded-2xl p-8 text-center [backface-visibility:hidden]">
              <p className="text-lg font-medium text-white">{card.question}</p>
            </div>
            <div
              className="glass absolute inset-0 flex items-center justify-center rounded-2xl border-[var(--accent)]/30 p-8 text-center [backface-visibility:hidden]"
              style={{ transform: "rotateY(180deg)" }}
            >
              <p className="text-base text-white/80">{card.answer}</p>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>
      <p className="text-center text-xs text-white/30">Click the card to flip it</p>

      <div className="grid grid-cols-2 gap-3">
        <Button variant="secondary" onClick={() => mark("unknown")} className="bg-red-500/10 hover:bg-red-500/20">
          <ThumbsDown size={16} /> Still learning
        </Button>
        <Button variant="secondary" onClick={() => mark("known")} className="bg-emerald-500/10 hover:bg-emerald-500/20">
          <ThumbsUp size={16} /> Know it
        </Button>
      </div>
    </div>
  );
}

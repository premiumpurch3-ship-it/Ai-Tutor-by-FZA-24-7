"use client";

import { useState, useRef, useEffect } from "react";
import { Card, EmptyState } from "@/components/ui/primitives";
import { Button } from "@/components/ui/button";
import { Send, Plus, Trash2, Loader2, BookOpen } from "lucide-react";
import { toast } from "sonner";
import type { Conversation, Message } from "@/types/database";

interface Props {
  initialConversations: Conversation[];
  documents: { id: string; title: string }[];
  initialDocumentId?: string;
}

export function TutorChat({ initialConversations, documents, initialDocumentId }: Props) {
  const [conversations, setConversations] = useState(initialConversations);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [documentId, setDocumentId] = useState(initialDocumentId ?? "");
  const [loading, setLoading] = useState(false);
  const [loadingMessages, setLoadingMessages] = useState(false);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  async function loadConversation(id: string) {
    setActiveId(id);
    setLoadingMessages(true);
    try {
      const res = await fetch(`/api/conversations/${id}`);
      const json = await res.json();
      if (res.ok) setMessages(json.messages ?? []);
    } finally {
      setLoadingMessages(false);
    }
  }

  function startNew() {
    setActiveId(null);
    setMessages([]);
  }

  async function deleteConversation(id: string) {
    if (!confirm("Delete this conversation?")) return;
    await fetch(`/api/conversations/${id}`, { method: "DELETE" });
    setConversations((prev) => prev.filter((c) => c.id !== id));
    if (activeId === id) startNew();
  }

  async function sendMessage() {
    const text = input.trim();
    if (!text || loading) return;
    setInput("");
    setLoading(true);

    const optimisticUser: Message = {
      id: `temp-${Date.now()}`,
      conversation_id: activeId ?? "",
      user_id: "",
      role: "user",
      content: text,
      sources: [],
      created_at: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, optimisticUser]);

    try {
      const res = await fetch("/api/tutor/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conversationId: activeId ?? undefined, documentId: documentId || undefined, message: text }),
      });
      const json = await res.json();

      if (!res.ok) {
        toast.error(json.error ?? "The tutor couldn't respond.");
        setMessages((prev) => prev.filter((m) => m.id !== optimisticUser.id));
        return;
      }

      if (!activeId && json.conversationId) {
        setActiveId(json.conversationId);
        setConversations((prev) => [
          { id: json.conversationId, user_id: "", document_id: documentId || null, title: text.slice(0, 60), created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
          ...prev,
        ]);
      }

      setMessages((prev) => [...prev.filter((m) => m.id !== optimisticUser.id), json.userMessage, json.assistantMessage]);
    } catch {
      toast.error("Network error. Please try again.");
      setMessages((prev) => prev.filter((m) => m.id !== optimisticUser.id));
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid h-[calc(100vh-8.5rem)] grid-cols-1 gap-4 md:grid-cols-[260px_1fr]">
      <Card className="flex flex-col overflow-hidden p-3">
        <Button size="sm" onClick={startNew} className="w-full">
          <Plus size={16} /> New conversation
        </Button>
        <div className="mt-3 flex-1 space-y-1 overflow-y-auto">
          {conversations.length === 0 && <p className="px-2 py-4 text-center text-xs text-white/30">No conversations yet</p>}
          {conversations.map((c) => (
            <div
              key={c.id}
              className={`group flex items-center justify-between rounded-lg px-3 py-2 text-sm cursor-pointer ${
                activeId === c.id ? "bg-white/10 text-white" : "text-white/60 hover:bg-white/5"
              }`}
              onClick={() => loadConversation(c.id)}
            >
              <span className="truncate">{c.title}</span>
              <button onClick={(e) => { e.stopPropagation(); deleteConversation(c.id); }} className="opacity-0 group-hover:opacity-100 text-white/30 hover:text-red-400">
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>
      </Card>

      <Card className="flex flex-col overflow-hidden p-0">
        <div className="flex items-center gap-2 border-b border-white/5 px-4 py-3">
          <BookOpen size={16} className="text-white/40" />
          <select
            value={documentId}
            onChange={(e) => setDocumentId(e.target.value)}
            className="rounded-lg bg-white/5 border border-white/10 px-2 py-1 text-xs text-white outline-none"
          >
            <option value="">All documents</option>
            {documents.map((d) => (
              <option key={d.id} value={d.id}>{d.title}</option>
            ))}
          </select>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          {loadingMessages ? (
            <div className="flex h-full items-center justify-center"><Loader2 className="animate-spin text-white/30" /></div>
          ) : messages.length === 0 ? (
            <EmptyState title="Ask your AI Tutor anything" description="Answers are grounded in your uploaded documents when relevant." />
          ) : (
            <div className="space-y-4">
              {messages.map((m) => (
                <div key={m.id} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                  <div
                    className={`max-w-[80%] rounded-2xl px-4 py-2.5 text-sm ${
                      m.role === "user" ? "bg-gradient-to-r from-[var(--primary)] to-[var(--primary-2)] text-white" : "bg-white/5 text-white/85"
                    }`}
                  >
                    <p className="whitespace-pre-wrap">{m.content}</p>
                  </div>
                </div>
              ))}
              {loading && (
                <div className="flex justify-start">
                  <div className="rounded-2xl bg-white/5 px-4 py-2.5">
                    <Loader2 size={16} className="animate-spin text-white/40" />
                  </div>
                </div>
              )}
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        <div className="flex items-center gap-2 border-t border-white/5 p-3">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendMessage(); } }}
            placeholder="Ask a question about your material..."
            className="flex-1 rounded-xl bg-white/5 border border-white/10 px-4 py-2.5 text-sm text-white placeholder:text-white/30 outline-none focus:border-[var(--primary)]"
          />
          <Button size="sm" onClick={sendMessage} disabled={loading || !input.trim()}>
            <Send size={16} />
          </Button>
        </div>
      </Card>
    </div>
  );
}

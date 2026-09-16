"use client";

import { useEffect, useState } from "react";
import { Card, Badge, EmptyState } from "@/components/ui/primitives";
import { Loader2, Users, FileText, ListChecks, MessageCircle, AlertTriangle, ExternalLink } from "lucide-react";
import Link from "next/link";

interface Stats {
  totalUsers: number;
  newUsers30d: number;
  activeUsers: number;
  totalDocuments: number;
  totalQuizAttempts: number;
  totalConversations: number;
  planDistribution: Record<string, number>;
  recentErrors: { id: string; scope: string; message: string; created_at: string }[];
}

export function AdminStatsView() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const res = await fetch("/api/admin/stats");
      if (res.ok) setStats(await res.json());
      setLoading(false);
    })();
  }, []);

  if (loading) return <div className="flex h-64 items-center justify-center"><Loader2 className="animate-spin text-white/30" /></div>;
  if (!stats) return <EmptyState title="Could not load admin stats" />;

  const cards = [
    { label: "Total users", value: stats.totalUsers, icon: Users },
    { label: "New users (30d)", value: stats.newUsers30d, icon: Users },
    { label: "Active subscriptions", value: stats.activeUsers, icon: Users },
    { label: "Documents uploaded", value: stats.totalDocuments, icon: FileText },
    { label: "Quiz attempts", value: stats.totalQuizAttempts, icon: ListChecks },
    { label: "AI conversations", value: stats.totalConversations, icon: MessageCircle },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-semibold text-white">Admin overview</h1>
          <p className="text-sm text-white/50">Real-time platform statistics.</p>
        </div>
        <Link href="/admin/users" className="text-sm text-white/60 hover:text-white">Manage users →</Link>
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {cards.map((c) => (
          <Card key={c.label}>
            <div className="flex items-center justify-between">
              <p className="text-sm text-white/50">{c.label}</p>
              <c.icon size={18} className="text-white/30" />
            </div>
            <p className="mt-2 text-2xl font-semibold text-white">{c.value}</p>
          </Card>
        ))}
      </div>

      <Card>
        <h2 className="mb-3 font-semibold text-white">Plan distribution</h2>
        <div className="flex flex-wrap gap-2">
          {Object.entries(stats.planDistribution).map(([plan, count]) => (
            <Badge key={plan}>{plan}: {count}</Badge>
          ))}
        </div>
        <a
          href="https://dashboard.stripe.com/revenue"
          target="_blank"
          rel="noreferrer"
          className="mt-4 inline-flex items-center gap-1 text-xs text-white/40 hover:text-white/70"
        >
          Revenue reporting lives in the Stripe Dashboard <ExternalLink size={12} />
        </a>
      </Card>

      <Card>
        <h2 className="mb-3 flex items-center gap-2 font-semibold text-white"><AlertTriangle size={16} /> Recent system errors</h2>
        {stats.recentErrors && stats.recentErrors.length > 0 ? (
          <div className="space-y-2">
            {stats.recentErrors.map((e) => (
              <div key={e.id} className="rounded-xl bg-white/5 px-4 py-3">
                <div className="flex items-center justify-between text-xs text-white/40">
                  <span>{e.scope}</span>
                  <span>{new Date(e.created_at).toLocaleString()}</span>
                </div>
                <p className="mt-1 text-sm text-red-300">{e.message}</p>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-white/40">No recent errors logged.</p>
        )}
      </Card>
    </div>
  );
}

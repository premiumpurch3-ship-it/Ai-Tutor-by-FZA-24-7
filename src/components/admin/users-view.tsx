"use client";

import { useEffect, useState } from "react";
import { Card, Badge, Input, EmptyState } from "@/components/ui/primitives";
import { Button } from "@/components/ui/button";
import { Loader2, Search, Ban, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

interface AdminUser {
  id: string;
  email: string;
  full_name: string | null;
  role: string;
  is_suspended: boolean;
  created_at: string;
  subscriptions?: { plan_id: string; status: string }[];
}

export function AdminUsersView() {
  const [users, setUsers] = useState<AdminUser[]>([]);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  async function load(q?: string) {
    setLoading(true);
    const res = await fetch(`/api/admin/users${q ? `?q=${encodeURIComponent(q)}` : ""}`);
    const json = await res.json();
    if (res.ok) setUsers(json.users);
    setLoading(false);
  }

  useEffect(() => {
    (async () => {
      await load();
    })();
  }, []);

  async function toggleSuspend(user: AdminUser) {
    setUpdatingId(user.id);
    try {
      const res = await fetch(`/api/admin/users/${user.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isSuspended: !user.is_suspended }),
      });
      if (!res.ok) {
        const json = await res.json();
        toast.error(json.error ?? "Failed to update user.");
        return;
      }
      setUsers((prev) => prev.map((u) => (u.id === user.id ? { ...u, is_suspended: !u.is_suspended } : u)));
      toast.success(user.is_suspended ? "User reactivated." : "User suspended.");
    } finally {
      setUpdatingId(null);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-semibold text-white">Users</h1>
        <p className="text-sm text-white/50">Search, inspect, and manage user accounts.</p>
      </div>

      <Card>
        <div className="flex items-center gap-2">
          <Search size={16} className="text-white/30" />
          <Input
            placeholder="Search by name or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => { if (e.key === "Enter") load(search); }}
          />
          <Button size="sm" onClick={() => load(search)}>Search</Button>
        </div>
      </Card>

      {loading ? (
        <div className="flex h-40 items-center justify-center"><Loader2 className="animate-spin text-white/30" /></div>
      ) : users.length === 0 ? (
        <Card><EmptyState title="No users found" /></Card>
      ) : (
        <Card className="overflow-x-auto p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-white/5 text-left text-white/40">
                <th className="px-4 py-3 font-medium">Name</th>
                <th className="px-4 py-3 font-medium">Email</th>
                <th className="px-4 py-3 font-medium">Plan</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Joined</th>
                <th className="px-4 py-3 font-medium">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="border-b border-white/5">
                  <td className="px-4 py-3 text-white">{u.full_name || "—"}</td>
                  <td className="px-4 py-3 text-white/60">{u.email}</td>
                  <td className="px-4 py-3"><Badge>{u.subscriptions?.[0]?.plan_id ?? "free"}</Badge></td>
                  <td className="px-4 py-3">
                    <Badge tone={u.is_suspended ? "danger" : "success"}>{u.is_suspended ? "Suspended" : "Active"}</Badge>
                  </td>
                  <td className="px-4 py-3 text-white/40">{new Date(u.created_at).toLocaleDateString()}</td>
                  <td className="px-4 py-3">
                    <Button size="sm" variant={u.is_suspended ? "secondary" : "danger"} onClick={() => toggleSuspend(u)} disabled={updatingId === u.id}>
                      {u.is_suspended ? <CheckCircle2 size={14} /> : <Ban size={14} />}
                      {u.is_suspended ? "Reactivate" : "Suspend"}
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </div>
  );
}

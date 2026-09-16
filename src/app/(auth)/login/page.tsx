"use client";

import { useActionState } from "react";
import Link from "next/link";
import { loginAction, type ActionState } from "@/lib/actions/auth";
import { Input, Label } from "@/components/ui/primitives";
import { Button } from "@/components/ui/button";

export default function LoginPage() {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(loginAction, null);

  return (
    <div>
      <h1 className="text-2xl font-semibold text-white">Welcome back</h1>
      <p className="mt-1 text-sm text-white/50">Log in to continue studying.</p>

      <form action={formAction} className="mt-8 space-y-4">
        <div>
          <Label htmlFor="email">Email</Label>
          <Input id="email" name="email" type="email" required placeholder="you@example.com" />
        </div>
        <div>
          <div className="flex items-center justify-between">
            <Label htmlFor="password">Password</Label>
            <Link href="/forgot-password" className="text-xs text-white/40 hover:text-white/70">Forgot password?</Link>
          </div>
          <Input id="password" name="password" type="password" required placeholder="••••••••" />
        </div>

        {state?.error && <p className="text-sm text-red-400">{state.error}</p>}

        <Button type="submit" disabled={pending} className="w-full">
          {pending ? "Logging in..." : "Log in"}
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-white/40">
        Don&apos;t have an account? <Link href="/signup" className="text-white hover:underline">Sign up</Link>
      </p>
    </div>
  );
}

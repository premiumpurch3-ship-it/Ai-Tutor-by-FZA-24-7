"use client";

import { useActionState } from "react";
import Link from "next/link";
import { signUpAction, type ActionState } from "@/lib/actions/auth";
import { Input, Label } from "@/components/ui/primitives";
import { Button } from "@/components/ui/button";

export default function SignupPage() {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(signUpAction, null);

  return (
    <div>
      <h1 className="text-2xl font-semibold text-white">Create your account</h1>
      <p className="mt-1 text-sm text-white/50">Start learning with your own AI tutor, free.</p>

      <form action={formAction} className="mt-8 space-y-4">
        <div>
          <Label htmlFor="fullName">Full name</Label>
          <Input id="fullName" name="fullName" type="text" required placeholder="Jane Doe" />
        </div>
        <div>
          <Label htmlFor="email">Email</Label>
          <Input id="email" name="email" type="email" required placeholder="you@example.com" />
        </div>
        <div>
          <Label htmlFor="password">Password</Label>
          <Input id="password" name="password" type="password" required minLength={8} placeholder="At least 8 characters" />
        </div>

        {state?.error && <p className="text-sm text-red-400">{state.error}</p>}
        {state?.success && <p className="text-sm text-emerald-400">{state.success}</p>}

        <Button type="submit" disabled={pending} className="w-full">
          {pending ? "Creating account..." : "Create account"}
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-white/40">
        Already have an account? <Link href="/login" className="text-white hover:underline">Log in</Link>
      </p>
    </div>
  );
}

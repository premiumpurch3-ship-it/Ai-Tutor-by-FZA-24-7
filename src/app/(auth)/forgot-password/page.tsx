"use client";

import { useActionState } from "react";
import Link from "next/link";
import { forgotPasswordAction, type ActionState } from "@/lib/actions/auth";
import { Input, Label } from "@/components/ui/primitives";
import { Button } from "@/components/ui/button";

export default function ForgotPasswordPage() {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(forgotPasswordAction, null);

  return (
    <div>
      <h1 className="text-2xl font-semibold text-white">Reset your password</h1>
      <p className="mt-1 text-sm text-white/50">We&apos;ll email you a link to reset it.</p>

      <form action={formAction} className="mt-8 space-y-4">
        <div>
          <Label htmlFor="email">Email</Label>
          <Input id="email" name="email" type="email" required placeholder="you@example.com" />
        </div>

        {state?.error && <p className="text-sm text-red-400">{state.error}</p>}
        {state?.success && <p className="text-sm text-emerald-400">{state.success}</p>}

        <Button type="submit" disabled={pending} className="w-full">
          {pending ? "Sending..." : "Send reset link"}
        </Button>
      </form>

      <p className="mt-6 text-center text-sm text-white/40">
        <Link href="/login" className="text-white hover:underline">Back to login</Link>
      </p>
    </div>
  );
}

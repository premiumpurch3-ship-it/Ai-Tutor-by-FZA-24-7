"use client";

import { useActionState } from "react";
import { resetPasswordAction, type ActionState } from "@/lib/actions/auth";
import { Input, Label } from "@/components/ui/primitives";
import { Button } from "@/components/ui/button";

export default function ResetPasswordPage() {
  const [state, formAction, pending] = useActionState<ActionState, FormData>(resetPasswordAction, null);

  return (
    <div>
      <h1 className="text-2xl font-semibold text-white">Choose a new password</h1>
      <p className="mt-1 text-sm text-white/50">This link is only valid for a short time.</p>

      <form action={formAction} className="mt-8 space-y-4">
        <div>
          <Label htmlFor="password">New password</Label>
          <Input id="password" name="password" type="password" required minLength={8} placeholder="At least 8 characters" />
        </div>

        {state?.error && <p className="text-sm text-red-400">{state.error}</p>}

        <Button type="submit" disabled={pending} className="w-full">
          {pending ? "Updating..." : "Update password"}
        </Button>
      </form>
    </div>
  );
}

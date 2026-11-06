"use client";

import { useActionState } from "react";
import { loginAdmin } from "@/server/admin/auth-actions";

const inputClass = "h-10 w-full rounded-md border border-border bg-background px-3 text-[14px] outline-none focus-visible:ring-2 focus-visible:ring-ring";

export function LoginForm() {
  const [state, action, pending] = useActionState(loginAdmin, { error: "" });
  return (
    <form action={action} className="mt-6 space-y-4">
      <div className="space-y-1.5">
        <label htmlFor="email" className="text-[13px] font-medium">Email</label>
        <input id="email" name="email" autoComplete="username" type="email" required maxLength={254} className={inputClass} />
      </div>
      <div className="space-y-1.5">
        <label htmlFor="password" className="text-[13px] font-medium">Password</label>
        <input id="password" name="password" autoComplete="current-password" type="password" required className={inputClass}/>
      </div>
      {state.error ? <p role="alert" className="text-[13px] text-destructive">{state.error}</p> : null}
      <button disabled={pending} type="submit" className="min-h-10 w-full rounded-md bg-primary px-3 text-[14px] font-medium text-primary-foreground disabled:opacity-50">{pending ? "Signing in…" : "Sign in"}</button>
    </form>
  );
}

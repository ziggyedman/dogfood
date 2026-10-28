"use client";

import { useActionState } from "react";

export type FormState = string | { error: string } | null;

export default function SignupForm({ action }: { action: (state: FormState, formData: FormData) => Promise<FormState> }) {
  const [state, formAction, pending] = useActionState<FormState, FormData>(action, null);
  return (
    <form action={formAction}>
      <div className="row">
        <input type="email" name="email" placeholder="you@example.com" required autoFocus />
        <button type="submit" disabled={pending}>
          {pending ? "Sending…" : "Get my link"}
        </button>
      </div>
      {state !== null &&
        (typeof state === "string" ? (
          <p className="notice" style={{ color: "#15803d" }}>✓ {state}</p>
        ) : (
          <p className="notice error">✗ {state.error}</p>
        ))}
    </form>
  );
}

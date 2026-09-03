"use client";

import Link from "next/link";
import {
  FormEvent,
  Suspense,
  useState,
} from "react";
import { useSearchParams } from "next/navigation";
import { api } from "@/lib/api";

function InviteContent() {
  const token =
    useSearchParams().get("token") || "";

  const [message, setMessage] =
    useState("");
  const [error, setError] =
    useState("");
  const [busy, setBusy] =
    useState(false);

  async function submit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();
    setError("");

    const form = new FormData(
      event.currentTarget
    );

    const password = String(
      form.get("password") || ""
    );

    const confirmPassword = String(
      form.get("confirmPassword") || ""
    );

    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    setBusy(true);

    try {
      const result: any = await api(
        "/staff/accept-invite",
        {
          method: "POST",
          body: JSON.stringify({
            token,
            password,
          }),
        }
      );

      setMessage(result.message);
    } catch (err: any) {
      setError(
        err?.message ||
          "Unable to activate staff account"
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="auth-shell">
      <section className="auth-card">
        <p className="eyebrow">
          KK CLOSET STAFF
        </p>
        <h1>Create your password</h1>

        {error && (
          <div className="error-box">
            {error}
          </div>
        )}

        {message && (
          <div className="success-box">
            {message}
          </div>
        )}

        {!message && token && (
          <form
            className="form-stack"
            onSubmit={submit}
          >
            <label>
              Password
              <input
                name="password"
                type="password"
                minLength={8}
                required
              />
            </label>

            <label>
              Confirm password
              <input
                name="confirmPassword"
                type="password"
                minLength={8}
                required
              />
            </label>

            <button
              className="primary-button"
              disabled={busy}
            >
              {busy
                ? "Saving..."
                : "Create password"}
            </button>
          </form>
        )}

        {!token && (
          <div className="error-box">
            Invitation link is incomplete.
          </div>
        )}

        <p className="muted">
          <Link href="/login">
            Go to staff sign in
          </Link>
        </p>
      </section>
    </main>
  );
}

export default function StaffInvitePage() {
  return (
    <Suspense fallback={null}>
      <InviteContent />
    </Suspense>
  );
}

"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { api } from "@/lib/api";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    setBusy(true);
    setError("");
    setMessage("");

    try {
      const response: any = await api(
        "/auth/forgot-password",
        {
          method: "POST",
          body: JSON.stringify({
            email: email.trim().toLowerCase(),
          }),
        }
      );

      setMessage(
        response?.message ||
          "If an account exists for that email, a password reset link has been sent."
      );
    } catch (err: any) {
      setError(
        err?.message ||
          "Unable to request a password reset. Please try again."
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="auth-shell">
      <div className="auth-card">
        <p className="eyebrow">
          ACCOUNT RECOVERY
        </p>

        <h1>Forgot password?</h1>

        <p className="muted">
          Enter your email address and we'll send you a secure
          password reset link.
        </p>

        {message && (
          <div
            style={{
              marginTop: "18px",
              marginBottom: "18px",
              padding: "16px",
              border: "1px solid #d7c9b5",
              borderRadius: "10px",
              background: "#f8f5ef",
              lineHeight: 1.6,
            }}
          >
            {message}
          </div>
        )}

        {error && (
          <div className="error-box">
            {error}
          </div>
        )}

        <form
          className="form-stack"
          onSubmit={submit}
        >
          <label>
            Email
            <input
              type="email"
              value={email}
              onChange={(event) =>
                setEmail(event.target.value)
              }
              autoComplete="email"
              required
            />
          </label>

          <button
            className="primary-button"
            disabled={busy}
          >
            {busy
              ? "Sending..."
              : "Send reset link"}
          </button>
        </form>

        <p className="muted mt-5">
          Remembered your password?{" "}
          <Link
            href="/login"
            className="gold"
          >
            Sign in
          </Link>
        </p>
      </div>
    </main>
  );
}
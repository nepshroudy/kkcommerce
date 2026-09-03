"use client";

import Link from "next/link";
import {
  FormEvent,
  Suspense,
  useState,
} from "react";
import { useSearchParams } from "next/navigation";
import { api } from "@/lib/api";

function ResetPasswordContent() {
  const searchParams = useSearchParams();

  const token =
    searchParams.get("token") || "";

  const [password, setPassword] =
    useState("");

  const [confirmPassword, setConfirmPassword] =
    useState("");

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
    setMessage("");

    if (!token) {
      setError(
        "This password reset link is invalid."
      );
      return;
    }

    if (password.length < 8) {
      setError(
        "Password must be at least 8 characters."
      );
      return;
    }

    if (password !== confirmPassword) {
      setError(
        "Passwords do not match."
      );
      return;
    }

    setBusy(true);

    try {
      const response: any = await api(
        "/auth/reset-password",
        {
          method: "POST",
          body: JSON.stringify({
            token,
            password,
          }),
        }
      );

      setMessage(
        response?.message ||
          "Your password has been reset successfully."
      );

      setPassword("");
      setConfirmPassword("");
    } catch (err: any) {
      setError(
        err?.message ||
          "Unable to reset your password."
      );
    } finally {
      setBusy(false);
    }
  }

  if (!token) {
    return (
      <main className="auth-shell">
        <div className="auth-card">
          <p className="eyebrow">
            PASSWORD RESET
          </p>

          <h1>Invalid reset link</h1>

          <p className="muted">
            This password reset link is missing or invalid.
          </p>

          <Link
            href="/forgot-password"
            className="primary-button"
            style={{
              display: "block",
              textAlign: "center",
              textDecoration: "none",
            }}
          >
            Request a new reset link
          </Link>
        </div>
      </main>
    );
  }

  if (message) {
    return (
      <main className="auth-shell">
        <div className="auth-card">
          <p className="eyebrow">
            PASSWORD UPDATED
          </p>

          <h1>Password reset</h1>

          <div
            style={{
              marginTop: "18px",
              marginBottom: "20px",
              padding: "16px",
              border: "1px solid #d7c9b5",
              borderRadius: "10px",
              background: "#f8f5ef",
              lineHeight: 1.6,
            }}
          >
            {message}
          </div>

          <Link
            href="/login"
            className="primary-button"
            style={{
              display: "block",
              textAlign: "center",
              textDecoration: "none",
            }}
          >
            Sign in
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="auth-shell">
      <div className="auth-card">
        <p className="eyebrow">
          PASSWORD RESET
        </p>

        <h1>Create a new password</h1>

        <p className="muted">
          Choose a new password for your KK Closet account.
        </p>

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
            New password
            <input
              type="password"
              value={password}
              onChange={(event) =>
                setPassword(
                  event.target.value
                )
              }
              minLength={8}
              autoComplete="new-password"
              required
            />
          </label>

          <label>
            Confirm new password
            <input
              type="password"
              value={confirmPassword}
              onChange={(event) =>
                setConfirmPassword(
                  event.target.value
                )
              }
              minLength={8}
              autoComplete="new-password"
              required
            />
          </label>

          <button
            className="primary-button"
            disabled={busy}
          >
            {busy
              ? "Resetting..."
              : "Reset password"}
          </button>
        </form>
      </div>
    </main>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <main className="auth-shell">
          <div className="auth-card">
            <p className="muted">
              Loading...
            </p>
          </div>
        </main>
      }
    >
      <ResetPasswordContent />
    </Suspense>
  );
}
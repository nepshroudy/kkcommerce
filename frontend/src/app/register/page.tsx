"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { api } from "@/lib/api";

export default function RegisterPage() {
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [registeredEmail, setRegisteredEmail] = useState("");
  const [busy, setBusy] = useState(false);
  const [resending, setResending] = useState(false);
  const [resendMessage, setResendMessage] = useState("");

  async function submit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();

    const form = e.currentTarget;
    const formData = new FormData(form);

    const name = String(formData.get("name") || "").trim();
    const email = String(formData.get("email") || "")
      .trim()
      .toLowerCase();
    const password = String(formData.get("password") || "");
    const confirmPassword = String(
      formData.get("confirmPassword") || ""
    );

    setError("");
    setSuccess("");
    setResendMessage("");

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setBusy(true);

    try {
      const response: any = await api("/auth/register", {
        method: "POST",
        body: JSON.stringify({
          name,
          email,
          password,
        }),
      });

      setRegisteredEmail(email);

      setSuccess(
        response?.message ||
          "Account created. Please check your email and verify your account before signing in."
      );

      form.reset();
    } catch (err: any) {
      setError(
        err?.message ||
          "We couldn't create your account. Please try again."
      );
    } finally {
      setBusy(false);
    }
  }

  async function resendVerification() {
    if (!registeredEmail) return;

    setResending(true);
    setResendMessage("");
    setError("");

    try {
      const response: any = await api(
        "/auth/resend-verification",
        {
          method: "POST",
          body: JSON.stringify({
            email: registeredEmail,
          }),
        }
      );

      setResendMessage(
        response?.message ||
          "If the account is awaiting verification, a new email has been sent."
      );
    } catch (err: any) {
      setError(
        err?.message ||
          "We couldn't resend the verification email."
      );
    } finally {
      setResending(false);
    }
  }

  if (success) {
    return (
      <main className="auth-shell">
        <div className="auth-card">
          <p className="eyebrow">WELCOME TO KK CLOSET</p>

          <h1>Check your email</h1>

          <div
            style={{
              marginTop: "20px",
              marginBottom: "20px",
              padding: "18px",
              border: "1px solid #e4dbcf",
              borderRadius: "12px",
              background: "#f8f5ef",
              lineHeight: 1.65,
            }}
          >
            <p style={{ marginTop: 0 }}>
              Your KK Closet account has been created successfully.
            </p>

            <p>
              We sent a verification link to:
            </p>

            <p
              style={{
                fontWeight: 600,
                wordBreak: "break-word",
              }}
            >
              {registeredEmail}
            </p>

            <p style={{ marginBottom: 0 }}>
              Please verify your email before signing in.
            </p>
          </div>

          {resendMessage && (
            <div
              style={{
                marginBottom: "18px",
                padding: "14px",
                border: "1px solid #d7c9b5",
                borderRadius: "10px",
              }}
            >
              {resendMessage}
            </div>
          )}

          {error && (
            <div className="error-box">
              {error}
            </div>
          )}

          <button
            type="button"
            className="primary-button"
            onClick={resendVerification}
            disabled={resending}
            style={{
              width: "100%",
              marginBottom: "14px",
            }}
          >
            {resending
              ? "Sending..."
              : "Resend verification email"}
          </button>

          <p className="muted">
            Already verified?{" "}
            <Link className="gold" href="/login">
              Sign in
            </Link>
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="auth-shell">
      <div className="auth-card">
        <p className="eyebrow">JOIN KK CLOSET</p>

        <h1>Create account</h1>

        <p className="muted">
          Create your account to manage orders, save favourites
          and enjoy a faster checkout.
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
            Name
            <input
              name="name"
              autoComplete="name"
              required
            />
          </label>

          <label>
            Email
            <input
              name="email"
              type="email"
              autoComplete="email"
              required
            />
          </label>

          <label>
            Password
            <input
              name="password"
              type="password"
              minLength={8}
              autoComplete="new-password"
              required
            />
          </label>

          <label>
            Confirm password
            <input
              name="confirmPassword"
              type="password"
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
              ? "Creating account..."
              : "Create account"}
          </button>
        </form>

        <p className="muted mt-5">
          Already registered?{" "}
          <Link className="gold" href="/login">
            Sign in
          </Link>
        </p>
      </div>
    </main>
  );
}
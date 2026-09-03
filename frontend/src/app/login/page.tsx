"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";

import { api } from "@/lib/api";
import { saveSession } from "@/lib/auth";

export default function LoginPage() {
  const router = useRouter();

  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const [verificationRequired, setVerificationRequired] =
    useState(false);

  const [unverifiedEmail, setUnverifiedEmail] =
    useState("");

  const [resending, setResending] =
    useState(false);

  const [resendMessage, setResendMessage] =
    useState("");

  function isAdminHost() {
    if (typeof window === "undefined") {
      return false;
    }

    return (
      window.location.hostname === "admin.kkcloset.uk"
    );
  }

  async function submit(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();

    setBusy(true);
    setError("");
    setVerificationRequired(false);
    setResendMessage("");

    const formData = new FormData(
      event.currentTarget
    );

    const email = String(
      formData.get("email") || ""
    )
      .trim()
      .toLowerCase();

    const password = String(
      formData.get("password") || ""
    );

    try {
      const response: any = await api(
        "/auth/login",
        {
          method: "POST",
          body: JSON.stringify({
            email,
            password,
          }),
        }
      );

      const role = String(
        response?.user?.role || ""
      ).toUpperCase();

      const adminRole =
        role === "ADMIN" ||
        role === "SUPERADMIN";

      if (isAdminHost() && !adminRole) {
        setError(
          "This login page is for KK Closet administration only."
        );
        return;
      }

      saveSession(
        response.token,
        response.user
      );

      if (adminRole) {
        if (!isAdminHost()) {
          window.location.assign(
            "https://admin.kkcloset.uk/admin"
          );
          return;
        }

        router.replace("/admin");
        return;
      }

      router.replace("/account");
    } catch (err: any) {
      const message =
        err?.message ||
        "Unable to sign in.";

      const code =
        err?.code ||
        err?.data?.code ||
        err?.response?.code;

      if (
        code === "EMAIL_NOT_VERIFIED" ||
        message
          .toLowerCase()
          .includes("verify your email")
      ) {
        setUnverifiedEmail(email);
        setVerificationRequired(true);

        setError(
          "Your email address has not been verified yet."
        );

        return;
      }

      setError(message);
    } finally {
      setBusy(false);
    }
  }

  async function resendVerification() {
    if (!unverifiedEmail) {
      return;
    }

    setResending(true);
    setResendMessage("");
    setError("");

    try {
      const response: any = await api(
        "/auth/resend-verification",
        {
          method: "POST",
          body: JSON.stringify({
            email: unverifiedEmail,
          }),
        }
      );

      setResendMessage(
        response?.message ||
          "If the account is awaiting verification, a new verification email has been sent."
      );
    } catch (err: any) {
      setError(
        err?.message ||
          "Unable to resend the verification email."
      );
    } finally {
      setResending(false);
    }
  }

  if (verificationRequired) {
    return (
      <main className="auth-shell">
        <div className="auth-card">
          <p className="eyebrow">
            EMAIL VERIFICATION
          </p>

          <h1>Verify your email</h1>

          <div
            style={{
              marginTop: "20px",
              marginBottom: "20px",
              padding: "18px",
              border:
                "1px solid #e4dbcf",
              borderRadius: "12px",
              background: "#f8f5ef",
              lineHeight: 1.65,
            }}
          >
            <p style={{ marginTop: 0 }}>
              Your KK Closet account exists,
              but your email has not been
              verified yet.
            </p>

            <p>
              Verification email:
            </p>

            <p
              style={{
                fontWeight: 600,
                wordBreak:
                  "break-word",
              }}
            >
              {unverifiedEmail}
            </p>

            <p
              style={{
                marginBottom: 0,
              }}
            >
              Please open the verification
              link before signing in.
            </p>
          </div>

          {resendMessage && (
            <div
              style={{
                marginBottom: "18px",
                padding: "14px",
                border:
                  "1px solid #d7c9b5",
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
            onClick={
              resendVerification
            }
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

          <button
            type="button"
            onClick={() => {
              setVerificationRequired(
                false
              );
              setError("");
              setResendMessage("");
            }}
            style={{
              width: "100%",
              border: "none",
              background:
                "transparent",
              cursor: "pointer",
              padding: "10px",
              textDecoration:
                "underline",
            }}
          >
            Back to sign in
          </button>
        </div>
      </main>
    );
  }

  return (
    <main className="auth-shell">
      <div className="auth-card">
        <p className="eyebrow">
          {isAdminHost()
            ? "KK CLOSET ADMIN"
            : "WELCOME BACK"}
        </p>

        <h1>Sign in</h1>

        <p className="muted">
          {isAdminHost()
            ? "Authorised staff access only."
            : "Sign in to manage your account and orders."}
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
              autoComplete="current-password"
              required
            />
          </label>

          {!isAdminHost() && (
  <div
    style={{
      textAlign: "right",
      marginTop: "-6px",
      marginBottom: "6px",
    }}
  >
    <Link
      href="/forgot-password"
      className="gold"
      style={{
        fontSize: "14px",
      }}
    >
      Forgot password?
    </Link>
  </div>
)}

          <button
            className="primary-button"
            disabled={busy}
          >
            {busy
              ? "Signing in..."
              : "Sign in"}
          </button>
        </form>

        {!isAdminHost() && (
          <p className="muted mt-5">
            New to KK Closet?{" "}
            <Link
              className="gold"
              href="/register"
            >
              Create account
            </Link>
          </p>
        )}
      </div>
    </main>
  );
}
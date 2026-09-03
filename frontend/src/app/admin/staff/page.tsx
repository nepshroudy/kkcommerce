"use client";

import "./staff.css";

import {
  FormEvent,
  useEffect,
  useState,
} from "react";
import { api } from "@/lib/api";

type StaffUser = {
  id: number;
  name: string;
  email: string;
  role: "ADMIN" | "EMPLOYEE";
  active: boolean;
  staffInviteAcceptedAt?: string | null;
};

export default function StaffPage() {
  const [staff, setStaff] =
    useState<StaffUser[]>([]);
  const [error, setError] = useState("");
  const [message, setMessage] =
    useState("");
  const [busy, setBusy] =
    useState(false);

  async function load() {
    try {
      const result = await api<StaffUser[]>(
        "/staff",
        { authenticated: true }
      );
      setStaff(result);
    } catch (err: any) {
      setError(
        err?.message ||
          "Unable to load staff"
      );
    }
  }

  useEffect(() => {
    load();
  }, []);

  async function create(
    event: FormEvent<HTMLFormElement>
  ) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setMessage("");

    const form = new FormData(
      event.currentTarget
    );

    try {
      await api("/staff", {
        method: "POST",
        authenticated: true,
        body: JSON.stringify({
          name: form.get("name"),
          email: form.get("email"),
          role: form.get("role"),
        }),
      });

      event.currentTarget.reset();
      setMessage(
        "Staff account created. Invitation email will be sent when email delivery is available."
      );
      await load();
    } catch (err: any) {
      setError(err?.message || "Unable to create staff");
    } finally {
      setBusy(false);
    }
  }

  async function setRole(
    user: StaffUser,
    role: "ADMIN" | "EMPLOYEE"
  ) {
    setError("");
    setMessage("");

    try {
      await api(`/staff/${user.id}`, {
        method: "PATCH",
        authenticated: true,
        body: JSON.stringify({ role }),
      });

      setMessage(
        `${user.name}'s access changed to ${role}.`
      );
      await load();
    } catch (err: any) {
      setError(err?.message || "Unable to change role");
    }
  }

  async function revoke(user: StaffUser) {
    if (
      !confirm(
        `Remove ${user.name}'s staff access?`
      )
    ) {
      return;
    }

    try {
      await api(`/staff/${user.id}/revoke`, {
        method: "POST",
        authenticated: true,
      });

      setMessage(
        `${user.name}'s staff access has been removed.`
      );
      await load();
    } catch (err: any) {
      setError(err?.message || "Unable to remove access");
    }
  }

  async function convertToCustomer(
    user: StaffUser
  ) {
    if (
      !confirm(
        `Convert ${user.name} from staff to a CUSTOMER account? They will lose all admin access.`
      )
    ) {
      return;
    }

    try {
      await api(
        `/staff/${user.id}/convert-to-customer`,
        {
          method: "POST",
          authenticated: true,
        }
      );

      setMessage(
        `${user.name} is now a customer account.`
      );
      await load();
    } catch (err: any) {
      setError(
        err?.message ||
          "Unable to convert staff to customer"
      );
    }
  }

  async function reactivate(user: StaffUser) {
    try {
      await api(`/staff/${user.id}`, {
        method: "PATCH",
        authenticated: true,
        body: JSON.stringify({
          active: true,
        }),
      });

      setMessage(
        `${user.name}'s staff access has been restored.`
      );
      await load();
    } catch (err: any) {
      setError(err?.message || "Unable to restore access");
    }
  }

  async function resendInvite(user: StaffUser) {
    try {
      const result: any = await api(
        `/staff/${user.id}/resend-invite`,
        {
          method: "POST",
          authenticated: true,
        }
      );

      setMessage(
        result?.message ||
          "Invitation resent."
      );
    } catch (err: any) {
      setError(
        err?.message ||
          "Unable to resend invitation"
      );
    }
  }

  return (
    <section className="kk-staff-page">
      <div className="admin-page-heading">
        <div>
          <p className="eyebrow">
            SUPERADMIN ONLY
          </p>
          <h1>Employees & Admins</h1>
          <p className="muted">
            Superadmin accounts are never
            displayed in this directory.
          </p>
        </div>
      </div>

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

      <div className="admin-card kk-staff-create-card">
        <h2>Create staff account</h2>

        <form
          className="kk-staff-create-form"
          onSubmit={create}
        >
          <label>
            Name
            <input name="name" required />
          </label>

          <label>
            Email
            <input
              name="email"
              type="email"
              required
            />
          </label>

          <label>
            Access
            <select
              name="role"
              defaultValue="EMPLOYEE"
            >
              <option value="EMPLOYEE">
                Employee â€” Products + Orders
              </option>
              <option value="ADMIN">
                Administrator
              </option>
            </select>
          </label>

          <button
            className="primary-button"
            disabled={busy}
          >
            {busy
              ? "Creating..."
              : "Create & invite"}
          </button>
        </form>
      </div>

      <div className="admin-card table-wrap">
        <table>
          <thead>
            <tr>
              <th>Name</th>
              <th>Email</th>
              <th>Access</th>
              <th>Invite</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>

          <tbody>
            {staff.map((user) => (
              <tr key={user.id}>
                <td>{user.name}</td>
                <td>{user.email}</td>

                <td>
                  <select
                    value={user.role}
                    onChange={(event) =>
                      setRole(
                        user,
                        event.target.value as
                          | "ADMIN"
                          | "EMPLOYEE"
                      )
                    }
                  >
                    <option value="EMPLOYEE">
                      Employee
                    </option>
                    <option value="ADMIN">
                      Administrator
                    </option>
                  </select>
                </td>

                <td>
                  {user.staffInviteAcceptedAt
                    ? "Accepted"
                    : "Pending"}
                </td>

                <td>
                  {user.active
                    ? "Active"
                    : "Access removed"}
                </td>

                <td>
                  <div className="kk-staff-actions">
                    {!user.active ? (
                      <button
                        className="secondary-button"
                        onClick={() =>
                          reactivate(user)
                        }
                      >
                        Restore access
                      </button>
                    ) : (
                      <button
                        className="secondary-button"
                        onClick={() =>
                          revoke(user)
                        }
                      >
                        Remove access
                      </button>
                    )}

                    {!user.staffInviteAcceptedAt && (
                      <button
                        className="secondary-button"
                        onClick={() =>
                          resendInvite(user)
                        }
                      >
                        Resend invite
                      </button>
                    )}

                    <button
                      className="secondary-button"
                      onClick={() =>
                        convertToCustomer(user)
                      }
                    >
                      Make customer
                    </button>
                  </div>
                </td>
              </tr>
            ))}

            {!staff.length && !error && (
              <tr>
                <td colSpan={6}>
                  No Admin or Employee
                  accounts yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </section>
  );
}


"use client";

import { useState } from "react";
import { api } from "@/lib/api";
import "./postcode-address.css";

export type CheckoutAddress = {
  house: string;
  street: string;
  line2: string;
  city: string;
  county: string;
  postcode: string;
};

type LookupResult = {
  postcode: string;
  city?: string;
  county?: string;
};

export const emptyAddress: CheckoutAddress = {
  house: "",
  street: "",
  line2: "",
  city: "",
  county: "",
  postcode: "",
};

export default function PostcodeAddressLookup({
  value,
  onChange,
}: {
  value: CheckoutAddress;
  onChange: (address: CheckoutAddress) => void;
}) {
  const [postcode, setPostcode] = useState(value.postcode || "");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [manual, setManual] = useState(false);

  function update(key: keyof CheckoutAddress, next: string) {
    onChange({ ...value, [key]: next });
  }

  async function lookup() {
    setLoading(true);
    setMessage("");
    setError("");

    try {
      const result = await api<LookupResult>(
        `/address/postcode?postcode=${encodeURIComponent(postcode)}`
      );

      const normalized = result.postcode || postcode;
      setPostcode(normalized);

      onChange({
        ...value,
        postcode: normalized,
        city: value.city || result.city || "",
        county: value.county || result.county || "",
      });

      setMessage(
        "Postcode found. Please enter your house number/name and street."
      );
    } catch (err: any) {
      setError(
        err?.message ||
          "Postcode lookup failed. You can enter your address manually."
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="postcode-address">
      {!manual && (
        <>
          <div className="postcode-address-row">
            <label>
              <span>Postcode</span>
              <input
                value={postcode}
                onChange={(e) => setPostcode(e.target.value.toUpperCase())}
                placeholder="e.g. B91 3XX"
                autoComplete="postal-code"
              />
            </label>

            <button
              type="button"
              className="postcode-find-button"
              onClick={lookup}
              disabled={loading || !postcode.trim()}
            >
              {loading ? "Checking..." : "Find postcode"}
            </button>
          </div>

          {message && (
            <div className="postcode-address-success">{message}</div>
          )}

          {error && (
            <div className="postcode-address-error">{error}</div>
          )}
        </>
      )}

      <button
        type="button"
        className="postcode-manual-toggle"
        onClick={() => {
          setManual(!manual);
          setError("");
          setMessage("");
        }}
      >
        {manual ? "← Use postcode lookup" : "Enter address manually"}
      </button>

      <div className="postcode-manual-fields">
        <label>
          <span>House number / name</span>
          <input
            value={value.house}
            onChange={(e) => update("house", e.target.value)}
            placeholder="e.g. 24 or Rose Cottage"
            required
          />
        </label>

        <label>
          <span>Street</span>
          <input
            value={value.street}
            onChange={(e) => update("street", e.target.value)}
            placeholder="Street name"
            required
          />
        </label>

        <label>
          <span>Address line 2</span>
          <input
            value={value.line2}
            onChange={(e) => update("line2", e.target.value)}
            placeholder="Apartment, building, area (optional)"
          />
        </label>

        <div className="postcode-manual-grid">
          <label>
            <span>Town / City</span>
            <input
              value={value.city}
              onChange={(e) => update("city", e.target.value)}
              required
            />
          </label>

          <label>
            <span>County</span>
            <input
              value={value.county}
              onChange={(e) => update("county", e.target.value)}
            />
          </label>
        </div>

        <label>
          <span>Postcode</span>
          <input
            value={value.postcode}
            onChange={(e) => {
              const next = e.target.value.toUpperCase();
              update("postcode", next);
              setPostcode(next);
            }}
            required
          />
        </label>
      </div>
    </div>
  );
}

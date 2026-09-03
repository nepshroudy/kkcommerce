import "./globals.css";
import "./phase2bcd.css";
import "./phase3ab.css";
import "./storefront-luxury-theme.css";
import "./header-merchandising.css";
import "./checkout-theme.css";
import "./admin-luxury-theme.css";
import "./luxury-light-final.css";
import "./storefront-bugfixes.css";
import "./admin-price-fixes.css";
import "./colour-image-admin.css";
import "./product-detail-layout-fix.css";
import "./gallery-swipe-colour.css";

import { headers } from "next/headers";

import Header from "@/components/Header";
import StoreProvider from "@/components/store/StoreProvider";

export const metadata = {
  title: "KKCloset | Contemporary Fashion for Everyday Confidence",
  description:
    "Discover curated women's fashion, new arrivals, timeless essentials, and premium contemporary style at KKCloset.",
};

export default async function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const requestHeaders = await headers();

  const hostname =
    requestHeaders.get("host")?.split(":")[0].toLowerCase() || "";

  const isAdminHost = hostname === "admin.kkcloset.uk";

  return (
    <html lang="en">
      <body>
        <StoreProvider>
          {!isAdminHost && <Header />}

          {children}

          {!isAdminHost && (
            <footer className="kk-site-footer">
  <div className="kk-site-footer-inner">
    <strong>KK CLOSET</strong>

    <p>Contemporary fashion curated for everyday confidence.</p>

    <div className="kk-footer-legal">
      <div className="kk-footer-copyright">
        © 2026 KK Closet — All rights reserved.
      </div>

      <div className="kk-footer-company">
        KK Closet is the trading name for Taste of Nepal Ltd.
      </div>

      <div className="kk-footer-designer">
        Designed with love by{" "}
        <a
          href="https://mukundapoudel.com.np/"
          target="_blank"
          rel="noopener noreferrer"
        >
          Muks
        </a>
      </div>
    </div>
  </div>
</footer>
          )}
        </StoreProvider>
      </body>
    </html>
  );
}
import { NextRequest, NextResponse } from "next/server";

const ADMIN_HOST = "admin.kkcloset.uk";
const SHOP_HOST = "shop.kkcloset.uk";

export function middleware(request: NextRequest) {
  const hostname =
    request.headers.get("host")?.split(":")[0].toLowerCase() || "";

  const pathname = request.nextUrl.pathname;
  const isAdminHost = hostname === ADMIN_HOST;

  // Any attempt to open /admin on the storefront is moved to the
  // dedicated admin hostname.
  if (!isAdminHost && pathname.startsWith("/admin")) {
    const destination = new URL(
      `${pathname}${request.nextUrl.search}`,
      `https://${ADMIN_HOST}`
    );

    return NextResponse.redirect(destination);
  }

  if (isAdminHost) {
    // The admin hostname always enters the admin dashboard.
    if (pathname === "/") {
      const url = request.nextUrl.clone();
      url.pathname = "/admin";
      url.search = "";
      return NextResponse.redirect(url);
    }

    // Only admin routes, the login page and framework/static assets
    // are available on admin.kkcloset.uk.
    const allowed =
      pathname === "/login" ||
      pathname.startsWith("/admin") ||
      pathname.startsWith("/_next") ||
      pathname === "/favicon.ico" ||
      pathname.startsWith("/kkcloset-logo") ||
      /\.[a-zA-Z0-9]+$/.test(pathname);

    if (!allowed) {
      const url = request.nextUrl.clone();
      url.pathname = "/admin";
      url.search = "";
      return NextResponse.redirect(url);
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!api).*)"],
};

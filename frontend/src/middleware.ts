import { NextRequest, NextResponse } from "next/server";

export function middleware(request: NextRequest) {
  const hostname =
    request.headers.get("host")?.split(":")[0].toLowerCase() || "";

  const pathname = request.nextUrl.pathname;

  const isAdminHost = hostname === "admin.kkcloset.uk";

  if (isAdminHost) {
    // Root admin domain always enters admin.
    if (pathname === "/") {
      const url = request.nextUrl.clone();
      url.pathname = "/admin";
      return NextResponse.redirect(url);
    }

    // Allow login and the complete admin area.
    const allowed =
      pathname === "/login" ||
      pathname.startsWith("/admin") ||
      pathname.startsWith("/_next") ||
      pathname === "/favicon.ico" ||
      pathname.startsWith("/kkcloset-logo");

    // Prevent admin users browsing storefront routes
    // from the admin hostname.
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
  matcher: [
    "/((?!api).*)",
  ],
};
import {
  forgotPasswordRoute,
  resetPasswordRoute,
} from "./routes/password-reset.mjs";

import { withCors } from "./context.mjs";

import { healthRoute } from "./routes/health.mjs";

import {
  registerRoute,
  loginRoute,
  meRoute,
} from "./routes/auth.mjs";

import {
  verifyCustomerEmailRoute,
  resendCustomerVerificationRoute,
} from "./routes/email-verification.mjs";

import {
  listCategoriesRoute,
  createCategoryRoute,
  updateCategoryRoute,
  deleteCategoryRoute,
} from "./routes/categories.mjs";

import {
  listProductsRoute,
  getProductRoute,
  adminListProductsRoute,
  adminGetProductRoute,
  createProductRoute,
  updateProductRoute,
  deleteProductRoute,
} from "./routes/products.mjs";

import {
  uploadProductImagesRoute,
} from "./routes/uploads.mjs";

import {
  handleCommerceRoutes,
} from "./routes/commerce.mjs";
import {
  postcodeLookupRoute,
} from "./routes/address-lookup.mjs";
import {
  listStaffRoute,
  createStaffRoute,
  updateStaffRoute,
  revokeStaffAccessRoute,
  convertStaffToCustomerRoute,
  resendStaffInviteRoute,
  acceptStaffInviteRoute,
} from "./routes/staff.mjs";
import {
  adminOrdersByDateRoute,
} from "./routes/admin-orders-by-date.mjs";



function normalizePath(pathname) {
  if (!pathname || pathname === "/") return "/";
  return pathname.replace(/\/+$/, "") || "/";
}

function segments(pathname) {
  return pathname.split("/").filter(Boolean);
}

export async function routeRequest(request, context) {
  const url = new URL(request.url);
  const pathname = normalizePath(url.pathname);
  const method = request.method.toUpperCase();
  const parts = segments(pathname);

  if (method === "OPTIONS") {
    return withCors(
      new Response(null, { status: 204 }),
      request,
      context.env
    );
  }

  let response;

  if (method === "GET" && pathname === "/") {
    response = Response.json({
      message: "KKCommerce API is running",
      runtime: "cloudflare-workers",
    });
  } else if (
    method === "GET" &&
    pathname === "/api/health"
  ) {
    response = await healthRoute(request, context);





  } else if (
    method === "POST" &&
    pathname === "/api/auth/register"
  ) {
    response = await registerRoute(request, context);
  } else if (
    method === "POST" &&
    pathname === "/api/auth/login"
  ) {
    response = await loginRoute(request, context);
  } else if (
    method === "GET" &&
    pathname === "/api/auth/me"
  ) {
    response = await meRoute(request, context);

    } else if (
  method === "POST" &&
  pathname === "/api/auth/verify-email"
) {
  response = await verifyCustomerEmailRoute(request, context);
} else if (
  method === "POST" &&
  pathname === "/api/auth/resend-verification"
) {
  response = await resendCustomerVerificationRoute(request, context);

  } else if (
  method === "POST" &&
  pathname === "/api/auth/forgot-password"
) {
  response = await forgotPasswordRoute(
    request,
    context
  );
} else if (
  method === "POST" &&
  pathname === "/api/auth/reset-password"
) {
  response = await resetPasswordRoute(
    request,
    context
  );

  } else if (
    method === "GET" &&
    pathname === "/api/categories"
  ) {
    response = await listCategoriesRoute(request, context);
  } else if (
    method === "POST" &&
    pathname === "/api/categories"
  ) {
    response = await createCategoryRoute(request, context);
  } else if (
    parts.length === 3 &&
    parts[0] === "api" &&
    parts[1] === "categories" &&
    method === "PUT"
  ) {
    response = await updateCategoryRoute(request, context, parts[2]);
  } else if (
    parts.length === 3 &&
    parts[0] === "api" &&
    parts[1] === "categories" &&
    method === "DELETE"
  ) {
    response = await deleteCategoryRoute(request, context, parts[2]);

  } else if (
    method === "POST" &&
    pathname === "/api/uploads/products"
  ) {
    response = await uploadProductImagesRoute(request, context);

  } else if (
    method === "GET" &&
    pathname === "/api/products/admin"
  ) {
    response = await adminListProductsRoute(request, context);
  } else if (
    method === "GET" &&
    parts.length === 4 &&
    parts[0] === "api" &&
    parts[1] === "products" &&
    parts[2] === "admin"
  ) {
    response = await adminGetProductRoute(request, context, parts[3]);
  } else if (
    method === "GET" &&
    pathname === "/api/products"
  ) {
    response = await listProductsRoute(request, context);
  } else if (
    method === "POST" &&
    pathname === "/api/products"
  ) {
    response = await createProductRoute(request, context);
  } else if (
    method === "PUT" &&
    parts.length === 3 &&
    parts[0] === "api" &&
    parts[1] === "products"
  ) {
    response = await updateProductRoute(request, context, parts[2]);
  } else if (
    method === "DELETE" &&
    parts.length === 3 &&
    parts[0] === "api" &&
    parts[1] === "products"
  ) {
    response = await deleteProductRoute(request, context, parts[2]);
  } else if (
    method === "GET" &&
    parts.length === 3 &&
    parts[0] === "api" &&
    parts[1] === "products"
  ) {
    response = await getProductRoute(
      request,
      context,
      decodeURIComponent(parts[2])
    );
  } else if (
    method === "GET" &&
    pathname === "/api/admin/orders"
  ) {
    response = await adminOrdersByDateRoute(
      request,
      context
    );
  } else if (
    method === "POST" &&
    pathname === "/api/staff/accept-invite"
  ) {
    response = await acceptStaffInviteRoute(request, context);
  } else if (
    method === "GET" &&
    pathname === "/api/staff"
  ) {
    response = await listStaffRoute(request, context);
  } else if (
    method === "POST" &&
    pathname === "/api/staff"
  ) {
    response = await createStaffRoute(request, context);
  } else if (
    method === "PATCH" &&
    parts.length === 3 &&
    parts[0] === "api" &&
    parts[1] === "staff"
  ) {
    response = await updateStaffRoute(request, context, parts[2]);
  } else if (
    method === "POST" &&
    parts.length === 4 &&
    parts[0] === "api" &&
    parts[1] === "staff" &&
    parts[3] === "revoke"
  ) {
    response = await revokeStaffAccessRoute(request, context, parts[2]);
  } else if (
    method === "POST" &&
    parts.length === 4 &&
    parts[0] === "api" &&
    parts[1] === "staff" &&
    parts[3] === "convert-to-customer"
  ) {
    response = await convertStaffToCustomerRoute(request, context, parts[2]);
  } else if (
    method === "POST" &&
    parts.length === 4 &&
    parts[0] === "api" &&
    parts[1] === "staff" &&
    parts[3] === "resend-invite"
  ) {
    response = await resendStaffInviteRoute(request, context, parts[2]);
  } else if (
    method === "GET" &&
    pathname === "/api/address/postcode"
  ) {
    response = await postcodeLookupRoute(request, context);
  } else {
    response = await handleCommerceRoutes(request, context);

    if (!response) {
      response = Response.json(
        { message: `Route not found: ${method} ${pathname}` },
        { status: 404 }
      );
    }
  }

  return withCors(response, request, context.env);
}



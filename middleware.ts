import { NextResponse, type NextRequest } from "next/server";
import { authenticateMiddlewareRequest } from "@/lib/auth/middleware-auth";
import {
  isAdminApi,
  isProtectedApi,
  isProtectedPage
} from "@/lib/auth/protected-routes";

/** Preserve Supabase session cookie updates on redirects and JSON errors. */
function withSessionCookies(from: NextResponse, to: NextResponse): NextResponse {
  for (const cookie of from.cookies.getAll()) {
    to.cookies.set(cookie);
  }
  return to;
}

function jsonResponse(
  supabaseResponse: NextResponse,
  body: object,
  status: number
): NextResponse {
  return withSessionCookies(supabaseResponse, NextResponse.json(body, { status }));
}

function forwardWithUser(
  requestHeaders: Headers,
  user: { id: string; email: string },
  supabaseResponse: NextResponse
): NextResponse {
  requestHeaders.set("x-user-id", user.id);
  requestHeaders.set("x-user-email", user.email);
  const forwarded = NextResponse.next({ request: { headers: requestHeaders } });
  return withSessionCookies(supabaseResponse, forwarded);
}

export async function middleware(request: NextRequest) {
  const requestHeaders = new Headers(request.headers);
  const pathname = request.nextUrl.pathname;

  const { user, supabaseResponse } = await authenticateMiddlewareRequest(request, requestHeaders);

  if (!user && isProtectedPage(pathname)) {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    return withSessionCookies(supabaseResponse, NextResponse.redirect(url));
  }

  if (!user && isProtectedApi(pathname)) {
    return jsonResponse(supabaseResponse, { error: "Unauthorized" }, 401);
  }

  if (user && pathname === "/") {
    const url = request.nextUrl.clone();
    url.pathname = "/dashboard";
    return withSessionCookies(supabaseResponse, NextResponse.redirect(url));
  }

  if (user) {
    return forwardWithUser(requestHeaders, user, supabaseResponse);
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    "/",
    "/dashboard/:path*",
    "/picks/:path*",
    "/results/:path*",
    "/profile/:path*",
    "/admin/:path*",
    "/rules/:path*",
    "/api/profile/:path*",
    "/api/picks",
    "/api/admin/:path*"
  ]
};

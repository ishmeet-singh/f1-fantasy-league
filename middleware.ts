import { NextResponse, type NextRequest } from "next/server";
import { authenticateMiddlewareRequest } from "@/lib/auth/middleware-auth";
import { getMiddlewareAuthMode } from "@/lib/auth/middleware-auth-mode";
import {
  attachPerfResponseHeaders,
  markRuntimeInvocation,
  perfLog
} from "@/lib/perf-investigate";

const PROTECTED_PAGE_PREFIXES = ["/dashboard", "/picks", "/results", "/profile", "/admin", "/rules"];
const PROTECTED_API_PREFIXES = ["/api/profile"];

function isProtectedPage(pathname: string) {
  return PROTECTED_PAGE_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

function isProtectedApi(pathname: string) {
  return PROTECTED_API_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

function withPerfHeaders(response: NextResponse, extra: Record<string, string | number | boolean>) {
  attachPerfResponseHeaders(response, extra);
  return response;
}

export async function middleware(request: NextRequest) {
  const requestHeaders = new Headers(request.headers);
  const pathname = request.nextUrl.pathname;
  const edgeRuntime = markRuntimeInvocation("edge");
  const authStart = performance.now();

  const { user, supabaseResponse } = await authenticateMiddlewareRequest(request, requestHeaders);

  const authMs = Math.round(performance.now() - authStart);
  perfLog("middleware_auth", {
    pathname,
    authMs,
    authMode: getMiddlewareAuthMode(),
    hasUser: Boolean(user),
    ...edgeRuntime
  });

  const perfHeaders: Record<string, string | number | boolean> = {
    "edge-cold": edgeRuntime.coldInstance ? 1 : 0,
    "edge-auth-ms": authMs,
    "edge-uptime-ms": "processUptimeMs" in edgeRuntime ? edgeRuntime.processUptimeMs ?? 0 : 0
  };

  if (!user && isProtectedPage(pathname)) {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    return withPerfHeaders(NextResponse.redirect(url), perfHeaders);
  }

  if (!user && isProtectedApi(pathname)) {
    return withPerfHeaders(
      NextResponse.json({ error: "Unauthorized" }, { status: 401 }),
      perfHeaders
    );
  }

  if (user) {
    requestHeaders.set("x-user-id", user.id);
    requestHeaders.set("x-user-email", user.email);
    const forwarded = NextResponse.next({
      request: { headers: requestHeaders }
    });
    for (const cookie of supabaseResponse.cookies.getAll()) {
      forwarded.cookies.set(cookie);
    }
    return withPerfHeaders(forwarded, perfHeaders);
  }

  return withPerfHeaders(supabaseResponse, perfHeaders);
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/picks/:path*",
    "/results/:path*",
    "/profile/:path*",
    "/admin/:path*",
    "/rules/:path*",
    "/api/profile/:path*"
  ]
};

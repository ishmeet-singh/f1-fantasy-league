import { NextResponse, type NextRequest } from "next/server";
import { authenticateMiddlewareRequest } from "@/lib/auth/middleware-auth";

const PROTECTED_PAGE_PREFIXES = ["/dashboard", "/picks", "/results", "/profile", "/admin", "/rules"];
const PROTECTED_API_PREFIXES = ["/api/profile"];

function isProtectedPage(pathname: string) {
  return PROTECTED_PAGE_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

function isProtectedApi(pathname: string) {
  return PROTECTED_API_PREFIXES.some((p) => pathname === p || pathname.startsWith(`${p}/`));
}

export async function middleware(request: NextRequest) {
  const requestHeaders = new Headers(request.headers);
  const pathname = request.nextUrl.pathname;

  const { user, supabaseResponse } = await authenticateMiddlewareRequest(request, requestHeaders);

  if (!user && isProtectedPage(pathname)) {
    const url = request.nextUrl.clone();
    url.pathname = "/";
    return NextResponse.redirect(url);
  }

  if (!user && isProtectedApi(pathname)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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
    return forwarded;
  }

  return supabaseResponse;
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

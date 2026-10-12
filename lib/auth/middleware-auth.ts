import { createServerClient, type CookieOptions } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { getMiddlewareAuthMode } from "@/lib/auth/middleware-auth-mode";
import { verifyAccessToken } from "@/lib/auth/verify-access-token";

export type MiddlewareAuthUser = {
  id: string;
  email: string;
};

export type MiddlewareAuthResult = {
  user: MiddlewareAuthUser | null;
  supabaseResponse: NextResponse;
};

function createMiddlewareSupabase(
  request: NextRequest,
  requestHeaders: Headers
): { supabase: ReturnType<typeof createServerClient>; getResponse: () => NextResponse } {
  let supabaseResponse = NextResponse.next({
    request: { headers: requestHeaders }
  });

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet: { name: string; value: string; options: CookieOptions }[]) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
          supabaseResponse = NextResponse.next({
            request: { headers: requestHeaders }
          });
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          );
        }
      }
    }
  );

  return { supabase, getResponse: () => supabaseResponse };
}

function toAuthUser(user: { id: string; email?: string | null }): MiddlewareAuthUser {
  return { id: user.id, email: user.email ?? "" };
}

const MIDDLEWARE_AUTH_TIMEOUT_MS = 4_000;

async function withAuthTimeout<T>(
  label: string,
  operation: () => Promise<T>
): Promise<T | null> {
  let timer: ReturnType<typeof setTimeout> | undefined;
  try {
    return await Promise.race([
      operation(),
      new Promise<null>((resolve) => {
        timer = setTimeout(() => {
          console.warn(`[middleware] ${label} timed out after ${MIDDLEWARE_AUTH_TIMEOUT_MS}ms`);
          resolve(null);
        }, MIDDLEWARE_AUTH_TIMEOUT_MS);
      })
    ]);
  } finally {
    if (timer) clearTimeout(timer);
  }
}

async function authenticateNetwork(
  request: NextRequest,
  requestHeaders: Headers
): Promise<MiddlewareAuthResult> {
  const { supabase, getResponse } = createMiddlewareSupabase(request, requestHeaders);
  const result = await withAuthTimeout("supabase.auth.getUser", () => supabase.auth.getUser());
  if (!result) {
    return { user: null, supabaseResponse: getResponse() };
  }
  const { data: { user } } = result;
  return {
    user: user ? toAuthUser(user) : null,
    supabaseResponse: getResponse()
  };
}

async function authenticateLocal(
  request: NextRequest,
  requestHeaders: Headers
): Promise<MiddlewareAuthResult> {
  const jwtSecret = process.env.SUPABASE_JWT_SECRET!;
  const { supabase, getResponse } = createMiddlewareSupabase(request, requestHeaders);
  const {
    data: { session }
  } = await supabase.auth.getSession();

  if (!session?.access_token) {
    return { user: null, supabaseResponse: getResponse() };
  }

  let verified = await verifyAccessToken(session.access_token, jwtSecret);

  if (!verified && session.refresh_token) {
    const refreshed = await withAuthTimeout("supabase.auth.refreshSession", () =>
      supabase.auth.refreshSession({ refresh_token: session.refresh_token })
    );
    if (refreshed && !refreshed.error && refreshed.data.session?.access_token) {
      verified = await verifyAccessToken(refreshed.data.session.access_token, jwtSecret);
      if (!verified && refreshed.data.user) {
        verified = { id: refreshed.data.user.id, email: refreshed.data.user.email ?? "" };
      }
    }
  }

  return {
    user: verified,
    supabaseResponse: getResponse()
  };
}

export async function authenticateMiddlewareRequest(
  request: NextRequest,
  requestHeaders: Headers
): Promise<MiddlewareAuthResult> {
  if (getMiddlewareAuthMode() === "local") {
    return authenticateLocal(request, requestHeaders);
  }
  return authenticateNetwork(request, requestHeaders);
}

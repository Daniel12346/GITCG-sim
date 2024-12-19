import { createMiddlewareClient } from "@supabase/auth-helpers-nextjs";
import { NextResponse } from "next/server";

import type { NextRequest } from "next/server";

export async function middleware(req: NextRequest) {
  const res = NextResponse.next();

  // Create a Supabase client configured to use cookies
  const supabase = createMiddlewareClient({ req, res });

  // Refresh session if expired - required for Server Components
  // https://supabase.com/docs/guides/auth/auth-helpers/nextjs#managing-session-with-middleware
  const {
    data: { session },
  } = await supabase.auth.getSession();
  // Redirect to login if no session (unauthenticated)
  if (!session && req.url !== "/login") {
    return NextResponse.rewrite(new URL("/login", req.url));
  }
  return res;
}

export const config = {
  matcher: [
    "/",
    "/me",
    "/player/:path*",
    "/lobby",
    "/battle-log",
    "/deck-builder",
    "/game/:path*",
  ],
};

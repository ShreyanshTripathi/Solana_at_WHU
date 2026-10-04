import { type NextRequest, NextResponse } from "next/server";
import { SESSION_COOKIE, verifySession } from "@/lib/auth/token";

// First barrier only: bounce visitors without a valid session before the page renders.
// The real checks are requireMember / requireAdmin in every page, action and route.
export async function proxy(request: NextRequest) {
  let loggedIn = false;
  try {
    loggedIn = (await verifySession(request.cookies.get(SESSION_COOKIE)?.value)) !== null;
  } catch {
    // SESSION_SECRET missing: treat everyone as logged out.
  }
  if (loggedIn) return NextResponse.next();

  const { pathname, search } = request.nextUrl;
  if (pathname.startsWith("/api/")) return new NextResponse("Log in first.", { status: 401 });
  const login = new URL("/login", request.url);
  login.searchParams.set("next", pathname + search);
  return NextResponse.redirect(login);
}

export const config = {
  matcher: [
    "/seller/:path*",
    "/buyer/:path*",
    "/sme/:path*",
    "/admin/:path*",
    "/account/:path*",
    "/workspaces/:path*",
    "/statements/:path*",
    "/map/:path*",
    "/agent/:path*",
    "/federation/:path*",
    "/api/export/:path*",
  ],
};

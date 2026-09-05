import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { getToken } from "next-auth/jwt";

// ── Routes that require a valid session ─────────────────────
const protectedRoutes = ["/", "/api/chats", "/api/messages", "/api/users"];
const authRoutes      = ["/login", "/signup"];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  // ── 1. Security HTTP headers (applied to ALL responses) ───
  const response = NextResponse.next();
  response.headers.set("X-Frame-Options",        "DENY");           // Clickjacking
  response.headers.set("X-Content-Type-Options",  "nosniff");       // MIME sniffing
  response.headers.set("Referrer-Policy",         "strict-origin-when-cross-origin");
  response.headers.set("Permissions-Policy",      "camera=(), microphone=(), geolocation=()");
  response.headers.set(
    "Content-Security-Policy",
    [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' 'unsafe-eval'",   // Next.js requires unsafe-eval in dev
      "style-src 'self' 'unsafe-inline'",
      "img-src 'self' data: https://api.dicebear.com",
      "connect-src 'self' ws: wss: http://localhost:5001 https:",
      "font-src 'self'",
      "frame-ancestors 'none'",
    ].join("; ")
  );

  // ── 2. Route protection ────────────────────────────────────
  const token = await getToken({ req, secret: process.env.NEXTAUTH_SECRET });

  // Redirect unauthenticated users away from protected pages
  const isProtected = protectedRoutes.some(
    (r) => pathname === r || pathname.startsWith("/api/chats") || pathname.startsWith("/api/messages") || pathname.startsWith("/api/users")
  );
  const isAuthPage  = authRoutes.some((r) => pathname.startsWith(r));

  if (isProtected && !token && !pathname.startsWith("/api/auth")) {
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("callbackUrl", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // Redirect already-logged-in users away from login/signup
  if (isAuthPage && token) {
    return NextResponse.redirect(new URL("/", req.url));
  }

  return response;
}

export const config = {
  // Apply middleware to all routes EXCEPT static files and Next.js internals
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};

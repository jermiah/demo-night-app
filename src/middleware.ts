import { type NextRequest, NextResponse } from "next/server";

const VERCEL_DEPLOYMENT = !!process.env.VERCEL;

export default async function middleware(req: NextRequest) {
  const path = req.nextUrl.pathname;

  // Skip auth check if admin/[eventId]/submissions or login pages
  if (
    path.endsWith("/submissions") ||
    path.startsWith("/login") ||
    path.startsWith("/api") ||
    path.startsWith("/_next") ||
    path.includes(".")
  ) {
    return NextResponse.next();
  }

  const cookieName = `${VERCEL_DEPLOYMENT ? "__Secure-" : ""}next-auth.session-token`;
  const session = !!req.cookies.get(cookieName);

  // Protect admin routes and root route
  if (!session) {
    // If trying to access admin, let it go to default signin or maybe just redirect to audience login?
    // Admin usually needs different login. But let's stick to the requirement.
    // If it's an admin route, we might want to keep the original behavior or redirect to a specific admin login.
    // But for now, let's just redirect to audience login for the main app.

    if (path.startsWith("/admin")) {
      return NextResponse.redirect(
        new URL(`/api/auth/signin?callbackUrl=${path}`, req.url),
      );
    }

    return NextResponse.redirect(
      new URL(`/login/audience?callbackUrl=${path}`, req.url),
    );
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/admin/:path*", "/"],
};

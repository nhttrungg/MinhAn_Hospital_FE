import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const signedIn = request.cookies.has("ANTAM_SESSION");
  const guarded = pathname.startsWith("/staff") || pathname.startsWith("/portal");
  if (guarded && !signedIn) {
    const login = new URL(pathname.startsWith("/staff") ? "/login/staff" : "/login", request.url);
    login.searchParams.set("next", pathname + request.nextUrl.search);
    return NextResponse.redirect(login);
  }
  return NextResponse.next();
}

export const config = {
  matcher: ["/staff", "/staff/:path*", "/portal", "/portal/:path*"],
};

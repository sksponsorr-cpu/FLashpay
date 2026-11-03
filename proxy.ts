import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

export async function proxy(request: NextRequest) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY;

  if (!url || !publishableKey) {
    return NextResponse.next({ request });
  }

  let response = NextResponse.next({ request });
  const supabase = createServerClient(url, publishableKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet, cacheHeaders) {
        cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value));
        response = NextResponse.next({ request });
        cookiesToSet.forEach(({ name, value, options }) => response.cookies.set(name, value, options));
        Object.entries(cacheHeaders).forEach(([name, value]) => response.headers.set(name, value));
      },
    },
  });

  const pathname = request.nextUrl.pathname;
  let hasUser = false;

  try {
    const { data, error } = await supabase.auth.getClaims();
    hasUser = !error && Boolean(data?.claims?.sub);
  } catch {
    if (pathname === "/login" || pathname === "/auth/confirm") {
      return response;
    }
  }

  const isPublicRoute = pathname === "/" || pathname === "/login" || pathname === "/signup" || pathname === "/auth/confirm" || pathname.startsWith("/docs");

  if (!hasUser && !isPublicRoute) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  if (hasUser && (pathname === "/login" || pathname === "/signup")) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return response;
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)"],
};

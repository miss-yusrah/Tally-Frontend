import { createServerClient } from "@supabase/ssr";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { isOnboardingComplete } from "@/lib/supabase/profile";

const publicPaths = ["/"];
const authOnlyPaths = ["/onboarding"];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const isJoinRoute = pathname.startsWith("/join/");

  let response = NextResponse.next({ request });

  // If Supabase isn't configured yet, don't block anything.
  if (
    !process.env.NEXT_PUBLIC_SUPABASE_URL ||
    !process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
  ) {
    return response;
  }

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) =>
            request.cookies.set(name, value)
          );
          response = NextResponse.next({ request });
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          );
        },
      },
    }
  );

  const {
    data: { user },
  } = await supabase.auth.getUser();

  const isAuthenticated = Boolean(user);
  const onboardingComplete = user ? isOnboardingComplete(user) : false;

  const isPublic = publicPaths.includes(pathname);
  const isAuthOnly = authOnlyPaths.includes(pathname);
  const isProtected =
    pathname.startsWith("/dashboard") ||
    pathname.startsWith("/trips") ||
    pathname.startsWith("/add") ||
    pathname.startsWith("/balances") ||
    pathname.startsWith("/profile") ||
    pathname.startsWith("/notifications");

  const redirectTo = (path: string) => {
    const url = request.nextUrl.clone();
    url.pathname = path;
    url.search = "";
    const redirect = NextResponse.redirect(url);
    response.cookies.getAll().forEach((cookie) => {
      redirect.cookies.set(cookie);
    });
    return redirect;
  };

  if (isAuthenticated && isPublic && !isJoinRoute) {
    return redirectTo(onboardingComplete ? "/dashboard" : "/onboarding");
  }

  if (isAuthenticated && isAuthOnly && onboardingComplete) {
    return redirectTo("/dashboard");
  }

  if (!isAuthenticated && (isProtected || isAuthOnly)) {
    return redirectTo("/");
  }

  if (isAuthenticated && !onboardingComplete && isProtected) {
    return redirectTo("/onboarding");
  }

  return response;
}

export const config = {
  matcher: [
    "/",
    "/onboarding",
    "/join/:path*",
    "/dashboard/:path*",
    "/trips/:path*",
    "/add/:path*",
    "/balances/:path*",
    "/profile/:path*",
    "/notifications/:path*",
  ],
};

import { NextResponse, type NextRequest } from "next/server";

function storefrontBaseHost(): string | null {
  const h =
    process.env.STORE_BASE_HOST?.trim() ||
    process.env.NEXT_PUBLIC_STORE_BASE_HOST?.trim();
  return h && h.length > 0 ? h : null;
}

/** First label of `slug.store.example.com` → `slug` (no nested subdomains). */
function storeSlugFromHost(hostNoPort: string, base: string): string | null {
  const h = hostNoPort.toLowerCase().trim();
  const b = base.toLowerCase().trim();
  if (!h.endsWith(`.${b}`)) return null;
  const prefix = h.slice(0, -`.${b}`.length);
  if (!prefix || prefix.includes(".")) return null;
  return prefix;
}

function isStaticOrInternalPath(pathname: string): boolean {
  if (pathname.startsWith("/_next")) return true;
  if (pathname.startsWith("/api")) return true;
  if (pathname === "/favicon.ico" || pathname === "/robots.txt") return true;
  if (pathname.startsWith("/apple-icon")) return true;
  if (pathname.startsWith("/.well-known")) return true;
  // Common static assets from /public
  if (/\.(ico|png|jpg|jpeg|gif|webp|svg|txt|xml|webmanifest)$/i.test(pathname)) {
    return true;
  }
  return false;
}

export function proxy(request: NextRequest) {
  const base = storefrontBaseHost();
  if (!base) return NextResponse.next();

  const host =
    request.headers.get("x-forwarded-host") ?? request.headers.get("host") ?? "";
  const hostNoPort = host.split(":")[0] ?? "";
  const slug = storeSlugFromHost(hostNoPort, base);
  if (!slug) return NextResponse.next();

  const url = request.nextUrl.clone();
  const path = url.pathname;

  if (isStaticOrInternalPath(path)) {
    return NextResponse.next();
  }

  if (path === "/" || path === "") {
    url.pathname = `/store/${slug}`;
    return NextResponse.rewrite(url);
  }

  if (path === `/store/${slug}` || path.startsWith(`/store/${slug}/`)) {
    return NextResponse.next();
  }

  if (path.startsWith("/store/")) {
    return new NextResponse(null, { status: 404 });
  }

  return new NextResponse(null, { status: 404 });
}

export const config = {
  matcher: [
    /*
     * Match all pathnames except Next internals and typical image assets (still
     * allow /_next via early return in proxy).
     */
    "/((?!_next/static|_next/image|_next/webpack-hmr).*)",
  ],
};

/** @type {import('next').NextConfig} */
const LONG_CACHE = {
  key: "Cache-Control",
  value: "public, max-age=31536000, immutable",
};

const nextConfig = {
  poweredByHeader: false,
  reactStrictMode: true,
  images: {
    formats: ["image/avif", "image/webp"],
    remotePatterns: [
      {
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
      },
      {
        protocol: "https",
        hostname: "images.unsplash.com",
      },
    ],
  },
  // lucide-react is imported in ~190 components — rewrite named imports
  // to per-icon modules so only used icons are bundled.
  experimental: {
    optimizePackageImports: ["lucide-react"],
  },
  async headers() {
    return [
      {
        // Immutable brand/photo assets — content is versioned in git.
        source: "/tabr/:path*",
        headers: [LONG_CACHE],
      },
      {
        source: "/:file(icon-192.png|icon-512.png|icon-maskable-512.png|apple-touch-icon.png|favicon.png|favicon-16.png|favicon-32.png)",
        headers: [LONG_CACHE],
      },
      {
        // The service worker itself must revalidate so updates ship.
        source: "/sw.js",
        headers: [
          { key: "Cache-Control", value: "public, max-age=0, must-revalidate" },
          { key: "Service-Worker-Allowed", value: "/" },
        ],
      },
      {
        source: "/offline.html",
        headers: [{ key: "Cache-Control", value: "public, max-age=3600" }],
      },
    ];
  },
};

export default nextConfig;

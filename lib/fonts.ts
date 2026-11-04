import localFont from "next/font/local";
import { GeistSans } from "geist/font/sans";

/**
 * Fonts are self-hosted with next/font/local — identical files to the ones
 * next/font/google served, but builds no longer hit fonts.googleapis.com
 * (3 retries at build time timed out in a row on a slow network, failing
 * the whole build). Same font files, same CSS variables, same preloading.
 */

/** Single Playfair instance for headings/serif accents. */
export const playfair = localFont({
  src: [
    { path: "./fonts/playfair-400-normal-latin.woff2", weight: "400", style: "normal" },
    { path: "./fonts/playfair-400-italic-latin.woff2", weight: "400", style: "italic" },
    { path: "./fonts/playfair-400-normal-latin-ext.woff2", weight: "400", style: "normal" },
    { path: "./fonts/playfair-400-italic-latin-ext.woff2", weight: "400", style: "italic" },
  ],
  variable: "--font-playfair",
  display: "swap",
});

/** Splash / brand wordmark — Bricolage Grotesque 700 */
export const bricolage = localFont({
  src: [
    { path: "./fonts/bricolage-700-normal-latin.woff2", weight: "700", style: "normal" },
    { path: "./fonts/bricolage-700-normal-latin-ext.woff2", weight: "700", style: "normal" },
  ],
  variable: "--font-bricolage",
  display: "swap",
});

export { GeistSans };

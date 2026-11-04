import type { Metadata, Viewport } from "next";
import { GeistSans, bricolage, playfair } from "@/lib/fonts";
import { ThemeProvider } from "@/components/providers/ThemeProvider";
import { AppProviders } from "@/components/providers/AppProviders";
import { ServiceWorkerRegistration } from "@/components/pwa/ServiceWorkerRegistration";
import { cn } from "@/lib/utils";
import "./globals.css";

export const metadata: Metadata = {
  title: "Tabr",
  description:
    "The social spending app for young Nigerians — split the bill, settle up, discover where to go.",
  icons: {
    icon: [
      { url: "/favicon.ico", sizes: "any" },
      { url: "/favicon.png", sizes: "32x32", type: "image/png" },
      { url: "/favicon-16.png", sizes: "16x16", type: "image/png" },
      { url: "/favicon-32.png", sizes: "32x32", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: [{ url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" }],
  },
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Tabr",
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
  themeColor: "#0A0714",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="en"
      className={cn(
        "dark",
        GeistSans.variable,
        playfair.variable,
        bricolage.variable
      )}
      suppressHydrationWarning
    >
      <body className="font-sans antialiased">
        <ThemeProvider>
          <AppProviders>{children}</AppProviders>
        </ThemeProvider>
        <ServiceWorkerRegistration />
      </body>
    </html>
  );
}

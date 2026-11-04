"use client";

import { useEffect } from "react";

/**
 * Registers the Tabr service worker (production only).
 * The SW provides offline navigation fallback and cache-first static assets.
 */
export function ServiceWorkerRegistration() {
  useEffect(() => {
    if (
      process.env.NODE_ENV !== "production" ||
      typeof navigator === "undefined" ||
      !("serviceWorker" in navigator)
    ) {
      return;
    }

    const register = () => {
      // updateViaCache "none": the SW script itself is always revalidated so
      // new deployments reach users as soon as they open the app.
      navigator.serviceWorker
        .register("/sw.js", { updateViaCache: "none" })
        .then((registration) => {
          // Check for an updated worker when the app returns to the foreground.
          document.addEventListener("visibilitychange", () => {
            if (document.visibilityState === "visible") {
              registration.update().catch(() => {});
            }
          });
        })
        .catch(() => {
          // SW is a progressive enhancement — ignore registration failures.
        });
    };

    if (document.readyState === "complete") {
      register();
    } else {
      window.addEventListener("load", register, { once: true });
      return () => window.removeEventListener("load", register);
    }
  }, []);

  return null;
}

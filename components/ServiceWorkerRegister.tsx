"use client";

import { useEffect } from "react";

const serviceWorkerUrl = "/sw.js";

export default function ServiceWorkerRegister() {
  useEffect(() => {
    if (typeof window === "undefined") {
      return;
    }

    if (process.env.NODE_ENV === "development") {
      return;
    }

    const isLocalhost = window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1";
    const isSecureContext = window.location.protocol === "https:" || isLocalhost;

    if ("serviceWorker" in navigator && isSecureContext) {
      navigator.serviceWorker
        .register(serviceWorkerUrl, { updateViaCache: "none" })
        .then(registration => {
          if (process.env.NODE_ENV !== "production") {
            console.info("Service worker registered", registration.scope);
          }
        })
        .catch(error => {
          console.error("Service worker registration failed", error);
        });
    }
  }, []);

  return null;
}

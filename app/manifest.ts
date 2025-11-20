import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Prophet Order Challenge",
    short_name: "Prophet Challenge",
    description:
      "Arrange leaders of The Church of Jesus Christ of Latter-day Saints chronologically in a retro-inspired challenge.",
    start_url: "/",
    display: "standalone",
    background_color: "#1b1d2b",
    theme_color: "#1b1d2b",
    icons: [
      {
        src: "/images/logo/android-chrome-192x192.png",
        sizes: "192x192",
        type: "image/png",
        purpose: "any"
      },
      {
        src: "/images/logo/android-chrome-512x512.png",
        sizes: "512x512",
        type: "image/png",
        purpose: "any"
      },
      {
        src: "/images/logo/poc_logo.ico",
        sizes: "256x256",
        type: "image/x-icon"
      }
    ]
  };
}

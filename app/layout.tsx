import type { Metadata, Viewport } from "next";
import { Press_Start_2P } from "next/font/google";
import "./globals.css";
import ServiceWorkerRegister from "@/components/ServiceWorkerRegister";

const pressStart = Press_Start_2P({
  variable: "--font-press-start",
  subsets: ["latin"],
  weight: "400",
  display: "swap"
});

export const metadata: Metadata = {
  applicationName: "Prophet Order Challenge",
  title: "Prophet Order Challenge",
  description:
    "Arrange the Presidents of The Church of Jesus Christ of Latter-day Saints in chronological order in a retro pixel challenge.",
  manifest: "/manifest.webmanifest",
  icons: {
    icon: [
      { url: "/images/logo/android-chrome-192x192.png", type: "image/png", sizes: "192x192" },
      { url: "/images/logo/android-chrome-512x512.png", type: "image/png", sizes: "512x512" },
      { url: "/images/logo/poc_logo.ico" }
    ],
    apple: [
      { url: "/images/logo/android-chrome-192x192.png", type: "image/png", sizes: "192x192" }
    ]
  }
};

export const viewport: Viewport = {
  themeColor: "#1b1d2b"
};

export default function RootLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={`${pressStart.variable} font-pixel bg-background text-slate-100`}> 
        <ServiceWorkerRegister />
        <div className="min-h-screen bg-[radial-gradient(circle_at_top,#313552_0%,#1b1d2b_75%)]">
          {children}
        </div>
      </body>
    </html>
  );
}

import type { Metadata } from "next";
import { Press_Start_2P } from "next/font/google";
import "./globals.css";

const pressStart = Press_Start_2P({
  variable: "--font-press-start",
  subsets: ["latin"],
  weight: "400",
  display: "swap"
});

export const metadata: Metadata = {
  title: "Prophet Order Challenge",
  description:
    "Arrange the Presidents of The Church of Jesus Christ of Latter-day Saints in chronological order in a retro pixel challenge.",
  icons: {
    icon: "/images/logo/poc_logo.ico"
  }
};

export default function RootLayout({
  children
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={`${pressStart.variable} font-pixel bg-background text-slate-100`}> 
        <div className="min-h-screen bg-[radial-gradient(circle_at_top,#313552_0%,#1b1d2b_75%)]">
          {children}
        </div>
      </body>
    </html>
  );
}

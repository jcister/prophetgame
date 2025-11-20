import Link from "next/link";

export const metadata = {
  title: "Offline | Prophet Order Challenge"
};

export default function OfflinePage() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-6 bg-background px-6 text-center text-slate-100">
      <h1 className="text-3xl font-bold tracking-wide">You&apos;re Offline</h1>
      <p className="max-w-md text-sm leading-relaxed text-slate-300">
        An internet connection isn&apos;t available right now. Once you reconnect, the latest
        assets will sync and you can jump back into arranging the prophetic timeline.
      </p>
      <Link href="/" className="pixel-button">
        Try Again
      </Link>
    </main>
  );
}

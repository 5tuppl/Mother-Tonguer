import Link from "next/link";
import { WifiOff } from "lucide-react";

export default function OfflinePage() {
  return (
    <main className="min-h-dvh bg-canvas text-ink">
      <section className="mx-auto flex min-h-dvh max-w-xl flex-col items-center justify-center px-6 text-center">
        <div className="mb-6 flex h-14 w-14 items-center justify-center rounded-app border border-border bg-panel">
          <WifiOff aria-hidden className="h-7 w-7 text-accent" />
        </div>
        <h1 className="text-2xl font-semibold">Offline / Сүлжээ тасарлаа</h1>
        <p className="mt-3 text-sm leading-6 text-muted">
          The translator interface is cached. Saved phrases remain available, and live speech resumes when the API is reachable.
        </p>
        <Link className="mt-7 rounded-app bg-accent px-5 py-3 text-sm font-semibold text-white" href="/">
          Open translator
        </Link>
      </section>
    </main>
  );
}

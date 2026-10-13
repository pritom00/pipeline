'use client';

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <div role="alert" className="mx-auto mt-16 flex max-w-md flex-col items-start gap-3 rounded-2xl border border-line bg-surface p-6">
      <h1 className="text-lg font-semibold">This page hit a problem</h1>
      <p className="text-sm text-muted">
        Your applications are safe. They are saved on this device and were not changed. Try again, and if it keeps happening, reload the page.
      </p>
      <p className="font-mono text-xs text-muted">{error.message}</p>
      <button type="button" onClick={reset} className="bevel-btn min-h-11 rounded-lg px-4 text-sm font-medium">Try again</button>
    </div>
  );
}

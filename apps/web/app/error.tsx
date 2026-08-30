"use client";

export default function ErrorView({ reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <main className="simple-state">
      <p className="eyebrow">Something went wrong</p>
      <h1>Utsikt could not show this view.</h1>
      <p>The item is still safe. Try rendering it again.</p>
      <button className="action action--ink" onClick={reset} type="button">Try again</button>
    </main>
  );
}

import Link from "next/link";

export default function NotFound() {
  return (
    <main className="simple-state">
      <p className="eyebrow">Not found</p>
      <h1>This view is not in Utsikt.</h1>
      <Link className="text-link" href="/today">Return to Today</Link>
    </main>
  );
}

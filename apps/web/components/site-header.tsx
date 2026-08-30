import Link from "next/link";

export function SiteHeader({ active }: { active?: "today" | "week" | "month" }) {
  return (
    <header className="masthead">
      <Link className="brand" href="/today">
        <span aria-hidden="true" className="brand-dot" />
        Utsikt
      </Link>
      <div className="masthead-right">
        <nav aria-label="Primary navigation">
          <Link aria-current={active === "today" ? "page" : undefined} href="/today">Today</Link>
          <Link aria-current={active === "week" ? "page" : undefined} href="/week">Week</Link>
          <Link aria-current={active === "month" ? "page" : undefined} href="/month">Month</Link>
        </nav>
        <Link className="sync-status" href="/activity">synced 08:52 · next 09:40</Link>
      </div>
    </header>
  );
}

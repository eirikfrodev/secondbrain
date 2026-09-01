import Link from "next/link";

type SiteHeaderProps = {
  active?: "today" | "week" | "month";
  liveAuthenticated?: boolean;
};

export function SiteHeader({
  active,
  liveAuthenticated = false
}: SiteHeaderProps) {
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
        {liveAuthenticated ? (
          <span className="sync-status">live workspace · data pending</span>
        ) : (
          <Link className="sync-status" href="/activity">synced 08:52 · next 09:40</Link>
        )}
        {liveAuthenticated ? (
          <form action="/auth/sign-out" className="site-sign-out" method="post">
            <button type="submit">Sign out</button>
          </form>
        ) : null}
      </div>
    </header>
  );
}

import { SiteHeader } from "./site-header";

type LiveWorkspaceStateProps = {
  active?: "today" | "week" | "month";
  viewLabel: string;
};

export function LiveWorkspaceState({
  active,
  viewLabel
}: LiveWorkspaceStateProps) {
  return (
    <div className="app-frame live-workspace-view">
      <SiteHeader active={active} liveAuthenticated />
      <main className="live-workspace-main">
        <section aria-labelledby="live-workspace-title" className="live-workspace-state">
          <p className="eyebrow">{viewLabel} · private workspace</p>
          <h1 id="live-workspace-title">Your live workspace is ready.</h1>
          <p className="live-workspace-intro">
            Google sign-in and your private workspace are verified. Live items
            and actions are not available in this build yet, so no demo data is
            shown here.
          </p>
          <dl className="live-workspace-checks">
            <div>
              <dt>Access</dt>
              <dd>Google account verified</dd>
            </div>
            <div>
              <dt>Workspace</dt>
              <dd>Private owner workspace verified</dd>
            </div>
            <div>
              <dt>Live data</dt>
              <dd>Pending the first authenticated read path</dd>
            </div>
          </dl>
          <p className="live-workspace-note">
            This view will stay quiet until it can show your real workspace
            data safely.
          </p>
        </section>
      </main>
    </div>
  );
}

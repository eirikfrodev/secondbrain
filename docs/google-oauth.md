# Google OAuth boundaries and setup

Utsikt has two deliberately separate Google authorization lanes.

| Lane | Purpose | Scopes | Credential/token location | Status |
|---|---|---|---|---|
| Application sign-in | Prove the identity of the one Utsikt owner | `openid email profile` | OAuth client secret in Supabase Auth; Utsikt browser receives only its Supabase session | Implemented; manual hosted setup required |
| Gmail/Calendar execution | Read provider context and execute reviewed capabilities | Capability-specific Gmail/Calendar scopes, requested later | Future encrypted server/worker token store | Phase 4; not implemented |

Application sign-in never asks for offline access, Gmail, or Calendar scopes and never persists `provider_token` or `provider_refresh_token`. Do not reuse its OAuth client for Phase 4 execution.

## Implemented application flow

1. `/sign-in` offers one fixed Google action in Supabase mode. An immediate client guard prevents overlapping PKCE starts.
2. `GET /api/auth/google/start` constructs the flow through the request-scoped Supabase SSR client. Provider, identity scopes, account-selection prompt, callback, and destination are fixed by code. Supabase's bounded `sb_flow_id` selector is appended to the callback so concurrent browser tabs retain separate PKCE verifiers.
3. The returned redirect must be the exact configured Supabase `/auth/v1/authorize` endpoint with a bounded S256 PKCE challenge, a matching callback flow selector, and no extra authorization parameters.
4. `GET /auth/callback` accepts exactly one bounded authorization code plus its validated flow selector and exchanges against that exact verifier slot once.
5. The exchanged session is immediately reconstructed from only the Supabase access and refresh tokens. The reconstructed session and an authoritative `getUser()` result must agree, and any Google `provider_token` or `provider_refresh_token` is discarded before the final cookie response.
6. The user must be an explicit non-anonymous Google identity and must own exactly one RLS-visible personal workspace. Success redirects only to `/today`; every failure uses fixed non-provider copy.
7. `POST /auth/sign-out` requires an exact same-origin request and clears only the current Supabase session.

Auth responses preserve Supabase cookie mutations and private/no-store headers. Session cookies are explicitly `Secure` on HTTPS origins while loopback HTTP remains available for development. A malformed callback or explicit exchange error does not sign out an already valid session; a successfully exchanged but rejected candidate session is cleared locally.

## Database admission

The migration creates an empty `private.auth_owner_identity` singleton. Empty means deny all.

The Supabase **Before User Created** SQL hook admits only the exact normalized configured email, Google provider, and a non-anonymous user. A separate `auth.users` trigger repeats that check in case the hosted hook is disabled, serializes the first claim, binds the Supabase UUID immutably, and creates the personal workspace. The existing workspace trigger adds owner membership in the same transaction.

Browser roles, the general service API role, and `supabase_auth_admin` cannot mutate the owner configuration. Only a privileged database operator can insert the initial row. Once bound, ordinary updates/deletes cannot change the address or UUID.

## Hosted activation checklist

Code and tests do not perform these external changes.

1. Review and apply the committed Supabase migrations to the intended project. If `auth.users` is not empty, stop and design a separate reconciliation; do not improvise a backfill.
2. Configure the real owner address privately in the Supabase SQL editor:

   ```sql
   insert into private.auth_owner_identity (email_normalized)
   values (lower(btrim('<EXACT_GOOGLE_ACCOUNT_EMAIL>')));
   ```

3. Set the Supabase Site URL to the deployed `APP_ORIGIN`. Add the narrow `<APP_ORIGIN>/auth/callback?sb_flow_id=*` redirect pattern for production. The wildcard is confined to the validated PKCE selector query value; do not use a host or path wildcard.
4. In Authentication Hooks, select `private.before_user_created` for **Before User Created**.
5. Create/configure a Google OAuth web client for Supabase Auth. Its authorized redirect URI is `https://<project-ref>.supabase.co/auth/v1/callback`; this is different from Utsikt's callback in step 3.
6. Enable Google in Supabase Auth. Keep global signup enabled for the first approved OAuth user, but turn the hosted **Email provider** off completely (not only email signup), and disable phone, anonymous access, and every other social provider.
7. Configure the web runtime with matching live connector modes, the public Supabase origin/publishable key, and exact `APP_ORIGIN`. The Google login client secret stays in Supabase Auth and must not be added to the web environment.
8. Manually verify: the approved account creates one Auth user/workspace/membership; a second Google account is rejected and creates no Auth or application row; sign-out clears only the current session.

For current provider and redirect instructions, use the official [Supabase Google login guide](https://supabase.com/docs/guides/auth/social-login/auth-google), [Auth hook guide](https://supabase.com/docs/guides/auth/auth-hooks/before-user-created-hook), and [redirect URL guide](https://supabase.com/docs/guides/auth/redirect-urls).

## Local and automated verification

`supabase/config.toml` keeps Google disabled because the repository is credential-free. It disables email signup, enables the SQL admission hook, and allowlists only loopback callback paths with a bounded flow-selector value. Local config cannot fully model the hosted Email-provider toggle, so the application also rejects live access tokens unless immutable app metadata identifies Google and the signed authentication-method reference contains OAuth. Unit tests exercise the installed SSR SDK's real authorization URL and cookie behavior without contacting Supabase or Google. pgTAP covers admission, bypass defense, immutable binding, grants, RLS visibility, and atomic provisioning.

An expired or already-used authorization code returns the generic sign-in error. Start again from `/sign-in`; no provider detail, code, token, or owner email is reflected to the page or log.

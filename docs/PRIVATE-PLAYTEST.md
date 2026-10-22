# Private family playtest on Cloudflare

This deployment uses a Cloudflare Worker, bundled static game assets and one D1 database. A family password protects **every game asset and API**, not just the title screen. Five profiles are shared by the family; names select businesses, rather than acting as passwords. Use Save & Quit before switching PCs. No domain purchase is required: Cloudflare supplies an HTTPS `workers.dev` address.

## Set up in the Cloudflare dashboard

1. Sign in at https://dash.cloudflare.com/ and choose **Workers & Pages → Create application → Import a repository / Continue with GitHub**. Use **Workers**, rather than a static Pages deployment. Authorize access only to `kpmgdj5cdg-creator/test-lemonomics` and select that repository and its `main` branch.
2. Name the Worker **lemonomics-family**. Root directory is the repository root. Set **Build command** to `npm run build`, and **Deploy command** to `npm run cloud:publish`. The package lock pins Wrangler. Leave the free plan selected.
3. Deploy. Wrangler automatically creates or reuses the D1 database named `lemonomics-family`, binds it as `DB`, uploads the game, and applies the checked-in SQL migration. The build token needs **Account → D1 → Edit** as well as Workers deployment access. If the log reports permission denied for D1, edit the selected build token's account permissions and rerun the build. Do not create a second database on each deployment.
4. On the deployed Worker's **Settings → Variables and Secrets**, add **Type: Secret**, **Name: `FAMILY_PASSWORD`**, **Value: a family password of at least 12 characters**. Save/deploy the change. Do not use your GitHub or Cloudflare login password. This value must be a runtime Worker secret, not a Vite build variable or a value committed to GitHub. Until it exists the site deliberately returns “Family access is not configured yet” and serves no game/profile data.
5. Open the HTTPS `workers.dev` URL shown on the Worker overview, enter the family password, and create a profile. Test Save & Quit, then load the same profile in another browser/PC. Share that URL and password with the boys. The link alone does not grant access. The title screen's **Lock family playtest** button signs that browser out.

The exact dashboard wording can change. If Import from Git is not offered in the Create application screen, select the option for a Worker connected to a Git repository, not an upload-only static site.

## Local verification / command-line deployment

Requires Node.js 24. Run:

```sh
npm ci
npm run build
npx wrangler d1 migrations apply DB --local
npx wrangler dev --var FAMILY_PASSWORD:family-local-testing-only --port 8787
```

In another terminal, `npx playwright test --config playwright.cloud.config.js` checks actual password login, a female avatar, a bank loan, saving, loading in an independent browser, network-failure handling, and logout. Use a fresh local D1 database for this fixture; it uses slot 0. `npm test` covers privacy, origin checks, login throttling, independent slots, concurrent-save conflicts, checkpoints and retries against SQLite.

To deploy from your own terminal instead of the dashboard:

```sh
npx wrangler login
npm run cloud:deploy
npx wrangler secret put FAMILY_PASSWORD
```

Wrangler's login opens Cloudflare authorization in your browser. Enter the family password at the secret prompt; don't put it in shell history. The deploy command creates/reuses the database and applies migrations. If you use multiple Cloudflare accounts, select the intended account when prompted. Keep `DB` bound to the same database in later deployments. No personal access token is needed for this browser-based authorization route.

## Saves and recovery

Online profiles live in D1 and persist across deployments. The online site's profile slots begin empty; downloaded browser-local saves are preserved separately and are **not automatically copied over**. Original offline games and legacy local-save migration still work. This first online release does not include an import UI.

Every local business action creates a browser recovery checkpoint and queues an upload. Save waits for the server confirmation, checks market data and confirms the resulting save before quitting. Network failure keeps the game open. A browser closed before an upload is confirmed may have newer data than the online version: its title screen offers **Download browser backup**. That JSON is a recovery artifact; keep it for support/recovery rather than editing it. It is separate from the online database and original local-save keys. A failed save never silently switches the website to local-only mode.

If the same profile is opened on two PCs at once, the first confirmed save wins. Later stale saves are rejected instead of overwriting it. The rejected browser retains its recovery checkpoint. Quit/save one PC before continuing on another. Different slots can save independently. A lost network response can also require reloading the confirmed online version; download the browser backup first if needed.

For an owner backup, use Cloudflare's D1 export command after logging in:

```sh
npx wrangler d1 export DB --remote --output lemonomics-family-backup.sql
```

Store exports privately; they contain all family progress. D1's dashboard also exposes recovery/Time Travel; retention and free-plan limits are controlled by Cloudflare. Do not publish exports in this public GitHub repository. Changing `FAMILY_PASSWORD` invalidates existing sign-in cookies. Cookies otherwise expire after seven days. This is a shared family test, not a public account system with individual passwords or parental roles.

## Prices and operating limits

New games and explicit Save request `/api/market`. The client requests six fixed fund refresh endpoints only when a later prior-session close is needed. Each authenticated Worker request processes one Yahoo history to keep individual requests small; D1 shares the cached histories and throttles failed/incomplete refreshes for 15 minutes. A final market request publishes only a complete snapshot with one common closing date. Only a complete, validated, non-regressing snapshot can replace saved prices. No simulated prices are substituted. The bundled snapshot is the fallback until live requests succeed; stale prices stay visible and trading waits for fresh prior-close prices.

Provider access must be checked on the deployed Worker: local tests can verify failure retention but cannot establish that Yahoo will accept requests from Cloudflare. Check the displayed price date before testing investments. Yahoo's public endpoint can impose limits or change. Worker CPU, request and D1 quotas also apply on the free plan; a small family test should use little storage, but Cloudflare controls quotas and plan terms. If a refresh hits a limit the prior snapshot remains intact. No paid plan, subscription or automatic upgrade is enabled by this project.

## Deployment verification checklist

- An unsigned browser goes to the family login even when requesting a direct `/assets/...js` URL; `/api/profiles` returns 401.
- Sign in, create one profile, borrow money, Save & Quit; another browser sees the same avatar, day and checking balance.
- Losing connectivity during Save keeps the game open with an error and browser backup; reconnect and retry.
- Re-deploying code retains the same five slots. Locking the game removes access to profile APIs.
- Confirm the investment price date and complete one reviewed purchase with fresh prior-close data. Fresh upstream pricing and real account deployment are final live checks, not guaranteed by the local test run.

The house/mortgage update adds migration `0004_mortgage_rate.sql`, applied by the existing publish script. It adds only a mortgage-rate cache; existing profile records and passwords remain unchanged. `/api/mortgage-rate` is protected by the same family login. The Worker fetches the public FRED `MORTGAGE30US` CSV without an API key; the hourly cache and retry lease keep provider requests bounded. A failed provider fetch retains the most recent quote, while stale or absent quotes disable new mortgages until refresh succeeds. Existing mortgages retain their original fixed rate.

The prepared Alpaca update supersedes prior-close execution for the normal Investments Buy/Sell UI. It remains disabled until the Free plans, private display rights and paper-account market-data credentials are confirmed. Existing prior-close corporate actions and collateral repayment remain for compatibility. Read [Alpaca activation and limits](ALPACA-LIVE-SETUP.md) before deploying this update; no real live quotes or account billing configuration were verified in the implementation workspace.

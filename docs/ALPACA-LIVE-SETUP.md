# Private Alpaca Basic market data — activation and limits

The code is implemented and tested with explicitly labeled synthetic Alpaca responses. No Alpaca credentials were available for this implementation, no real live quotes were verified, and the Cloudflare/Alpaca account billing plans were not independently verified. **Do not activate or deploy this update until the checks below are complete.** No account plan, subscription, billing setting or license has been changed.

## Verify before deployment

1. In Cloudflare, confirm the account's **Workers plan is Free**, the existing D1 database remains on Free allowances, and no paid Workers subscription or usage-based overages apply. Do not rely on a previous intention to use Free. If the dashboard is unclear, stop and resolve that before deployment. Check current [Workers limits](https://developers.cloudflare.com/workers/platform/limits/) and [D1 pricing/limits](https://developers.cloudflare.com/d1/platform/pricing/).
2. In Alpaca, confirm **Basic (free)** US stock market data with the **IEX** feed. Do not enroll in paid SIP, change subscription settings or enable automatic upgrades. Check the current [market-data plan documentation](https://docs.alpaca.markets/us/docs/about-market-data-api). This implementation never requests `feed=sip`.
3. Confirm Alpaca's applicable terms permit your intended private household display. An individual Basic entitlement is not permission to publicly redistribute data. Keep the family password protection enabled; do not publish these endpoints or a market-data proxy publicly. If the intended access needs additional rights that are not established, leave this integration disabled. No paid data license is authorized.
4. Use **paper-account API credentials**. This app uses the paper account's read-only calendar API and the separate stock market-data API. It does not require funding an account and contains no brokerage order submission. Do not send API keys in chat, commit them, paste them into source, or put them in a browser environment variable.

## Configure the existing Worker

The project already uses `cloud/worker.js`, the `lemonomics-family` Worker, the existing D1 `DB` binding, and family-password login. There is no new database, Durable Object, queue, analytics service or paid dependency.

After verification and code review:

1. Publish the prepared source through the repository's existing Cloudflare workflow. Its existing deployment script applies `0005_live_market.sql`, adding two tables in the existing database. No profiles or holdings are deleted or replaced. Leave activation off while migrating.
2. In **Workers & Pages → lemonomics-family → Settings → Variables and Secrets**, add Production **secrets** named `ALPACA_API_KEY_ID` and `ALPACA_API_SECRET_KEY`. Enter their values privately in Cloudflare. Keep `FAMILY_PASSWORD` unchanged.
3. Only after the plan and private-use checks are satisfied, add the ordinary server variable **`ALPACA_LIVE_ENABLED` = `true`**, then deploy the variable change. Missing keys or any other activation value produces a disabled response and makes no Alpaca requests.
4. Open the private game during a regular US market session. Verify six timestamped IEX fund cards, market calendar status, a reviewed virtual purchase/sale, checking and holdings, and one chart per fund. This real-account check remains outstanding until credentials are configured.
5. To stop new upstream requests, set `ALPACA_LIVE_ENABLED` to `false`. Holdings and transaction records remain. Rotating credentials clears an authorization-failure lock, while retaining the safety counters.

Local testing uses mocked responses. `npm run dev` and the static Node preview explicitly expose disabled live routes, never provider secrets. For authorized local Worker development, copy `.dev.vars.example` to ignored `.dev.vars`, choose a private local password, apply `npx wrangler d1 migrations apply DB --local`, and run `npm run cloud:dev`. Do not enable real upstream credentials until the same plan/private-use checks are satisfied.

## Data and execution rules

- All provider requests are server-side `GET` calls to a closed allowlist: IEX multi-symbol snapshots, IEX stock bars, and the paper-account market calendar. The browser uses authenticated same-origin `/api/market/quotes` and `/api/market/history?symbol=SPY&range=1D`. There is no brokerage order route, no public CORS proxy and no browser Alpaca authentication.
- The existing secure family cookie is required before either endpoint can run. CORS is not used as authentication. Keep the family link/password private and review Alpaca's terms before allowing additional users.
- Calendar data comes from Alpaca and includes holidays, DST and early closes. A local Eastern-time schedule is only an informational fallback; **it cannot authorize trades**. Paper credentials must work with the calendar endpoint as well as IEX snapshots.
- During regular hours, the shared snapshot cache lasts five seconds. One response covers DIA, SPY, ARKK, SGOV, GLD and SLV. Browser polling stops in other bank tabs, on leaving the bank/title screen and when the browser is inactive. Closed sessions use a five-minute interval, with a wake-up at opening.
- The original ETF trade timestamp is retained. A symbol need not have a new IEX trade each poll. A virtual trade requires a verified open session, a snapshot fetched within 15 seconds and a valid same-session IEX trade within two minutes. Sparse IEX trading, especially in some ETFs, can therefore temporarily disable that fund even while the broader market is open. No stale close, fabricated tick or paid feed is substituted.
- Immediate trades are disabled outside regular hours. There are no queued market orders. Rechecking at confirmation prevents expired/repriced quotes, overspending, overselling and repeated confirmation from changing balances improperly.
- The existing 0.5% fictional buy/sell fee remains, minimum one cent. A **live buy entered in dollars is a total budget including that fee**, so a player with exactly $20 can invest $20 without needing extra fee money. Shares use whole millionths; currency uses rounded integer cents. The review shows notional value, fee and actual checking movement. Legacy transaction records retain their original amounts and fee interpretation.
- New transactions record profile/account ID, ticker, side, quantity, price, quote and execution time, fee, cost basis, realized result and game day. Old records remain. Unrealized gains only change investment valuation; they never become checking cash. Live marks are saved with the normal profile save, without forcing an online profile write every five seconds.
- Quote time is actual market time, separate from lemonade days. Existing prior-close corporate-action and secured-loan processing remains for compatibility, including previously recorded distributions; the new live marks do not invent distributions, splits or returns for simulated game days. Historical fund charts use Alpaca price bars, **split adjusted and excluding distributions**, not a claim of total investment return.

## Global caching and strict ceilings

`LiveMarketService` uses the existing **single D1 database** for cache records, refresh leases and an atomic SQL request budget. A primary-first D1 session is used when supported. Every upstream call must reserve a budget slot; concurrent refreshes for one cache key share a lease. This is not an assumption that Cloudflare edge caches are globally synchronized. All replicas/deployments using these credentials must share this same database; another application or database with the same Alpaca account is outside this guard's scope.

The independent hard ceilings are:

| Control | Limit |
|---|---:|
| Snapshot cache while open | 5 seconds globally per database |
| Closed-session cache | 5 minutes |
| Any upstream call gap | At least 1 second |
| All Alpaca calls per minute | 30 |
| All Alpaca calls per UTC day | 5,500 |
| Historical pages per selection refresh | 4, on later paced calls |
| Returned chart observations | 1,600 actual observations |

At a full 6.5-hour session, snapshots need about 4,680 calls per day regardless of three concurrent players. A family of three polling throughout the session uses about 14,040 Worker quote requests, plus history, closed-session and normal game requests. D1 cache/guard writes are on the order of four affected rows per successful upstream call, plus bounded refresh coordination. These are sizing estimates, not an assertion about an uninspected billing account or guarantees for arbitrary public traffic. Verify the current Free allowances and the rest of this account's usage before activation. If a Free limit is reached, do not upgrade; retain cached data and wait or reduce use. Free limits can interrupt the game and online saves; existing browser recovery backups remain important.

- HTTP 429 honors a conservative delay including provider `Retry-After`, with no tight retry loop.
- HTTP 401/403 stops subsequent upstream calls until credential rotation or administrative correction.
- Network/invalid-response errors apply exponential backoff and retain the last valid data with its original timestamps.
- A daily safety-budget exhaustion pauses calls until the next UTC day. Clicking Refresh cannot bypass the client throttle, shared cache or SQL budget.
- No code changes a plan, submits a subscription, calls billing APIs or enables paid infrastructure. If Free allowances or display rights cannot be established, **leave this update unactivated and report that limitation**.

## Historical charts

Alpaca `feed=iex` bars are fetched only for requested chart selections, with cache reuse and paced bounded pagination. History intentionally ends at least 16 minutes before the request to avoid relying on a paid latest-history entitlement. No SIP fallback is attempted.

| Range | Bars | Cache |
|---|---|---:|
| 1D | 1 minute, latest available session | 1 minute |
| 1W | 5 minutes | 5 minutes |
| 1M | 1 hour | 15 minutes |
| 3M | Daily | 1 hour |
| YTD (retained) | Daily from January 1 | 1 hour |
| 1Y | Daily | 6 hours |
| 5Y | Weekly | 1 day |

The existing YTD selection is retained in addition to the six requested periods. Offline or disabled deployments can inspect saved legacy adjusted daily history on longer ranges, clearly labeled read-only and separate from live Alpaca price bars; that history cannot authorize a new trade. Missing/restricted/pending data is labeled. Truncated history is bounded to actual observations; no prices are synthesized. Inspect a point with pointer or keyboard to see the real price and Eastern timestamp, alongside the player's purchase cost where available. The portfolio chart uses recorded holdings/trades and observations; cash added is not treated as investment profit.

## Verification record

Tests use explicitly labeled synthetic Alpaca fixtures and in-memory SQLite D1 adapters. They cover global cache sharing, quotas, pagination, all funds/ranges, stale/missing/invalid data, failures, market sessions, fractional-share accounting, account records, quote changes and expiry, legacy holdings, independent game days, browser polling pauses, interactive charts and phone layout. No live-provider success or account billing verification is claimed by these tests.

Official API references: [market data](https://docs.alpaca.markets/us/docs/about-market-data-api), [historical bars](https://docs.alpaca.markets/us/reference/stockbars-1), and [market calendar](https://docs.alpaca.markets/reference/getcalendar-1). The endpoint shapes were also checked against Alpaca's official `alpacahq/alpaca-py` SDK. Access to the hosted documentation from the implementation workspace was restricted; verify current entitlements and terms in the provider account before activation.


## Private connection diagnosis

After signing in to the game, open `/api/market/diagnostics` on the same host. This authenticated read-only route reports whether the two Runtime secrets are present (never their values), whether activation is enabled, D1 cache availability, current backoff, and the most recently recorded failure's operation and HTTP status. It makes no Alpaca calls and does not reset quotas or backoff. Diagnostics only record failures after this diagnostic release; an earlier failure can have `lastFailure: null` until the next normally permitted retry. Provider response bodies, raw error messages, URLs, headers and credentials are never stored in diagnostics.

The calendar connection fix uses Workers-supported `redirect: 'manual'` and rejects HTTP redirects without forwarding secrets. A regression test exercises the native Workers Request implementation in workerd. Migration `0006_calendar_runtime_fix.sql` releases the old cold-start calendar backoff once after this runtime correction; it preserves request counters, next-call spacing, authorization stops, cached-data backoffs, profiles and holdings.

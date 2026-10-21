# Lemonade Lane

An offline lemonade business game with four voxel environments (Neighborhood, Park, Downtown, Waterfront), keyboard and touch avatar controls, banking, investments, and financial statements.

## Play

Download `downloads/Lemonade-Lane-Offline.zip`, extract it, and open `Lemonade-Lane.html` in Chrome, Edge, or Firefox. The standalone HTML also works without installation or an Internet connection. Keep the same file location and browser to retain progress. Browser storage permissions still apply.

New businesses start with no cash, supplies, or recipe. Borrow startup funds at **Bank → Loans**, withdraw checking money, enter a nonzero recipe, and buy supplies before opening. Investments use checking money. Walk around Downtown to visit BOOKS to the left of the bakery and Maple Market behind the bakery across the side street. WASD/arrows, the on-screen movement pad, E, and Escape retain their existing behavior; reaching a shop door opens its prompt.

## Development

Requires Node 22 or later and Python 3. No application server or credentials are needed to play offline.

```sh
npm ci
npm run build
npm test
npm start
```

`npm run build` bundles editable source into the standalone HTML and refreshes the downloadable ZIP. It does not fetch market quotes or require a CDN. `npm start` serves the downloads directory locally on port 8000. Stop that process when finished.

Source layout:

- `src/business.js`: game state, business actions, banking and UI integration.
- `src/finance.js`: recipes, loan eligibility, repayments, collateral liquidation, insolvency.
- `src/reports.js`: daily financial statements and offline Excel/CSV writers.
- `src/engine.js`: extracted original Three.js r186 bundle, all four voxel environments, avatar movement/collisions, investment UI and embedded historical market data. Small integration additions provide shop interactions and collateral sale protection.
- `src/index.html`: editable page and styles; the build inserts the game bundle.
- `scripts/`: standalone HTML and ZIP build steps.

No unavailable commit was used. Source was extracted from `aa2af8e`, the actual existing release. `e8cc532` was absent. The original commit remains intact; staged changes are pushed to `playability-reimplementation`.

## Validation

`npm test` runs financial and reporting unit tests. With Python Playwright and system Chromium available, run:

```sh
python3 tests/browser_smoke.py
python3 tests/playability_browser.py
```

These verify all four worlds and avatar movement, banking and browser saves, the Excel workbook, collision-safe paths to both shops, ownership-gated exact recipe bonuses, resale, early loan payoff, insolvency/restart, projections, and a complete selling day. The integration suite uses isolated browser saves and never alters the user's browser data. Its path checks drive the existing avatar collision system; no gameplay teleport feature is introduced.

## Save compatibility and financial rules

The existing `lemonadeLane_bank_v3` storage key, fallback `lemonadeLane_zero_v2`, inventory, lemon lots, upgrade IDs, portfolio microshare units, and historical records are retained. New fields are additive. Existing recipes are preserved; only new games start at zero. Old results that lack recipe or upgrade metadata say “not recorded.” Starting another game is an explicit action in the closure dialog; no migration resets a save.

- Park permits cost $6 per day.
- Good/Better/Best recipes cost $10/$25/$50 once and increase visitors 10%/15%/20% only when owned **and** matched exactly. Ingredient controls change by 0.1. Buying one never purchases another tier automatically.
- Maple Market pays 50% of supply/equipment acquisition cost. A confirmation precedes each sale; sold equipment loses its effect. Prepared unsold lemonade remains perishable.
- Investment-backed loans require at least $100 in portfolio value. Aggregate outstanding secured principal is limited to 50% of portfolio value and capped at $10,000; cash and checking do not increase that limit. Credit score does not limit collateral loans. Market declines do not create forced margin calls; they reduce eligibility for new borrowing.
- Loan term interest is 10%, recognized as expense at origination. Five installments are due every five game days. All loans can be repaid in full from checking at any time; no early-payment penalty or interest refund applies. Missed payments lower the game credit score by 35 points.
- A missed secured payment liquidates enough collateral to cover its installment and a disclosed 2% liquidation fee ($1 minimum). Uncovered debt/fees remain owed. Pledged investments cannot be sold below required collateral while debt remains; full repayment releases them.
- An insolvent business with outstanding debt and established good credit (670+) can receive a $25 emergency advance, plus $2.50 interest, added to its loan once per game day. Any emergency advance on a secured loan is unsecured and does not enlarge the amount backed by investments. Sellable equipment prevents premature closure.
- A business with no cash, checking, investments, sellable inventory/equipment, or borrowing option can close. It retains charts and financial exports; restarting requires choosing Yes.

Books offers a genuine `.xlsx` workbook with Income Statement, Balance Sheet, and Statement of Cash Flow. Income statements include daily columns and totals, realized investment income/distributions, loan interest, and resale gains/losses. Inventory and equipment remain assets until consumed, spoiled, or sold. Cash flow reconciles stand cash plus checking and excludes internal transfers. The balance sheet explicitly identifies opening equity/unrealized investment adjustments because old saves may contain balances without a complete historical ledger. CSV versions remain available.

Results & Projections shows seven days of income/expenses, selectable points, recorded conditions/recipe bonuses, and equipment purchase markers. Estimates use the current recipe, location, weather, price, service speed, popularity upgrades, competition, and capacity; random customer choices can differ. Projection income excludes future investment/financing events.

## Offline pricing limitation

The included market data is dated October 19, 2026. Stale quotes pause voluntary investment trading. Automatic daily pricing requires a separate hosted pricing service absent from this repository. Collateral default recovery uses the displayed portfolio valuation, including saved prices, and records the recovery in the ledger. This release does not claim fresh live prices.

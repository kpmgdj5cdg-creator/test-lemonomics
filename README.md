# Lemonade Lane

An offline lemonade business game with four voxel environments (Neighborhood, Park, Downtown, Waterfront), keyboard and touch avatar controls, banking, investments, and financial statements.

## Play

Download `downloads/Lemonade-Lane-Offline.zip`, extract it, and open `Lemonade-Lane.html` in Chrome, Edge, or Firefox. The standalone HTML also works without installation or an Internet connection. Keep the same file location and browser to retain progress. Browser storage permissions still apply.

New businesses start with no cash, supplies, or recipe. Borrow startup funds at **Bank → Loans**, withdraw checking money, enter a nonzero recipe, and buy supplies. You may open with less stock than planned (even no stock) when you can pay the permit; the warning is informational, and production/sales stay limited to actual inventory. Investments use checking money. Walk around Downtown to visit BOOKS to the left of the bakery and Maple Market behind the bakery across the side street. WASD/arrows, the on-screen movement pad, E, and Escape retain their existing behavior; walking near a shop door does not open it automatically. Click the door or press E while next to it to enter.

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
- `src/neighborhood.js`: editable house positions, street-facing orientations, competitor plot, and walking bounds.
- `src/engine.js`: extracted original Three.js r186 bundle, all four voxel environments, avatar movement/collisions, investment UI and embedded historical market data. Small integration additions provide shop interactions and collateral sale protection.
- `src/index.html`: editable page and styles; the build inserts the game bundle.
- `scripts/`: standalone HTML and ZIP build steps.

No unavailable commit was used. Source was extracted from `aa2af8e`, the actual existing release. `e8cc532` was absent. The original commit remains intact; staged changes are pushed to `playability-reimplementation`.

## Validation

`npm test` runs financial and reporting unit tests. With Python Playwright and system Chromium available, run:

```sh
python3 tests/browser_smoke.py
python3 tests/playability_browser.py
python3 tests/part_two_browser.py
```

These verify all four worlds and avatar movement, banking and browser saves, the Excel workbook, collision-safe paths to both shops, ownership-gated exact recipe bonuses, resale, early loan payoff, insolvency/restart, projections, and a complete selling day. The second-round suite also needs Python openpyxl to independently inspect the downloaded workbook (available in the prepared cloud environment). It checks six-fund $1 trading with old saved prices and a $5.84 checking balance, 10% fees, zero-checking sales, taste-test charges, notification dismissal, limited/zero-stock selling days, and workbook presentation. The integration suites use isolated browser saves and never alters the user's browser data. Its path checks drive the existing avatar collision system; no gameplay teleport feature is introduced.

## Save compatibility and financial rules

The existing `lemonadeLane_bank_v3` storage key, fallback `lemonadeLane_zero_v2`, inventory, lemon lots, upgrade IDs, portfolio microshare units, and historical records are retained. New fields are additive. Existing recipes are preserved; only new games start at zero. Old results that lack recipe or upgrade metadata say “not recorded.” Starting another game is an explicit action in the closure dialog; no migration resets a save.

- Park permits cost $6 per day. Limited supplies never block opening if the recipe is valid and the permit is affordable. A batch can contain fewer cups than planned, down to zero; ingredients and cups are consumed only for the actual batch. Unsold prepared cups are still discarded. The full permit is charged even with zero stock.
- Owner taste tests cost $0.50 in stand cash, are recorded as an expense, and rate the current mix from 1 to 10. An exact owned Good/Better/Best recipe guarantees satisfaction 7/8/9 and is used in customer purchase interest. Other mixes are scored from their ingredient balance and weather. Changing the mix or weather invalidates the displayed previous test; reloading the same mix retains it.
- Good/Better/Best recipes cost $10/$25/$50 once and increase visitors 10%/15%/20% only when owned **and** matched exactly. Ingredient controls change by 0.1. Buying one never purchases another tier automatically.
- Maple Market pays 50% of supply/equipment acquisition cost. A confirmation precedes each sale; sold equipment loses its effect. Prepared unsold lemonade remains perishable.
- Investment-backed loans require at least $100 in portfolio value. Aggregate outstanding secured principal is limited to 50% of portfolio value and capped at $10,000; cash and checking do not increase that limit. Credit score does not limit collateral loans. Market declines do not create forced margin calls; they reduce eligibility for new borrowing.
- Loan term interest is 10%, recognized as expense at origination. Five installments are due every five game days. All loans can be repaid in full from checking at any time; no early-payment penalty or interest refund applies. Missed payments lower the game credit score by 35 points.
- A missed secured payment liquidates enough collateral to cover its installment and a disclosed 2% liquidation fee ($1 minimum). Uncovered debt/fees remain owed. Pledged investments cannot be sold below required collateral while debt remains; full repayment releases them.
- An insolvent business with outstanding debt and established good credit (670+) can receive a $25 emergency advance, plus $2.50 interest, added to its loan once per game day. Any emergency advance on a secured loan is unsecured and does not enlarge the amount backed by investments. Sellable equipment prevents premature closure.
- A business with no cash, checking, investments, sellable inventory/equipment, or borrowing option can close. It retains charts and financial exports; restarting requires choosing Yes.

Investment buys and sells charge a 10.0% fee on the trade value, rounded to cents with a $0.01 minimum. Purchases debit value plus fee from checking; sales subtract their fee from proceeds and need no checking funds. Dollar-mode $1 trades therefore pay $0.10 in fees. Existing historical trades keep their original fees. The UI displays the quote date and uses the last available saved closing prices during feed delays; it does not pretend the quotes are live. Portfolio split/date consistency checks and collateral-sale restrictions remain in place.

Books offers a genuine `.xlsx` workbook with Income Statement, Balance Sheet, and Statement of Cash Flow. Income statements include daily columns and totals, realized investment income/distributions, loan interest, and resale gains/losses. Inventory and equipment remain assets until consumed, spoiled, or sold. Cash flow reconciles stand cash plus checking and excludes internal transfers. The balance sheet explicitly identifies opening equity/unrealized investment adjustments because old saves may contain balances without a complete historical ledger. CSV versions remain available. Workbook presentation follows the supplied reference: wide description/amount columns, dated headers, section spacing, accounting formats with zero dashes, red negative values, bold totals and final double rules. Income Statement freezes its day/header panes. Financial calculations remain derived from the game ledger; liabilities retain their accounting sign so the balance sheet reconciles.

Results & Projections shows seven days of income/expenses, selectable points, recorded conditions/recipe bonuses, and equipment purchase markers. Estimates use the current recipe, location, weather, price, service speed, popularity upgrades, competition, and capacity; random customer choices can differ. Projection income excludes future investment/financing events.

## Offline pricing limitation

The included market data is dated October 19, 2026. Trading continues at the last available saved closing prices when the expected update is delayed. The displayed date identifies the quotes used. Automatic daily pricing requires a separate hosted pricing service absent from this repository. Collateral default recovery uses the displayed portfolio valuation, including saved prices, and records the recovery in the ledger. This release does not claim fresh live prices.

## Neighborhood and shop interactions

The neighborhood's rear houses are spread farther apart, with front doors facing their nearest street. Each backyard has a short white picket fence and exactly two small trees. The fence between the main stand and the nearby house is removed; the competitor and its plot are moved fully clear of the road/sidewalk, with the obstructing tree removed. The overview camera and walking bounds include the relocated houses. Other voxel environments and avatar controls remain intact.

Neighborhood messages have a working, mouse-accessible OK button and retain dismissal across redraws/reloads. Downtown bookstore and Maple Market entry is deliberate: approach and press E, click the door, or use the nearby on-screen interaction button. Proximity alone does not open a shop.

# Lemonomics

A browser business game with four voxel environments, playable avatars, banking and fund investments. Five player profiles now keep separate businesses, while existing single-business saves migrate without losing progress.

## Run locally

Use Node.js 24 and npm:

```sh
npm ci
npm run dev
```

Open the address printed by Vite. On the Lemonomics title screen, choose one of five slots, enter a name (1–16 letters), and choose a male or female avatar. An existing save appears as **Player** in the first slot. Click a saved name to continue. In the game, click the lemonade stand to inspect its exterior, then choose **Inside stand** for the 3D cutaway. **Back to neighborhood** returns to the map. Drag, or focus the scene and press the arrow keys to rotate. Escape returns to the neighborhood. Focus the scene before using the scroll wheel to zoom. Touch dragging and the view buttons work on tablets and phones. Reduced-motion preferences make camera transitions instant and disable walking swings.

For a single-file version, run `npm run build` and use **`dist/lemonade-lane.html`**. It contains all JavaScript, Three.js, styles, and geometry in one HTML document, with no CDN, module imports, or sibling files to load. Do not open the repository's source `index.html` directly: that development entry needs Vite. The single-file build also works in script-enabled sandboxed iframes; browsers that deny storage in a sandbox cannot persist saves there. WebGL must be available in the viewing environment.

The build also writes `lemonade-lane-park.html`, `lemonade-lane-downtown.html` and `lemonade-lane-waterfront.html` as identical standalone review files, so links from the staged design reviews remain available after rebuilding. Each file contains all four locations; select the location in the game. Existing saves keep their selected location.

A new business still starts with **$0 and no inventory**. Use Bank → Loans, borrow money, withdraw it on Account, and buy supplies before starting the day. No debug money or inventory is granted.

## Private online family test

The Cloudflare Worker adds password protection, a shared D1 database for five profiles, confirmed online saves, conflict detection and browser recovery checkpoints. Follow [the private playtest setup](docs/PRIVATE-PLAYTEST.md) to connect the repository in Cloudflare and obtain the HTTPS testing link. No hosting account credentials or family password belong in this repository.

## Build and deploy

```sh
npm run build
npm run preview
```

Deploy the generated `dist/` directory to a static web host. Three.js is bundled locally; the game does not load a graphics CDN or require API keys. A WebGL-capable browser is required. Keep the same web origin to keep browser-local saved games available: localStorage does not transfer automatically between domains or from a `file:` URL to a web server. Profiles use the versioned `lemonomics_profiles_v1` storage document. The original `lemonadeLane_bank_v3` and fallback `lemonadeLane_zero_v2` keys are imported once; `lemonomics_legacy_backup_v1` retains an untouched copy. The original active-save key is maintained as a compatibility mirror. Do not clear existing browser storage during migration.

The updated art direction uses a closer orthographic composition, vivid blue and coral buildings, extruded pixel lettering, sculpted palms, white tiled sidewalks, dark asphalt, and directional shadows. The neighborhood panel keeps this art direction, alongside the new Lemonomics title screen and profile controls. The old CSS scene is permanently hidden, including when the graphics cannot initialize; startup failures show a specific message in the scene instead of silently displaying the old art.

## Implementation

- `src/game.js`: the supplied simulation, extracted from the HTML. It remains the authority for money, inventory, demand, queues, service timing, and competitors. Renderer calls do not edit game state or generate sales.
- `src/world.js`: scene, camera transitions, pointer/touch interaction, environment lighting, and customer routing. It consumes game state and exact queue/sale/abandonment/rival events.
- `src/park.js`: the separate park scene, with a stepped pond and fountain, gazebo, playground, picnic tables, connected footpaths, flower beds and broad voxel trees. Stand anchors are shared so existing equipment and camera views work in both locations.
- `src/downtown.js`: multistory shopfronts and apartments, raised bookshop and bakery lettering, café tables, a transit shelter, metro entrance, traffic signals, taxi, street trees and a paved plaza. It uses the existing `square` saved-location key and $9 permit. The city has its own six distant pedestrian routes and camera framing, plus rain, roof snow, and snow banks beside the curbs. Exterior and interior views and saved equipment work here as in the other scenes.
- `src/waterfront.js`: the beach and seaside boardwalk, with shallow-water color bands, gently moving voxel surf, a walkable pier, moored boat, lifeguard tower, colorful beach huts, umbrellas, recliners, surfboards and palms. It uses the original `beach` saved-location key and $17 permit. Visitors enter from promenade ends, dune paths and the pier; nobody has to walk across open water. Surf movement stops under reduced-motion preferences. Snow covers the land and roof surfaces while leaving the ocean visible; rain puddles stay on the boardwalk.
- `src/traffic.js`: six distant entrance routes per location. A short approach phase runs before the first visitor is counted; after that, the original visitor cadence, queue patience, service steps, demand decisions, and accounting rules run unchanged. Each approaching character keeps its identity when joining the line, leaving, buying or choosing a rival. Routing uses paths and pedestrian crossings rather than straight lines through buildings.
- `src/weather.js`: 3D rain streaks, puddles, snowflakes, and snow on lawns, roofs and tree tops. Weather comes from the actual daily forecast: rain on Day 4 and snow on Day 8 of the eight-day cycle. Snow has its own cold-weather visitor multiplier; the first seven forecasts retain their prior values. The cutaway suppresses precipitation inside the workspace. Reduced-motion mode keeps precipitation static.
- `src/models.js`: reusable voxel houses, vegetation, fences, street furniture, stands, equipment, and walking characters. Static boxes are merged by material, pixel density is capped, and there is one shadow-casting light.
- `src/capacity.js`: actual producible cups from inventory and the per-ten-cup recipe, including the original free-ice equipment rule. Interior capacity no longer reports the planned batch as available inventory. The planned batch is still used by the unchanged opening and accounting rules.
- `src/scene.css`: styling scoped to the neighborhood panel. The original business UI remains in `index.html`; hidden legacy scene elements retain IDs used by existing rendering code but are never displayed.

All thirteen existing upgrades have physical representations: manual and powered juicers, extended shade, register, refrigerator, ice dispenser, classic architecture, speakers, landmark signage, neon sign, drink dispenser, automatic ice maker, and the larger castle structure. The roof is removed for the interior cutaway; inventory crates fill only when stock exists. Equipment appears on purchase and when restoring a save. The competitor appears beginning on Day 4, using the original competition calculations.

Customer identity is preserved from the simulation's queue objects. Serving shows a departing customer with a cup; expiry, refusal, and closing show departures without cups. Rival decisions route characters to the rival stand. No background sales animation changes financial outcomes.

Neighborhood and Park are now distinct choices and scenes. Both use the original $4 permit and family-foot-traffic parameters; banking and accounting formulas are preserved. New games start in Neighborhood. Version 4 and older saves with `location: 'park'` showed the original neighborhood, so they migrate to `location: 'neighborhood'` in version 5 to preserve the player's existing setting, balance, inventory, upgrades and history. Version 5 Park saves restore the new park.

All four locations now have distinct scenes. Downtown retains its original foot traffic, price sensitivity, customer spending, $9 permit, competitor prices and accounting rules. Waterfront retains its $17 permit, $2.75 competitor price, sunny-weather demand and original rainy-beach traffic rule. Existing `square` and `beach` saved locations restore their respective city and beach scenes without changing the save format. The approved Neighborhood, Park and Downtown designs and camera framing are retained.

## Verification

```sh
npm test
npm run test:browser
```

Browser tests use Chromium at `/usr/bin/chromium`; override with `CHROMIUM_PATH=/path/to/chromium` if needed. They use software WebGL for compatibility in the cloud. Tests start Vite if necessary and use isolated browser contexts; they do not clear a real player's saves. Tests exercise fresh startup, the three views, selection and keyboard controls, loans and withdrawal, supplies, an actual upgrade purchase, full trading days in all four environments with accounting and renderer event totals, distant origins, restored equipment and rivals, legacy save migration, location switching, rain and snow, offline sandboxed standalone files, and phone viewports. Route tests check that Waterfront visitors stay on the pier over water and clear the huts and rival platform. Screenshots are written to `artifacts/`, including `park.png`, `downtown.png`, `waterfront.png`, each location's rain and snow, and the exterior and interior views.

Cloud tasks are already isolated. Use the existing checkout; do not create a Git worktree unless explicitly requested.

### Playable avatar in every location

Choose **Walk around** in any location panel. The avatar waits behind the counter before walking and returns there when exploration ends. Each walk starts at the front of your lemonade stand. Use WASD or arrow keys to walk relative to the camera, or hold the directional buttons on a touch screen. Drag the scene to turn the camera. The camera follows the avatar; choose **Overview** or press Escape to return. Near your lemonade stand, press E or choose **Visit my stand** to inspect it. Walking is available in Neighborhood, Park, Downtown and Waterfront; it does not change business transactions, visitor decisions or saved finances. Changing locations returns the avatar behind the new stand’s counter. Exploration position resets on page reload.

`src/avatar.js` owns the versioned appearance profile and `PlayerAvatar.setAppearance({skin, hair, shirt, pants, shoes})` (six-digit hex colors). Rebuilding appearance preserves the avatar's position and heading. Named head, hair, body, arm and leg slots provide attachment points for future clothing meshes and avatar choices; there is no wardrobe or appearance picker yet. `src/player-movement.js` contains renderer-independent movement and collision logic, while `src/player-controller.js` manages input, proximity interaction and the rig. The world captures individual scene solids before static mesh batching so buildings, fences, trees and props block walking. Stand footprints update with upgrades. Each location captures its own collision geometry before batching. `WALKING_AREAS` supplies area bounds and semantic barriers: the Park pond, Downtown subway stairwell and Waterfront ocean. The beach and pier are walkable; the avatar follows the raised promenade/pier height and lower sand. New locations can reuse the same controller by supplying collision geometry, bounds, safe terrain heights and stand anchors.

### Bank investments and daily fund prices

The Investments tab offers DIA (Dow), SPY (S&P 500), ARKK (High Risk Fund), SGOV (Low Risk Fund), GLD (Gold) and SLV (Silver). Compare adjusted fund returns over 1W, 1M, YTD, 1Y and 5Y, or select **My portfolio** to chart net dollar gains/losses after fees. The chart supports pointer inspection and keyboard left/right/Home/End. Portfolio history starts at the first purchase and replays saved transactions against daily market history, including intervening sessions when the game was closed. Adding checking money does not appear as an investment gain.

Purchases debit checking; sales credit checking. Both accept dollars or fractional shares (six decimal places). Dollar amounts exclude the displayed fee. Every trade has a 0.5% fee, rounded to cents with a $0.01 minimum, a review/confirmation step, and a dated ledger entry. Purchase fees enter cost basis; partial sales use average cost. A completed sale records realized gains; remaining holdings show unrealized gains. Fund distributions credit checking on the provider's ex-date (a game simplification), and share splits preserve basis. Taxes are not simulated. The existing local save key is retained. Any nonzero legacy placeholder investment balance remains unallocated money that can be moved back to checking without inventing fund holdings.

The bundled `src/data/market-snapshot.json` contains verified Yahoo Finance daily history for all six funds. Only sessions before today's New York date are eligible for trades; weekends, standard NYSE holidays and the 2025 mourning closure are accounted for. The screen displays the exact price date. Trading requires the latest prior session; stale snapshots remain viewable but cannot execute orders. Market dates follow the real calendar, independently of lemonade game days.

Run `npm run dev` for development with the same-origin `/api/market` endpoint, or `npm run build` followed by **`npm start`** to serve the production game and its price service (default port 4173; override with `PORT`). `npm run preview` also supports the endpoint. The server shares an atomic disk cache at `.cache/market.json`, deduplicates concurrent refreshes, and fetches only the six fixed symbols when a newer prior session is needed. Each request obtains five years of daily history; this is six small public-data requests per refresh, not requests for every chart interval or player. A provider failure retains dated cached data, throttles retries and never substitutes simulated prices. No API key is used. Yahoo's public endpoint can change or limit access; `server/market-service.js` isolates the adapter. Test fixtures are clearly labeled and are never bundled.

Use `npm run market:refresh` to refresh the bundled snapshot, then `npm run build` to regenerate the standalone HTML files. The snapshot is updated only after all six histories validate. Node 24's `--use-env-proxy` support is enabled in the server and refresh scripts; cloud access requires `query1.finance.yahoo.com` in the environment's allowed domains. The October 19, 2026 snapshot and five-year coverage were fetched and verified in this workspace.

**Standalone/offline behavior:** the downloaded HTML includes the dated six-fund history, chart and trading engine with no CDN assets. A hosted copy can refresh through `/api/market`. A file opened directly cannot run a daily background price server: its bundled/cached prices remain viewable, and trades pause after that snapshot becomes stale. Serve the game with `npm start` for automatic daily price updates, or refresh/rebuild and download a newer file. Ordinary static hosting alone also needs the API service for daily updates.

Investment review actions run directly in the app and do not depend on native HTML form submission, so the downloadable game works inside previews with `sandbox="allow-scripts"` and no `allow-forms` permission. The amount field supports Enter; review confirmations and validation errors are brought into view without changing balances until confirmation.


### Playability update — October 20, 2026

- Park permits cost $6; Neighborhood remains $4. Weather and expected visitors appear in the scene heading. Rival notices have a persistent OK dismissal; the rotation hint box is removed.
- Walk to the Neighborhood Maple Market door (approach to the left of the planter), or Downtown MAPLE storefront, to sell selected unused supplies or owned equipment for 50% of original cost. Proceeds enter stand cash. Equipment is removed immediately, including its effects and appearance. Prepared lemonade cannot be sold.
- New businesses start with zero recipe ingredients. Type decimal amounts or use the 0.1 steppers. Buy permanent Good ($10), Better ($25), or Best ($50) books by walking to Downtown BOOKS. The purchased book and its exact recipe are both required for the respective 10%, 15%, or 20% visitor bonus; guessing does not unlock the bonus. Previously saved recipes are preserved. Ingredients for all planned pitchers are reserved when opening, avoiding per-cup rounding drift.
- Results & Projections charts seven game days of income and expenses; select a point for details. Stars mark equipment purchases. The checkbox adds a dashed estimate using the current plan and forecast, recipe bonus, upgrade effects, service speed, permit, capacity and ingredient costs. It is an estimate, not guaranteed revenue.
- Books asks whether to export a genuine .xlsx workbook with Income Statement, Balance Sheet and Cash Flow sheets. The income statement includes each game day and totals, investment income (including changes in unrealized gains), loan interest, recipes, spoilage and resale losses. Balance Sheet is aggregate and includes investments. Cash Flow excludes transfers between stand cash and checking and separates operating, investing and financing movements. Interest is recognized upfront when the game's fixed-term loan is issued. Loan repayments, including term interest, are grouped in financing cash flow for this educational game. Equipment stays an asset until sold, without simulated depreciation. Opening/imported equity and cash reconcile legacy saves; no starting money is granted. An additional ledger CSV remains available.
- Investment-secured loans require a portfolio of at least $100, lend 50% of its current value (maximum $10,000), and do not require good credit. These use the existing game's 10% term interest and five installments every five game days. A missed payment reduces credit 35 points once for that due date. It sells enough collateral for the installment and a 1% collection fee (minimum $1), plus ordinary 0.5% selling fees. No fabricated prices: settlement waits for fresh prior-close quotes if offline/stale. Voluntary collateral sales wait until the loan is repaid; Loans also offers Use investments to repay so a player is not trapped with only pledged assets. This sells only what is needed, charges normal trading fees, and charges no collection fee for an on-time voluntary payoff. All loans offer Pay in full at any time from checking.
- If no saleable investments, stock or equipment remain and combined cash/checking cannot cover even the cheapest restart ($15.92 at current pack sizes and permit fees), borrowers with good credit (670+) can add $25 once to an existing loan, with $2.50 term interest. Otherwise, when other credit is exhausted, Start Day becomes Close Business. The closing screen includes a horizontally scrolling daily graph and aggregate income statement. Yes resets; No preserves a closed, Books-only business across reloads.

The financial and shop changes are covered by unit and browser tests, including actual avatar movement to the shop doors and XLSX download validation. `npm test` and `npm run test:browser` run the suites. The downloadable release is regenerated from these sources.


### Expanded suburban neighborhood

The Neighborhood contains 23 street-facing homes along both sides of the main road and side street, with eight facade palettes, pitched/flat/shed roofs, porches, glazing, mailboxes and connected front walks. Each home has a separate fenced rear garden extending 8.8 world units behind its back wall, with a tree and patio furniture. The relocated western house shares Maple Market's front-door line. Property footprints, including fences and landscaping, do not overlap. Streetside trees and furniture leave the new approaches clear.

The sidewalks and lane markings extend past the new blocks. Neighborhood walking bounds cover the residential streets; focus the scene and scroll out to see more of the suburb (neighborhood zoom range 0.4–1.4). The other locations retain their existing bounds and zoom limits. The new roofs support the existing snow accumulation. Source geometry is in `src/neighborhood-homes.js`; collision and door-alignment checks are in `tests/neighborhood-layout.test.js`.

## Player profiles and saving

The plain green title screen has yellow voxel lettering and five independent save slots. Each saved slot shows the player’s avatar, name, game day and last-save time in local `MM-DD-YYYY, HH:MM AM/PM` format. Names allow only A–Z / a–z, up to 16 characters. Avatar appearance is separate from the rig and movement state so wardrobes and additional avatars can be added later.

The upper-right exit icon opens **Save**, **Save & Quit**, and **Back to Game**. Saving first checkpoints progress, requests a fresh market snapshot, applies valid new prices and portfolio events, and saves again. Unavailable or older data leaves the last known prices intact. The simulation pauses while this menu is open. A selling day saved partway through resumes with the same queue, money and inventory, without charging another permit or brewing twice. The end-of-day report also offers **Save or quit**.

Automatic saves still occur after business actions and on page exit. Selecting Save explicitly checks prices; internal automatic saves do not make repeated provider requests. New profiles also check prices immediately. A downloaded `file:` copy uses its bundled or cached prices; automatic daily updates need the existing same-origin `/api/market` service (`npm run dev` or the production `npm start` server). The separate Cloudflare deployment described above adds authenticated online profiles and the price service.

**Downloaded/static copies save locally; the Cloudflare deployment saves online.** Use the same browser, origin, and HTML path to keep profiles available. Opaque sandbox previews show an explicit temporary-save notice and can play with in-memory profiles; opening the downloaded HTML normally enables persistent browser storage. Failed persistent writes keep the game open and retain the preceding save.

`src/profiles.js` is the storage adapter boundary; profile records have stable IDs, a schema version, appearance, timestamps, market date and business state. `src/online-profiles.js` retains this record format while the authenticated Cloudflare Worker persists it in D1 with per-profile revision checks. Player names alone are not login credentials.

Backyards now vary across 23 homes: six retain the original seating, six have round voxel tree canopies, six combine a tree with a circular table near the back door, and five have flower gardens/open lawn.

### Five slots, deletion and 3D avatar previews

The title screen now has five slots. Existing three-slot documents expand in place without changing their original profiles. D1 migration `0003_five_profiles.sql` preserves all existing ids, revisions and business states while widening the slot constraint.

Each saved row has a separate Delete button. A named confirmation dialog defaults focus to Keep saved game. Confirming deletes that business, makes the slot available again, and removes its recovery checkpoint from this browser. Online deletion requires the displayed id and revision; a stale browser cannot delete a replacement save or recreate an erased record. Other computers may retain old browser checkpoints, and previously exported/platform backups are separate from the active save.

Title-screen and avatar-picker portraits are rendered from the same `PlayerAvatar` geometry and appearance as gameplay, using an orthographic camera, directional light, shadows and a grass platform. One shared WebGL renderer caches the resulting portraits, so five slots do not require five graphics contexts or continuous animation.

### Classic Stand storefront

The Classic Stand upgrade now replaces the starter cart with a cream-and-yellow Cooler Cup kiosk: double glazed doors, an open serving window, a striped awning, flat parapet roof, extruded lettering and voxel lemon sign. Its footprint fits the existing plot in all four locations. Purchased shade extends the window awning; powered equipment remains separately owned and appears in the workspace. The cashier position moves behind the service window, and the roof, upper walls and doors lift away in Inside stand view. Snow collects on the flat roof and awning. Saved Classic ownership is sufficient to restore the new geometry; Lemon and Castle remain higher-priority builds.

### Classic Stand first-person room and audio

With Classic Stand equipped, click its double doors or **Enter stand**. The doors swing open and your avatar walks inside. Use WASD or arrow keys to move, drag to look, **E** or the door button to open/close the doors, and **Escape** or **Exit stand** to leave. Phones also have directional buttons. Movement respects counters, walls and the purchased fridge. Save and Quit preserves your interior viewpoint. Other stand styles retain their existing views.

The lime-walled room shares the actual world, weather and live customers outside its windows. Purchased juicers, dispensers and ice maker appear separately on the back counter; Mr. Fridge occupies the back-right corner. The inward-facing EZserve register occupies less than a fifth of the serving counter.

Original synthesized effects accompany controls, purchases, doors, footsteps and sales. The purchased High-Five speaker sits outside on the front-right: click it or **Speaker: Play/Stop** to toggle an original upbeat techno loop. **Sound on/off** mutes audio; music pauses while the game is hidden or a modal is open. Speaker vibration respects reduced-motion preferences. No external music downloads or audio assets are required.

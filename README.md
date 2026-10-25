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

Original synthesized effects accompany controls, purchases, doors, footsteps and sales. The purchased High-Five speaker sits outside on the front-right: clicks cycle **Lemon FM** (upbeat techno), **Neon Nights** (the full Afterglow Drive instrumental), **Velvet Jazz** (Evening Current), then **Off**. The radio button offers the same cycle. **Sound on/off** mutes audio; music pauses while the game is hidden or a modal is open. Speaker vibration respects reduced-motion preferences. The original instrumental is bundled into the game; playback needs no music service. It loads once from the same-origin audio asset when selected.

### Equipped upgrades and the neighborhood house

Owned upgrades now have **Equip this upgrade** checkboxes. Classic, Lemon and Castle are mutually exclusive stand styles; **Beginning Stand** is always available. Unequipping keeps the purchase and its resale value. Equipment benefits and models follow the equipped selection, and selection is saved per profile. Legacy saves keep their highest purchased stand until a player changes it.

The blue, solar-panel house on the north side of the Neighborhood street costs **$400,000**. It appears in Upgrades, with an outright purchase option using checking and stand cash. Bank → Loans offers a **$392,000 mortgage** with **$8,000 down** and a credit score **strictly above 660**. Cash/checking are used first for the down payment; any remaining amount can come from unpledged investments at verified prior-close prices, including normal sale fees. Failed purchases leave accounts and holdings untouched. Pledged investments cannot fund the down payment.

The hosted `/api/mortgage-rate` service obtains Freddie Mac's published 30-year fixed PMMS rate from FRED, caching the dated quote in D1 and retaining a recent last-known quote if the provider is unavailable. Quotes older than 35 days, future dates and invalid values cannot originate mortgages. The rate is locked at purchase; no example rate is presented as current. Offline files can use a recent quote previously cached in that browser; otherwise a mortgage requires the hosted rate service. Outright purchase still works offline.

Mortgage principal and interest amortize over 360 installments, **due every 10 game days**. The last payment adjusts for rounding. Payments use checking first and then cash. Accrued interest, overdue payments, credit effects and an early payoff are recorded once. The educational mortgage excludes taxes, insurance, PMI, foreclosure and prepayment fees. The mortgage remains separate from business/investment-secured loans; Books include the house asset, mortgage liability, interest expense and cash flows.

Walk to the house's front door. Before ownership, a nearby **For Sale! See your bank for details!** tag opens the bank. After purchase, click its door or use **E** nearby to enter. WASD/arrows, drag-to-look, touch movement and Escape/Exit match the stand controls. The furnished living/dining room, rear-right U-shaped kitchen and bedroom use the same outdoor world and weather through actual window openings. The house viewpoint restores with the profile's save.

`tests/house.test.js`, `tests/house.spec.js` and the rate-cache tests cover ownership/equipment migration, financial eligibility and atomicity, 360-payment amortization, investment funding, dated rate validation, door interaction, room collisions, saving and phone layout.

### Customer price sensitivity

The live sales loop and projections now share the table-based price model in `src/demand.js`, tuned in `src/demand-config.js`. Price sensitivity varies by cold/average/hot weather, location, recipe quality and cumulative purchased branding, with exact weather-specific price cutoffs. Discounts increase interest without guaranteeing more profit. Existing traffic, queues, service, inventory and financial systems remain authoritative; saved active days keep their frozen rules. End-of-day reports explain the actual pricing effects without revealing the curve. See [the demand implementation notes](docs/PRICE-DEMAND.md) for calibration, save compatibility and tests.

### Alpaca IEX live investment integration (activation pending)

The Investments screen now has private server-backed IEX quotes, approximately five-second active-session updates, actual market-calendar hours, fractional virtual trading, timestamped valuations and Alpaca historical charts. Existing holdings, trades, game accounts, mortgages and prior-close collateral processing are retained. The Worker shares caches and an atomic upstream request budget through the existing D1 database; credentials stay in server secrets. No brokerage order or billing API is used.

**Not yet activated or live-verified:** Alpaca keys and current Free account plans were unavailable for verification. The live flag defaults off. Follow [the setup, limits and verification instructions](docs/ALPACA-LIVE-SETUP.md) before deploying or enabling it. Unit/browser tests use clearly labeled mocked provider responses; no artificial prices are used as a production fallback. Offline games retain their saved holdings and business/banking features, while immediate investment trades require fresh quotes during verified regular market hours.


Bitcoin (`BTC/USD`) is available alongside the six ETFs, with private Alpaca US crypto quotes and virtual trading 24/7. Shared Bitcoin polling runs about every 20 seconds to conserve free allowances; ETF polling stays about five seconds in regular hours. Historical charts, saved holdings, fees and bank accounting use the existing investment system. See [Bitcoin feed and limits](docs/ALPACA-LIVE-SETUP.md#bitcoin-btcusd-private-virtual-trading-around-the-clock).

### Day/night lighting, beach waves and radio stations

The **Night mode** checkbox in the play area's upper-right corner switches all four worlds between daylight and blue moonlight, with glowing street lamps and a voxel moon/stars in clear weather. The preference persists in this browser. It is cosmetic: weather, the business day, market hours and saved progress remain unchanged. The Classic Stand and house use this same world lighting through their actual windows; their warm interior lights stay on.

The Waterfront ocean now has a gently moving faceted surface and traveling foam. Its moored boat follows the local wave height, pitch and roll while retaining its horizontal position and heading. Reduced-motion preferences freeze these animations and speaker vibration.

**Neon Nights** plays **Afterglow Drive**, the full original 3:12, 100 BPM instrumental synthwave track, with no vocals. It repeats in full, including its introduction and fade-out. The hosted build loads the bundled MP3 once when selected and reuses the decoded audio; the standalone build embeds it for offline playback. Hiding the game or opening a modal pauses and resumes the song's position. Switching stations, muting or quitting stops it. The editable score and synthesis source are in `src/audio/render_track.py`; optional regeneration needs Python, numpy, scipy and ffmpeg, while normal game builds use the existing Node dependencies. No external music account or streaming subscription is required.

**Velvet Jazz** adds **Evening Current**, an original 3:20, 96 BPM modern lounge instrumental with mellow electric piano, soft chord pads, rounded bass, and a restrained electronic groove. The revised elevator-style arrangement has no flute or other wind lead. The full song repeats and follows the same mute, pause/resume, station-change and quit behavior. The radio cycle is **Lemon FM → Neon Nights → Velvet Jazz → Off**. Both MP3s are bundled same-origin assets, loaded once per page when selected, and embedded in the offline single-file game. `src/audio/render_jazz.py` contains the editable score and sound generation; no sampled recording, vocal performance, music subscription or additional investment API calls are used.

### Downtown expansion and Maple Casino

Downtown now has 33 buildings including the casino and Shopster, with continuous frontage on both sides of the main street and side street. Shop fronts face their nearest road; front paths and longer sidewalks connect the lots. The Bookstore retains its approach, while Maple Market's entrance follows its street-facing shop front on the side street. The original stand locations, transit entrance and customer routes remain clear. Downtown supports the same wider zoom-out range as the Neighborhood.

Maple Casino is the cream, red and gold building on the north side of the main road, west of the Bookstore. Walk to its double doors, then click them, press E or use Enter casino. The doors open and the avatar walks inside before the camera switches to first person. WASD/arrows, drag-to-look, touch arrows and Escape/Exit match the other interiors. The actual exterior weather and day/night lighting remain visible through the front glass. A saved casino viewpoint restores with that profile.

The left-wall machines stake $0.25 per spin, the right wall $1, and the back wall $5. Three independent weighted reels pay only for three matching middle-line symbols. Gross payouts, including the stake, are cherries 4×, lemons 10×, bells 40×, sevens 150× and diamonds 500×. The theoretical long-run return is 94.475%; individual sessions can lose their stakes. Results settle and create a browser checkpoint before the visual spin finishes. Hosted games use the existing online save confirmation and recovery flow; confirm Save before closing or reloading if an upload is still pending. Confirmed saved results are not settled a second time.

The left center table is **Casino Hold'em against the dealer**: ante, receive two cards and a flop, then fold or call for twice the ante. The final two community cards and dealer hand are revealed at showdown. Dealer qualification is a pair of fours or better; the full ante paytable appears in the game. This is the casino variant, not multiplayer poker or Ultimate Texas Hold'em. Unfinished hands persist with their original deck and ante; other casino games wait until that hand is settled or folded.

The right center table uses single-zero roulette, with straight-up number bets paying 35:1 and red/black/odd/even/low/high paying 1:1. Zero loses even-money bets. Its mathematical house edge is 1/37 (about 2.703%). Dealer NPCs wear white shirts, dark vests and red bow ties beside both tables. Synthesized reel, ball, card and win sounds use the existing sound controls.

Casino play uses **in-game stand cash only**. It never automatically withdraws checking, originates loans, or accepts real money. Integer-cent net outcomes appear as Casino winnings / (losses) in the ledger, income statement, financial chart and operating cash flow. Existing profiles need no migration or additional hosting service. The rules and layout checks are in `tests/casino.test.js`; browser tests cover entry, all three slot stakes, saved hands, roulette and phone layout.

### Casino table and machine views

Clicking a casino game now enters a dedicated mode within the play area instead of opening the shared dialog. Hold’em looks down onto green felt, with the dealer across the table, community cards in the center, player cards below, chip tray, ante/call circles and paytable. Pending hands still resume with their original cards. Roulette places a single-zero wheel alongside the traditional three-row number grid, dozens and outside bets; dozens pay 2:1 and have the same 1/37 house edge. Clicking a betting square places that stake and spins.

Slots show a front-facing metal cabinet with marquee, three vertically animated reel strips, a middle payline, credits/bet/win meters and a red-topped lever. Pull down or click the lever, click Spin, or press Space. Back to casino or Escape returns to walking. Results settle and checkpoint once before animation, so leaving during a spin cannot refund or duplicate it. Reduced-motion mode shortens the presentation. Save confirmations retain the existing distinction between local checkpoints and confirmed online storage.

The casino footprint is approximately 7.8 × 6.5 world units, with matching entry, camera and collision coordinates. Its red roof now rises through nine stepped tiers instead of a flat slab. The compact exterior sits along the same street frontage; existing saved interior positions remain in local room coordinates and require no migration.

### Casino lighting, ambience and visitors

Night mode illuminates the extruded CASINO lettering with individual warm bulbs set into gold letter faces. Warm wall sconces, entrance bollards and sign lighting cast light onto the facade and pavement; they turn off in daytime. The compact building and stepped roof are unchanged.

Casino interiors have a quiet synthesized room murmur, distant slot melodies, coin clinks, roulette clicks and card sounds. This ambience uses the existing sound controls and gesture unlock. It stops on exit, mute, Save/pause, hidden tabs, the bank/profile screen and quit, and resumes appropriately. It does not load an external recording or change the radio stations.

Two dealers remain at the tables. Up to four additional voxel patrons keep the **total at six NPCs**, including the dealers. Patrons reserve different slot machines, stand and play for 8–16 seconds, then walk through the aisles to another machine. A visit includes four different machines; regulars can continue with another circuit while others leave through the doors. New visitors arrive after a staggered 2–5 second gap. Initial visitors represent people already partway through their outing. Their arms and legs animate, and occupied machine screens spin periodically. Reservations prevent two patrons from standing at the same machine. Visitors never block the player's interaction with a machine.

`src/casino-patrons.js` owns cosmetic routing, timing and the population limit. Movement avoids the physical table and machine footprints. Visitor activity pauses with the game and is recreated independently of player saves. It never settles a real spin, changes cash or consumes the business simulation's RNG. Audio also uses its own randomness. Unit tests simulate two hours of traffic and validate every machine-to-machine route; browser tests cover night lighting, visible population, unchanged player cash, and ambience lifecycle.


### Casino marquee, quicker traffic and parking

Patrons begin moving after staggered 3–11 second initial waits, then play for 8–16 seconds per machine. One existing visitor is finishing their outing and leaves first, so turnover is visible promptly. Later outings still include four different machines; most visitors leave afterward, while some continue. Arrival gaps are 2–5 seconds. Timer elapsed time is independent of the capped movement timestep, so low frame rates no longer stretch the waits. Pause and hidden tabs freeze the simulation without a catch-up jump. Browser tests now observe actual voxel positions changing and replacement patrons arriving, rather than only checking initial population.

The sign uses individual warm bulbs on gold letters against a dark face with blue trim. An eight-phase light chase outlines the roof cornice and hip edges at night; reduced-motion mode keeps it steadily lit. Inside, dim ceiling fixtures, darker ceiling panels, warm amber cove strips and a red accent run around the ceiling/wall junction. Machines retain colorful illuminated trim.

The casino is set back from the road to fit a front parking lot and a separate rear lot. Eight marked spaces hold six parked voxel cars, with a clear central entrance walk and a west access lane to the rear. Cars are solid movement obstacles and asphalt/walkways use the normal ground-height system. The building dimensions are unchanged and saved interior positions remain compatible.

Doorway traffic uses an offset lane and nearby patrons are hidden only when they would clip the first-person camera. A portal hit test keeps the entrance clickable even while NPCs have the door leaves swung open. The normal door meshes still animate and the doorway does not create a new collision obstacle.


### Shopster department store — exterior batch

Shopster occupies the northwest downtown parcel, behind a large parking lot facing the main road. The former north-side Hotel and Records buildings now sit across the street, facing north toward that road. The cream shell, red facade and wrapping stripe, glass entrance, shopping-bag sign, rooftop HVAC, cart corral and back-left receiving dock follow the exterior reference. The downtown terrain, western sidewalk and walking bounds extend around the property.

Select **Shopster** in the Downtown scene controls to frame the whole property. The standard Downtown and walking controls return to the normal world view. The property sits farther west of the casino and has 40 yellow-lined bays: 32 in front (including two accessible spaces) and eight in a smaller rear lot. Eighteen solid parked cars, planted islands, twenty lamp posts and a clear central pedestrian path complete the grounds. Five-unit drive lanes on both sides connect the main road to the rear aisle; additional warm lights illuminate the side lanes and rear parking. Night mode illuminates the store lettering, entrance and parking lot. The model and camera are also included in the existing offline HTML and ZIP downloads. No additional service, API calls or save migration is required.

The front-half interior is now implemented in the next batch below. The rear-half batch now completes the supplied plan, including back-left receiving, stockroom, restrooms, break room and the remaining departments, with separate warehouse and receiving workers.

`tests/department-store.test.js` checks placement, relocated frontage, parking, collision clearance and day/night lighting. `tests/department-store.spec.js` covers desktop and phone views, saving without money changes, and standalone operation with HTTP requests blocked.


### Shopster front-half interior

Walk to Shopster’s front doors and click them, press E or select **Enter Shopster**. Both glass doors swing open and the avatar walks inside before switching to a first-person camera. WASD/arrows, drag-to-look, touch movement and Escape/**Exit Shopster** follow the existing interiors. The same downtown parking lot, lighting and weather remain visible through the real entrance glazing. Saving retains the store viewpoint and restores it with that profile; invalid positions fall back to the entrance.

The front half follows the supplied reference: cream tile floors, red wall bands, white ceiling panels and lights, six numbered red checkout lanes (two staffed), cart bays, stocked Sports & Outdoors, Grocery and Seasonal shelving, General Merchandise displays and Home Decor. The rear-half batch below removes the temporary dividing wall and opens the complete sales floor and rear rooms.

Up to 20 cosmetic shoppers browse multiple stops, visit the two staffed checkouts, leave and return. Five of the 20 visitor slots push modeled shopping carts; brief departures can reduce the visible count. Checkout reservations allow one shopper at each staffed register. Five red-shirted floor workers move between displays, and two cashier NPCs remain at their registers. The rear-half batch adds one warehouse worker and one receiving worker in their corresponding rooms. A separate seeded crowd schedule owns routing and timing, pauses with the game/hidden tabs and never changes player money, inventory, business customers or game RNG.

`src/store-floorplan.js` owns front-half fixture bounds and aisle routing; `src/store-front-model.js` creates the fixtures, lights and carts; `src/store-interior.js` handles doors, navigation, viewpoint restoration and weather shelter; `src/store-shoppers.js` animates shoppers and staff. Tests cover whole-store crowd turnover, cart/population caps, checkout reservations, all browse routes, collisions, movable doors after batching, entry, saved restoration, modal pause, desktop/phone controls and blocked-network standalone play.


### Shopster rear departments and employee rooms

The temporary midpoint wall is removed. Toys, Home Goods, Electronics, Clothing, Shoes, Household Essentials and Health & Beauty now complete the sales floor behind the front departments. Stocked shelves, television displays, hanging clothes, matching floor tiles, ceiling lights, red trim continue the existing design.

Four rooms run across the back: receiving at the left, a large stockroom, restrooms and the employee break room at the right. Their framed doors swing open automatically on approach and the player's existing first-person controls can explore each room. Receiving has its aligned loading shutter, stacked cartons, a pallet and pallet jack. The stockroom has tall carton racks and a working aisle. Restrooms have toilets, a divider, sinks and mirrors. The furnished break room has red chairs and tables, lockers, a kitchenette with microwave and coffee maker, vending machine, corkboard, clock and water cooler. The exterior receiving dock now aligns with its interior room.

Twenty shopper slots (five carts) are distributed across both store halves. Public routes never enter the rear employee rooms. Five floor workers circulate through public displays; the two cashiers retain their staffed registers. A separate warehouse worker carries cartons around the stockroom and a receiving worker checks deliveries in receiving, bringing the requested staff to nine and the maximum combined population to 29. Crowd timing remains cosmetic, pauses normally and does not change money, inventory or game RNG. Existing front-half viewpoints remain valid; rear viewpoints save and restore through the same profile system.

`src/store-rear-model.js` builds the rear furnishings and doors; `src/store-floorplan.js` shares their collision bounds and separates public/employee pathfinding. Unit tests cover access to every room, public routing, both back-room worker routes and continued whole-store turnover. Browser checks cover automatic room doors, rear viewpoint saving/restoration, each rendered room, phone break-room controls and HTTP-blocked standalone play, alongside the original front-half entry and save checks.


### Shopster longer floor plan and clear interior sight lines

Shopster first grew to a 42-unit depth, double the original 21 units, while retaining its original street entrance. The later endcap layout described below expands the width and sales-floor spacing further. The extension runs rearward; the rear parking lot, drive lanes, loading dock, site lights, walking bounds and overview camera follow the larger footprint. Front parking and the surrounding downtown businesses retain their positions.

The entrance has a deeper open approach to six numbered checkout lanes. Longer stocked aisles, more merchandise fixtures, repeated columns and ceiling lights continue through the expanded floor. Furniture and character sizes remain consistent with the rest of the game. Interior department placards, room-name plaques and cart-bay text are removed; the numbered checkout markers and exterior Shopster branding remain. Employee rooms keep their furnishings and move to the back of the extended building.

Public and staff collision/pathfinding cover the new dimensions. Twenty shopper slots, five cart assignments, two cashiers, five floor workers, and the receiving/warehouse workers keep their existing roles. Versioned saved viewpoints follow employee-room layout changes, with invalid positions safely returning to the entrance. Business, bank, inventory and investment state are unchanged.


### Rear rooms enlarged by 66 percent

Receiving, warehouse/stockroom, restrooms and the break room now extend 5.81 world units from their unchanged doorway line, up from 3.5 units (a 66% increase). The sales floor and room entrances retain their layout. The rear wall, building shell, floor, ceiling, loading dock, rear parking and access lanes extend by the additional 2.31 units. The completed store is now 44.31 units deep.

Furniture keeps its normal proportions: rear-wall lockers, counters, toilets and storage racks stay against the enlarged rear wall; the other furnishings are spread through the extra space. Receiving gains longer shelving and the break room gains a third table. Worker routes and collision bounds cover the new rooms. Saved store viewpoints record layout version 3 and older room viewpoints are mapped into the enlarged rooms before position validation. Public shopper routes remain on the sales floor.


### Shopster ceiling-speaker music

Inside Shopster, three original 94 BPM instrumental soft-rock arrangements play as quiet background music: Sunday Windows, Coastal Drive and After the Rain. Strummed guitar-like plucks, electric piano, rounded bass and a light backbeat form a 96-bar playlist. Ceiling speaker grilles are placed across the front and rear. A dedicated low-pass-filtered mix gives it a soft overhead-speaker sound beneath footsteps and other effects.

The existing Sound toggle controls the music. Save/pause, hidden tabs, the bank/profile screen, exit and quit silence it; returning to the active store resumes the arrangement. The stand radio is muted in the store mix and restored on exit, keeping its station separate from the PA. The original score in `src/store-score.js` is synthesized locally: no extra audio download, streaming service, network request or simulation RNG is used, and offline play includes the same music.

Unit tests cover the score, scheduler lifetime, gain, radio separation, mute/pause/exit and reset. Browser checks measure actual Web Audio samples, exercise Sound and Save controls, verify exit/quit silence and HTTP-blocked standalone playback, and retain casino ambience coverage.

### Shopster wider, taller shelves and stocked endcaps

Sales-floor gondolas have twice their former thickness, six stocked levels instead of three, and twice the former height (about 3.8 units). Each gondola has a stocked, outward-facing endcap on both ends. All 56 endcaps have matching navigation collision bounds. Clothing racks, low merchandise tables, checkouts, employee furnishings and NPCs retain their proportions.

The main retail shell is 39 units wide and 52.71 units deep; the later receiving/warehouse wing adds 5.81 units at the rear. Shelf centers spread across the wider floor and along the sales floor, preserving at least the previous parallel-aisle and cross-aisle clearances. Both wall passages admit a shopping cart past the full endcap projection. The ceiling and exterior shell rise 25 percent, with lights, speaker grilles, columns and wall bands lifted accordingly. Side lanes, rear parking, the loading dock, overview target and walking/weather bounds follow the larger shell. The entrance, street and front parking stay anchored.

Store viewpoints now save layout version 4. Earlier positions migrate into the expanded floor, with a safe entrance fallback if a new fixture occupies the translated position. The existing shopper/cart population, employee routes, doors and quiet PA music continue to work. Validation includes cart routes down both wall passages, nonoverlapping fixtures, main-aisle clearances, an hour of customer turnover, browser movement/save restoration and standalone offline play.

### Shopster polished tile floors

The front sales floor, rear aisles and employee rooms use dedicated polished tile materials with low roughness and a clear coat. Existing ceiling lights produce soft specular highlights while the tile colors and narrow grout lines remain visible. Tile materials are shared within each floor section for batching; this finish uses the existing lighting and adds no reflection render pass or external assets.

### Front-left Shopster electronics department

The electronics department is an addition in the open front-left entrance corner. The three original tall sports gondolas and their stocked endcaps remain in their original positions and heights. Three low wall units sit along the entrance-side left wall under the TVs; a low shelf also remains on the front wall. The left entrance cart corral is removed as originally requested. The right cart corral remains. Matching fixture bounds keep the new shelving solid while preserving cart routes and the main aisles.

Three wall-mounted televisions show the same original animated voxel soccer match. A small independent Three.js scene renders the field, goals, crowd, players and moving ball once at up to 12 frames per second into one shared 512×288 texture. All screens share that broadcast. It runs only while inside the active store and pauses for save menus, hidden tabs and leaving the store. It uses no external video, network stream, autoplay permission or simulation randomness. Render targets are released when changing locations or destroying the world. The store PA music remains the audio source.

Electronics placement correction: all three TVs and their low shelves are on the entrance side of the left wall (local z = 2.1, 5.4, 8.7). No existing sales-floor racks are replaced. The original tall rows, cross-aisles and wall passages remain intact.

### Receiving and warehouse preparation

The receiving/warehouse wing is 100 percent deeper (11.62 units), extending rearward by 5.81 units. The bathroom and breakroom retain their existing rear wall and footprints, creating a stepped loading wing. Eight tall stock-rack sections replace four shorter sections, with 1.6-unit clear row aisles, a wide central access aisle and additional ceiling lighting. A framed swinging door connects receiving to the warehouse and opens on approach. The loading apron, rear parking, side lanes, site bounds and overview camera follow the deeper wing.

The single unisex bathroom has one toilet and a sink, with the obsolete divider removed. Break-room chairs face their closest table; their collision footprints follow the new orientation. Shelf-top sample laptops are removed from the front electronics units; the existing tall gondolas and synchronized sports TVs are preserved.

The dock opening is 15 percent taller (2.875 units). Its segmented door runs up vertical tracks, around curved elbows and onto an overhead track below the ceiling. `buildStoreLoadingDoor().update(dt, {employed, workdayStarting})` is the future employment integration hook; both permissions must be true to open it. Normal gameplay passes neither flag, so it stays closed. The job, workday flow, semi-truck unloading, inventory/shelf placement and payroll are deferred to the requested next stage. External collision capture and interior dock boundaries still reflect the closed door and will need the future loading workflow to permit truck/player passage.

### Electronics display islands

Three freestanding display tables occupy the open front-left electronics area. Cream tops and gray pedestals match the existing merchandise tables. One table has four open demo laptops with keyboards and touchpads, one has six upright smartphones with app icons, and one has three different game consoles with controllers. The devices sit on these dedicated tables; the low wall shelving stays clear. All existing TV screens, tall gondolas, endcaps, checkout counters and wall units retain their positions.

Each table has a matching solid navigation footprint. Cart routes remain open along both sides and between the tables, with a continuous passage beside the checkout lanes. Models are built locally and batched with the existing interior, including in standalone offline play. They are display props and do not add purchases or change account balances.

### Toy department: aisle 1a game selection

Toy shelf numbering follows the four endcaps in the supplied view. Face `a` points toward the electronics department (+Z); face `b` points into the neighboring aisle (-Z). `src/store-toy-catalog.js` records shelves 1–4. Only shelf 1a is merchandised in this step; the original geometry, 1b stock, endcaps and other shelves remain unchanged.

Face 1a has three color-coded platform bays with 90 individual slots across the existing six shelf levels. Original pixel-art covers and console-platform headings are generated locally. Deterministic empty slots have visible out-of-stock cards; there is no glass. Cases are instanced for efficient rendering and removed from their exact physical slots when reserved. Picking is restricted to the active 1a side, within reach and with no opaque shelf or character blocking the ray.

Click or tap an available case to reserve it in the shopping cart. The Cart button reviews selections and returns individual cases to their original slots. A small first-person basket shows selected game boxes. Empty slots cannot add items, and a physical copy cannot be selected twice. The cart is stored per profile in `state.shopsterCart`, autosaved through the existing profile adapter, and retained across save/load and store visits. Adding to a cart does not buy the game or alter cash, bank balances, lemonade inventory or the ledger. No checkout/payment flow is added in this step.

The case covers, stock gaps and cart work in the standalone build without HTTP requests. Tests cover preservation of the opposite shelf face, per-slot stock/return behavior, profile isolation and balance invariants, actual desktop/touch case selection, save/restore, keyboard focus after closing the cart and offline play.

### Voxel characters (appearance version 2)

All playable avatars, Shopster staff/customers, casino patrons/dealers and street
customers use `createVoxelCharacter` through the existing `models.character` API.
The original 0.5 hip pivot, 0.89 shoulder pivot, foot height, world scale and
navigation speeds are retained. Hair volume varies naturally; legs/torso/head
landmarks do not shrink. Existing male/female and five saved colour choices still
load. No save migration or economic changes are required.

`characterAppearance(stableId, overrides)` returns deterministic, serializable
physical appearance data, independent of business RNG and emotional state. Role
namespaces distinguish staff, visitors, dealers and the player. Existing transient
visitor serials map reproducibly to appearances; future persistent people should
supply their permanent ID or store the returned versioned appearance document.
Configuration includes bounded build/shoulders, face/jaw/nose/eyes/brows, skin,
hair colour/style, clothing and accessories. Eleven dimensional hair styles plus
bald, twelve clothing variants, glasses, hats and facial hair use coloured voxel
geometry. No downloaded textures, external services or recurring costs.

The returned rig retains `group`, `slots`, `legs`, `arms`, `cup` and adds:

- `setExpression('neutral'|'happy'|'sad'|'angry'|'surprised'|'concerned'|'talking')`
- `setTalking(boolean)` for an existing/future dialogue or voice controller.
- `setAnimation({expression, talking, gesture:'wave'|'explain'|'none', motion:'idle'|'sitting'})`
- `update(time, {moving, reducedMotion, animateLimbs, distance})`. Existing crowd
  controllers can keep their own limb poses with `animateLimbs:false`.

Emotion/animation state never changes the deterministic physical configuration.
Mouth geometry remains independently addressable for future phoneme animation.
Occasional deterministic blinking and subtle breathing do not consume simulation
randomness. Animated face features survive scenery batching. Each static body
part merges its boxes into one vertex-coloured mesh; materials/primitive geometry
are reused. Facial detail switches off beyond 24 world units; silhouettes remain.
Character mesh disposal releases owned merged buffers without disposing shared
primitive geometry/materials.

Inside Shopster, **Character showcase** presents twelve distinct adults together,
plus the player's actual configured avatar. Choose individuals and expressions,
or preview walking in place. The view uses the real store scene and renderer;
it does not change money, inventory, position, appearance or saved profiles.
Close the showcase (or Escape) to continue walking from the same position.

`setAnimation` also accepts bounded `gaze` (-0.3…0.3 radians) and `energy`
(0.2…1) for a future emotional simulation to request a small head turn/tilt and
subtler breathing. These are runtime tendencies, never tied to skin, build or
other physical attributes. `turnTo(yaw, dt)` eases the shortest yaw change without
altering any navigation path or gameplay speed.

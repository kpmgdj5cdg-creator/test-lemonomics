# Life simulator — Segment 3: proposed time rules

Planning only. No clock, timer, loan schedule, gameplay or deployment changes are
implemented here. This proposal follows [the architecture review](LIFE_SIM_ARCHITECTURE.md)
and the completed Segment 2 identity boundary. Review items are listed at the end.

## 1. Conversion and calendar

- **Normal speed: 5 real minutes = 1 game hour.** One active real second advances
  12 game seconds. A full game day therefore takes 2 active real hours; a week
  takes 14. Players are not expected to experience every hour at normal speed.
- One authoritative clock **per saved world/profile** stores integer game seconds
  relative to a fixed game epoch, plus a fractional conversion remainder. Persist
  the remainder so frequent saves or speed changes do not lose/gain time. The
  calendar, schedules and age read this clock; none increments its own time.
- Use a Gregorian calendar: 24-hour days, seven-day Monday–Sunday weeks, actual
  month lengths and leap years. Use one fictional local time zone with **no daylight
  saving changes**. Never interpret game dates as the computer's local/UTC dates.
- Setup supplies a starting calendar date/time. Recommend a fixed Monday at 09:00
  for the default scenario; the exact start year/date requires review. Existing
  `state.day` does not reveal a real birthday or historical calendar date.
- With a known birth date, derive age from completed calendar years. Observe a
  February 29 birthday on February 28 in non-leap years. Never add age separately
  when completing work, loading a save or crossing a fixed number of seconds.
- If only age is known, retain that age and establish a game-date age anchor at
  clock adoption. Increment on calendar anniversaries of that anchor, explicitly
  labelled an age checkpoint rather than an invented birthday. Unknown legacy age
  remains unknown. Use the same leap-day observance for anchor anniversaries.
  A future known birth date replaces the anchor as the sole basis;
  Segment 2's current-age field becomes a compatibility projection, not a second clock.

## 2. Ways to advance time

All modes call the same advancement authority. Speed changes processing pace,
not which obligations or consequences occur. No mode moves time backward.

| Mode | Proposed behavior |
| --- | --- |
| Normal play | Walk, travel, socialize and perform detailed tasks at the normal conversion. Keep visual animation/physics frame deltas separate from authoritative time. |
| Accelerated play | Offer 2× and 4× normal speed for safe routine periods: a game hour takes 2.5 or 1.25 real minutes. Return to normal or pause for precise tasks and important decisions. |
| Sleep/wait | Choose a duration or wake time. Advance through the interval, applying bills, routines and recovery. Sleep is not a pause or free pass through responsibilities. |
| Work/school completion | Perform required hands-on portions, then optionally advance through explicitly routine portions. Assess attendance, work quality and required tasks; advancing eight hours alone does not earn a successful shift or class. |
| Planner skip | Preview a chosen endpoint and known commitments/costs. Allow days, weeks and longer periods when a routine plan is established. Resolve intervening events in order and stop when a new decision is required. |

An eight-hour shift takes 40 real minutes at normal speed; an eight-hour sleep
can resolve promptly instead. Routine weekly/monthly plans make multi-year play
practical without shortening calendar years or accelerating age alone. A 16-week
term would take about 224 real hours without advances, so planner progression is
essential, not an optional workaround for an otherwise unplayable degree.

Long advances use bounded processing batches and yield to the interface; do not
run months of render frames or collapse everything into one unchecked balance
change. Show the resolved interval, earnings, charges, attendance and significant
personal changes. Allow cancellation at the last fully processed event boundary.

**Interruptions:** stop before an unapproved payment/decision, inability to fund an
authorized payment, unexpected job/school conflict, or significant personal event.
Pause and explain the next event; do not silently waive it or continue accumulating
penalties. Routine consequences already covered by the chosen plan can resolve
without a prompt each time. Preview missed commitments before an intentional skip.

## 3. Jobs and education

- Job contracts specify recurring shifts, breaks, hourly/salaried terms, payday and
  absence rules. Track credited game work time and assessed completion; prevent
  overlapping paid hours, classes or simultaneous active jobs for the player.
- Recommend weekly or fortnightly payroll as contract data. Accrue earnings from
  credited work, then post them once on payday. A skip across three paydays settles
  three actual pay periods, not three unconditional rewards. Respect unpaid breaks,
  absences and agreed work plans; do not simulate perfect work automatically.
- Courses specify meeting times, study requirements, assessments and prerequisites.
  Propose 16-week terms and two principal terms per academic year, with optional
  summer study. Degrees require credits and prerequisites across enough terms,
  rather than a timer awarding a credential after four calendar years.
- Let players perform representative classes, assignments and exams hands-on and
  approve a routine study/work plan for intervening weeks. Resolve learning,
  attendance and assessments at their scheduled boundaries using recorded effort
  and circumstances. Essential assessments or changed circumstances interrupt a skip.
- Course withdrawal, leave, part-time study and delayed completion should consume
  actual calendar time. No separate fast education calendar or automatic degree
  solely because the player aged. Detailed success/absence rules are later tasks.

## 4. Finances and recurring obligations

These rules concern future calendar-based contracts, not current lemonade debt.

| Obligation | Proposed scheduling |
| --- | --- |
| Wages | Accrue credited work; deposit at the contract's payday and time. Final/partial pay follows recorded work and contract terms. |
| Rent, insurance, utilities and subscriptions | Create period-specific invoices on contract billing dates; each has an explicit due time and grace terms. Recommend monthly billing by default, with contract overrides. |
| Calendar-based loans | Contract-owned installment dates, interest basis, due times and grace rules. No universal conversion from old business days. |
| Interest | Accrue over actual elapsed game time. Recommend actual/365 fixed for new simple annual-rate contracts, with monthly posting and compounding only if the contract specifies it. Other products retain their own stated basis. |
| Other recurring expenses | Data-driven schedules and actual service periods, including cancellation/end dates; never charge after a contract ends. |

For a monthly contract anchored to the 31st, use the month's last day when needed,
then return to the 31st in March. Preserve the original anchor to prevent date drift.
Specify a local due time, defaulting to 09:00 when a contract provides only a date.

Separate invoice creation, payment and overdue penalties. Recommend autopay **off
unless explicitly authorized** for that contract/account. Insufficient funds stop
an advance before attempting an impossible payment; the invoice remains due and
existing grace rules apply. Choosing to continue with an unpaid bill can have
consequences, with no silent new borrowing or withdrawal from another account.

Carry fractional interest through a deterministic precision/rounding policy and
post currency amounts at defined contract boundaries. Splitting the same interval
into sleep, normal play or repeated saves must produce identical accrued interest.

### Existing lemonade compatibility

`state.day` remains the legacy **business-day index**, not a calendar date or a
Monday–Friday count. The existing `nextDay()` action advances it by one. Preserve:

- Loan installments every **5 business days**, including current interest, windows,
  credit effects and repayment behavior.
- Mortgage payments every **10 business days**, including existing accrual rules.
- Business-day-based spoilage, weather, history, reports and saved selling sessions.

Calendar skips, sleep and unrelated employment must not increment this counter or
settle its debts. Do not convert outstanding balances, due indices, or the current
165 ms selling ticks in a clock-foundation task. A later explicit activity migration
must define how lemonade operations consume calendar hours and retain the legacy
counter as an activity-progress measure. Until that migration, keep legacy selling
sessions outside calendar advances; reject advances during an unresolved session.
Do not let a future planner farm zero-calendar-time lemonade days or run duplicate
business sessions through this temporary compatibility boundary. Calendar adoption
for a legacy profile therefore stays gated until this mapping is reviewed; the
clock foundation must not silently run a parallel calendar behind existing play.

## 5. Persistent NPCs and offscreen progression

These policies apply when persistent NPC records are introduced; existing cosmetic
Shopster/casino crowds keep their current behavior until explicitly migrated.

- Important people use the same calendar for shifts, classes, birthdays, pay and
  relationship events. Offscreen is not offline: their simulation progresses while
  the saved world is actively advancing, even if their models are not rendered.
- Resolve routine attendance, travel availability and employment changes at schedule
  boundaries. At the endpoint, derive where a person should be and what they are
  doing; do not play every offscreen walking animation or render every elapsed day.
- Relationships respond to elapsed game time, contact, commitments and meaningful
  events. Missing an agreed meeting differs from simply spending time apart.
  Personality and circumstances affect tendencies, not fixed moral scores.
- Memories retain occurrence timestamps; salience/recall can change with elapsed
  game time. Keep important commitments/history and bound routine memory growth.
  Use daily/weekly summaries where equivalent, never discard consequential events.
- Persist simulation random state or deterministic occurrence outcomes separately
  from cosmetic/audio randomness. Loading or changing skip chunk size must not
  reroll a job outcome or relationship reaction. No AI call is required per tick.

## 6. Pause, offline and real-world separation

- Recommend pausing on explicit pause, save/load, profile switching, hidden tabs,
  loss of application focus, and menus/dialogue requiring a player decision.
  Free exploration and active activities advance normally. Final menu exceptions
  require review; these rules do not change existing pause behavior in this task.
- Closing the game freezes the saved world. **No offline bills, pay, aging,
  relationship deterioration or completed courses.** On return, restore committed
  game time; never calculate life progress from `Date.now() - savedAt`.
- On resume, re-anchor the real-time sampler so suspension/sleep/debugger gaps do
  not become catch-up simulation. Use monotonic elapsed time during active play,
  independent of rendering FPS; treat a long unobserved gap as an interruption.
- Real stock-market sessions, provider quote timestamps/freshness, authentication
  expiry, server operations, network retries and API limits remain real-time systems.
  Refresh them under existing policies, not once per skipped game hour/day.
- Skipping a game year does not reveal next year's real prices. Virtual trades
  still require a currently eligible real quote at execution time. Do not execute
  hypothetical skipped-year trading against today's quote. A future projection
  system would need separately labelled assumptions, not invented provider history.

## 7. Authoritative advancement and save safety

1. Request an endpoint/reason; check activity compatibility, authorized routine plans
   and commitments. Checkpoint before a long advance. All modes use this boundary.
2. Resolve scheduled events in **(committed time, requested endpoint]**, including
   intermediate days/months. Events created at the current timestamp resolve in
   that transaction before the cursor advances; reject newly scheduled past events.
3. Use a stable ordering: timestamp, priority, entity ID, occurrence ID. At equal
   timestamps, recommend: finish/assess work → credit earned pay → accrue/post
   interest and invoices → authorized payments → overdue/grace consequences →
   personal notifications. Schedule versions resolve contract-change boundaries.
4. Give every occurrence a stable key, such as contract/person ID + schedule version
   + event kind + period/occurrence. Save its receipt or monotonic processed-period
   cursor with its effects. A timer firing twice or replaying a checkpoint must not
   pay wages, charge rent, age someone, or apply a missed-payment consequence twice.
5. Commit clock cursor, balances, ledger entries, NPC changes and processed markers
   **together** through the existing atomic profile snapshot/revision mechanism.
   Do not save the destination time before intermediate effects have succeeded.
   Exceptions restore the current event's prior state; no partially settled event.
6. Save completed event batches, not half-events. A crash/load returns to the latest
   durable boundary. A saved unfinished target is offered for explicit continuation,
   never automatically processed as offline catch-up. Keep bounded processed cursors
   without pruning information still required to prevent replay.
7. Maintain one advancement request at a time per active profile. Cancel old callbacks
   on profile switch. Existing online revision conflicts stop advancement/upload;
   preserve recovery data and require reconciliation rather than merging two clocks
   or applying financial events from both writers. Client and server wall clocks
   must not independently run the same simulation events.

Future validation must compare one large advance with many small advances, normal
versus accelerated play, save/reload at event boundaries, duplicate callbacks,
failed writes/revision conflicts, insufficient funds, month ends/leap birthdays,
multiple paydays, unknown ages, and preservation of legacy five/ten-day schedules.

## 8. Decisions requiring review before implementation

- **Calendar start:** exact epoch/start date and whether Custom Life can choose it.
  Recommend a fixed scenario default rather than today's real date.
- **Age-only records:** approve annual age checkpoints versus requesting a birth
  date before precise birthday behavior; keep existing unknown ages unset.
- **Planner boundaries:** how much routine work/study can be delegated, required
  hands-on checkpoints, and which events are mandatory interruptions. Recommend
  previewing one week initially, with longer term plans as later extensions.
- **Billing details:** approve default payroll cadence, due times, grace periods,
  autopay opt-in and interest conventions; leave room for explicit contract terms.
- **Lemonade adoption:** mapping a selling session/business-day transition to
  calendar hours is unresolved and must precede enabling calendar skips around it.
  Existing five/ten-business-day contracts remain unchanged until separately approved.
- **Live markets over long life spans:** keep real quotes separate; review whether
  later life projections use synthetic scenarios and how they are labelled.
- **Pause UX:** exact menu exceptions and long-gap detection threshold. Recommend
  forgiving pauses and explicit resumption rather than unexpected elapsed time.

Stop at this specification. It authorizes no runtime implementation, timer change,
loan conversion, character-creation UI, new activity or subsequent segment.

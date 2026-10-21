import "./engine.js";
import {
  RECIPES,
  satisfaction,
  tasteTest,
  recipeBonus,
  debt,
  securedLimit,
  securedPrincipal,
  inventoryValue,
  isInsolvent,
  canRescue,
  originate,
  payLoan,
  processOverdue,
} from "./finance.js";
import {
  incomeForDay,
  statements,
  workbook,
  download,
  csvReports,
} from "./reports.js";
const { World: Vl, Investments: Du, capacity: xl } = window.LemonadeEngine;
(function () {
  "use strict";
  let e = document.getElementById(`ll-app`),
    t = (t) => e.querySelector(`#` + t),
    n = {
      neighborhood: {
        name: `Neighborhood`,
        fee: 4,
        foot: 47,
        willing: 2.15,
        sensitivity: 1.15,
        desc: `A familiar street, friendly neighbors, and your original lemonade stand.`,
      },
      park: {
        name: `Park`,
        fee: 6,
        foot: 47,
        willing: 2.15,
        sensitivity: 1.15,
        desc: `Lower permit fee and steady family foot traffic. A forgiving place to start.`,
      },
      square: {
        name: `Downtown`,
        fee: 9,
        foot: 76,
        willing: 2.7,
        sensitivity: 1.1,
        desc: `More people and higher spending power—but a pricier daily permit.`,
      },
      beach: {
        name: `Waterfront`,
        fee: 17,
        foot: 98,
        willing: 3.05,
        sensitivity: 1.25,
        desc: `Huge crowds on hot days, but rainy days can be brutal.`,
      },
    },
    r = {
      lemons: { name: `Lemons`, icon: `🍋`, pack: 12, price: 6, unit: 0.5 },
      sugar: {
        name: `Sugar scoops`,
        icon: `🍬`,
        pack: 15,
        price: 3,
        unit: 0.2,
      },
      ice: { name: `Ice scoops`, icon: `🧊`, pack: 30, price: 3, unit: 0.1 },
      cups: {
        name: `Paper cups`,
        icon: `🥤`,
        pack: 20,
        price: 3.2,
        unit: 0.16,
      },
    },
    i = {
      lemons: [6, 12, 36],
      sugar: [10, 30, 60],
      ice: [50, 200, 500],
      cups: [12, 24, 60],
    },
    a = {
      lemons: `Lemons`,
      sugar: `Sugar`,
      ice: `Ice cubes`,
      cups: `Paper cups`,
    },
    o = [`lemons`, `sugar`, `ice`, `cups`],
    s = `lemons`,
    c = Object.fromEntries(o.map((e) => [e, [0, 0, 0]])),
    l = [
      { icon: `☀️`, name: `Sunny`, temp: 82, mult: 1.12 },
      { icon: `⛅`, name: `Partly cloudy`, temp: 76, mult: 0.96 },
      { icon: `🔥`, name: `Hot & sunny`, temp: 93, mult: 1.37 },
      { icon: `🌧️`, name: `Rainy`, temp: 62, mult: 0.57 },
      { icon: `☀️`, name: `Sunny`, temp: 85, mult: 1.19 },
      { icon: `🌤️`, name: `Breezy`, temp: 73, mult: 0.9 },
      { icon: `🔥`, name: `Heat wave`, temp: 96, mult: 1.48 },
      { icon: `🌨️`, name: `Snowy`, temp: 30, mult: 0.44 },
    ],
    u = (e) => (e < 0 ? `−` : ``) + `$` + Math.abs(e).toFixed(2),
    d = (e) => Math.round(e * 100) / 100,
    f = (e, t, n) => Math.max(t, Math.min(n, e)),
    p = () => ({
      checking: 0,
      investments: 0,
      loans: [],
      creditScore: 650,
      creditEstablished: !1,
      onTime: 0,
      missed: 0,
      loanSequence: 1,
    }),
    m = () => ({
      version: 5,
      upgrades: [],
      lemonLots: [],
      daySpoilage: { day: 0, lemons: 0, cost: 0 },
      day: 1,
      cash: 0,
      inventory: { lemons: 0, sugar: 0, ice: 0, cups: 0 },
      recipe: { lemons: 0, sugar: 0, ice: 0 },
      purchasedRecipes: [],
      playabilityVersion: 1,
      price: 2.25,
      pitchers: 2,
      location: `neighborhood`,
      history: [],
      ledger: [],
      bank: p(),
    }),
    h;
  try {
    let e = JSON.parse(
      localStorage.getItem(`lemonadeLane_bank_v3`) ||
        localStorage.getItem(`lemonadeLane_zero_v2`),
    );
    ((h = e && e.inventory && e.ledger ? e : m()),
      h.bank || (h.bank = p()),
      (h.version || 0) < 5 &&
        h.location === `park` &&
        (h.location = `neighborhood`),
      (h.version = 5),
      Array.isArray(h.upgrades) || (h.upgrades = []),
      Array.isArray(h.lemonLots) ||
        (h.lemonLots = [{ day: h.day, qty: h.inventory.lemons || 0 }].filter(
          (e) => e.qty > 0,
        )),
      h.daySpoilage || (h.daySpoilage = { day: 0, lemons: 0, cost: 0 }));
  } catch {
    h = m();
  }
  h.purchasedRecipes ??= [];
  h.playabilityVersion = 1;
  let g = 0,
    _ = !1,
    v = null,
    y = null,
    b = null,
    x = null,
    S = ``,
    C = `location`,
    w = `overview`,
    T = `outside`,
    E = [
      {
        id: `juicer`,
        name: `High Output Citrus Juicer`,
        price: 49.99,
        icon: `🧃`,
        desc: `Squeeze lemons much faster!`,
        effect: `Cuts serving time by one step. Shorter lines mean fewer unhappy customers.`,
      },
      {
        id: `powerjuicer`,
        name: `Miracle 9000 Power Juicer`,
        price: 149.99,
        icon: `⚡`,
        desc: `Lightning-fast lemon squeezing!`,
        effect: `Cuts serving time another step; combines with other speed upgrades.`,
      },
      {
        id: `shade`,
        name: `ShadeMaker 3000 Canopy`,
        price: 129.99,
        icon: `⛱️`,
        desc: `Give waiting customers some shade.`,
        effect: `Customers wait longer before giving up, especially on hot days.`,
      },
      {
        id: `register`,
        name: `EZserve Cash Register`,
        price: 249.99,
        icon: `🧮`,
        desc: `Speed up every checkout.`,
        effect: `Reduces service time so you can sell more cups during busy days.`,
      },
      {
        id: `fridge`,
        name: `Mr. Fridge`,
        price: 249.99,
        icon: `🧊`,
        desc: `Keep lemons fresh, day after day!`,
        effect: `Stops your lemon inventory from expiring after two days.`,
      },
      {
        id: `icedispenser`,
        name: `Ice-O-Matic Ice Dispenser`,
        price: 399.99,
        icon: `❄️`,
        desc: `Make ice at your stand for free!`,
        effect: `No more purchased ice required for your recipes, saving money.`,
      },
      {
        id: `classic`,
        name: `Classic Stand`,
        price: 449.99,
        icon: `🏪`,
        desc: `Give your stand a popular new look.`,
        effect: `Attracts more customers and allows an extra place in line.`,
      },
      {
        id: `music`,
        name: `High-Five Sound System`,
        price: 799.99,
        icon: `📻`,
        desc: `Play music people notice.`,
        effect: `Increases the number of customers interested in your stand.`,
      },
      {
        id: `lemonstand`,
        name: `Lemon Stand`,
        price: 999.99,
        icon: `🍋`,
        desc: `Turn your stand into a landmark.`,
        effect: `Builds popularity to win back customers from competitors.`,
      },
      {
        id: `lights`,
        name: `Bright Lights Neon System`,
        price: 1249.99,
        icon: `💡`,
        desc: `Make your stand impossible to miss.`,
        effect: `More potential customers notice your stand from the street.`,
      },
      {
        id: `dispenser`,
        name: `Take2 Lemonade Dispenser`,
        price: 1599.99,
        icon: `🥤`,
        desc: `Fill pitchers faster and serve sooner.`,
        effect: `Reduces serving time significantly.`,
      },
      {
        id: `icemaker`,
        name: `High Output Automatic Ice Maker`,
        price: 2599.99,
        icon: `🧊`,
        desc: `Never run out of ice again.`,
        effect: `Makes all recipe ice for free and improves serving speed.`,
      },
      {
        id: `castle`,
        name: `Castle Stand`,
        price: 9999.99,
        icon: `🏰`,
        desc: `The ultimate lemonade destination!`,
        effect: `A huge popularity boost, faster serving, and a longer line of patient customers.`,
      },
    ],
    D = (e) => h.upgrades.includes(e);
  function O() {
    return f(
      5 -
        !!D(`juicer`) -
        !!D(`powerjuicer`) -
        !!D(`register`) -
        (D(`dispenser`) ? 2 : 0) -
        !!D(`icemaker`) -
        !!D(`castle`),
      1,
      6,
    );
  }
  function ee() {
    return 4 + +!!D(`classic`) + (D(`castle`) ? 3 : 0);
  }
  function k() {
    return 8 + (D(`shade`) ? 6 : 0) + (D(`castle`) ? 4 : 0);
  }
  function A() {
    return D(`icedispenser`) || D(`icemaker`);
  }
  function j() {
    let e = E[g];
    if (!e) return;
    let n = D(e.id);
    ((t(`upgradeCard`).innerHTML =
      `<div class="upgrade-heading"><div class="upgrade-art">${e.icon}</div><h3>${e.name}</h3></div><p>${e.desc}</p><div class="upgrade-price">${u(e.price)}</div>`),
      (t(`upgradeCount`).textContent = `${g + 1} / ${E.length} upgrades`),
      (t(`upgradeBenefit`).textContent = `⭐ ` + e.effect),
      (t(`buyUpgrade`).disabled = n || _ || h.cash + 1e-7 < e.price),
      (t(`buyUpgrade`).textContent = n
        ? `✓ OWNED`
        : h.cash < e.price
          ? `NEED ` + u(e.price - h.cash) + ` MORE`
          : `BUY FOR ` + u(e.price)));
  }
  function te() {
    let e = E[g];
    !e ||
      D(e.id) ||
      _ ||
      h.cash + 1e-7 < e.price ||
      ((h.cash = d(h.cash - e.price)),
      h.upgrades.push(e.id),
      h.ledger.push({
        day: h.day,
        desc: `Purchased equipment: ` + e.name,
        cash: -e.price,
        category: `equipment`,
      }),
      L(),
      U(),
      M(`⚙️ ` + e.name + ` installed!`));
  }
  function M(message) {
    const el = t("neighborhoodEvent");
    if (h.dismissedEvent === `${h.day}:${message}`) return;
    el.replaceChildren(document.createTextNode(message));
    const ok = document.createElement("button");
    ok.type = "button";
    ok.textContent = "OK";
    ok.addEventListener("click", () => {
      el.hidden = true;
      h.dismissedEvent = `${h.day}:${message}`;
      L();
    });
    el.append(ok);
    el.hidden = false;
  }

  function N() {
    if (h.day < 4) return 0;
    let e = h.day < 9 ? 0.18 : 0.29,
      t =
        (D(`classic`) ? 0.035 : 0) +
        (D(`music`) ? 0.025 : 0) +
        (D(`lemonstand`) ? 0.09 : 0) +
        (D(`lights`) ? 0.035 : 0) +
        (D(`castle`) ? 0.15 : 0);
    return f(e - t, 0.02, 0.55);
  }
  function P() {
    Ge.businessClosed = !!h.closed;
    if (h.closed && Ge.avatarController.enabled)
      Ge.avatarController.setEnabled(false);
    Ge.updateState(h, ve());
    let e = N() > 0;
    ((t(`competitorStand`).hidden = T !== `outside` || !e),
      (t(`rivalPrice`).textContent = u(
        h.location === `beach` ? 2.75 : h.location === `square` ? 2.5 : 2,
      )),
      t(`playerStand`).classList.toggle(
        `fancy`,
        D(`classic`) || D(`lemonstand`),
      ),
      t(`playerStand`).classList.toggle(`castle`, D(`castle`)),
      t(`playerStand`).classList.toggle(`fast`, D(`juicer`) && !D(`classic`)),
      (t(`districtTag`).textContent = ne()),
      I(),
      re(),
      _ ||
        ((t(`queueDeck`).innerHTML = ``),
        (t(`worldLiveStats`).textContent =
          `🥤 ${O()} serving steps · ${D(`fridge`) ? `❄ Lemons protected` : `🍋 Lemons last 2 days`}`)),
      e
        ? M(
            `⚔️ A competing stand moved nearby! Your pricing, service, and reputation matter now.`,
          )
        : h.day === 1 && (t(`neighborhoodEvent`).hidden = !0),
      ie(T));
  }
  function F() {
    if (!v) return;
    Ge.setQueue(v.queue);
    let e = [`#698fbf`, `#dd8762`, `#ae85bd`, `#5eaa87`, `#e7ab57`];
    ((t(`queueDeck`).innerHTML = v.queue
      .map(
        (t, n) =>
          `<div class="queue-person" style="--shirt:${e[n % e.length]};--skin:${n % 2 ? `#e4b286` : `#b97c59`}" title="Waiting in line"></div>`,
      )
      .join(``)),
      (t(`worldLiveStats`).textContent =
        `👥 In line: ` +
        v.queue.length +
        `  ·  😠 Left upset: ` +
        v.leftUpset +
        `  ·  🥤 Sold: ` +
        v.sold));
  }
  function ne() {
    return h.location === `square`
      ? `🏙️ BUSY BLOCK`
      : h.location === `beach`
        ? `🏖️ BOARDWALK`
        : `🍋 YOUR STREET`;
  }
  function I() {
    let e = [];
    (D(`lights`) && e.push(`💡`),
      D(`music`) && e.push(`📻`),
      D(`shade`) && e.push(`⛱️`),
      D(`register`) && e.push(`🧮`),
      (t(`standBadges`).innerHTML = e
        .map((e) => `<span>${e}</span>`)
        .join(``)));
  }
  function re() {
    let e = [
      {
        icon: `🍹`,
        name: `Pitcher station`,
        desc: `Basic lemonade prep area.`,
      },
    ];
    (D(`juicer`) &&
      e.push({
        icon: `🧃`,
        name: `Citrus juicer`,
        desc: `Faster lemon prep.`,
      }),
      D(`powerjuicer`) &&
        e.push({
          icon: `⚡`,
          name: `Power juicer`,
          desc: `Very fast lemon prep.`,
        }),
      D(`register`) &&
        e.push({
          icon: `🧮`,
          name: `Cash register`,
          desc: `Quicker checkout.`,
        }),
      D(`fridge`) &&
        e.push({
          icon: `🧊`,
          name: `Mr. Fridge`,
          desc: `Keeps lemons fresh.`,
        }),
      D(`icedispenser`) &&
        e.push({
          icon: `❄️`,
          name: `Ice dispenser`,
          desc: `Makes recipe ice free.`,
        }),
      D(`dispenser`) &&
        e.push({
          icon: `🥤`,
          name: `Drink dispenser`,
          desc: `Speeds up serving.`,
        }),
      D(`icemaker`) &&
        e.push({
          icon: `🧊`,
          name: `Auto ice maker`,
          desc: `Plenty of ice on hand.`,
        }),
      D(`castle`) &&
        e.push({
          icon: `🏰`,
          name: `Castle build-out`,
          desc: `Premium stand layout.`,
        }),
      D(`music`) &&
        e.push({
          icon: `📻`,
          name: `Sound system`,
          desc: `Adds personality outside.`,
        }),
      D(`lights`) &&
        e.push({
          icon: `💡`,
          name: `Neon lights`,
          desc: `Helps the stand get noticed.`,
        }),
      (t(`interiorEquipment`).innerHTML = e
        .map(
          (e) =>
            `<div class="equip-card"><div class="equip-icon">${e.icon}</div><strong>${e.name}</strong><span>${e.desc}</span></div>`,
        )
        .join(``)));
    let n = [
      [`🍋`, `Lemons`, Math.round(h.inventory.lemons)],
      [`🍬`, `Sugar`, Math.round(h.inventory.sugar)],
      [`🧊`, `Ice`, Math.round(h.inventory.ice)],
      [`🥤`, `Cups`, Math.round(h.inventory.cups)],
      [`🍹`, `Can make`, De(h.inventory)],
    ];
    ((t(`interiorStorage`).innerHTML = n
      .map(
        ([e, t, n]) =>
          `<div class="storage-card"><div>${e}</div><b>${n}</b><span>${t}</span></div>`,
      )
      .join(``)),
      (t(`interiorCaption`).textContent =
        (D(`castle`)
          ? `Castle Stand`
          : D(`lemonstand`)
            ? `Landmark Lemon Stand`
            : D(`classic`)
              ? `Classic Stand`
              : `Starter Stand`) + ` · inside view`),
      (t(`insideStatus`).textContent =
        `You can currently make ${De(h.inventory)} cups. Service speed: ${O()} step${O() === 1 ? `` : `s`} per cup.`),
      I(),
      t(`insideShell`).classList.toggle(`castle`, D(`castle`)),
      t(`insideShell`).classList.toggle(
        `fancy`,
        D(`classic`) || D(`lemonstand`),
      ));
  }
  function ie(n) {
    ((T =
      n === `inside` ? `inside` : n === `exterior` ? `exterior` : `outside`),
      (t(`scene`).dataset.view = T),
      Ge.setView(
        T === `outside`
          ? `neighborhood`
          : T === `inside`
            ? `interior`
            : `exterior`,
      ));
    for (let t of e.querySelectorAll(`[data-scene-view]`)) {
      let e = t.dataset.sceneView === T;
      (t.classList.toggle(`active`, e),
        t.setAttribute(`aria-pressed`, String(e)));
    }
    ((t(`sceneBack`).hidden = T === `outside`), re());
  }
  function ae() {
    let e = d(h.lemonLots.reduce((e, t) => e + t.qty, 0)),
      t = d(h.inventory.lemons - e);
    if ((t > 0.001 && h.lemonLots.push({ day: h.day, qty: t }), t < -0.001)) {
      let e = -t;
      for (let t of h.lemonLots) {
        let n = Math.min(t.qty, e);
        if (((t.qty = d(t.qty - n)), (e = d(e - n)), e <= 0)) break;
      }
      h.lemonLots = h.lemonLots.filter((e) => e.qty > 0.001);
    }
  }
  function oe(e) {
    ae();
    let t = d(e);
    h.lemonLots.sort((e, t) => e.day - t.day);
    for (let e of h.lemonLots) {
      let n = Math.min(t, e.qty);
      if (((e.qty = d(e.qty - n)), (t = d(t - n)), t <= 0)) break;
    }
    ((h.lemonLots = h.lemonLots.filter((e) => e.qty > 0.001)),
      (h.inventory.lemons = d(Math.max(0, h.inventory.lemons - e))));
  }
  function se() {
    if (D(`fridge`)) {
      h.daySpoilage = { day: h.day, lemons: 0, cost: 0 };
      return;
    }
    ae();
    let e = 0;
    for (let t of h.lemonLots)
      h.day - t.day >= 2 && ((e = d(e + t.qty)), (t.qty = 0));
    ((h.lemonLots = h.lemonLots.filter((e) => e.qty > 0.001)),
      (e = Math.min(e, h.inventory.lemons)),
      (h.inventory.lemons = d(Math.max(0, h.inventory.lemons - e))),
      (h.daySpoilage = { day: h.day, lemons: e, cost: d(e * r.lemons.unit) }),
      e &&
        h.ledger.push({
          day: h.day,
          desc: e + ` lemons expired (inventory write-off)`,
          cash: 0,
          category: `spoilage`,
          expense: h.daySpoilage.cost,
        }));
  }
  function L() {
    try {
      localStorage.setItem(`lemonadeLane_bank_v3`, JSON.stringify(h));
    } catch {}
  }
  function ce() {
    return h.bank.loans.find((e) => e.balance > 0.001 && e.type !== "secured");
  }
  function R() {
    return h.bank.creditEstablished
      ? h.bank.creditScore >= 720
        ? `Excellent`
        : h.bank.creditScore >= 670
          ? `Good`
          : h.bank.creditScore >= 620
            ? `Fair`
            : `Needs improvement`
      : `Not established`;
  }
  function le() {
    return h.bank.loans.some(
      (loan) => loan.balance > 0 && h.day >= loan.nextDue - 2,
    );
  }
  function ue() {
    let e = h.bank;
    return e.loans.length
      ? e.onTime < 3 || e.creditScore < 620
        ? 0
        : e.creditScore >= 780
          ? 3e3
          : e.creditScore >= 720
            ? 1500
            : e.creditScore >= 670
              ? 500
              : 250
      : 100;
  }
  function z(e) {
    return Math.min(e.balance, d(e.total / 5));
  }
  function B(e, n = !1) {
    ((t(`bankMessage`).textContent = e),
      (t(`bankMessage`).hidden = !1),
      t(`bankMessage`).classList.toggle(`error`, n));
  }
  function de(t) {
    w = t;
    for (let n of e.querySelectorAll(`[data-bank-tab]`)) {
      let e = n.dataset.bankTab === t;
      (n.classList.toggle(`active`, e),
        n.setAttribute(`aria-selected`, String(e)));
    }
    for (let n of e.querySelectorAll(`[data-bank-pane]`))
      n.hidden = n.dataset.bankPane !== t;
    (_e(), t === `investments` && Ke.open());
  }
  function fe(e, n) {
    ((t(`standScreen`).hidden = e !== `stand`),
      (t(`bankScreen`).hidden = e !== `bank`),
      (t(`cupCapacityBanner`).hidden = e !== `stand`),
      e === `bank` ? ((t(`bankMessage`).hidden = !0), de(n || w)) : U(),
      window.scrollTo({ top: 0, behavior: `instant` }));
  }
  function pe(amount) {
    if (_) return;
    if (ce())
      return B(
        "Pay off your current standard loan before applying for another.",
        true,
      );
    if (!Number.isFinite(amount) || amount < 50 || amount > ue())
      return B("This loan is not available for your credit score.", true);
    originate(h, amount);
    L();
    U();
    de("overview");
    B("Loan approved. Withdraw checking money to buy supplies.");
  }

  function me(e, t) {
    if (_) {
      B(`Finish your business day before moving money.`, !0);
      return;
    }
    let n = h.bank,
      r = e === `withdraw` ? n.checking : h.cash,
      i = t === `all` ? r : Number(t);
    ((i = d(i)),
      i <= 0 || !Number.isFinite(i) || i > r + 1e-6
        ? B(`There isn’t enough money in that account for this transfer.`, !0)
        : (e === `withdraw`
            ? ((n.checking = d(n.checking - i)), (h.cash = d(h.cash + i)))
            : ((n.checking = d(n.checking + i)), (h.cash = d(h.cash - i))),
          h.ledger.push({
            day: h.day,
            desc:
              e === `withdraw`
                ? `Withdrew ` + u(i) + ` to stand`
                : `Deposited ` + u(i) + ` at bank`,
            category: `transfer`,
            cash: e === `withdraw` ? i : -i,
            bankChange: e === `withdraw` ? -i : i,
          }),
          L(),
          U(),
          B(
            e === `withdraw`
              ? u(i) + ` moved to your stand. You can now buy supplies.`
              : u(i) + ` deposited in checking.`,
          )));
  }
  function he(id, full = false) {
    if (_) return;
    const loan =
      h.bank.loans.find((l) => l.id === Number(id) && l.balance > 0) || ce();
    if (!loan) return;
    try {
      const amount = payLoan(h, loan, full);
      L();
      U();
      B(`${u(amount)} paid${full ? " in full" : ""}.`);
    } catch (error) {
      B(error.message, true);
    }
  }

  function ge() {
    const quotes = Object.fromEntries(
      Object.entries(h.bank.portfolio?.positions || {}).map(([symbol, pos]) => [
        symbol,
        pos.lastPrice,
      ]),
    );
    processOverdue(h, quotes);
  }

  function _e() {
    let n = h.bank,
      r = ce();
    ((n.investments = Ke.value()),
      Ke.render(),
      (t(`bankDay`).textContent = `DAY ` + h.day),
      (t(`bankChecking`).textContent = u(n.checking)),
      (t(`bankDebt`).textContent = u(debt(h))),
      (t(`bankInvestments`).textContent = u(n.investments)),
      (t(`bankStandCash`).textContent = u(h.cash)),
      (t(`bankAccountCash`).textContent = u(n.checking)),
      (t(`creditScore`).textContent = n.creditEstablished
        ? n.creditScore
        : `—`),
      (t(`creditCaption`).textContent = R()),
      (t(`creditStats`).textContent =
        n.onTime + ` on time · ` + n.missed + ` missed`),
      (t(`creditFill`).style.width = n.creditEstablished
        ? ((n.creditScore - 300) / 550) * 100 + `%`
        : `0%`),
      (t(`bankAlert`).textContent = le() ? `PAYMENT!` : ``),
      (t(`loanTabAlert`).textContent = le() ? `●` : ``));
    for (let t of e.querySelectorAll(`[data-transfer]`)) {
      let e = t.dataset.amount,
        r = t.dataset.transfer === `withdraw` ? n.checking : h.cash;
      t.disabled = _ || r <= 0 || (e !== `all` && r < Number(e));
    }
    renderLoans();
  }

  function ve() {
    return l[(h.day - 1) % l.length];
  }
  function ye() {
    let e = n[h.location],
      t = ve();
    return Math.max(
      9,
      Math.round(
        e.foot *
          (1 + recipeBonus(h)) *
          (h.location === `beach` && t.name === `Rainy` ? 0.54 : t.mult),
      ),
    );
  }
  function V() {
    return satisfaction(h, ve().temp) / 10;
  }

  function be() {
    let e = h.recipe;
    return e.lemons * 0.5 + e.sugar * 0.2 + (A() ? 0 : e.ice * 0.1) + 1.6;
  }
  function productionCups() {
    return Math.min(Se(), De(h.inventory));
  }
  function xe() {
    return d((be() * productionCups()) / 10);
  }

  function Se() {
    return h.pitchers * 10;
  }
  function stockWarning() {
    const capacity = productionCups();
    return capacity < Se()
      ? `Limited supplies: you can make ${capacity} of ${Se()} planned cups. You may open anyway; sales stop when stock runs out. The full permit is still charged.`
      : "";
  }

  function we() {
    if (h.closed)
      return "This business is closed. Use Books to export your results.";
    if (["lemons", "sugar", "ice"].some((key) => h.recipe[key] <= 0))
      return "Enter a recipe with lemons, sugar, and ice before opening.";
    if (h.cash === 0 && Object.values(h.inventory).every((e) => e === 0))
      return h.bank.checking > 0
        ? `Your money is in checking. Visit the Bank → Account and withdraw some cash for supplies.`
        : `You have $0 at the stand. Visit the Bank → Loans to borrow startup money, then withdraw it for supplies.`;
    if (h.cash < n[h.location].fee)
      return `Not enough cash to pay this location’s permit.`;
    return "";
  }
  // Purchased recipes affect traffic only on an exact match; free guesses retain baseline taste effects.
  function Te() {
    const owned = RECIPES.filter((recipe) =>
      h.purchasedRecipes.includes(recipe.id),
    );
    return (
      "Recipes can be bought at the Downtown Bookstore!" +
      (owned.length
        ? " " +
          owned
            .map(
              (recipe) =>
                `Owned ${recipe.name}: ${recipe.lemons} Lemons, ${recipe.sugar} sugar, ${recipe.ice} ice (satisfaction ${{ good: 7, better: 8, best: 9 }[recipe.id]}/10 when matched exactly).`,
            )
            .join(" ")
        : "")
    );
  }

  function Ee(e) {
    return Number(e.toFixed(2)).toLocaleString(`en-US`, {
      maximumFractionDigits: 1,
    });
  }
  function De(e, t = h.recipe) {
    return xl(e, t, A());
  }
  function Oe() {
    Ge.updateState(h, ve());
    for (let e of o) {
      let n = t(`stock` + e[0].toUpperCase() + e.slice(1));
      n && (n.textContent = Ee(h.inventory[e]));
    }
    t(`cupCapacity`).textContent = De(h.inventory).toLocaleString(`en-US`);
  }
  function ke() {
    let e = { lemons: 0, sugar: 0, ice: 0, cups: 0 },
      t = 0,
      n = 0;
    for (let a of o)
      for (let o = 0; o < 3; o++) {
        let s = c[a][o];
        ((n += s), (e[a] += s * i[a][o]), (t += s * i[a][o] * r[a].unit));
      }
    return {
      added: e,
      cost: d(t),
      packs: n,
      after: Object.fromEntries(o.map((t) => [t, d(h.inventory[t] + e[t])])),
    };
  }
  function Ae() {
    let e = t(`supplyCategories`);
    ((e.innerHTML = o
      .map(
        (e) =>
          `<button type="button" role="tab" class="supply-category" data-supply-category="${e}" aria-selected="${String(s === e)}"><span class="icon">${r[e].icon}</span><span>${a[e]}</span></button>`,
      )
      .join(``)),
      (t(`inventory`).innerHTML = i[s]
        .map(
          (e, t) =>
            `<div class="classic-supply-row"><div class="classic-pack-icon">${r[s].icon}</div><div class="classic-pack-info">${e.toLocaleString(`en-US`)} ${s === `lemons` ? `lemons` : s === `cups` ? `cups` : s === `ice` ? `cubes` : `scoops`}<small>${u(d(e * r[s].unit))} per pack</small></div><button type="button" class="classic-stepper" data-supply-step="-1" data-tier="${t}" aria-label="Remove a ${e}-item package" ${c[s][t] === 0 || _ ? `disabled` : ``}>−</button><strong class="classic-pack-count" aria-label="Selected packages">${c[s][t]}</strong><button type="button" class="classic-stepper" data-supply-step="1" data-tier="${t}" aria-label="Add a ${e}-item package" ${c[s][t] >= 25 || _ ? `disabled` : ``}>+</button></div>`,
        )
        .join(``)));
    let n = ke();
    ((t(`supplyCartCount`).textContent =
      n.packs + ` package` + (n.packs === 1 ? `` : `s`)),
      (t(`supplyCartTotal`).textContent = u(n.cost)),
      (t(`supplyAvailable`).textContent =
        `Stand cash: ` +
        u(h.cash) +
        (n.cost > h.cash + 1e-6
          ? ` · Need ` + u(n.cost - h.cash) + ` more`
          : ``)),
      (t(`reviewSupplies`).disabled = _ || n.packs === 0),
      (t(`clearSupplyCart`).disabled = _ || n.packs === 0));
  }
  function je(e, t) {
    if (_) return;
    let n = c[s][e];
    ((c[s][e] = f(n + t, 0, 25)), Ae());
  }
  function Me() {
    ((c = Object.fromEntries(o.map((e) => [e, [0, 0, 0]]))), Ae());
  }
  function Ne() {
    if (_) return;
    let e = ke();
    if (!e.packs) return;
    S = `supplies`;
    let n = e.cost <= h.cash + 1e-6,
      i = De(h.inventory),
      s = De(e.after);
    ((t(`modalBody`).innerHTML =
      `<div class="kicker">SUPPLY STORE · REVIEW ORDER</div><h2>📦 Confirm your supplies</h2><p>Review what you already own, what you are adding, and your inventory <strong>after</strong> the purchase.</p><table class="supply-review-table"><thead><tr><th>SUPPLY</th><th>ON HAND</th><th>ADDING</th><th>NEW TOTAL</th></tr></thead><tbody>${o.map((t) => `<tr><td>${r[t].icon} ${a[t]}</td><td>${Ee(h.inventory[t])}</td><td class="adding">+${Ee(e.added[t])}</td><td>${Ee(e.after[t])}</td></tr>`).join(``)}</tbody></table><div class="supply-capacity-result"><div class="capacity-label">TOTAL NUMBER OF CUPS YOU'RE ABLE TO MAKE WITH THIS INVENTORY</div><div class="capacity-result-numbers"><div><b>${i}</b><br><small>BEFORE</small></div><span class="arrow">→</span><div><b>${s}</b><br><small>AFTER PURCHASE</small></div></div></div><p><strong>Order cost: ${u(e.cost)}</strong><br>Cash on hand: ${u(h.cash)}<br>Cash after purchase: ${u(h.cash - e.cost)}</p>${n ? `` : `<div class="notice">Not enough money at the stand for this order. You can change your quantities or withdraw money from the bank.</div>`}<div class="supply-modal-actions"><button type="button" class="cancel-buy" id="cancelSupplyPurchase">Cancel</button><button type="button" class="confirm-buy" id="confirmSupplyPurchase" ${n ? `` : `disabled`}>✓ Confirm Purchase</button></div>`),
      We());
  }
  function H() {
    if (_ || S !== `supplies`) return;
    let e = ke();
    if (e.packs === 0 || e.cost > h.cash + 1e-6) Ne();
    else {
      h.cash = d(h.cash - e.cost);
      for (let t of o)
        ((h.inventory[t] = d(h.inventory[t] + e.added[t])),
          t === `lemons` &&
            e.added[t] &&
            h.lemonLots.push({ day: h.day, qty: e.added[t] }),
          e.added[t] &&
            h.ledger.push({
              day: h.day,
              desc: `Bought ` + e.added[t] + ` ` + a[t].toLowerCase(),
              cash: -d(e.added[t] * r[t].unit),
              category: `supplies`,
            }));
      (Me(), L(), J(), U());
    }
  }
  function Pe(e) {
    for (let t of o) {
      if (t === `ice` && A()) continue;
      let n = t === `cups` ? e : (h.recipe[t] * e) / 10;
      t === `lemons`
        ? oe(n)
        : (h.inventory[t] = Math.max(0, d(h.inventory[t] - n)));
    }
  }
  function Fe() {
    renderResults();
  }

  function Ie(n) {
    C = n;
    if (n === "results") renderResults();
    for (let t of e.querySelectorAll(`[data-tab]`)) {
      let e = t.dataset.tab === n;
      (t.classList.toggle(`active`, e),
        t.setAttribute(`aria-selected`, String(e)),
        (t.tabIndex = e ? 0 : -1));
    }
    for (let t of e.querySelectorAll(`[data-pane]`))
      t.hidden = t.dataset.pane !== n;
    let r = {
      location: `Choose a spot`,
      recipe: `Mix your recipe`,
      price: `Set your price`,
      supplies: `Buy supplies`,
      upgrades: `Business upgrades`,
      results: `Results & Projections`,
    };
    t(`panelTitle`).textContent = r[n];
  }
  function U() {
    let r = ve(),
      i = n[h.location];
    ((t(`dayPill`).textContent = `DAY ` + h.day),
      (t(`cashHead`).textContent = u(h.cash)),
      (t(`weatherLabel`).textContent =
        r.icon + ` ` + r.name + ` · ` + r.temp + `°F`),
      (t(`crowdLabel`).textContent = `Expected Visitors: ` + ye()),
      t(`scene`).classList.toggle(`rain`, r.name === `Rainy`),
      (t(`scene`).dataset.location = h.location),
      (t(`standPrice`).textContent = u(h.price) + ` / CUP`),
      (t(`feeBadge`).textContent = u(i.fee) + ` permit`),
      (t(`placeName`).textContent = i.name));
    let a =
      h.location === `beach`
        ? `Waterfront`
        : h.location === `square`
          ? `Downtown`
          : h.location === `park`
            ? `Park`
            : `Neighborhood`;
    ((t(`areaHeading`).textContent =
      a === `Downtown` || a === `Waterfront`
        ? a.toUpperCase()
        : `THE ` + a.toUpperCase()),
      (e.querySelector(`[data-scene-view=outside]`).textContent = a),
      (t(`sceneBack`).textContent = `← Back to ` + a.toLowerCase()),
      (t(`locationHint`).textContent =
        i.desc +
        (h.location === "square"
          ? " Walk to BOOKS (left of the bakery) to buy recipes; Maple Market is behind the bakery, across the side street. Use WASD/arrows or the on-screen pad; click a shop door or press E next to it to enter."
          : "")),
      (t(`priceValue`).textContent = u(h.price)),
      (t(`pitcherValue`).textContent = h.pitchers));
    for (let e of [`lemons`, `sugar`, `ice`])
      t(`recipe` + e[0].toUpperCase() + e.slice(1)).textContent =
        h.recipe[e].toFixed(1);
    const tasteButton = t("ownerTasteTest"),
      tasteResult = t("ownerTasteResult");
    tasteButton.disabled = _ || h.closed || h.cash < 0.5;
    const last = h.lastTasteTest;
    const same =
      last &&
      last.temperature === ve().temp &&
      ["lemons", "sugar", "ice"].every(
        (key) => last.recipe[key] === h.recipe[key],
      );
    tasteResult.textContent = same
      ? `Owner taste test: ${last.rating}/10 (10 is best).`
      : "Each taste test costs $0.50 in stand cash. Scores range from 1 (worst) to 10 (best).";
    ((t(`tasteHint`).textContent = Te()),
      (t(`planCups`).textContent =
        productionCups() === Se() ? Se() : `${productionCups()} / ${Se()}`),
      (t(`planCost`).textContent = u(xe())),
      (t(`planMax`).textContent = u(
        productionCups() * h.price - xe() - i.fee,
      )));
    let o = Math.ceil((xe() + i.fee) / h.price);
    t(`breakEven`).textContent = `Sell ` + o + ` cups to break even`;
    for (let t of e.querySelectorAll(`[data-loc]`))
      t.classList.toggle(`active`, t.dataset.loc === h.location);
    if ((Oe(), Ae(), Fe(), _e(), j(), P(), !_)) {
      let e = we();
      ((t(`validation`).style.display = e || stockWarning() ? `block` : `none`),
        (t(`validation`).textContent = e || stockWarning()));
      let n = h.history.some((e) => e.day === h.day);
      const insolvent = isInsolvent(h, Ke.value(), rSupplies());
      const close = insolvent && !canBorrowAnything();
      ((t(`startBtn`).disabled = h.closed || (!close && (!!e || n))),
        (t(`startBtn`).textContent = h.closed
          ? `Business closed`
          : close
            ? `Close Business`
            : n
              ? `Day finished ✓`
              : `▶ START DAY`),
        (t(`phaseLabel`).textContent = n ? `DAY FINISHED` : `READY TO OPEN`),
        (t(`sceneTitle`).textContent = h.history.length
          ? `Ready for another day?`
          : `Your lemonade stand`),
        (t(`sceneDescription`).textContent = h.history.length
          ? `Change your plan and see what happens.`
          : `Make your choices, then start selling!`),
        n &&
          ((t(`validation`).style.display = `block`),
          (t(`validation`).textContent =
            `This day is finished. Use Results to start the next day.`)));
    }
    if (
      (T === `inside`
        ? ((t(`sceneTitle`).textContent = `Inside your stand`),
          (t(`sceneDescription`).textContent =
            `See your workspace, upgrades, and inventory storage. Click back outside whenever you want.`))
        : C === `upgrades` &&
          !_ &&
          (t(`sceneDescription`).textContent =
            `Click on your stand to pop inside and see how new equipment changes the business.`),
      !v)
    ) {
      let e = h.history[h.history.length - 1];
      ((t(`scoreVisitors`).textContent = e ? e.visitors : `—`),
        (t(`scoreSold`).textContent = e ? e.sold : `—`),
        (t(`scoreRevenue`).textContent = e ? u(e.revenue) : `—`),
        (t(`scoreProfit`).textContent = e ? u(e.profit) : `—`),
        (t(`scoreProfit`).className = e
          ? e.profit < 0
            ? `negative`
            : `profit`
          : ``),
        (t(`latestResult`).textContent = e
          ? `Day ` +
            e.day +
            ` · ` +
            (e.profit >= 0
              ? `You made ` + u(e.profit) + `!`
              : `You lost ` + u(-e.profit) + `.`)
          : `Finish your first day to see your results.`),
        (t(`resultNext`).hidden = !(e && e.day === h.day)),
        (t(`competitionResults`).textContent = e
          ? `😠 ${e.leftUpset || 0} customers left upset · ⚔️ ${e.lostCompetitor || 0} chose a competitor · ⏳ Served each cup in ${e.serviceSteps || 5} steps`
          : `Long lines can cost you sales. Faster equipment and patient customers help.`));
    }
  }
  function Le(key, change) {
    if (_ || h.closed) return;
    const max = { lemons: 6, sugar: 6, ice: 8 };
    h.recipe[key] = d(f(h.recipe[key] + change * 0.1, 0, max[key]));
    L();
    U();
  }

  function W(e, t) {
    _ ||
      (e === `pitchers`
        ? (h.pitchers = f(h.pitchers + t, 1, 12))
        : (h.price = d(f(h.price + 0.25 * t, 0.75, 5))),
      L(),
      U());
  }
  function G() {
    let e = n[h.location],
      t = ve(),
      r = h.price / (e.willing + (t.temp > 89 ? 0.2 : 0)),
      i = 1 / (1 + Math.exp((r - 1.2) * 2.2 * e.sensitivity)),
      a = V();
    return f(
      (0.12 + 0.78 * i) * (0.55 + 0.52 * a) * (t.name === `Rainy` ? 0.89 : 1) +
        (D(`music`) ? 0.09 : 0) +
        (D(`classic`) ? 0.04 : 0) +
        (D(`lights`) ? 0.07 : 0) +
        (D(`lemonstand`) ? 0.11 : 0) +
        (D(`castle`) ? 0.14 : 0),
      0.05,
      0.95,
    );
  }
  function Re(e, t) {
    Ge.customerEvent(e, t);
  }
  function K() {
    if (h.closed) return;
    if (!_ && isInsolvent(h, Ke.value(), rSupplies()) && !canBorrowAnything())
      return closeBusiness();
    if (_ || we() || h.history.some((e) => e.day === h.day)) return;
    _ = !0;
    let r = n[h.location],
      i = ve(),
      a = xe();
    ((h.cash = d(h.cash - r.fee)),
      h.ledger.push({
        day: h.day,
        desc: r.name + ` stand permit`,
        cash: -r.fee,
        category: `permit`,
      }));
    let o = ye(),
      s = O();
    ((v = {
      day: h.day,
      location: h.location,
      weather: i.name,
      recipeBonus: recipeBonus(h),
      upgradeInterestBonus: upgradeInterestBonus(),
      recipe: { ...h.recipe },
      upgrades: [...h.upgrades],
      visitors: 0,
      sold: 0,
      turnedAway: 0,
      leftUpset: 0,
      lostCompetitor: 0,
      capacity: productionCups(),
      revenue: 0,
      cost: a,
      permit: r.fee,
      profit: 0,
      unsold: 0,
      queue: [],
      stepsUntilSale: 0,
      serviceSteps: s,
      spoilCost: h.daySpoilage.day === h.day ? h.daySpoilage.cost : 0,
      spoiledLemons: h.daySpoilage.day === h.day ? h.daySpoilage.lemons : 0,
    }),
      (t(`scoreVisitors`).textContent = `0`),
      (t(`scoreSold`).textContent = `0`),
      (t(`scoreRevenue`).textContent = u(0)),
      (t(`scoreProfit`).textContent = `…`),
      e.classList.add(`running`),
      (t(`startBtn`).disabled = !0),
      (t(`startBtn`).textContent = `Stand is open…`),
      (t(`phaseLabel`).textContent = `🟢 OPEN FOR BUSINESS`),
      (t(`sceneTitle`).textContent = `Visitors are walking over…`),
      (t(`sceneDescription`).textContent =
        `Watch the line. Customers may leave if they wait too long.`),
      (t(`liveDisplay`).style.display = `block`),
      (t(`runningNote`).style.display = `block`),
      (t(`runProgress`).style.width = `0%`),
      Ae(),
      F());
    let c = G(),
      l = N(),
      f = 0,
      p = Ge.beginDay(o, 0.165);
    ((t(`worldLiveStats`).textContent =
      `🚶 Visitors are walking in from around the area`),
      (b = setTimeout(() => {
        ((b = null),
          _ &&
            v &&
            ((t(`sceneTitle`).textContent = `Open for business!`),
            (y = setInterval(() => {
              if (!v) return;
              let e = v,
                n = p.visitors[f].person;
              (f++, e.visitors++);
              for (let t of e.queue) t.wait++;
              let r = e.queue.filter((e) => e.wait > k());
              if (r.length) {
                ((e.leftUpset += r.length),
                  (e.turnedAway += r.length),
                  (e.queue = e.queue.filter((e) => e.wait <= k())));
                for (let e of r) Re(`upset`, e);
              }
              if (e.queue.length) {
                if ((e.stepsUntilSale--, e.stepsUntilSale <= 0)) {
                  let t = e.queue.shift();
                  (e.sold < e.capacity
                    ? (e.sold++,
                      (e.revenue = d(e.revenue + h.price)),
                      (h.cash = d(h.cash + h.price)),
                      Pe(1),
                      Oe(),
                      Re(`sale`, t))
                    : (e.leftUpset++, e.turnedAway++, Re(`upset`, t)),
                    (e.stepsUntilSale = s));
                }
              } else e.stepsUntilSale = s;
              (Math.random() < c
                ? Math.random() < l
                  ? (e.lostCompetitor++, Re(`rival`, n))
                  : e.sold + e.queue.length >= e.capacity ||
                      e.queue.length >= ee()
                    ? (e.leftUpset++, e.turnedAway++, Re(`upset`, n))
                    : e.queue.push(n)
                : Re(`pass`, n),
                F(),
                (t(`scoreVisitors`).textContent = e.visitors),
                (t(`scoreSold`).textContent = e.sold),
                (t(`scoreRevenue`).textContent = u(e.revenue)),
                (t(`latestResult`).textContent =
                  e.sold + ` cups sold so far · ` + u(e.revenue) + ` in sales`),
                (t(`runProgress`).style.width = (100 * e.visitors) / o + `%`),
                e.visitors >= o &&
                  (clearInterval(y), (y = null), (x = setTimeout(ze, 800))));
            }, 165))));
      }, p.lead * 1e3)));
  }
  function ze() {
    if (((x = null), !v)) return;
    let n = v;
    if (n.queue.length) {
      ((n.leftUpset += n.queue.length), (n.turnedAway += n.queue.length));
      for (let e of n.queue) Re(`upset`, e);
      ((n.queue = []), F());
    }
    ((n.unsold = n.capacity - n.sold),
      Pe(n.unsold),
      Oe(),
      (n.profit = d(n.revenue - n.cost - n.permit - n.spoilCost)),
      h.ledger.push({
        day: n.day,
        desc: `Lemonade sales: ` + n.sold + ` cups`,
        cash: n.revenue,
        category: `sales`,
      }),
      h.ledger.push({
        day: n.day,
        desc: `Ingredient expense: ` + n.capacity + ` cups brewed`,
        cash: 0,
        category: `cost`,
        expense: n.cost,
      }),
      h.history.push(n),
      L(),
      (_ = !1),
      (v = null),
      e.classList.remove(`running`),
      (t(`liveDisplay`).style.display = `none`),
      (t(`runningNote`).style.display = `none`),
      (t(`scoreProfit`).textContent = u(n.profit)),
      (t(`scoreProfit`).className = n.profit < 0 ? `negative` : `profit`),
      (t(`sceneTitle`).textContent = `Closing time!`),
      fe(`stand`),
      Ie(`results`),
      (t(`latestResult`).textContent =
        `Day ` +
        n.day +
        ` · ` +
        (n.profit >= 0
          ? `You made ` + u(n.profit) + `!`
          : `You lost ` + u(-n.profit) + `.`)),
      (t(`resultNext`).hidden = !1),
      (t(`phaseLabel`).textContent = `DAY FINISHED`),
      Fe(),
      Be(n));
  }
  function Be(e) {
    let n =
        e.leftUpset > 6
          ? `Customers are walking away from long lines! Try a faster juicer or register.`
          : e.unsold === 0
            ? `Sold out! More pitchers might mean more sales next time.`
            : e.unsold > e.capacity * 0.5
              ? `Lots of lemonade was left over. Try a lower price or make fewer pitchers.`
              : `Compare how much you earned with what you spent.`,
      r =
        e.profit >= 0
          ? `Your stand made a profit!`
          : `That day cost you money.`;
    ((S = `report`),
      (t(`modalBody`).innerHTML =
        `<div class="kicker">DAY ${e.day} · END OF DAY REPORT</div><h2>${e.profit >= 0 ? `🎉` : `📉`} ${r}</h2><p>${n}</p>
 <div class="report-grid"><div class="report-cell"><small>VISITORS</small><strong>${e.visitors}</strong></div><div class="report-cell"><small>CUPS SOLD</small><strong>${e.sold} / ${e.capacity}</strong></div><div class="report-cell"><small>LEFT UPSET</small><strong>${e.leftUpset}</strong></div><div class="report-cell"><small>CHOSE COMPETITOR</small><strong>${e.lostCompetitor}</strong></div><div class="report-cell"><small>UNSOLD · DISCARDED</small><strong>${e.unsold}</strong></div><div class="report-cell"><small>LEMONS SPOILED</small><strong>${e.spoiledLemons}</strong></div></div>
 <div class="kicker">INCOME STATEMENT</div><table class="income-table"><tr><td>Sales revenue</td><td class="win">+${u(e.revenue)}</td></tr><tr><td>Ingredients and cups used (all prepared)</td><td>−${u(e.cost)}</td></tr><tr><td>Location permit</td><td>−${u(e.permit)}</td></tr><tr><td>Lemons expired at start of day</td><td>−${u(e.spoilCost)}</td></tr><tr><td><strong>Operating profit</strong></td><td class="${e.profit >= 0 ? `win` : `lose`}">${u(e.profit)}</td></tr></table>
 <p class="fine">Stand cash: <strong>${u(h.cash)}</strong>. Equipment is a business asset, so upgrades are recorded as purchases in your books rather than as a day's lemonade expense. Prepared, unsold lemonade is discarded after closing.</p><button class="primary" id="nextDay">Plan Day ${e.day + 1} →</button>`),
      We());
  }
  function q() {
    (h.day++,
      se(),
      ge(),
      L(),
      (S = ``),
      t(`modal`).classList.remove(`show`),
      Ie(`location`),
      U(),
      (t(`sceneTitle`).textContent = `A new day, a fresh forecast`),
      (t(`lesson`).textContent =
        `Fast service wins customers. Spoilage and location fees are costs. Equipment is an asset—not a sale.`),
      h.daySpoilage.lemons &&
        M(
          `🍋 ` +
            h.daySpoilage.lemons +
            ` lemons expired! Loss: ` +
            u(h.daySpoilage.cost) +
            `. A fridge prevents this.`,
        ));
  }
  function Ve() {
    S = "books";
    t("modalBody").innerHTML =
      '<h2>Export your financial results?</h2><p>Download an Excel workbook with Income Statement, Balance Sheet, and Statement of Cash Flow.</p><button class="primary" id="exportExcel">Yes, download Excel</button><button class="subtle-btn" id="declineBooks">No</button><p><button class="small-link" id="exportStatementsCSV">Download statements as CSV files</button></p>';
    We();
  }

  function He() {
    let e = [
        [
          `Day`,
          `Description`,
          `Category`,
          `Stand cash change`,
          `Checking change`,
          `Loan change`,
          `Investment change`,
          `Trading fee`,
          `Market close date`,
        ],
        ...h.ledger.map((e) => [
          e.day,
          e.desc,
          e.category,
          e.cash || 0,
          e.bankChange || 0,
          e.loanChange || 0,
          e.investmentChange || 0,
          e.fee || 0,
          e.priceDate || ``,
        ]),
      ].map((e) =>
        e.map((e) => `"` + String(e).replaceAll(`"`, `""`) + `"`).join(`,`),
      ).join(`\r
`),
      t = document.createElement(`a`);
    ((t.href = URL.createObjectURL(new Blob([e], { type: `text/csv` }))),
      (t.download = `lemonade-lane-ledger.csv`),
      t.click(),
      setTimeout(() => URL.revokeObjectURL(t.href), 1e3));
  }
  function Ue() {
    ((S = `help`),
      (t(`modalBody`).innerHTML =
        `<div class="kicker">HOW TO PLAY</div><h2>🍋 Your first business</h2><p>You're the owner of a lemonade stand. Your goal: grow your business without running out of money.</p><div style="line-height:1.75"><p><strong>1. Choose a location.</strong> Expensive locations have more customers—but higher daily costs.</p><p><strong>2. Perfect your lemonade.</strong> More lemons, sugar, and ice affect flavor and ingredient costs.</p><p><strong>3. Choose a price and batch size.</strong> Low prices attract more people. Unsold lemonade spoils overnight.</p><p><strong>4. Visit the Bank.</strong> Borrow startup funds on the Loans tab, withdraw money from checking, then buy supplies. Future expansion loans require good repayment history and credit scores.</p><p><strong>5. Open your stand!</strong> Watch the street, then study the end-of-day financial results.</p></div><div class="notice">You start with $0 and no supplies. Use the big Bank arrow to apply for your first loan.</div><button class="small-link" id="resetBtn">Start over / reset business</button>`),
      We());
  }
  function We() {
    t(`modal`).classList.add(`show`);
  }
  function J() {
    S !== `report` && (t(`modal`).classList.remove(`show`), (S = ``));
  }
  function rSupplies() {
    return r;
  }
  function canBorrowAnything() {
    if (h.closed) return false;
    return (
      (!ce() && ue() >= 50) ||
      securedLimit(h, Ke.value()) >= 0.01 ||
      canRescue(h, Ke.value(), r)
    );
  }
  function renderLoans() {
    const bank = h.bank,
      limit = securedLimit(h, Ke.value()),
      active = bank.loans.filter((l) => l.balance > 0.001);
    let html = active
      .map((loan) => {
        const payment = z(loan),
          locked = h.day < loan.nextDue - 2;
        return `<div class="active-loan"><h4>${loan.type === "secured" ? "Investment-backed" : "Business"} loan #${loan.id}</h4><p>Borrowed ${u(loan.principal)} · Term interest ${u(loan.interest)} · Balance <strong>${u(loan.balance)}</strong><br>Next installment ${u(payment)} · Due Day ${loan.nextDue}</p><button class="bank-action" data-loan-pay="${loan.id}" ${_ || locked || bank.checking < payment ? "disabled" : ""}>Pay ${u(payment)}</button> <button class="bank-action" data-loan-full="${loan.id}" ${_ || bank.checking < loan.balance ? "disabled" : ""}>Pay in full (${u(loan.balance)})</button></div>`;
      })
      .join("");
    if (!ce()) {
      const max = ue(),
        amounts = !bank.loans.length
          ? [50, 75, 100]
          : [Math.min(100, max), Math.min(250, max), max].filter(
              (n, i, a) => n >= 50 && a.indexOf(n) === i,
            );
      html += `<h4>Business loans</h4>${max ? `<div class="loan-choices">${amounts.map((amount) => `<div class="loan-choice"><div class="loan-amount">${u(amount)}</div><p>10% term interest · Five installments, every five game days</p><button data-loan-apply="${amount}" ${_ ? "disabled" : ""}>Apply for ${u(amount)}</button></div>`).join("")}</div>` : "<p>New business loans require at least 620 credit and three on-time payments.</p>"}`;
    }
    html += `<div class="active-loan"><h4>Borrow against investments</h4><p>No credit-score minimum. Requires a portfolio worth at least $100. Total secured principal is limited to 50% of portfolio value and $10,000, regardless of cash or checking balances. Available: <strong>${u(limit)}</strong>.</p><label>Loan amount <input id="securedAmount" type="number" min="0.01" max="${limit}" step="0.01" value="${limit}"></label> <button class="bank-action" id="securedApply" ${_ || limit <= 0 ? "disabled" : ""}>Apply for investment-backed loan</button><p class="fine">10% term interest, five payments every five game days. Missed payments lower credit by 35 points and sell collateral to pay the installment plus a 2% liquidation fee ($1 minimum). Any uncovered amount remains owed. Encumbered investments cannot be sold below the required collateral. Pay in full at any time from checking.</p></div>`;
    if (canRescue(h, Ke.value(), r))
      html +=
        '<div class="active-loan"><h4>Emergency funds</h4><p>Your good credit qualifies for a $25 emergency advance added to your existing loan. Available once per game day when no sellable assets remain. Includes $2.50 term interest.</p><button class="bank-action" id="rescueLoan">Borrow $25</button></div>';
    t("loanArea").innerHTML = html;
  }
  function applySecured() {
    if (_ || h.closed) return;
    const amount = d(Number(t("securedAmount").value)),
      limit = securedLimit(h, Ke.value());
    if (!Number.isFinite(amount) || amount < 0.01 || amount > limit)
      return B("Enter an amount within the available collateral limit.", true);
    originate(h, amount, "secured");
    L();
    U();
    de("overview");
    B("Investment-backed loan deposited in checking.");
  }
  function rescueLoan() {
    if (_ || !canRescue(h, Ke.value(), r)) return;
    const loan =
      h.bank.loans.find((l) => l.balance > 0 && l.type !== "secured") ||
      h.bank.loans.find((l) => l.balance > 0);
    if (loan.type === "secured")
      loan.unsecuredAdvance = d((loan.unsecuredAdvance || 0) + 25);
    loan.principal = d(loan.principal + 25);
    loan.interest = d(loan.interest + 2.5);
    loan.total = d(loan.total + 27.5);
    loan.balance = d(loan.balance + 27.5);
    h.bank.checking = d(h.bank.checking + 25);
    h.rescueDay = h.day;
    h.ledger.push({
      day: h.day,
      desc: "Emergency advance added to loan #" + loan.id,
      category: "loan",
      cash: 0,
      bankChange: 25,
      loanChange: 27.5,
      expense: 2.5,
    });
    L();
    U();
    de("overview");
    B("Emergency $25 added to checking and your existing loan.");
  }
  function exportSheets() {
    return statements(h, r, E, Ke.value());
  }
  function openShop(shop) {
    if (_ || h.closed) return;
    S = shop;
    if (shop === "books") {
      t("modalBody").innerHTML =
        "<h2>Downtown Bookstore</h2><p>Buy a recipe once, then use its exact amounts for a visitor bonus. Recipes are for one 10-cup pitcher. Pay from stand cash.</p>" +
        RECIPES.map((recipe) => {
          const owned = h.purchasedRecipes.includes(recipe.id);
          return `<div class="shop-row"><h3>${recipe.name} recipe · ${u(recipe.price)} · +${recipe.boost * 100}% visitors</h3><p>${owned ? `${recipe.lemons.toFixed(1)} lemons · ${recipe.sugar.toFixed(1)} sugar · ${recipe.ice.toFixed(1)} ice` : "Purchase to reveal the ingredients."}</p><button data-buy-recipe="${recipe.id}" ${owned || h.cash < recipe.price ? "disabled" : ""}>${owned ? "Owned" : "Buy recipe"}</button>${owned ? ` <button data-use-recipe="${recipe.id}">Use recipe</button>` : ""}</div>`;
        }).join("");
    } else {
      t("modalBody").innerHTML =
        "<h2>Sell to Maple Market?</h2><p>Sell leftover supplies or equipment for 50% of their purchase price. Unsold prepared lemonade spoils at closing and cannot be resold. Review each offer before selling.</p>" +
        o
          .map(
            (key) =>
              `<div class="shop-row"><strong>${a[key]}: ${Ee(h.inventory[key])}</strong><p>Offer for all: ${u(d(h.inventory[key] * r[key].unit * 0.5))}</p><button data-sell-supply="${key}" ${h.inventory[key] <= 0 ? "disabled" : ""}>Sell all ${a[key].toLowerCase()}</button></div>`,
          )
          .join("") +
        h.upgrades
          .map((id) => {
            const item = E.find((e) => e.id === id);
            return item
              ? `<div class="shop-row"><strong>${item.name}</strong><p>Offer: ${u(d(item.price * 0.5))}</p><button data-sell-equipment="${id}">Sell equipment</button></div>`
              : "";
          })
          .join("");
    }
    t("modalBody").insertAdjacentHTML(
      "beforeend",
      '<button class="primary" id="leaveShop">No / leave shop</button>',
    );
    We();
  }
  function purchaseRecipe(id) {
    const recipe = RECIPES.find((r) => r.id === id);
    if (
      _ ||
      h.closed ||
      !recipe ||
      h.purchasedRecipes.includes(id) ||
      h.cash < recipe.price
    )
      return;
    h.cash = d(h.cash - recipe.price);
    h.purchasedRecipes.push(id);
    h.ledger.push({
      day: h.day,
      desc: `Purchased ${recipe.name} recipe`,
      cash: -recipe.price,
      expense: recipe.price,
      category: "recipe",
    });
    L();
    U();
    openShop("books");
  }
  function sellSupply(key) {
    if (_ || h.closed || !r[key]) return;
    const qty = h.inventory[key],
      cost = d(qty * r[key].unit),
      proceeds = d(cost * 0.5);
    if (qty <= 0) return;
    S = "sale";
    t("modalBody").innerHTML =
      `<h2>Confirm sale</h2><p>Sell ${Ee(qty)} ${a[key]} for ${u(proceeds)}? Original cost: ${u(cost)}.</p><button class="primary" data-confirm-supply="${key}">Yes, sell</button><button id="cancelSale">Cancel</button>`;
    We();
  }
  function confirmSupply(key) {
    if (_ || h.closed || S !== "sale" || !r[key]) return;
    const qty = h.inventory[key],
      cost = d(qty * r[key].unit),
      proceeds = d(cost * 0.5);
    if (qty <= 0) return;
    if (key === "lemons") oe(qty);
    else h.inventory[key] = 0;
    h.cash = d(h.cash + proceeds);
    h.ledger.push({
      day: h.day,
      desc: `Sold ${qty} ${a[key]} to Maple Market`,
      cash: proceeds,
      category: "inventory sale",
      gain: d(proceeds - cost),
    });
    L();
    U();
    openShop("market");
  }
  function sellEquipment(id, confirmed = false) {
    const item = E.find((e) => e.id === id);
    if (_ || h.closed || !item || !h.upgrades.includes(id)) return;
    if (!confirmed) {
      S = "sale";
      t("modalBody").innerHTML =
        `<h2>Confirm equipment sale</h2><p>Sell ${item.name} for ${u(d(item.price * 0.5))}? Its upgrade effect will be removed.</p><button class="primary" data-confirm-equipment="${id}">Yes, sell</button><button id="cancelSale">Cancel</button>`;
      We();
      return;
    }
    if (S !== "sale") return;
    const proceeds = d(item.price * 0.5);
    h.cash = d(h.cash + proceeds);
    h.upgrades = h.upgrades.filter((e) => e !== id);
    h.ledger.push({
      day: h.day,
      desc: `Sold equipment: ${item.name}`,
      cash: proceeds,
      category: "equipment sale",
      gain: d(proceeds - item.price),
    });
    L();
    U();
    openShop("market");
  }
  function upgradeInterestBonus() {
    return (
      (D("music") ? 0.09 : 0) +
      (D("classic") ? 0.04 : 0) +
      (D("lights") ? 0.07 : 0) +
      (D("lemonstand") ? 0.11 : 0) +
      (D("castle") ? 0.14 : 0)
    );
  }
  function forecast() {
    if (
      h.closed ||
      ["lemons", "sugar", "ice"].some((key) => h.recipe[key] <= 0)
    )
      return {
        day: h.day,
        income: 0,
        expenses: 0,
        profit: 0,
        visitors: ye(),
        recipeBonus: recipeBonus(h),
      };
    const visitors = ye(),
      interested = visitors * G() * (1 - N());
    const served = Math.min(
      productionCups(),
      Math.floor(interested),
      Math.floor(visitors / O()),
    );
    const revenue = d(served * h.price),
      expenses = d(
        xe() +
          n[h.location].fee +
          (h.daySpoilage.day === h.day ? h.daySpoilage.cost : 0),
      );
    return {
      day: h.day,
      income: revenue,
      expenses,
      profit: d(revenue - expenses),
      visitors,
      recipeBonus: recipeBonus(h),
    };
  }
  function graphHTML(rows, all = false) {
    if (!rows.length)
      return "<p>No completed days yet. Projections are estimates; actual sales depend on queues and customer choices.</p>";
    const width = Math.max(440, all ? rows.length * 70 : 440),
      height = 220,
      left = 44,
      right = width - 24,
      top = 25,
      bottom = 180;
    const max = Math.max(1, ...rows.flatMap((r) => [r.income, r.expenses])),
      min = Math.min(0, ...rows.flatMap((r) => [r.income, r.expenses]));
    const y = (v) => bottom - ((v - min) / (max - min)) * (bottom - top),
      x = (i) =>
        rows.length === 1
          ? (left + right) / 2
          : left + (i / (rows.length - 1)) * (right - left);
    const series = [
      ["income", "#26734b"],
      ["expenses", "#c45a35"],
    ];
    return `<div class="daily-graph-scroll"><svg class="daily-graph" viewBox="0 0 ${width} ${height}" style="min-width:${width}px" role="img" aria-label="Daily income and expenses line graph"><line x1="${left}" x2="${right}" y1="${y(0)}" y2="${y(0)}" stroke="#718276"/><text x="0" y="20">$${max.toFixed(0)}</text><text x="0" y="${y(0)}">$0</text>${series.map(([key, color]) => `<polyline points="${rows.map((r, i) => `${x(i)},${y(r[key])}`).join(" ")}" fill="none" stroke="${color}" stroke-width="3"/>` + rows.map((row, i) => `<circle data-result-day="${row.day}" tabindex="0" role="button" aria-label="Day ${row.day} ${key} ${u(row[key])}${row.projected ? " projected" : ""}" cx="${x(i)}" cy="${y(row[key])}" r="6" fill="${row.projected ? "white" : color}" stroke="${color}" stroke-width="2"><title>Day ${row.day}: ${key} ${u(row[key])}</title></circle>`).join("")).join("")}${rows.map((row, i) => `<text x="${x(i)}" y="205" text-anchor="middle">D${row.day}${row.projected ? "*" : ""}${h.ledger.some((r) => r.day === row.day && r.category === "equipment") ? " ⚙" : ""}</text>`).join("")}</svg></div><p class="fine">Green: income · Orange: expenses · ⚙ Equipment purchased · * Projection (estimate)</p>`;
  }
  function dailyDetails(day) {
    const history = h.history.find((r) => r.day === day),
      data = incomeForDay(h, day);
    if (!history && day === h.day && t("showProjection")?.checked) {
      const p = forecast();
      return `<h3>Day ${day} projection</h3><p>${n[h.location].name} · ${ve().name} · Recipe +${p.recipeBonus * 100}% · Upgrade interest bonus +${Math.round(upgradeInterestBonus() * 100)} percentage points · Expected visitors ${p.visitors}</p>${we() ? `<p class="notice">Plan not ready: ${we()}</p>` : ""}<p>Estimated income ${u(p.income)} · Expenses ${u(p.expenses)} · Profit ${u(p.profit)}</p><p class="fine">Uses current price, recipe, weather, location, capacity, service speed, competition, and popularity upgrades. Not a sales guarantee; excludes future financing and investment changes.</p>`;
    }
    const entries = [
      ["Sales", data.sales],
      ["Investment income / loss", data.investment],
      ["Resale gain / loss", data.resale],
      ["Ingredients", -data.ingredients],
      ["Permit", -data.permits],
      ["Spoilage", -data.spoilage],
      ["Loan interest", -data.interest],
      ["Other expenses", -data.other],
      ["Net income / loss", data.profit],
    ];
    return `<h3>Day ${day}</h3><p>${history ? n[history.location]?.name || history.location : "No stand opened"} · ${history?.weather || "Not recorded"} · Recipe boost ${history?.recipeBonus === undefined ? "not recorded" : Math.round(history.recipeBonus * 100) + "%"} · Upgrades ${history?.upgrades?.length ?? "not recorded"}</p><table class="income-table">${entries.map(([name, value]) => `<tr><td>${name}</td><td>${u(value)}</td></tr>`).join("")}</table>`;
  }
  function renderResults() {
    const host = t("resultsGraph");
    if (!host) return;
    const show = t("showProjection")?.checked;
    let rows = h.history
      .slice(-7)
      .map((row) => ({ ...incomeForDay(h, row.day), day: row.day }));
    if (show && !h.history.some((r) => r.day === h.day)) {
      rows = [...rows.slice(-6), { ...forecast(), projected: true }];
    }
    host.innerHTML = graphHTML(rows);
    t("dayDetails").innerHTML = rows.length
      ? dailyDetails(rows.at(-1).day)
      : "Choose a point to inspect a day.";
  }
  function closeBusiness() {
    if (_ || !isInsolvent(h, Ke.value(), r) || canBorrowAnything()) return;
    h.closed = true;
    L();
    U();
    S = "closure";
    const rows = h.history.map((row) => incomeForDay(h, row.day)),
      totals = statements(h, r, E, Ke.value())[0][1];
    t("modalBody").innerHTML =
      `<h2>You made it to day ${h.day}!</h2><div class="closure-summary"><div>${graphHTML(rows, true)}</div><div><h3>Total income / loss statement</h3><table class="income-table">${totals
        .slice(1)
        .map((row) => `<tr><td>${row[0]}</td><td>${u(row.at(-1))}</td></tr>`)
        .join(
          "",
        )}</table></div></div><p>You ran out of money and can no longer obtain a loan from the bank. Would you like to start another game?</p><button class="primary" id="restartBusiness">Yes, start another game</button><button id="keepClosed">No, return to game</button><p><button id="exportStatementsCSV">Download financial CSV files</button></p>`;
    We();
  }
  function restartBusiness() {
    h = m();
    Me();
    _ = false;
    v = null;
    Ge.clearTraffic();
    L();
    S = "";
    t("modal").classList.remove("show");
    Ie("location");
    fe("stand");
    U();
  }
  function installPlayabilityUI() {
    t("tasteHint").insertAdjacentHTML(
      "beforebegin",
      '<button type="button" class="buy-upgrade" id="ownerTasteTest">Owner taste test · $0.50</button><p id="ownerTasteResult" aria-live="polite"></p>',
    );
    const header = t("areaHeading").parentElement;
    header.insertBefore(t("weatherLabel"), t("phaseLabel"));
    header.insertBefore(t("crowdLabel"), t("phaseLabel"));
    t("scene").querySelector(".scene-bar").remove();
    t("scene").querySelector(".scene-orbit").hidden = true;
    e.querySelector("[data-loc=park] small").textContent = "$6 per day";
    e.querySelector("[data-tab=results]").innerHTML =
      '<span class="tab-icon">📊</span>Results & Projections';
    t("pane-results").insertAdjacentHTML(
      "afterbegin",
      '<div class="graph-heading"><h3>Daily income & expenses · past 7 days</h3><label><input type="checkbox" id="showProjection"> Show projection</label></div><div id="resultsGraph"></div><div id="dayDetails" aria-live="polite"></div>',
    );
    for (const node of t("pane-results").children)
      if (
        !["graph-heading"].includes(node.className) &&
        !["resultsGraph", "dayDetails", "resultNext"].includes(node.id)
      )
        node.hidden = true;
    // Keep the existing day-advance and financial export actions available beneath the new chart.
    t("resultNext").parentElement.hidden = false;
    t("showProjection").addEventListener("change", renderResults);
    e.addEventListener("click", (event) => {
      const target = event.target.closest("button,[data-result-day]");
      if (!target) return;
      const data = target.dataset,
        id = target.id;
      if (
        h.closed &&
        ![
          "exportExcel",
          "exportStatementsCSV",
          "declineBooks",
          "restartBusiness",
          "keepClosed",
        ].includes(id)
      )
        return;
      if (data.loanFull) he(data.loanFull, true);
      else if (id === "ownerTasteTest" && !_) {
        try {
          tasteTest(h, ve().temp);
          L();
          U();
        } catch (error) {
          t("ownerTasteResult").textContent = error.message;
        }
      } else if (id === "securedApply") applySecured();
      else if (id === "rescueLoan") rescueLoan();
      else if (id === "exportExcel") {
        download(workbook(exportSheets()), "lemonade-lane-financials.xlsx");
        J();
      } else if (id === "exportStatementsCSV") csvReports(exportSheets());
      else if (["declineBooks", "leaveShop", "keepClosed"].includes(id)) J();
      else if (data.buyRecipe) purchaseRecipe(data.buyRecipe);
      else if (data.useRecipe) {
        const recipe = RECIPES.find((r) => r.id === data.useRecipe);
        if (recipe && h.purchasedRecipes.includes(recipe.id)) {
          h.recipe = {
            lemons: recipe.lemons,
            sugar: recipe.sugar,
            ice: recipe.ice,
          };
          L();
          J();
          Ie("recipe");
          U();
        }
      } else if (data.sellSupply) sellSupply(data.sellSupply);
      else if (data.confirmSupply) confirmSupply(data.confirmSupply);
      else if (data.sellEquipment) sellEquipment(data.sellEquipment);
      else if (data.confirmEquipment)
        sellEquipment(data.confirmEquipment, true);
      else if (id === "cancelSale") openShop("market");
      else if (data.resultDay)
        t("dayDetails").innerHTML = dailyDetails(Number(data.resultDay));
      else if (id === "restartBusiness") restartBusiness();
    });
    e.addEventListener("keydown", (event) => {
      if (
        ["Enter", " "].includes(event.key) &&
        event.target.dataset.resultDay
      ) {
        event.preventDefault();
        event.target.dispatchEvent(new MouseEvent("click", { bubbles: true }));
      }
    });
  }

  (e.addEventListener(`click`, (n) => {
    if (h.closed) {
      const button = n.target.closest("button");
      if (
        button &&
        ![
          "ledgerBtn",
          "booksLink",
          "exportExcel",
          "exportStatementsCSV",
          "declineBooks",
          "modalClose",
          "restartBusiness",
          "keepClosed",
        ].includes(button.id)
      ) {
        n.stopImmediatePropagation();
        return;
      }
    }
    let r = n.target.closest(`button`);
    r &&
      e.contains(r) &&
      (r.dataset.sceneView
        ? ie(r.dataset.sceneView)
        : r.id === `playerStand`
          ? ie(`exterior`)
          : r.id === `sceneBack`
            ? ie(`outside`)
            : r.id === `sceneLeft`
              ? Ge.rotate(-0.25)
              : r.id === `sceneRight`
                ? Ge.rotate(0.25)
                : r.id === `exitStandView`
                  ? ie(`outside`)
                  : r.id === `visitBank`
                    ? fe(`bank`, `overview`)
                    : r.id === `returnToStand`
                      ? fe(`stand`)
                      : r.dataset.bankTab
                        ? de(r.dataset.bankTab)
                        : r.dataset.loanApply
                          ? pe(Number(r.dataset.loanApply))
                          : r.dataset.loanPay
                            ? he(r.dataset.loanPay)
                            : r.dataset.transfer
                              ? me(r.dataset.transfer, r.dataset.amount)
                              : r.dataset.supplyCategory
                                ? ((s = r.dataset.supplyCategory), Ae())
                                : r.dataset.supplyStep
                                  ? je(
                                      Number(r.dataset.tier),
                                      Number(r.dataset.supplyStep),
                                    )
                                  : r.id === `upgradePrev`
                                    ? ((g = (g + E.length - 1) % E.length), j())
                                    : r.id === `upgradeNext`
                                      ? ((g = (g + 1) % E.length), j())
                                      : r.id === `buyUpgrade`
                                        ? te()
                                        : r.id === `clearSupplyCart`
                                          ? Me()
                                          : r.id === `reviewSupplies`
                                            ? Ne()
                                            : r.id === `cancelSupplyPurchase`
                                              ? J()
                                              : r.id === `confirmSupplyPurchase`
                                                ? H()
                                                : r.dataset.tab
                                                  ? Ie(r.dataset.tab)
                                                  : r.id === `resultNext`
                                                    ? q()
                                                    : r.dataset.loc && !_
                                                      ? ((h.location =
                                                          r.dataset.loc),
                                                        L(),
                                                        U())
                                                      : r.dataset.recipe
                                                        ? Le(
                                                            r.dataset.recipe,
                                                            Number(
                                                              r.dataset.change,
                                                            ),
                                                          )
                                                        : r.dataset.adjust
                                                          ? W(
                                                              r.dataset.adjust,
                                                              Number(
                                                                r.dataset
                                                                  .change,
                                                              ),
                                                            )
                                                          : r.id === `startBtn`
                                                            ? K()
                                                            : r.id ===
                                                                  `ledgerBtn` ||
                                                                r.id ===
                                                                  `booksLink`
                                                              ? Ve()
                                                              : r.id ===
                                                                  `helpBtn`
                                                                ? Ue()
                                                                : r.id ===
                                                                    `modalClose`
                                                                  ? J()
                                                                  : r.id ===
                                                                      `nextDay`
                                                                    ? ((S = ``),
                                                                      q())
                                                                    : r.id ===
                                                                        `exportBtn`
                                                                      ? He()
                                                                      : r.id ===
                                                                          `resetBtn` &&
                                                                        confirm(
                                                                          `Reset your entire lemonade business? This will erase all days and transactions.`,
                                                                        ) &&
                                                                        ((h =
                                                                          m()),
                                                                        Me(),
                                                                        (_ =
                                                                          !1),
                                                                        (v =
                                                                          null),
                                                                        y &&
                                                                          clearInterval(
                                                                            y,
                                                                          ),
                                                                        b &&
                                                                          clearTimeout(
                                                                            b,
                                                                          ),
                                                                        x &&
                                                                          clearTimeout(
                                                                            x,
                                                                          ),
                                                                        (b =
                                                                          null),
                                                                        (x =
                                                                          null),
                                                                        Ge.clearTraffic(),
                                                                        L(),
                                                                        (S = ``),
                                                                        t(
                                                                          `modal`,
                                                                        ).classList.remove(
                                                                          `show`,
                                                                        ),
                                                                        Ie(
                                                                          `location`,
                                                                        ),
                                                                        fe(
                                                                          `stand`,
                                                                        ),
                                                                        U()));
  }),
    t(`modal`).addEventListener(`click`, (e) => {
      e.target === t(`modal`) && J();
    }));
  let Ge = new Vl(t(`world3d`), {
      onSelect: () => ie(`exterior`),
      onBack: () => ie(`outside`),
      onShop: (shop) => openShop(shop),
    }),
    Ke = new Du(t(`investApp`), {
      getState: () => h,
      commit: () => {
        (L(), _e());
      },
      isRunning: () => _,
    });
  window.LemonadeLoanGuard = (bank) => securedPrincipal({ bank });
  installPlayabilityUI();
  (ge(), L(), Ie(`location`), U());
})();

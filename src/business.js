import "./engine.js";
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
          fee: 4,
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
        recipe: { lemons: 4, sugar: 3, ice: 5 },
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
    function M(e) {
      let n = t(`neighborhoodEvent`);
      ((n.textContent = e), (n.hidden = !1));
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
      return h.bank.loans.find((e) => e.balance > 0.001);
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
      let e = ce();
      return !!(e && h.day >= e.nextDue - 2);
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
    function pe(e) {
      let t = h.bank;
      if (_) return;
      if (ce()) {
        B(`Pay off your current loan before applying for another.`, !0);
        return;
      }
      if (e > ue() || !Number.isFinite(e) || e < 50) {
        B(`This amount is not available for your current credit score.`, !0);
        return;
      }
      let n = d(e * 0.1),
        r = d(e + n);
      (t.loans.push({
        id: t.loanSequence++,
        principal: e,
        interest: n,
        total: r,
        balance: r,
        paid: 0,
        nextDue: h.day + 5,
        missedDue: [],
      }),
        (t.checking = d(t.checking + e)),
        h.ledger.push({
          day: h.day,
          desc: `Bank loan received: ` + u(e),
          cash: 0,
          bankChange: e,
          loanChange: r,
          category: `loan`,
        }),
        L(),
        U(),
        de(`overview`),
        B(
          `Loan approved! ` +
            u(e) +
            ` is in your checking account. Withdraw some money to buy stand supplies.`,
        ));
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
    function he() {
      let e = ce();
      if (!e) return;
      if (h.day < e.nextDue - 2) {
        B(`Your next payment window opens on Day ` + (e.nextDue - 2) + `.`, !0);
        return;
      }
      let t = z(e);
      if (h.bank.checking + 1e-6 < t) {
        B(`Not enough money in checking. Deposit your stand cash first.`, !0);
        return;
      }
      let n = h.day <= e.nextDue;
      (e.nextDue,
        (h.bank.checking = d(h.bank.checking - t)),
        (e.balance = d(Math.max(0, e.balance - t))),
        e.paid++,
        (e.nextDue += 5),
        n &&
          (h.bank.onTime++,
          (h.bank.creditScore = f(h.bank.creditScore + 12, 300, 850))),
        (h.bank.creditEstablished = !0),
        h.ledger.push({
          day: h.day,
          desc: `Loan #` + e.id + ` ` + (n ? `on-time` : `late`) + ` payment`,
          cash: 0,
          bankChange: -t,
          loanChange: -t,
          category: `loan payment`,
        }),
        L(),
        U(),
        B(
          `Payment of ` +
            u(t) +
            ` made ` +
            (n
              ? `on time! Your game credit score increased.`
              : `after the due date.`) +
            (e.balance < 0.01 ? ` Your loan is fully repaid!` : ``),
        ));
    }
    function ge() {
      let e = ce();
      if (e)
        for (
          ;
          e.balance > 0.001 &&
          h.day > e.nextDue &&
          !e.missedDue.includes(e.nextDue);

        ) {
          (e.missedDue.push(e.nextDue),
            h.bank.missed++,
            (h.bank.creditEstablished = !0),
            (h.bank.creditScore = f(h.bank.creditScore - 35, 300, 850)),
            h.ledger.push({
              day: h.day,
              desc: `Missed loan payment due Day ` + e.nextDue,
              category: `credit`,
              cash: 0,
              bankChange: 0,
            }));
          break;
        }
    }
    function _e() {
      let n = h.bank,
        r = ce();
      ((n.investments = Ke.value()),
        Ke.render(),
        (t(`bankDay`).textContent = `DAY ` + h.day),
        (t(`bankChecking`).textContent = u(n.checking)),
        (t(`bankDebt`).textContent = u(r ? r.balance : 0)),
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
      let i = t(`loanArea`);
      if (r) {
        let e = z(r),
          t = h.day < r.nextDue - 2,
          a = h.day > r.nextDue;
        i.innerHTML = `<div class="active-loan"><h4>🧾 Loan #${r.id} · ${u(r.principal)} borrowed</h4><div class="loan-facts"><div class="loan-fact"><span>LEFT TO REPAY</span><strong>${u(r.balance)}</strong></div><div class="loan-fact"><span>NEXT PAYMENT</span><strong>${u(e)}</strong></div><div class="loan-fact"><span>DUE DAY</span><strong>${r.nextDue}</strong></div></div><div class="loan-status ${a ? `late` : le() ? `due` : ``}">${a ? `⚠️ Payment overdue — your credit score was lowered.` : t ? `Next payment available starting Day ` + (r.nextDue - 2) + `.` : `⏰ Payment is ready. Pay by Day ` + r.nextDue + `.`}</div><button type="button" class="bank-action" data-loan-pay="yes" ${t || n.checking + 1e-6 < e || _ ? `disabled` : ``}>Pay ${u(e)} from checking</button><p class="loan-note">${r.paid} of 5 installments made · Original loan ${u(r.principal)} + ${u(r.interest)} interest (10% total for the term). ${n.checking < e ? `You need ` + u(Math.max(0, e - n.checking)) + ` more in checking.` : ``}</p></div>`;
      } else {
        let e = !n.loans.length,
          t = ue();
        if (!t)
          i.innerHTML = `<div class="active-loan"><h4>🔒 New loan not available yet</h4><p>Your next loan requires a game credit score of at least 620 and 3 on-time payments. Current score: ${n.creditScore}. Keep selling lemonade and managing your money.</p></div>`;
        else {
          let n = e
            ? [50, 75, 100]
            : [Math.min(100, t), Math.min(250, t), t].filter(
                (e, t, n) => n.indexOf(e) === t,
              );
          i.innerHTML = `<h4 class="bank-subtitle">${e ? `Choose your first startup loan` : `Apply for another loan`}</h4><div class="loan-choices">${n.map((e) => `<div class="loan-choice ${e === 75 ? `recommended` : ``}">${e === 75 ? `<span class="loan-flag">GOOD START</span>` : ``}<div class="loan-amount">${u(e)}</div><p>Interest: ${u(d(e * 0.1))}<br>Total repayment: ${u(d(e * 1.1))}<br>5 payments, every 5 game days</p><button type="button" data-loan-apply="${e}">Apply for ${u(e)}</button></div>`).join(``)}</div><p class="loan-rules">${e ? `🎓 First-time borrowers can get one startup loan without a credit history.` : `Approval is based on your credit score and on-time payment record.`} Loans include a one-time 10% interest charge over the 25-game-day term, not an annual interest rate. The money is deposited into checking.</p>`;
        }
      }
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
            (h.location === `beach` && t.name === `Rainy` ? 0.54 : t.mult),
        ),
      );
    }
    function V() {
      let e = h.recipe;
      return f(
        1 -
          (Math.abs(e.lemons - 4) * 0.075 +
            Math.abs(e.sugar - 3) * 0.09 +
            Math.abs(e.ice - (ve().temp >= 90 ? 6 : 5)) * 0.025),
        0.42,
        1,
      );
    }
    function be() {
      let e = h.recipe;
      return e.lemons * 0.5 + e.sugar * 0.2 + (A() ? 0 : e.ice * 0.1) + 1.6;
    }
    function xe() {
      return d(be() * h.pitchers);
    }
    function Se() {
      return h.pitchers * 10;
    }
    function Ce() {
      let e = [];
      for (let t of Object.keys(h.recipe))
        !(t === `ice` && A()) &&
          h.inventory[t] < h.recipe[t] * h.pitchers &&
          e.push(r[t].name);
      return (h.inventory.cups < 10 * h.pitchers && e.push(`Paper cups`), e);
    }
    function we() {
      if (h.cash === 0 && Object.values(h.inventory).every((e) => e === 0))
        return h.bank.checking > 0
          ? `Your money is in checking. Visit the Bank → Account and withdraw some cash for supplies.`
          : `You have $0 at the stand. Visit the Bank → Loans to borrow startup money, then withdraw it for supplies.`;
      if (h.cash < n[h.location].fee)
        return `Not enough cash to pay this location’s permit.`;
      let e = Ce();
      return e.length ? `Buy more ` + e.join(`, `) + ` before opening.` : ``;
    }
    function Te() {
      let e = V();
      return e > 0.95
        ? `⭐ Customer taste test: Delicious! Nicely balanced for the weather.`
        : e > 0.83
          ? `👍 Customer taste test: Pretty good, but the mix could be better.`
          : e > 0.68
            ? `😐 Customer taste test: A little off. Try adjusting your ingredients.`
            : `😬 Customer taste test: Too sour, too sweet, or not refreshing enough.`;
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
      let e = h.history.slice(-7);
      if (!e.length) {
        t(`historyBars`).innerHTML =
          `<span class="empty">After your first day, you’ll see how your business is doing.</span>`;
        return;
      }
      let n = Math.max(10, ...e.map((e) => Math.abs(e.profit)));
      t(`historyBars`).innerHTML = e
        .map(
          (e) =>
            `<div class="barwrap"><div title="Day ${e.day}: ${u(e.profit)} profit" class="bar ${e.profit < 0 ? `loss` : ``}" style="height:${Math.max(6, Math.round((Math.abs(e.profit) / n) * 48))}px"></div><span>D${e.day}</span></div>`,
        )
        .join(``);
    }
    function Ie(n) {
      C = n;
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
        results: `Results & money`,
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
        (t(`crowdLabel`).textContent = `🚶 About ` + ye() + ` visitors`),
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
        (t(`locationHint`).textContent = i.desc),
        (t(`priceValue`).textContent = u(h.price)),
        (t(`pitcherValue`).textContent = h.pitchers));
      for (let e of [`lemons`, `sugar`, `ice`])
        t(`recipe` + e[0].toUpperCase() + e.slice(1)).textContent = h.recipe[e];
      ((t(`tasteHint`).textContent = Te()),
        (t(`planCups`).textContent = Se()),
        (t(`planCost`).textContent = u(xe())),
        (t(`planMax`).textContent = u(Se() * h.price - xe() - i.fee)));
      let o = Math.ceil((xe() + i.fee) / h.price);
      t(`breakEven`).textContent = `Sell ` + o + ` cups to break even`;
      for (let t of e.querySelectorAll(`[data-loc]`))
        t.classList.toggle(`active`, t.dataset.loc === h.location);
      if ((Oe(), Ae(), Fe(), _e(), j(), P(), !_)) {
        let e = we();
        ((t(`validation`).style.display = e ? `block` : `none`),
          (t(`validation`).textContent = e));
        let n = h.history.some((e) => e.day === h.day);
        ((t(`startBtn`).disabled = !!e || n),
          (t(`startBtn`).textContent = n ? `Day finished ✓` : `▶ START DAY`),
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
    function Le(e, t) {
      if (_) return;
      let n = { lemons: 2, sugar: 1, ice: 2 },
        r = { lemons: 6, sugar: 6, ice: 8 };
      ((h.recipe[e] = f(h.recipe[e] + t, n[e], r[e])), L(), U());
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
        (0.12 + 0.78 * i) *
          (0.55 + 0.52 * a) *
          (t.name === `Rainy` ? 0.89 : 1) +
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
        visitors: 0,
        sold: 0,
        turnedAway: 0,
        leftUpset: 0,
        lostCompetitor: 0,
        capacity: Se(),
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
                    e.sold +
                    ` cups sold so far · ` +
                    u(e.revenue) +
                    ` in sales`),
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
      S = `ledger`;
      let e = h.ledger
          .slice()
          .reverse()
          .slice(0, 50)
          .map(
            (e) =>
              `<div class="ledger-row"><div><strong>${e.desc}</strong><br><span>${e.day ? `Day ` + e.day : `Startup`} · ${e.category}</span></div><b class="${e.cash > 0 ? `win` : e.cash < 0 ? `lose` : ``}">${e.bankChange ? `Bank ` + (e.bankChange > 0 ? `+` : ``) + u(e.bankChange) : e.cash === 0 ? `Noncash` : u(e.cash)}</b></div>`,
          )
          .join(``),
        n = d(
          Object.keys(r).reduce((e, t) => e + h.inventory[t] * r[t].unit, 0),
        );
      ((t(`modalBody`).innerHTML =
        `<div class="kicker">THE BOOKS · BUSINESS RECORDS</div><h2>📒 Cash & transaction ledger</h2><p>Stand cash and bank movements are recorded here. Deposits, withdrawals and loan payments show where the money went.</p><div class="report-grid"><div class="report-cell"><small>CASH ON HAND</small><strong>${u(h.cash)}</strong></div><div class="report-cell"><small>UNUSED SUPPLIES (AT COST)</small><strong>${u(n)}</strong></div><div class="report-cell"><small>CHECKING</small><strong>${u(h.bank.checking)}</strong></div><div class="report-cell"><small>INVESTMENTS</small><strong>${u(Ke.value())}</strong></div><div class="report-cell"><small>OUTSTANDING LOAN</small><strong>${u(ce()?.balance || 0)}</strong></div><div class="report-cell"><small>EQUIPMENT AT COST</small><strong>${u(h.upgrades.reduce((e, t) => e + (E.find((e) => e.id === t)?.price || 0), 0))}</strong></div></div><div class="kicker">LATEST TRANSACTIONS</div>${e || `<p class="empty">No transactions yet. Your business starts with $0 cash and no supplies.</p>`}<p class="fine">Inventory expense is recognized when you make lemonade; the inventory purchase itself is a separate cash transaction. Loan proceeds increase cash in the bank and a corresponding loan liability; loans are not sales revenue.</p><button class="small-link" id="exportBtn">Export ledger as CSV ↓</button>`),
        We());
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
    (e.addEventListener(`click`, (n) => {
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
                              ? he()
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
                                      ? ((g = (g + E.length - 1) % E.length),
                                        j())
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
                                                : r.id ===
                                                    `confirmSupplyPurchase`
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
                                                                r.dataset
                                                                  .change,
                                                              ),
                                                            )
                                                          : r.dataset.adjust
                                                            ? W(
                                                                r.dataset
                                                                  .adjust,
                                                                Number(
                                                                  r.dataset
                                                                    .change,
                                                                ),
                                                              )
                                                            : r.id ===
                                                                `startBtn`
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
      }),
      Ke = new Du(t(`investApp`), {
        getState: () => h,
        commit: () => {
          (L(), _e());
        },
        isRunning: () => _,
      });
    (L(), Ie(`location`), U());
  })();

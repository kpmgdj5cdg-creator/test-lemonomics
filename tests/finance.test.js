import test from "node:test";
import assert from "node:assert/strict";
import {
  RECIPES,
  recipeBonus,
  securedLimit,
  securedPrincipal,
  originate,
  payLoan,
  processOverdue,
  canRescue,
  isInsolvent,
} from "../src/finance.js";
import { statements, incomeForDay, workbook } from "../src/reports.js";
const supplies = {
  lemons: { unit: 0.5 },
  sugar: { unit: 0.2 },
  ice: { unit: 0.1 },
  cups: { unit: 0.16 },
};
const state = () => ({
  day: 1,
  cash: 0,
  inventory: { lemons: 0, sugar: 0, ice: 0, cups: 0 },
  recipe: { lemons: 0, sugar: 0, ice: 0 },
  upgrades: [],
  purchasedRecipes: [],
  history: [],
  ledger: [],
  bank: {
    checking: 0,
    loans: [],
    loanSequence: 1,
    creditScore: 650,
    creditEstablished: false,
    onTime: 0,
    missed: 0,
  },
});
test("bonuses require ownership and exact decimal recipe; wrong ingredient has no bonus", () => {
  const s = state();
  s.recipe = { ...RECIPES[2] };
  assert.equal(recipeBonus(s), 0);
  s.purchasedRecipes = ["best"];
  assert.equal(recipeBonus(s), 0.2);
  s.recipe.lemons = 5.1;
  assert.equal(recipeBonus(s), 0);
});
test("collateral minimum, 50% aggregate limit, $10,000 cap, cash independent", () => {
  const s = state();
  assert.equal(securedLimit(s, 99.99), 0);
  assert.equal(securedLimit(s, 100), 50);
  s.cash = 50000;
  s.bank.checking = 50000;
  assert.equal(securedLimit(s, 30000), 10000);
  originate(s, 200, "secured");
  assert.equal(securedLimit(s, 1000), 300);
  assert.equal(securedLimit(s, 200), 0);
});
test("early full payoff is allowed before payment window and does not duplicate interest expense", () => {
  const s = state(),
    l = originate(s, 50);
  assert.throws(() => payLoan(s, l), /opens/);
  s.bank.checking = 55;
  assert.equal(payLoan(s, l, true), 55);
  assert.equal(l.balance, 0);
  assert.equal(incomeForDay(s, 1).interest, 5);
  assert.throws(() => payLoan(s, l, true), /already/);
});
test("secured default reduces collateral, debt and credit once per missed installment", () => {
  const s = state();
  s.bank.portfolio = {
    positions: { SPY: { units: 10000000, costCents: 100000, lastPrice: 100 } },
    legacyCents: 0,
    trades: [],
    sequence: 1,
    marketDate: "2026-10-19",
  };
  const l = originate(s, 100, "secured");
  s.day = 7;
  processOverdue(s);
  assert.equal(l.balance, 88);
  assert.equal(s.bank.creditScore, 615);
  assert.equal(s.bank.portfolio.positions.SPY.units, 9770000);
  assert.equal(incomeForDay(s, 7).other, 1);
  const after = JSON.stringify(s);
  processOverdue(s);
  assert.equal(JSON.stringify(s), after);
});
test("uncovered secured liquidation fee stays owed; no negative holdings", () => {
  const s = state();
  s.bank.portfolio = {
    positions: { SPY: { units: 10000, costCents: 100, lastPrice: 100 } },
    trades: [],
    sequence: 1,
  };
  const l = originate(s, 100, "secured");
  s.day = 7;
  processOverdue(s);
  assert.equal(l.balance, 110);
  assert.equal(Object.keys(s.bank.portfolio.positions).length, 0);
});
test("rescue eligibility requires insolvency, outstanding debt and established good credit", () => {
  const s = state();
  originate(s, 50);
  s.bank.checking = 0;
  assert.equal(isInsolvent(s, 0, supplies), true);
  assert.equal(canRescue(s, 0, supplies), false);
  s.bank.creditEstablished = true;
  s.bank.creditScore = 670;
  assert.equal(canRescue(s, 0, supplies), true);
  s.upgrades = ["juicer"];
  assert.equal(canRescue(s, 0, supplies), false);
  s.upgrades = [];
  s.rescueDay = 1;
  assert.equal(canRescue(s, 0, supplies), false);
});
test("statements reconcile cash, expenses, balance sheet; Excel contains three sheets", async () => {
  const s = state();
  originate(s, 50);
  s.bank.checking = 30;
  s.cash = 10;
  s.inventory.lemons = 20;
  s.ledger.push(
    { day: 1, category: "transfer", cash: 20, bankChange: -20 },
    { day: 1, category: "supplies", cash: -10 },
  );
  const sheets = statements(s, supplies, [], 0);
  assert.equal(sheets.length, 3);
  const balance = sheets[1][1];
  assert.equal(balance.find((r) => r[0] === "Total assets")[1], 50);
  assert.equal(
    balance.find((r) => r[0] === "Total liabilities and equity")[1],
    50,
  );
  assert.equal(
    sheets[2][1].find((r) => r[0] === "Ending cash and checking")[1],
    40,
  );
  const blob = workbook(sheets);
  const bytes = new Uint8Array(await blob.arrayBuffer());
  assert.equal(bytes[0], 0x50);
  assert.equal(bytes[1], 0x4b);
  assert.match(new TextDecoder().decode(bytes), /Statement of Cash Flow/);
});

test("emergency advance on secured debt does not increase secured principal", () => {
  const s = state(),
    l = originate(s, 100, "secured");
  l.principal += 25;
  l.total += 27.5;
  l.balance += 27.5;
  l.unsecuredAdvance = 25;
  assert.equal(securedPrincipal(s), 100);
  assert.equal(securedLimit(s, 200), 0);
});
test("legacy loan ledger recognizes term interest and does not count principal as sales", () => {
  const s = state();
  s.ledger = [
    { day: 1, category: "loan", cash: 0, bankChange: 50, loanChange: 55 },
  ];
  const income = incomeForDay(s, 1);
  assert.equal(income.sales, 0);
  assert.equal(income.interest, 5);
  assert.equal(income.profit, -5);
});
test("inventory/equipment resale records loss and excludes acquisition cash from income", () => {
  const s = state();
  s.ledger = [
    { day: 1, category: "equipment", cash: -50 },
    { day: 1, category: "equipment sale", cash: 25, gain: -25 },
    { day: 1, category: "inventory sale", cash: 5, gain: -5 },
  ];
  assert.equal(incomeForDay(s, 1).profit, -30);
});

test("owner tests charge stand cash once and exact owned tiers score 7/8/9", async () => {
  const { satisfaction, tasteTest } = await import("../src/finance.js");
  for (const [index, recipe] of RECIPES.entries()) {
    const s = state();
    s.cash = 1;
    s.purchasedRecipes = [recipe.id];
    s.recipe = { lemons: recipe.lemons, sugar: recipe.sugar, ice: recipe.ice };
    assert.equal(satisfaction(s), 7 + index);
    assert.equal(tasteTest(s), 7 + index);
    assert.equal(s.cash, 0.5);
    assert.equal(incomeForDay(s, 1).other, 0.5);
    tasteTest(s);
    assert.equal(s.cash, 0);
    assert.throws(() => tasteTest(s), /\$0.50/);
    assert.equal(s.cash, 0);
  }
  const s = state();
  s.recipe = { lemons: 0, sugar: 0, ice: 0 };
  assert.ok(satisfaction(s) >= 1 && satisfaction(s) <= 10);
});

test("neighborhood house fronts face closest street and competitor plot clears both sidewalks", async () => {
  const { NEIGHBORHOOD: n } = await import("../src/neighborhood.js");
  for (const house of n.houses) {
    const closestX = Math.abs(house.x - 8) < Math.abs(house.z - 4);
    if (closestX) {
      assert.ok(Math.abs(Math.sin(house.yaw)) > 0.99);
      assert.equal(Math.sign(Math.sin(house.yaw)), Math.sign(8 - house.x));
    } else {
      assert.ok(Math.cos(house.yaw) > 0.99);
    }
  }
  assert.ok(n.rival.x - 1.9 > 11.75);
  assert.ok(n.rival.z + 1.65 < 0.2);
  const moved = n.houses.filter((h) => ["yellow", "orange"].includes(h.id));
  assert.ok(moved.find((h) => h.id === "yellow").x < -15);
  assert.ok(moved.find((h) => h.id === "orange").z < -18);
});

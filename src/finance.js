// Money is rounded at transaction boundaries. Existing save keys and portfolio units stay intact.
export const round = (n) => Math.round((n + Number.EPSILON) * 100) / 100;
export const RECIPES = [
  {
    id: "good",
    name: "Good",
    price: 10,
    boost: 0.1,
    lemons: 4.2,
    sugar: 3.1,
    ice: 5.3,
  },
  {
    id: "better",
    name: "Better",
    price: 25,
    boost: 0.15,
    lemons: 4.6,
    sugar: 3.4,
    ice: 5.7,
  },
  {
    id: "best",
    name: "Best",
    price: 50,
    boost: 0.2,
    lemons: 5.2,
    sugar: 3.7,
    ice: 6.1,
  },
];
export function recipeBonus(state) {
  return (
    RECIPES.find(
      (r) =>
        state.purchasedRecipes?.includes(r.id) &&
        ["lemons", "sugar", "ice"].every(
          (k) => Math.abs(state.recipe[k] - r[k]) < 1e-9,
        ),
    )?.boost || 0
  );
}
export function debt(state) {
  return round(
    state.bank.loans.reduce((sum, l) => sum + Math.max(0, l.balance), 0),
  );
}
export function securedPrincipal(state) {
  return round(
    state.bank.loans
      .filter((l) => l.type === "secured" && l.balance > 0)
      .reduce(
        (sum, l) =>
          sum +
          Math.max(
            0,
            Math.min(l.principal - (l.unsecuredAdvance || 0), l.balance),
          ),
        0,
      ),
  );
}
export function securedLimit(state, value) {
  return value < 100
    ? 0
    : Math.max(
        0,
        round(
          Math.min(10000, Math.floor(value * 50) / 100) -
            securedPrincipal(state),
        ),
      );
}
export function inventoryValue(state, supplies) {
  return round(
    Object.entries(supplies).reduce(
      (sum, [k, v]) => sum + (state.inventory[k] || 0) * v.unit,
      0,
    ),
  );
}
export function isInsolvent(state, value, supplies) {
  return (
    state.cash < 0.01 &&
    state.bank.checking < 0.01 &&
    value < 0.01 &&
    inventoryValue(state, supplies) < 0.01 &&
    !state.upgrades.length
  );
}
export function canRescue(state, value, supplies) {
  return (
    isInsolvent(state, value, supplies) &&
    state.bank.creditEstablished &&
    state.bank.creditScore >= 670 &&
    debt(state) > 0 &&
    state.rescueDay !== state.day
  );
}
export function originate(state, amount, type = "standard") {
  if (!Number.isFinite(amount) || amount <= 0)
    throw Error("Enter a valid loan amount.");
  const interest = round(amount * 0.1),
    total = round(amount + interest);
  const loan = {
    id: state.bank.loanSequence++,
    type,
    day: state.day,
    principal: amount,
    interest,
    total,
    balance: total,
    paid: 0,
    nextDue: state.day + 5,
    missedDue: [],
  };
  state.bank.loans.push(loan);
  state.bank.checking = round(state.bank.checking + amount);
  state.ledger.push({
    day: state.day,
    desc: `${type === "secured" ? "Investment-backed" : "Bank"} loan #${loan.id}`,
    cash: 0,
    bankChange: amount,
    loanChange: total,
    expense: interest,
    category: "loan",
    loanId: loan.id,
  });
  return loan;
}
export function payLoan(state, loan, full = false) {
  const amount = full
    ? loan.balance
    : Math.min(loan.balance, round(loan.total / 5));
  if (loan.balance <= 0) throw Error("This loan is already repaid.");
  if (!full && state.day < loan.nextDue - 2)
    throw Error(`Payment opens on Day ${loan.nextDue - 2}.`);
  if (state.bank.checking + 0.000001 < amount)
    throw Error("Not enough checking money. Deposit stand cash first.");
  state.bank.checking = round(state.bank.checking - amount);
  loan.balance = round(loan.balance - amount);
  loan.paid++;
  if (state.day <= loan.nextDue) {
    state.bank.onTime++;
    state.bank.creditScore = Math.min(850, state.bank.creditScore + 12);
  }
  state.bank.creditEstablished = true;
  loan.nextDue += 5;
  state.ledger.push({
    day: state.day,
    desc: `Loan #${loan.id} ${full ? "paid in full" : "payment"}`,
    cash: 0,
    bankChange: -amount,
    loanChange: -amount,
    category: "loan payment",
  });
  return amount;
}
// Liquidate collateral proportionately at the displayed quotes, preserving microshare units and basis.
export function seizeCollateral(state, amount, quotes = {}) {
  const portfolio = state.bank.portfolio;
  if (!portfolio) return { collected: 0, basis: 0 };
  let remaining = Math.round(amount * 100),
    collected = 0,
    basis = 0;
  const legacy = Math.min(remaining, portfolio.legacyCents || 0);
  portfolio.legacyCents = (portfolio.legacyCents || 0) - legacy;
  remaining -= legacy;
  collected += legacy;
  basis += legacy;
  for (const [symbol, pos] of Object.entries(portfolio.positions)) {
    if (remaining <= 0) break;
    const price = quotes[symbol] ?? pos.lastPrice;
    if (!(price > 0)) continue;
    const units = Math.min(
      pos.units,
      Math.ceil((remaining / 100 / price) * 1e6),
    );
    const proceeds = Math.round((units / 1e6) * price * 100);
    const cost =
      units === pos.units
        ? pos.costCents
        : Math.round((pos.costCents * units) / pos.units);
    pos.units -= units;
    pos.costCents -= cost;
    collected += proceeds;
    basis += cost;
    remaining -= proceeds;
    portfolio.trades.push({
      id: portfolio.sequence++,
      side: "sell",
      symbol,
      units,
      price,
      priceDate: portfolio.marketDate,
      notionalCents: proceeds,
      feeCents: 0,
      totalCents: proceeds,
      realizedCents: proceeds - cost,
      executedAt: new Date().toISOString(),
      gameDay: state.day,
      collateral: true,
    });
    if (!pos.units) delete portfolio.positions[symbol];
  }
  return { collected: collected / 100, basis: basis / 100 };
}
export function processOverdue(state, quotes = {}) {
  for (const loan of state.bank.loans) {
    loan.missedDue ??= [];
    while (
      loan.balance > 0.001 &&
      state.day > loan.nextDue &&
      !loan.missedDue.includes(loan.nextDue)
    ) {
      loan.missedDue.push(loan.nextDue);
      state.bank.missed++;
      state.bank.creditEstablished = true;
      state.bank.creditScore = Math.max(300, state.bank.creditScore - 35);
      state.ledger.push({
        day: state.day,
        desc: `Missed loan #${loan.id} payment due Day ${loan.nextDue}`,
        cash: 0,
        category: "credit",
      });
      if (loan.type !== "secured") break;
      const installment = Math.min(loan.balance, round(loan.total / 5));
      const fee = round(Math.max(1, installment * 0.02)); // disclosed collateral liquidation fee: 2%, $1 minimum
      const result = seizeCollateral(state, round(installment + fee), quotes);
      const paid = Math.min(installment, result.collected);
      const paidFee = Math.min(
        fee,
        round(Math.max(0, result.collected - paid)),
      );
      const excess = round(Math.max(0, result.collected - paid - paidFee));
      state.bank.checking = round(state.bank.checking + excess);
      loan.balance = round(loan.balance - paid + (fee - paidFee));
      state.ledger.push({
        day: state.day,
        desc: `Collateral liquidation for loan #${loan.id}; 2% fee ($1 minimum)`,
        cash: 0,
        bankChange: excess,
        loanChange: round(-paid + fee - paidFee),
        investmentChange: -result.collected,
        realizedGain: round(result.collected - result.basis),
        expense: fee,
        category: "collateral liquidation",
      });
      loan.nextDue += 5;
    }
  }
}

import { round, debt, inventoryValue } from "./finance.js";
const sum = (rows, fn) => round(rows.reduce((s, r) => s + (fn(r) || 0), 0));
export function incomeForDay(state, day) {
  const rows = state.ledger.filter((r) => r.day === day),
    history = state.history.find((r) => r.day === day);
  const sales =
    sum(rows, (r) => (r.category === "sales" ? r.cash : 0)) ||
    history?.revenue ||
    0;
  const ingredients =
    sum(rows, (r) => (r.category === "cost" ? r.expense : 0)) ||
    history?.cost ||
    0;
  const permits =
    sum(rows, (r) => (r.category === "permit" ? -r.cash : 0)) ||
    history?.permit ||
    0;
  const spoilage =
    sum(rows, (r) => (r.category === "spoilage" ? r.expense : 0)) ||
    history?.spoilCost ||
    0;
  const interest = sum(rows, (r) =>
    r.category === "loan"
      ? (r.expense ?? Math.max(0, (r.loanChange || 0) - (r.bankChange || 0)))
      : 0,
  );
  const investment =
    sum(rows, (r) =>
      r.category === "investment dividend" ? r.bankChange : r.realizedGain || 0,
    ) +
    sum(
      (state.bank.portfolio?.trades || []).filter(
        (t) => t.gameDay === day && !t.collateral,
      ),
      (t) => t.realizedCents / 100,
    );
  const other = sum(rows, (r) =>
    !["cost", "spoilage", "loan"].includes(r.category) ? r.expense : 0,
  );
  const resale = sum(rows, (r) =>
    ["inventory sale", "equipment sale"].includes(r.category) ? r.gain : 0,
  );
  const income = round(sales + investment + resale),
    expenses = round(ingredients + permits + spoilage + interest + other);
  return {
    day,
    sales,
    investment,
    resale,
    ingredients,
    permits,
    spoilage,
    interest,
    other,
    income,
    expenses,
    profit: round(income - expenses),
  };
}
export function statements(state, supplies, equipment, value) {
  const days = [
    ...new Set([
      ...state.history.map((h) => h.day),
      ...state.ledger.map((r) => r.day).filter(Number.isFinite),
    ]),
  ].sort((a, b) => a - b);
  if (!days.length) days.push(state.day);
  const reports = days.map((d) => incomeForDay(state, d));
  const labels = {
    sales: "Lemonade sales",
    investment: "Investment income / (loss)",
    resale: "Resale gain / (loss)",
    income: "Total income",
    ingredients: "Ingredients and cups",
    permits: "Location permits",
    spoilage: "Inventory spoilage",
    interest: "Loan interest",
    other: "Other expenses / fees",
    expenses: "Total expenses",
    profit: "Net income / (loss)",
  };
  const incomeRow = (key) => [
    labels[key],
    ...reports.map((report) => report[key]),
    sum(reports, (report) => report[key]),
  ];
  const income = [
    ["Income Statement", ...days.map((day) => `Day ${day}`), "Total"],
    ...["sales", "investment", "resale", "income"].map(incomeRow),
    [],
    ["Expenses"],
    ...[
      "ingredients",
      "permits",
      "spoilage",
      "interest",
      "other",
      "expenses",
      "profit",
    ].map(incomeRow),
  ];
  const inv = inventoryValue(state, supplies),
    equip = round(
      state.upgrades.reduce(
        (s, id) => s + (equipment.find((e) => e.id === id)?.price || 0),
        0,
      ),
    );
  const assets = round(state.cash + state.bank.checking + inv + equip + value),
    liabilities = debt(state),
    earnings = sum(reports, (r) => r.profit);
  const balance = [
    ["Balance Sheet", `As of Day ${state.day}`],
    ["Assets"],
    ["Cash at stand", state.cash],
    ["Checking", state.bank.checking],
    ["Inventory at cost", inv],
    ["Equipment at cost", equip],
    ["Investments at market value", value],
    ["Total assets", assets],
    [],
    ["Liabilities and equity"],
    ["Loan liabilities (including term interest)", liabilities],
    ["Reported retained earnings", earnings],
    [
      "Opening equity / unrealized investment adjustment",
      round(assets - liabilities - earnings),
    ],
    ["Total equity", round(assets - liabilities)],
    ["Total liabilities and equity", assets],
  ];
  const rows = state.ledger;
  const totalCash = round(state.cash + state.bank.checking),
    movement = sum(rows, (r) => (r.cash || 0) + (r.bankChange || 0));
  const group = (r) =>
    ["loan", "loan payment"].includes(r.category)
      ? "financing"
      : [
            "equipment",
            "equipment sale",
            "investment buy",
            "investment sell",
            "investment transfer",
          ].includes(r.category)
        ? "investing"
        : "operating";
  const flow = [
    ["Statement of Cash Flow", `Totals as of Day ${state.day}`],
    ["Opening cash and checking", round(totalCash - movement)],
    ...["operating", "investing", "financing"].map((g) => [
      `Net cash from ${g}`,
      sum(
        rows.filter((r) => group(r) === g),
        (r) => (r.cash || 0) + (r.bankChange || 0),
      ),
    ]),
    ["Net change in cash", movement],
    ["Ending cash and checking", totalCash],
    [
      "Noncash collateral debt payments",
      sum(rows, (r) =>
        r.category === "collateral liquidation" ? -(r.loanChange || 0) : 0,
      ),
    ],
  ];
  return [
    ["Income Statement", income],
    ["Balance Sheet", balance],
    ["Statement of Cash Flow", flow],
  ];
}
const xml = (s) =>
  String(s)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replace(/[\x00-\x08\x0b\x0c\x0e-\x1f]/g, "");
const enc = new TextEncoder();
function crc32(bytes) {
  let c = 0xffffffff;
  for (const b of bytes) {
    c ^= b;
    for (let i = 0; i < 8; i++) c = (c >>> 1) ^ (c & 1 ? 0xedb88320 : 0);
  }
  return (c ^ 0xffffffff) >>> 0;
}
// Small ZIP/OOXML writer: genuine offline .xlsx with three sheets and numeric cells, no CDN or runtime dependency.
function zip(entries) {
  const parts = [],
    central = [];
  let offset = 0,
    centralSize = 0;
  const u16 = (v, o, n) => v.setUint16(o, n, true),
    u32 = (v, o, n) => v.setUint32(o, n, true);
  for (const [name, text] of entries) {
    const n = enc.encode(name),
      data = enc.encode(text),
      crc = crc32(data),
      h = new Uint8Array(30 + n.length),
      v = new DataView(h.buffer);
    u32(v, 0, 0x04034b50);
    u16(v, 4, 20);
    u16(v, 10, 0);
    u16(v, 12, 33);
    u32(v, 14, crc);
    u32(v, 18, data.length);
    u32(v, 22, data.length);
    u16(v, 26, n.length);
    h.set(n, 30);
    parts.push(h, data);
    const c = new Uint8Array(46 + n.length),
      w = new DataView(c.buffer);
    u32(w, 0, 0x02014b50);
    u16(w, 4, 20);
    u16(w, 6, 20);
    u16(w, 14, 33);
    u32(w, 16, crc);
    u32(w, 20, data.length);
    u32(w, 24, data.length);
    u16(w, 28, n.length);
    u32(w, 42, offset);
    c.set(n, 46);
    central.push(c);
    centralSize += c.length;
    offset += h.length + data.length;
  }
  const end = new Uint8Array(22),
    v = new DataView(end.buffer);
  u32(v, 0, 0x06054b50);
  u16(v, 8, entries.length);
  u16(v, 10, entries.length);
  u32(v, 12, centralSize);
  u32(v, 16, offset);
  return new Blob([...parts, ...central, end], {
    type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
  });
}
const ACCOUNTING_FORMAT = String.raw`_("$"* #,##0.00_);[Red]_("$"* \(#,##0.00\);_("$"* "-"??_);_(@_)`;
function columnName(index) {
  let result = "";
  for (let n = index + 1; n > 0; n = Math.floor((n - 1) / 26))
    result = String.fromCharCode(65 + ((n - 1) % 26)) + result;
  return result;
}
function reportStyles() {
  const xf = (fontId = 0, numFmtId = 0, borderId = 0, indent = 0) =>
    `<xf numFmtId="${numFmtId}" fontId="${fontId}" fillId="0" borderId="${borderId}" xfId="0" applyNumberFormat="1" applyFont="1" applyBorder="1" applyAlignment="1"><alignment horizontal="${numFmtId ? "right" : "left"}" vertical="center" indent="${indent}"/></xf>`;
  return `<?xml version="1.0" encoding="UTF-8"?><styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main"><numFmts count="1"><numFmt numFmtId="164" formatCode="${xml(ACCOUNTING_FORMAT)}"/></numFmts><fonts count="2"><font><sz val="11"/><name val="Calibri"/></font><font><b/><sz val="11"/><name val="Calibri"/></font></fonts><fills count="2"><fill><patternFill patternType="none"/></fill><fill><patternFill patternType="gray125"/></fill></fills><borders count="3"><border><left/><right/><top/><bottom/><diagonal/></border><border><left/><right/><top style="thin"><color rgb="FF223C32"/></top><bottom/><diagonal/></border><border><left/><right/><top style="thin"><color rgb="FF223C32"/></top><bottom style="double"><color rgb="FF223C32"/></bottom><diagonal/></border></borders><cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs><cellXfs count="8">${xf()}${xf(1)}${xf(0, 164)}${xf(1, 164, 1)}${xf(1, 164, 2)}${xf(0, 0, 0, 1)}${xf(1, 0, 1)}${xf(1, 0, 2)}</cellXfs><cellStyles count="1"><cellStyle name="Normal" xfId="0" builtinId="0"/></cellStyles></styleSheet>`;
}
function worksheetXML(name, rows, ns) {
  const count = Math.max(2, ...rows.map((row) => row.length)),
    last = columnName(count - 1);
  const width =
    name === "Income Statement" ? 34 : name === "Balance Sheet" ? 58 : 40;
  const amountWidth = name === "Income Statement" ? 16 : 25;
  const totalLabel = (label) => /^(Total |Net change|Ending cash)/.test(label);
  const finalLabel = (label) =>
    label === "Net income / (loss)" || label === "Total liabilities and equity";
  const data = rows
    .map((row, j) => {
      const label = String(row[0] || ""),
        section = row.length === 1,
        final = finalLabel(label),
        total = totalLabel(label);
      return `<row r="${j + 1}" ht="${j === 0 ? 24 : 18}" customHeight="1">${row
        .map((value, i) => {
          const numeric = typeof value === "number" && Number.isFinite(value),
            header = j === 0 || section;
          const style = header
            ? 1
            : final
              ? numeric
                ? 4
                : 7
              : total
                ? numeric
                  ? 3
                  : 6
                : numeric
                  ? 2
                  : i === 0
                    ? 5
                    : 0;
          const attrs = `r="${columnName(i)}${j + 1}" s="${style}"`;
          return numeric
            ? `<c ${attrs}><v>${value}</v></c>`
            : `<c ${attrs} t="inlineStr"><is><t xml:space="preserve">${xml(value)}</t></is></c>`;
        })
        .join("")}</row>`;
    })
    .join("");
  return `<?xml version="1.0" encoding="UTF-8"?><worksheet xmlns="${ns}"><sheetPr><pageSetUpPr fitToPage="1"/></sheetPr><dimension ref="A1:${last}${rows.length}"/><sheetViews><sheetView showGridLines="0" workbookViewId="0">${name === "Income Statement" ? '<pane xSplit="1" ySplit="1" topLeftCell="B2" activePane="bottomRight" state="frozen"/>' : ""}</sheetView></sheetViews><sheetFormatPr defaultRowHeight="18"/><cols><col min="1" max="1" width="${width}" customWidth="1"/><col min="2" max="${count}" width="${amountWidth}" customWidth="1"/></cols><sheetData>${data}</sheetData><pageMargins left="0.3" right="0.3" top="0.5" bottom="0.5" header="0.2" footer="0.2"/><pageSetup orientation="${name === "Income Statement" ? "landscape" : "portrait"}" fitToWidth="1" fitToHeight="0"/></worksheet>`;
}
export function workbook(sheets) {
  const ns = "http://schemas.openxmlformats.org/spreadsheetml/2006/main";
  const entries = [
    [
      "[Content_Types].xml",
      `<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/><Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>${sheets.map((_, i) => `<Override PartName="/xl/worksheets/sheet${i + 1}.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>`).join("")}</Types>`,
    ],
    [
      "_rels/.rels",
      '<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/></Relationships>',
    ],
    [
      "xl/workbook.xml",
      `<workbook xmlns="${ns}" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships"><sheets>${sheets.map(([name], i) => `<sheet name="${xml(name)}" sheetId="${i + 1}" r:id="rId${i + 1}"/>`).join("")}</sheets></workbook>`,
    ],
    [
      "xl/_rels/workbook.xml.rels",
      `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">${sheets.map((_, i) => `<Relationship Id="rId${i + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet${i + 1}.xml"/>`).join("")}<Relationship Id="rId${sheets.length + 1}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>`,
    ],
  ];
  entries.push(["xl/styles.xml", reportStyles()]);
  sheets.forEach(([name, rows], i) =>
    entries.push([
      `xl/worksheets/sheet${i + 1}.xml`,
      worksheetXML(name, rows, ns),
    ]),
  );
  return zip(entries);
}
export function download(blob, name) {
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = name;
  a.click();
  setTimeout(() => URL.revokeObjectURL(a.href), 1000);
}
export function csvReports(sheets) {
  for (const [name, rows] of sheets)
    download(
      new Blob(
        [
          rows
            .map((r) =>
              r
                .map((v) => '"' + String(v).replaceAll('"', '""') + '"')
                .join(","),
            )
            .join("\r\n"),
        ],
        { type: "text/csv" },
      ),
      name.toLowerCase().replaceAll(" ", "-") + ".csv",
    );
}

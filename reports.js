// =====================================================
// reports.js — Account Totals, Trial Balance, CSV Export
// Posted transactions ONLY
// =====================================================

// -------------------------------------------------------
// BUILD ACCOUNT TOTALS MAP
// -------------------------------------------------------
function buildAccountTotals(list, fromDate, toDate) {
  const map = {};
  list.forEach(txn => {
    if (txn.status !== "POSTED") return; // DRAFT and VOID excluded
    txn.rows.forEach(r => {
      const d = r.date || "";
      if (fromDate && d < fromDate) return;
      if (toDate   && d > toDate)   return;
      const acc = r.account || "(No Account)";
      if (!map[acc]) map[acc] = { net: 0, vat: 0, gross: 0 };
      const vat = r.tax === "VAT" ? r.net * 0.12 : 0;
      map[acc].net   += r.net;
      map[acc].vat   += vat;
      map[acc].gross += r.net + vat;
    });
  });
  return map;
}

// -------------------------------------------------------
// RENDER ACCOUNT TABLE
// -------------------------------------------------------
function renderReportTable(title, map) {
  const entries = Object.entries(map);
  if (entries.length === 0)
    return `<div class="report-section"><h3>${title}</h3><div class="report-empty">No posted transactions for this period.</div></div>`;

  let totNet = 0, totVat = 0, totGross = 0;
  const rows = entries.map(([acc, t]) => {
    totNet += t.net; totVat += t.vat; totGross += t.gross;
    return `<tr>
      <td>${acc}</td>
      <td class="num">${t.net.toFixed(2)}</td>
      <td class="num">${t.vat.toFixed(2)}</td>
      <td class="num"><strong>${t.gross.toFixed(2)}</strong></td>
    </tr>`;
  }).join("");

  return `
    <div class="report-section">
      <h3>${title}</h3>
      <table class="report-table">
        <thead><tr><th>Account</th><th class="num">Net</th><th class="num">VAT</th><th class="num">Gross</th></tr></thead>
        <tbody>${rows}</tbody>
        <tfoot><tr>
          <td><strong>TOTAL</strong></td>
          <td class="num">${totNet.toFixed(2)}</td>
          <td class="num">${totVat.toFixed(2)}</td>
          <td class="num">${totGross.toFixed(2)}</td>
        </tr></tfoot>
      </table>
    </div>`;
}

// -------------------------------------------------------
// TRIAL BALANCE
// Aggregates all journal entries from posted transactions
// -------------------------------------------------------
function buildTrialBalance(from, to) {
  const ledger = {};

  function addEntry(account, debit, credit) {
    if (!ledger[account]) ledger[account] = { debit: 0, credit: 0 };
    ledger[account].debit  += debit;
    ledger[account].credit += credit;
  }

  const allPosted = [
    ...window.savedSales.filter(s => s.status === "POSTED").map(s => ({ txn: s, type: "sales" })),
    ...window.savedPurchases.filter(p => p.status === "POSTED").map(p => ({ txn: p, type: "purchases" })),
  ];

  allPosted.forEach(({ txn, type }) => {
    const d = txn.rows[0]?.date || "";
    if (from && d < from) return;
    if (to   && d > to)   return;
    const entries = window.generateJournalEntries(txn, type);
    entries.forEach(e => addEntry(e.account, e.debit, e.credit));
  });

  return ledger;
}

function renderTrialBalance(ledger) {
  const entries = Object.entries(ledger);
  if (entries.length === 0)
    return `<div class="report-section"><h3>Trial Balance</h3><div class="report-empty">No posted transactions for this period.</div></div>`;

  let totDr = 0, totCr = 0;
  const rows = entries.map(([acc, v]) => {
    totDr += v.debit; totCr += v.credit;
    return `<tr>
      <td>${acc}</td>
      <td class="num">${v.debit  > 0 ? v.debit.toFixed(2)  : ""}</td>
      <td class="num">${v.credit > 0 ? v.credit.toFixed(2) : ""}</td>
    </tr>`;
  }).join("");

  const balanced = Math.abs(totDr - totCr) < 0.01;
  const balClass = balanced ? "tb-balanced" : "tb-unbalanced";

  return `
    <div class="report-section">
      <h3>Trial Balance</h3>
      <div class="${balClass}">${balanced ? "✓ Balanced" : "⚠ Out of balance — check entries"}</div>
      <table class="report-table">
        <thead><tr><th>Account</th><th class="num">Debit</th><th class="num">Credit</th></tr></thead>
        <tbody>${rows}</tbody>
        <tfoot><tr>
          <td><strong>TOTAL</strong></td>
          <td class="num"><strong>${totDr.toFixed(2)}</strong></td>
          <td class="num"><strong>${totCr.toFixed(2)}</strong></td>
        </tr></tfoot>
      </table>
    </div>`;
}

// -------------------------------------------------------
// LAST REPORT DATA (for CSV export)
// -------------------------------------------------------
let _lastReportData = null;

// -------------------------------------------------------
// RUN REPORT
// -------------------------------------------------------
document.getElementById("runReportBtn").onclick = function () {
  const from = document.getElementById("reportFromDate").value;
  const to   = document.getElementById("reportToDate").value;
  const type = document.getElementById("reportType").value;
  const out  = document.getElementById("reportOutput");

  const period = (from || to)
    ? `${window.formatDate(from) || "All"} → ${window.formatDate(to) || "All"}`
    : "All dates";

  let html = `<p class="report-period">Period: ${period} &nbsp;|&nbsp; Posted transactions only</p>`;
  _lastReportData = { from, to, type };

  if (type === "trial") {
    const ledger = buildTrialBalance(from, to);
    html += renderTrialBalance(ledger);
  } else {
    if (type === "both" || type === "sales") {
      const sm = buildAccountTotals(window.savedSales, from, to);
      html += renderReportTable("Sales by Account", sm);
    }
    if (type === "both" || type === "purchases") {
      const pm = buildAccountTotals(window.savedPurchases, from, to);
      html += renderReportTable("Purchases by Account", pm);
    }
  }

  out.innerHTML = html;
};

// -------------------------------------------------------
// EXPORT CSV
// -------------------------------------------------------
document.getElementById("exportCsvBtn").onclick = function () {
  if (!_lastReportData) {
    alert("Run a report first before exporting.");
    return;
  }

  const { from, to, type } = _lastReportData;
  const rows = [];
  rows.push(["FinMatrix Report Export"]);
  rows.push([`Period: ${from || "All"} to ${to || "All"}`]);
  rows.push([`Generated: ${window.nowTimestamp()}`]);
  rows.push([]);

  if (type === "trial") {
    const ledger = buildTrialBalance(from, to);
    rows.push(["TRIAL BALANCE"]);
    rows.push(["Account", "Debit", "Credit"]);
    let totDr = 0, totCr = 0;
    Object.entries(ledger).forEach(([acc, v]) => {
      rows.push([acc, v.debit > 0 ? v.debit.toFixed(2) : "", v.credit > 0 ? v.credit.toFixed(2) : ""]);
      totDr += v.debit; totCr += v.credit;
    });
    rows.push(["TOTAL", totDr.toFixed(2), totCr.toFixed(2)]);

  } else {
    if (type === "both" || type === "sales") {
      rows.push(["SALES BY ACCOUNT"]);
      rows.push(["Account", "Net", "VAT", "Gross"]);
      const sm = buildAccountTotals(window.savedSales, from, to);
      let tN = 0, tV = 0, tG = 0;
      Object.entries(sm).forEach(([acc, t]) => {
        rows.push([acc, t.net.toFixed(2), t.vat.toFixed(2), t.gross.toFixed(2)]);
        tN += t.net; tV += t.vat; tG += t.gross;
      });
      rows.push(["TOTAL", tN.toFixed(2), tV.toFixed(2), tG.toFixed(2)]);
      rows.push([]);
    }
    if (type === "both" || type === "purchases") {
      rows.push(["PURCHASES BY ACCOUNT"]);
      rows.push(["Account", "Net", "VAT", "Gross"]);
      const pm = buildAccountTotals(window.savedPurchases, from, to);
      let tN = 0, tV = 0, tG = 0;
      Object.entries(pm).forEach(([acc, t]) => {
        rows.push([acc, t.net.toFixed(2), t.vat.toFixed(2), t.gross.toFixed(2)]);
        tN += t.net; tV += t.vat; tG += t.gross;
      });
      rows.push(["TOTAL", tN.toFixed(2), tV.toFixed(2), tG.toFixed(2)]);
    }
  }

  // Add raw transaction detail
  rows.push([]);
  rows.push(["TRANSACTION DETAIL (Posted)"]);
  rows.push(["Type", "Date", "Party", "TIN", "Reference", "Account", "Net", "VAT", "Gross", "Tax Type"]);

  const addDetail = (list, label) => {
    list.filter(t => t.status === "POSTED").forEach(t => {
      t.rows.forEach(r => {
        const d = r.date || "";
        if (from && d < from) return;
        if (to   && d > to)   return;
        const vat   = r.tax === "VAT" ? r.net * 0.12 : 0;
        const gross = r.net + vat;
        const party = label === "Sale" ? t.customer : t.supplier;
        rows.push([
          label,
          r.date,
          party,
          t.tin || "",
          t.reference || "",
          r.account || "",
          r.net.toFixed(2),
          vat.toFixed(2),
          gross.toFixed(2),
          r.tax,
        ]);
      });
    });
  };

  if (type === "both" || type === "sales")    addDetail(window.savedSales,     "Sale");
  if (type === "both" || type === "purchases") addDetail(window.savedPurchases, "Purchase");

  // Build CSV string
  const csv = rows.map(r =>
    r.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(",")
  ).join("\r\n");

  const blob = new Blob([csv], { type: "text/csv" });
  const url  = URL.createObjectURL(blob);
  const a    = document.createElement("a");
  a.href     = url;
  a.download = `FinMatrix_Report_${from || "all"}_to_${to || "all"}.csv`;
  a.click();
  URL.revokeObjectURL(url);
};

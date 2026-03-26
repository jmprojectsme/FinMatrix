// =====================================================
// REPORTS MODULE
// =====================================================

// Build a { accountName: { net, vat, gross } } map
// from a transaction list, filtered by date range.
// Skips VOID transactions.
function buildAccountTotals(list, fromDate, toDate) {
  const map = {};

  list.forEach(txn => {
    if (txn.status === "VOID") return;

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

// Render one report section table
function renderReportTable(title, map) {
  const entries = Object.entries(map);

  if (entries.length === 0) {
    return `
      <div class="report-section">
        <h3>${title}</h3>
        <div class="report-empty">No posted transactions for this period.</div>
      </div>`;
  }

  let totNet = 0, totVat = 0, totGross = 0;

  const rows = entries.map(([acc, t]) => {
    totNet   += t.net;
    totVat   += t.vat;
    totGross += t.gross;
    return `
      <tr>
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
        <thead>
          <tr>
            <th>Account</th>
            <th class="num">Net</th>
            <th class="num">VAT</th>
            <th class="num">Gross</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
        <tfoot>
          <tr>
            <td><strong>TOTAL</strong></td>
            <td class="num">${totNet.toFixed(2)}</td>
            <td class="num">${totVat.toFixed(2)}</td>
            <td class="num">${totGross.toFixed(2)}</td>
          </tr>
        </tfoot>
      </table>
    </div>`;
}

// Run Report button
document.getElementById("runReportBtn").onclick = function() {
  const from = document.getElementById("reportFromDate").value;
  const to   = document.getElementById("reportToDate").value;
  const type = document.getElementById("reportType").value;
  const out  = document.getElementById("reportOutput");

  const dateLabel = (from || to)
    ? `<p class="report-period">Period: ${from || "all"} → ${to || "all"}</p>`
    : `<p class="report-period">Period: All dates</p>`;

  let html = dateLabel;

  if (type === "both" || type === "sales") {
    const salesMap = buildAccountTotals(window.savedSales, from, to);
    html += renderReportTable("Sales by Account", salesMap);
  }

  if (type === "both" || type === "purchases") {
    const purchMap = buildAccountTotals(window.savedPurchases, from, to);
    html += renderReportTable("Purchases by Account", purchMap);
  }

  out.innerHTML = html;
};

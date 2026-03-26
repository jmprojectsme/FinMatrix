// =====================================================
// journal.js — General Journal (Posted only)
// =====================================================

document.getElementById("runJournalBtn").onclick = function () {
  const from = document.getElementById("journalFromDate").value;
  const to   = document.getElementById("journalToDate").value;
  const out  = document.getElementById("journalOutput");

  // Collect all posted transactions with date info
  const allTxns = [
    ...window.savedSales.filter(s => s.status === "POSTED")
      .map(s => ({ ...s, _type: "sale",     _party: s.customer, _ref: s.reference })),
    ...window.savedPurchases.filter(p => p.status === "POSTED")
      .map(p => ({ ...p, _type: "purchase", _party: p.supplier, _ref: p.reference })),
  ];

  // Filter by date (use first row date)
  const filtered = allTxns.filter(t => {
    const d = t.rows[0]?.date || "";
    if (from && d < from) return false;
    if (to   && d > to)   return false;
    return true;
  });

  // Sort by date ascending
  filtered.sort((a, b) => {
    const da = a.rows[0]?.date || "";
    const db = b.rows[0]?.date || "";
    return da < db ? -1 : da > db ? 1 : 0;
  });

  if (filtered.length === 0) {
    out.innerHTML = `<div class="report-empty">No posted transactions for this period.</div>`;
    return;
  }

  let html = `<p class="report-period">Period: ${window.formatDate(from) || "All"} → ${window.formatDate(to) || "All"}</p>`;

  filtered.forEach(t => {
    const date    = window.formatDate(t.rows[0]?.date || "");
    const gross   = window.calcGross(t.rows).toFixed(2);
    const entries = window.generateJournalEntries(t, t._type === "sale" ? "sales" : "purchases");

    let rows = "";
    let totDr = 0, totCr = 0;
    entries.forEach(e => {
      totDr += e.debit;
      totCr += e.credit;
      rows += `
        <tr>
          <td class="${e.debit > 0 ? "" : "indent"}">${e.account}</td>
          <td class="num">${e.debit  > 0 ? e.debit.toFixed(2)  : ""}</td>
          <td class="num">${e.credit > 0 ? e.credit.toFixed(2) : ""}</td>
        </tr>`;
    });

    html += `
      <div class="journal-entry-block">
        <div class="journal-entry-header">
          <span class="je-date">${date}</span>
          <span class="je-party">${t._party}</span>
          <span class="je-ref">${t._ref || "—"}</span>
          <span class="je-gross">${gross}</span>
          <span class="je-type ${t._type}">${t._type === "sale" ? "Sale" : "Purchase"}</span>
        </div>
        <table class="journal-table">
          <thead><tr><th>Account</th><th class="num">Debit</th><th class="num">Credit</th></tr></thead>
          <tbody>
            ${rows}
            <tr class="journal-totals">
              <td><strong>Total</strong></td>
              <td class="num"><strong>${totDr.toFixed(2)}</strong></td>
              <td class="num"><strong>${totCr.toFixed(2)}</strong></td>
            </tr>
          </tbody>
        </table>
      </div>`;
  });

  out.innerHTML = html;
};

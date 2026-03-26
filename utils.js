// =====================================================
// utils.js — Shared Helpers
// =====================================================

// -------------------------------------------------------
// DATE HELPERS
// -------------------------------------------------------
window.formatDate = function (dateStr) {
  if (!dateStr) return "—";
  const [y, m, d] = dateStr.split("-").map(Number);
  if (!y || !m || !d) return dateStr;
  return new Date(y, m - 1, d).toLocaleDateString(undefined, {
    year: "numeric", month: "short", day: "numeric"
  });
};

window.nowTimestamp = function () {
  const now = new Date();
  return now.toLocaleDateString() + " " +
         now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
};

// -------------------------------------------------------
// ACCOUNT DROPDOWN
// Accepts a category key: "sales" | "purchases" | "assets" | "liabilities" | "equity"
// Or pass "all" to include all categories (used in journal / COA pickers)
// -------------------------------------------------------
window.createAccountDropdown = function (type, selected = "") {
  const select = document.createElement("select");
  select.className = "account-select";
  select.innerHTML = `<option value="">— Select Account —</option>`;

  const categories = type === "all"
    ? Object.keys(window.COA)
    : [type];

  categories.forEach(cat => {
    if (!window.COA[cat]) return;
    Object.keys(window.COA[cat]).forEach(group => {
      const og = document.createElement("optgroup");
      og.label = (type === "all") ? `[${cat.toUpperCase()}] ${group}` : group;
      window.COA[cat][group].forEach(acc => {
        const opt = document.createElement("option");
        opt.value = acc;
        opt.textContent = acc;
        if (acc === selected) opt.selected = true;
        og.appendChild(opt);
      });
      select.appendChild(og);
    });
  });

  return select;
};

// -------------------------------------------------------
// AUDIT LOG — loads STORED timestamps from record
// Never overwrites existing timestamps
// -------------------------------------------------------
window.loadAuditLog = function (type) {
  const list  = type === "sales" ? window.savedSales : window.savedPurchases;
  const index = type === "sales" ? window.currentSaleIndex : window.currentPurchaseIndex;

  const editEl   = document.getElementById(type === "sales" ? "salesLastEdited"  : "purchaseLastEdited");
  const postEl   = document.getElementById(type === "sales" ? "salesPostedAt"    : "purchasePostedAt");
  const voidEl   = document.getElementById(type === "sales" ? "salesVoidedAt"    : "purchaseVoidedAt");
  const statusEl = document.getElementById(type === "sales" ? "salesRecordStatus": "purchaseRecordStatus");

  if (!editEl) return;

  // New unsaved record
  if (index === null || !list[index]) {
    editEl.textContent = "Created: —";
    postEl?.classList.add("hidden");
    voidEl?.classList.add("hidden");
    if (statusEl) statusEl.textContent = "New Draft";
    return;
  }

  const rec = list[index];
  editEl.textContent = `Last saved: ${rec.createdAt || "—"}`;

  if (rec.postedAt) {
    postEl.textContent = `Posted: ${rec.postedAt}`;
    postEl.classList.remove("hidden");
  } else {
    postEl?.classList.add("hidden");
  }

  if (rec.voidedAt) {
    voidEl.textContent = `Voided: ${rec.voidedAt}`;
    voidEl.classList.remove("hidden");
  } else {
    voidEl?.classList.add("hidden");
  }

  if (statusEl) statusEl.textContent = rec.lastEditedStatus || "Draft";
};

// -------------------------------------------------------
// INLINE VALIDATION
// -------------------------------------------------------
window.showInlineError = function (input, message, isWarning = false) {
  window.clearInlineError(input);
  input.classList.add(isWarning ? "input-warning" : "input-error");
  const msg = document.createElement("div");
  msg.className = isWarning ? "validation-warning" : "validation-error";
  msg.textContent = message;
  input.parentNode.appendChild(msg);
};

window.clearInlineError = function (input) {
  input.classList.remove("input-error", "input-warning");
  input.parentNode.querySelector(".validation-error, .validation-warning")?.remove();
};

window.isDuplicateReference = function (list, ref, currentIndex) {
  if (!ref) return false;
  const lower = ref.toLowerCase();
  return list.some((item, i) =>
    i !== currentIndex && item.reference?.toLowerCase() === lower
  );
};

// -------------------------------------------------------
// STATUS BADGE (inline list rows)
// -------------------------------------------------------
window.statusBadge = function (status) {
  if (status === "VOID")
    return `<span class="list-badge void">VOID</span>`;
  if (status === "POSTED")
    return `<span class="list-badge posted">POSTED</span>`;
  return `<span class="list-badge draft">DRAFT</span>`;
};

// -------------------------------------------------------
// DOUBLE-ENTRY JOURNAL GENERATOR
// Returns array of { account, debit, credit } lines
//
// Sales (posted):
//   DR  Accounts Receivable   (gross per row)
//   CR  [selected revenue account]  (net per row)
//   CR  Output VAT Payable    (vat per row, if VAT)
//
// Purchases (posted):
//   DR  [selected expense account]  (net per row)
//   DR  Input VAT             (vat per row, if VAT)
//   CR  Accounts Payable      (gross per row)
// -------------------------------------------------------
window.generateJournalEntries = function (txn, type) {
  const entries = [];

  txn.rows.forEach(r => {
    const net   = parseFloat(r.net)  || 0;
    const vat   = r.tax === "VAT" ? net * 0.12 : 0;
    const gross = net + vat;
    const acct  = r.account || (type === "sales" ? "Sales Revenue" : "Miscellaneous Expense");

    if (type === "sales") {
      entries.push({ account: "Accounts Receivable", debit: gross, credit: 0 });
      entries.push({ account: acct,                  debit: 0,     credit: net });
      if (vat > 0)
        entries.push({ account: "Output VAT Payable", debit: 0,   credit: vat });
    } else {
      entries.push({ account: acct,                  debit: net,   credit: 0 });
      if (vat > 0)
        entries.push({ account: "Input VAT",          debit: vat,  credit: 0 });
      entries.push({ account: "Accounts Payable",    debit: 0,     credit: gross });
    }
  });

  // Consolidate duplicate accounts
  const map = {};
  entries.forEach(e => {
    if (!map[e.account]) map[e.account] = { debit: 0, credit: 0 };
    map[e.account].debit  += e.debit;
    map[e.account].credit += e.credit;
  });

  return Object.entries(map).map(([account, v]) => ({
    account, debit: v.debit, credit: v.credit
  }));
};

// Render journal entries into a tbody element
window.renderJournalEntries = function (entries, tbodyEl) {
  tbodyEl.innerHTML = "";
  let totalDr = 0, totalCr = 0;

  entries.forEach(e => {
    totalDr += e.debit;
    totalCr += e.credit;
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td class="${e.debit > 0 ? "" : "indent"}">${e.account}</td>
      <td class="num">${e.debit  > 0 ? e.debit.toFixed(2)  : ""}</td>
      <td class="num">${e.credit > 0 ? e.credit.toFixed(2) : ""}</td>`;
    tbodyEl.appendChild(tr);
  });

  // Totals row
  const tot = document.createElement("tr");
  tot.className = "journal-totals";
  tot.innerHTML = `
    <td><strong>Total</strong></td>
    <td class="num"><strong>${totalDr.toFixed(2)}</strong></td>
    <td class="num"><strong>${totalCr.toFixed(2)}</strong></td>`;
  tbodyEl.appendChild(tot);
};

// -------------------------------------------------------
// GROSS CALCULATOR
// -------------------------------------------------------
window.calcGross = function (rows) {
  return rows.reduce((s, r) => s + (parseFloat(r.net) || 0) + (r.tax === "VAT" ? (parseFloat(r.net) || 0) * 0.12 : 0), 0);
};

// =====================================================
// sales.js — Sales Module
// =====================================================

const salesBody = document.getElementById("salesTableBody");

// -------------------------------------------------------
// VIEW SWITCHING
// -------------------------------------------------------
window.showSalesList = () => {
  document.getElementById("salesFormView").classList.add("hidden");
  document.getElementById("salesListView").classList.remove("hidden");
};

window.showSalesForm = () => {
  document.getElementById("salesListView").classList.add("hidden");
  document.getElementById("salesFormView").classList.remove("hidden");
  window.scrollTo({ top: 0, behavior: "smooth" });
};

// -------------------------------------------------------
// STATUS BADGE ON FORM
// -------------------------------------------------------
window.setSalesStatus = (status) => {
  const el = document.getElementById("salesStatus");
  el.textContent = status;
  el.className = `txn-status ${status.toLowerCase()}`;
};

// -------------------------------------------------------
// FORM LOCK — full lock: inputs, selects, add-row, delete buttons
// -------------------------------------------------------
window.lockSalesForm = (lock) => {
  ["salesCustomer", "salesTin", "salesReference"].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.disabled = lock;
  });
  salesBody.querySelectorAll("input, select").forEach(el => el.disabled = lock);
  salesBody.querySelectorAll(".btn-delete-row").forEach(btn => btn.disabled = lock);
  document.getElementById("addSalesRowBtn").disabled = lock;
  document.getElementById("addSalesRowBtn").classList.toggle("hidden", lock);
};

// -------------------------------------------------------
// BUTTON VISIBILITY
// "new"    → Save, Cancel
// "saved"  → Save, Edit, Post, Cancel
// "posted" → Void, Cancel
// "void"   → Cancel only
// -------------------------------------------------------
window.toggleSalesButtons = (state) => {
  document.getElementById("saveSaleBtn").classList.toggle("hidden", state === "posted" || state === "void");
  document.getElementById("editSaleBtn").classList.toggle("hidden", state !== "saved");
  document.getElementById("postSaleBtn").classList.toggle("hidden", state !== "saved");
  document.getElementById("voidSaleBtn").classList.toggle("hidden", state !== "posted");
};

// -------------------------------------------------------
// JOURNAL PREVIEW (shown only when posted/voided)
// -------------------------------------------------------
function showSalesJournal(txn) {
  if (!txn || txn.status === "DRAFT") {
    document.getElementById("salesJournalPreview").classList.add("hidden");
    return;
  }
  const entries = window.generateJournalEntries(txn, "sales");
  window.renderJournalEntries(entries, document.getElementById("salesJournalBody"));
  document.getElementById("salesJournalPreview").classList.remove("hidden");
}

// -------------------------------------------------------
// ADD ROW
// -------------------------------------------------------
window.addSalesRow = function (data = {}) {
  const tr  = document.createElement("tr");
  const acc = window.createAccountDropdown("sales", data.account);

  tr.innerHTML = `
    <td><input type="date"   class="s-date" value="${data.date || ""}"></td>
    <td><input type="text"   class="s-desc" value="${(data.desc || "").replace(/"/g, "&quot;")}"></td>
    <td class="acc"></td>
    <td><input type="number" class="s-net" min="0" step="0.01" value="${data.net || ""}"></td>
    <td class="s-vat num">0.00</td>
    <td>
      <select class="s-tax">
        <option value="VAT">VAT</option>
        <option value="None">None</option>
      </select>
    </td>
    <td><button type="button" class="btn-delete-row" title="Remove">×</button></td>`;

  tr.querySelector(".acc").appendChild(acc);
  tr.querySelector(".s-tax").value = data.tax || "VAT";

  tr.querySelector(".btn-delete-row").onclick = () => {
    tr.remove();
    updateSalesTotals();
  };

  tr.querySelectorAll("input, select").forEach(el =>
    el.addEventListener("input", () => updateSalesTotals())
  );

  salesBody.appendChild(tr);
  updateSalesTotals();
};

// -------------------------------------------------------
// TOTALS
// -------------------------------------------------------
window.updateSalesTotals = function () {
  let netTotal = 0, vatTotal = 0, exemptTotal = 0;

  salesBody.querySelectorAll("tr").forEach(r => {
    const net = parseFloat(r.querySelector(".s-net").value) || 0;
    const tax = r.querySelector(".s-tax").value;
    const vat = tax === "VAT" ? +(net * 0.12).toFixed(2) : 0;
    r.querySelector(".s-vat").textContent = vat.toFixed(2);
    if (tax === "VAT") { netTotal += net; vatTotal += vat; }
    else               { exemptTotal += net; }
  });

  const grand = netTotal + vatTotal + exemptTotal;
  document.getElementById("salesTotal").textContent         = grand.toFixed(2);
  document.getElementById("salesSummaryNet").textContent    = netTotal.toFixed(2);
  document.getElementById("salesSummaryVat").textContent    = vatTotal.toFixed(2);
  document.getElementById("salesSummaryExempt").textContent = exemptTotal.toFixed(2);
  document.getElementById("salesSummaryGrand").textContent  = grand.toFixed(2);
};

// -------------------------------------------------------
// RESET FORM
// -------------------------------------------------------
window.resetSalesForm = function (withInitialRow = true) {
  salesBody.innerHTML = "";
  ["salesCustomer", "salesTin", "salesReference"].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = "";
  });
  ["salesCustomer", "salesReference"].forEach(id =>
    window.clearInlineError(document.getElementById(id))
  );
  [
    { id: "saveSaleBtn", label: "Save" },
    { id: "postSaleBtn", label: "Post" },
    { id: "voidSaleBtn", label: "Void" },
  ].forEach(({ id, label }) => {
    const btn = document.getElementById(id);
    if (btn) { btn.dataset.confirmed = ""; btn.textContent = label; }
  });
  document.getElementById("salesJournalPreview").classList.add("hidden");
  if (withInitialRow) window.addSalesRow();
  updateSalesTotals();
};

// -------------------------------------------------------
// SAVE
// -------------------------------------------------------
document.getElementById("saveSaleBtn").onclick = function () {
  const custInput = document.getElementById("salesCustomer");
  const refInput  = document.getElementById("salesReference");
  const customer  = custInput.value.trim();
  const reference = refInput.value.trim();

  window.clearInlineError(custInput);
  window.clearInlineError(refInput);

  if (!customer) {
    window.showInlineError(custInput, "Customer name is required");
    return;
  }
  if (reference && window.isDuplicateReference(window.savedSales, reference, window.currentSaleIndex)) {
    window.showInlineError(refInput, "Reference already exists");
    return;
  }
  if (!this.dataset.confirmed) {
    window.showInlineError(custInput, "Tap Save again to confirm", true);
    this.dataset.confirmed = "true";
    this.textContent = "Confirm Save";
    return;
  }
  this.dataset.confirmed = "";
  this.textContent = "Save";

  // Preserve existing timestamps; only set createdAt on first save
  const existing = window.currentSaleIndex !== null ? window.savedSales[window.currentSaleIndex] : null;

  const sale = {
    customer,
    tin:       document.getElementById("salesTin").value.trim(),
    reference,
    status:    "DRAFT",
    lastEditedStatus: "Draft",
    createdAt: existing?.createdAt || window.nowTimestamp(),
    postedAt:  existing?.postedAt  || null,
    voidedAt:  existing?.voidedAt  || null,
    rows: [...salesBody.children].map(r => ({
      date:    r.querySelector(".s-date").value,
      desc:    r.querySelector(".s-desc").value,
      account: r.querySelector(".account-select").value,
      net:     parseFloat(r.querySelector(".s-net").value) || 0,
      tax:     r.querySelector(".s-tax").value,
    }))
  };

  window.DB.saveSale(sale, window.currentSaleIndex).then(() => {
    if (window.currentSaleIndex === null)
      window.currentSaleIndex = window.savedSales.length - 1;
    renderSalesList();
    window.updateOverview();
    showSalesList();
  });
};

// -------------------------------------------------------
// POST
// -------------------------------------------------------
document.getElementById("postSaleBtn").onclick = function () {
  if (window.currentSaleIndex === null) return;
  const custInput = document.getElementById("salesCustomer");

  if (!this.dataset.confirmed) {
    window.showInlineError(custInput, "Tap Post again to finalize", true);
    this.dataset.confirmed = "true";
    this.textContent = "Confirm Post";
    return;
  }
  this.dataset.confirmed = "";
  this.textContent = "Post";

  const rec = window.savedSales[window.currentSaleIndex];
  rec.status          = "POSTED";
  rec.lastEditedStatus = "Posted";
  rec.postedAt        = rec.postedAt || window.nowTimestamp(); // permanent — never overwrite

  window.DB.updateSale(window.currentSaleIndex);
  window.loadAuditLog("sales");
  setSalesStatus("POSTED");
  lockSalesForm(true);
  toggleSalesButtons("posted");
  showSalesJournal(rec);
  window.updateOverview();
};

// -------------------------------------------------------
// VOID
// -------------------------------------------------------
document.getElementById("voidSaleBtn").onclick = function () {
  if (window.currentSaleIndex === null) return;
  const custInput = document.getElementById("salesCustomer");

  if (!this.dataset.confirmed) {
    window.showInlineError(custInput, "Tap Void again to confirm", true);
    this.dataset.confirmed = "true";
    this.textContent = "Confirm Void";
    return;
  }
  this.dataset.confirmed = "";
  this.textContent = "Void";

  const rec = window.savedSales[window.currentSaleIndex];
  rec.status          = "VOID";
  rec.lastEditedStatus = "Voided";
  rec.voidedAt        = rec.voidedAt || window.nowTimestamp();

  window.DB.updateSale(window.currentSaleIndex);
  window.loadAuditLog("sales");
  setSalesStatus("VOID");
  lockSalesForm(true);
  toggleSalesButtons("void");
  document.getElementById("salesJournalPreview").classList.add("hidden");
  window.updateOverview();
};

// -------------------------------------------------------
// RENDER LIST
// -------------------------------------------------------
window.renderSalesList = function () {
  const from   = document.getElementById("salesFromDate").value;
  const to     = document.getElementById("salesToDate").value;
  const search = document.getElementById("salesSearch").value.toLowerCase().trim();
  const tbody  = document.getElementById("salesListTableBody");
  tbody.innerHTML = "";

  const filtered = window.savedSales.filter(s => {
    const date = s.rows[0]?.date || "";
    if (from && date < from) return false;
    if (to   && date > to)   return false;
    if (search &&
        !s.customer.toLowerCase().includes(search) &&
        !(s.reference || "").toLowerCase().includes(search) &&
        !(s.tin || "").toLowerCase().includes(search)) return false;
    return true;
  });

  if (filtered.length === 0) {
    tbody.innerHTML = `<tr class="no-hover"><td colspan="6" class="empty-state">No sales found.</td></tr>`;
    return;
  }

  [...filtered].reverse().forEach(s => {
    const i     = window.savedSales.indexOf(s);
    const date  = s.rows[0]?.date || "";
    const gross = window.calcGross(s.rows);
    const tr    = document.createElement("tr");
    tr.innerHTML = `
      <td>${window.formatDate(date)}</td>
      <td>${s.customer}</td>
      <td>${s.tin || "—"}</td>
      <td>${s.reference || "—"}</td>
      <td class="amount-cell">${gross.toFixed(2)}</td>
      <td>${window.statusBadge(s.status)}</td>`;
    tr.onclick = () => openSale(i);
    tbody.appendChild(tr);
  });
};

// -------------------------------------------------------
// OPEN RECORD
// -------------------------------------------------------
window.openSale = function (i) {
  const s = window.savedSales[i];
  window.currentSaleIndex = i;
  resetSalesForm(false);

  document.getElementById("salesCustomer").value  = s.customer;
  document.getElementById("salesTin").value       = s.tin || "";
  document.getElementById("salesReference").value = s.reference || "";
  s.rows.forEach(r => window.addSalesRow(r));

  setSalesStatus(s.status);
  const isLocked = s.status !== "DRAFT";
  lockSalesForm(isLocked);
  toggleSalesButtons(s.status === "DRAFT" ? "saved" : s.status.toLowerCase());
  window.loadAuditLog("sales");
  showSalesJournal(s);
  showSalesForm();
};

// -------------------------------------------------------
// BUTTON EVENTS
// -------------------------------------------------------
document.getElementById("addNewSaleBtn").onclick = () => {
  window.currentSaleIndex = null;
  resetSalesForm(true);
  setSalesStatus("DRAFT");
  lockSalesForm(false);
  toggleSalesButtons("new");
  window.loadAuditLog("sales");
  showSalesForm();
};

document.getElementById("addSalesRowBtn").onclick  = () => window.addSalesRow();
document.getElementById("editSaleBtn").onclick     = () => { lockSalesForm(false); toggleSalesButtons("saved"); };
document.getElementById("cancelSaleBtn").onclick   = () => { resetSalesForm(false); showSalesList(); };
document.getElementById("filterSalesBtn").onclick  = renderSalesList;
document.getElementById("salesSearch").oninput     = renderSalesList;

document.getElementById("clearSalesSearch").onclick = () => {
  document.getElementById("salesSearch").value   = "";
  document.getElementById("salesFromDate").value = "";
  document.getElementById("salesToDate").value   = "";
  renderSalesList();
};

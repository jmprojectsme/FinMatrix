// =====================================================
// purchases.js — Purchases Module
// =====================================================

const purchaseBody = document.getElementById("purchaseTableBody");

// -------------------------------------------------------
// VIEW SWITCHING
// -------------------------------------------------------
window.showPurchaseList = () => {
  document.getElementById("purchaseFormView").classList.add("hidden");
  document.getElementById("purchaseListView").classList.remove("hidden");
};

window.showPurchaseForm = () => {
  document.getElementById("purchaseListView").classList.add("hidden");
  document.getElementById("purchaseFormView").classList.remove("hidden");
  window.scrollTo({ top: 0, behavior: "smooth" });
};

// -------------------------------------------------------
// STATUS BADGE ON FORM
// -------------------------------------------------------
window.setPurchaseStatus = (status) => {
  const el = document.getElementById("purchaseStatus");
  el.textContent = status;
  el.className = `txn-status ${status.toLowerCase()}`;
};

// -------------------------------------------------------
// FORM LOCK
// -------------------------------------------------------
window.lockPurchaseForm = (lock) => {
  ["purchaseSupplier", "purchaseTin", "purchaseReference"].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.disabled = lock;
  });
  purchaseBody.querySelectorAll("input, select").forEach(el => el.disabled = lock);
  purchaseBody.querySelectorAll(".btn-delete-row").forEach(btn => btn.disabled = lock);
  document.getElementById("addPurchaseRowBtn").disabled = lock;
  document.getElementById("addPurchaseRowBtn").classList.toggle("hidden", lock);
};

// -------------------------------------------------------
// BUTTON VISIBILITY
// -------------------------------------------------------
window.togglePurchaseButtons = (state) => {
  document.getElementById("savePurchaseBtn").classList.toggle("hidden", state === "posted" || state === "void");
  document.getElementById("editPurchaseBtn").classList.toggle("hidden", state !== "saved");
  document.getElementById("postPurchaseBtn").classList.toggle("hidden", state !== "saved");
  document.getElementById("voidPurchaseBtn").classList.toggle("hidden", state !== "posted");
};

// -------------------------------------------------------
// JOURNAL PREVIEW
// -------------------------------------------------------
function showPurchaseJournal(txn) {
  if (!txn || txn.status === "DRAFT") {
    document.getElementById("purchaseJournalPreview").classList.add("hidden");
    return;
  }
  const entries = window.generateJournalEntries(txn, "purchases");
  window.renderJournalEntries(entries, document.getElementById("purchaseJournalBody"));
  document.getElementById("purchaseJournalPreview").classList.remove("hidden");
}

// -------------------------------------------------------
// ADD ROW
// -------------------------------------------------------
window.addPurchaseRow = function (data = {}) {
  const tr  = document.createElement("tr");
  const acc = window.createAccountDropdown("purchases", data.account);

  tr.innerHTML = `
    <td><input type="date"   class="p-date" value="${data.date || ""}"></td>
    <td><input type="text"   class="p-desc" value="${(data.desc || "").replace(/"/g, "&quot;")}"></td>
    <td class="acc"></td>
    <td><input type="number" class="p-net" min="0" step="0.01" value="${data.net || ""}"></td>
    <td class="p-vat num">0.00</td>
    <td>
      <select class="p-tax">
        <option value="VAT">VAT</option>
        <option value="None">None</option>
      </select>
    </td>
    <td><button type="button" class="btn-delete-row" title="Remove">×</button></td>`;

  tr.querySelector(".acc").appendChild(acc);
  tr.querySelector(".p-tax").value = data.tax || "VAT";

  tr.querySelector(".btn-delete-row").onclick = () => {
    tr.remove();
    updatePurchaseTotals();
  };

  tr.querySelectorAll("input, select").forEach(el =>
    el.addEventListener("input", () => updatePurchaseTotals())
  );

  purchaseBody.appendChild(tr);
  updatePurchaseTotals();
};

// -------------------------------------------------------
// TOTALS
// -------------------------------------------------------
window.updatePurchaseTotals = function () {
  let netTotal = 0, vatTotal = 0, exemptTotal = 0;

  purchaseBody.querySelectorAll("tr").forEach(r => {
    const net = parseFloat(r.querySelector(".p-net").value) || 0;
    const tax = r.querySelector(".p-tax").value;
    const vat = tax === "VAT" ? +(net * 0.12).toFixed(2) : 0;
    r.querySelector(".p-vat").textContent = vat.toFixed(2);
    if (tax === "VAT") { netTotal += net; vatTotal += vat; }
    else               { exemptTotal += net; }
  });

  const grand = netTotal + vatTotal + exemptTotal;
  document.getElementById("purchaseTotal").textContent         = grand.toFixed(2);
  document.getElementById("purchaseSummaryNet").textContent    = netTotal.toFixed(2);
  document.getElementById("purchaseSummaryVat").textContent    = vatTotal.toFixed(2);
  document.getElementById("purchaseSummaryExempt").textContent = exemptTotal.toFixed(2);
  document.getElementById("purchaseSummaryGrand").textContent  = grand.toFixed(2);
};

// -------------------------------------------------------
// RESET FORM
// -------------------------------------------------------
window.resetPurchaseForm = function (withInitialRow = true) {
  purchaseBody.innerHTML = "";
  ["purchaseSupplier", "purchaseTin", "purchaseReference"].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.value = "";
  });
  ["purchaseSupplier", "purchaseReference"].forEach(id =>
    window.clearInlineError(document.getElementById(id))
  );
  [
    { id: "savePurchaseBtn", label: "Save" },
    { id: "postPurchaseBtn", label: "Post" },
    { id: "voidPurchaseBtn", label: "Void" },
  ].forEach(({ id, label }) => {
    const btn = document.getElementById(id);
    if (btn) { btn.dataset.confirmed = ""; btn.textContent = label; }
  });
  document.getElementById("purchaseJournalPreview").classList.add("hidden");
  if (withInitialRow) window.addPurchaseRow();
  updatePurchaseTotals();
};

// -------------------------------------------------------
// SAVE
// -------------------------------------------------------
document.getElementById("savePurchaseBtn").onclick = function () {
  const suppInput = document.getElementById("purchaseSupplier");
  const refInput  = document.getElementById("purchaseReference");
  const supplier  = suppInput.value.trim();
  const reference = refInput.value.trim();

  window.clearInlineError(suppInput);
  window.clearInlineError(refInput);

  if (!supplier) {
    window.showInlineError(suppInput, "Supplier name is required");
    return;
  }
  if (reference && window.isDuplicateReference(window.savedPurchases, reference, window.currentPurchaseIndex)) {
    window.showInlineError(refInput, "Reference already exists");
    return;
  }
  if (!this.dataset.confirmed) {
    window.showInlineError(suppInput, "Tap Save again to confirm", true);
    this.dataset.confirmed = "true";
    this.textContent = "Confirm Save";
    return;
  }
  this.dataset.confirmed = "";
  this.textContent = "Save";

  const existing = window.currentPurchaseIndex !== null
    ? window.savedPurchases[window.currentPurchaseIndex]
    : null;

  const purchase = {
    supplier,
    tin:       document.getElementById("purchaseTin").value.trim(),
    reference,
    status:    "DRAFT",
    lastEditedStatus: "Draft",
    createdAt: existing?.createdAt || window.nowTimestamp(),
    postedAt:  existing?.postedAt  || null,
    voidedAt:  existing?.voidedAt  || null,
    rows: [...purchaseBody.children].map(r => ({
      date:    r.querySelector(".p-date").value,
      desc:    r.querySelector(".p-desc").value,
      account: r.querySelector(".account-select").value,
      net:     parseFloat(r.querySelector(".p-net").value) || 0,
      tax:     r.querySelector(".p-tax").value,
    }))
  };

  window.DB.savePurchase(purchase, window.currentPurchaseIndex).then(() => {
    if (window.currentPurchaseIndex === null)
      window.currentPurchaseIndex = window.savedPurchases.length - 1;
    renderPurchaseList();
    window.updateOverview();
    showPurchaseList();
  });
};

// -------------------------------------------------------
// POST
// -------------------------------------------------------
document.getElementById("postPurchaseBtn").onclick = function () {
  if (window.currentPurchaseIndex === null) return;
  const suppInput = document.getElementById("purchaseSupplier");

  if (!this.dataset.confirmed) {
    window.showInlineError(suppInput, "Tap Post again to finalize", true);
    this.dataset.confirmed = "true";
    this.textContent = "Confirm Post";
    return;
  }
  this.dataset.confirmed = "";
  this.textContent = "Post";

  const rec = window.savedPurchases[window.currentPurchaseIndex];
  rec.status           = "POSTED";
  rec.lastEditedStatus = "Posted";
  rec.postedAt         = rec.postedAt || window.nowTimestamp();

  window.DB.updatePurchase(window.currentPurchaseIndex);
  window.loadAuditLog("purchases");
  setPurchaseStatus("POSTED");
  lockPurchaseForm(true);
  togglePurchaseButtons("posted");
  showPurchaseJournal(rec);
  window.updateOverview();
};

// -------------------------------------------------------
// VOID
// -------------------------------------------------------
document.getElementById("voidPurchaseBtn").onclick = function () {
  if (window.currentPurchaseIndex === null) return;
  const suppInput = document.getElementById("purchaseSupplier");

  if (!this.dataset.confirmed) {
    window.showInlineError(suppInput, "Tap Void again to confirm", true);
    this.dataset.confirmed = "true";
    this.textContent = "Confirm Void";
    return;
  }
  this.dataset.confirmed = "";
  this.textContent = "Void";

  const rec = window.savedPurchases[window.currentPurchaseIndex];
  rec.status           = "VOID";
  rec.lastEditedStatus = "Voided";
  rec.voidedAt         = rec.voidedAt || window.nowTimestamp();

  window.DB.updatePurchase(window.currentPurchaseIndex);
  window.loadAuditLog("purchases");
  setPurchaseStatus("VOID");
  lockPurchaseForm(true);
  togglePurchaseButtons("void");
  document.getElementById("purchaseJournalPreview").classList.add("hidden");
  window.updateOverview();
};

// -------------------------------------------------------
// RENDER LIST
// -------------------------------------------------------
window.renderPurchaseList = function () {
  const from   = document.getElementById("purchaseFromDate").value;
  const to     = document.getElementById("purchaseToDate").value;
  const search = document.getElementById("purchaseSearch").value.toLowerCase().trim();
  const tbody  = document.getElementById("purchaseListTableBody");
  tbody.innerHTML = "";

  const filtered = window.savedPurchases.filter(p => {
    const date = p.rows[0]?.date || "";
    if (from && date < from) return false;
    if (to   && date > to)   return false;
    if (search &&
        !p.supplier.toLowerCase().includes(search) &&
        !(p.reference || "").toLowerCase().includes(search) &&
        !(p.tin || "").toLowerCase().includes(search)) return false;
    return true;
  });

  if (filtered.length === 0) {
    tbody.innerHTML = `<tr class="no-hover"><td colspan="6" class="empty-state">No purchases found.</td></tr>`;
    return;
  }

  [...filtered].reverse().forEach(p => {
    const i     = window.savedPurchases.indexOf(p);
    const date  = p.rows[0]?.date || "";
    const gross = window.calcGross(p.rows);
    const tr    = document.createElement("tr");
    tr.innerHTML = `
      <td>${window.formatDate(date)}</td>
      <td>${p.supplier}</td>
      <td>${p.tin || "—"}</td>
      <td>${p.reference || "—"}</td>
      <td class="amount-cell">${gross.toFixed(2)}</td>
      <td>${window.statusBadge(p.status)}</td>`;
    tr.onclick = () => openPurchase(i);
    tbody.appendChild(tr);
  });
};

// -------------------------------------------------------
// OPEN RECORD
// -------------------------------------------------------
window.openPurchase = function (i) {
  const p = window.savedPurchases[i];
  window.currentPurchaseIndex = i;
  resetPurchaseForm(false);

  document.getElementById("purchaseSupplier").value  = p.supplier;
  document.getElementById("purchaseTin").value       = p.tin || "";
  document.getElementById("purchaseReference").value = p.reference || "";
  p.rows.forEach(r => window.addPurchaseRow(r));

  setPurchaseStatus(p.status);
  const isLocked = p.status !== "DRAFT";
  lockPurchaseForm(isLocked);
  togglePurchaseButtons(p.status === "DRAFT" ? "saved" : p.status.toLowerCase());
  window.loadAuditLog("purchases");
  showPurchaseJournal(p);
  showPurchaseForm();
};

// -------------------------------------------------------
// BUTTON EVENTS
// -------------------------------------------------------
document.getElementById("addNewPurchaseBtn").onclick = () => {
  window.currentPurchaseIndex = null;
  resetPurchaseForm(true);
  setPurchaseStatus("DRAFT");
  lockPurchaseForm(false);
  togglePurchaseButtons("new");
  window.loadAuditLog("purchases");
  showPurchaseForm();
};

document.getElementById("addPurchaseRowBtn").onclick  = () => window.addPurchaseRow();
document.getElementById("editPurchaseBtn").onclick    = () => { lockPurchaseForm(false); togglePurchaseButtons("saved"); };
document.getElementById("cancelPurchaseBtn").onclick  = () => { resetPurchaseForm(false); showPurchaseList(); };
document.getElementById("filterPurchasesBtn").onclick = renderPurchaseList;
document.getElementById("purchaseSearch").oninput     = renderPurchaseList;

document.getElementById("clearPurchaseSearch").onclick = () => {
  document.getElementById("purchaseSearch").value    = "";
  document.getElementById("purchaseFromDate").value  = "";
  document.getElementById("purchaseToDate").value    = "";
  renderPurchaseList();
};

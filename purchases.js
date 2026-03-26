// =====================================================
// PURCHASES MODULE
// =====================================================
const purchaseBody = document.getElementById("purchaseTableBody");

// --- VIEW SWITCHING ---
window.showPurchaseList = () => {
  document.getElementById("purchaseFormView").classList.add("hidden");
  document.getElementById("purchaseListView").classList.remove("hidden");
};

window.showPurchaseForm = () => {
  document.getElementById("purchaseListView").classList.add("hidden");
  document.getElementById("purchaseFormView").classList.remove("hidden");
};

// --- STATUS BADGE ---
window.setPurchaseStatus = (status) => {
  const el = document.getElementById("purchaseStatus");
  el.textContent = status;
  el.className = `txn-status ${status.toLowerCase()}`;
};

// --- FORM LOCK ---
window.lockPurchaseForm = (lock) => {
  document.getElementById("purchaseFormView")
    .querySelectorAll("input, select")
    .forEach(el => el.disabled = lock);
  document.getElementById("purchaseFormView")
    .querySelectorAll(".btn-delete-row")
    .forEach(btn => btn.disabled = lock);
};

// --- BUTTON VISIBILITY ---
window.togglePurchaseButtons = (state) => {
  document.getElementById("savePurchaseBtn").classList.toggle("hidden",  state === "posted" || state === "void");
  document.getElementById("editPurchaseBtn").classList.toggle("hidden",  state !== "saved");
  document.getElementById("postPurchaseBtn").classList.toggle("hidden",  state === "posted" || state === "void");
  document.getElementById("voidPurchaseBtn").classList.toggle("hidden",  state !== "posted");
};

// --- ADD ROW ---
window.addPurchaseRow = function(data = {}) {
  const tr  = document.createElement("tr");
  const acc = window.createAccountDropdown("purchases", data.account);

  tr.innerHTML = `
    <td><input type="date"   class="p-date" value="${data.date || ""}"></td>
    <td><input type="text"   class="p-desc" value="${data.desc || ""}"></td>
    <td class="acc"></td>
    <td><input type="number" class="p-net"  value="${data.net  || ""}"></td>
    <td class="p-vat">0.00</td>
    <td>
      <select class="p-tax">
        <option value="VAT">VAT</option>
        <option value="None">None</option>
      </select>
    </td>
    <td><button type="button" class="btn-delete-row">×</button></td>`;

  tr.querySelector(".acc").appendChild(acc);
  tr.querySelector(".p-tax").value = data.tax || "VAT";

  tr.querySelector(".btn-delete-row").onclick = () => {
    tr.remove();
    updatePurchaseTotals();
    window.updateAuditLog('purchases');
  };

  tr.querySelectorAll("input, select").forEach(el =>
    el.addEventListener("input", () => {
      updatePurchaseTotals();
      window.updateAuditLog('purchases');
    })
  );

  purchaseBody.appendChild(tr);
  updatePurchaseTotals();
};

// --- TOTALS ---
window.updatePurchaseTotals = function() {
  let netTotal = 0, vatTotal = 0, exemptTotal = 0;

  purchaseBody.querySelectorAll("tr").forEach(r => {
    const net = +r.querySelector(".p-net").value || 0;
    const tax = r.querySelector(".p-tax").value;
    const vat = tax === "VAT" ? net * 0.12 : 0;
    r.querySelector(".p-vat").textContent = vat.toFixed(2);
    if (tax === "VAT") { netTotal += net; vatTotal += vat; }
    else { exemptTotal += net; }
  });

  const grandTotal = netTotal + vatTotal + exemptTotal;
  document.getElementById("purchaseTotal").textContent         = grandTotal.toFixed(2);
  document.getElementById("purchaseSummaryNet").textContent    = netTotal.toFixed(2);
  document.getElementById("purchaseSummaryVat").textContent    = vatTotal.toFixed(2);
  document.getElementById("purchaseSummaryExempt").textContent = exemptTotal.toFixed(2);
  document.getElementById("purchaseSummaryGrand").textContent  = grandTotal.toFixed(2);
};

// --- RESET FORM ---
window.resetPurchaseForm = function(withInitialRow = true) {
  purchaseBody.innerHTML = "";
  document.getElementById("purchaseSupplier").value = "";
  document.getElementById("purchaseReference").value = "";
  window.clearInlineError(document.getElementById("purchaseSupplier"));
  window.clearInlineError(document.getElementById("purchaseReference"));
  document.getElementById("savePurchaseBtn").dataset.confirmed = "";
  document.getElementById("savePurchaseBtn").textContent = "Save";
  if (withInitialRow) addPurchaseRow();
};

// --- SAVE ---
document.getElementById("savePurchaseBtn").onclick = function() {
  const suppInput = document.getElementById("purchaseSupplier");
  const refInput  = document.getElementById("purchaseReference");
  const supplier  = suppInput.value.trim();
  const reference = refInput.value.trim();

  window.clearInlineError(suppInput);
  window.clearInlineError(refInput);

  if (!supplier) {
    window.showInlineError(suppInput, "Supplier Name is required");
    return;
  }

  if (reference && window.isDuplicateReference(window.savedPurchases, reference, window.currentPurchaseIndex)) {
    window.showInlineError(refInput, "Reference already exists");
    return;
  }

  if (!this.dataset.confirmed) {
    window.showInlineError(suppInput, "Click Save again to confirm changes", true);
    this.dataset.confirmed = "true";
    this.textContent = "Confirm Save";
    return;
  }

  this.dataset.confirmed = "";
  this.textContent = "Save";

  const purchase = {
    supplier,
    reference,
    status: "DRAFT",
    lastEditedStatus: "Draft",
    rows: [...purchaseBody.children].map(r => ({
      date:    r.querySelector(".p-date").value,
      desc:    r.querySelector(".p-desc").value,
      account: r.querySelector(".account-select").value,
      net:     +r.querySelector(".p-net").value,
      tax:     r.querySelector(".p-tax").value
    }))
  };

  if (window.currentPurchaseIndex !== null) window.savedPurchases[window.currentPurchaseIndex] = purchase;
  else window.savedPurchases.push(purchase);

  renderPurchaseList();
  window.updateOverview();
  showPurchaseList();
};

// --- POST ---
document.getElementById("postPurchaseBtn").onclick = function() {
  if (window.currentPurchaseIndex === null) return;
  const suppInput = document.getElementById("purchaseSupplier");

  if (!this.dataset.confirmed) {
    window.showInlineError(suppInput, "Click Post again to finalize", true);
    this.dataset.confirmed = "true";
    this.textContent = "Confirm Post";
    return;
  }

  this.dataset.confirmed = "";
  this.textContent = "Post";
  window.savedPurchases[window.currentPurchaseIndex].status           = "POSTED";
  window.savedPurchases[window.currentPurchaseIndex].lastEditedStatus = "Posted";
  window.updateAuditLog('purchases');
  setPurchaseStatus("POSTED");
  lockPurchaseForm(true);
  togglePurchaseButtons("posted");
  window.updateOverview();
};

// --- VOID ---
document.getElementById("voidPurchaseBtn").onclick = function() {
  if (window.currentPurchaseIndex === null) return;
  const suppInput = document.getElementById("purchaseSupplier");

  if (!this.dataset.confirmed) {
    window.showInlineError(suppInput, "Click Void again to cancel", true);
    this.dataset.confirmed = "true";
    this.textContent = "Confirm Void";
    return;
  }

  this.dataset.confirmed = "";
  this.textContent = "Void";
  window.savedPurchases[window.currentPurchaseIndex].status           = "VOID";
  window.savedPurchases[window.currentPurchaseIndex].lastEditedStatus = "Voided";
  window.updateAuditLog('purchases');
  setPurchaseStatus("VOID");
  lockPurchaseForm(true);
  togglePurchaseButtons("void");
  window.updateOverview();
};

// --- RENDER LIST ---
window.renderPurchaseList = function() {
  const from   = document.getElementById("purchaseFromDate").value;
  const to     = document.getElementById("purchaseToDate").value;
  const search = document.getElementById("purchaseSearch").value.toLowerCase();
  const tbody  = document.getElementById("purchaseListTableBody");
  tbody.innerHTML = "";

  window.savedPurchases.forEach((p, i) => {
    const date = p.rows[0]?.date || "";
    if (from && date < from) return;
    if (to   && date > to)   return;
    if (search && !p.supplier.toLowerCase().includes(search) && !p.reference.toLowerCase().includes(search)) return;

    let gross = 0;
    p.rows.forEach(r => gross += r.net + (r.tax === "VAT" ? r.net * 0.12 : 0));

    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${date}</td>
      <td>${window.statusBadge(p.status)}${p.supplier}</td>
      <td>${p.reference || ""}</td>
      <td>${gross.toFixed(2)}</td>`;
    tr.onclick = () => openPurchase(i);
    tbody.appendChild(tr);
  });
};

// --- OPEN RECORD ---
window.openPurchase = function(i) {
  const p = window.savedPurchases[i];
  window.currentPurchaseIndex = i;
  resetPurchaseForm(false);
  document.getElementById("purchaseSupplier").value = p.supplier;
  document.getElementById("purchaseReference").value = p.reference || "";
  p.rows.forEach(r => addPurchaseRow(r));
  setPurchaseStatus(p.status);
  lockPurchaseForm(true);
  togglePurchaseButtons(p.status === "DRAFT" ? "saved" : p.status.toLowerCase());
  window.updateAuditLog('purchases');
  showPurchaseForm();
};

// --- BUTTON EVENTS ---
document.getElementById("addNewPurchaseBtn").onclick  = () => { window.currentPurchaseIndex = null; resetPurchaseForm(true); setPurchaseStatus("DRAFT"); lockPurchaseForm(false); togglePurchaseButtons("new"); showPurchaseForm(); };
document.getElementById("addPurchaseRowBtn").onclick  = () => addPurchaseRow();
document.getElementById("editPurchaseBtn").onclick    = () => lockPurchaseForm(false);
document.getElementById("cancelPurchaseBtn").onclick  = showPurchaseList;
document.getElementById("filterPurchasesBtn").onclick = renderPurchaseList;
document.getElementById("purchaseSearch").oninput     = renderPurchaseList;

// =====================================================
// SALES MODULE
// =====================================================
const salesBody = document.getElementById("salesTableBody");

// --- VIEW SWITCHING ---
window.showSalesList = () => {
  document.getElementById("salesFormView").classList.add("hidden");
  document.getElementById("salesListView").classList.remove("hidden");
};

window.showSalesForm = () => {
  document.getElementById("salesListView").classList.add("hidden");
  document.getElementById("salesFormView").classList.remove("hidden");
};

// --- STATUS BADGE ---
window.setSalesStatus = (status) => {
  const el = document.getElementById("salesStatus");
  el.textContent = status;
  el.className = `txn-status ${status.toLowerCase()}`;
};

// --- FORM LOCK ---
window.lockSalesForm = (lock) => {
  document.getElementById("salesFormView")
    .querySelectorAll("input, select")
    .forEach(el => el.disabled = lock);
  document.getElementById("salesFormView")
    .querySelectorAll(".btn-delete-row")
    .forEach(btn => btn.disabled = lock);
};

// --- BUTTON VISIBILITY ---
window.toggleSalesButtons = (state) => {
  document.getElementById("saveSaleBtn").classList.toggle("hidden",  state === "posted" || state === "void");
  document.getElementById("editSaleBtn").classList.toggle("hidden",  state !== "saved");
  document.getElementById("postSaleBtn").classList.toggle("hidden",  state === "posted" || state === "void");
  document.getElementById("voidSaleBtn").classList.toggle("hidden",  state !== "posted");
};

// --- ADD ROW ---
window.addSalesRow = function(data = {}) {
  const tr  = document.createElement("tr");
  const acc = window.createAccountDropdown("sales", data.account);

  tr.innerHTML = `
    <td><input type="date"   class="s-date" value="${data.date || ""}"></td>
    <td><input type="text"   class="s-desc" value="${data.desc || ""}"></td>
    <td class="acc"></td>
    <td><input type="number" class="s-net"  value="${data.net  || ""}"></td>
    <td class="s-vat">0.00</td>
    <td>
      <select class="s-tax">
        <option value="VAT">VAT</option>
        <option value="None">None</option>
      </select>
    </td>
    <td><button type="button" class="btn-delete-row">×</button></td>`;

  tr.querySelector(".acc").appendChild(acc);
  tr.querySelector(".s-tax").value = data.tax || "VAT";

  tr.querySelector(".btn-delete-row").onclick = () => {
    tr.remove();
    updateSalesTotals();
    window.updateAuditLog('sales');
  };

  tr.querySelectorAll("input, select").forEach(el =>
    el.addEventListener("input", () => {
      updateSalesTotals();
      window.updateAuditLog('sales');
    })
  );

  salesBody.appendChild(tr);
  updateSalesTotals();
};

// --- TOTALS ---
window.updateSalesTotals = function() {
  let netTotal = 0, vatTotal = 0, exemptTotal = 0;

  salesBody.querySelectorAll("tr").forEach(r => {
    const net = +r.querySelector(".s-net").value || 0;
    const tax = r.querySelector(".s-tax").value;
    const vat = tax === "VAT" ? net * 0.12 : 0;
    r.querySelector(".s-vat").textContent = vat.toFixed(2);
    if (tax === "VAT") { netTotal += net; vatTotal += vat; }
    else { exemptTotal += net; }
  });

  const grandTotal = netTotal + vatTotal + exemptTotal;
  document.getElementById("salesTotal").textContent          = grandTotal.toFixed(2);
  document.getElementById("salesSummaryNet").textContent     = netTotal.toFixed(2);
  document.getElementById("salesSummaryVat").textContent     = vatTotal.toFixed(2);
  document.getElementById("salesSummaryExempt").textContent  = exemptTotal.toFixed(2);
  document.getElementById("salesSummaryGrand").textContent   = grandTotal.toFixed(2);
};

// --- RESET FORM ---
window.resetSalesForm = function(withInitialRow = true) {
  salesBody.innerHTML = "";
  document.getElementById("salesCustomer").value  = "";
  document.getElementById("salesReference").value = "";
  window.clearInlineError(document.getElementById("salesCustomer"));
  window.clearInlineError(document.getElementById("salesReference"));
  document.getElementById("saveSaleBtn").dataset.confirmed = "";
  document.getElementById("saveSaleBtn").textContent = "Save";
  if (withInitialRow) addSalesRow();
};

// --- SAVE ---
document.getElementById("saveSaleBtn").onclick = function() {
  const custInput = document.getElementById("salesCustomer");
  const refInput  = document.getElementById("salesReference");
  const customer  = custInput.value.trim();
  const reference = refInput.value.trim();

  window.clearInlineError(custInput);
  window.clearInlineError(refInput);

  if (!customer) {
    window.showInlineError(custInput, "Customer Name is required");
    return;
  }

  if (reference && window.isDuplicateReference(window.savedSales, reference, window.currentSaleIndex)) {
    window.showInlineError(refInput, "Reference already exists");
    return;
  }

  if (!this.dataset.confirmed) {
    window.showInlineError(custInput, "Click Save again to confirm changes", true);
    this.dataset.confirmed = "true";
    this.textContent = "Confirm Save";
    return;
  }

  this.dataset.confirmed = "";
  this.textContent = "Save";

  const sale = {
    customer,
    reference,
    status: "DRAFT",
    lastEditedStatus: "Draft",
    rows: [...salesBody.children].map(r => ({
      date:    r.querySelector(".s-date").value,
      desc:    r.querySelector(".s-desc").value,
      account: r.querySelector(".account-select").value,
      net:     +r.querySelector(".s-net").value,
      tax:     r.querySelector(".s-tax").value
    }))
  };

  if (window.currentSaleIndex !== null) window.savedSales[window.currentSaleIndex] = sale;
  else window.savedSales.push(sale);

  renderSalesList();
  window.updateOverview();
  showSalesList();
};

// --- POST ---
document.getElementById("postSaleBtn").onclick = function() {
  if (window.currentSaleIndex === null) return;
  const custInput = document.getElementById("salesCustomer");

  if (!this.dataset.confirmed) {
    window.showInlineError(custInput, "Click Post again to finalize", true);
    this.dataset.confirmed = "true";
    this.textContent = "Confirm Post";
    return;
  }

  this.dataset.confirmed = "";
  this.textContent = "Post";
  window.savedSales[window.currentSaleIndex].status          = "POSTED";
  window.savedSales[window.currentSaleIndex].lastEditedStatus = "Posted";
  window.updateAuditLog('sales');
  setSalesStatus("POSTED");
  lockSalesForm(true);
  toggleSalesButtons("posted");
  window.updateOverview();
};

// --- VOID ---
document.getElementById("voidSaleBtn").onclick = function() {
  if (window.currentSaleIndex === null) return;
  const custInput = document.getElementById("salesCustomer");

  if (!this.dataset.confirmed) {
    window.showInlineError(custInput, "Click Void again to cancel", true);
    this.dataset.confirmed = "true";
    this.textContent = "Confirm Void";
    return;
  }

  this.dataset.confirmed = "";
  this.textContent = "Void";
  window.savedSales[window.currentSaleIndex].status          = "VOID";
  window.savedSales[window.currentSaleIndex].lastEditedStatus = "Voided";
  window.updateAuditLog('sales');
  setSalesStatus("VOID");
  lockSalesForm(true);
  toggleSalesButtons("void");
  window.updateOverview();
};

// --- RENDER LIST ---
window.renderSalesList = function() {
  const from   = document.getElementById("salesFromDate").value;
  const to     = document.getElementById("salesToDate").value;
  const search = document.getElementById("salesSearch").value.toLowerCase();
  const tbody  = document.getElementById("salesListTableBody");
  tbody.innerHTML = "";

  window.savedSales.forEach((s, i) => {
    const date = s.rows[0]?.date || "";
    if (from && date < from) return;
    if (to   && date > to)   return;
    if (search && !s.customer.toLowerCase().includes(search) && !s.reference.toLowerCase().includes(search)) return;

    let gross = 0;
    s.rows.forEach(r => gross += r.net + (r.tax === "VAT" ? r.net * 0.12 : 0));

    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${date}</td>
      <td>${window.statusBadge(s.status)}${s.customer}</td>
      <td>${s.reference || ""}</td>
      <td>${gross.toFixed(2)}</td>`;
    tr.onclick = () => openSale(i);
    tbody.appendChild(tr);
  });
};

// --- OPEN RECORD ---
window.openSale = function(i) {
  const s = window.savedSales[i];
  window.currentSaleIndex = i;
  resetSalesForm(false);
  document.getElementById("salesCustomer").value  = s.customer;
  document.getElementById("salesReference").value = s.reference || "";
  s.rows.forEach(r => addSalesRow(r));
  setSalesStatus(s.status);
  lockSalesForm(true);
  toggleSalesButtons(s.status === "DRAFT" ? "saved" : s.status.toLowerCase());
  window.updateAuditLog('sales');
  showSalesForm();
};

// --- BUTTON EVENTS ---
document.getElementById("addNewSaleBtn").onclick  = () => { window.currentSaleIndex = null; resetSalesForm(true); setSalesStatus("DRAFT"); lockSalesForm(false); toggleSalesButtons("new"); showSalesForm(); };
document.getElementById("addSalesRowBtn").onclick = () => addSalesRow();
document.getElementById("editSaleBtn").onclick    = () => lockSalesForm(false);
document.getElementById("cancelSaleBtn").onclick  = showSalesList;
document.getElementById("filterSalesBtn").onclick = renderSalesList;
document.getElementById("salesSearch").oninput    = renderSalesList;

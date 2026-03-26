// =====================================================
// ACCOUNT DROPDOWN BUILDER
// Reads from window.COA set in config.js
// =====================================================
window.createAccountDropdown = function(type, selected = "") {
  const select = document.createElement("select");
  select.className = "account-select";
  select.innerHTML = `<option value="">-- Select Account --</option>`;

  if (window.COA && window.COA[type]) {
    Object.keys(window.COA[type]).forEach(group => {
      const optgroup = document.createElement("optgroup");
      optgroup.label = group;
      window.COA[type][group].forEach(acc => {
        const opt = document.createElement("option");
        opt.value = acc;
        opt.textContent = acc;
        if (acc === selected) opt.selected = true;
        optgroup.appendChild(opt);
      });
      select.appendChild(optgroup);
    });
  }

  return select;
};

// =====================================================
// AUDIT LOG UPDATER
// =====================================================
window.updateAuditLog = function(type) {
  const now = new Date();
  const timeString = now.toLocaleDateString() + ' ' + now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });

  const timeId   = type === 'sales' ? 'salesLastEdited'    : 'purchaseLastEdited';
  const statusId = type === 'sales' ? 'salesRecordStatus'  : 'purchaseRecordStatus';

  const timeEl   = document.getElementById(timeId);
  const statusEl = document.getElementById(statusId);

  if (timeEl && statusEl) {
    const list  = type === 'sales' ? window.savedSales : window.savedPurchases;
    const index = type === 'sales' ? window.currentSaleIndex : window.currentPurchaseIndex;

    timeEl.innerText = `Last edited: ${timeString}`;

    let statusText = "New Draft";
    if (index !== null && list[index] && list[index].lastEditedStatus) {
      statusText = list[index].lastEditedStatus;
    }
    statusEl.innerText = statusText;
  }
};

// =====================================================
// INLINE VALIDATION HELPERS
// =====================================================
window.showInlineError = function(input, message, isWarning = false) {
  window.clearInlineError(input);
  input.classList.add(isWarning ? "input-warning" : "input-error");
  const msg = document.createElement("div");
  msg.className = isWarning ? "validation-warning" : "validation-error";
  msg.textContent = message;
  input.parentNode.appendChild(msg);
};

window.clearInlineError = function(input) {
  input.classList.remove("input-error", "input-warning");
  const err = input.parentNode.querySelector(".validation-error, .validation-warning");
  if (err) err.remove();
};

// =====================================================
// DUPLICATE REFERENCE CHECK
// =====================================================
window.isDuplicateReference = function(list, ref, currentIndex) {
  if (!ref) return false;
  return list.some((item, i) =>
    i !== currentIndex &&
    item.reference &&
    item.reference.toLowerCase() === ref.toLowerCase()
  );
};

// =====================================================
// STATUS BADGE HELPER
// =====================================================
window.statusBadge = function(status) {
  if (status === "VOID")   return `<span style="font-size:10px;color:#b91c1c;font-weight:700;">[VOID]</span> `;
  if (status === "POSTED") return `<span style="font-size:10px;color:#15803d;font-weight:700;">[POSTED]</span> `;
  return "";
};

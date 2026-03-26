// =====================================================
// utils.js — Shared Helpers
// =====================================================

// -------------------------------------------------------
// DATE FORMATTER
// Converts "2025-03-01" → "Mar 1, 2025"
// -------------------------------------------------------
window.formatDate = function (dateStr) {
  if (!dateStr) return "—";
  // Parse as local date to avoid timezone-shift issues
  const [y, m, d] = dateStr.split("-").map(Number);
  if (!y || !m || !d) return dateStr;
  return new Date(y, m - 1, d).toLocaleDateString(undefined, {
    year: "numeric", month: "short", day: "numeric"
  });
};

// -------------------------------------------------------
// ACCOUNT DROPDOWN BUILDER
// Reads from window.COA (config.js / db.js)
// -------------------------------------------------------
window.createAccountDropdown = function (type, selected = "") {
  const select = document.createElement("select");
  select.className = "account-select";
  select.innerHTML = `<option value="">— Select Account —</option>`;

  if (window.COA?.[type]) {
    Object.keys(window.COA[type]).forEach(group => {
      const og = document.createElement("optgroup");
      og.label = group;
      window.COA[type][group].forEach(acc => {
        const opt = document.createElement("option");
        opt.value = acc;
        opt.textContent = acc;
        if (acc === selected) opt.selected = true;
        og.appendChild(opt);
      });
      select.appendChild(og);
    });
  }

  return select;
};

// -------------------------------------------------------
// AUDIT LOG UPDATER
// -------------------------------------------------------
window.updateAuditLog = function (type) {
  const now = new Date();
  const timeStr = now.toLocaleDateString() + " " +
                  now.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });

  const timeEl   = document.getElementById(type === "sales" ? "salesLastEdited"   : "purchaseLastEdited");
  const statusEl = document.getElementById(type === "sales" ? "salesRecordStatus" : "purchaseRecordStatus");

  if (!timeEl || !statusEl) return;

  timeEl.innerText = `Last edited: ${timeStr}`;

  const list  = type === "sales" ? window.savedSales : window.savedPurchases;
  const index = type === "sales" ? window.currentSaleIndex : window.currentPurchaseIndex;

  let statusText = "New Draft";
  if (index !== null && list[index]?.lastEditedStatus) {
    statusText = list[index].lastEditedStatus;
  }
  statusEl.innerText = statusText;
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

// -------------------------------------------------------
// DUPLICATE REFERENCE CHECK
// -------------------------------------------------------
window.isDuplicateReference = function (list, ref, currentIndex) {
  if (!ref) return false;
  const lower = ref.toLowerCase();
  return list.some((item, i) =>
    i !== currentIndex &&
    item.reference?.toLowerCase() === lower
  );
};

// -------------------------------------------------------
// STATUS BADGE (inline in list rows)
// -------------------------------------------------------
window.statusBadge = function (status) {
  if (status === "VOID")   return `<span style="font-size:10px;color:#b91c1c;font-weight:700;margin-right:3px;">[VOID]</span>`;
  if (status === "POSTED") return `<span style="font-size:10px;color:#15803d;font-weight:700;margin-right:3px;">[POSTED]</span>`;
  return "";
};

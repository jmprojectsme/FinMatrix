// =====================================================
// coa.js — Chart of Accounts Manager
// =====================================================

// Render both panels (called on page load and after changes)
window.renderCOA = function () {
  renderCOAPanel("sales",     "coaSalesGroups");
  renderCOAPanel("purchases", "coaPurchasesGroups");
};

function renderCOAPanel(type, containerId) {
  const container = document.getElementById(containerId);
  container.innerHTML = "";

  const groups = window.COA[type];

  Object.keys(groups).forEach(group => {
    const div      = document.createElement("div");
    div.className  = "coa-group";
    const accounts = groups[group];

    const accountsHTML = accounts.length
      ? accounts.map((acc, ai) => `
          <div class="coa-account-row">
            <span>${acc}</span>
            <button class="btn-delete-acc"
              data-type="${type}" data-group="${group}" data-index="${ai}"
              title="Remove account">Remove</button>
          </div>`).join("")
      : `<div class="coa-empty">No accounts yet. Add one below.</div>`;

    div.innerHTML = `
      <div class="coa-group-header">
        <span class="coa-group-name">${group}</span>
        <button class="btn-delete-acc"
          data-type="${type}" data-group="${group}" data-delete-group="true"
          title="Delete group">Delete Group</button>
      </div>
      ${accountsHTML}
      <div class="coa-add-row">
        <input type="text" class="new-acc-input"
          data-type="${type}" data-group="${group}"
          placeholder="New account name">
        <button class="btn-add-acc"
          data-type="${type}" data-group="${group}">Add</button>
      </div>`;

    container.appendChild(div);
  });

  // Delete account or group
  container.querySelectorAll(".btn-delete-acc").forEach(btn => {
    btn.onclick = () => {
      const t = btn.dataset.type;
      const g = btn.dataset.group;

      if (btn.dataset.deleteGroup) {
        if (!confirm(`Delete group "${g}" and all its accounts?`)) return;
        delete window.COA[t][g];
      } else {
        window.COA[t][g].splice(+btn.dataset.index, 1);
      }

      window.DB.saveCOA();
      window.renderCOA();
    };
  });

  // Add account
  container.querySelectorAll(".btn-add-acc").forEach(btn => {
    btn.onclick = () => addAccount(container, btn.dataset.type, btn.dataset.group);
  });

  // Enter key on add-account inputs
  container.querySelectorAll(".new-acc-input").forEach(input => {
    input.addEventListener("keydown", e => {
      if (e.key === "Enter") addAccount(container, input.dataset.type, input.dataset.group);
    });
  });
}

function addAccount(container, type, group) {
  const input = container.querySelector(`.new-acc-input[data-type="${type}"][data-group="${group}"]`);
  const val   = input.value.trim();
  if (!val) return;
  if (window.COA[type][group].includes(val)) { alert("Account already exists in this group."); return; }
  window.COA[type][group].push(val);
  input.value = "";
  window.DB.saveCOA();
  window.renderCOA();
}

// -------------------------------------------------------
// ADD GROUP BUTTONS
// -------------------------------------------------------
document.getElementById("addSalesGroupBtn").onclick = () => {
  const input = document.getElementById("newSalesGroupName");
  const name  = input.value.trim();
  if (!name) return;
  if (window.COA.sales[name]) { alert("Group already exists."); return; }
  window.COA.sales[name] = [];
  input.value = "";
  window.DB.saveCOA();
  window.renderCOA();
};

document.getElementById("addPurchasesGroupBtn").onclick = () => {
  const input = document.getElementById("newPurchasesGroupName");
  const name  = input.value.trim();
  if (!name) return;
  if (window.COA.purchases[name]) { alert("Group already exists."); return; }
  window.COA.purchases[name] = [];
  input.value = "";
  window.DB.saveCOA();
  window.renderCOA();
};

// Enter key on new-group inputs
document.getElementById("newSalesGroupName").addEventListener("keydown", e => {
  if (e.key === "Enter") document.getElementById("addSalesGroupBtn").click();
});
document.getElementById("newPurchasesGroupName").addEventListener("keydown", e => {
  if (e.key === "Enter") document.getElementById("addPurchasesGroupBtn").click();
});

// -------------------------------------------------------
// TAB SWITCHING
// -------------------------------------------------------
document.querySelectorAll(".coa-tab").forEach(tab => {
  tab.onclick = () => {
    document.querySelectorAll(".coa-tab").forEach(t   => t.classList.remove("active"));
    document.querySelectorAll(".coa-panel").forEach(p => p.classList.remove("active"));
    tab.classList.add("active");
    document.getElementById(`coa-panel-${tab.dataset.coaTab}`).classList.add("active");
  };
});

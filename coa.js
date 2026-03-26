// =====================================================
// coa.js — Chart of Accounts Manager
// 5 categories: sales, purchases, assets, liabilities, equity
// Supports: add group, add account, rename account, delete
// =====================================================

const COA_TABS = ["sales", "purchases", "assets", "liabilities", "equity"];

window.renderCOA = function () {
  COA_TABS.forEach(type => {
    const containerId = `coa${type.charAt(0).toUpperCase() + type.slice(1)}Groups`;
    renderCOAPanel(type, containerId);
  });
};

function renderCOAPanel(type, containerId) {
  const container = document.getElementById(containerId);
  if (!container) return;
  container.innerHTML = "";

  const groups = window.COA[type] || {};

  Object.keys(groups).forEach(group => {
    const div      = document.createElement("div");
    div.className  = "coa-group";
    const accounts = groups[group];

    const accountsHTML = accounts.length
      ? accounts.map((acc, ai) => `
          <div class="coa-account-row" data-type="${type}" data-group="${group}" data-index="${ai}">
            <span class="coa-acc-name">${acc}</span>
            <div class="coa-acc-actions">
              <button class="btn-rename-acc" data-type="${type}" data-group="${group}" data-index="${ai}" title="Rename">✎</button>
              <button class="btn-delete-acc" data-type="${type}" data-group="${group}" data-index="${ai}" title="Delete">×</button>
            </div>
          </div>`).join("")
      : `<div class="coa-empty">No accounts yet. Add one below.</div>`;

    div.innerHTML = `
      <div class="coa-group-header">
        <span class="coa-group-name" id="grp-label-${type}-${group.replace(/\s/g,"_")}">${group}</span>
        <div class="coa-group-actions">
          <button class="btn-rename-group" data-type="${type}" data-group="${group}" title="Rename group">✎ Rename</button>
          <button class="btn-delete-group" data-type="${type}" data-group="${group}" title="Delete group">Delete</button>
        </div>
      </div>
      <div class="coa-accounts-list">${accountsHTML}</div>
      <div class="coa-add-row">
        <input type="text" class="new-acc-input"
          data-type="${type}" data-group="${group}"
          placeholder="New account name (e.g. Petty Cash)">
        <button class="btn-add-acc" data-type="${type}" data-group="${group}">Add</button>
      </div>`;

    container.appendChild(div);
  });

  // ---- EVENT BINDINGS ----

  // Rename account
  container.querySelectorAll(".btn-rename-acc").forEach(btn => {
    btn.onclick = () => {
      const { type: t, group: g, index } = btn.dataset;
      const current = window.COA[t][g][+index];
      const newName = prompt(`Rename account "${current}" to:`, current);
      if (!newName || newName.trim() === current) return;
      const trimmed = newName.trim();
      if (window.COA[t][g].includes(trimmed)) { alert("Account already exists."); return; }
      window.COA[t][g][+index] = trimmed;
      window.DB.saveCOA();
      window.renderCOA();
    };
  });

  // Delete account
  container.querySelectorAll(".btn-delete-acc").forEach(btn => {
    btn.onclick = () => {
      const { type: t, group: g, index } = btn.dataset;
      const name = window.COA[t][g][+index];
      if (!confirm(`Remove account "${name}"?`)) return;
      window.COA[t][g].splice(+index, 1);
      window.DB.saveCOA();
      window.renderCOA();
    };
  });

  // Rename group
  container.querySelectorAll(".btn-rename-group").forEach(btn => {
    btn.onclick = () => {
      const { type: t, group: g } = btn.dataset;
      const newName = prompt(`Rename group "${g}" to:`, g);
      if (!newName || newName.trim() === g) return;
      const trimmed = newName.trim();
      if (window.COA[t][trimmed]) { alert("Group already exists."); return; }
      // Rename key preserving order
      const newGroups = {};
      Object.keys(window.COA[t]).forEach(key => {
        newGroups[key === g ? trimmed : key] = window.COA[t][key];
      });
      window.COA[t] = newGroups;
      window.DB.saveCOA();
      window.renderCOA();
    };
  });

  // Delete group
  container.querySelectorAll(".btn-delete-group").forEach(btn => {
    btn.onclick = () => {
      const { type: t, group: g } = btn.dataset;
      if (!confirm(`Delete group "${g}" and all its accounts?`)) return;
      delete window.COA[t][g];
      window.DB.saveCOA();
      window.renderCOA();
    };
  });

  // Add account (button click)
  container.querySelectorAll(".btn-add-acc").forEach(btn => {
    btn.onclick = () => addAccount(container, btn.dataset.type, btn.dataset.group);
  });

  // Add account (Enter key)
  container.querySelectorAll(".new-acc-input").forEach(input => {
    input.addEventListener("keydown", e => {
      if (e.key === "Enter") addAccount(container, input.dataset.type, input.dataset.group);
    });
  });
}

function addAccount(container, type, group) {
  const input = container.querySelector(`.new-acc-input[data-type="${type}"][data-group="${group}"]`);
  if (!input) return;
  const val = input.value.trim();
  if (!val) return;
  if (window.COA[type][group].includes(val)) { alert("Account already exists in this group."); return; }
  window.COA[type][group].push(val);
  input.value = "";
  window.DB.saveCOA();
  window.renderCOA();
}

// -------------------------------------------------------
// ADD GROUP BUTTONS (one per category)
// -------------------------------------------------------
COA_TABS.forEach(type => {
  const capType = type.charAt(0).toUpperCase() + type.slice(1);
  const btn     = document.getElementById(`add${capType}GroupBtn`);
  const input   = document.getElementById(`new${capType}GroupName`);
  if (!btn || !input) return;

  const doAdd = () => {
    const name = input.value.trim();
    if (!name) return;
    if (!window.COA[type]) window.COA[type] = {};
    if (window.COA[type][name]) { alert("Group already exists."); return; }
    window.COA[type][name] = [];
    input.value = "";
    window.DB.saveCOA();
    window.renderCOA();
  };

  btn.onclick = doAdd;
  input.addEventListener("keydown", e => { if (e.key === "Enter") doAdd(); });
});

// -------------------------------------------------------
// TAB SWITCHING
// -------------------------------------------------------
document.querySelectorAll(".coa-tab").forEach(tab => {
  tab.onclick = () => {
    document.querySelectorAll(".coa-tab").forEach(t   => t.classList.remove("active"));
    document.querySelectorAll(".coa-panel").forEach(p => p.classList.remove("active"));
    tab.classList.add("active");
    document.getElementById(`coa-panel-${tab.dataset.coaTab}`)?.classList.add("active");
  };
});

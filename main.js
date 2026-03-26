// =====================================================
// MAIN — Routing, Overview, Settings Dropdown
// =====================================================
document.addEventListener("DOMContentLoaded", () => {

  // --- PAGE ROUTING ---
  function showPage(id) {
    document.querySelectorAll(".page").forEach(p => p.classList.add("hidden"));

    const target = document.getElementById(id);
    if (target) target.classList.remove("hidden");

    // Highlight active nav link
    document.querySelectorAll(".nav-link").forEach(a => {
      a.classList.toggle("active", a.getAttribute("href") === "#" + id);
    });

    // Page-specific init
    if (id === "revenue") {
      window.showSalesList();
      window.renderSalesList();
    }
    if (id === "bills") {
      window.showPurchaseList();
      window.renderPurchaseList();
    }
    if (id === "coa") {
      window.renderCOA();
    }
  }

  // Nav link clicks
  document.querySelectorAll(".nav-link").forEach(a => {
    a.addEventListener("click", e => {
      e.preventDefault();
      showPage(a.getAttribute("href").substring(1));
      document.getElementById("settingsDropdown")?.classList.add("hidden");
    });
  });

  // --- SETTINGS DROPDOWN ---
  const settingsBtn      = document.getElementById("settingsBtn");
  const settingsDropdown = document.getElementById("settingsDropdown");

  if (settingsBtn && settingsDropdown) {
    settingsBtn.onclick = (e) => {
      e.stopPropagation();
      settingsDropdown.classList.toggle("hidden");
    };
    document.addEventListener("click", () => {
      settingsDropdown.classList.add("hidden");
    });
  }

  // --- OVERVIEW TOTALS ---
  window.computeTotal = function(list) {
    let total = 0;
    list.forEach(t => {
      if (t.status === "VOID") return;
      t.rows.forEach(r => {
        total += r.net + (r.tax === "VAT" ? r.net * 0.12 : 0);
      });
    });
    return total;
  };

  window.updateOverview = function() {
    const s = document.getElementById("homeSalesTotal");
    const p = document.getElementById("homePurchasesTotal");
    if (s) s.textContent = window.computeTotal(window.savedSales).toFixed(2);
    if (p) p.textContent = window.computeTotal(window.savedPurchases).toFixed(2);
  };

  // --- INITIAL PAGE ---
  showPage("home");
});

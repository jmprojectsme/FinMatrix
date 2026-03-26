// =====================================================
// main.js — App Init, Routing, Overview
// =====================================================

document.addEventListener("DOMContentLoaded", () => {

  // Init IndexedDB first, then boot the app
  window.DB.init()
    .then(initApp)
    .catch(err => {
      console.error("FinMatrix: IndexedDB failed to open.", err);
      initApp(); // fall back to in-memory mode
    });

  // -------------------------------------------------------
  function initApp() {

    // --- PAGE ROUTING ---
    function showPage(id) {
      document.querySelectorAll(".page").forEach(p => p.classList.add("hidden"));
      document.getElementById(id)?.classList.remove("hidden");

      document.querySelectorAll(".nav-link").forEach(a =>
        a.classList.toggle("active", a.getAttribute("href") === "#" + id)
      );

      if (id === "revenue")       { window.showSalesList();    window.renderSalesList();    }
      if (id === "bills")         { window.showPurchaseList(); window.renderPurchaseList(); }
      if (id === "coa")           { window.renderCOA(); }
      if (id === "home")          { renderRecentActivity(); }
    }

    document.querySelectorAll(".nav-link").forEach(a => {
      a.addEventListener("click", e => {
        e.preventDefault();
        document.getElementById("settingsDropdown")?.classList.add("hidden");
        showPage(a.getAttribute("href").substring(1));
      });
    });

    // --- SETTINGS DROPDOWN ---
    const settingsBtn      = document.getElementById("settingsBtn");
    const settingsDropdown = document.getElementById("settingsDropdown");

    if (settingsBtn && settingsDropdown) {
      settingsBtn.onclick = e => {
        e.stopPropagation();
        settingsDropdown.classList.toggle("hidden");
      };
      document.addEventListener("click", () => settingsDropdown.classList.add("hidden"));
    }

    // --- OVERVIEW TOTALS ---
    window.computeTotal = function (list) {
      return list.reduce((sum, t) => {
        if (t.status === "VOID") return sum;
        return sum + t.rows.reduce((s, r) => s + r.net + (r.tax === "VAT" ? r.net * 0.12 : 0), 0);
      }, 0);
    };

    window.updateOverview = function () {
      const s = document.getElementById("homeSalesTotal");
      const p = document.getElementById("homePurchasesTotal");
      if (s) s.textContent = window.computeTotal(window.savedSales).toFixed(2);
      if (p) p.textContent = window.computeTotal(window.savedPurchases).toFixed(2);
    };

    // --- RECENT ACTIVITY ON HOME ---
    function renderRecentActivity() {
      window.updateOverview();

      // Recent Sales — last 5 non-void, newest first
      const recentSales = [...window.savedSales]
        .map((s, i) => ({ ...s, _i: i }))
        .filter(s => s.status !== "VOID")
        .slice(-5)
        .reverse();

      const salesEl = document.getElementById("homeRecentSales");
      if (recentSales.length === 0) {
        salesEl.innerHTML = `<div class="recent-empty">No sales yet.</div>`;
      } else {
        salesEl.innerHTML = recentSales.map(s => {
          const gross = s.rows.reduce((sum, r) => sum + r.net + (r.tax === "VAT" ? r.net * 0.12 : 0), 0);
          const date  = s.rows[0]?.date || "";
          return `
            <div class="recent-item" data-type="sale" data-index="${s._i}">
              <div>
                <div class="recent-item-name">${s.customer}</div>
                <div class="recent-item-date">${window.formatDate(date)}</div>
              </div>
              <div class="recent-item-amount">${gross.toFixed(2)}</div>
            </div>`;
        }).join("");
      }

      // Recent Purchases — last 5 non-void, newest first
      const recentPurchases = [...window.savedPurchases]
        .map((p, i) => ({ ...p, _i: i }))
        .filter(p => p.status !== "VOID")
        .slice(-5)
        .reverse();

      const purchEl = document.getElementById("homeRecentPurchases");
      if (recentPurchases.length === 0) {
        purchEl.innerHTML = `<div class="recent-empty">No purchases yet.</div>`;
      } else {
        purchEl.innerHTML = recentPurchases.map(p => {
          const gross = p.rows.reduce((sum, r) => sum + r.net + (r.tax === "VAT" ? r.net * 0.12 : 0), 0);
          const date  = p.rows[0]?.date || "";
          return `
            <div class="recent-item" data-type="purchase" data-index="${p._i}">
              <div>
                <div class="recent-item-name">${p.supplier}</div>
                <div class="recent-item-date">${window.formatDate(date)}</div>
              </div>
              <div class="recent-item-amount">${gross.toFixed(2)}</div>
            </div>`;
        }).join("");
      }

      // Make recent items clickable — navigate to the record
      document.querySelectorAll(".recent-item").forEach(el => {
        el.onclick = () => {
          const type  = el.dataset.type;
          const index = +el.dataset.index;
          if (type === "sale") {
            showPage("revenue");
            window.openSale(index);
          } else {
            showPage("bills");
            window.openPurchase(index);
          }
        };
      });
    }

    // --- BOOT ---
    window.updateOverview();
    showPage("home");

  } // end initApp

}); // end DOMContentLoaded

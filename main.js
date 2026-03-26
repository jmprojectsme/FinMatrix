// =====================================================
// main.js — App Init, Routing, Overview, Chart
// =====================================================

document.addEventListener("DOMContentLoaded", () => {

  window.DB.init()
    .then(initApp)
    .catch(err => {
      console.error("FinMatrix: IndexedDB init failed.", err);
      initApp();
    });

  // =====================================================
  function initApp() {

    let overviewChart = null;

    // -------------------------------------------------------
    // OVERVIEW TOTALS — POSTED ONLY
    // -------------------------------------------------------
    window.computeTotal = function (list) {
      return list.reduce((sum, t) => {
        if (t.status !== "POSTED") return sum;
        return sum + window.calcGross(t.rows);
      }, 0);
    };

    window.updateOverview = function () {
      const salesTotal = window.computeTotal(window.savedSales);
      const purchTotal = window.computeTotal(window.savedPurchases);
      const net        = salesTotal - purchTotal;

      const sEl = document.getElementById("homeSalesTotal");
      const pEl = document.getElementById("homePurchasesTotal");
      const nEl = document.getElementById("homeNetIncome");

      if (sEl) sEl.textContent = salesTotal.toFixed(2);
      if (pEl) pEl.textContent = purchTotal.toFixed(2);
      if (nEl) {
        nEl.textContent = net.toFixed(2);
        nEl.style.color = net >= 0 ? "#15803d" : "#b91c1c";
      }
    };

    // -------------------------------------------------------
    // CHART — monthly Sales vs Purchases (posted only, last 6 months)
    // -------------------------------------------------------
    function buildMonthlyData() {
      const months = [];
      const now    = new Date();
      for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        months.push({
          label: d.toLocaleDateString(undefined, { month: "short", year: "2-digit" }),
          key:   `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`,
          sales: 0,
          purch: 0,
        });
      }

      window.savedSales.forEach(s => {
        if (s.status !== "POSTED") return;
        const d = s.rows[0]?.date || "";
        const m = months.find(mo => d.startsWith(mo.key));
        if (m) m.sales += window.calcGross(s.rows);
      });

      window.savedPurchases.forEach(p => {
        if (p.status !== "POSTED") return;
        const d = p.rows[0]?.date || "";
        const m = months.find(mo => d.startsWith(mo.key));
        if (m) m.purch += window.calcGross(p.rows);
      });

      return months;
    }

    function renderChart() {
      const canvas = document.getElementById("overviewChart");
      if (!canvas) return;

      const data = buildMonthlyData();

      if (overviewChart) overviewChart.destroy();

      overviewChart = new Chart(canvas, {
        type: "bar",
        data: {
          labels: data.map(m => m.label),
          datasets: [
            {
              label: "Sales",
              data: data.map(m => m.sales),
              backgroundColor: "rgba(30,64,175,0.75)",
              borderRadius: 5,
              borderSkipped: false,
            },
            {
              label: "Purchases",
              data: data.map(m => m.purch),
              backgroundColor: "rgba(220,38,38,0.6)",
              borderRadius: 5,
              borderSkipped: false,
            }
          ]
        },
        options: {
          responsive: true,
          maintainAspectRatio: false,
          plugins: {
            legend: {
              position: "top",
              labels: { font: { family: "DM Sans", size: 12 }, color: "#475569" }
            },
            tooltip: {
              callbacks: {
                label: ctx => ` ${ctx.dataset.label}: ${ctx.parsed.y.toFixed(2)}`
              }
            }
          },
          scales: {
            x: { grid: { display: false }, ticks: { color: "#64748b", font: { family: "DM Sans" } } },
            y: {
              beginAtZero: true,
              grid: { color: "#f1f5f9" },
              ticks: {
                color: "#64748b",
                font: { family: "DM Sans" },
                callback: v => v.toFixed(0)
              }
            }
          }
        }
      });
    }

    // -------------------------------------------------------
    // RECENT ACTIVITY (posted only, last 5 each)
    // -------------------------------------------------------
    function renderRecentActivity() {
      window.updateOverview();
      renderChart();

      const recentSales = [...window.savedSales]
        .map((s, i) => ({ ...s, _i: i }))
        .filter(s => s.status === "POSTED")
        .slice(-5).reverse();

      const salesEl = document.getElementById("homeRecentSales");
      salesEl.innerHTML = recentSales.length === 0
        ? `<div class="recent-empty">No posted sales yet.</div>`
        : recentSales.map(s => {
            const gross = window.calcGross(s.rows);
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

      const recentPurchases = [...window.savedPurchases]
        .map((p, i) => ({ ...p, _i: i }))
        .filter(p => p.status === "POSTED")
        .slice(-5).reverse();

      const purchEl = document.getElementById("homeRecentPurchases");
      purchEl.innerHTML = recentPurchases.length === 0
        ? `<div class="recent-empty">No posted purchases yet.</div>`
        : recentPurchases.map(p => {
            const gross = window.calcGross(p.rows);
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

      // Clickable recent items → open the record
      document.querySelectorAll(".recent-item").forEach(el => {
        el.onclick = () => {
          const type  = el.dataset.type;
          const index = +el.dataset.index;
          if (type === "sale")     { showPage("revenue"); window.openSale(index);     }
          else                     { showPage("bills");   window.openPurchase(index); }
        };
      });
    }

    // -------------------------------------------------------
    // PAGE ROUTING
    // -------------------------------------------------------
    function showPage(id) {
      document.querySelectorAll(".page").forEach(p => p.classList.add("hidden"));
      document.getElementById(id)?.classList.remove("hidden");
      document.querySelectorAll(".nav-link").forEach(a =>
        a.classList.toggle("active", a.getAttribute("href") === "#" + id)
      );
      if (id === "home")          renderRecentActivity();
      if (id === "revenue")       { window.showSalesList();    window.renderSalesList();    }
      if (id === "bills")         { window.showPurchaseList(); window.renderPurchaseList(); }
      if (id === "coa")           window.renderCOA();
    }

    // Expose showPage globally so journal.js / other modules can use it
    window.showPage = showPage;

    document.querySelectorAll(".nav-link").forEach(a => {
      a.addEventListener("click", e => {
        e.preventDefault();
        document.getElementById("settingsDropdown")?.classList.add("hidden");
        showPage(a.getAttribute("href").substring(1));
      });
    });

    // -------------------------------------------------------
    // SETTINGS DROPDOWN
    // -------------------------------------------------------
    const settingsBtn      = document.getElementById("settingsBtn");
    const settingsDropdown = document.getElementById("settingsDropdown");
    if (settingsBtn && settingsDropdown) {
      settingsBtn.onclick = e => {
        e.stopPropagation();
        settingsDropdown.classList.toggle("hidden");
      };
      document.addEventListener("click", () => settingsDropdown.classList.add("hidden"));
    }

    // -------------------------------------------------------
    // BOOT
    // -------------------------------------------------------
    window.updateOverview();
    showPage("home");

  } // end initApp
});

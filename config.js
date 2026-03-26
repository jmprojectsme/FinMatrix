// =====================================================
// config.js — Global State & COA Defaults
// =====================================================
// savedSales / savedPurchases are populated from
// IndexedDB on load (see db.js + main.js).
// COA below is the default — overwritten by DB if the
// user has previously saved changes.
// =====================================================

window.savedSales           = [];
window.savedPurchases       = [];
window.currentSaleIndex     = null;
window.currentPurchaseIndex = null;

window.COA = {
  sales: {
    Income: ["Sales", "Service Income", "Professional Fees", "Other Income"]
  },
  purchases: {
    Expenses: ["Meals", "Transportation", "Gas & Oil", "Rent", "Utilities", "Office Supplies"]
  }
};

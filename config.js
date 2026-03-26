// =====================================================
// GLOBAL STATE
// =====================================================
window.savedSales = [];
window.savedPurchases = [];
window.currentSaleIndex = null;
window.currentPurchaseIndex = null;

// =====================================================
// CHART OF ACCOUNTS
// =====================================================
window.COA = {
  sales: {
    Income: ["Sales", "Service Income", "Professional Fees", "Other Income"]
  },
  purchases: {
    Expenses: ["Meals", "Transportation", "Gas & Oil", "Rent", "Utilities", "Office Supplies"]
  }
};

// =====================================================
// config.js — Global State & Default COA
// =====================================================

window.savedSales           = [];
window.savedPurchases       = [];
window.currentSaleIndex     = null;
window.currentPurchaseIndex = null;

// Standard double-entry Chart of Accounts
// Each category maps group → [account names]
window.COA = {
  sales: {
    "Revenue": [
      "Sales Revenue",
      "Service Revenue",
      "Professional Fees",
      "Interest Income",
      "Other Income"
    ]
  },
  purchases: {
    "Cost of Sales": [
      "Cost of Goods Sold",
      "Freight-in"
    ],
    "Operating Expenses": [
      "Salaries & Wages",
      "Rent Expense",
      "Utilities Expense",
      "Office Supplies",
      "Depreciation Expense",
      "Repairs & Maintenance",
      "Advertising Expense",
      "Insurance Expense"
    ],
    "Other Expenses": [
      "Meals & Entertainment",
      "Transportation",
      "Gas & Oil",
      "Miscellaneous Expense"
    ]
  },
  assets: {
    "Current Assets": [
      "Cash on Hand",
      "Cash in Bank",
      "Accounts Receivable",
      "Allowance for Doubtful Accounts",
      "Merchandise Inventory",
      "Prepaid Expenses",
      "Input VAT"
    ],
    "Non-Current Assets": [
      "Property, Plant & Equipment",
      "Accumulated Depreciation",
      "Intangible Assets",
      "Long-term Investments"
    ]
  },
  liabilities: {
    "Current Liabilities": [
      "Accounts Payable",
      "Accrued Expenses",
      "Output VAT Payable",
      "Income Tax Payable",
      "Notes Payable - Current",
      "Unearned Revenue"
    ],
    "Non-Current Liabilities": [
      "Notes Payable - Long Term",
      "Mortgage Payable",
      "Deferred Tax Liability"
    ]
  },
  equity: {
    "Owner's Equity": [
      "Owner's Capital",
      "Owner's Drawing",
      "Retained Earnings",
      "Current Year Earnings"
    ]
  }
};

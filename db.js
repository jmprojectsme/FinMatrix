// =====================================================
// db.js — IndexedDB Persistence Layer
// =====================================================
// Stores: sales, purchases, settings (COA)
// All public methods are on window.DB and return Promises.
// Call window.DB.init() before anything else (done in main.js).
// =====================================================

const DB_NAME    = "FinMatrixDB";
const DB_VERSION = 1;

let _db = null;

// -------------------------------------------------------
// OPEN DATABASE
// -------------------------------------------------------
function openDB() {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);

    req.onupgradeneeded = (e) => {
      const db = e.target.result;
      if (!db.objectStoreNames.contains("sales"))
        db.createObjectStore("sales",     { keyPath: "id", autoIncrement: true });
      if (!db.objectStoreNames.contains("purchases"))
        db.createObjectStore("purchases", { keyPath: "id", autoIncrement: true });
      if (!db.objectStoreNames.contains("settings"))
        db.createObjectStore("settings",  { keyPath: "key" });
    };

    req.onsuccess = (e) => { _db = e.target.result; resolve(_db); };
    req.onerror   = (e) => reject(e.target.error);
  });
}

// -------------------------------------------------------
// GENERIC HELPERS
// -------------------------------------------------------
function getAll(storeName) {
  return new Promise((resolve, reject) => {
    const req = _db.transaction(storeName, "readonly")
                   .objectStore(storeName).getAll();
    req.onsuccess = () => resolve(req.result);
    req.onerror   = (e) => reject(e.target.error);
  });
}

function putRecord(storeName, record) {
  return new Promise((resolve, reject) => {
    const req = _db.transaction(storeName, "readwrite")
                   .objectStore(storeName).put(record);
    req.onsuccess = () => resolve(req.result); // returns assigned key
    req.onerror   = (e) => reject(e.target.error);
  });
}

// -------------------------------------------------------
// PUBLIC API
// -------------------------------------------------------
window.DB = {

  // Open DB and load all data into memory arrays
  init: async function () {
    await openDB();
    await this.loadAll();
  },

  // Populate window.savedSales, window.savedPurchases, window.COA
  loadAll: async function () {
    // Sales — sort by insertion order
    const sales = await getAll("sales");
    sales.sort((a, b) => a.id - b.id);
    window.savedSales = sales;

    // Purchases — sort by insertion order
    const purchases = await getAll("purchases");
    purchases.sort((a, b) => a.id - b.id);
    window.savedPurchases = purchases;

    // COA — stored as a single settings record
    await new Promise((resolve) => {
      const req = _db.transaction("settings", "readonly")
                     .objectStore("settings").get("coa");
      req.onsuccess = () => {
        if (req.result && req.result.value) window.COA = req.result.value;
        resolve();
      };
      req.onerror = () => resolve(); // keep default COA on error
    });
  },

  // -------------------------------------------------------
  // SALES
  // -------------------------------------------------------

  // Insert or update a sale.
  // index = window.currentSaleIndex (null for new records).
  // Mutates window.savedSales in place and returns the DB id.
  saveSale: async function (sale, index) {
    const record = { ...sale };

    // Preserve existing id on update so IndexedDB replaces the same record
    if (index !== null && window.savedSales[index]?.id) {
      record.id = window.savedSales[index].id;
    }

    const id = await putRecord("sales", record);
    record.id = id;

    if (index !== null) window.savedSales[index] = record;
    else                window.savedSales.push(record);

    return id;
  },

  // Persist an already-mutated record (e.g. after status change)
  updateSale: async function (index) {
    const sale = window.savedSales[index];
    if (sale?.id) await putRecord("sales", sale);
  },

  // -------------------------------------------------------
  // PURCHASES
  // -------------------------------------------------------
  savePurchase: async function (purchase, index) {
    const record = { ...purchase };

    if (index !== null && window.savedPurchases[index]?.id) {
      record.id = window.savedPurchases[index].id;
    }

    const id = await putRecord("purchases", record);
    record.id = id;

    if (index !== null) window.savedPurchases[index] = record;
    else                window.savedPurchases.push(record);

    return id;
  },

  updatePurchase: async function (index) {
    const purchase = window.savedPurchases[index];
    if (purchase?.id) await putRecord("purchases", purchase);
  },

  // -------------------------------------------------------
  // COA
  // -------------------------------------------------------
  saveCOA: async function () {
    await putRecord("settings", { key: "coa", value: window.COA });
  },
};

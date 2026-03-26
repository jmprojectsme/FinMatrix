// =====================================================
// db.js — IndexedDB Persistence Layer
// =====================================================
// Stores: sales, purchases, settings (COA)
// =====================================================

const DB_NAME    = "FinMatrixDB";
const DB_VERSION = 2; // bumped for journal entries store

let _db = null;

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
    req.onsuccess = () => resolve(req.result);
    req.onerror   = (e) => reject(e.target.error);
  });
}

window.DB = {

  init: async function () {
    await openDB();
    await this.loadAll();
  },

  loadAll: async function () {
    const sales = await getAll("sales");
    sales.sort((a, b) => a.id - b.id);
    window.savedSales = sales;

    const purchases = await getAll("purchases");
    purchases.sort((a, b) => a.id - b.id);
    window.savedPurchases = purchases;

    await new Promise((resolve) => {
      const req = _db.transaction("settings", "readonly")
                     .objectStore("settings").get("coa");
      req.onsuccess = () => {
        if (req.result?.value) window.COA = req.result.value;
        resolve();
      };
      req.onerror = () => resolve();
    });
  },

  // SALES
  saveSale: async function (sale, index) {
    const record = { ...sale };
    if (index !== null && window.savedSales[index]?.id)
      record.id = window.savedSales[index].id;
    const id = await putRecord("sales", record);
    record.id = id;
    if (index !== null) window.savedSales[index] = record;
    else                window.savedSales.push(record);
    return id;
  },

  updateSale: async function (index) {
    const sale = window.savedSales[index];
    if (sale?.id) await putRecord("sales", sale);
  },

  // PURCHASES
  savePurchase: async function (purchase, index) {
    const record = { ...purchase };
    if (index !== null && window.savedPurchases[index]?.id)
      record.id = window.savedPurchases[index].id;
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

  // COA
  saveCOA: async function () {
    await putRecord("settings", { key: "coa", value: window.COA });
  },
};

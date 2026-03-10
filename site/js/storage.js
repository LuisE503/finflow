/**
 * FinFlow — Storage Layer
 * IndexedDB persistence for privacy-first, offline-capable data storage
 */
const Storage = (() => {
  'use strict';

  const DB_NAME = 'finflow-db';
  const DB_VERSION = 1;
  let db = null;

  /**
   * Open/create database
   */
  function open() {
    return new Promise((resolve, reject) => {
      if (db) { resolve(db); return; }

      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onupgradeneeded = (e) => {
        const database = e.target.result;

        if (!database.objectStoreNames.contains('transactions')) {
          const txStore = database.createObjectStore('transactions', { keyPath: 'id' });
          txStore.createIndex('date', 'date', { unique: false });
          txStore.createIndex('category', 'category', { unique: false });
          txStore.createIndex('type', 'type', { unique: false });
        }

        if (!database.objectStoreNames.contains('forecasts')) {
          database.createObjectStore('forecasts', { keyPath: 'id' });
        }

        if (!database.objectStoreNames.contains('settings')) {
          database.createObjectStore('settings', { keyPath: 'key' });
        }
      };

      request.onsuccess = (e) => { db = e.target.result; resolve(db); };
      request.onerror = (e) => reject(e.target.error);
    });
  }

  /**
   * Generic store helper
   */
  async function getStore(storeName, mode = 'readonly') {
    const database = await open();
    return database.transaction(storeName, mode).objectStore(storeName);
  }

  /**
   * Save transactions (bulk)
   */
  async function saveTransactions(transactions) {
    const database = await open();
    const tx = database.transaction('transactions', 'readwrite');
    const store = tx.objectStore('transactions');

    transactions.forEach(t => store.put(t));

    return new Promise((resolve, reject) => {
      tx.oncomplete = () => resolve(transactions.length);
      tx.onerror = (e) => reject(e.target.error);
    });
  }

  /**
   * Get all transactions
   */
  async function getTransactions() {
    const store = await getStore('transactions');
    return new Promise((resolve, reject) => {
      const request = store.getAll();
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = (e) => reject(e.target.error);
    });
  }

  /**
   * Clear all transactions
   */
  async function clearTransactions() {
    const store = await getStore('transactions', 'readwrite');
    return new Promise((resolve, reject) => {
      const request = store.clear();
      request.onsuccess = () => resolve();
      request.onerror = (e) => reject(e.target.error);
    });
  }

  /**
   * Save forecast result
   */
  async function saveForecast(forecast) {
    const store = await getStore('forecasts', 'readwrite');
    return new Promise((resolve, reject) => {
      const request = store.put({ id: 'latest', ...forecast, savedAt: new Date().toISOString() });
      request.onsuccess = () => resolve();
      request.onerror = (e) => reject(e.target.error);
    });
  }

  /**
   * Get latest forecast
   */
  async function getForecast() {
    const store = await getStore('forecasts');
    return new Promise((resolve, reject) => {
      const request = store.get('latest');
      request.onsuccess = () => resolve(request.result || null);
      request.onerror = (e) => reject(e.target.error);
    });
  }

  /**
   * Save a setting
   */
  async function setSetting(key, value) {
    const store = await getStore('settings', 'readwrite');
    return new Promise((resolve, reject) => {
      const request = store.put({ key, value });
      request.onsuccess = () => resolve();
      request.onerror = (e) => reject(e.target.error);
    });
  }

  /**
   * Get a setting
   */
  async function getSetting(key) {
    const store = await getStore('settings');
    return new Promise((resolve, reject) => {
      const request = store.get(key);
      request.onsuccess = () => resolve(request.result?.value ?? null);
      request.onerror = (e) => reject(e.target.error);
    });
  }

  /**
   * Export all data as JSON (for backup)
   */
  async function exportData() {
    const transactions = await getTransactions();
    const forecast = await getForecast();
    return JSON.stringify({ transactions, forecast, exportedAt: new Date().toISOString(), version: 1 }, null, 2);
  }

  /**
   * Import data from JSON backup
   */
  async function importData(jsonString) {
    const data = JSON.parse(jsonString);
    if (data.transactions && Array.isArray(data.transactions)) {
      await clearTransactions();
      await saveTransactions(data.transactions);
    }
    if (data.forecast) {
      await saveForecast(data.forecast);
    }
    return { transactionCount: data.transactions?.length || 0 };
  }

  /**
   * Delete entire database
   */
  function deleteDatabase() {
    return new Promise((resolve, reject) => {
      if (db) { db.close(); db = null; }
      const request = indexedDB.deleteDatabase(DB_NAME);
      request.onsuccess = () => resolve();
      request.onerror = (e) => reject(e.target.error);
    });
  }

  return {
    open, saveTransactions, getTransactions, clearTransactions,
    saveForecast, getForecast,
    setSetting, getSetting,
    exportData, importData, deleteDatabase
  };
})();

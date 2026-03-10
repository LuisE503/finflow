/**
 * FinFlow — Main Application Controller
 */
document.addEventListener('DOMContentLoaded', async () => {
  'use strict';

  // ── Initialize i18n ──
  await I18n.init();

  // ── State ──
  let transactions = [];
  let forecastResult = null;
  let currentView = 'landing'; // landing | dashboard

  // ── Navigation scroll effect ──
  const nav = document.querySelector('.nav');
  window.addEventListener('scroll', () => {
    nav.classList.toggle('scrolled', window.scrollY > 40);
  }, { passive: true });

  // ── Mobile nav toggle ──
  const navToggle = document.querySelector('.nav-toggle');
  const navLinks = document.querySelector('.nav-links');
  if (navToggle) {
    navToggle.addEventListener('click', () => {
      const open = navLinks.classList.toggle('open');
      navToggle.setAttribute('aria-expanded', open);
      navToggle.innerHTML = open ? '✕' : '☰';
    });
    navLinks.querySelectorAll('a').forEach(link => {
      link.addEventListener('click', () => {
        navLinks.classList.remove('open');
        navToggle.setAttribute('aria-expanded', 'false');
        navToggle.innerHTML = '☰';
      });
    });
  }

  // ── Language Switcher ──
  const langBtn = document.querySelector('.lang-btn');
  const langDropdown = document.querySelector('.lang-dropdown');
  if (langBtn && langDropdown) {
    langBtn.addEventListener('click', e => { e.stopPropagation(); langDropdown.classList.toggle('open'); });
    document.addEventListener('click', () => langDropdown.classList.remove('open'));
    langDropdown.querySelectorAll('.lang-option').forEach(opt => {
      opt.addEventListener('click', async () => {
        await I18n.setLanguage(opt.dataset.lang);
        langDropdown.classList.remove('open');
        updateLangButton();
        if (currentView === 'dashboard') refreshDashboard();
      });
    });
    updateLangButton();
    I18n.onLanguageChange(updateLangButton);
  }

  function updateLangButton() {
    const lang = I18n.getCurrentLang();
    const names = { en:'EN', es:'ES', fr:'FR', de:'DE', pt:'PT', zh:'中', ja:'日' };
    if (langBtn) langBtn.textContent = `🌐 ${names[lang] || lang.toUpperCase()}`;
    if (langDropdown) langDropdown.querySelectorAll('.lang-option').forEach(o => o.classList.toggle('active', o.dataset.lang === lang));
  }

  // ── Smooth scroll ──
  document.querySelectorAll('a[href^="#"]').forEach(link => {
    link.addEventListener('click', e => {
      const t = link.getAttribute('href');
      if (t === '#') return;
      const el = document.querySelector(t);
      if (el) { e.preventDefault(); el.scrollIntoView({ behavior:'smooth', block:'start' }); }
    });
  });

  // ── Scroll animations ──
  const observer = new IntersectionObserver(entries => {
    entries.forEach(e => { if (e.isIntersecting) { e.target.classList.add('visible'); observer.unobserve(e.target); } });
  }, { threshold: 0.1, rootMargin: '0px 0px -50px 0px' });
  document.querySelectorAll('.animate-in').forEach(el => observer.observe(el));

  // ── CSV Import — Drag & Drop ──
  const dropZone = document.getElementById('drop-zone');
  const fileInput = document.getElementById('csv-file-input');

  if (dropZone && fileInput) {
    dropZone.addEventListener('click', () => fileInput.click());

    dropZone.addEventListener('dragover', e => { e.preventDefault(); dropZone.classList.add('drag-over'); });
    dropZone.addEventListener('dragleave', () => dropZone.classList.remove('drag-over'));
    dropZone.addEventListener('drop', e => {
      e.preventDefault();
      dropZone.classList.remove('drag-over');
      const file = e.dataTransfer.files[0];
      if (file) processCSVFile(file);
    });

    fileInput.addEventListener('change', () => {
      if (fileInput.files[0]) processCSVFile(fileInput.files[0]);
    });
  }

  // ── Demo button ──
  const demoBtn = document.getElementById('load-demo-btn');
  if (demoBtn) {
    demoBtn.addEventListener('click', async () => {
      try {
        const resp = await fetch('./demo-data/sample-transactions.csv');
        const text = await resp.text();
        await processCSVText(text);
      } catch (err) {
        showNotification(I18n.t('errors.demoFailed', 'Failed to load demo data'), 'error');
      }
    });
  }

  // ── Process CSV File ──
  async function processCSVFile(file) {
    if (!file.name.toLowerCase().endsWith('.csv') && !file.type.includes('csv') && !file.type.includes('text')) {
      showNotification(I18n.t('errors.invalidFile', 'Please upload a CSV file'), 'error');
      return;
    }
    const text = await file.text();
    await processCSVText(text);
  }

  async function processCSVText(text) {
    const progress = document.getElementById('import-progress');
    const progressFill = document.querySelector('.progress-bar .fill');
    const progressText = document.getElementById('import-status');

    if (progress) progress.classList.add('active');
    if (dropZone) dropZone.style.display = 'none';

    // Step 1: Parse CSV
    updateProgress(20, I18n.t('import.parsing', 'Parsing CSV...'));
    await delay(300);

    transactions = CSVParser.parse(text);

    if (transactions.length === 0) {
      showNotification(I18n.t('errors.noTransactions', 'No valid transactions found in CSV'), 'error');
      if (progress) progress.classList.remove('active');
      if (dropZone) dropZone.style.display = '';
      return;
    }

    // Step 2: Categorize
    updateProgress(50, I18n.t('import.categorizing', 'Categorizing transactions...'));
    await delay(300);
    transactions = Categorizer.categorizeAll(transactions);

    // Step 3: Save to IndexedDB
    updateProgress(70, I18n.t('import.saving', 'Saving data...'));
    await delay(200);
    await Storage.saveTransactions(transactions);

    // Step 4: Run forecast
    updateProgress(85, I18n.t('import.forecasting', 'Running forecast model...'));
    await delay(300);
    const monthlyData = Categorizer.getMonthlyTotals(transactions);
    forecastResult = Forecaster.forecast(monthlyData, 3);
    await Storage.saveForecast(forecastResult);

    // Step 5: Show dashboard
    updateProgress(100, I18n.t('import.complete', 'Complete!'));
    await delay(500);

    showDashboard();

    function updateProgress(pct, text) {
      if (progressFill) progressFill.style.width = `${pct}%`;
      if (progressText) progressText.textContent = text;
    }
  }

  // ── Show Dashboard ──
  function showDashboard() {
    currentView = 'dashboard';
    document.getElementById('landing-view').style.display = 'none';
    document.getElementById('dashboard-view').classList.add('active');
    refreshDashboard();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  // ── Refresh Dashboard ──
  function refreshDashboard() {
    if (transactions.length === 0) return;

    const t = I18n.t.bind(I18n);
    const monthlyData = Categorizer.getMonthlyTotals(transactions);
    const categoryStats = Categorizer.getCategoryStats(transactions.filter(tx => tx.amount < 0));
    const summary = Categorizer.getSummary(transactions);

    // Update stat cards
    setTextById('stat-total-income', formatCurrency(summary.totalIncome));
    setTextById('stat-total-expenses', formatCurrency(summary.totalExpenses));
    setTextById('stat-net-flow', formatCurrency(summary.net));
    setTextById('stat-savings-rate', `${summary.savingsRate}%`);

    const netEl = document.getElementById('stat-net-flow');
    if (netEl) netEl.style.color = summary.net >= 0 ? 'var(--color-income)' : 'var(--color-expense)';

    // Render charts
    Charts.renderIncomeExpense('chart-income-expense', monthlyData, t);
    Charts.renderCategories('chart-categories', categoryStats, t);

    if (forecastResult && forecastResult.predictions.length > 0) {
      Charts.renderForecast('chart-forecast', monthlyData, forecastResult, t);
      renderPredictions(forecastResult);
      renderRecommendations(forecastResult.recommendations);
    }

    // Render transactions table
    renderTransactionsTable(transactions.slice().reverse().slice(0, 50));
  }

  // ── Render Predictions ──
  function renderPredictions(result) {
    const container = document.getElementById('predictions-container');
    if (!container) return;

    const t = I18n.t.bind(I18n);
    let html = `<div class="prediction-month">`;

    result.predictions.forEach(p => {
      const netColor = p.net >= 0 ? 'var(--color-income)' : 'var(--color-expense)';
      html += `
        <div class="prediction-item">
          <div class="month-name">${Charts.formatMonth(p.month)}</div>
          <div class="amount" style="color: ${netColor}">${formatCurrency(p.net)}</div>
          <div class="confidence">${t('forecast.income', 'Income')}: ${formatCurrency(p.income)}</div>
          <div class="confidence">${t('forecast.expenses', 'Expenses')}: ${formatCurrency(p.expenses)}</div>
          <div class="confidence" style="opacity:0.6;">±${formatCurrency(Math.abs(p.confidence.net.high - p.confidence.net.low) / 2)}</div>
        </div>`;
    });

    html += `</div>`;
    html += `<div style="margin-top:var(--space-md);font-size:0.8rem;color:var(--color-text-muted);">
      ${t('forecast.method', 'Method')}: ${result.method} · ${t('forecast.confidence', 'Confidence')}: ${result.confidence}%
    </div>`;
    container.innerHTML = html;
  }

  // ── Render Recommendations ──
  function renderRecommendations(recs) {
    const container = document.getElementById('recommendations-container');
    if (!container || !recs.length) return;

    const t = I18n.t.bind(I18n);
    container.innerHTML = recs.map(r => `
      <div class="recommendation">
        <div class="rec-icon">${r.icon}</div>
        <div class="rec-text">
          <p>${t(r.key, r.fallback)}</p>
        </div>
      </div>
    `).join('');
  }

  // ── Render Transactions Table ──
  function renderTransactionsTable(txs) {
    const tbody = document.getElementById('transactions-tbody');
    if (!tbody) return;

    const t = I18n.t.bind(I18n);
    tbody.innerHTML = txs.map(tx => {
      const catInfo = Categorizer.CATEGORIES[tx.category] || Categorizer.CATEGORIES.other;
      const amountClass = tx.amount >= 0 ? 'amount-income' : 'amount-expense';
      const sign = tx.amount >= 0 ? '+' : '';
      return `<tr>
        <td>${tx.date}</td>
        <td>${escapeHtml(tx.description).slice(0, 60)}</td>
        <td><span class="category-badge" style="border-color:${catInfo.color}30;background:${catInfo.color}15;">${catInfo.icon} ${t(`categories.${tx.category}`, tx.category)}</span></td>
        <td class="${amountClass}">${sign}${formatCurrency(tx.amount)}</td>
      </tr>`;
    }).join('');
  }

  // ── Back to Landing ──
  const backBtn = document.getElementById('back-to-landing');
  if (backBtn) {
    backBtn.addEventListener('click', () => {
      currentView = 'landing';
      document.getElementById('landing-view').style.display = '';
      document.getElementById('dashboard-view').classList.remove('active');
      Charts.destroyAll();
      const progress = document.getElementById('import-progress');
      if (progress) progress.classList.remove('active');
      const dz = document.getElementById('drop-zone');
      if (dz) dz.style.display = '';
    });
  }

  // ── Export Data ──
  const exportBtn = document.getElementById('export-data-btn');
  if (exportBtn) {
    exportBtn.addEventListener('click', async () => {
      const json = await Storage.exportData();
      const blob = new Blob([json], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `finflow-backup-${new Date().toISOString().slice(0,10)}.json`;
      a.click();
      URL.revokeObjectURL(url);
      showNotification(I18n.t('dashboard.exported', 'Data exported successfully'), 'success');
    });
  }

  // ── Clear Data ──
  const clearBtn = document.getElementById('clear-data-btn');
  if (clearBtn) {
    clearBtn.addEventListener('click', async () => {
      if (confirm(I18n.t('dashboard.confirmClear', 'Are you sure you want to clear all data?'))) {
        await Storage.clearTransactions();
        transactions = [];
        forecastResult = null;
        currentView = 'landing';
        document.getElementById('landing-view').style.display = '';
        document.getElementById('dashboard-view').classList.remove('active');
        Charts.destroyAll();
        const progress = document.getElementById('import-progress');
        if (progress) progress.classList.remove('active');
        const dz = document.getElementById('drop-zone');
        if (dz) dz.style.display = '';
        showNotification(I18n.t('dashboard.cleared', 'All data cleared'), 'info');
      }
    });
  }

  // ── Load existing data ──
  try {
    const savedTx = await Storage.getTransactions();
    if (savedTx.length > 0) {
      transactions = savedTx;
      const savedForecast = await Storage.getForecast();
      if (savedForecast) forecastResult = savedForecast;
      else {
        const monthlyData = Categorizer.getMonthlyTotals(transactions);
        forecastResult = Forecaster.forecast(monthlyData, 3);
      }
      showDashboard();
    }
  } catch (e) { /* First visit, no data */ }

  // ── PWA install prompt ──
  let deferredPrompt = null;
  window.addEventListener('beforeinstallprompt', e => {
    e.preventDefault();
    deferredPrompt = e;
    const installBtn = document.getElementById('pwa-install-btn');
    if (installBtn) {
      installBtn.style.display = '';
      installBtn.addEventListener('click', () => {
        deferredPrompt.prompt();
        deferredPrompt.userChoice.then(() => { deferredPrompt = null; installBtn.style.display = 'none'; });
      });
    }
  });

  // ── Register Service Worker ──
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./sw.js').catch(() => {});
  }

  // ── SEO updates ──
  I18n.onLanguageChange((lang, tr) => {
    document.title = `FinFlow — ${tr?.hero?.title || 'Personal Finance Assistant'}`;
    const md = document.querySelector('meta[name="description"]');
    if (md) md.content = tr?.hero?.subtitle || '';
  });

  // ── Utilities ──
  function formatCurrency(amount) {
    return '$' + Math.abs(amount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  }

  function escapeHtml(s) { const d = document.createElement('div'); d.textContent = s; return d.innerHTML; }
  function setTextById(id, text) { const el = document.getElementById(id); if (el) el.textContent = text; }
  function delay(ms) { return new Promise(r => setTimeout(r, ms)); }

  function showNotification(message, type = 'info') {
    const notification = document.createElement('div');
    notification.style.cssText = `position:fixed;top:80px;right:20px;padding:12px 20px;border-radius:12px;font-size:0.9rem;font-weight:500;z-index:9999;backdrop-filter:blur(12px);border:1px solid;animation:slideIn 0.3s ease;`;
    const colors = { success: '#10b981', error: '#ef4444', info: '#3b82f6', warning: '#f59e0b' };
    const c = colors[type] || colors.info;
    notification.style.background = `${c}20`;
    notification.style.borderColor = `${c}40`;
    notification.style.color = c;
    notification.textContent = message;
    document.body.appendChild(notification);
    setTimeout(() => { notification.style.opacity = '0'; notification.style.transition = 'opacity 0.3s'; setTimeout(() => notification.remove(), 300); }, 3000);
  }
});

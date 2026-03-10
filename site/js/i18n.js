/**
 * FinFlow — Internationalization Engine
 */
const I18n = (() => {
  'use strict';
  const SUPPORTED = ['en','es','fr','de','pt','zh','ja'];
  const DEFAULT = 'en';
  const CACHE = {};
  let currentLang = DEFAULT;
  let translations = {};
  const listeners = [];

  function detect() {
    const p = new URLSearchParams(window.location.search);
    const h = new URLSearchParams(window.location.hash.replace('#',''));
    const u = p.get('lang') || h.get('lang');
    if (u && SUPPORTED.includes(u)) return u;
    const s = localStorage.getItem('finflow-lang');
    if (s && SUPPORTED.includes(s)) return s;
    const b = (navigator.language || '').slice(0,2).toLowerCase();
    if (SUPPORTED.includes(b)) return b;
    return DEFAULT;
  }

  async function load(lang) {
    if (CACHE[lang]) return CACHE[lang];
    try {
      const r = await fetch(`./i18n/${lang}.json`);
      if (!r.ok) throw new Error();
      const d = await r.json();
      CACHE[lang] = d;
      return d;
    } catch { return lang !== DEFAULT ? load(DEFAULT) : {}; }
  }

  function get(obj, key) {
    return key.split('.').reduce((o,k) => o && o[k] !== undefined ? o[k] : null, obj);
  }

  function t(key, fallback) {
    return get(translations, key) || fallback || key;
  }

  function apply() {
    document.querySelectorAll('[data-i18n]').forEach(el => {
      const v = t(el.getAttribute('data-i18n'));
      if (v) el.textContent = v;
    });
    document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
      const v = t(el.getAttribute('data-i18n-placeholder'));
      if (v) el.placeholder = v;
    });
    document.querySelectorAll('[data-i18n-aria-label]').forEach(el => {
      const v = t(el.getAttribute('data-i18n-aria-label'));
      if (v) el.setAttribute('aria-label', v);
    });
    document.documentElement.lang = translations?.meta?.lang || currentLang;
    document.documentElement.dir = translations?.meta?.dir || 'ltr';
    updateHreflang();
  }

  function updateHreflang() {
    document.querySelectorAll('link[rel="alternate"][hreflang]').forEach(e => e.remove());
    const base = window.location.origin + window.location.pathname;
    SUPPORTED.forEach(l => {
      const link = document.createElement('link');
      link.rel = 'alternate'; link.hreflang = l;
      link.href = `${base}?lang=${l}`;
      document.head.appendChild(link);
    });
    const d = document.createElement('link');
    d.rel = 'alternate'; d.hreflang = 'x-default'; d.href = base;
    document.head.appendChild(d);
  }

  async function setLanguage(lang) {
    if (!SUPPORTED.includes(lang)) return;
    currentLang = lang;
    translations = await load(lang);
    localStorage.setItem('finflow-lang', lang);
    const url = new URL(window.location);
    url.searchParams.set('lang', lang);
    window.history.replaceState({}, '', url);
    apply();
    listeners.forEach(fn => fn(lang, translations));
  }

  function onLanguageChange(fn) { listeners.push(fn); }

  async function init() {
    await setLanguage(detect());
    return translations;
  }

  return { init, t, setLanguage, getCurrentLang: () => currentLang, getTranslations: () => translations, getSupportedLangs: () => [...SUPPORTED], onLanguageChange, apply, SUPPORTED_LANGS: SUPPORTED };
})();

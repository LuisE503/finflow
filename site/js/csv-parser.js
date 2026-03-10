/**
 * FinFlow — CSV Parser
 * Auto-detects bank CSV formats and normalizes transactions
 */
const CSVParser = (() => {
  'use strict';

  /**
   * Parse CSV text into rows
   */
  function parseCSVText(text) {
    const lines = text.trim().split(/\r?\n/);
    if (lines.length < 2) return { headers: [], rows: [] };

    // Auto-detect delimiter
    const delimiters = [',', ';', '\t', '|'];
    let delimiter = ',';
    let maxCols = 0;
    delimiters.forEach(d => {
      const cols = lines[0].split(d).length;
      if (cols > maxCols) { maxCols = cols; delimiter = d; }
    });

    const headers = parseCSVLine(lines[0], delimiter).map(h => h.trim().toLowerCase());
    const rows = [];

    for (let i = 1; i < lines.length; i++) {
      if (!lines[i].trim()) continue;
      const values = parseCSVLine(lines[i], delimiter);
      const row = {};
      headers.forEach((h, idx) => { row[h] = (values[idx] || '').trim(); });
      rows.push(row);
    }

    return { headers, rows, delimiter };
  }

  /**
   * Parse a single CSV line (handles quoted fields)
   */
  function parseCSVLine(line, delimiter) {
    const result = [];
    let current = '';
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        if (inQuotes && line[i + 1] === '"') { current += '"'; i++; }
        else { inQuotes = !inQuotes; }
      } else if (char === delimiter && !inQuotes) {
        result.push(current); current = '';
      } else {
        current += char;
      }
    }
    result.push(current);
    return result;
  }

  /**
   * Auto-detect column mapping
   */
  function detectColumns(headers) {
    const mapping = { date: null, amount: null, description: null, balance: null, credit: null, debit: null };

    const datePatterns = ['date', 'fecha', 'datum', 'data', 'transaction date', 'posting date', 'fecha operación', 'fecha valor', '日付', '日期'];
    const amountPatterns = ['amount', 'monto', 'importe', 'montant', 'betrag', 'valor', 'value', '金額', '金额'];
    const descPatterns = ['description', 'desc', 'descripción', 'descripcion', 'concepto', 'detalle', 'memo', 'reference', 'payee', 'narration', 'libellé', 'beschreibung', 'descrição', '摘要', '取引内容'];
    const balancePatterns = ['balance', 'saldo', 'solde', 'kontostand', '残高', '余额'];
    const creditPatterns = ['credit', 'crédito', 'credito', 'crédit', 'deposit', 'depósito', 'income', 'ingreso', 'entrada', '入金'];
    const debitPatterns = ['debit', 'débito', 'debito', 'débit', 'withdrawal', 'cargo', 'charge', 'gasto', 'salida', '出金'];

    headers.forEach((h, idx) => {
      const hl = h.toLowerCase().trim();
      if (!mapping.date && datePatterns.some(p => hl.includes(p))) mapping.date = idx;
      if (!mapping.amount && amountPatterns.some(p => hl.includes(p))) mapping.amount = idx;
      if (!mapping.description && descPatterns.some(p => hl.includes(p))) mapping.description = idx;
      if (!mapping.balance && balancePatterns.some(p => hl.includes(p))) mapping.balance = idx;
      if (!mapping.credit && creditPatterns.some(p => hl.includes(p))) mapping.credit = idx;
      if (!mapping.debit && debitPatterns.some(p => hl.includes(p))) mapping.debit = idx;
    });

    // Fallback: first col = date, second = desc/amount
    if (mapping.date === null) mapping.date = 0;
    if (mapping.description === null && mapping.amount === null) {
      if (headers.length >= 3) { mapping.description = 1; mapping.amount = 2; }
      else { mapping.amount = 1; }
    }

    return mapping;
  }

  /**
   * Parse amount string to number
   */
  function parseAmount(str) {
    if (!str || typeof str !== 'string') return 0;
    let cleaned = str.replace(/[^\d.,\-()]/g, '');
    // Handle negative in parentheses: (123.45) → -123.45
    if (cleaned.startsWith('(') && cleaned.endsWith(')')) {
      cleaned = '-' + cleaned.slice(1, -1);
    }
    // Handle European format: 1.234,56 → 1234.56
    if (/\d+\.\d{3},\d{2}$/.test(cleaned)) {
      cleaned = cleaned.replace(/\./g, '').replace(',', '.');
    }
    // Handle US format with thousands separator: 1,234.56 → 1234.56
    else if (/\d{1,3}(,\d{3})+(\.\d+)?$/.test(cleaned)) {
      cleaned = cleaned.replace(/,/g, '');
    }
    // Handle comma as decimal: 123,45 → 123.45
    else if (/^\-?\d+,\d{1,2}$/.test(cleaned)) {
      cleaned = cleaned.replace(',', '.');
    }
    const num = parseFloat(cleaned);
    return isNaN(num) ? 0 : num;
  }

  /**
   * Parse date string into ISO date
   */
  function parseDate(str) {
    if (!str) return null;
    const s = str.trim();

    // Try common formats
    const formats = [
      // MM/DD/YYYY
      { regex: /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/, fn: (m) => `${m[3]}-${m[1].padStart(2,'0')}-${m[2].padStart(2,'0')}` },
      // DD/MM/YYYY
      { regex: /^(\d{1,2})\/(\d{1,2})\/(\d{4})$/, fn: (m) => `${m[3]}-${m[2].padStart(2,'0')}-${m[1].padStart(2,'0')}` },
      // YYYY-MM-DD
      { regex: /^(\d{4})-(\d{1,2})-(\d{1,2})/, fn: (m) => `${m[1]}-${m[2].padStart(2,'0')}-${m[3].padStart(2,'0')}` },
      // DD-MM-YYYY
      { regex: /^(\d{1,2})-(\d{1,2})-(\d{4})$/, fn: (m) => `${m[3]}-${m[2].padStart(2,'0')}-${m[1].padStart(2,'0')}` },
      // DD.MM.YYYY
      { regex: /^(\d{1,2})\.(\d{1,2})\.(\d{4})$/, fn: (m) => `${m[3]}-${m[2].padStart(2,'0')}-${m[1].padStart(2,'0')}` },
    ];

    // ISO format first
    const isoMatch = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
    if (isoMatch) return `${isoMatch[1]}-${isoMatch[2].padStart(2,'0')}-${isoMatch[3].padStart(2,'0')}`;

    // Try other formats
    const slashMatch = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
    if (slashMatch) {
      const [, a, b, y] = slashMatch;
      // If first number > 12, it's DD/MM/YYYY
      if (parseInt(a) > 12) return `${y}-${b.padStart(2,'0')}-${a.padStart(2,'0')}`;
      // Default to MM/DD/YYYY (US format)
      return `${y}-${a.padStart(2,'0')}-${b.padStart(2,'0')}`;
    }

    const dashMatch = s.match(/^(\d{1,2})-(\d{1,2})-(\d{4})$/);
    if (dashMatch) {
      const [, a, b, y] = dashMatch;
      if (parseInt(a) > 12) return `${y}-${b.padStart(2,'0')}-${a.padStart(2,'0')}`;
      return `${y}-${a.padStart(2,'0')}-${b.padStart(2,'0')}`;
    }

    const dotMatch = s.match(/^(\d{1,2})\.(\d{1,2})\.(\d{4})$/);
    if (dotMatch) {
      return `${dotMatch[3]}-${dotMatch[2].padStart(2,'0')}-${dotMatch[1].padStart(2,'0')}`;
    }

    // Last resort: try Date constructor
    const d = new Date(s);
    if (!isNaN(d.getTime())) {
      return d.toISOString().slice(0, 10);
    }

    return null;
  }

  /**
   * Normalize parsed rows into standard transaction format
   */
  function normalizeTransactions(parsed) {
    const { headers, rows } = parsed;
    const mapping = detectColumns(headers);
    const headerKeys = headers;

    return rows.map((row, idx) => {
      const values = headerKeys.map(h => row[h] || '');

      let amount = 0;
      if (mapping.amount !== null) {
        amount = parseAmount(values[mapping.amount]);
      } else if (mapping.credit !== null || mapping.debit !== null) {
        const credit = mapping.credit !== null ? parseAmount(values[mapping.credit]) : 0;
        const debit = mapping.debit !== null ? parseAmount(values[mapping.debit]) : 0;
        amount = credit > 0 ? credit : -Math.abs(debit);
      }

      const dateStr = mapping.date !== null ? values[mapping.date] : '';
      const desc = mapping.description !== null ? values[mapping.description] : `Transaction ${idx + 1}`;

      return {
        id: `tx-${idx}-${Date.now()}`,
        date: parseDate(dateStr),
        amount: amount,
        description: desc,
        type: amount >= 0 ? 'income' : 'expense',
        category: null, // Will be set by categorizer
        raw: row
      };
    }).filter(tx => tx.date !== null && tx.amount !== 0);
  }

  /**
   * Main entry point: parse CSV file/text
   */
  function parse(csvText) {
    const parsed = parseCSVText(csvText);
    return normalizeTransactions(parsed);
  }

  return { parse, parseCSVText, detectColumns, parseAmount, parseDate, normalizeTransactions };
})();

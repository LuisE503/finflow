/**
 * FinFlow — Expense Categorizer
 * Auto-classifies transactions by keyword matching across multiple languages
 */
const Categorizer = (() => {
  'use strict';

  const CATEGORIES = {
    housing:        { icon: '🏠', color: '#6366f1', keywords: ['rent','mortgage','alquiler','hipoteca','loyer','hypothèque','miete','aluguel','房租','家賃','property','apartment','lease','condo'] },
    food:           { icon: '🍔', color: '#f97316', keywords: ['grocery','supermarket','restaurant','uber eats','doordash','grubhub','food','supermercado','restaurante','comida','mercado','épicerie','lebensmittel','mercado','supermercado','食品','食料','walmart','costco','aldi','lidl','carrefour','tesco','whole foods','trader joe','mcdonald','starbucks','burger','pizza','sushi','cafe','coffee','bakery','panadería'] },
    transport:      { icon: '🚗', color: '#3b82f6', keywords: ['gas','fuel','uber','lyft','taxi','parking','transit','bus','metro','subway','train','gasolina','combustible','transporte','carburant','benzin','combustível','交通','ガソリン','toll','highway','car wash','auto','vehicle'] },
    utilities:      { icon: '💡', color: '#eab308', keywords: ['electric','electricity','water','gas bill','internet','phone','mobile','cable','utility','electricidad','agua','teléfono','électricité','eau','strom','wasser','eletricidade','água','電気','水道','wifi','broadband','cellular','spectrum','at&t','verizon','t-mobile','comcast'] },
    entertainment:  { icon: '🎮', color: '#ec4899', keywords: ['netflix','spotify','hulu','disney','hbo','amazon prime','gaming','movie','cinema','concert','theater','cine','entretenimiento','divertissement','unterhaltung','entretenimento','娯楽','youtube','twitch','apple tv','steam','playstation','xbox','nintendo'] },
    shopping:       { icon: '🛍️', color: '#8b5cf6', keywords: ['amazon','ebay','target','clothing','shoes','electronics','store','mall','shop','tienda','compras','ropa','magasin','geschäft','loja','买东西','ショッピング','best buy','nike','adidas','zara','h&m','ikea','apple'] },
    health:         { icon: '🏥', color: '#10b981', keywords: ['doctor','hospital','pharmacy','medicine','dental','medical','health','insurance','gym','fitness','médico','farmacia','salud','gimnasio','médecin','pharmacie','arzt','apotheke','médico','farmácia','病院','薬局','cvs','walgreens','vitamin','therapy','workout'] },
    subscriptions:  { icon: '🔄', color: '#14b8a6', keywords: ['subscription','membership','premium','annual','monthly','suscripción','abonnement','abonnieren','assinatura','サブスク','patreon','substack','notion','slack','zoom','adobe','microsoft','github','dropbox','icloud','google one'] },
    education:      { icon: '📚', color: '#0ea5e9', keywords: ['tuition','school','university','course','books','education','college','escuela','universidad','educación','école','université','schule','universität','escola','universidade','教育','大学','udemy','coursera','skillshare','masterclass','library'] },
    transfer:       { icon: '🔄', color: '#64748b', keywords: ['transfer','transferencia','virement','überweisung','transferência','送金','振込','zelle','venmo','paypal','cash app','wire','ach'] },
    salary:         { icon: '💰', color: '#10b981', keywords: ['salary','payroll','wage','nómina','salario','sueldo','salaire','gehalt','salário','給料','給与','income','deposit','direct deposit','pay check','paycheck'] },
    freelance:      { icon: '💻', color: '#34d399', keywords: ['freelance','consulting','invoice','contract','cliente','factura','honorarios','client payment','side project','gig'] },
    investment:     { icon: '📈', color: '#6366f1', keywords: ['dividend','interest','investment','stock','etf','crypto','bitcoin','inversión','dividendo','interés','investissement','investition','investimento','投資','配当'] },
    other:          { icon: '📋', color: '#94a3b8', keywords: [] }
  };

  const INCOME_CATEGORIES = ['salary', 'freelance', 'investment'];

  /**
   * Categorize a single transaction
   */
  function categorize(transaction) {
    if (transaction.category) return transaction.category;

    const desc = (transaction.description || '').toLowerCase();
    let bestMatch = 'other';
    let bestScore = 0;

    // Priority brands — specific services that should always map to their primary category
    const BRAND_OVERRIDES = {
      'netflix': 'entertainment', 'spotify': 'entertainment', 'hulu': 'entertainment',
      'disney': 'entertainment', 'hbo': 'entertainment', 'youtube': 'entertainment',
      'amazon prime': 'entertainment', 'apple tv': 'entertainment', 'twitch': 'entertainment',
      'steam': 'entertainment', 'playstation': 'entertainment', 'xbox': 'entertainment',
      'adobe': 'subscriptions', 'notion': 'subscriptions', 'slack': 'subscriptions'
    };

    // Check brand overrides first
    for (const [brand, cat] of Object.entries(BRAND_OVERRIDES)) {
      if (desc.includes(brand)) return cat;
    }

    Object.entries(CATEGORIES).forEach(([category, { keywords }]) => {
      keywords.forEach(keyword => {
        if (desc.includes(keyword.toLowerCase())) {
          const score = keyword.length;
          if (score > bestScore) {
            bestScore = score;
            bestMatch = category;
          }
        }
      });
    });

    // If amount is positive and no spending category matched, likely income
    if (transaction.type === 'income' && !INCOME_CATEGORIES.includes(bestMatch) && bestMatch === 'other') {
      bestMatch = 'salary';
    }

    return bestMatch;
  }

  /**
   * Categorize all transactions
   */
  function categorizeAll(transactions) {
    return transactions.map(tx => ({
      ...tx,
      category: tx.category || categorize(tx)
    }));
  }

  /**
   * Aggregate stats by category
   */
  function getCategoryStats(transactions) {
    const stats = {};

    transactions.forEach(tx => {
      const cat = tx.category || 'other';
      if (!stats[cat]) {
        stats[cat] = { total: 0, count: 0, icon: CATEGORIES[cat]?.icon || '📋', color: CATEGORIES[cat]?.color || '#94a3b8', transactions: [] };
      }
      stats[cat].total += Math.abs(tx.amount);
      stats[cat].count += 1;
      stats[cat].transactions.push(tx);
    });

    return stats;
  }

  /**
   * Aggregate monthly totals
   */
  function getMonthlyTotals(transactions) {
    const months = {};

    transactions.forEach(tx => {
      if (!tx.date) return;
      const month = tx.date.slice(0, 7); // YYYY-MM
      if (!months[month]) months[month] = { income: 0, expenses: 0, net: 0, count: 0 };
      if (tx.amount >= 0) months[month].income += tx.amount;
      else months[month].expenses += Math.abs(tx.amount);
      months[month].net += tx.amount;
      months[month].count += 1;
    });

    return Object.entries(months)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([month, data]) => ({ month, ...data }));
  }

  /**
   * Get summary statistics
   */
  function getSummary(transactions) {
    const totalIncome = transactions.filter(tx => tx.amount >= 0).reduce((s, tx) => s + tx.amount, 0);
    const totalExpenses = transactions.filter(tx => tx.amount < 0).reduce((s, tx) => s + Math.abs(tx.amount), 0);
    const net = totalIncome - totalExpenses;
    const avgMonthlyIncome = totalIncome / Math.max(1, new Set(transactions.map(tx => tx.date?.slice(0, 7))).size);
    const avgMonthlyExpenses = totalExpenses / Math.max(1, new Set(transactions.map(tx => tx.date?.slice(0, 7))).size);

    return {
      totalIncome,
      totalExpenses,
      net,
      avgMonthlyIncome,
      avgMonthlyExpenses,
      transactionCount: transactions.length,
      savingsRate: totalIncome > 0 ? ((totalIncome - totalExpenses) / totalIncome * 100).toFixed(1) : 0
    };
  }

  return { categorize, categorizeAll, getCategoryStats, getMonthlyTotals, getSummary, CATEGORIES, INCOME_CATEGORIES };
})();

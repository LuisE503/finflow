<p align="center">💰</p>
<h1 align="center">FinFlow</h1>
<p align="center"><strong>Personal Finance Assistant — CSV Import, Expense Categorization & Cash Flow Prediction</strong></p>
<p align="center"><em>Powered by Holt-Winters Exponential Smoothing</em></p>

<p align="center">
  <a href="./docs/README.es.md">🇪🇸 Español</a> ·
  <a href="./docs/README.fr.md">🇫🇷 Français</a> ·
  <a href="./docs/README.de.md">🇩🇪 Deutsch</a> ·
  <a href="./docs/README.pt.md">🇧🇷 Português</a> ·
  <a href="./docs/README.zh.md">🇨🇳 中文</a> ·
  <a href="./docs/README.ja.md">🇯🇵 日本語</a>
</p>

---

## What is FinFlow?

FinFlow is a **privacy-first** Progressive Web App that helps you understand and predict your personal finances. Import your bank's CSV statement, and FinFlow will:

- 🏷️ **Auto-categorize** transactions into 13 categories using multi-language keyword matching
- 📈 **Predict cash flow** for the next 3 months using Holt-Winters exponential smoothing
- 📊 **Visualize** income trends, spending patterns, and forecasts with interactive charts
- 💡 **Recommend** actionable savings strategies based on your spending behavior
- 🔒 **Keep everything private** — all data stays on your device (IndexedDB)

## Quick Start

```bash
git clone https://github.com/LuisE503/finflow.git
cd finflow
npx serve site
```

Then open **http://localhost:3000** and either:
- **Upload a CSV** from your bank
- Click **"Try Demo"** to see it in action with sample data

## Features

| Feature | Description |
|---------|-------------|
| 📂 CSV Import | Auto-detects delimiter, date format, amount format, column names across many bank formats |
| 🏷️ 13 Categories | Housing, Food, Transport, Utilities, Entertainment, Shopping, Health, Subscriptions, Education, Transfer, Salary, Freelance, Investment |
| 📈 3-Month Forecast | Holt-Winters triple exponential smoothing with auto-optimized parameters |
| 📊 Interactive Charts | Chart.js bar, doughnut, and line charts with confidence bands |
| 💡 Recommendations | Smart financial advice based on spending trends and savings rate |
| 🔒 Privacy First | All data in IndexedDB, zero network calls, no tracking |
| 📱 PWA | Installable, works offline, responsive design |
| 🌐 7 Languages | English, Spanish, French, German, Portuguese, Chinese, Japanese |
| 📤 Export/Import | JSON backup and restore for portability |

## Tech Stack

| Component | Technology |
|-----------|------------|
| Frontend | Vanilla HTML/CSS/JS |
| Charts | Chart.js 4.x (CDN) |
| ML Forecast | Custom Holt-Winters (pure JS) |
| Storage | IndexedDB |
| PWA | Service Worker + Manifest |
| i18n | Custom engine w/ auto-detection |

## Project Structure

```
finflow/
├── site/                    # PWA Application
│   ├── index.html           # Main app page
│   ├── css/styles.css       # Premium dark theme
│   ├── js/
│   │   ├── app.js           # Main controller
│   │   ├── i18n.js          # Internationalization
│   │   ├── csv-parser.js    # Bank CSV parser
│   │   ├── categorizer.js   # Expense classifier
│   │   ├── forecaster.js    # Holt-Winters ML
│   │   ├── charts.js        # Chart.js wrapper
│   │   └── storage.js       # IndexedDB layer
│   ├── i18n/                # Translations (7 languages)
│   ├── demo-data/           # Sample CSV
│   ├── manifest.json        # PWA manifest
│   └── sw.js                # Service worker
├── tests/                   # Browser-runnable test suite
├── docs/                    # Multi-language READMEs
├── README.md
├── LICENSE                  # MIT
├── CONTRIBUTING.md
└── package.json
```

## How the ML Works

FinFlow implements **Holt-Winters Triple Exponential Smoothing** entirely in JavaScript:

1. **Data Normalization** — CSV is parsed, amounts normalized, dates standardized
2. **Categorization** — Keyword matching across 5+ languages assigns categories
3. **Monthly Aggregation** — Income and expenses grouped into monthly totals
4. **Parameter Optimization** — Grid search over α, β, γ to minimize MAPE
5. **Forecasting** — Fitted model projects 3 months of income and expenses
6. **Confidence Intervals** — 95% bands computed from residual standard deviation
7. **Recommendations** — Trend analysis generates actionable financial advice

## License

[MIT](./LICENSE) — Free to use, modify, and distribute.

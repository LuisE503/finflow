# Contributing to FinFlow

Thank you for your interest in contributing! Here's how to get started.

## Project Structure

```
finflow/
├── site/          # PWA application (GitHub Pages)
│   ├── js/        # Application modules
│   ├── css/       # Stylesheets
│   ├── i18n/      # Translation files
│   └── demo-data/ # Sample datasets
├── tests/         # Browser-runnable test suites
└── docs/          # Multi-language READMEs
```

## Development Setup

```bash
git clone https://github.com/LuisE503/finflow.git
cd finflow
npx serve site
```

## Code Guidelines

- **No build tools required** — vanilla JS, HTML, CSS
- **Privacy-first** — all data stays on-device (IndexedDB)
- **i18n** — all UI text must use `data-i18n` attributes
- **Accessibility** — semantic HTML, ARIA labels, keyboard navigation
- **Tests** — add tests for new features

## Translation Contributions

1. Copy `site/i18n/en.json` → `site/i18n/{lang}.json`
2. Translate all string values
3. Copy `docs/README.es.md` → `docs/README.{lang}.md`
4. Submit a Pull Request

## Pull Request Process

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/my-feature`)
3. Commit your changes
4. Push to the branch
5. Open a Pull Request with a clear description

## Reporting Issues

Use GitHub Issues. Include:
- Browser and OS version
- Steps to reproduce
- Expected vs actual behavior
- CSV sample if relevant (anonymized)

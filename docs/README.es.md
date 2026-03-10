<p align="center">💰</p>
<h1 align="center">FinFlow</h1>
<p align="center"><strong>Asistente de Finanzas Personales — Importar CSV, Categorización y Predicción de Flujo</strong></p>

<p align="center"><a href="../README.md">🇺🇸 English</a> · <a href="./README.fr.md">🇫🇷 Français</a> · <a href="./README.de.md">🇩🇪 Deutsch</a> · <a href="./README.pt.md">🇧🇷 Português</a> · <a href="./README.zh.md">🇨🇳 中文</a> · <a href="./README.ja.md">🇯🇵 日本語</a></p>

---

## ¿Qué es FinFlow?

FinFlow es una PWA que te ayuda a entender y predecir tus finanzas personales con total privacidad:

- 🏷️ **Clasifica automáticamente** transacciones en 13 categorías
- 📈 **Predice tu flujo de efectivo** para los próximos 3 meses usando Holt-Winters
- 📊 **Visualiza** tendencias de ingresos y gastos con gráficos interactivos
- 💡 **Recomienda** estrategias de ahorro basadas en tu comportamiento
- 🔒 **100% privado** — todos los datos se quedan en tu dispositivo

## Inicio Rápido

```bash
git clone https://github.com/LuisE503/finflow.git
cd finflow && npx serve site
```

Abre **http://localhost:3000** y sube tu CSV bancario o prueba el demo.

## Características Principales

| Característica | Descripción |
|---------------|-------------|
| 📂 Importar CSV | Detecta formatos automáticamente (EE.UU., Europa, Latam, Asia) |
| 🏷️ 13 Categorías | Vivienda, Comida, Transporte, Servicios, Entretenimiento, etc. |
| 📈 Pronóstico 3 Meses | Suavizado exponencial Holt-Winters con parámetros auto-optimizados |
| 📊 Gráficos | Chart.js con bandas de confianza |
| 🔒 Privacidad | IndexedDB local, sin servidores, sin rastreo |
| 📱 PWA | Funciona sin conexión |
| 🌐 7 Idiomas | EN, ES, FR, DE, PT, ZH, JA |

## Licencia

[MIT](../LICENSE)

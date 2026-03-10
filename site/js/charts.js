/**
 * FinFlow — Chart.js Wrapper
 * Creates responsive, themed charts for the dashboard
 */
const Charts = (() => {
  'use strict';

  let incomeExpenseChart = null;
  let categoryChart = null;
  let forecastChart = null;

  const CHART_FONT = { family: "'Inter', sans-serif" };
  const GRID_COLOR = 'rgba(148, 163, 184, 0.08)';
  const TEXT_COLOR = '#94a3b8';

  const defaultOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        labels: { font: { ...CHART_FONT, size: 12 }, color: TEXT_COLOR, padding: 16, usePointStyle: true, pointStyleWidth: 10 }
      },
      tooltip: {
        backgroundColor: 'rgba(17, 24, 39, 0.95)',
        titleFont: { ...CHART_FONT, size: 13 },
        bodyFont: { ...CHART_FONT, size: 12 },
        padding: 12,
        cornerRadius: 8,
        borderColor: 'rgba(16, 185, 129, 0.2)',
        borderWidth: 1,
        callbacks: {
          label: (ctx) => {
            const val = ctx.parsed.y ?? ctx.parsed;
            return ` ${ctx.dataset.label || ''}: $${typeof val === 'number' ? val.toLocaleString('en-US', { minimumFractionDigits: 2 }) : val}`;
          }
        }
      }
    },
    scales: {
      x: { ticks: { font: { ...CHART_FONT, size: 11 }, color: TEXT_COLOR }, grid: { color: GRID_COLOR } },
      y: { ticks: { font: { ...CHART_FONT, size: 11 }, color: TEXT_COLOR, callback: (v) => '$' + v.toLocaleString() }, grid: { color: GRID_COLOR } }
    }
  };

  /**
   * Income vs Expenses bar chart
   */
  function renderIncomeExpense(canvasId, monthlyData, t) {
    const ctx = document.getElementById(canvasId);
    if (!ctx) return;

    if (incomeExpenseChart) incomeExpenseChart.destroy();

    incomeExpenseChart = new Chart(ctx, {
      type: 'bar',
      data: {
        labels: monthlyData.map(m => formatMonth(m.month)),
        datasets: [
          {
            label: t ? t('charts.income', 'Income') : 'Income',
            data: monthlyData.map(m => m.income),
            backgroundColor: 'rgba(16, 185, 129, 0.7)',
            borderColor: '#10b981',
            borderWidth: 1,
            borderRadius: 4
          },
          {
            label: t ? t('charts.expenses', 'Expenses') : 'Expenses',
            data: monthlyData.map(m => m.expenses),
            backgroundColor: 'rgba(239, 68, 68, 0.7)',
            borderColor: '#ef4444',
            borderWidth: 1,
            borderRadius: 4
          }
        ]
      },
      options: { ...defaultOptions, plugins: { ...defaultOptions.plugins, title: { display: false } } }
    });
  }

  /**
   * Category doughnut chart
   */
  function renderCategories(canvasId, categoryStats, t) {
    const ctx = document.getElementById(canvasId);
    if (!ctx) return;

    if (categoryChart) categoryChart.destroy();

    const entries = Object.entries(categoryStats)
      .filter(([cat]) => !['salary', 'freelance', 'investment'].includes(cat))
      .sort(([, a], [, b]) => b.total - a.total)
      .slice(0, 8);

    categoryChart = new Chart(ctx, {
      type: 'doughnut',
      data: {
        labels: entries.map(([cat]) => {
          const label = t ? t(`categories.${cat}`, cat) : cat;
          return label.charAt(0).toUpperCase() + label.slice(1);
        }),
        datasets: [{
          data: entries.map(([, d]) => Math.round(d.total * 100) / 100),
          backgroundColor: entries.map(([, d]) => d.color + 'cc'),
          borderColor: entries.map(([, d]) => d.color),
          borderWidth: 2,
          hoverOffset: 8
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        cutout: '65%',
        plugins: {
          legend: { position: 'right', labels: { font: { ...CHART_FONT, size: 11 }, color: TEXT_COLOR, padding: 8, usePointStyle: true } },
          tooltip: {
            ...defaultOptions.plugins.tooltip,
            callbacks: {
              label: (ctx) => ` ${ctx.label}: $${ctx.parsed.toLocaleString('en-US', { minimumFractionDigits: 2 })}`
            }
          }
        }
      }
    });
  }

  /**
   * Forecast line chart with confidence bands
   */
  function renderForecast(canvasId, monthlyData, forecastResult, t) {
    const ctx = document.getElementById(canvasId);
    if (!ctx) return;

    if (forecastChart) forecastChart.destroy();

    const allMonths = [...monthlyData.map(m => formatMonth(m.month)), ...forecastResult.predictions.map(p => formatMonth(p.month))];
    const actualNet = monthlyData.map(m => m.net);
    const predictedNet = [...new Array(monthlyData.length).fill(null), ...forecastResult.predictions.map(p => p.net)];
    const upperBound = [...new Array(monthlyData.length).fill(null), ...forecastResult.predictions.map(p => p.confidence.net.high)];
    const lowerBound = [...new Array(monthlyData.length).fill(null), ...forecastResult.predictions.map(p => p.confidence.net.low)];

    // Connect actual to predicted
    if (actualNet.length > 0 && forecastResult.predictions.length > 0) {
      predictedNet[actualNet.length - 1] = actualNet[actualNet.length - 1];
      upperBound[actualNet.length - 1] = actualNet[actualNet.length - 1];
      lowerBound[actualNet.length - 1] = actualNet[actualNet.length - 1];
    }

    forecastChart = new Chart(ctx, {
      type: 'line',
      data: {
        labels: allMonths,
        datasets: [
          {
            label: t ? t('charts.actualFlow', 'Actual Cash Flow') : 'Actual Cash Flow',
            data: actualNet,
            borderColor: '#10b981',
            backgroundColor: 'rgba(16, 185, 129, 0.1)',
            fill: true,
            tension: 0.3,
            pointRadius: 4,
            pointHoverRadius: 6,
            borderWidth: 2
          },
          {
            label: t ? t('charts.predicted', 'Predicted') : 'Predicted',
            data: predictedNet,
            borderColor: '#6366f1',
            borderDash: [6, 3],
            tension: 0.3,
            pointRadius: 5,
            pointHoverRadius: 7,
            borderWidth: 2,
            pointBackgroundColor: '#6366f1'
          },
          {
            label: t ? t('charts.upperBound', 'Upper Bound (95%)') : 'Upper Bound (95%)',
            data: upperBound,
            borderColor: 'rgba(99, 102, 241, 0.2)',
            backgroundColor: 'rgba(99, 102, 241, 0.08)',
            fill: '+1',
            tension: 0.3,
            pointRadius: 0,
            borderWidth: 1
          },
          {
            label: t ? t('charts.lowerBound', 'Lower Bound (95%)') : 'Lower Bound (95%)',
            data: lowerBound,
            borderColor: 'rgba(99, 102, 241, 0.2)',
            tension: 0.3,
            pointRadius: 0,
            borderWidth: 1
          }
        ]
      },
      options: {
        ...defaultOptions,
        plugins: {
          ...defaultOptions.plugins,
          annotation: {
            annotations: {
              zeroLine: { type: 'line', yMin: 0, yMax: 0, borderColor: 'rgba(239, 68, 68, 0.3)', borderWidth: 1, borderDash: [4, 4] }
            }
          }
        }
      }
    });
  }

  function formatMonth(monthStr) {
    if (!monthStr) return '';
    const [y, m] = monthStr.split('-');
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${months[parseInt(m) - 1]} ${y.slice(2)}`;
  }

  function destroyAll() {
    if (incomeExpenseChart) { incomeExpenseChart.destroy(); incomeExpenseChart = null; }
    if (categoryChart) { categoryChart.destroy(); categoryChart = null; }
    if (forecastChart) { forecastChart.destroy(); forecastChart = null; }
  }

  return { renderIncomeExpense, renderCategories, renderForecast, destroyAll, formatMonth };
})();

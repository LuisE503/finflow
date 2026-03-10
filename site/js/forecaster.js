/**
 * FinFlow — Cash Flow Forecaster
 * Lightweight ML: Holt-Winters Exponential Smoothing + Trend Decomposition
 * Runs entirely in the browser — no backend needed
 */
const Forecaster = (() => {
  'use strict';

  /**
   * Simple Moving Average
   */
  function sma(data, window) {
    if (data.length < window) return data.slice();
    const result = [];
    for (let i = 0; i < data.length; i++) {
      if (i < window - 1) { result.push(null); continue; }
      let sum = 0;
      for (let j = i - window + 1; j <= i; j++) sum += data[j];
      result.push(sum / window);
    }
    return result;
  }

  /**
   * Exponential Smoothing (Simple)
   */
  function exponentialSmoothing(data, alpha) {
    if (data.length === 0) return [];
    const result = [data[0]];
    for (let i = 1; i < data.length; i++) {
      result.push(alpha * data[i] + (1 - alpha) * result[i - 1]);
    }
    return result;
  }

  /**
   * Double Exponential Smoothing (Holt's Method)
   * Captures level + trend
   */
  function holtSmoothing(data, alpha, beta) {
    if (data.length < 2) return { level: data.slice(), trend: [0], fitted: data.slice() };

    const level = [data[0]];
    const trend = [data[1] - data[0]];
    const fitted = [data[0]];

    for (let i = 1; i < data.length; i++) {
      const newLevel = alpha * data[i] + (1 - alpha) * (level[i - 1] + trend[i - 1]);
      const newTrend = beta * (newLevel - level[i - 1]) + (1 - beta) * trend[i - 1];
      level.push(newLevel);
      trend.push(newTrend);
      fitted.push(newLevel);
    }

    return { level, trend, fitted };
  }

  /**
   * Triple Exponential Smoothing (Holt-Winters with additive seasonality)
   */
  function holtWinters(data, alpha, beta, gamma, seasonLength) {
    if (data.length < seasonLength * 2) {
      // Fall back to Holt if not enough data for seasonality
      return holtSmoothing(data, alpha, beta);
    }

    // Initialize seasonal indices from first season
    const seasonal = [];
    const firstSeasonAvg = data.slice(0, seasonLength).reduce((s, v) => s + v, 0) / seasonLength;
    for (let i = 0; i < seasonLength; i++) {
      seasonal.push(data[i] - firstSeasonAvg);
    }

    const level = [firstSeasonAvg];
    const trend = [(data[seasonLength] - data[0]) / seasonLength];
    const fitted = [data[0]];

    for (let i = 1; i < data.length; i++) {
      const sIdx = i % seasonLength;
      const prevSeasonal = seasonal[sIdx];

      const newLevel = alpha * (data[i] - prevSeasonal) + (1 - alpha) * (level[i - 1] + trend[i - 1]);
      const newTrend = beta * (newLevel - level[i - 1]) + (1 - beta) * trend[i - 1];
      seasonal[sIdx] = gamma * (data[i] - newLevel) + (1 - gamma) * prevSeasonal;

      level.push(newLevel);
      trend.push(newTrend);
      fitted.push(newLevel + seasonal[sIdx]);
    }

    return { level, trend, seasonal, fitted, seasonLength };
  }

  /**
   * Linear Regression for trend extraction
   */
  function linearRegression(data) {
    const n = data.length;
    let sumX = 0, sumY = 0, sumXY = 0, sumX2 = 0;
    for (let i = 0; i < n; i++) {
      sumX += i; sumY += data[i];
      sumXY += i * data[i]; sumX2 += i * i;
    }
    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    const intercept = (sumY - slope * sumX) / n;
    return { slope, intercept };
  }

  /**
   * Mean Absolute Percentage Error
   */
  function mape(actual, predicted) {
    let sum = 0, count = 0;
    for (let i = 0; i < actual.length; i++) {
      if (predicted[i] !== null && actual[i] !== 0) {
        sum += Math.abs((actual[i] - predicted[i]) / actual[i]);
        count++;
      }
    }
    return count > 0 ? (sum / count * 100) : Infinity;
  }

  /**
   * Calculate standard deviation of residuals for confidence intervals
   */
  function residualStdDev(actual, predicted) {
    let sumSq = 0, count = 0;
    for (let i = 0; i < actual.length; i++) {
      if (predicted[i] !== null) {
        sumSq += Math.pow(actual[i] - predicted[i], 2);
        count++;
      }
    }
    return count > 1 ? Math.sqrt(sumSq / (count - 1)) : 0;
  }

  /**
   * Auto-optimize smoothing parameters using grid search
   */
  function optimizeParams(data, seasonLength) {
    let bestMAPE = Infinity;
    let bestParams = { alpha: 0.3, beta: 0.1, gamma: 0.1 };

    const grid = [0.1, 0.2, 0.3, 0.5, 0.7, 0.9];

    // Try Holt-Winters if enough data
    if (data.length >= seasonLength * 2) {
      for (const alpha of grid) {
        for (const beta of [0.05, 0.1, 0.2, 0.3]) {
          for (const gamma of [0.05, 0.1, 0.2, 0.3]) {
            const result = holtWinters(data, alpha, beta, gamma, seasonLength);
            const error = mape(data, result.fitted);
            if (error < bestMAPE) {
              bestMAPE = error;
              bestParams = { alpha, beta, gamma, method: 'holt-winters' };
            }
          }
        }
      }
    } else {
      // Holt only
      for (const alpha of grid) {
        for (const beta of [0.05, 0.1, 0.2, 0.3, 0.5]) {
          const result = holtSmoothing(data, alpha, beta);
          const error = mape(data, result.fitted);
          if (error < bestMAPE) {
            bestMAPE = error;
            bestParams = { alpha, beta, method: 'holt' };
          }
        }
      }
    }

    return { ...bestParams, mape: bestMAPE };
  }

  /**
   * Generate forecast for N months ahead
   */
  function forecast(monthlyData, months = 3) {
    if (monthlyData.length < 3) {
      return { predictions: [], confidence: 0, method: 'insufficient-data', recommendations: [] };
    }

    const incomeData = monthlyData.map(m => m.income);
    const expenseData = monthlyData.map(m => m.expenses);
    const netData = monthlyData.map(m => m.net);
    const seasonLength = Math.min(12, Math.floor(monthlyData.length / 2));

    // Optimize parameters
    const incomeParams = optimizeParams(incomeData, seasonLength);
    const expenseParams = optimizeParams(expenseData, seasonLength);

    // Fit models
    let incomeModel, expenseModel;
    if (incomeParams.method === 'holt-winters') {
      incomeModel = holtWinters(incomeData, incomeParams.alpha, incomeParams.beta, incomeParams.gamma, seasonLength);
    } else {
      incomeModel = holtSmoothing(incomeData, incomeParams.alpha, incomeParams.beta);
    }

    if (expenseParams.method === 'holt-winters') {
      expenseModel = holtWinters(expenseData, expenseParams.alpha, expenseParams.beta, expenseParams.gamma, seasonLength);
    } else {
      expenseModel = holtSmoothing(expenseData, expenseParams.alpha, expenseParams.beta);
    }

    // Calculate residual std dev for confidence intervals
    const incomeStdDev = residualStdDev(incomeData, incomeModel.fitted);
    const expenseStdDev = residualStdDev(expenseData, expenseModel.fitted);

    // Produce predictions
    const predictions = [];
    const lastMonth = monthlyData[monthlyData.length - 1].month;

    for (let i = 1; i <= months; i++) {
      const lastLevel_i = incomeModel.level[incomeModel.level.length - 1];
      const lastTrend_i = incomeModel.trend[incomeModel.trend.length - 1];
      let incomePred = lastLevel_i + lastTrend_i * i;
      if (incomeModel.seasonal) {
        const sIdx = (incomeData.length + i - 1) % seasonLength;
        incomePred += incomeModel.seasonal[sIdx];
      }

      const lastLevel_e = expenseModel.level[expenseModel.level.length - 1];
      const lastTrend_e = expenseModel.trend[expenseModel.trend.length - 1];
      let expensePred = lastLevel_e + lastTrend_e * i;
      if (expenseModel.seasonal) {
        const sIdx = (expenseData.length + i - 1) % seasonLength;
        expensePred += expenseModel.seasonal[sIdx];
      }

      // Ensure non-negative
      incomePred = Math.max(0, incomePred);
      expensePred = Math.max(0, expensePred);

      const netPred = incomePred - expensePred;
      const widening = 1 + (i - 1) * 0.3; // Confidence interval widens over time

      // Compute month label
      const [y, m] = lastMonth.split('-').map(Number);
      const futureDate = new Date(y, m - 1 + i, 1);
      const monthLabel = `${futureDate.getFullYear()}-${String(futureDate.getMonth() + 1).padStart(2, '0')}`;

      predictions.push({
        month: monthLabel,
        income: Math.round(incomePred * 100) / 100,
        expenses: Math.round(expensePred * 100) / 100,
        net: Math.round(netPred * 100) / 100,
        confidence: {
          income: { low: Math.max(0, Math.round((incomePred - 1.96 * incomeStdDev * widening) * 100) / 100), high: Math.round((incomePred + 1.96 * incomeStdDev * widening) * 100) / 100 },
          expenses: { low: Math.max(0, Math.round((expensePred - 1.96 * expenseStdDev * widening) * 100) / 100), high: Math.round((expensePred + 1.96 * expenseStdDev * widening) * 100) / 100 },
          net: { low: Math.round((netPred - 1.96 * (incomeStdDev + expenseStdDev) * widening) * 100) / 100, high: Math.round((netPred + 1.96 * (incomeStdDev + expenseStdDev) * widening) * 100) / 100 }
        }
      });
    }

    // Overall confidence (100 - MAPE, clamped)
    const avgMAPE = (incomeParams.mape + expenseParams.mape) / 2;
    const confidence = Math.max(10, Math.min(95, Math.round(100 - avgMAPE)));

    // Generate recommendations
    const recommendations = generateRecommendations(monthlyData, predictions);

    return {
      predictions,
      confidence,
      method: incomeParams.method === 'holt-winters' ? 'Holt-Winters' : 'Holt Double Exponential',
      incomeFitted: incomeModel.fitted,
      expenseFitted: expenseModel.fitted,
      params: { income: incomeParams, expense: expenseParams },
      recommendations
    };
  }

  /**
   * Generate spending recommendations based on trends
   */
  function generateRecommendations(monthlyData, predictions) {
    const recs = [];
    const recent = monthlyData.slice(-3);

    // Trend analysis on expenses
    const expenseTrend = linearRegression(recent.map(m => m.expenses));
    if (expenseTrend.slope > 0) {
      recs.push({ type: 'warning', icon: '📈', key: 'rec.expenseRising', fallback: 'Your expenses are trending upward. Consider reviewing discretionary spending.' });
    }

    // Savings rate
    const avgIncome = recent.reduce((s, m) => s + m.income, 0) / recent.length;
    const avgExpenses = recent.reduce((s, m) => s + m.expenses, 0) / recent.length;
    const savingsRate = avgIncome > 0 ? (avgIncome - avgExpenses) / avgIncome : 0;

    if (savingsRate < 0.1) {
      recs.push({ type: 'alert', icon: '🚨', key: 'rec.lowSavings', fallback: 'Your savings rate is below 10%. Aim for at least 20% to build a safety net.' });
    } else if (savingsRate > 0.3) {
      recs.push({ type: 'positive', icon: '🌟', key: 'rec.greatSavings', fallback: 'Excellent savings rate! Consider investing your surplus for long-term growth.' });
    }

    // Negative forecast
    if (predictions.length > 0 && predictions.some(p => p.net < 0)) {
      const negMonth = predictions.find(p => p.net < 0);
      recs.push({ type: 'alert', icon: '⚠️', key: 'rec.negativeFlow', fallback: `Cash flow may go negative in ${negMonth.month}. Plan ahead by cutting non-essential expenses.` });
    }

    // Emergency fund check (3 months of expenses)
    const emergencyTarget = avgExpenses * 3;
    recs.push({ type: 'info', icon: '🏦', key: 'rec.emergencyFund', fallback: `Recommended emergency fund: $${Math.round(emergencyTarget).toLocaleString()} (3 months of expenses).` });

    return recs;
  }

  return { forecast, sma, exponentialSmoothing, holtSmoothing, holtWinters, linearRegression, mape, optimizeParams, residualStdDev, generateRecommendations };
})();

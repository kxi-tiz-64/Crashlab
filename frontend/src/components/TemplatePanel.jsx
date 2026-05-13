import React from 'react';

export const STRATEGY_TEMPLATES = {
  rsi: {
    label: 'RSI',
    name: 'RSI (14-period)',
    description: 'Buys oversold RSI below 30 and sells overbought RSI above 70.',
    bestFor: 'Range-bound markets with clear overbought/oversold swings',
    risk: 'Can enter early during strong trends or crash continuations.',
    code: `# RSI (14-period) Oversold/Overbought Strategy
if index >= 14:
    gains = []
    losses = []
    for i in range(index - 13, index + 1):
        diff = ohlcv[i]['close'] - ohlcv[i-1]['close']
        if diff > 0:
            gains.append(diff)
        else:
            losses.append(abs(diff))
    avg_gain = sum(gains) / 14 if gains else 0
    avg_loss = sum(losses) / 14 if losses else 0
    rs = avg_gain / avg_loss if avg_loss > 0 else 100
    rsi = 100 - (100 / (1 + rs))
    if rsi < 30 and position['qty'] == 0:
        buy()
    elif rsi > 70 and position['qty'] > 0:
        sell()
`,
  },
  ma_crossover: {
    label: 'MA Crossover',
    name: '5/20 MA Crossover',
    description: 'Buys when the 5-day average crosses above the 20-day average.',
    bestFor: 'Trend-following after direction changes',
    risk: 'Can whipsaw in sideways markets.',
    code: `# 5/20 Day Moving Average Crossover
if index >= 20:
    short_ma = sum(ohlcv[i]['close'] for i in range(index-4, index+1)) / 5
    long_ma = sum(ohlcv[i]['close'] for i in range(index-19, index+1)) / 20
    if short_ma > long_ma and position['qty'] == 0:
        buy()
    elif short_ma < long_ma and position['qty'] > 0:
        sell()
`,
  },
  bollinger: {
    label: 'Bollinger Bands',
    name: 'Bollinger Bands (20,2)',
    description: 'Buys near the lower band and exits near the upper band.',
    bestFor: 'Mean-reverting ranges with volatility expansion',
    risk: 'Can catch falling knives during panic selloffs.',
    code: `# Bollinger Bands (20,2) Mean Reversion
if index >= 20:
    closes = [ohlcv[i]['close'] for i in range(index-19, index+1)]
    sma = sum(closes) / 20
    squared_diff_sum = 0
    for close_price in closes:
        squared_diff_sum = squared_diff_sum + ((close_price - sma) ** 2)
    variance = squared_diff_sum / 20
    std = variance ** 0.5
    upper = sma + 2 * std
    lower = sma - 2 * std
    if row['close'] <= lower and position['qty'] == 0:
        buy()
    elif row['close'] >= upper and position['qty'] > 0:
        sell()
`,
  },
  macd: {
    label: 'MACD',
    name: 'MACD Momentum',
    description: 'Uses 12/26-period averages with a 9-period signal line.',
    bestFor: 'Momentum shifts after sustained moves',
    risk: 'Lagging signal; may react late during flash crashes.',
    code: `# MACD (12,26,9) Momentum Strategy
if index >= 35:
    short_window = [ohlcv[i]['close'] for i in range(index-11, index+1)]
    long_window = [ohlcv[i]['close'] for i in range(index-25, index+1)]
    short_ma = sum(short_window) / 12
    long_ma = sum(long_window) / 26
    macd = short_ma - long_ma

    signal_values = []
    for j in range(index-8, index+1):
        s = sum(ohlcv[i]['close'] for i in range(j-11, j+1)) / 12
        l = sum(ohlcv[i]['close'] for i in range(j-25, j+1)) / 26
        signal_values.append(s - l)
    signal_line = sum(signal_values) / 9

    if macd > signal_line and position['qty'] == 0:
        buy()
    elif macd < signal_line and position['qty'] > 0:
        sell()
`,
  },
  momentum: {
    label: 'Momentum',
    name: '10-Day Momentum',
    description: 'Buys when 10-day momentum is positive and exits when it turns negative.',
    bestFor: 'Directional continuation after breakouts',
    risk: 'Sensitive to abrupt reversals and false breakouts.',
    code: `# 10-Day Momentum Strategy
if index >= 10:
    momentum = row['close'] - ohlcv[index-10]['close']
    momentum_pct = momentum / ohlcv[index-10]['close']

    if momentum_pct > 0.03 and position['qty'] == 0:
        buy()
    elif momentum_pct < -0.02 and position['qty'] > 0:
        sell()
`,
  },
  mean_reversion: {
    label: 'Mean Reversion',
    name: 'Mean Reversion',
    description: 'Buys when price is below a 20-day mean and exits above it.',
    bestFor: 'Sideways markets and overextended crash rebounds',
    risk: 'Can underperform persistent trends.',
    code: `# Mean Reversion Strategy
if index >= 20:
    closes = [ohlcv[i]['close'] for i in range(index-19, index+1)]
    mean_price = sum(closes) / 20
    distance = (row['close'] - mean_price) / mean_price

    if distance < -0.03 and position['qty'] == 0:
        buy()
    elif distance > 0.02 and position['qty'] > 0:
        sell()
`,
  },
  adaptive_regime: {
    label: 'Adaptive Regime Agent',
    name: 'Adaptive Regime Agent',
    description: 'Automatically switches between mean reversion in calm markets and crash-resilient defense in volatile markets.',
    bestFor: 'Changing volatility regimes and sudden crash risk',
    risk: 'May stay defensive too long during fast recoveries.',
    code: `# Adaptive Regime Agent
if index >= 20:
    returns = []
    for i in range(index - 19, index + 1):
        prev_close = ohlcv[i - 1]['close'] if i - 1 >= 0 else 0
        if prev_close != 0:
            returns.append((ohlcv[i]['close'] - prev_close) / prev_close)

    if len(returns) > 0:
        mean_ret = sum(returns) / len(returns)
        sq_diff_sum = 0
        for r in returns:
            sq_diff_sum = sq_diff_sum + (r - mean_ret) ** 2
        vol = (sq_diff_sum / len(returns)) ** 0.5
        threshold = 0.02

        if vol > threshold:
            # Crash-resilient mode: defensive exits and no new risk.
            if position['qty'] > 0 and row['close'] < ohlcv[index - 1]['close'] * 0.95:
                sell()
        else:
            closes = [ohlcv[i]['close'] for i in range(index - 19, index + 1)]
            sma = sum(closes) / 20
            if row['close'] < sma * 0.98 and position['qty'] == 0:
                buy()
            elif row['close'] > sma * 1.02 and position['qty'] > 0:
                sell()
`,
  },
};

export const DEFAULT_TEMPLATE_KEY = 'mean_reversion';
export const DEFAULT_TEMPLATE_CODE = STRATEGY_TEMPLATES[DEFAULT_TEMPLATE_KEY].code;

function TemplatePanel({ onSelectTemplate, activeKey = DEFAULT_TEMPLATE_KEY, compact = false }) {
  return (
    <div style={{
      backgroundColor: '#f8f9fa',
      border: '1px solid #dee2e6',
      borderRadius: '8px',
      padding: compact ? '12px' : '15px',
      marginBottom: '15px',
    }}>
      <div style={{ fontWeight: 'bold', marginBottom: '10px' }}>Strategy Templates</div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
        {Object.entries(STRATEGY_TEMPLATES).map(([key, template]) => (
          <button
            key={key}
            type="button"
            onClick={() => onSelectTemplate(key, template)}
            title={`${template.description} Best for: ${template.bestFor}. Risk: ${template.risk}`}
            style={{
              border: activeKey === key ? '2px solid #007bff' : '1px solid #ced4da',
              backgroundColor: activeKey === key ? '#e7f3ff' : '#fff',
              color: '#007bff',
              padding: '8px 12px',
              borderRadius: '4px',
              cursor: 'pointer',
              fontWeight: 500,
            }}
          >
            {template.label}
          </button>
        ))}
      </div>
    </div>
  );
}

export default TemplatePanel;

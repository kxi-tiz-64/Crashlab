import React, { useState } from 'react';

function formatPct(value) {
  return `${(Number(value || 0) * 100).toFixed(2)}%`;
}

function formatChange(value) {
  const number = Number(value || 0);
  return `${number >= 0 ? '+' : ''}${number.toFixed(1)}%`;
}

function ImpactCard({ impact }) {
  const [expanded, setExpanded] = useState(true);

  if (!impact) {
    return null;
  }

  const rows = [
    {
      label: 'Volatility (daily)',
      original: formatPct(impact.original_volatility),
      crashed: formatPct(impact.crash_volatility),
      change: formatChange(impact.volatility_change_pct),
      riskyIncrease: Number(impact.volatility_change_pct) > 0,
    },
    {
      label: 'Avg Daily Return',
      original: formatPct(impact.original_avg_return),
      crashed: formatPct(impact.crash_avg_return),
      change: formatChange(impact.return_change_pct),
      riskyIncrease: Number(impact.return_change_pct) < 0,
    },
  ];

  return (
    <div style={{
      borderRadius: '8px',
      boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
      borderLeft: '4px solid #dc3545',
      marginTop: '20px',
      overflow: 'hidden',
    }} className="bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 transition-colors">
      <button
        type="button"
        onClick={() => setExpanded(!expanded)}
        style={{
          width: '100%',
          padding: '15px 20px',
          border: 'none',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          cursor: 'pointer',
          fontWeight: 'bold',
        }}
        className="bg-white dark:bg-slate-800 text-slate-800 dark:text-white hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
      >
        <span>Attack Impact Analysis</span>
        <span style={{ color: '#007bff' }}>{expanded ? 'Hide' : 'Show'}</span>
      </button>

      {expanded && (
        <div className="table-container" style={{ margin: 0, padding: '0 20px 20px' }}>
          <table>
            <thead>
              <tr className="border-b border-slate-100 dark:border-slate-700">
                <th className="dark:text-slate-200 text-left py-3">Metric</th>
                <th className="dark:text-slate-200 text-right py-3">Original</th>
                <th className="dark:text-slate-200 text-right py-3">Crashed</th>
                <th className="dark:text-slate-200 text-right py-3">Change</th>
              </tr>
            </thead>
            <tbody>
              {rows.map(row => (
                <tr key={row.label} className="border-b border-slate-50 dark:border-slate-800/50 last:border-0">
                  <td className="dark:text-slate-300 py-3">{row.label}</td>
                  <td className="dark:text-slate-300 text-right py-3">{row.original}</td>
                  <td className="dark:text-slate-300 text-right py-3">{row.crashed}</td>
                  <td style={{
                    color: row.riskyIncrease ? '#dc3545' : '#28a745',
                    fontWeight: 'bold',
                  }} className="text-right py-3">
                    {row.change}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default ImpactCard;

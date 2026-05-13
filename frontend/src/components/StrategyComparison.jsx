import React, { useMemo, useState } from 'react';
import Editor from '@monaco-editor/react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import apiClient from '../api/apiClient';
import TemplatePanel, { DEFAULT_TEMPLATE_CODE, DEFAULT_TEMPLATE_KEY, STRATEGY_TEMPLATES } from './TemplatePanel';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Title,
  Tooltip,
  Legend
);

const COLORS = [
  'rgb(0, 123, 255)',
  'rgb(220, 53, 69)',
  'rgb(40, 167, 69)',
  'rgb(255, 193, 7)',
  'rgb(111, 66, 193)',
];

function metricValue(result, key) {
  const metrics = result.backtest?.metrics || {};
  return Number(metrics[key] ?? 0);
}

function formatMoney(value) {
  return `Rs.${Number(value || 0).toLocaleString(undefined, { maximumFractionDigits: 2 })}`;
}

function StrategyComparison({ ohlcvData }) {
  const [strategies, setStrategies] = useState([
    { id: 1, name: 'Strategy 1', code: DEFAULT_TEMPLATE_CODE, templateKey: DEFAULT_TEMPLATE_KEY, collapsed: false },
    { id: 2, name: 'Strategy 2', code: STRATEGY_TEMPLATES.rsi.code, templateKey: 'rsi', collapsed: false },
  ]);
  const [activeId, setActiveId] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [results, setResults] = useState([]);
  const [sortKey, setSortKey] = useState('total_pnl');
  const [sortDirection, setSortDirection] = useState('desc');
  const [visibleCurves, setVisibleCurves] = useState({});

  const addStrategy = () => {
    if (strategies.length >= 5) return;
    const nextId = Math.max(...strategies.map(strategy => strategy.id)) + 1;
    setStrategies([
      ...strategies,
      {
        id: nextId,
        name: `Strategy ${nextId}`,
        code: DEFAULT_TEMPLATE_CODE,
        templateKey: DEFAULT_TEMPLATE_KEY,
        collapsed: false,
      },
    ]);
    setActiveId(nextId);
  };

  const updateStrategy = (id, patch) => {
    setStrategies(current => current.map(strategy => (
      strategy.id === id ? { ...strategy, ...patch } : strategy
    )));
  };

  const applyTemplate = (templateKey, template) => {
    updateStrategy(activeId, { code: template.code, templateKey });
  };

  const runComparison = async () => {
    setLoading(true);
    setError(null);
    setResults([]);

    try {
      const response = await apiClient.post('/compare_strategies', {
        ohlcv: ohlcvData,
        strategies: strategies.map(strategy => ({
          id: strategy.id,
          name: strategy.name,
          code: strategy.code,
        })),
        settings: {
          initial_capital: 100000,
          slippage_pct: 0.001,
          fee_pct: 0.00025,
        },
      });

      if (response.data.error) {
        setError(response.data.message || 'Failed to compare strategies');
        return;
      }

      setResults(response.data.results || []);
      const nextVisible = {};
      (response.data.results || []).forEach(result => {
        if (!result.error) nextVisible[result.id] = true;
      });
      setVisibleCurves(nextVisible);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to compare strategies');
    } finally {
      setLoading(false);
    }
  };

  const successfulResults = results.filter(result => !result.error && result.backtest);

  const bestValues = useMemo(() => {
    if (!successfulResults.length) return {};
    return {
      total_pnl: Math.max(...successfulResults.map(result => metricValue(result, 'total_pnl'))),
      max_drawdown: Math.max(...successfulResults.map(result => metricValue(result, 'max_drawdown'))),
      win_rate: Math.max(...successfulResults.map(result => metricValue(result, 'win_rate'))),
      num_trades: Math.max(...successfulResults.map(result => metricValue(result, 'num_trades'))),
      final_capital: Math.max(...successfulResults.map(result => metricValue(result, 'final_capital'))),
    };
  }, [successfulResults]);

  const sortedResults = useMemo(() => {
    const sorted = [...results];
    sorted.sort((a, b) => {
      if (a.error && !b.error) return 1;
      if (!a.error && b.error) return -1;
      const aValue = sortKey === 'name' ? a.name : metricValue(a, sortKey);
      const bValue = sortKey === 'name' ? b.name : metricValue(b, sortKey);
      if (aValue < bValue) return sortDirection === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
    return sorted;
  }, [results, sortKey, sortDirection]);

  const handleSort = (key) => {
    if (sortKey === key) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDirection(key === 'name' ? 'asc' : 'desc');
    }
  };

  const chartData = useMemo(() => {
    const labels = ohlcvData?.map(row => row.date) || [];
    return {
      labels,
      datasets: successfulResults
        .filter(result => visibleCurves[result.id])
        .map((result, idx) => ({
          label: result.name,
          data: result.backtest.equity_curve.map(point => point.equity),
          borderColor: COLORS[idx % COLORS.length],
          backgroundColor: COLORS[idx % COLORS.length].replace('rgb', 'rgba').replace(')', ', 0.1)'),
          borderWidth: 2,
          pointRadius: 0,
          tension: 0.1,
        })),
    };
  }, [ohlcvData, successfulResults, visibleCurves]);

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: 'top' },
      title: { display: true, text: 'Multi-Strategy Equity Curve' },
      tooltip: {
        callbacks: {
          label: context => `${context.dataset.label}: Rs.${context.parsed.y.toLocaleString()}`,
        },
      },
    },
    scales: {
      x: { title: { display: true, text: 'Date' }, ticks: { maxRotation: 45, minRotation: 45 } },
      y: {
        title: { display: true, text: 'Equity (Rs.)' },
        ticks: { callback: value => `Rs.${Number(value).toLocaleString()}` },
      },
    },
    animation: { duration: 800, easing: 'easeOutQuart' },
  };

  const highlightStyle = (result, key) => {
    if (result.error || !result.backtest) return {};
    return metricValue(result, key) === bestValues[key]
      ? { backgroundColor: '#d4edda', fontWeight: 'bold' }
      : {};
  };

  return (
    <div style={{
      marginTop: '40px',
      padding: '20px',
      borderRadius: '8px',
      backgroundColor: '#f8f9fa',
      border: '1px solid #dee2e6',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '15px', alignItems: 'center', marginBottom: '15px' }}>
        <div>
          <h3 style={{ margin: 0 }}>Strategy Comparison Mode</h3>
          <p style={{ color: '#666', marginTop: '5px' }}>Compare up to 5 strategies on the same crash dataset.</p>
        </div>
        <button className="button" onClick={runComparison} disabled={loading || !ohlcvData?.length}>
          {loading ? 'Comparing...' : 'Compare Strategies'}
        </button>
      </div>

      <TemplatePanel
        activeKey={strategies.find(strategy => strategy.id === activeId)?.templateKey}
        onSelectTemplate={applyTemplate}
        compact
      />

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '15px' }}>
        {strategies.map(strategy => (
          <div
            key={strategy.id}
            onFocus={() => setActiveId(strategy.id)}
            style={{
              backgroundColor: '#fff',
              border: activeId === strategy.id ? '2px solid #007bff' : '1px solid #dee2e6',
              borderRadius: '8px',
              overflow: 'hidden',
            }}
          >
            <div style={{ padding: '10px', display: 'flex', gap: '8px', alignItems: 'center', borderBottom: '1px solid #dee2e6' }}>
              <input
                value={strategy.name}
                onChange={(event) => updateStrategy(strategy.id, { name: event.target.value })}
                style={{ flex: 1, padding: '8px', border: '1px solid #ced4da', borderRadius: '4px', fontWeight: 'bold' }}
              />
              <button
                type="button"
                onClick={() => updateStrategy(strategy.id, { collapsed: !strategy.collapsed })}
                style={{ padding: '8px 10px', border: '1px solid #ced4da', background: '#fff', borderRadius: '4px', cursor: 'pointer' }}
              >
                {strategy.collapsed ? 'Open' : 'Collapse'}
              </button>
            </div>
            {!strategy.collapsed && (
              <Editor
                height="260px"
                defaultLanguage="python"
                value={strategy.code}
                onMount={(editor) => {
                  editor.onDidFocusEditorText(() => setActiveId(strategy.id));
                }}
                onChange={(value) => updateStrategy(strategy.id, { code: value || '' })}
                theme="vs-light"
                options={{
                  minimap: { enabled: false },
                  fontSize: 13,
                  wordWrap: 'on',
                  lineNumbers: 'on',
                  scrollBeyondLastLine: false,
                }}
              />
            )}
            {results.find(result => result.id === strategy.id)?.error && (
              <div style={{ color: '#721c24', backgroundColor: '#f8d7da', padding: '8px 10px', fontSize: '12px' }}>
                ! {results.find(result => result.id === strategy.id).error.slice(0, 120)}
              </div>
            )}
          </div>
        ))}
      </div>

      <button
        type="button"
        onClick={addStrategy}
        disabled={strategies.length >= 5}
        style={{
          marginTop: '15px',
          padding: '10px 16px',
          border: '1px solid #007bff',
          color: '#007bff',
          backgroundColor: '#fff',
          borderRadius: '4px',
          cursor: strategies.length >= 5 ? 'not-allowed' : 'pointer',
        }}
      >
        + Add Strategy
      </button>

      {error && <div className="error-message">{error}</div>}

      {results.length > 0 && (
        <>
          <div className="table-container" style={{ marginTop: '25px' }}>
            <table>
              <thead>
                <tr>
                  <th onClick={() => handleSort('name')} style={{ cursor: 'pointer' }}>Strategy Name</th>
                  <th onClick={() => handleSort('total_pnl')} style={{ cursor: 'pointer' }}>Total PnL</th>
                  <th onClick={() => handleSort('max_drawdown')} style={{ cursor: 'pointer' }}>Max Drawdown</th>
                  <th onClick={() => handleSort('win_rate')} style={{ cursor: 'pointer' }}>Win Rate</th>
                  <th onClick={() => handleSort('num_trades')} style={{ cursor: 'pointer' }}>Trades</th>
                  <th onClick={() => handleSort('final_capital')} style={{ cursor: 'pointer' }}>Final Capital</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {sortedResults.map(result => (
                  <tr key={result.id}>
                    <td>{result.name}</td>
                    {result.error ? (
                      <>
                        <td colSpan="5" style={{ color: '#dc3545' }}>{result.error}</td>
                        <td><span style={{ color: '#dc3545', fontWeight: 'bold' }}>Failed</span></td>
                      </>
                    ) : (
                      <>
                        <td style={highlightStyle(result, 'total_pnl')}>{formatMoney(result.backtest.metrics.total_pnl)}</td>
                        <td style={highlightStyle(result, 'max_drawdown')}>{(result.backtest.metrics.max_drawdown * 100).toFixed(2)}%</td>
                        <td style={highlightStyle(result, 'win_rate')}>{(result.backtest.metrics.win_rate * 100).toFixed(1)}%</td>
                        <td style={highlightStyle(result, 'num_trades')}>{result.backtest.metrics.num_trades}</td>
                        <td style={highlightStyle(result, 'final_capital')}>{formatMoney(result.backtest.metrics.final_capital)}</td>
                        <td><span style={{ color: '#28a745', fontWeight: 'bold' }}>OK</span></td>
                      </>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {successfulResults.length > 0 && (
            <div style={{ marginTop: '25px', backgroundColor: '#fff', padding: '15px', borderRadius: '8px' }}>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', marginBottom: '10px' }}>
                {successfulResults.map(result => (
                  <label key={result.id} style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <input
                      type="checkbox"
                      checked={!!visibleCurves[result.id]}
                      onChange={(event) => setVisibleCurves({ ...visibleCurves, [result.id]: event.target.checked })}
                    />
                    {result.name}
                  </label>
                ))}
              </div>
              <div className="chart-container" style={{ height: '360px' }}>
                <Line data={chartData} options={chartOptions} />
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default StrategyComparison;

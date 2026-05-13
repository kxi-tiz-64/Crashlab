import React, { useMemo, useState } from 'react';
import Editor from '@monaco-editor/react';
import md5 from 'blueimp-md5';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Tooltip,
  Legend,
  Title,
} from 'chart.js';
import apiClient from '../api/apiClient';
import { DEFAULT_TEMPLATE_CODE } from '../components/TemplatePanel';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';
import { useAuth } from '../context/AuthContext';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Tooltip, Legend, Title);

const LEADERBOARD_KEY = 'crashlab_leaderboard';

function RobustnessTestPage() {
  const { user } = useAuth();
  const [strategyName, setStrategyName] = useState('My Strategy');
  const [code, setCode] = useState(DEFAULT_TEMPLATE_CODE);
  const [years, setYears] = useState(1);
  const [isMax, setIsMax] = useState(false);
  const [intensities, setIntensities] = useState([1, 3, 5, 7, 10]);
  const [running, setRunning] = useState(false);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);
  const [isSaved, setIsSaved] = useState(false);

  const runTest = async () => {
    if (intensities.length === 0) {
      setError('Please select at least one intensity');
      return;
    }
    setRunning(true);
    setError('');
    setIsSaved(false);
    try {
      const response = await apiClient.post('/robustness_test', {
        strategy_name: strategyName,
        code,
        years: isMax ? 'max' : years,
        intensities,
        initial_capital: 100000,
      });
      if (response.data.error) {
        setError(response.data.message || 'Failed to run robustness test');
        return;
      }
      setResult(response.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to run robustness test');
    } finally {
      setRunning(false);
    }
  };

  const handleAddToLeaderboard = () => {
    if (result) {
      saveLeaderboard(result, code, strategyName);
      setIsSaved(true);
    }
  };

  const saveLeaderboard = (payload, strategyCode, fallbackName) => {
    const hash = md5(strategyCode || '');
    const entry = {
      strategy_name: payload.strategy_name || fallbackName || 'Unnamed Strategy',
      user_email: user?.email || 'Anonymous',
      score: Number(payload.robustness_score || 0),
      avg_sharpe: Number(payload.score_components?.avg_sharpe || 0),
      avg_sortino: Number(payload.score_components?.avg_sortino || 0),
      avg_calmar: Number(payload.score_components?.avg_calmar || 0),
      timestamp: Math.floor(Date.now() / 1000),
      hash,
    };

    const current = JSON.parse(localStorage.getItem(LEADERBOARD_KEY) || '[]');
    const idx = current.findIndex((item) => item.hash === hash);
    if (idx >= 0) {
      if (entry.score > Number(current[idx].score || 0)) {
        current[idx] = entry;
      }
    } else {
      current.push(entry);
    }
    localStorage.setItem(LEADERBOARD_KEY, JSON.stringify(current));
  };

  const chartData = useMemo(() => {
    const labels = (result?.results?.[0]?.equity_curve || []).map((point) => point.date);
    return {
      labels,
      datasets: (result?.results || []).map((scenario, idx) => ({
        label: scenario.intensity === 0 ? 'Baseline (0)' : `I${scenario.intensity}`,
        data: (scenario.equity_curve || []).map((point) => point.equity),
        borderColor: `hsl(${(idx * 57) % 360}, 70%, 45%)`,
        backgroundColor: `hsla(${(idx * 57) % 360}, 70%, 45%, 0.25)`,
        pointRadius: 0,
        tension: 0.2,
        fill: false,
      })),
    };
  }, [result]);

  return (
    <Card className="page">
      <h2>Robustness Test</h2>
      <p>Stress-test your strategy across multiple crash intensities on historical data.</p>
      
      <div className="form-grid" style={{ marginBottom: '20px' }}>
        <label style={{ display: 'flex', flexDirection: 'column', gap: '5px' }}>
          <strong>Strategy Name</strong>
          <input 
            value={strategyName} 
            onChange={(event) => setStrategyName(event.target.value)}
            style={{ padding: '8px', borderRadius: '4px', border: '1px solid var(--border)', background: 'var(--background)', color: 'var(--foreground)' }}
          />
        </label>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '20px', marginBottom: '20px' }}>
        {/* Years Slider */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '15px', flexWrap: 'wrap' }}>
          <div style={{ fontWeight: 600, minWidth: '80px' }}>Test Period:</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
            <span style={{ fontSize: '14px', minWidth: '80px' }}>
              {isMax ? 'Max (Full)' : `${years} Year${years > 1 ? 's' : ''}`}
            </span>
            <input
              type="range"
              min="1"
              max="20"
              step="1"
              value={years}
              disabled={isMax}
              onChange={(e) => setYears(parseInt(e.target.value, 10))}
              style={{ opacity: isMax ? 0.5 : 1, width: '150px' }}
            />
            <label style={{ display: 'flex', alignItems: 'center', gap: '5px', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={isMax}
                onChange={(e) => setIsMax(e.target.checked)}
              />
              Max
            </label>
          </div>
        </div>

        {/* Intensities Checkboxes */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          <div style={{ fontWeight: 600 }}>Crash Intensities (1-10):</div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '12px', padding: '10px', backgroundColor: 'rgba(128,128,128,0.05)', borderRadius: '6px' }}>
            {[1, 2, 3, 4, 5, 6, 7, 8, 9, 10].map((val) => (
              <label key={val} style={{ display: 'flex', alignItems: 'center', gap: '5px', cursor: 'pointer', fontSize: '14px' }}>
                <input
                  type="checkbox"
                  checked={intensities.includes(val)}
                  onChange={(e) => {
                    if (e.target.checked) setIntensities([...intensities, val].sort((a, b) => a - b));
                    else setIntensities(intensities.filter(v => v !== val));
                  }}
                />
                {val}
              </label>
            ))}
            <Button 
              variant="outline" 
              size="sm" 
              onClick={() => setIntensities(intensities.length === 10 ? [] : [1, 2, 3, 4, 5, 6, 7, 8, 9, 10])}
              style={{ marginLeft: '10px', height: '24px', padding: '0 8px', fontSize: '11px' }}
            >
              {intensities.length === 10 ? 'None' : 'All'}
            </Button>
          </div>
        </div>
      </div>

      <div className="editor-container" style={{ border: '1px solid var(--border)', borderRadius: '6px', overflow: 'hidden', marginBottom: '20px' }}>
        <Editor
          height="300px"
          defaultLanguage="python"
          value={code}
          onChange={(value) => setCode(value || '')}
          theme="vs-dark"
          options={{ minimap: { enabled: false }, fontSize: 14 }}
        />
      </div>

      <Button className="button" onClick={runTest} disabled={running} style={{ width: '100%' }}>
        {running ? 'Running Scenarios...' : 'Start Robustness Test'}
      </Button>
      {error && <div className="error-message" style={{ marginTop: '10px' }}>{error}</div>}

      {result && (
        <div style={{ marginTop: '30px' }}>
          <div className="metrics-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '15px', marginBottom: '20px' }}>
            <div className="metric-card" style={{ borderTop: '4px solid #007bff', background: 'var(--card)', padding: '15px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
              <div className="metric-label" style={{ fontSize: '12px', opacity: 0.7 }}>Sharpe Component</div>
              <div className="metric-value" style={{ fontSize: '24px', fontWeight: 'bold' }}>{Number(result.score_components?.sharpe_component || 0).toFixed(2)}</div>
            </div>
            <div className="metric-card" style={{ borderTop: '4px solid #28a745', background: 'var(--card)', padding: '15px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
              <div className="metric-label" style={{ fontSize: '12px', opacity: 0.7 }}>Sortino Component</div>
              <div className="metric-value" style={{ fontSize: '24px', fontWeight: 'bold' }}>{Number(result.score_components?.sortino_component || 0).toFixed(2)}</div>
            </div>
            <div className="metric-card" style={{ borderTop: '4px solid #ffc107', background: 'var(--card)', padding: '15px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
              <div className="metric-label" style={{ fontSize: '12px', opacity: 0.7 }}>Calmar Component</div>
              <div className="metric-value" style={{ fontSize: '24px', fontWeight: 'bold' }}>{Number(result.score_components?.calmar_component || 0).toFixed(2)}</div>
            </div>
            <div className="metric-card" style={{ borderTop: '4px solid #dc3545', background: 'var(--card)', padding: '15px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
              <div className="metric-label" style={{ fontSize: '12px', opacity: 0.7 }}>Robustness Score</div>
              <div className="metric-value" style={{ fontSize: '24px', fontWeight: 'bold' }}>{Number(result.robustness_score).toFixed(2)}</div>
            </div>
          </div>

          <div style={{ marginBottom: '20px', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '15px' }}>
            {!isSaved ? (
              <Button 
                onClick={handleAddToLeaderboard} 
                variant="outline"
                className="border-blue-500 text-blue-500 hover:bg-blue-50"
              >
                🏆 Add to Leaderboard
              </Button>
            ) : (
              <span className="text-green-600 font-medium flex items-center gap-1">
                ✓ Added to leaderboard
              </span>
            )}
          </div>

          <div style={{ marginBottom: '30px', textAlign: 'center' }}>
            <span style={{
              display: 'inline-block',
              padding: '4px 12px',
              backgroundColor: 'rgba(0, 123, 255, 0.1)',
              color: '#007bff',
              borderRadius: '20px',
              fontSize: '14px',
              fontWeight: 600,
              border: '1px solid rgba(0, 123, 255, 0.2)'
            }}>
              Tested on: {result.symbol}
            </span>
            <p style={{ opacity: 0.7, fontSize: '13px', marginTop: '8px' }}>
              Baseline Performance: Sharpe {Number(result.score_components?.baseline_sharpe || 0).toFixed(2)} | Sortino {Number(result.score_components?.baseline_sortino || 0).toFixed(2)} | Calmar {Number(result.score_components?.baseline_calmar || 0).toFixed(2)}
            </p>
          </div>

          <div className="table-container" style={{ marginTop: '30px' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid var(--border)' }}>
                  <th style={{ textAlign: 'left', padding: '10px' }}>Scenario</th>
                  <th style={{ textAlign: 'right', padding: '10px' }}>Sharpe</th>
                  <th style={{ textAlign: 'right', padding: '10px' }}>Sortino</th>
                  <th style={{ textAlign: 'right', padding: '10px' }}>Max DD</th>
                  <th style={{ textAlign: 'right', padding: '10px' }}>Final Capital</th>
                </tr>
              </thead>
              <tbody>
                {result.results.map((r, idx) => (
                  <tr key={idx} style={{ borderBottom: '1px solid var(--border)', backgroundColor: r.intensity === 0 ? 'rgba(128,128,128,0.05)' : 'transparent' }}>
                    <td style={{ padding: '10px' }}>{r.intensity === 0 ? <strong>Baseline (0)</strong> : `Intensity ${r.intensity}`}</td>
                    <td style={{ textAlign: 'right', padding: '10px' }}>{r.metrics.sharpe_ratio.toFixed(2)}</td>
                    <td style={{ textAlign: 'right', padding: '10px' }}>{r.metrics.sortino_ratio.toFixed(2)}</td>
                    <td style={{ textAlign: 'right', padding: '10px', color: '#dc3545' }}>{(r.metrics.max_drawdown * 100).toFixed(1)}%</td>
                    <td style={{ textAlign: 'right', padding: '10px', fontWeight: 600 }}>Rs.{r.metrics.final_capital.toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="chart-container" style={{ height: '400px', marginTop: '30px' }}>
            <Line
              data={chartData}
              options={{
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                  y: { grid: { color: 'rgba(128,128,128,0.1)' } },
                  x: { grid: { display: false } }
                },
                plugins: {
                  legend: { position: 'bottom', labels: { boxWidth: 12, fontSize: 11 } },
                  tooltip: {
                    callbacks: {
                      label: (ctx) => `${ctx.dataset.label}: Rs.${Number(ctx.parsed.y).toLocaleString()}`,
                    },
                  },
                },
              }}
            />
          </div>
        </div>
      )}
    </Card>
  );
}


export default RobustnessTestPage;

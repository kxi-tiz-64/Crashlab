import React, { useState } from 'react';
import Editor from '@monaco-editor/react';
import apiClient from '../api/apiClient';
import OhlcvChart from '../components/OhlcvChart';
import EquityCurveChart from '../components/EquityCurveChart';
import TemplatePanel, { DEFAULT_TEMPLATE_CODE, DEFAULT_TEMPLATE_KEY, STRATEGY_TEMPLATES } from '../components/TemplatePanel';
import { Switch } from '../components/ui/switch';



function AlgoEditorPage({ ohlcvData, onSignalsGenerated, onBacktestComplete, onNext, initialCode }) {
  const [code, setCode] = useState(initialCode || DEFAULT_TEMPLATE_CODE);
  const [strategyName, setStrategyName] = useState('My Strategy');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [signals, setSignals] = useState(null);
  const [backtestResults, setBacktestResults] = useState(null);
  const [selectedStrategy, setSelectedStrategy] = useState(DEFAULT_TEMPLATE_KEY);
  const [showRecommendations, setShowRecommendations] = useState(true);
  
  const [expertMode, setExpertMode] = useState(false);
  const [showWarningModal, setShowWarningModal] = useState(false);

  const handleToggleExpertMode = (checked) => {
    if (checked) {
      setShowWarningModal(true);
    } else {
      setExpertMode(false);
    }
  };

  const handleLoadTemplate = (templateKey) => {
    const template = STRATEGY_TEMPLATES[templateKey];
    setCode(template.code);
    setSelectedStrategy(templateKey);
    setSignals(null);
    setBacktestResults(null);
  };

  const handleRunStrategy = async () => {
    setLoading(true);
    setError(null);
    setSignals(null);
    setBacktestResults(null);

    try {
      const response = await apiClient.post('/run_algo', {
        code: code,
        ohlcv: ohlcvData,
        mode: expertMode ? 'expert' : 'safe'
      });

      if (response.data.error) {
        setError(response.data.message || 'Failed to execute strategy');
        return;
      }

      setSignals(response.data.signals);
      onSignalsGenerated(response.data.signals);

      // Automatically run backtest
      await handleRunBacktest(response.data.signals);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to execute strategy');
    } finally {
      setLoading(false);
    }
  };

  const handleRunBacktest = async (signalsToTest = null) => {
    const signalsToUse = signalsToTest || signals;
    if (!signalsToUse || signalsToUse.length === 0) {
      setError('No signals to backtest');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await apiClient.post('/backtest', {
        ohlcv: ohlcvData,
        signals: signalsToUse,
        settings: {
          initial_capital: 100000,
          slippage_pct: 0.001,
          fee_pct: 0.00025,
        },
      });

      if (response.data.error) {
        setError(response.data.message || 'Failed to run backtest');
        return;
      }

      setBacktestResults(response.data);
      onBacktestComplete(response.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to run backtest');
    } finally {
      setLoading(false);
    }
  };

  const handleSaveStrategy = async () => {
    try {
      await apiClient.post('/strategies/save', {
        name: strategyName,
        code
      });
      alert('Strategy saved successfully!');
    } catch (err) {
      alert(err.response?.data?.message || 'Failed to save strategy');
    }
  };

  return (
    <div className="page">
      {showWarningModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1000 }}>
          <div style={{ backgroundColor: 'white', padding: '24px', borderRadius: '8px', maxWidth: '500px' }}>
            <h3 style={{ color: '#dc3545', marginTop: 0 }}>⚠️ Expert Mode – Use at your own risk</h3>
            <p>Full Python execution allows any code, including file system access, network calls, etc. Only enable if you trust the code.</p>
            <p>Resilio is not responsible for any damage.</p>
            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '10px', marginTop: '20px' }}>
              <button className="button" style={{ backgroundColor: '#6c757d' }} onClick={() => setShowWarningModal(false)}>Cancel</button>
              <button className="button" style={{ backgroundColor: '#dc3545' }} onClick={() => { setExpertMode(true); setShowWarningModal(false); }}>I understand, enable Expert Mode</button>
            </div>
          </div>
        </div>
      )}

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div>
          <h2>Algorithm Editor & Backtesting Lab</h2>
          <p style={{ color: '#666', marginTop: '5px' }}>
            Write, test, and optimize trading strategies with real-time visualization
          </p>
        </div>
        <button
          className="button"
          onClick={() => setShowRecommendations(!showRecommendations)}
          style={{ backgroundColor: showRecommendations ? '#007bff' : '#6c757d' }}
        >
          {showRecommendations ? 'Hide' : 'Show'} Recommendations
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: showRecommendations ? '300px 1fr' : '1fr', gap: '20px' }}>
        {/* Strategy Recommendations Panel */}
        {showRecommendations && (
          <div style={{ backgroundColor: '#f8f9fa', padding: '20px', borderRadius: '8px', height: 'fit-content', position: 'sticky', top: '20px' }}>
            <h3 style={{ marginTop: 0, marginBottom: '20px' }}>Strategy Templates</h3>
            <p style={{ fontSize: '14px', color: '#666', marginBottom: '20px' }}>
              Click any strategy to load its code template. These are optimized starting points for different market conditions.
            </p>
            
            {Object.entries(STRATEGY_TEMPLATES).map(([key, strategy]) => (
              <div
                key={key}
                onClick={() => handleLoadTemplate(key)}
                style={{
                  padding: '15px',
                  marginBottom: '12px',
                  backgroundColor: selectedStrategy === key ? '#e7f3ff' : '#fff',
                  border: selectedStrategy === key ? '2px solid #007bff' : '1px solid #dee2e6',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => {
                  if (selectedStrategy !== key) e.currentTarget.style.borderColor = '#007bff';
                }}
                onMouseLeave={(e) => {
                  if (selectedStrategy !== key) e.currentTarget.style.borderColor = '#dee2e6';
                }}
              >
                <div style={{ fontWeight: 'bold', marginBottom: '5px', color: '#007bff' }}>
                  {strategy.name}
                </div>
                <div style={{ fontSize: '12px', color: '#666', marginBottom: '8px' }}>
                  {strategy.description}
                </div>
                <div style={{ fontSize: '11px', color: '#28a745', fontStyle: 'italic' }}>
                  Best for: {strategy.bestFor}
                </div>
              </div>
            ))}

            <div style={{ marginTop: '30px', padding: '15px', backgroundColor: '#fff3cd', borderRadius: '6px', border: '1px solid #ffc107' }}>
              <div style={{ fontWeight: 'bold', marginBottom: '8px' }}>Pro Tips</div>
              <ul style={{ fontSize: '12px', margin: 0, paddingLeft: '20px', color: '#856404' }}>
                <li>Test strategies on both normal and crash data</li>
                <li>Use position['qty'] to check current holdings</li>
                <li>Access row['open'], row['high'], row['low'], row['close'], row['volume']</li>
                <li>Use ohlcv[index-n] for historical candles</li>
                <li>Use current_price for the current close price</li>
                <li>Call buy(qty) or sell(qty) to generate signals</li>
              </ul>
            </div>
          </div>
        )}

        {/* Main Editor Area */}
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
            <div>
              <h3 style={{ margin: 0 }}>Strategy Code</h3>
              <p style={{ fontSize: '14px', color: '#666', marginBottom: 0, marginTop: '10px' }}>
                Write your trading algorithm in Python. Available variables: <code>row</code>, <code>index</code>, <code>ohlcv</code>, <code>current_price</code>, <code>position</code>, <code>buy()</code>, <code>sell()</code>
              </p>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }} title="Full Python – no sandbox">
              <span style={{ fontSize: '14px', fontWeight: 'bold', color: expertMode ? '#dc3545' : '#666' }}>Expert Mode</span>
              <Switch checked={expertMode} onCheckedChange={handleToggleExpertMode} />
            </div>
          </div>

          <TemplatePanel
            activeKey={selectedStrategy}
            onSelectTemplate={handleLoadTemplate}
          />

          <div className="editor-container" style={{ marginBottom: '20px', border: '1px solid #dee2e6', borderRadius: '4px', overflow: 'hidden' }}>
            <Editor
              height="400px"
              defaultLanguage="python"
              value={code}
              onChange={(value) => setCode(value || '')}
              theme="vs-light"
              options={{
                minimap: { enabled: false },
                fontSize: 14,
                wordWrap: 'on',
                lineNumbers: 'on',
                scrollBeyondLastLine: false,
              }}
            />
          </div>

          <div style={{ display: 'flex', gap: '10px', marginBottom: '20px', alignItems: 'center' }}>
            <input 
              value={strategyName} 
              onChange={(e) => setStrategyName(e.target.value)}
              placeholder="Strategy Name"
              style={{
                padding: '8px 12px',
                borderRadius: '6px',
                border: '1px solid #dee2e6',
                flex: 1,
                maxWidth: '200px',
                background: 'var(--background)',
                color: 'var(--foreground)'
              }}
            />
            <button
              className="button"
              onClick={handleSaveStrategy}
              style={{ backgroundColor: '#6c757d', minWidth: '120px' }}
            >
              Save Strategy
            </button>
            <button
              className="button"
              onClick={handleRunStrategy}
              disabled={loading}
              style={{ flex: 1 }}
            >
              {loading ? 'Running...' : 'Run Strategy & Backtest'}
            </button>
            {signals && (
              <button
                className="button"
                onClick={() => handleRunBacktest()}
                disabled={loading}
                style={{ backgroundColor: '#28a745' }}
              >
                Re-run Backtest
              </button>
            )}
          </div>

          {error && (
            <div className="error-message" style={{ marginBottom: '20px' }}>
              Error: {error}
            </div>
          )}

          {signals && (
            <div style={{ marginBottom: '30px' }}>
              <h3>Strategy Signals: {signals.length} trades generated</h3>
              <div className="chart-container" style={{ height: '400px' }}>
                <OhlcvChart
                  data={ohlcvData}
                  signals={signals}
                  title="Price Chart with Buy/Sell Signals"
                />
              </div>
            </div>
          )}

          {backtestResults && (
            <div style={{ marginBottom: '30px' }}>
              <h3>Backtest Results</h3>
              
              {/* Performance Metrics */}
              <div style={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', 
                gap: '15px',
                marginBottom: '30px'
              }}>
                <div style={{ backgroundColor: '#fff', padding: '20px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
                  <div style={{ fontSize: '12px', color: '#666', marginBottom: '5px' }}>Final Capital</div>
                  <div style={{ fontSize: '24px', fontWeight: 'bold', color: backtestResults.metrics.final_capital >= 100000 ? '#28a745' : '#dc3545' }}>
                    Rs.{backtestResults.metrics.final_capital.toLocaleString()}
                  </div>
                </div>
                <div style={{ backgroundColor: '#fff', padding: '20px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
                  <div style={{ fontSize: '12px', color: '#666', marginBottom: '5px' }}>Total PnL</div>
                  <div style={{ fontSize: '24px', fontWeight: 'bold', color: backtestResults.metrics.total_pnl >= 0 ? '#28a745' : '#dc3545' }}>
                    Rs.{backtestResults.metrics.total_pnl >= 0 ? '+' : ''}{backtestResults.metrics.total_pnl.toLocaleString()}
                  </div>
                </div>
                <div style={{ backgroundColor: '#fff', padding: '20px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
                  <div style={{ fontSize: '12px', color: '#666', marginBottom: '5px' }}>Return %</div>
                  <div style={{ fontSize: '24px', fontWeight: 'bold', color: backtestResults.metrics.total_pnl >= 0 ? '#28a745' : '#dc3545' }}>
                    {((backtestResults.metrics.final_capital / 100000 - 1) * 100).toFixed(2)}%
                  </div>
                </div>
                <div style={{ backgroundColor: '#fff', padding: '20px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
                  <div style={{ fontSize: '12px', color: '#666', marginBottom: '5px' }}>Win Rate</div>
                  <div style={{ fontSize: '24px', fontWeight: 'bold', color: backtestResults.metrics.win_rate >= 0.5 ? '#28a745' : '#dc3545' }}>
                    {(backtestResults.metrics.win_rate * 100).toFixed(1)}%
                  </div>
                </div>
                <div style={{ backgroundColor: '#fff', padding: '20px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
                  <div style={{ fontSize: '12px', color: '#666', marginBottom: '5px' }}>Total Trades</div>
                  <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#007bff' }}>
                    {backtestResults.metrics.num_trades}
                  </div>
                </div>
                <div style={{ backgroundColor: '#fff', padding: '20px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
                  <div style={{ fontSize: '12px', color: '#666', marginBottom: '5px' }}>Max Drawdown</div>
                  <div style={{ fontSize: '24px', fontWeight: 'bold', color: '#dc3545' }}>
                    {(backtestResults.metrics.max_drawdown * 100).toFixed(2)}%
                  </div>
                </div>
              </div>

              {/* Equity Curve */}
              <div style={{ marginBottom: '30px' }}>
                <h4>Equity Curve</h4>
                <div className="chart-container" style={{ height: '350px' }}>
                  <EquityCurveChart data={backtestResults.equity_curve} />
                </div>
              </div>

              <button
                className="button"
                onClick={onNext}
                style={{ width: '100%', marginTop: '20px' }}
              >
                View Detailed Results ->
              </button>
            </div>
          )}

          {!signals && !loading && (
            <div style={{ textAlign: 'center', padding: '40px 20px', color: '#666', backgroundColor: '#f8f9fa', borderRadius: '8px' }}>
              <div style={{ fontSize: '48px', marginBottom: '20px' }}>[Code]</div>
              <h3>Ready to Test Your Strategy</h3>
              <p>Write your algorithm code above or select a template from the recommendations panel</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default AlgoEditorPage;


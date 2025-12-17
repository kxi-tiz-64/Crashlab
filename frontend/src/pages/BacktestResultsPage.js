import React from 'react';
import apiClient from '../api/apiClient';
import OhlcvChart from '../components/OhlcvChart';
import EquityCurveChart from '../components/EquityCurveChart';

function BacktestResultsPage({ backtestResults, ohlcvData, signals }) {
  const handleDownloadCSV = async () => {
    try {
      const response = await apiClient.get('/download_trades', {
        params: {
          session_id: backtestResults.session_id,
        },
        responseType: 'blob',
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', 'trades.csv');
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (err) {
      alert('Failed to download CSV');
    }
  };

  return (
    <div className="page">
      <h2>Backtest Results</h2>
      <p>Detailed performance analysis of your strategy</p>

      <div className="metrics-grid" style={{ marginTop: '30px' }}>
        <div className="metric-card">
          <div className="metric-label">Final Capital</div>
          <div className="metric-value">₹{backtestResults.metrics.final_capital.toLocaleString()}</div>
        </div>
        <div className="metric-card">
          <div className="metric-label">Total PnL</div>
          <div className="metric-value" style={{
            color: backtestResults.metrics.total_pnl >= 0 ? '#28a745' : '#dc3545'
          }}>
            ₹{backtestResults.metrics.total_pnl.toLocaleString()}
          </div>
        </div>
        <div className="metric-card">
          <div className="metric-label">Win Rate</div>
          <div className="metric-value">{(backtestResults.metrics.win_rate * 100).toFixed(1)}%</div>
        </div>
        <div className="metric-card">
          <div className="metric-label">Number of Trades</div>
          <div className="metric-value">{backtestResults.metrics.num_trades}</div>
        </div>
        <div className="metric-card">
          <div className="metric-label">Max Drawdown</div>
          <div className="metric-value" style={{ color: '#dc3545' }}>
            {(backtestResults.metrics.max_drawdown * 100).toFixed(2)}%
          </div>
        </div>
        <div className="metric-card">
          <div className="metric-label">Average Win</div>
          <div className="metric-value">₹{backtestResults.metrics.avg_win.toLocaleString()}</div>
        </div>
        <div className="metric-card">
          <div className="metric-label">Average Loss</div>
          <div className="metric-value">₹{backtestResults.metrics.avg_loss.toLocaleString()}</div>
        </div>
      </div>

      <div style={{ marginTop: '40px' }}>
        <h3>Price Chart with Trading Signals</h3>
        <div className="chart-container">
          <OhlcvChart
            data={ohlcvData}
            signals={signals}
            title="Trading Activity"
          />
        </div>
      </div>

      <div style={{ marginTop: '40px' }}>
        <h3>Equity Curve</h3>
        <div className="chart-container">
          <EquityCurveChart data={backtestResults.equity_curve} />
        </div>
      </div>

      <div style={{ marginTop: '40px' }}>
        <h3>Trade Log</h3>
        <div className="table-container">
          <table>
            <thead>
              <tr>
                <th>Date</th>
                <th>Type</th>
                <th>Qty</th>
                <th>Price</th>
                <th>Slippage</th>
                <th>Fee</th>
                <th>Capital</th>
                <th>PnL</th>
              </tr>
            </thead>
            <tbody>
              {backtestResults.trade_log.map((trade, idx) => (
                <tr key={idx}>
                  <td>{trade.date}</td>
                  <td>{trade.type}</td>
                  <td>{trade.qty}</td>
                  <td>₹{trade.price.toFixed(2)}</td>
                  <td>₹{trade.slippage.toFixed(2)}</td>
                  <td>₹{trade.fee.toFixed(2)}</td>
                  <td>₹{trade.capital.toLocaleString()}</td>
                  <td style={{
                    color: trade.pnl >= 0 ? '#28a745' : '#dc3545'
                  }}>
                    ₹{trade.pnl.toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <button
        className="button"
        onClick={handleDownloadCSV}
        style={{ marginTop: '20px' }}
      >
        Download CSV
      </button>
    </div>
  );
}

export default BacktestResultsPage;


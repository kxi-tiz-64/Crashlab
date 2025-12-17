import React, { useState } from 'react';
import apiClient from '../api/apiClient';
import OhlcvChart from '../components/OhlcvChart';

function LoadStockPage({ onStockLoaded, onNext }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [stockData, setStockData] = useState(null);

  const handleLoadStock = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const response = await apiClient.get('/random_stock');
      
      if (response.data.error) {
        setError(response.data.message || 'Failed to load stock data');
        return;
      }
      
      setStockData(response.data);
      onStockLoaded(response.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load stock data');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page">
      <h2>Load Random Stock</h2>
      <p>Load 300 days of OHLCV data for a random NIFTY 500 stock</p>
      
      <div style={{ marginTop: '20px' }}>
        <button
          className="button"
          onClick={handleLoadStock}
          disabled={loading}
        >
          {loading ? 'Loading...' : 'Load Random Stock'}
        </button>
      </div>

      {error && (
        <div className="error-message">
          ❌ {error}
        </div>
      )}

      {stockData && (
        <div style={{ marginTop: '30px' }}>
          <h3>Loaded: {stockData.symbol}</h3>
          <p>Data points: {stockData.data.length}</p>
          
          <div className="chart-container">
            <OhlcvChart data={stockData.data} title="Original OHLCV Data" />
          </div>

          <button
            className="button"
            onClick={onNext}
            style={{ marginTop: '20px' }}
          >
            Continue to Crash Simulation →
          </button>
        </div>
      )}
    </div>
  );
}

export default LoadStockPage;


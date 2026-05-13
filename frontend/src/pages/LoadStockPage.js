import React, { useState, useEffect, useCallback, useRef } from 'react';
import apiClient from '../api/apiClient';
import OhlcvChart from '../components/OhlcvChart';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';

function LoadStockPage({ onStockLoaded, onNext }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [stockData, setStockData] = useState(null);
  const [years, setYears] = useState(() => parseInt(sessionStorage.getItem('crashlab_years')) || 1);
  const [isMax, setIsMax] = useState(() => sessionStorage.getItem('crashlab_is_max') === 'true');
  
  const [indices, setIndices] = useState([]);
  const [selectedIndex, setSelectedIndex] = useState(() => sessionStorage.getItem('crashlab_index') || 'nifty500');
  
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const searchRef = useRef(null);

  useEffect(() => {
    const fetchIndices = async () => {
      try {
        const response = await apiClient.get('/indices');
        setIndices(response.data);
      } catch (err) {
        console.error('Failed to fetch indices', err);
      }
    };
    fetchIndices();
  }, []);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (searchRef.current && !searchRef.current.contains(event.target)) {
        setShowResults(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSearch = useCallback(async (query) => {
    if (!query || query.length < 2) {
      setSearchResults([]);
      setShowResults(false);
      return;
    }

    setIsSearching(true);
    try {
      const response = await apiClient.get('/search_stock', { params: { q: query } });
      setSearchResults(response.data);
      setShowResults(true);
    } catch (err) {
      console.error('Search failed', err);
    } finally {
      setIsSearching(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      handleSearch(searchQuery);
    }, 400);
    return () => clearTimeout(timer);
  }, [searchQuery, handleSearch]);

  const handleLoadStock = async (symbol = null) => {
    setLoading(true);
    setError(null);
    setShowResults(false);
    
    try {
      sessionStorage.setItem('crashlab_years', years.toString());
      sessionStorage.setItem('crashlab_is_max', isMax.toString());
      sessionStorage.setItem('crashlab_index', selectedIndex);
      
      const params = { 
        years: isMax ? 'max' : years,
        index: selectedIndex
      };
      if (symbol) params.symbol = symbol;

      const response = await apiClient.get('/random_stock', { params });
      
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
    <Card className="page">
      <h2>Load Random Stock</h2>
      <p>Load historical OHLCV data for analysis and simulation</p>
      
      <div style={{ marginTop: '20px', display: 'flex', flexDirection: 'column', gap: '20px' }}>
        {/* Search Bar */}
        <div ref={searchRef} style={{ position: 'relative', width: '100%', maxWidth: '500px' }}>
          <input
            type="text"
            placeholder="Search for a stock (e.g. Apple, Reliance)..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            style={{
              width: '100%',
              padding: '10px 12px',
              borderRadius: '6px',
              border: '1px solid var(--border)',
              background: 'var(--background)',
              color: 'var(--foreground)'
            }}
          />
          {isSearching && (
            <div style={{ position: 'absolute', right: '10px', top: '10px', fontSize: '12px', opacity: 0.7 }}>
              Searching...
            </div>
          )}
          {showResults && searchResults.length > 0 && (
            <div style={{
              position: 'absolute',
              top: '100%',
              left: 0,
              right: 0,
              zIndex: 100,
              marginTop: '4px',
              background: 'var(--card)',
              border: '1px solid var(--border)',
              borderRadius: '6px',
              maxHeight: '300px',
              overflowY: 'auto',
              boxShadow: '0 4px 12px rgba(0,0,0,0.1)'
            }}>
              {searchResults.map((result) => (
                <div
                  key={result.symbol}
                  onClick={() => {
                    setSearchQuery('');
                    handleLoadStock(result.symbol);
                  }}
                  style={{
                    padding: '10px 12px',
                    cursor: 'pointer',
                    borderBottom: '1px solid var(--border)',
                    fontSize: '14px'
                  }}
                  className="search-result-item"
                >
                  <div style={{ fontWeight: 600 }}>{result.shortname} ({result.symbol})</div>
                  <div style={{ fontSize: '12px', opacity: 0.7 }}>{result.exchDisp} — {result.typeDisp}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div style={{ display: 'flex', gap: '12px', alignItems: 'center', flexWrap: 'wrap' }}>
          {/* Index Selector */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 500 }}>
            <span>Index:</span>
            <select 
              value={selectedIndex} 
              onChange={(e) => setSelectedIndex(e.target.value)}
              style={{
                padding: '6px 10px',
                borderRadius: '6px',
                border: '1px solid var(--border)',
                background: 'var(--background)',
                color: 'var(--foreground)'
              }}
            >
              {indices.map(idx => (
                <option key={idx.key} value={idx.key}>
                  {idx.name} – {idx.exchange}, {idx.country}
                </option>
              ))}
            </select>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontWeight: 500 }}>
            <span>Period: {isMax ? 'Max (all data)' : `${years} Year${years > 1 ? 's' : ''}`}</span>
            <input
              type="range"
              min="1"
              max="20"
              step="1"
              value={years}
              disabled={isMax}
              onChange={(e) => setYears(parseInt(e.target.value, 10))}
              style={{ marginLeft: '10px', opacity: isMax ? 0.5 : 1 }}
            />
            <label style={{ display: 'flex', alignItems: 'center', gap: '4px', cursor: 'pointer', marginLeft: '10px' }}>
              <input
                type="checkbox"
                checked={isMax}
                onChange={(e) => setIsMax(e.target.checked)}
              />
              Max
            </label>
          </div>
          
          <Button
            className="button"
            onClick={() => handleLoadStock()}
            disabled={loading}
          >
            {loading ? 'Loading...' : 'Load Random Stock'}
          </Button>
        </div>
      </div>

      {error && (
        <div className="error-message">
          Error: {error}
        </div>
      )}

      {stockData && (
        <div style={{ marginTop: '30px' }}>
          <h3>Loaded: {stockData.symbol} — {stockData.exchange} ({stockData.index_name})</h3>
          <p>{stockData.data.length} data points loaded</p>
          
          <div className="chart-container">
            <OhlcvChart data={stockData.data} title="Original OHLCV Data" />
          </div>

          <Button
            className="button"
            onClick={onNext}
            style={{ marginTop: '20px' }}
          >
            Continue to Crash Simulation ->
          </Button>
        </div>
      )}

      <style>{`
        .search-result-item:hover {
          background: rgba(128, 128, 128, 0.1);
        }
      `}</style>
    </Card>
  );
}

export default LoadStockPage;


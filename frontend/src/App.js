import React, { useState } from 'react';
import './App.css';
import LoadStockPage from './pages/LoadStockPage';
import CrashSimulatorPage from './pages/CrashSimulatorPage';
import AlgoEditorPage from './pages/AlgoEditorPage';
import BacktestResultsPage from './pages/BacktestResultsPage';

function App() {
  const [currentPage, setCurrentPage] = useState('load');
  const [stockData, setStockData] = useState(null);
  const [crashData, setCrashData] = useState(null);
  const [signals, setSignals] = useState(null);
  const [backtestResults, setBacktestResults] = useState(null);

  const handleStockLoaded = (data) => {
    setStockData(data);
    setCrashData(null);
    setSignals(null);
    setBacktestResults(null);
  };

  const handleCrashSimulated = (data) => {
    setCrashData(data);
  };

  const handleSignalsGenerated = (data) => {
    setSignals(data);
  };

  const handleBacktestComplete = (data) => {
    setBacktestResults(data);
  };

  return (
    <div className="App">
      <div className="header">
        <h1>Market Crash Simulation & Algorithm Stress Testing Platform</h1>
        <p>Test your trading algorithms against synthetic market crashes</p>
      </div>

      <div className="container">
        <div className="navigation">
          <button
            className={`nav-button ${currentPage === 'load' ? 'active' : ''}`}
            onClick={() => setCurrentPage('load')}
          >
            1. Load Stock
          </button>
          <button
            className={`nav-button ${currentPage === 'crash' ? 'active' : ''}`}
            onClick={() => setCurrentPage('crash')}
            disabled={!stockData}
          >
            2. Simulate Crash
          </button>
          <button
            className={`nav-button ${currentPage === 'algo' ? 'active' : ''}`}
            onClick={() => setCurrentPage('algo')}
            disabled={!crashData}
          >
            3. Write Algorithm
          </button>
          <button
            className={`nav-button ${currentPage === 'results' ? 'active' : ''}`}
            onClick={() => setCurrentPage('results')}
            disabled={!backtestResults}
          >
            4. Backtest Results
          </button>
        </div>

        {currentPage === 'load' && (
          <LoadStockPage
            onStockLoaded={handleStockLoaded}
            onNext={() => setCurrentPage('crash')}
          />
        )}

        {currentPage === 'crash' && stockData && (
          <CrashSimulatorPage
            originalData={stockData.data}
            symbol={stockData.symbol}
            onCrashSimulated={handleCrashSimulated}
            onNext={() => setCurrentPage('algo')}
          />
        )}

        {currentPage === 'algo' && crashData && (
          <AlgoEditorPage
            ohlcvData={crashData}
            onSignalsGenerated={handleSignalsGenerated}
            onBacktestComplete={handleBacktestComplete}
            onNext={() => setCurrentPage('results')}
          />
        )}

        {currentPage === 'results' && backtestResults && (
          <BacktestResultsPage
            backtestResults={backtestResults}
            ohlcvData={crashData}
            signals={signals}
          />
        )}
      </div>
    </div>
  );
}

export default App;


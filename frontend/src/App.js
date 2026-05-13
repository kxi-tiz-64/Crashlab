import React, { useEffect, useMemo, useState } from 'react';
import HomePage from './pages/HomePage';
import LoadStockPage from './pages/LoadStockPage';
import CrashSimulatorPage from './pages/CrashSimulatorPage';
import AlgoEditorPage from './pages/AlgoEditorPage';
import BacktestResultsPage from './pages/BacktestResultsPage';
import RobustnessTestPage from './pages/RobustnessTestPage';
import LeaderboardPage from './pages/LeaderboardPage';
import LoginPage from './pages/LoginPage';
import MyStrategiesPage from './pages/MyStrategiesPage';
import StrategyComparison from './components/StrategyComparison';
import { Button } from './components/ui/button';
import { Switch } from './components/ui/switch';
import { AuthProvider, useAuth } from './context/AuthContext';

function AppContent() {
  const { user, loading: authLoading, logout } = useAuth();
  const [currentPage, setCurrentPage] = useState(() => window.location.hash.replace('#/', '') || 'home');
  const [darkMode, setDarkMode] = useState(() => localStorage.getItem('crashlab_dark_mode') === 'true');
  const [stockData, setStockData] = useState(null);
  const [crashData, setCrashData] = useState(null);
  const [crashAnalysis, setCrashAnalysis] = useState(null);
  const [signals, setSignals] = useState(null);
  const [backtestResults, setBacktestResults] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [loadedStrategyCode, setLoadedStrategyCode] = useState(null);

  useEffect(() => {
    const html = document.documentElement;
    if (darkMode) {
      html.classList.add('dark');
    } else {
      html.classList.remove('dark');
    }
    localStorage.setItem('crashlab_dark_mode', String(darkMode));
  }, [darkMode]);

  useEffect(() => {
    const onHashChange = () => {
      const page = window.location.hash.replace('#/', '') || 'home';
      setCurrentPage(page);
    };
    window.addEventListener('hashchange', onHashChange);
    return () => window.removeEventListener('hashchange', onHashChange);
  }, []);

  const navigate = (page) => {
    window.location.hash = `#/${page}`;
    setCurrentPage(page);
  };

  const handleStockLoaded = (data) => {
    setStockData(data);
    setCrashData(null);
    setCrashAnalysis(null);
    setSignals(null);
    setBacktestResults(null);
  };

  const handleCrashSimulated = (data) => {
    if (Array.isArray(data)) {
      setCrashData(data);
      setCrashAnalysis(null);
      setSignals(null);
      setBacktestResults(null);
      return;
    }
    setCrashData(data.manipulated_ohlcv);
    setCrashAnalysis({
      anomalies: data.anomalies || [],
      anomaly_details: data.anomaly_details || [],
      impact: data.impact || null,
    });
    setSignals(null);
    setBacktestResults(null);
  };

  const handleSignalsGenerated = (data) => {
    setSignals(data);
  };

  const handleBacktestComplete = (data) => {
    setBacktestResults(data);
  };

  const handleLoadStrategy = (code) => {
    setLoadedStrategyCode(code);
    navigate('algo');
  };

  const navItems = useMemo(() => ([
    { key: 'home', label: 'Home', disabled: false, public: true },
    { key: 'load', label: 'Load Stock', disabled: false },
    { key: 'crash', label: 'Crash Simulator', disabled: !stockData },
    { key: 'algo', label: 'Algo Editor', disabled: !crashData },
    { key: 'my-strategies', label: 'My Strategies', disabled: false },
    { key: 'results', label: 'Backtest Results', disabled: !backtestResults },
    { key: 'comparison', label: 'Strategy Comparison', disabled: !crashData },
    { key: 'robustness', label: 'Robustness Test', disabled: false },
    { key: 'leaderboard', label: 'Leaderboard', disabled: false },
  ]), [stockData, crashData, backtestResults]);

  if (authLoading) {
    return <div className="flex items-center justify-center h-screen">Loading...</div>;
  }

  const isPublicPage = currentPage === 'home' || navItems.find(i => i.key === currentPage)?.public;

  if (!user && !isPublicPage) {
    return <LoginPage darkMode={darkMode} onToggleDarkMode={() => setDarkMode(!darkMode)} />;
  }

  return (
    <div className={`app-shell ${sidebarOpen ? 'sidebar-open' : 'sidebar-closed'}`}>
      <aside className={`sidebar ${sidebarOpen ? '' : 'collapsed'}`}>
        <div 
          onClick={() => navigate('home')} 
          style={{ cursor: 'pointer' }}
          className="hover:opacity-80 transition-opacity px-4 mb-8"
        >
          <h1 className="text-2xl font-bold bg-gradient-to-r from-blue-600 to-blue-400 bg-clip-text text-transparent">Resilio</h1>
          <p className="text-[10px] uppercase tracking-wider text-slate-500 dark:text-slate-400 font-medium">Strategy Resilience Studio</p>
        </div>
        <nav className="sidebar-nav">
          {navItems.map((item) => (
            <Button
              key={item.key}
              className={`sidebar-link ${currentPage === item.key ? 'active' : ''}`}
              onClick={() => navigate(item.key)}
              disabled={item.disabled}
            >
              {item.label}
            </Button>
          ))}
        </nav>
        
        {user && (
          <div className="mt-auto pt-4 border-t border-slate-100 dark:border-slate-800">
            <p className="text-[10px] text-slate-500 px-4 mb-2 truncate opacity-70">{user.email}</p>
            <Button
              variant="secondary"
              className="button button-secondary w-full"
              onClick={logout}
            >
              Logout
            </Button>
          </div>
        )}
      </aside>

      <main className="content-shell">
        <header className="topbar h-16 flex items-center justify-between px-4 border-b border-slate-100 dark:border-slate-800 bg-background/80 backdrop-blur-md sticky top-0 z-50">
          <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => setSidebarOpen(!sidebarOpen)}
            aria-label="Toggle Sidebar"
            className="w-10 h-10 flex items-center justify-center"
          >
            <span className="text-2xl">☰</span>
          </Button>
          
          <label className="toggle-row">
            <span style={{ marginRight: '8px' }}>{darkMode ? '🌙' : '☀️'}</span>
            <Switch checked={darkMode} onCheckedChange={() => setDarkMode((prev) => !prev)} />
          </label>
        </header>

        <div className="content-area">
          {currentPage === 'home' && (
            <HomePage navigate={navigate} />
          )}

          {currentPage === 'load' && (
            <LoadStockPage
              onStockLoaded={handleStockLoaded}
              onNext={() => navigate('crash')}
            />
          )}

          {currentPage === 'crash' && stockData && (
            <CrashSimulatorPage
              originalData={stockData.data}
              symbol={stockData.symbol}
              onCrashSimulated={handleCrashSimulated}
              onNext={() => navigate('algo')}
            />
          )}

          {currentPage === 'algo' && crashData && (
            <AlgoEditorPage
              ohlcvData={crashData}
              onSignalsGenerated={handleSignalsGenerated}
              onBacktestComplete={handleBacktestComplete}
              onNext={() => navigate('results')}
              initialCode={loadedStrategyCode}
            />
          )}

          {currentPage === 'my-strategies' && (
            <MyStrategiesPage onLoadStrategy={handleLoadStrategy} />
          )}

          {currentPage === 'comparison' && crashData && (
            <StrategyComparison ohlcvData={crashData} />
          )}

          {currentPage === 'results' && backtestResults && (
            <BacktestResultsPage
              backtestResults={backtestResults}
              ohlcvData={crashData}
              signals={signals}
              crashAnalysis={crashAnalysis}
            />
          )}

          {currentPage === 'robustness' && <RobustnessTestPage />}
          {currentPage === 'leaderboard' && <LeaderboardPage />}
        </div>
      </main>
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;


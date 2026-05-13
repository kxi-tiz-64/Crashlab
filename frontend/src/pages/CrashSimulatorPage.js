import React, { useState, useEffect, useCallback } from 'react';
import apiClient from '../api/apiClient';
import OhlcvChart from '../components/OhlcvChart';
import ComparisonChart from '../components/ComparisonChart';
import VolatilityMap from '../components/VolatilityMap';
import AnomalyTimeline from '../components/AnomalyTimeline';
import SmartAdvisor from '../components/SmartAdvisor';
import ParameterExplanation from '../components/ParameterExplanation';
import TradeSuggestions from '../components/TradeSuggestions';
import ChartWithExplanation from '../components/ChartWithExplanation';
import ImpactCard from '../components/ImpactCard';

// Tooltip component
const Tooltip = ({ text, children }) => {
  const [show, setShow] = useState(false);
  return (
    <span 
      style={{ position: 'relative', display: 'inline-block' }}
      onMouseEnter={() => setShow(true)}
      onMouseLeave={() => setShow(false)}
    >
      {children}
      {show && (
        <div style={{
          position: 'absolute',
          bottom: '100%',
          left: '50%',
          transform: 'translateX(-50%)',
          backgroundColor: '#333',
          color: 'white',
          padding: '8px 12px',
          borderRadius: '4px',
          fontSize: '12px',
          whiteSpace: 'nowrap',
          zIndex: 1000,
          marginBottom: '5px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.2)'
        }}>
          {text}
          <div style={{
            position: 'absolute',
            top: '100%',
            left: '50%',
            transform: 'translateX(-50%)',
            border: '5px solid transparent',
            borderTopColor: '#333'
          }} />
        </div>
      )}
    </span>
  );
};

function CrashSimulatorPage({ originalData, symbol, onCrashSimulated, onNext }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [crashData, setCrashData] = useState(null);
  const [anomalies, setAnomalies] = useState([]);
  const [anomalyDetails, setAnomalyDetails] = useState([]);
  const [impact, setImpact] = useState(null);
  const [showAnomalies, setShowAnomalies] = useState(true);
  
  // Basic controls
  const [enableSpoofing, setEnableSpoofing] = useState(false);
  const [enableQuoteStuffing, setEnableQuoteStuffing] = useState(false);
  const [enableFlashCrash, setEnableFlashCrash] = useState(false);
  const [overallIntensity, setOverallIntensity] = useState(5);
  
  // Spoofing parameters
  const [spoofingPriceChange, setSpoofingPriceChange] = useState(2.5);
  const [spoofingVolumeMultiplier, setSpoofingVolumeMultiplier] = useState(2.5);
  const [spoofingNumPoints, setSpoofingNumPoints] = useState(4);
  
  // Quote Stuffing parameters
  const [quoteStuffingMaxDeviation, setQuoteStuffingMaxDeviation] = useState(3.0);
  const [quoteStuffingVolumeShock, setQuoteStuffingVolumeShock] = useState(2.3);
  const [quoteStuffingNumPoints, setQuoteStuffingNumPoints] = useState(7);
  
  // Flash Crash parameters
  const [flashCrashPriceDrop, setFlashCrashPriceDrop] = useState(10.0);
  const [flashCrashVolatilitySpike, setFlashCrashVolatilitySpike] = useState(2.8);
  const [flashCrashDuration, setFlashCrashDuration] = useState(2);
  const [flashCrashRecoveryDuration, setFlashCrashRecoveryDuration] = useState(4);
  
  const [autoPreview, setAutoPreview] = useState(false);
  const [isSimulating, setIsSimulating] = useState(false);
  const [expertMode, setExpertMode] = useState(false);
  const [strategySuggestions, setStrategySuggestions] = useState(null);
  const [attackSequence] = useState([]);

  const handleSimulateCrash = useCallback(async (showLoading = true) => {
    if (!enableSpoofing && !enableQuoteStuffing && !enableFlashCrash) {
      if (showLoading) setError('Please select at least one crash type');
      return;
    }

    if (isSimulating) return;

    if (showLoading) {
      setLoading(true);
      setError(null);
    }
    setIsSimulating(true);

    try {
      const response = await apiClient.post('/simulate_crash', {
        ohlcv: originalData,
        enable_spoofing: enableSpoofing,
        enable_quote_stuffing: enableQuoteStuffing,
        enable_flash_crash: enableFlashCrash,
        intensity: overallIntensity,
        spoofing_price_change_pct: enableSpoofing ? spoofingPriceChange / 100 : null,
        spoofing_volume_multiplier: enableSpoofing ? spoofingVolumeMultiplier : null,
        spoofing_num_points: enableSpoofing ? spoofingNumPoints : null,
        quote_stuffing_max_deviation_pct: enableQuoteStuffing ? quoteStuffingMaxDeviation / 100 : null,
        quote_stuffing_volume_shock: enableQuoteStuffing ? quoteStuffingVolumeShock : null,
        quote_stuffing_num_points: enableQuoteStuffing ? quoteStuffingNumPoints : null,
        flash_crash_price_drop_pct: enableFlashCrash ? flashCrashPriceDrop / 100 : null,
        flash_crash_volatility_spike: enableFlashCrash ? flashCrashVolatilitySpike : null,
        flash_crash_duration: enableFlashCrash ? flashCrashDuration : null,
        flash_crash_recovery_duration: enableFlashCrash ? flashCrashRecoveryDuration : null,
        attack_sequence: attackSequence.length > 0 ? attackSequence : null,
        cumulative_damage: true,
        include_ai_analysis: true
      });

      if (response.data.error) {
        if (showLoading) setError(response.data.message || 'Failed to simulate crash');
        return;
      }

      setCrashData(response.data.manipulated_ohlcv);
      setAnomalies(response.data.anomalies || []);
      setAnomalyDetails(response.data.anomaly_details || []);
      setImpact(response.data.impact || null);
      onCrashSimulated(response.data);
    } catch (err) {
      if (showLoading) setError(err.response?.data?.message || 'Failed to simulate crash');
    } finally {
      if (showLoading) setLoading(false);
      setIsSimulating(false);
    }
  }, [
    originalData, enableSpoofing, enableQuoteStuffing, enableFlashCrash, overallIntensity,
    spoofingPriceChange, spoofingVolumeMultiplier, spoofingNumPoints,
    quoteStuffingMaxDeviation, quoteStuffingVolumeShock, quoteStuffingNumPoints,
    flashCrashPriceDrop, flashCrashVolatilitySpike, flashCrashDuration, flashCrashRecoveryDuration,
    attackSequence, onCrashSimulated, isSimulating
  ]);

  useEffect(() => {
    if (!autoPreview || (!enableSpoofing && !enableQuoteStuffing && !enableFlashCrash) || isSimulating) {
      return;
    }
    const timer = setTimeout(() => {
      if (!isSimulating) {
        handleSimulateCrash(false);
      }
    }, 1500);
    return () => clearTimeout(timer);
  }, [
    autoPreview, enableSpoofing, enableQuoteStuffing, enableFlashCrash,
    overallIntensity, spoofingPriceChange, spoofingVolumeMultiplier, spoofingNumPoints,
    quoteStuffingMaxDeviation, quoteStuffingVolumeShock, quoteStuffingNumPoints,
    flashCrashPriceDrop, flashCrashVolatilitySpike, flashCrashDuration, flashCrashRecoveryDuration,
    isSimulating, handleSimulateCrash
  ]);

  const [stats, setStats] = useState(null);
  useEffect(() => {
    if (!crashData || !originalData || crashData.length === 0) {
      setStats(null);
      return;
    }
    const timer = setTimeout(() => {
      const priceChange = ((crashData[crashData.length - 1].close - originalData[originalData.length - 1].close) / originalData[originalData.length - 1].close * 100).toFixed(2);
      const maxPriceDiff = Math.max(...crashData.map((d, i) => Math.abs(d.close - originalData[i].close) / originalData[i].close * 100)).toFixed(2);
      const avgOriginalVolume = originalData.reduce((sum, d) => sum + d.volume, 0) / originalData.length;
      const avgCrashVolume = crashData.reduce((sum, d) => sum + d.volume, 0) / crashData.length;
      const avgVolumeChange = ((avgCrashVolume / avgOriginalVolume - 1) * 100).toFixed(1);
      const modifiedPoints = crashData.filter((d, i) => 
        Math.abs(d.close - originalData[i].close) > 0.01 || Math.abs(d.volume - originalData[i].volume) > 0.01
      ).length;
      const originalVolatility = calculateVolatility(originalData);
      const crashVolatility = calculateVolatility(crashData);
      const volatilityChange = ((crashVolatility / originalVolatility - 1) * 100).toFixed(1);
      setStats({ priceChange, maxPriceDiff, avgVolumeChange, modifiedPoints, volatilityChange });
    }, 100);
    return () => clearTimeout(timer);
  }, [crashData, originalData]);

  function calculateVolatility(data) {
    const returns = [];
    for (let i = 1; i < data.length; i++) {
      returns.push((data[i].close - data[i-1].close) / data[i-1].close);
    }
    const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
    const variance = returns.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / returns.length;
    return Math.sqrt(variance) * 100;
  }

  const ParameterControl = ({ label, value, onChange, min, max, step, tooltip, unit = '' }) => (
    <div style={{ marginBottom: '15px' }}>
      <label style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '5px' }}>
        <span className="text-slate-700 dark:text-slate-200">
          <Tooltip text={tooltip}>{label}</Tooltip>
        </span>
        <span style={{ fontWeight: 'bold', color: '#007bff' }}>
          {value}{unit}
        </span>
      </label>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        style={{ width: '100%' }}
      />
      <div className="flex justify-between text-[11px] text-slate-500 dark:text-slate-400">
        <span>{min}{unit}</span>
        <span>{max}{unit}</span>
      </div>
    </div>
  );

  return (
    <div className="page p-6">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div>
          <h2 className="text-2xl font-bold dark:text-white">Advanced Crash Simulation</h2>
          <p className="text-slate-500 dark:text-slate-400 mt-1">
            Customize attack parameters in real-time to generate realistic market crash scenarios
          </p>
        </div>
        <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={autoPreview}
              onChange={(e) => setAutoPreview(e.target.checked)}
            />
            <span className="text-sm dark:text-slate-300">Auto Preview</span>
          </label>
          <div className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800 px-3 py-1.5 rounded-full transition-colors">
            <span className="text-xs text-slate-500 dark:text-slate-400">Beginner</span>
            <label className="relative inline-block w-11 h-6 cursor-pointer">
              <input
                type="checkbox"
                checked={expertMode}
                onChange={(e) => setExpertMode(e.target.checked)}
                className="opacity-0 w-0 h-0"
              />
              <span className={`absolute inset-0 rounded-full transition-colors duration-300 ${expertMode ? 'bg-blue-600' : 'bg-slate-300 dark:bg-slate-700'}`}>
                <span className={`absolute left-1 bottom-1 bg-white w-4 h-4 rounded-full transition-transform duration-300 ${expertMode ? 'translate-x-5' : ''}`} />
              </span>
            </label>
            <span className="text-xs text-slate-500 dark:text-slate-400">Expert</span>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-[350px_1fr] gap-6">
        {/* Left Panel - Controls */}
        <div className="bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-700 p-6 rounded-xl h-fit sticky top-6 transition-colors">
          <h3 className="text-lg font-bold mb-6 dark:text-white border-b border-slate-200 dark:border-slate-700 pb-2">Attack Configuration</h3>
          
          <div className="mb-8">
            <h4 className="text-sm font-semibold mb-4 text-slate-800 dark:text-slate-200 uppercase tracking-wider">General Settings</h4>
            <ParameterControl
              label="Overall Intensity"
              value={overallIntensity}
              onChange={setOverallIntensity}
              min={1}
              max={10}
              step={1}
              tooltip="Overall intensity multiplier for all crash types (1-10)"
            />
          </div>

          <div className="mb-8 space-y-6">
            <div className="space-y-4">
              <label className="flex items-center gap-3 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={enableSpoofing}
                  onChange={(e) => setEnableSpoofing(e.target.checked)}
                  className="w-4 h-4 rounded border-slate-300 text-blue-600"
                />
                <span className="font-bold dark:text-slate-200 group-hover:text-blue-500 transition-colors">
                  <Tooltip text="Creates fake volume walls and price drift">Spoofing Attack</Tooltip>
                </span>
              </label>
              {enableSpoofing && (
                <div className="pl-7 space-y-4">
                  <ParameterControl label="Price Change %" value={spoofingPriceChange} onChange={setSpoofingPriceChange} min={0.5} max={10} step={0.1} unit="%" />
                  {expertMode && <ParameterExplanation parameterName="spoofing_price_change_pct" value={spoofingPriceChange} attackType="spoofing" />}
                  <ParameterControl label="Volume Multiplier" value={spoofingVolumeMultiplier} onChange={setSpoofingVolumeMultiplier} min={1.5} max={5} step={0.1} />
                  <ParameterControl label="Affected Points" value={spoofingNumPoints} onChange={setSpoofingNumPoints} min={2} max={10} step={1} />
                </div>
              )}
            </div>

            <div className="space-y-4">
              <label className="flex items-center gap-3 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={enableQuoteStuffing}
                  onChange={(e) => setEnableQuoteStuffing(e.target.checked)}
                  className="w-4 h-4 rounded border-slate-300 text-blue-600"
                />
                <span className="font-bold dark:text-slate-200 group-hover:text-blue-500 transition-colors">
                  <Tooltip text="Creates abnormal wicks and volume jitter">Quote Stuffing Attack</Tooltip>
                </span>
              </label>
              {enableQuoteStuffing && (
                <div className="pl-7 space-y-4">
                  <ParameterControl label="Max Deviation %" value={quoteStuffingMaxDeviation} onChange={setQuoteStuffingMaxDeviation} min={1} max={10} step={0.1} unit="%" />
                  <ParameterControl label="Volume Shock" value={quoteStuffingVolumeShock} onChange={setQuoteStuffingVolumeShock} min={1} max={5} step={0.1} />
                  <ParameterControl label="Affected Points" value={quoteStuffingNumPoints} onChange={setQuoteStuffingNumPoints} min={3} max={15} step={1} />
                </div>
              )}
            </div>

            <div className="space-y-4">
              <label className="flex items-center gap-3 cursor-pointer group">
                <input
                  type="checkbox"
                  checked={enableFlashCrash}
                  onChange={(e) => setEnableFlashCrash(e.target.checked)}
                  className="w-4 h-4 rounded border-slate-300 text-blue-600"
                />
                <span className="font-bold dark:text-slate-200 group-hover:text-blue-500 transition-colors">
                  <Tooltip text="Creates sudden price collapse followed by recovery">Flash Crash Attack</Tooltip>
                </span>
              </label>
              {enableFlashCrash && (
                <div className="pl-7 space-y-4">
                  <ParameterControl label="Price Drop %" value={flashCrashPriceDrop} onChange={setFlashCrashPriceDrop} min={3} max={30} step={0.5} unit="%" />
                  <ParameterControl label="Volatility Spike" value={flashCrashVolatilitySpike} onChange={setFlashCrashVolatilitySpike} min={1.5} max={5} step={0.1} />
                  <ParameterControl label="Crash Duration" value={flashCrashDuration} onChange={setFlashCrashDuration} min={1} max={5} step={1} unit=" days" />
                  <ParameterControl label="Recovery Duration" value={flashCrashRecoveryDuration} onChange={setFlashCrashRecoveryDuration} min={2} max={10} step={1} unit=" days" />
                </div>
              )}
            </div>
          </div>

          <button
            className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed mt-4"
            onClick={() => handleSimulateCrash(true)}
            disabled={loading}
          >
            {loading ? 'Simulating...' : 'Run Simulation'}
          </button>
        </div>

        {/* Right Panel - Visualizations */}
        <div className="space-y-6">
          {error && <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 p-4 rounded-lg">{error}</div>}

          {crashData && stats && !isSimulating && (
            <>
              <SmartAdvisor
                simulationData={{ original: originalData, crash: crashData }}
                attackConfig={{ enable_spoofing: enableSpoofing, enable_quote_stuffing: enableQuoteStuffing, enable_flash_crash: enableFlashCrash }}
                onStrategySuggestion={setStrategySuggestions}
              />

              {strategySuggestions && (
                <TradeSuggestions suggestions={strategySuggestions} onSelectStrategy={(s) => console.log('Strategy selected:', s)} />
              )}

              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
                {[
                  { label: 'Price Change', value: `${stats.priceChange > 0 ? '+' : ''}${stats.priceChange}%`, color: parseFloat(stats.priceChange) >= 0 ? 'text-green-600' : 'text-red-600' },
                  { label: 'Max Deviation', value: `${stats.maxPriceDiff}%`, color: 'text-red-600' },
                  { label: 'Volume Change', value: `${stats.avgVolumeChange > 0 ? '+' : ''}${stats.avgVolumeChange}%`, color: parseFloat(stats.avgVolumeChange) >= 0 ? 'text-red-600' : 'text-green-600' },
                  { label: 'Volatility Change', value: `${stats.volatilityChange > 0 ? '+' : ''}${stats.volatilityChange}%`, color: 'text-red-600' },
                  { label: 'Points Modified', value: `${stats.modifiedPoints} / ${crashData.length}`, color: 'text-blue-600' }
                ].map((stat, i) => (
                  <div key={i} className="bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 p-4 rounded-xl shadow-sm transition-colors">
                    <div className="text-[10px] uppercase tracking-wider text-slate-500 dark:text-slate-400 mb-1 font-semibold">{stat.label}</div>
                    <div className={`text-lg font-bold ${stat.color}`}>{stat.value}</div>
                  </div>
                ))}
              </div>

              <div className="flex items-center gap-4 bg-slate-50 dark:bg-slate-800 p-3 rounded-lg border border-slate-200 dark:border-slate-700 w-fit">
                <label className="flex items-center gap-2 cursor-pointer text-sm font-medium dark:text-slate-200">
                  <input type="checkbox" checked={showAnomalies} onChange={(e) => setShowAnomalies(e.target.checked)} className="w-4 h-4 rounded border-slate-300 text-blue-600" />
                  Show Anomalies ({anomalies.length})
                </label>
              </div>

              <div className="space-y-8">
                <section>
                  <h3 className="text-xl font-bold mb-4 dark:text-white">Price Comparison</h3>
                  <ChartWithExplanation chartType="price_comparison" dataSummary={{ description: "Original vs simulated crash data" }}>
                    <div className="h-[400px] bg-white dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800 p-4">
                      <ComparisonChart originalData={originalData} crashData={crashData} anomalies={anomalies} anomalyDetails={anomalyDetails} showAnomalies={showAnomalies} />
                    </div>
                  </ChartWithExplanation>
                </section>

                <section>
                  <h3 className="text-xl font-bold mb-4 dark:text-white">Detailed Analysis</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="h-[350px] bg-white dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800 p-4">
                      <OhlcvChart data={originalData} title="Original Data" color="blue" />
                    </div>
                    <div className="h-[350px] bg-white dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800 p-4">
                      <OhlcvChart data={crashData} title="Simulated Crash Data" color="red" anomalies={anomalies} anomalyDetails={anomalyDetails} showAnomalies={showAnomalies} />
                    </div>
                  </div>
                  <ImpactCard impact={impact} />
                </section>

                <section>
                  <h3 className="text-xl font-bold mb-4 dark:text-white">Advanced Metrics</h3>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <ChartWithExplanation chartType="volatility_map" dataSummary={{ description: "Rolling volatility comparison" }}>
                      <div className="h-[300px] bg-white dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800 p-4">
                        <VolatilityMap originalData={originalData} crashData={crashData} />
                      </div>
                    </ChartWithExplanation>
                    <ChartWithExplanation chartType="anomaly_timeline" dataSummary={{ description: "Price and volume deviations" }}>
                      <div className="h-[300px] bg-white dark:bg-slate-900 rounded-xl border border-slate-100 dark:border-slate-800 p-4">
                        <AnomalyTimeline originalData={originalData} crashData={crashData} />
                      </div>
                    </ChartWithExplanation>
                  </div>
                </section>
              </div>

              <button className="w-full bg-slate-900 dark:bg-white text-white dark:text-slate-900 font-bold py-4 rounded-xl transition-transform hover:scale-[1.01] active:scale-[0.99] mt-8" onClick={onNext}>
                Continue to Algorithm Editor →
              </button>
            </>
          )}

          {!crashData && (
            <div className="text-center py-24 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-3xl">
              <div className="text-6xl mb-6 opacity-20">📈</div>
              <h3 className="text-2xl font-bold text-slate-800 dark:text-slate-200 mb-2">Configure and Run Simulation</h3>
              <p className="text-slate-500 dark:text-slate-400">Select crash types and adjust parameters, then click "Run Simulation" to see the results</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default CrashSimulatorPage;

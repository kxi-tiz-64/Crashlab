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
  
  // Basic controls
  const [enableSpoofing, setEnableSpoofing] = useState(false);
  const [enableQuoteStuffing, setEnableQuoteStuffing] = useState(false);
  const [enableFlashCrash, setEnableFlashCrash] = useState(false);
  const [intensity, setIntensity] = useState(5);
  
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
  const [attackSequence, setAttackSequence] = useState([]);

  const handleSimulateCrash = useCallback(async (showLoading = true) => {
    if (!enableSpoofing && !enableQuoteStuffing && !enableFlashCrash) {
      if (showLoading) setError('Please select at least one crash type');
      return;
    }

    // Prevent multiple simultaneous simulations
    if (isSimulating) {
      return;
    }

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
        intensity: intensity,
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
      onCrashSimulated(response.data.manipulated_ohlcv);
    } catch (err) {
      if (showLoading) setError(err.response?.data?.message || 'Failed to simulate crash');
    } finally {
      if (showLoading) setLoading(false);
      setIsSimulating(false);
    }
  }, [
    originalData, enableSpoofing, enableQuoteStuffing, enableFlashCrash, intensity,
    spoofingPriceChange, spoofingVolumeMultiplier, spoofingNumPoints,
    quoteStuffingMaxDeviation, quoteStuffingVolumeShock, quoteStuffingNumPoints,
    flashCrashPriceDrop, flashCrashVolatilitySpike, flashCrashDuration, flashCrashRecoveryDuration,
    attackSequence, onCrashSimulated, isSimulating
  ]);

  // Auto-preview effect with proper debouncing - DISABLED BY DEFAULT TO PREVENT GLITCHING
  useEffect(() => {
    if (!autoPreview || (!enableSpoofing && !enableQuoteStuffing && !enableFlashCrash) || isSimulating) {
      return;
    }
    
    const timer = setTimeout(() => {
      if (!isSimulating) {
        handleSimulateCrash(false);
      }
    }, 1500); // Increased debounce time to prevent glitching
    
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [
    autoPreview, enableSpoofing, enableQuoteStuffing, enableFlashCrash,
    intensity, spoofingPriceChange, spoofingVolumeMultiplier, spoofingNumPoints,
    quoteStuffingMaxDeviation, quoteStuffingVolumeShock, quoteStuffingNumPoints,
    flashCrashPriceDrop, flashCrashVolatilitySpike, flashCrashDuration, flashCrashRecoveryDuration,
    isSimulating
  ]);

  // Calculate statistics - memoized to prevent constant recalculation
  const [stats, setStats] = useState(null);
  
  useEffect(() => {
    if (!crashData || !originalData || crashData.length === 0) {
      setStats(null);
      return;
    }
    
    // Debounce stats calculation
    const timer = setTimeout(() => {
      const priceChange = ((crashData[crashData.length - 1].close - originalData[originalData.length - 1].close) / originalData[originalData.length - 1].close * 100).toFixed(2);
      const maxPriceDiff = Math.max(...crashData.map((d, i) => Math.abs(d.close - originalData[i].close) / originalData[i].close * 100)).toFixed(2);
      const avgOriginalVolume = originalData.reduce((sum, d) => sum + d.volume, 0) / originalData.length;
      const avgCrashVolume = crashData.reduce((sum, d) => sum + d.volume, 0) / crashData.length;
      const avgVolumeChange = ((avgCrashVolume / avgOriginalVolume - 1) * 100).toFixed(1);
      const modifiedPoints = crashData.filter((d, i) => 
        Math.abs(d.close - originalData[i].close) > 0.01 ||
        Math.abs(d.volume - originalData[i].volume) > 0.01
      ).length;
      
      // Calculate volatility
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
        <span>
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
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '11px', color: '#666' }}>
        <span>{min}{unit}</span>
        <span>{max}{unit}</span>
      </div>
    </div>
  );

  return (
    <div className="page">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
        <div>
          <h2>Advanced Crash Simulation</h2>
          <p style={{ color: '#666', marginTop: '5px' }}>
            Customize attack parameters in real-time to generate realistic market crash scenarios
          </p>
        </div>
        <div style={{ display: 'flex', gap: '15px', alignItems: 'center' }}>
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer' }}>
            <input
              type="checkbox"
              checked={autoPreview}
              onChange={(e) => {
                setAutoPreview(e.target.checked);
                if (!e.target.checked) {
                  setIsSimulating(false); // Reset when disabling
                }
              }}
            />
            <span>Auto Preview</span>
            <span style={{ fontSize: '11px', color: '#666', marginLeft: '5px' }}>(May cause glitching)</span>
          </label>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '5px 12px', backgroundColor: '#f8f9fa', borderRadius: '20px' }}>
            <span style={{ fontSize: '12px', color: '#666' }}>Beginner</span>
            <label style={{ position: 'relative', display: 'inline-block', width: '44px', height: '24px', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={expertMode}
                onChange={(e) => setExpertMode(e.target.checked)}
                style={{ opacity: 0, width: 0, height: 0 }}
              />
              <span style={{
                position: 'absolute',
                top: 0,
                left: 0,
                right: 0,
                bottom: 0,
                backgroundColor: expertMode ? '#007bff' : '#ccc',
                borderRadius: '24px',
                transition: '0.3s'
              }}>
                <span style={{
                  position: 'absolute',
                  height: '18px',
                  width: '18px',
                  left: expertMode ? '22px' : '3px',
                  bottom: '3px',
                  backgroundColor: 'white',
                  borderRadius: '50%',
                  transition: '0.3s',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
                }} />
              </span>
            </label>
            <span style={{ fontSize: '12px', color: '#666' }}>Expert</span>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '350px 1fr', gap: '20px' }}>
        {/* Left Panel - Controls */}
        <div style={{ backgroundColor: '#f8f9fa', padding: '20px', borderRadius: '8px', height: 'fit-content', position: 'sticky', top: '20px' }}>
          <h3 style={{ marginTop: 0, marginBottom: '20px' }}>Attack Configuration</h3>
          
          {/* Basic Controls */}
          <div style={{ marginBottom: '25px', paddingBottom: '25px', borderBottom: '1px solid #dee2e6' }}>
            <h4 style={{ marginBottom: '15px' }}>General Settings</h4>
            <ParameterControl
              label="Overall Intensity"
              value={intensity}
              onChange={setIntensity}
              min={1}
              max={10}
              step={1}
              tooltip="Overall intensity multiplier for all crash types (1-10)"
            />
          </div>

          {/* Spoofing Controls */}
          <div style={{ marginBottom: '25px', paddingBottom: '25px', borderBottom: '1px solid #dee2e6' }}>
            <label style={{ display: 'flex', alignItems: 'center', marginBottom: '15px', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={enableSpoofing}
                onChange={(e) => setEnableSpoofing(e.target.checked)}
                style={{ marginRight: '8px' }}
              />
              <strong>
                <Tooltip text="Creates fake volume walls and price drift to manipulate market perception">
                  Spoofing Attack
                </Tooltip>
              </strong>
            </label>
            {enableSpoofing && (
              <div style={{ marginLeft: '26px', marginTop: '10px' }}>
                <ParameterControl
                  label="Price Change %"
                  value={spoofingPriceChange}
                  onChange={setSpoofingPriceChange}
                  min={0.5}
                  max={10}
                  step={0.1}
                  tooltip="Maximum price drift percentage per affected data point"
                  unit="%"
                />
                {expertMode && (
                  <ParameterExplanation
                    parameterName="spoofing_price_change_pct"
                    value={spoofingPriceChange}
                    attackType="spoofing"
                  />
                )}
                <ParameterControl
                  label="Volume Multiplier"
                  value={spoofingVolumeMultiplier}
                  onChange={setSpoofingVolumeMultiplier}
                  min={1.5}
                  max={5}
                  step={0.1}
                  tooltip="Multiplier for volume to create fake walls"
                />
                <ParameterControl
                  label="Affected Points"
                  value={spoofingNumPoints}
                  onChange={setSpoofingNumPoints}
                  min={2}
                  max={10}
                  step={1}
                  tooltip="Number of consecutive data points to modify"
                />
              </div>
            )}
          </div>

          {/* Quote Stuffing Controls */}
          <div style={{ marginBottom: '25px', paddingBottom: '25px', borderBottom: '1px solid #dee2e6' }}>
            <label style={{ display: 'flex', alignItems: 'center', marginBottom: '15px', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={enableQuoteStuffing}
                onChange={(e) => setEnableQuoteStuffing(e.target.checked)}
                style={{ marginRight: '8px' }}
              />
              <strong>
                <Tooltip text="Creates abnormal wicks and volume jitter to overwhelm order books">
                  Quote Stuffing Attack
                </Tooltip>
              </strong>
            </label>
            {enableQuoteStuffing && (
              <div style={{ marginLeft: '26px', marginTop: '10px' }}>
                <ParameterControl
                  label="Max Deviation %"
                  value={quoteStuffingMaxDeviation}
                  onChange={setQuoteStuffingMaxDeviation}
                  min={1}
                  max={10}
                  step={0.1}
                  tooltip="Maximum percentage deviation for high/low wicks"
                  unit="%"
                />
                <ParameterControl
                  label="Volume Shock"
                  value={quoteStuffingVolumeShock}
                  onChange={setQuoteStuffingVolumeShock}
                  min={1}
                  max={5}
                  step={0.1}
                  tooltip="Volume shock multiplier for affected points"
                />
                <ParameterControl
                  label="Affected Points"
                  value={quoteStuffingNumPoints}
                  onChange={setQuoteStuffingNumPoints}
                  min={3}
                  max={15}
                  step={1}
                  tooltip="Number of random data points to modify"
                />
              </div>
            )}
          </div>

          {/* Flash Crash Controls */}
          <div style={{ marginBottom: '25px' }}>
            <label style={{ display: 'flex', alignItems: 'center', marginBottom: '15px', cursor: 'pointer' }}>
              <input
                type="checkbox"
                checked={enableFlashCrash}
                onChange={(e) => setEnableFlashCrash(e.target.checked)}
                style={{ marginRight: '8px' }}
              />
              <strong>
                <Tooltip text="Creates sudden price collapse followed by recovery, simulating panic selling">
                  Flash Crash Attack
                </Tooltip>
              </strong>
            </label>
            {enableFlashCrash && (
              <div style={{ marginLeft: '26px', marginTop: '10px' }}>
                <ParameterControl
                  label="Price Drop %"
                  value={flashCrashPriceDrop}
                  onChange={setFlashCrashPriceDrop}
                  min={3}
                  max={30}
                  step={0.5}
                  tooltip="Total percentage price drop during crash phase"
                  unit="%"
                />
                <ParameterControl
                  label="Volatility Spike"
                  value={flashCrashVolatilitySpike}
                  onChange={setFlashCrashVolatilitySpike}
                  min={1.5}
                  max={5}
                  step={0.1}
                  tooltip="Volume multiplier during crash phase"
                />
                <ParameterControl
                  label="Crash Duration"
                  value={flashCrashDuration}
                  onChange={setFlashCrashDuration}
                  min={1}
                  max={5}
                  step={1}
                  tooltip="Number of days for crash phase"
                  unit=" days"
                />
                <ParameterControl
                  label="Recovery Duration"
                  value={flashCrashRecoveryDuration}
                  onChange={setFlashCrashRecoveryDuration}
                  min={2}
                  max={10}
                  step={1}
                  tooltip="Number of days for recovery phase"
                  unit=" days"
                />
              </div>
            )}
          </div>

          <button
            className="button"
            onClick={() => handleSimulateCrash(true)}
            disabled={loading}
            style={{ width: '100%', marginTop: '20px' }}
          >
            {loading ? 'Simulating...' : 'Run Simulation'}
          </button>
        </div>

        {/* Right Panel - Visualizations */}
        <div>
          {error && (
            <div className="error-message" style={{ marginBottom: '20px' }}>
              ❌ {error}
            </div>
          )}

          {crashData && stats && !isSimulating && (
            <>
              {/* AI Smart Advisor */}
              <SmartAdvisor
                simulationData={{
                  original: originalData,
                  crash: crashData
                }}
                attackConfig={{
                  enable_spoofing: enableSpoofing,
                  enable_quote_stuffing: enableQuoteStuffing,
                  enable_flash_crash: enableFlashCrash
                }}
                onStrategySuggestion={setStrategySuggestions}
              />

              {/* Trade Suggestions */}
              {strategySuggestions && (
                <TradeSuggestions
                  suggestions={strategySuggestions}
                  onSelectStrategy={(strategy) => {
                    // This will be handled by parent component
                    console.log('Strategy selected:', strategy);
                  }}
                />
              )}

              {/* Statistics Dashboard */}
              <div style={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', 
                gap: '15px', 
                marginBottom: '30px'
              }}>
                <div style={{ backgroundColor: '#fff', padding: '15px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
                  <div style={{ fontSize: '12px', color: '#666', marginBottom: '5px' }}>Price Change</div>
                  <div style={{ fontSize: '20px', fontWeight: 'bold', color: parseFloat(stats.priceChange) >= 0 ? '#28a745' : '#dc3545' }}>
                    {stats.priceChange > 0 ? '+' : ''}{stats.priceChange}%
                  </div>
                </div>
                <div style={{ backgroundColor: '#fff', padding: '15px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
                  <div style={{ fontSize: '12px', color: '#666', marginBottom: '5px' }}>Max Deviation</div>
                  <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#dc3545' }}>
                    {stats.maxPriceDiff}%
                  </div>
                </div>
                <div style={{ backgroundColor: '#fff', padding: '15px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
                  <div style={{ fontSize: '12px', color: '#666', marginBottom: '5px' }}>Volume Change</div>
                  <div style={{ fontSize: '20px', fontWeight: 'bold', color: parseFloat(stats.avgVolumeChange) >= 0 ? '#dc3545' : '#28a745' }}>
                    {stats.avgVolumeChange > 0 ? '+' : ''}{stats.avgVolumeChange}%
                  </div>
                </div>
                <div style={{ backgroundColor: '#fff', padding: '15px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
                  <div style={{ fontSize: '12px', color: '#666', marginBottom: '5px' }}>Volatility Change</div>
                  <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#dc3545' }}>
                    {stats.volatilityChange > 0 ? '+' : ''}{stats.volatilityChange}%
                  </div>
                </div>
                <div style={{ backgroundColor: '#fff', padding: '15px', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }}>
                  <div style={{ fontSize: '12px', color: '#666', marginBottom: '5px' }}>Points Modified</div>
                  <div style={{ fontSize: '20px', fontWeight: 'bold', color: '#007bff' }}>
                    {stats.modifiedPoints} / {crashData.length}
                  </div>
                </div>
              </div>

              {/* Comparison Charts */}
              <div style={{ marginBottom: '30px' }}>
                <h3>Price Comparison</h3>
                <ChartWithExplanation
                  chartType="price_comparison"
                  dataSummary={{ description: "Side-by-side comparison of original vs simulated crash data" }}
                >
                  <div className="chart-container" style={{ height: '400px', marginBottom: '20px' }}>
                    <ComparisonChart originalData={originalData} crashData={crashData} />
                  </div>
                </ChartWithExplanation>
              </div>

              {/* Side-by-side Charts */}
              <div style={{ marginBottom: '30px' }}>
                <h3>Detailed Analysis</h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
                  <div className="chart-container" style={{ height: '350px' }}>
                    <OhlcvChart data={originalData} title="Original Data" color="blue" />
                  </div>
                  <div className="chart-container" style={{ height: '350px' }}>
                    <OhlcvChart data={crashData} title="Simulated Crash Data" color="red" />
                  </div>
                </div>
              </div>

              {/* Advanced Visualizations */}
              <div style={{ marginBottom: '30px' }}>
                <h3>Advanced Metrics</h3>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                  <ChartWithExplanation
                    chartType="volatility_map"
                    dataSummary={{ description: "Rolling volatility comparison showing volatility spikes during crash" }}
                  >
                    <div className="chart-container" style={{ height: '300px' }}>
                      <VolatilityMap originalData={originalData} crashData={crashData} />
                    </div>
                  </ChartWithExplanation>
                  <ChartWithExplanation
                    chartType="anomaly_timeline"
                    dataSummary={{ description: "Timeline showing price and volume deviations from original data" }}
                  >
                    <div className="chart-container" style={{ height: '300px' }}>
                      <AnomalyTimeline originalData={originalData} crashData={crashData} />
                    </div>
                  </ChartWithExplanation>
                </div>
              </div>

              <button
                className="button"
                onClick={onNext}
                style={{ marginTop: '20px', width: '100%' }}
              >
                Continue to Algorithm Editor →
              </button>
            </>
          )}

          {!crashData && (
            <div style={{ textAlign: 'center', padding: '60px 20px', color: '#666' }}>
              <div style={{ fontSize: '48px', marginBottom: '20px' }}>📊</div>
              <h3>Configure and Run Simulation</h3>
              <p>Select crash types and adjust parameters, then click "Run Simulation" to see the results</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default CrashSimulatorPage;

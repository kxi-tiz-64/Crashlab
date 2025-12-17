import React, { useState, useEffect } from 'react';
import apiClient from '../api/apiClient';

function SmartAdvisor({ simulationData, attackConfig, onStrategySuggestion }) {
  const [analysis, setAnalysis] = useState(null);
  const [loading, setLoading] = useState(false);
  const [expanded, setExpanded] = useState(true);

  useEffect(() => {
    if (simulationData && simulationData.original && simulationData.crash) {
      // Only load if we don't already have analysis or data changed
      const dataKey = JSON.stringify(simulationData.crash.slice(0, 5)); // Use first 5 points as key
      if (analysis && analysis.dataKey === dataKey) {
        return; // Already analyzed this data
      }
      loadAnalysis();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [simulationData?.crash?.length, simulationData?.original?.length]);

  const loadAnalysis = async () => {
    setLoading(true);
    try {
      const response = await apiClient.post('/ai/analyze_simulation', {
        original_data: simulationData.original,
        crash_data: simulationData.crash,
        attack_config: attackConfig
      });

      if (!response.data.error) {
        const dataKey = JSON.stringify(simulationData.crash.slice(0, 5));
        setAnalysis({ ...response.data, dataKey });
        
        // Get strategy suggestions
        if (onStrategySuggestion) {
          const strategyResponse = await apiClient.post('/ai/suggest_strategy', {
            attack_config: attackConfig,
            metrics: response.data.metrics
          });
          if (!strategyResponse.data.error && onStrategySuggestion) {
            onStrategySuggestion(strategyResponse.data);
          }
        }
      }
    } catch (err) {
      console.error('AI analysis error:', err);
    } finally {
      setLoading(false);
    }
  };

  if (!simulationData || !simulationData.original || !simulationData.crash) {
    return null;
  }
  
  if (loading && !analysis) {
    return (
      <div style={{
        backgroundColor: '#fff',
        borderRadius: '8px',
        padding: '20px',
        textAlign: 'center',
        color: '#666',
        marginBottom: '20px'
      }}>
        Analyzing simulation...
      </div>
    );
  }
  
  if (!analysis) {
    return null;
  }

  const riskColor = analysis.risk_level === 'High' ? '#dc3545' : 
                   analysis.risk_level === 'Medium' ? '#ffc107' : '#28a745';

  return (
    <div style={{
      backgroundColor: '#fff',
      borderRadius: '8px',
      boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
      marginBottom: '20px',
      overflow: 'hidden'
    }}>
      <div 
        style={{
          backgroundColor: '#007bff',
          color: 'white',
          padding: '15px 20px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          cursor: 'pointer'
        }}
        onClick={() => setExpanded(!expanded)}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ fontSize: '24px' }}>🤖</span>
          <div>
            <div style={{ fontWeight: 'bold', fontSize: '16px' }}>AI Smart Advisor</div>
            <div style={{ fontSize: '12px', opacity: 0.9 }}>Click to {expanded ? 'collapse' : 'expand'}</div>
          </div>
        </div>
        <div style={{
          backgroundColor: riskColor,
          padding: '5px 15px',
          borderRadius: '20px',
          fontSize: '12px',
          fontWeight: 'bold'
        }}>
          {analysis.risk_level} Risk
        </div>
      </div>

      {expanded && (
        <div style={{ padding: '20px' }}>
          {loading ? (
            <div style={{ textAlign: 'center', padding: '20px' }}>Analyzing...</div>
          ) : (
            <>
              {/* Summary */}
              <div style={{ marginBottom: '20px' }}>
                <h4 style={{ marginBottom: '10px', color: '#333' }}>📊 Simulation Summary</h4>
                <div style={{
                  backgroundColor: '#f8f9fa',
                  padding: '15px',
                  borderRadius: '6px',
                  lineHeight: '1.6',
                  color: '#555'
                }}>
                  {analysis.summary}
                </div>
              </div>

              {/* Key Metrics */}
              <div style={{ marginBottom: '20px' }}>
                <h4 style={{ marginBottom: '10px', color: '#333' }}>📈 Key Metrics</h4>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '10px' }}>
                  <div style={{ padding: '10px', backgroundColor: '#f8f9fa', borderRadius: '4px' }}>
                    <div style={{ fontSize: '11px', color: '#666' }}>Max Price Deviation</div>
                    <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#dc3545' }}>
                      {analysis.metrics.max_price_deviation.toFixed(2)}%
                    </div>
                  </div>
                  <div style={{ padding: '10px', backgroundColor: '#f8f9fa', borderRadius: '4px' }}>
                    <div style={{ fontSize: '11px', color: '#666' }}>Volatility Change</div>
                    <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#ffc107' }}>
                      {analysis.metrics.volatility_change.toFixed(1)}%
                    </div>
                  </div>
                  <div style={{ padding: '10px', backgroundColor: '#f8f9fa', borderRadius: '4px' }}>
                    <div style={{ fontSize: '11px', color: '#666' }}>Modified Points</div>
                    <div style={{ fontSize: '18px', fontWeight: 'bold', color: '#007bff' }}>
                      {analysis.metrics.modified_points} / {analysis.metrics.total_points}
                    </div>
                  </div>
                </div>
              </div>

              {/* Recommendations */}
              {analysis.recommendations && analysis.recommendations.length > 0 && (
                <div style={{ marginBottom: '20px' }}>
                  <h4 style={{ marginBottom: '10px', color: '#333' }}>💡 Recommendations</h4>
                  {analysis.recommendations.map((rec, idx) => (
                    <div
                      key={idx}
                      style={{
                        padding: '12px',
                        marginBottom: '8px',
                        backgroundColor: rec.type === 'warning' ? '#fff3cd' : 
                                        rec.type === 'suggestion' ? '#d1ecf1' : '#f8f9fa',
                        borderLeft: `4px solid ${
                          rec.type === 'warning' ? '#ffc107' : 
                          rec.type === 'suggestion' ? '#17a2b8' : '#6c757d'
                        }`,
                        borderRadius: '4px'
                      }}
                    >
                      <div style={{ fontWeight: 'bold', marginBottom: '5px', color: '#333' }}>
                        {rec.type === 'warning' ? '⚠️' : rec.type === 'suggestion' ? '💡' : 'ℹ️'} {rec.title}
                      </div>
                      <div style={{ fontSize: '14px', color: '#555', marginBottom: '5px' }}>
                        {rec.message}
                      </div>
                      {rec.action && (
                        <div style={{ fontSize: '12px', color: '#007bff', fontStyle: 'italic' }}>
                          → {rec.action}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* Risk Score */}
              <div style={{
                padding: '15px',
                backgroundColor: '#f8f9fa',
                borderRadius: '6px',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <div>
                  <div style={{ fontSize: '12px', color: '#666', marginBottom: '5px' }}>Overall Risk Score</div>
                  <div style={{ fontSize: '24px', fontWeight: 'bold', color: riskColor }}>
                    {analysis.risk_score} / 100
                  </div>
                </div>
                <div style={{ fontSize: '12px', color: '#666', textAlign: 'right' }}>
                  {analysis.risk_score < 30 && 'Low risk - Safe to experiment'}
                  {analysis.risk_score >= 30 && analysis.risk_score < 70 && 'Medium risk - Monitor closely'}
                  {analysis.risk_score >= 70 && 'High risk - Extreme conditions'}
                </div>
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

export default SmartAdvisor;


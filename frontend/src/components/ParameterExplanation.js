import React, { useState, useEffect } from 'react';
import apiClient from '../api/apiClient';

function ParameterExplanation({ parameterName, value, attackType, onSeverityChange }) {
  const [explanation, setExplanation] = useState(null);
  const [expanded, setExpanded] = useState(false);

  useEffect(() => {
    if (!parameterName || value === undefined || !attackType) {
      return;
    }
    
    // Debounce to prevent excessive API calls
    const timer = setTimeout(() => {
      const loadExplanation = async () => {
        try {
          const response = await apiClient.post('/ai/explain_parameter', {
            parameter_name: parameterName,
            value: value,
            attack_type: attackType
          });

          if (!response.data.error) {
            setExplanation(response.data);
            if (onSeverityChange) {
              onSeverityChange(response.data.severity_score);
            }
          }
        } catch (err) {
          console.error('Explanation error:', err);
        }
      };
      loadExplanation();
    }, 300); // Debounce 300ms
    
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [parameterName, value, attackType]);


  if (!explanation) {
    return null;
  }

  const severityColor = explanation.severity_score < 30 ? '#28a745' : 
                        explanation.severity_score < 70 ? '#ffc107' : '#dc3545';

  return (
    <div style={{
      marginTop: '10px',
      padding: '12px',
      backgroundColor: '#f8f9fa',
      borderRadius: '6px',
      border: `2px solid ${severityColor}`,
      fontSize: '13px'
    }}>
      <div 
        style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center',
          cursor: 'pointer',
          marginBottom: expanded ? '10px' : 0
        }}
        onClick={() => setExpanded(!expanded)}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <span>ℹ️</span>
          <strong>Why this parameter matters</strong>
        </div>
        <div style={{
          backgroundColor: severityColor,
          color: 'white',
          padding: '2px 8px',
          borderRadius: '12px',
          fontSize: '11px',
          fontWeight: 'bold'
        }}>
          Severity: {explanation.severity_score}
        </div>
      </div>

      {expanded && (
        <div style={{ marginTop: '10px', lineHeight: '1.6' }}>
          <div style={{ marginBottom: '10px', color: '#555' }}>
            {explanation.explanation}
          </div>
          
          <div style={{ 
            padding: '8px', 
            backgroundColor: '#fff', 
            borderRadius: '4px',
            marginTop: '8px'
          }}>
            <div style={{ fontSize: '11px', color: '#666', marginBottom: '5px' }}>
              <strong>Risk Level:</strong> {explanation.risk_level}
            </div>
            {explanation.ideal_scenarios && explanation.ideal_scenarios.length > 0 && (
              <div style={{ fontSize: '11px', color: '#666' }}>
                <strong>Ideal for:</strong> {explanation.ideal_scenarios.join(', ')}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default ParameterExplanation;


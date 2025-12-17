import React from 'react';

function TradeSuggestions({ suggestions, onSelectStrategy }) {
  if (!suggestions || !suggestions.suggestions || suggestions.suggestions.length === 0) {
    return null;
  }

  return (
    <div style={{
      backgroundColor: '#fff',
      borderRadius: '8px',
      padding: '20px',
      boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
      marginBottom: '20px'
    }}>
      <h4 style={{ marginBottom: '15px', color: '#333', display: 'flex', alignItems: 'center', gap: '8px' }}>
        <span>💡</span> AI Strategy Recommendations
      </h4>
      
      <div style={{ display: 'grid', gap: '12px' }}>
        {suggestions.suggestions.map((suggestion, idx) => (
          <div
            key={idx}
            style={{
              padding: '15px',
              backgroundColor: idx === 0 ? '#e7f3ff' : '#f8f9fa',
              border: idx === 0 ? '2px solid #007bff' : '1px solid #dee2e6',
              borderRadius: '6px',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = '#007bff';
              e.currentTarget.style.backgroundColor = '#e7f3ff';
            }}
            onMouseLeave={(e) => {
              if (idx !== 0) {
                e.currentTarget.style.borderColor = '#dee2e6';
                e.currentTarget.style.backgroundColor = '#f8f9fa';
              }
            }}
            onClick={() => onSelectStrategy && onSelectStrategy(suggestion.strategy)}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '8px' }}>
              <div style={{ fontWeight: 'bold', color: '#007bff', textTransform: 'capitalize' }}>
                {suggestion.strategy.replace('_', ' ')}
              </div>
              <div style={{
                fontSize: '11px',
                padding: '2px 8px',
                backgroundColor: suggestion.confidence === 'High' ? '#28a745' : '#ffc107',
                color: 'white',
                borderRadius: '12px',
                fontWeight: 'bold'
              }}>
                {suggestion.confidence} Confidence
              </div>
            </div>
            <div style={{ fontSize: '13px', color: '#555', lineHeight: '1.5' }}>
              {suggestion.reason}
            </div>
            {idx === 0 && (
              <div style={{ 
                marginTop: '8px', 
                fontSize: '12px', 
                color: '#007bff',
                fontStyle: 'italic'
              }}>
                ← Recommended (Click to load)
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export default TradeSuggestions;


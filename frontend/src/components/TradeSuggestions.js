import React from 'react';

function TradeSuggestions({ suggestions, onSelectStrategy }) {
  if (!suggestions || !suggestions.suggestions || suggestions.suggestions.length === 0) {
    return null;
  }

  return (
    <div style={{
      borderRadius: '8px',
      padding: '20px',
      boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
      marginBottom: '20px'
    }} className="bg-white dark:bg-slate-800 border border-slate-100 dark:border-slate-700 transition-colors">
      <h4 style={{ marginBottom: '15px', display: 'flex', alignItems: 'center', gap: '8px' }} className="text-slate-800 dark:text-white">
        <span>Tip:</span> AI Strategy Recommendations
      </h4>
      
      <div style={{ display: 'grid', gap: '12px' }}>
        {suggestions.suggestions.map((suggestion, idx) => (
          <div
            key={idx}
            style={{
              padding: '15px',
              borderRadius: '6px',
              cursor: 'pointer',
              transition: 'all 0.2s'
            }}
            className={idx === 0 ? 
              "bg-blue-50 dark:bg-blue-900/20 border-2 border-blue-500" : 
              "bg-slate-50 dark:bg-slate-900/50 border border-slate-200 dark:border-slate-700"}
            onMouseEnter={(e) => {
              e.currentTarget.style.borderColor = '#007bff';
              if (idx !== 0) e.currentTarget.style.backgroundColor = 'rgba(0, 123, 255, 0.05)';
            }}
            onMouseLeave={(e) => {
              if (idx !== 0) {
                e.currentTarget.style.borderColor = '';
                e.currentTarget.style.backgroundColor = '';
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
            <div style={{ fontSize: '13px', lineHeight: '1.5' }} className="text-slate-600 dark:text-slate-300">
              {suggestion.reason}
            </div>
            {idx === 0 && (
              <div style={{ 
                marginTop: '8px', 
                fontSize: '12px', 
                color: '#007bff',
                fontStyle: 'italic'
              }}>
                Recommended (Click to load)
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

export default TradeSuggestions;

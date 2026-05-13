import React, { useState } from 'react';
import apiClient from '../api/apiClient';

function ChartWithExplanation({ chartType, children, dataSummary }) {
  const [explanation, setExplanation] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showExplanation, setShowExplanation] = useState(false);

  const handleExplain = async () => {
    if (explanation) {
      setShowExplanation(!showExplanation);
      return;
    }

    setLoading(true);
    try {
      const response = await apiClient.post('/ai/explain_chart', {
        chart_type: chartType,
        data_summary: dataSummary || {}
      });

      if (!response.data.error) {
        setExplanation(response.data.explanation);
        setShowExplanation(true);
      }
    } catch (err) {
      console.error('Chart explanation error:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ position: 'relative' }}>
      <div style={{ position: 'absolute', top: '10px', right: '10px', zIndex: 10 }}>
        <button
          onClick={handleExplain}
          disabled={loading}
          style={{
            padding: '6px 12px',
            backgroundColor: '#007bff',
            color: 'white',
            border: 'none',
            borderRadius: '4px',
            cursor: 'pointer',
            fontSize: '12px',
            fontWeight: 'bold',
            boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
          }}
        >
          {loading ? '...' : showExplanation ? 'Hide Explanation' : 'Explain This'}
        </button>
      </div>

      {children}

      {showExplanation && explanation && (
        <div style={{
          marginTop: '15px',
          padding: '15px',
          borderRadius: '6px',
        }} className="bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 transition-colors">
          <div style={{ fontWeight: 'bold', marginBottom: '8px' }} className="text-slate-800 dark:text-white">
            [AI] AI Explanation
          </div>
          <div style={{ fontSize: '14px', lineHeight: '1.6' }} className="text-slate-600 dark:text-slate-300">
            {explanation}
          </div>
        </div>
      )}
    </div>
  );
}

export default ChartWithExplanation;

import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '../components/ui/card';
import { Button } from '../components/ui/button';
import apiClient from '../api/apiClient';

function MyStrategiesPage({ onLoadStrategy }) {
  const [strategies, setStrategies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchStrategies = async () => {
    setLoading(true);
    try {
      const response = await apiClient.get('/strategies/list');
      setStrategies(response.data);
    } catch (err) {
      setError('Failed to load strategies');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStrategies();
  }, []);

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this strategy?')) return;
    
    try {
      await apiClient.delete(`/strategies/delete/${id}`);
      setStrategies(strategies.filter(s => s.id !== id));
    } catch (err) {
      alert('Failed to delete strategy');
    }
  };

  return (
    <Card className="page">
      <CardHeader>
        <CardTitle>My Saved Strategies</CardTitle>
      </CardHeader>
      <CardContent>
        {loading ? (
          <p>Loading your strategies...</p>
        ) : error ? (
          <p className="error-message">{error}</p>
        ) : strategies.length === 0 ? (
          <div className="text-center py-10">
            <p className="text-slate-500">You haven't saved any strategies yet.</p>
            <p className="text-sm mt-2">Go to the Algo Editor to create and save one!</p>
          </div>
        ) : (
          <div className="grid gap-4 mt-4">
            {strategies.map((strat) => (
              <div 
                key={strat.id} 
                className="flex items-center justify-between p-4 border border-slate-100 dark:border-slate-800 rounded-lg bg-slate-50/30 dark:bg-slate-900/30 hover:bg-slate-50 dark:hover:bg-slate-900 transition-colors"
              >
                <div>
                  <h3 className="font-bold text-lg">{strat.name}</h3>
                  <p className="text-xs text-slate-500 mt-1">
                    Saved on {new Date(strat.created_at).toLocaleDateString()} at {new Date(strat.created_at).toLocaleTimeString()}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => onLoadStrategy(strat.code)}
                  >
                    Load into Editor
                  </Button>
                  <Button 
                    variant="ghost" 
                    size="sm" 
                    className="text-red-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20"
                    onClick={() => handleDelete(strat.id)}
                  >
                    Delete
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default MyStrategiesPage;

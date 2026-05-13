import React, { useMemo, useState, useEffect } from 'react';
import { Button } from '../components/ui/button';
import { Card } from '../components/ui/card';

const KEY = 'crashlab_leaderboard';

function readEntries() {
  try {
    const parsed = JSON.parse(localStorage.getItem(KEY) || '[]');
    return Array.isArray(parsed) ? parsed : [];
  } catch (error) {
    return [];
  }
}

function LeaderboardPage() {
  const [entries, setEntries] = useState(() => readEntries());
  const [sortBy, setSortBy] = useState('score');
  const [sortDir, setSortDir] = useState('desc');

  useEffect(() => {
    const refresh = () => setEntries(readEntries());
    refresh();
    window.addEventListener('storage', refresh);
    return () => window.removeEventListener('storage', refresh);
  }, []);

  const sorted = useMemo(() => {
    const data = [...entries];
    data.sort((a, b) => {
      const aVal = a[sortBy] ?? 0;
      const bVal = b[sortBy] ?? 0;
      if (aVal < bVal) return sortDir === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortDir === 'asc' ? 1 : -1;
      return 0;
    });
    return data;
  }, [entries, sortBy, sortDir]);

  const updateSort = (field) => {
    if (field === sortBy) {
      setSortDir((prev) => (prev === 'desc' ? 'asc' : 'desc'));
      return;
    }
    setSortBy(field);
    setSortDir(field === 'strategy_name' ? 'asc' : 'desc');
  };

  const clearAll = () => {
    if (!window.confirm('Clear all leaderboard entries?')) return;
    localStorage.setItem(KEY, JSON.stringify([]));
    setEntries([]);
  };

  const rankBadge = (rank) => {
    if (rank === 1) return '🥇';
    if (rank === 2) return '🥈';
    if (rank === 3) return '🥉';
    return '';
  };

  return (
    <Card className="page">
      <div className="row-between">
        <div>
          <h2>Leaderboard</h2>
          <p>Best robustness runs saved in local storage.</p>
        </div>
        <Button className="button button-secondary" variant="secondary" onClick={clearAll}>Clear All</Button>
      </div>
      <div className="table-container">
        <table>
          <thead>
            <tr>
              <th>Rank</th>
              <th onClick={() => updateSort('strategy_name')}>Strategy</th>
              <th onClick={() => updateSort('user_email')}>User</th>
              <th onClick={() => updateSort('score')}>Score</th>
              <th onClick={() => updateSort('avg_sharpe')}>Avg Sharpe</th>
              <th onClick={() => updateSort('avg_sortino')}>Avg Sortino</th>
              <th onClick={() => updateSort('avg_calmar')}>Avg Calmar</th>
              <th onClick={() => updateSort('timestamp')}>Date</th>
            </tr>
          </thead>
          <tbody>
            {sorted.map((entry, idx) => (
              <tr key={entry.hash}>
                <td>{rankBadge(idx + 1)} {idx + 1}</td>
                <td>
                  <div className="font-bold">{entry.strategy_name}</div>
                </td>
                <td className="text-xs opacity-70">{entry.user_email || 'Anonymous'}</td>
                <td className="font-bold">{(Number(entry.score || 0) * 100).toFixed(1)}</td>
                <td>{Number(entry.avg_sharpe || 0).toFixed(3)}</td>
                <td>{Number(entry.avg_sortino || 0).toFixed(3)}</td>
                <td>{Number(entry.avg_calmar || 0).toFixed(3)}</td>
                <td className="text-xs">{new Date((entry.timestamp || 0) * 1000).toLocaleDateString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

export default LeaderboardPage;

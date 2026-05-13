import React from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Filler,
  Title,
  Tooltip,
  Legend,
} from 'chart.js';
import { Line } from 'react-chartjs-2';

ChartJS.register(
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  Filler,
  Title,
  Tooltip,
  Legend
);

function DrawdownChart({ equityCurve = [], drawdownCurve = [] }) {
  if (!drawdownCurve || drawdownCurve.length === 0) {
    return <div className="loading">No drawdown data available</div>;
  }

  const labels = equityCurve.map((point, idx) => point.date || idx + 1);
  const worstValue = Math.min(...drawdownCurve);
  const worstIndex = drawdownCurve.indexOf(worstValue);
  const worstDate = labels[worstIndex] || 'N/A';

  const chartData = {
    labels,
    datasets: [
      {
        label: 'Drawdown',
        data: drawdownCurve.map(value => value * 100),
        borderColor: 'rgb(220, 53, 69)',
        backgroundColor: 'rgba(220, 53, 69, 0.18)',
        borderWidth: 2,
        pointRadius: 0,
        tension: 0.1,
        fill: true,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: { position: 'top' },
      title: {
        display: true,
        text: `Drawdown Curve - Worst ${((worstValue || 0) * 100).toFixed(2)}% on ${worstDate}`,
      },
      tooltip: {
        callbacks: {
          label: context => `Drawdown: ${context.parsed.y.toFixed(2)}%`,
        },
      },
    },
    scales: {
      x: {
        title: { display: true, text: 'Date' },
        ticks: { maxRotation: 45, minRotation: 45 },
      },
      y: {
        title: { display: true, text: 'Drawdown (%)' },
        ticks: { callback: value => `${value}%` },
      },
    },
  };

  return (
    <div style={{ height: '100%' }}>
      <Line data={chartData} options={options} />
    </div>
  );
}

export default DrawdownChart;

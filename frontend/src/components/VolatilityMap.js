import React from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
  BarElement,
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
  BarElement,
  Title,
  Tooltip,
  Legend
);

function VolatilityMap({ originalData, crashData }) {
  if (!originalData || !crashData || originalData.length === 0 || crashData.length === 0) {
    return <div className="loading">No data available</div>;
  }

  // Calculate rolling volatility (20-period)
  const calculateVolatility = (data, window = 20) => {
    const volatilities = [];
    for (let i = 0; i < data.length; i++) {
      if (i < window) {
        volatilities.push(0);
        continue;
      }
      const windowData = data.slice(i - window, i);
      const returns = [];
      for (let j = 1; j < windowData.length; j++) {
        returns.push((windowData[j].close - windowData[j-1].close) / windowData[j-1].close);
      }
      const mean = returns.reduce((a, b) => a + b, 0) / returns.length;
      const variance = returns.reduce((sum, r) => sum + Math.pow(r - mean, 2), 0) / returns.length;
      volatilities.push(Math.sqrt(variance) * 100);
    }
    return volatilities;
  };

  const dates = originalData.map(d => d.date);
  const originalVol = calculateVolatility(originalData);
  const crashVol = calculateVolatility(crashData);

  const chartData = {
    labels: dates,
    datasets: [
      {
        label: 'Original Volatility',
        data: originalVol,
        borderColor: 'rgb(0, 123, 255)',
        backgroundColor: 'rgba(0, 123, 255, 0.1)',
        borderWidth: 2,
        pointRadius: 0,
        tension: 0.1,
      },
      {
        label: 'Crash Volatility',
        data: crashVol,
        borderColor: 'rgb(220, 53, 69)',
        backgroundColor: 'rgba(220, 53, 69, 0.1)',
        borderWidth: 2,
        pointRadius: 0,
        tension: 0.1,
      },
    ],
  };

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
      },
      title: {
        display: true,
        text: 'Rolling Volatility Map (20-period)',
      },
      tooltip: {
        mode: 'index',
        intersect: false,
      },
    },
    scales: {
      x: {
        display: true,
        title: {
          display: true,
          text: 'Date',
        },
      },
      y: {
        display: true,
        title: {
          display: true,
          text: 'Volatility (%)',
        },
      },
    },
    interaction: {
      mode: 'nearest',
      axis: 'x',
      intersect: false,
    },
  };

  return (
    <div style={{ height: '100%' }}>
      <Line data={chartData} options={options} />
    </div>
  );
}

export default VolatilityMap;


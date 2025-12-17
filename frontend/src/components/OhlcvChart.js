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

function OhlcvChart({ data, signals = null, title = 'OHLCV Chart', color = 'blue' }) {
  if (!data || data.length === 0) {
    return <div className="loading">No data available</div>;
  }

  const dates = data.map(d => d.date);
  const closes = data.map(d => d.close);

  const chartData = {
    labels: dates,
    datasets: [
      {
        label: 'Close Price',
        data: closes,
        borderColor: color === 'red' ? 'rgb(220, 53, 69)' : 'rgb(0, 123, 255)',
        backgroundColor: color === 'red' ? 'rgba(220, 53, 69, 0.1)' : 'rgba(0, 123, 255, 0.1)',
        borderWidth: 2,
        pointRadius: 0,
        tension: 0.1,
      },
    ],
  };

  // Add buy/sell signals if provided
  if (signals && signals.length > 0) {
    const buySignals = signals.filter(s => s.action === 'BUY');
    const sellSignals = signals.filter(s => s.action === 'SELL');

    if (buySignals.length > 0) {
      // Create array with null values, then place buy signals at their indices
      const buyData = new Array(dates.length).fill(null);
      buySignals.forEach(s => {
        const idx = s.index;
        if (idx >= 0 && idx < data.length) {
          buyData[idx] = data[idx].close;
        }
      });
      
      chartData.datasets.push({
        label: 'BUY',
        data: buyData,
        borderColor: 'rgb(40, 167, 69)',
        backgroundColor: 'rgba(40, 167, 69, 0.8)',
        pointRadius: 6,
        pointHoverRadius: 8,
        pointStyle: 'circle',
        showLine: false,
      });
    }

    if (sellSignals.length > 0) {
      // Create array with null values, then place sell signals at their indices
      const sellData = new Array(dates.length).fill(null);
      sellSignals.forEach(s => {
        const idx = s.index;
        if (idx >= 0 && idx < data.length) {
          sellData[idx] = data[idx].close;
        }
      });
      
      chartData.datasets.push({
        label: 'SELL',
        data: sellData,
        borderColor: 'rgb(220, 53, 69)',
        backgroundColor: 'rgba(220, 53, 69, 0.8)',
        pointRadius: 6,
        pointHoverRadius: 8,
        pointStyle: 'triangle',
        showLine: false,
      });
    }
  }

  const options = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'top',
      },
      title: {
        display: true,
        text: title,
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
        ticks: {
          maxRotation: 45,
          minRotation: 45,
        },
      },
      y: {
        display: true,
        title: {
          display: true,
          text: 'Price (₹)',
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

export default OhlcvChart;


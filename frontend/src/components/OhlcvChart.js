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

function OhlcvChart({
  data,
  signals = null,
  title = 'OHLCV Chart',
  color = 'blue',
  anomalies = [],
  anomalyDetails = [],
  showAnomalies = true,
}) {
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
        backgroundColor: (ctx) => {
          const chart = ctx.chart;
          const area = chart.chartArea;
          if (!area) return color === 'red' ? 'rgba(220, 53, 69, 0.15)' : 'rgba(0, 123, 255, 0.15)';
          const gradient = chart.ctx.createLinearGradient(0, area.top, 0, area.bottom);
          if (color === 'red') {
            gradient.addColorStop(0, 'rgba(220, 53, 69, 0.3)');
            gradient.addColorStop(1, 'rgba(220, 53, 69, 0.02)');
          } else {
            gradient.addColorStop(0, 'rgba(0, 123, 255, 0.3)');
            gradient.addColorStop(1, 'rgba(0, 123, 255, 0.02)');
          }
          return gradient;
        },
        borderWidth: 2,
        pointRadius: 0,
        tension: 0.1,
        fill: true,
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

  if (showAnomalies && anomalies && anomalies.length > 0) {
    const anomalySet = new Set(anomalies);
    const anomalyData = new Array(dates.length).fill(null);
    anomalies.forEach(idx => {
      if (idx >= 0 && idx < data.length) {
        anomalyData[idx] = data[idx].close;
      }
    });

    chartData.datasets.push({
      label: 'Anomalies',
      data: anomalyData,
      borderColor: 'rgb(220, 53, 69)',
      backgroundColor: 'red',
      pointRadius: anomalyData.map((_, idx) => anomalySet.has(idx) ? 5 : 0),
      pointHoverRadius: 8,
      pointStyle: 'circle',
      showLine: false,
      anomalyDetails,
    });
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
        callbacks: {
          label: function(context) {
            if (context.dataset.label === 'Anomalies') {
              const detail = (context.dataset.anomalyDetails || []).find(item => item.index === context.dataIndex);
              if (!detail) {
                return `Anomaly at ${dates[context.dataIndex]}`;
              }
              return [
                `Anomaly: ${detail.reason}`,
                `Return Z: ${Number(detail.return_z).toFixed(2)}`,
                `Volume Z: ${Number(detail.volume_z).toFixed(2)}`,
              ];
            }
            return `${context.dataset.label}: Rs.${Number(context.parsed.y).toFixed(2)}`;
          },
        },
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
          text: 'Price (Rs.)',
        },
      },
    },
    interaction: {
      mode: 'nearest',
      axis: 'x',
      intersect: false,
    },
    animation: { duration: 800, easing: 'easeOutQuart' },
  };

  return (
    <div style={{ height: '100%' }}>
      <Line data={chartData} options={options} />
    </div>
  );
}

export default OhlcvChart;


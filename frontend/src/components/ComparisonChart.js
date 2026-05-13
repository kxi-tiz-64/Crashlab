import React from 'react';
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  PointElement,
  LineElement,
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
  Title,
  Tooltip,
  Legend
);

function ComparisonChart({ originalData, crashData, anomalies = [], anomalyDetails = [], showAnomalies = true }) {
  if (!originalData || !crashData || originalData.length === 0 || crashData.length === 0) {
    return <div className="loading">No data available</div>;
  }

  const dates = originalData.map(d => d.date);
  const originalCloses = originalData.map(d => d.close);
  const crashCloses = crashData.map(d => d.close);

  const chartData = {
    labels: dates,
    datasets: [
      {
        label: 'Original Data',
        data: originalCloses,
        borderColor: 'rgb(0, 123, 255)',
        backgroundColor: 'rgba(0, 123, 255, 0.12)',
        borderWidth: 2,
        pointRadius: 0,
        tension: 0.1,
        fill: true,
      },
      {
        label: 'Simulated Crash Data',
        data: crashCloses,
        borderColor: 'rgb(220, 53, 69)',
        backgroundColor: 'rgba(220, 53, 69, 0.12)',
        borderWidth: 2,
        pointRadius: 0,
        tension: 0.1,
        borderDash: [5, 5],
        fill: true,
      },
    ],
  };

  if (showAnomalies && anomalies.length > 0) {
    const anomalyData = new Array(dates.length).fill(null);
    anomalies.forEach(idx => {
      if (idx >= 0 && idx < crashData.length) {
        anomalyData[idx] = crashData[idx].close;
      }
    });

    chartData.datasets.push({
      label: 'Anomalies',
      data: anomalyData,
      borderColor: 'rgb(220, 53, 69)',
      backgroundColor: 'red',
      pointRadius: 5,
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
        text: 'Original vs Simulated Crash (Overlaid)',
      },
      tooltip: {
        mode: 'index',
        intersect: false,
        callbacks: {
          label: function(context) {
            if (context.dataset.label === 'Anomalies') {
              const detail = (context.dataset.anomalyDetails || []).find(item => item.index === context.dataIndex);
              if (!detail) return `Anomaly at ${dates[context.dataIndex]}`;
              return [
                `Anomaly: ${detail.reason}`,
                `Return Z: ${Number(detail.return_z).toFixed(2)}`,
                `Volume Z: ${Number(detail.volume_z).toFixed(2)}`,
              ];
            }
            let label = context.dataset.label || '';
            if (label) {
              label += ': ';
            }
            if (context.parsed.y !== null) {
              label += 'Rs.' + context.parsed.y.toFixed(2);
              
              // Show difference if both datasets are present
              if (context.datasetIndex === 1 && context.dataIndex < originalCloses.length) {
                const diff = context.parsed.y - originalCloses[context.dataIndex];
                const diffPct = (diff / originalCloses[context.dataIndex] * 100).toFixed(2);
                label += ` (${diff >= 0 ? '+' : ''}${diffPct}%)`;
              }
            }
            return label;
          }
        }
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

export default ComparisonChart;


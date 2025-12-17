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

function ComparisonChart({ originalData, crashData }) {
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
        backgroundColor: 'rgba(0, 123, 255, 0.1)',
        borderWidth: 2,
        pointRadius: 0,
        tension: 0.1,
      },
      {
        label: 'Simulated Crash Data',
        data: crashCloses,
        borderColor: 'rgb(220, 53, 69)',
        backgroundColor: 'rgba(220, 53, 69, 0.1)',
        borderWidth: 2,
        pointRadius: 0,
        tension: 0.1,
        borderDash: [5, 5],
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
        text: 'Original vs Simulated Crash (Overlaid)',
      },
      tooltip: {
        mode: 'index',
        intersect: false,
        callbacks: {
          label: function(context) {
            let label = context.dataset.label || '';
            if (label) {
              label += ': ';
            }
            if (context.parsed.y !== null) {
              label += '₹' + context.parsed.y.toFixed(2);
              
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

export default ComparisonChart;

